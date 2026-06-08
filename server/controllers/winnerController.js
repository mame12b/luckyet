
const mongoose = require("mongoose");
const Draw = require("../models/Draw");
const Ticket = require("../models/Ticket");
const { selectWinnerIndex } = require("../services/quantumService");
const { logAudit } = require("../services/auditService");

// Per-tier broadcast durations
const TIER_DURATIONS_MS = {
  1: 30000,  // Grand prize — biggest moment
  2: 20000,
  3: 20000,
  4: 15000,
  5: 15000,
};

// Compute total duration based on the number of tiers
function computeTotalDuration(tierCount) {
  let total = 0;
  for (let i = 1; i <= tierCount; i++) {
    total += TIER_DURATIONS_MS[i] || 15000;
  }
  return total;
}

/**
 * Admin: start the live broadcast + run the quantum draw.
 *
 * For multi-tier draws:
 *   - tiers are picked in REVERSE order in terms of selection (we pick tier 1 first,
 *     but the BROADCAST reveals them in reverse for suspense — 3rd → 2nd → 1st)
 *   - each tier uses fresh quantum bytes from a fresh API call
 *   - winning tickets are removed from the eligible pool before the next pick
 *
 * The winners list ends up sorted by tier ascending (tier 1 = grand prize).
 */
exports.startDraw = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const draw = await Draw.findById(req.params.id).session(session);
    if (!draw) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Draw not found" });
    }

    if (draw.status === "drawn" || draw.status === "drawing") {
      await session.abortTransaction();
      return res.status(400).json({ message: `Draw is already ${draw.status}` });
    }

    if (draw.status !== "closed" && draw.status !== "sold_out") {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Cannot run draw in status "${draw.status}". Close the draw first.`,
      });
    }

    // Determine prize tiers (multi-tier or legacy single)
    const prizes = draw.prizes?.length
      ? [...draw.prizes].sort((a, b) => a.tier - b.tier)
      : [{
          tier: 1,
          name: draw.prizeName,
          description: draw.prizeDescription,
          imageUrl: draw.prizeImages?.[0],
          estimatedValueETB: draw.prizeEstimatedValueETB,
        }];

    // Get all active tickets, sorted deterministically
    let eligibleTickets = await Ticket.find({ drawId: draw._id, status: "active" })
      .sort({ ticketNumber: 1 })
      .session(session);

    if (eligibleTickets.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "No active tickets in this draw" });
    }

    if (eligibleTickets.length < prizes.length) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Not enough tickets (${eligibleTickets.length}) for ${prizes.length} prize tiers. Need at least one ticket per tier.`,
      });
    }

    // === RUN THE DRAW: pick one winner per tier, removing them between picks ===
    const winners = [];
    const wonTicketIds = new Set();

    for (const prize of prizes) {
      // Re-sort eligible tickets (excluding already-won) for deterministic indexing
      const pool = eligibleTickets.filter((t) => !wonTicketIds.has(t._id.toString()));

      if (pool.length === 0) {
        // Edge case: somehow ran out (shouldn't happen due to length check above)
        break;
      }

      // Fetch fresh quantum bytes for THIS tier
      const { index, proof } = await selectWinnerIndex(pool.length);
      const winningTicket = pool[index];
      wonTicketIds.add(winningTicket._id.toString());

      // Mark ticket won
      winningTicket.status = "won";
      await winningTicket.save({ session });

      winners.push({
        tier: prize.tier,
        ticketId: winningTicket._id,
        userId: winningTicket.userId,
        quantumProof: {
          seed: proof.seed,
          apiResponseHash: proof.apiResponseHash,
          algorithm: proof.algorithm,
          algorithmDescription: proof.algorithmDescription,
          source: proof.source,
          sourceLabel: proof.sourceLabel,
          sourceAttempts: proof.sourceAttempts,
          selectedIndex: proof.selectedIndex,
          totalEligibleAtPick: pool.length,
          drawnAt: proof.drawnAt,
        },
      });
    }

    // Mark all other tickets as lost
    await Ticket.updateMany(
      { drawId: draw._id, _id: { $nin: Array.from(wonTicketIds) }, status: "active" },
      { $set: { status: "lost" } },
      { session }
    );

    // Prepare sample ticket numbers for the animation
    const sampleSize = Math.min(40, eligibleTickets.length);
    const shuffled = [...eligibleTickets].sort(() => Math.random() - 0.5).slice(0, sampleSize);
    const sampleTicketNumbers = shuffled.map((t) => t.ticketNumber);
    // Ensure all winning tickets are in the sample
    for (const w of winners) {
      const ticket = eligibleTickets.find((t) => t._id.toString() === w.ticketId.toString());
      if (ticket && !sampleTicketNumbers.includes(ticket.ticketNumber)) {
        sampleTicketNumbers.push(ticket.ticketNumber);
      }
    }

    // Update draw
    draw.status = "drawing";
    draw.winners = winners;
    draw.drawnBy = req.user.id;
    const totalDuration = computeTotalDuration(winners.length);
    draw.drawAnimation = {
      startedAt: new Date(),
      durationMs: totalDuration,
      phase: "running",
      sampleTicketNumbers,
      // Store per-tier durations so frontend can show correct progress per tier
      tierDurations: winners.map((w) => ({
        tier: w.tier,
        durationMs: TIER_DURATIONS_MS[w.tier] || 15000,
      })),
    };

    // Also populate legacy single-winner fields if this is a 1-prize draw
    if (winners.length === 1) {
      draw.winnerTicketId = winners[0].ticketId;
      draw.winnerUserId = winners[0].userId;
      draw.quantumProof = {
        ...winners[0].quantumProof,
        totalTicketsAtDraw: winners[0].quantumProof.totalEligibleAtPick,
      };
    }

    await draw.save({ session });
    await session.commitTransaction();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "draw.broadcast_started",
      targetType: "Draw",
      targetId: draw._id,
      metadata: {
        tiers: winners.length,
        totalTickets: eligibleTickets.length,
        sources: winners.map((w) => w.quantumProof.source),
      },
      req,
    });

    // Schedule status transition to "drawn"
      setTimeout(async () => {
        try {
          await Draw.findByIdAndUpdate(draw._id, {
            status: "drawn",
            "drawAnimation.phase": "complete",
          });
        } catch (err) {
          console.error("Failed to finalize draw status:", err);
        }
      }, totalDuration + 1000); 

    res.json({
      message: "Broadcast started.",
      drawSlug: draw.slug,
      liveUrl: `/draws/${draw.slug}/live`,
      startedAt: draw.drawAnimation.startedAt,
      durationMs: totalDuration,
      tierCount: winners.length,
    });
  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    console.error("=== DRAW FAILED ===");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    console.error("===================");
    res.status(500).json({
      message: "Draw failed: " + err.message,
      detail: err.stack?.split("\n").slice(0, 5).join("\n"),
    });
  } finally {
    session.endSession();
  }
};

