
const mongoose = require("mongoose");
const Draw = require("../models/Draw");
const Ticket = require("../models/Ticket");
const { selectWinnerIndex } = require("../services/quantumService");
const { logAudit } = require("../services/auditService");

const ANIMATION_DURATION_MS = 20000;

/**
 * Admin: start the live broadcast + run the quantum draw.
 *
 * Flow:
 *   1. Validate state
 *   2. Run the quantum draw IMMEDIATELY (the math is done before animation)
 *   3. Mark draw status = "drawing" with startedAt = now
 *   4. Wait for animation duration (in DB state, not blocking the request)
 *   5. After duration elapses, viewers poll /live-state and see the result
 *
 * The animation is dramatic presentation of an already-determined result.
 * The live-state endpoint reveals the winner only AFTER the animation ends.
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

    const tickets = await Ticket.find({ drawId: draw._id, status: "active" })
      .sort({ ticketNumber: 1 })
      .session(session);

    if (tickets.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "No active tickets in this draw" });
    }

    // === DO THE ACTUAL QUANTUM DRAW NOW (before animation) ===
    const { index, proof } = await selectWinnerIndex(tickets.length);
    const winningTicket = tickets[index];

    // Mark winning ticket
    winningTicket.status = "won";
    await winningTicket.save({ session });

    // Mark all other tickets lost
    await Ticket.updateMany(
      { drawId: draw._id, _id: { $ne: winningTicket._id }, status: "active" },
      { $set: { status: "lost" } },
      { session }
    );

    // Prepare a sample of ticket numbers for the animation
    // (these flash during the slot machine spin — must include the real winner
    // somewhere in the list so the reveal feels honest)
    const sampleSize = Math.min(40, tickets.length);
    const shuffled = [...tickets].sort(() => Math.random() - 0.5).slice(0, sampleSize);
    const sampleTicketNumbers = shuffled.map((t) => t.ticketNumber);
    // Ensure winning ticket is in the sample
    if (!sampleTicketNumbers.includes(winningTicket.ticketNumber)) {
      sampleTicketNumbers.push(winningTicket.ticketNumber);
    }

    // Set draw to "drawing" status with animation start time
    draw.status = "drawing";
    draw.winnerTicketId = winningTicket._id;
    draw.winnerUserId = winningTicket.userId;
    draw.drawnBy = req.user.id;
    draw.drawAnimation = {
      startedAt: new Date(),
      durationMs: ANIMATION_DURATION_MS,
      phase: "running",
      sampleTicketNumbers,
    };
    draw.quantumProof = {
      seed: proof.seed,
      apiResponseHash: proof.apiResponseHash,
      algorithm: proof.algorithm,
      algorithmDescription: proof.algorithmDescription,
      selectedIndex: proof.selectedIndex,
      totalTicketsAtDraw: proof.totalTicketsAtDraw,
      drawnAt: proof.drawnAt,
    };
    await draw.save({ session });

    await session.commitTransaction();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "draw.broadcast_started",
      targetType: "Draw",
      targetId: draw._id,
      metadata: {
        winningTicketNumber: winningTicket.ticketNumber,
        totalTickets: tickets.length,
        selectedIndex: index,
      },
      req,
    });

    // Schedule the transition to "drawn" status after animation duration
    // (so the public live-state endpoint can reveal the winner safely)
    setTimeout(async () => {
      try {
        await Draw.findByIdAndUpdate(draw._id, {
          status: "drawn",
          "drawAnimation.phase": "complete",
        });
      } catch (err) {
        console.error("Failed to finalize draw status:", err);
      }
    }, ANIMATION_DURATION_MS + 1000);

    res.json({
      message: "Broadcast started. Animation will run for " + ANIMATION_DURATION_MS + "ms.",
      drawSlug: draw.slug,
      liveUrl: `/draws/${draw.slug}/live`,
      startedAt: draw.drawAnimation.startedAt,
      durationMs: ANIMATION_DURATION_MS,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Draw failed:", err);
    res.status(500).json({
      message: "Draw failed: " + err.message,
      hint: err.message.includes("Quantum")
        ? "Quantum API unreachable. ANU may be down. Try again in a minute. No fallback was used."
        : null,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Public: poll-able state for the live broadcast page.
 * Returns the current animation phase + (only after animation ends) the winner.
 */
