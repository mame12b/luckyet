
const Streamer = require("../models/Streamer");
const Payout = require("../models/Payout");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { generateReferenceCode } = require("../utils/referenceCode");
const { logAudit } = require("../services/auditService");
const { getSettings } = require("../services/settingsService");

// ====== PLAYER-SIDE: APPLY TO BECOME A STREAMER ======

exports.apply = async (req, res, next) => {
  try {
    const { promoCode, tiktokHandle, instagramHandle, youtubeHandle, notes, payoutMethod, payoutAccountDetails } = req.body;

    // Check user is not already a streamer
    const existing = await Streamer.findOne({ userId: req.user.id });
    if (existing) {
      return res.status(409).json({
        message: `You already have a streamer profile (status: ${existing.status}). Check your dashboard.`,
      });
    }

    // Check promo code is unique
    const codeTaken = await Streamer.findOne({ promoCode: promoCode.toUpperCase() });
    if (codeTaken) {
      return res.status(409).json({ message: "That promo code is already taken. Pick another." });
    }

    // Must have tiktok or one social channel
    if (!tiktokHandle && !instagramHandle && !youtubeHandle) {
      return res.status(400).json({ message: "Provide at least one social channel (TikTok, Instagram, or YouTube)." });
    }

    const settings = await getSettings();
    const streamer = await Streamer.create({
      userId: req.user.id,
      promoCode: promoCode.toUpperCase(),
      tiktokHandle,
      instagramHandle,
      youtubeHandle,
      notes,
      payoutMethod: payoutMethod || "bank_transfer",
      payoutAccountDetails,
      commissionPercent: settings.defaultStreamerCommissionPercent || 7,
      status: "pending",
    });

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "streamer.applied",
      targetType: "Streamer",
      targetId: streamer._id,
      metadata: { promoCode: streamer.promoCode },
      req,
    });

    res.status(201).json({
      message: "Application submitted. Admin will review and activate your account.",
      streamer,
    });
  } catch (err) {
    next(err);
  }
};

// ====== STREAMER-SIDE: DASHBOARD ======

exports.getMyDashboard = async (req, res, next) => {
  try {
    const streamer = await Streamer.findOne({ userId: req.user.id });
    if (!streamer) {
      return res.status(404).json({
        message: "You don't have a streamer profile yet.",
        hasProfile: false,
      });
    }

    // Available balance = totalCommissionEarned - totalPaidOut - sum of pending payout requests
    const pendingPayouts = await Payout.aggregate([
      { $match: { streamerId: streamer._id, status: { $in: ["requested", "approved"] } } },
      { $group: { _id: null, total: { $sum: "$amountETB" } } },
    ]);
    const reservedETB = pendingPayouts[0]?.total || 0;
    const availableETB = Math.max(
      0,
      streamer.totalCommissionEarnedETB - streamer.totalPaidOutETB - reservedETB
    );

    // Recent attributed sales (last 50 verified payments using this streamer's code)
    const recentSales = await Payment.find({
      streamerId: streamer._id,
      status: "verified",
    })
      .sort({ verifiedAt: -1 })
      .limit(50)
      .populate("drawId", "title prizeName slug")
      .populate("userId", "fullName country")
      .select("referenceCode totalETB quantity verifiedAt drawId userId");

    // Recent payout requests
    const payouts = await Payout.find({ streamerId: streamer._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      hasProfile: true,
      streamer,
      stats: {
        availableETB,
        reservedETB,
        totalEarnedETB: streamer.totalCommissionEarnedETB,
        totalPaidOutETB: streamer.totalPaidOutETB,
        totalSalesETB: streamer.totalSalesETB,
        totalTicketsAttributed: streamer.totalTicketsAttributed,
      },
      recentSales,
      payouts,
    });
  } catch (err) {
    next(err);
  }
};

// ====== STREAMER-SIDE: REQUEST PAYOUT ======

