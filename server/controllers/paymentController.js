const Payment = require("../models/Payment");
const Draw = require("../models/Draw");
const Streamer = require("../models/Streamer");
const User = require("../models/User");
const { generateReferenceCode } = require("../utils/referenceCode");
const { convertFromETB, getCurrencyForCountry } = require("../utils/currency");
const { getSettings, getPaymentAccountsForCountry } = require("../services/settingsService");
const { issueTicketsForPayment } = require("../services/ticketService");
const { logAudit } = require("../services/auditService");
const { receiptUrl } = require("../middleware/upload");
const socketService = require("../services/socketService");

// ====== PLAYER ======

/**
 * Player initiates a purchase. Returns reference code + payment instructions.
 */
exports.initiate = async (req, res, next) => {
  try {
    const { drawId, quantity, paymentMethod, promoCode } = req.body;

    // Load draw + check availability
    const draw = await Draw.findById(drawId);
    if (!draw) return res.status(404).json({ message: "Draw not found" });
    if (draw.status !== "active") {
      return res.status(400).json({ message: `Draw is not active (status: ${draw.status})` });
    }

    const remaining = draw.ticketPoolSize - draw.ticketsSold;
    if (quantity > remaining) {
      return res.status(400).json({ message: `Only ${remaining} tickets remaining` });
    }

    // Load user for country / currency
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Subtotal
    const subtotalETB = draw.ticketPriceETB * quantity;
    let discountETB = 0;
    let streamerId = null;
    let promoCodeUsed = null;

    // Apply promo code if provided
    if (promoCode) {
      const streamer = await Streamer.findOne({
        promoCode: promoCode.toUpperCase(),
        status: "active",
      });
      if (streamer) {
        streamerId = streamer._id;
        promoCodeUsed = streamer.promoCode;
        if (streamer.playerDiscountPercent > 0) {
          discountETB = Math.round(subtotalETB * (streamer.playerDiscountPercent / 100));
        }
      } else {
        return res.status(400).json({ message: "Invalid or inactive promo code" });
      }
    }

    const totalETB = subtotalETB - discountETB;

    // Convert to display currency
    const conv = await convertFromETB(totalETB, user.country);

    // Settings: expiry window
    const settings = await getSettings();
    const expiresAt = new Date(Date.now() + settings.paymentExpiryHours * 60 * 60 * 1000);

    // Reference code
    const referenceCode = generateReferenceCode();

    const payment = await Payment.create({
      referenceCode,
      userId: user._id,
      drawId: draw._id,
      quantity,
      unitPriceETB: draw.ticketPriceETB,
      subtotalETB,
      discountETB,
      totalETB,
      displayCurrency: conv.displayCurrency,
      displayAmount: conv.displayAmount,
      exchangeRate: conv.exchangeRate,
      promoCodeUsed,
      streamerId,
      paymentMethod,
      paymentCountry: user.country,
      status: "pending_upload",
      expiresAt,
    });

    // Get the payment accounts visible to this user's country
    const accounts = await getPaymentAccountsForCountry(user.country);

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "payment.initiated",
      targetType: "Payment",
      targetId: payment._id,
      metadata: { drawId, quantity, totalETB, promoCode: promoCodeUsed },
      req,
    });

    res.status(201).json({
      payment,
      instructions: {
        referenceCode,
        totalETB,
        displayAmount: conv.displayAmount,
        displayCurrency: conv.displayCurrency,
        expiresAt,
        accounts,
        steps: [
          `Transfer exactly ${totalETB} ETB (≈ ${conv.displayAmount} ${conv.displayCurrency})`,
          `Include reference code "${referenceCode}" in the transfer note`,
          "Take a screenshot of the successful transfer",
          "Return here and upload the receipt",
        ],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Player uploads receipt (multipart/form-data).
 * Use after multer middleware → req.file is set.
 *
 * THIS is where admins get notified — not at initiate — because the payment
 * isn't "ready for review" until the receipt is attached.
 */
exports.submitReceipt = async (req, res, next) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);
    console.log("USER:", req.user);

    const { transactionNumber } = req.body;
    const payment = await Payment.findById(req.params.id)
      .populate("userId", "fullName country")
      .populate("drawId", "title prizeName");

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your payment" });
    }
    if (payment.status !== "pending_upload") {
      return res.status(400).json({ message: `Cannot upload receipt for payment in status: ${payment.status}` });
    }
    if (payment.expiresAt < new Date()) {
      return res.status(400).json({ message: "Payment has expired. Please initiate a new one." });
    }
    if (!req.file) return res.status(400).json({ message: "Receipt file is required" });

    payment.transactionNumber = transactionNumber;
    payment.receiptImageUrl = receiptUrl(req.file.filename);
    payment.status = "awaiting_verification";
    await payment.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "payment.receipt_uploaded",
      targetType: "Payment",
      targetId: payment._id,
      metadata: { transactionNumber, filename: req.file.filename },
      req,
    });

    // Notify all connected admins: a new payment needs review
    socketService.emitToAdmins("payment.pending", {
      paymentId: payment._id,
      referenceCode: payment.referenceCode,
      userName: payment.userId.fullName,
      userCountry: payment.userId.country,
      drawTitle: payment.drawId?.title || payment.drawId?.prizeName || "a draw",
      amount: payment.totalETB,
      submittedAt: new Date(),
    });

    res.json({ payment });
  } catch (err) {
    next(err);
  }
};