// Helper: anonymize a winner record for public display
function anonymizeWinner(user) {
  if (!user) return null;
  const parts = user.fullName?.split(" ") || ["Anonymous"];
  const first = parts[0];
  const lastInitial = parts[1] ? parts[1].charAt(0).toUpperCase() + "." : "";
  return {
    displayName: `${first} ${lastInitial}`.trim(),
    country: user.country,
  };
}

/**
 * Public: poll-able state for the live broadcast page.
 */
exports.getLiveState = async (req, res, next) => {
  try {
    const draw = await Draw.findOne({ slug: req.params.slug })
      .populate("winners.userId", "fullName country")
      .populate("winners.ticketId", "ticketNumber")
      .populate("winnerUserId", "fullName country")
      .populate("winnerTicketId", "ticketNumber");

    if (!draw) return res.status(404).json({ message: "Draw not found" });

    const effectivePrizes = draw.prizes?.length
      ? [...draw.prizes].sort((a, b) => a.tier - b.tier)
      : [{
          tier: 1,
          name: draw.prizeName,
          description: draw.prizeDescription,
          imageUrl: draw.prizeImages?.[0],
          estimatedValueETB: draw.prizeEstimatedValueETB,
        }];

    const obj = {
      slug: draw.slug,
      title: draw.title,
      prizes: effectivePrizes,
      ticketsSold: draw.ticketsSold,
      ticketPoolSize: draw.ticketPoolSize,
      status: draw.status,
      drawDate: draw.drawDate,
      animation: null,
      winners: null,
    };

    // Sort winners by tier ascending (tier 1 = grand prize)
    const sortedWinners = (draw.winners || []).sort((a, b) => a.tier - b.tier);

    const buildWinnersList = () => sortedWinners.map((w) => ({
      tier: w.tier,
      ticketNumber: w.ticketId?.ticketNumber,
      ...anonymizeWinner(w.userId),
    }));

    if (draw.status === "drawing" && draw.drawAnimation?.startedAt) {
      const elapsed = Date.now() - new Date(draw.drawAnimation.startedAt).getTime();
      const duration = draw.drawAnimation.durationMs;
      obj.animation = {
        startedAt: draw.drawAnimation.startedAt,
        durationMs: duration,
        elapsedMs: elapsed,
        progress: Math.min(1, elapsed / duration),
        sampleTicketNumbers: draw.drawAnimation.sampleTicketNumbers || [],
        tierCount: sortedWinners.length,
        tierDurations: draw.drawAnimation.tierDurations || [],
      };

      if (elapsed >= duration) {
        obj.winners = buildWinnersList();
      }
    } else if (draw.status === "drawn") {
      obj.winners = buildWinnersList();
    }

    res.json(obj);
  } catch (err) {
    next(err);
  }
};

