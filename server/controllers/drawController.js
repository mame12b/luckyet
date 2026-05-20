const Draw = require("../models/Draw");
const Ticket = require("../models/Ticket");
const { logAudit } = require("../services/auditService");
const { convertFromETB } = require("../utils/currency");

// ====== PUBLIC ======

exports.listActive = async (req, res, next) => {
  try {
    const draws = await Draw.find({ status: { $in: ["active", "sold_out"] } })
      .sort({ endDate: 1 })
      .select("-quantumProof");
    res.json({ draws });
  } catch (err) {
    next(err);
  }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const draw = await Draw.findOne({ slug: req.params.slug });
    if (!draw) return res.status(404).json({ message: "Draw not found" });

    // Hide quantum proof unless drawn
    const result = draw.toJSON();
    if (draw.status !== "drawn") delete result.quantumProof;

    // If user provided country, attach display currency
    const country = req.query.country;
    if (country) {
      const conv = await convertFromETB(draw.ticketPriceETB, country);
      result.priceDisplay = conv;
    }

    res.json({ draw: result });
  } catch (err) {
    next(err);
  }
};

exports.listPastDraws = async (req, res, next) => {
  try {
    const draws = await Draw.find({ status: "drawn" })
      .sort({ "quantumProof.drawnAt": -1 })
      .limit(50)
      .populate("winnerUserId", "fullName country")
      .populate("winnerTicketId", "ticketNumber");
    res.json({ draws });
  } catch (err) {
    next(err);
  }
};

// ====== ADMIN ======

exports.adminListAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const draws = await Draw.find(filter).sort({ createdAt: -1 });
    res.json({ draws });
  } catch (err) {
    next(err);
  }
};

exports.adminCreate = async (req, res, next) => {
  try {
    const data = req.body;

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      return res.status(400).json({ message: "endDate must be after startDate" });
    }

    // Validate prize tiers if provided
    if (data.prizes?.length) {
      const tiers = data.prizes.map((p) => p.tier);
      const uniqueTiers = new Set(tiers);
      if (uniqueTiers.size !== tiers.length) {
        return res.status(400).json({ message: "Prize tiers must be unique" });
      }
      // Tiers should start at 1 and be sequential
      const sorted = [...tiers].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] !== i + 1) {
          return res.status(400).json({ message: "Prize tiers must be sequential starting at 1 (1, 2, 3, ...)" });
        }
      }
    }

    const draw = await Draw.create({
      ...data,
      createdBy: req.user.id,
    });

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "draw.created",
      targetType: "Draw",
      targetId: draw._id,
      metadata: { title: draw.title, slug: draw.slug, tierCount: data.prizes?.length || 1 },
      req,
    });

    res.status(201).json({ draw });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdate = async (req, res, next) => {
  try {
    const draw = await Draw.findById(req.params.id);
    if (!draw) return res.status(404).json({ message: "Draw not found" });

    // Once active or beyond, restrict what can change
    const lockedStatuses = ["active", "sold_out", "closed", "drawn"];
    if (lockedStatuses.includes(draw.status)) {
      const allowed = ["description", "prizeImages", "drawDate"];
      const keys = Object.keys(req.body);
      const invalid = keys.filter((k) => !allowed.includes(k));
      if (invalid.length) {
        return res.status(400).json({
          message: `Cannot update fields after draw is ${draw.status}: ${invalid.join(", ")}`,
        });
      }
    }

    Object.assign(draw, req.body);
    await draw.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "draw.updated",
      targetType: "Draw",
      targetId: draw._id,
      metadata: { changes: Object.keys(req.body) },
      req,
    });

    res.json({ draw });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const draw = await Draw.findById(req.params.id);
    if (!draw) return res.status(404).json({ message: "Draw not found" });

    const valid = {
      draft: ["active", "cancelled"],
      active: ["closed", "cancelled"],
      sold_out: ["closed"],
      closed: [], // can only be advanced to "drawn" via winner-selection endpoint
      drawn: [],
      cancelled: [],
    };

    if (!valid[draw.status]?.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from ${draw.status} to ${status}`,
      });
    }

    draw.status = status;
    if (status === "closed") draw.closedBy = req.user.id;
    await draw.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: `draw.status_changed.${status}`,
      targetType: "Draw",
      targetId: draw._id,
      req,
    });

    res.json({ draw });
  } catch (err) {
    next(err);
  }
};

exports.adminGetTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ drawId: req.params.id })
      .populate("userId", "fullName email phone country")
      .sort({ ticketNumber: 1 });
    res.json({ tickets, count: tickets.length });
  } catch (err) {
    next(err);
  }
};