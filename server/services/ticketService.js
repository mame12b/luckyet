const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const Draw = require("../models/Draw");
const { generateTicketNumber } = require("./quantumService");

/**
 * Issue N tickets for a verified payment.
 * Uses quantum RNG for each ticket number.
 * Atomically increments ticketsSold on the draw.
 *
 * Returns the array of created tickets.
 */
exports.issueTicketsForPayment = async (payment) => {
  const tickets = [];

  for (let i = 0; i < payment.quantity; i++) {
    // Generate quantum ticket number (with retry on collision — extremely unlikely but possible)
    let ticketNumber, quantumSource;
    for (let attempt = 0; attempt < 5; attempt++) {
      const generated = await generateTicketNumber();
      const exists = await Ticket.exists({ ticketNumber: generated.ticketNumber });
      if (!exists) {
        ticketNumber = generated.ticketNumber;
        quantumSource = generated.quantumSource;
        break;
      }
    }
    if (!ticketNumber) {
      throw new Error("Failed to generate unique ticket number after 5 attempts");
    }

    const ticket = await Ticket.create({
      ticketNumber,
      drawId: payment.drawId,
      userId: payment.userId,
      paymentId: payment._id,
      quantumSource,
      status: "active",
    });

    tickets.push(ticket);
  }

  // Atomically increment ticketsSold on the draw
  const draw = await Draw.findByIdAndUpdate(
    payment.drawId,
    { $inc: { ticketsSold: payment.quantity } },
    { new: true }
  );

  // If sold out, mark draw accordingly
  if (draw && draw.ticketsSold >= draw.ticketPoolSize) {
    await Draw.findByIdAndUpdate(payment.drawId, { status: "sold_out" });
  }

  return tickets;
};