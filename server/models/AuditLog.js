const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: { type: String },
    action: { type: String, required: true, index: true },
    // e.g. "payment.verified", "draw.created", "winner.selected", "admin.created"

    targetType: { type: String }, // "Payment", "Draw", "User", etc.
    targetId: { type: mongoose.Schema.Types.ObjectId },

    metadata: { type: mongoose.Schema.Types.Mixed }, // any extra context
    ip: { type: String },
    userAgent: { type: String },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { capped: false } // don't cap — we want full history
);

// Prevent any updates — this collection is append-only
auditLogSchema.pre(["updateOne", "updateMany", "findOneAndUpdate"], function (next) {
  next(new Error("Audit logs are immutable"));
});

module.exports = mongoose.model("AuditLog", auditLogSchema);