/**
 * Public: list completed draws (results page).
 */
exports.listResults = async (req, res, next) => {
  try {
    const draws = await Draw.find({ status: "drawn" })
      .sort({ "drawAnimation.startedAt": -1 })
      .limit(100)
      .populate("winners.userId", "fullName country")
      .populate("winners.ticketId", "ticketNumber")
      .populate("winnerUserId", "fullName country")
      .populate("winnerTicketId", "ticketNumber");

    const sanitized = draws.map((d) => {
      const obj = d.toJSON();
      const effectivePrizes = obj.prizes?.length
        ? [...obj.prizes].sort((a, b) => a.tier - b.tier)
        : [{
            tier: 1,
            name: obj.prizeName,
            imageUrl: obj.prizeImages?.[0],
            estimatedValueETB: obj.prizeEstimatedValueETB,
          }];

      const sortedWinners = (obj.winners || []).sort((a, b) => a.tier - b.tier);
      return {
        _id: obj._id,
        slug: obj.slug,
        title: obj.title,
        ticketPriceETB: obj.ticketPriceETB,
        ticketsSold: obj.ticketsSold,
        endDate: obj.endDate,
        prizes: effectivePrizes,
        winners: sortedWinners.map((w) => ({
          tier: w.tier,
          ticketNumber: w.ticketId?.ticketNumber,
          ...anonymizeWinner(w.userId),
          drawnAt: w.quantumProof?.drawnAt,
        })),
      };
    });

    res.json({ draws: sanitized });
  } catch (err) {
    next(err);
  }
};

/**
 * Public: full proof for a single drawn draw.
 */
exports.getProof = async (req, res, next) => {
  try {
    const draw = await Draw.findOne({ slug: req.params.slug, status: "drawn" })
      .populate("winners.userId", "fullName country")
      .populate("winners.ticketId", "ticketNumber")
      .populate("winnerUserId", "fullName country")
      .populate("winnerTicketId", "ticketNumber");

    if (!draw) return res.status(404).json({ message: "Draw result not found" });

    const obj = draw.toJSON();

    // Normalize prizes
    obj.prizes = obj.prizes?.length
      ? [...obj.prizes].sort((a, b) => a.tier - b.tier)
      : [{
          tier: 1,
          name: obj.prizeName,
          description: obj.prizeDescription,
          imageUrl: obj.prizeImages?.[0],
          estimatedValueETB: obj.prizeEstimatedValueETB,
        }];

    // Normalize winners (legacy → array)
    if ((!obj.winners || obj.winners.length === 0) && obj.winnerTicketId) {
      obj.winners = [{
        tier: 1,
        ticketId: obj.winnerTicketId,
        userId: obj.winnerUserId,
        quantumProof: { ...obj.quantumProof, totalEligibleAtPick: obj.quantumProof?.totalTicketsAtDraw },
      }];
    }

    obj.winners = (obj.winners || [])
      .sort((a, b) => a.tier - b.tier)
      .map((w) => ({
        tier: w.tier,
        ticketNumber: w.ticketId?.ticketNumber,
        ...anonymizeWinner(w.userId),
        quantumProof: w.quantumProof,
      }));

    res.json({ draw: obj });
  } catch (err) {
    next(err);
  }
};