exports.requestPayout = async (req, res, next) => {
  try {
    const { amountETB, method, payoutAccountDetails, notes } = req.body;

    const streamer = await Streamer.findOne({ userId: req.user.id });
    if (!streamer) return res.status(404).json({ message: "Streamer profile not found" });
    if (streamer.status !== "active") {
      return res.status(403).json({ message: `Your account is ${streamer.status}, not active` });
    }

    // Compute available balance
    const pendingPayouts = await Payout.aggregate([
      { $match: { streamerId: streamer._id, status: { $in: ["requested", "approved"] } } },
      { $group: { _id: null, total: { $sum: "$amountETB" } } },
    ]);
    const reservedETB = pendingPayouts[0]?.total || 0;
    const availableETB = streamer.totalCommissionEarnedETB - streamer.totalPaidOutETB - reservedETB;

    if (amountETB > availableETB) {
      return res.status(400).json({
        message: `Requested ${amountETB} ETB exceeds available balance of ${availableETB} ETB.`,
        availableETB,
      });
    }

    const payout = await Payout.create({
      referenceCode: generateReferenceCode("PO"),
      streamerId: streamer._id,
      userId: req.user.id,
      amountETB,
      method,
      payoutAccountDetails,
      notes,
      snapshotAtRequest: {
        totalCommissionEarnedETB: streamer.totalCommissionEarnedETB,
        totalPaidOutETB: streamer.totalPaidOutETB,
        availableETB,
      },
      status: "requested",
    });

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "payout.requested",
      targetType: "Payout",
      targetId: payout._id,
      metadata: { amountETB, method },
      req,
    });

    res.status(201).json({ message: "Payout request submitted", payout });
  } catch (err) {
    next(err);
  }
};

// ====== PUBLIC: VALIDATE PROMO CODE ======

exports.validatePromoCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    if (!code) return res.status(400).json({ valid: false, message: "Code required" });

    const streamer = await Streamer.findOne({
      promoCode: code.toUpperCase(),
      status: "active",
    }).populate("userId", "fullName");

    if (!streamer) return res.json({ valid: false });

    res.json({
      valid: true,
      promoCode: streamer.promoCode,
      playerDiscountPercent: streamer.playerDiscountPercent,
      // Don't expose streamer's full identity — just first name
      streamerName: streamer.userId?.fullName?.split(" ")[0] || "Streamer",
    });
  } catch (err) {
    next(err);
  }
};

// ====== ADMIN-SIDE ======

exports.adminListStreamers = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const streamers = await Streamer.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "fullName email phone country");
    res.json({ streamers });
  } catch (err) {
    next(err);
  }
};

exports.adminGetStreamer = async (req, res, next) => {
  try {
    const streamer = await Streamer.findById(req.params.id)
      .populate("userId", "fullName email phone country");
    if (!streamer) return res.status(404).json({ message: "Streamer not found" });

    const payouts = await Payout.find({ streamerId: streamer._id }).sort({ createdAt: -1 });
    res.json({ streamer, payouts });
  } catch (err) {
    next(err);
  }
};

exports.adminApproveStreamer = async (req, res, next) => {
  try {
    const { commissionPercent, playerDiscountPercent } = req.body;
    const streamer = await Streamer.findById(req.params.id);
    if (!streamer) return res.status(404).json({ message: "Streamer not found" });

    if (streamer.status === "active") {
      return res.status(400).json({ message: "Streamer is already active" });
    }

    if (commissionPercent !== undefined) streamer.commissionPercent = commissionPercent;
    if (playerDiscountPercent !== undefined) streamer.playerDiscountPercent = playerDiscountPercent;
    streamer.status = "active";
    await streamer.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "streamer.approved",
      targetType: "Streamer",
      targetId: streamer._id,
      metadata: { commissionPercent: streamer.commissionPercent },
      req,
    });

    res.json({ message: "Streamer activated", streamer });
  } catch (err) {
    next(err);
  }
};

exports.adminSuspendStreamer = async (req, res, next) => {
  try {
    const streamer = await Streamer.findById(req.params.id);
    if (!streamer) return res.status(404).json({ message: "Streamer not found" });

    const newStatus = streamer.status === "suspended" ? "active" : "suspended";
    streamer.status = newStatus;
    await streamer.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: `streamer.${newStatus}`,
      targetType: "Streamer",
      targetId: streamer._id,
      req,
    });

    res.json({ message: `Streamer ${newStatus}`, streamer });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdateStreamer = async (req, res, next) => {
  try {
    const allowed = ["commissionPercent", "playerDiscountPercent", "notes"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

    const streamer = await Streamer.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!streamer) return res.status(404).json({ message: "Streamer not found" });

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "streamer.updated",
      targetType: "Streamer",
      targetId: streamer._id,
      metadata: { changes: Object.keys(updates) },
      req,
    });

    res.json({ streamer });
  } catch (err) {
    next(err);
  }
};