/**
 * Player views own payments.
 */
exports.listMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("drawId", "title prizeName slug");
    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

// ====== ADMIN ======

exports.adminListPending = async (req, res, next) => {
  try {
    const payments = await Payment.find({ status: "awaiting_verification" })
      .sort({ createdAt: 1 }) // oldest first
      .populate("userId", "fullName email phone country")
      .populate("drawId", "title prizeName");
    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

exports.adminListAll = async (req, res, next) => {
  try {
    const { status, drawId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (drawId) filter.drawId = drawId;

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("userId", "fullName email phone country")
      .populate("drawId", "title prizeName");
    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

exports.adminVerify = async (req, res, next) => {
  try {
    const { decision, rejectionReason } = req.body;
    // Populate drawId so the toast can show the draw name
    const payment = await Payment.findById(req.params.id).populate("drawId", "title prizeName");
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.status !== "awaiting_verification") {
      return res.status(400).json({ message: `Payment is in status: ${payment.status}` });
    }

    const drawTitle = payment.drawId?.title || payment.drawId?.prizeName || "a draw";

    // ---------- REJECTED ----------
    if (decision === "rejected") {
      payment.status = "rejected";
      payment.rejectionReason = rejectionReason || "Not specified";
      payment.verifiedBy = req.user.id;
      payment.verifiedAt = new Date();
      await payment.save();

      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: "payment.rejected",
        targetType: "Payment",
        targetId: payment._id,
        metadata: { rejectionReason },
        req,
      });

      // Real-time notify the user — BEFORE return
      socketService.emitToUser(payment.userId.toString(), "payment.rejected", {
        paymentId: payment._id,
        referenceCode: payment.referenceCode,
        drawTitle,
        reason: payment.rejectionReason,
      });

      return res.json({ payment, tickets: [] });
    }

    // ---------- VERIFIED ----------
    payment.status = "verified";
    payment.verifiedBy = req.user.id;
    payment.verifiedAt = new Date();
    await payment.save();

    const tickets = await issueTicketsForPayment(payment);

    // Update streamer stats if applicable
    if (payment.streamerId) {
      const streamer = await Streamer.findById(payment.streamerId);
      if (streamer) {
        const commissionETB = Math.round(
          payment.totalETB * (streamer.commissionPercent / 100)
        );
        streamer.totalTicketsAttributed += payment.quantity;
        streamer.totalSalesETB += payment.totalETB;
        streamer.totalCommissionEarnedETB += commissionETB;
        await streamer.save();

        // Notify streamer in real-time about commission earned
        socketService.emitToUser(streamer.userId.toString(), "streamer.commission", {
          amount: commissionETB,
          ticketsAttributed: payment.quantity,
        });
      }
    }

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "payment.verified",
      targetType: "Payment",
      targetId: payment._id,
      metadata: { ticketsIssued: tickets.length, totalETB: payment.totalETB },
      req,
    });

    // Real-time notify the user — payment approved + tickets issued
socketService.emitToUser(payment.userId.toString(), "payment.verified", {
  paymentId: payment._id,
  referenceCode: payment.referenceCode,
  quantity: payment.quantity,
  drawTitle,
  ticketCount: tickets.length,
  ticketNumbers: tickets.map((t) => t.ticketNumber),   // <-- the actual numbers
  verifiedAt: payment.verifiedAt,
});

    res.json({ payment, tickets });
  } catch (err) {
    next(err);
  }
};