exports.getLiveState = async (req, res, next) => {
  try {
    const draw = await Draw.findOne({ slug: req.params.slug })
      .populate("winnerUserId", "fullName country")
      .populate("winnerTicketId", "ticketNumber");

    if (!draw) return res.status(404).json({ message: "Draw not found" });

    const obj = {
      slug: draw.slug,
      title: draw.title,
      prizeName: draw.prizeName,
      prizeImages: draw.prizeImages,
      ticketsSold: draw.ticketsSold,
      status: draw.status,
      animation: null,
      winner: null,
    };

    if (draw.status === "drawing" && draw.drawAnimation?.startedAt) {
      const elapsed = Date.now() - new Date(draw.drawAnimation.startedAt).getTime();
      const duration = draw.drawAnimation.durationMs;
      obj.animation = {
        startedAt: draw.drawAnimation.startedAt,
        durationMs: duration,
        elapsedMs: elapsed,
        progress: Math.min(1, elapsed / duration),
        sampleTicketNumbers: draw.drawAnimation.sampleTicketNumbers || [],
      };

      // Only reveal winner if animation finished
      if (elapsed >= duration) {
        const parts = draw.winnerUserId?.fullName?.split(" ") || ["Anonymous"];
        const first = parts[0];
        const lastInitial = parts[1] ? parts[1].charAt(0).toUpperCase() + "." : "";
        obj.winner = {
          ticketNumber: draw.winnerTicketId?.ticketNumber,
          displayName: `${first} ${lastInitial}`.trim(),
          country: draw.winnerUserId?.country,
        };
      }
    } else if (draw.status === "drawn") {
      const parts = draw.winnerUserId?.fullName?.split(" ") || ["Anonymous"];
      const first = parts[0];
      const lastInitial = parts[1] ? parts[1].charAt(0).toUpperCase() + "." : "";
      obj.winner = {
        ticketNumber: draw.winnerTicketId?.ticketNumber,
        displayName: `${first} ${lastInitial}`.trim(),
        country: draw.winnerUserId?.country,
      };
    }

    res.json(obj);
  } catch (err) {
    next(err);
  }
};

/**
 * Public: list completed draws.
 */
exports.listResults = async (req, res, next) => {
  try {
    const draws = await Draw.find({ status: "drawn" })
      .sort({ "quantumProof.drawnAt": -1 })
      .limit(100)
      .populate("winnerUserId", "fullName country")
      .populate("winnerTicketId", "ticketNumber")
      .select("title slug prizeName prizeImages prizeEstimatedValueETB ticketPriceETB ticketPoolSize ticketsSold endDate drawDate quantumProof winnerTicketId winnerUserId");

    const sanitized = draws.map((d) => {
      const obj = d.toJSON();
      if (obj.winnerUserId) {
        const parts = obj.winnerUserId.fullName?.split(" ") || ["Anonymous"];
        const first = parts[0];
        const lastInitial = parts[1] ? parts[1].charAt(0).toUpperCase() + "." : "";
        obj.winnerUserId = {
          displayName: `${first} ${lastInitial}`.trim(),
          country: obj.winnerUserId.country,
        };
      }
      return obj;
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
      .populate("winnerUserId", "fullName country")
      .populate("winnerTicketId", "ticketNumber");

    if (!draw) return res.status(404).json({ message: "Draw result not found" });

    const obj = draw.toJSON();
    if (obj.winnerUserId) {
      const parts = obj.winnerUserId.fullName?.split(" ") || ["Anonymous"];
      const first = parts[0];
      const lastInitial = parts[1] ? parts[1].charAt(0).toUpperCase() + "." : "";
      obj.winnerUserId = {
        displayName: `${first} ${lastInitial}`.trim(),
        country: obj.winnerUserId.country,
      };
    }

    res.json({ draw: obj });
  } catch (err) {
    next(err);
  }
};