// ====== ADMIN-SIDE: PAYOUTS ======

exports.adminListPayouts = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const payouts = await Payout.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("streamerId", "promoCode commissionPercent")
      .populate("userId", "fullName email phone country");
    res.json({ payouts });
  } catch (err) {
    next(err);
  }
};

exports.adminPayoutAction = async (req, res, next) => {
  try {
    const { action, rejectionReason, paymentProof } = req.body;
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ message: "Payout not found" });

    const valid = {
      requested: ["approve", "reject"],
      approved: ["mark_paid", "reject"],
      paid: [],
      rejected: [],
      cancelled: [],
    };

    if (!valid[payout.status]?.includes(action)) {
      return res.status(400).json({
        message: `Cannot perform "${action}" on payout in status "${payout.status}"`,
      });
    }

    if (action === "approve") {
      payout.status = "approved";
      payout.reviewedBy = req.user.id;
      payout.reviewedAt = new Date();
    } else if (action === "mark_paid") {
      if (!paymentProof) {
        return res.status(400).json({ message: "paymentProof URL is required when marking paid" });
      }
      payout.status = "paid";
      payout.paidBy = req.user.id;
      payout.paidAt = new Date();
      payout.paymentProof = paymentProof;

      // Update streamer's totalPaidOutETB
      await Streamer.findByIdAndUpdate(payout.streamerId, {
        $inc: { totalPaidOutETB: payout.amountETB },
      });
    } else if (action === "reject") {
      payout.status = "rejected";
      payout.rejectionReason = rejectionReason || "Not specified";
      payout.reviewedBy = req.user.id;
      payout.reviewedAt = new Date();
    }

    await payout.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: `payout.${action}`,
      targetType: "Payout",
      targetId: payout._id,
      metadata: { amountETB: payout.amountETB, rejectionReason },
      req,
    });

    res.json({ payout });
  } catch (err) {
    next(err);
  }
};

// ====== ADMIN-SIDE: CREATE STREAMER DIRECTLY (admin-only invite flow) ======
exports.adminCreateStreamer = async (req, res, next) => {
  try {
    const {
      userId,
      promoCode,
      commissionPercent,
      tiktokHandle,
      instagramHandle,
      youtubeHandle,
      payoutMethod,
      payoutAccountDetails,
      notes,
    } = req.body;

    // Find target user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // No double-streamer
    const existing = await Streamer.findOne({ userId: user._id });
    if (existing) {
      return res.status(409).json({
        message: `User already has a streamer profile (status: ${existing.status}).`,
        streamer: existing,
      });
    }

    // Promo code must be unique
    const codeTaken = await Streamer.findOne({ promoCode: promoCode.toUpperCase() });
    if (codeTaken) {
      return res.status(409).json({ message: "That promo code is already taken." });
    }

    // Create as active immediately (admin already vetted)
    const streamer = await Streamer.create({
      userId: user._id,
      promoCode: promoCode.toUpperCase(),
      commissionPercent: commissionPercent ?? 30,
      playerDiscountPercent: 0,   // attribution-only per product decision
      tiktokHandle,
      instagramHandle,
      youtubeHandle,
      payoutMethod: payoutMethod || "bank_transfer",
      payoutAccountDetails: payoutAccountDetails || "",
      notes,
      status: "active",
    });

    // Promote user's role so they see the streamer dashboard
    if (user.role === "player") {
      user.role = "streamer";
      await user.save();
    }

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "streamer.created_by_admin",
      targetType: "Streamer",
      targetId: streamer._id,
      metadata: { promoCode: streamer.promoCode, targetUserId: user._id },
      req,
    });

    res.status(201).json({ message: "Streamer created and activated.", streamer });
  } catch (err) {
    next(err);
  }
};
