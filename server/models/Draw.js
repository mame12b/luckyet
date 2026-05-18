const mongoose = require("mongoose");

const drawSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, maxlength: 2000 },

    prizeName: { type: String, required: true },
    prizeDescription: { type: String },
    prizeImages: [{ type: String }],
    prizeEstimatedValueETB: { type: Number, required: true, min: 0 },

    ticketPriceETB: { type: Number, required: true, min: 1 },
    ticketPoolSize: { type: Number, required: true, min: 1 },
    ticketsSold: { type: Number, default: 0, min: 0 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    drawDate: { type: Date },

    status: {
      type: String,
      enum: ["draft", "active", "sold_out", "closed", "drawing", "drawn", "cancelled"],
      default: "draft",
      index: true,
    },

    // Live broadcast / animation state
    drawAnimation: {
      startedAt: { type: Date },         // when the broadcast started
      durationMs: { type: Number, default: 20000 },
      phase: { type: String, enum: ["idle", "running", "complete"], default: "idle" },
      sampleTicketNumbers: [{ type: String }], // ticket numbers to show during spinning (anonymized teaser pool)
    },

    winnerTicketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    quantumProof: {
      seed: { type: String },
      apiResponseHash: { type: String },
      algorithm: { type: String, default: "modulo-v1" },
      algorithmDescription: { type: String },
      selectedIndex: { type: Number },
      totalTicketsAtDraw: { type: Number },
      drawnAt: { type: Date },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    drawnBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

drawSchema.index({ status: 1, endDate: 1 });

drawSchema.virtual("percentSold").get(function () {
  return this.ticketPoolSize > 0
    ? Math.round((this.ticketsSold / this.ticketPoolSize) * 100)
    : 0;
});

drawSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Draw", drawSchema);
