const mongoose = require("mongoose");

const drawSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, maxlength: 2000 },

    // Prize
    prizeName: { type: String, required: true },
    prizeDescription: { type: String },
    prizeImages: [{ type: String }], // Cloudinary URLs
    prizeEstimatedValueETB: { type: Number, required: true, min: 0 },

    // Pricing & capacity
    ticketPriceETB: { type: Number, required: true, min: 1 },
    ticketPoolSize: { type: Number, required: true, min: 1 },
    ticketsSold: { type: Number, default: 0, min: 0 },

    // Timing
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    drawDate: { type: Date }, // when winner will be selected

    // Status
    status: {
      type: String,
      enum: ["draft", "active", "sold_out", "closed", "drawn", "cancelled"],
      default: "draft",
      index: true,
    },

    // Winner (filled after draw)
    winnerTicketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Quantum proof (for public verifiability)
    quantumProof: {
      seed: { type: String }, // raw quantum bytes (hex)
      apiResponseHash: { type: String }, // SHA-256 of ANU response
      algorithm: { type: String, default: "modulo-v1" },
      algorithmDescription: { type: String },
      selectedIndex: { type: Number },
      totalTicketsAtDraw: { type: Number },
      drawnAt: { type: Date },
    },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    drawnBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound index for listing active draws
drawSchema.index({ status: 1, endDate: 1 });

// Virtual: percent sold
drawSchema.virtual("percentSold").get(function () {
  return this.ticketPoolSize > 0
    ? Math.round((this.ticketsSold / this.ticketPoolSize) * 100)
    : 0;
});

drawSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Draw", drawSchema);