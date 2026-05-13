const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    // Unique ticket number — generated using quantum RNG
    ticketNumber: { type: String, required: true, unique: true, index: true },

    drawId: { type: mongoose.Schema.Types.ObjectId, ref: "Draw", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },

    // Quantum source data (audit trail)
    quantumSource: {
      bytes: { type: String }, // hex
      apiResponseHash: { type: String },
      generatedAt: { type: Date, default: Date.now },
    },

    status: {
      type: String,
      enum: ["active", "won", "lost", "voided"],
      default: "active",
      index: true,
    },

    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One user can have many tickets in a draw; compound index for queries
ticketSchema.index({ drawId: 1, userId: 1 });
ticketSchema.index({ drawId: 1, status: 1 });

module.exports = mongoose.model("Ticket", ticketSchema);