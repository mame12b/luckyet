const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Draw = require("../models/Draw");
const Ticket = require("../models/Ticket");
const User = require("../models/User");

// Convert a "days ago" param to a Date floor.
function daysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// ===== KPI cards: snapshot of key numbers =====
exports.kpis = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);
    const startOf7d = daysAgo(7);
    const startOf30d = daysAgo(30);

    const [
      todayAgg,
      yesterdayAgg,
      last7Agg,
      last30Agg,
      allTimeAgg,
      pendingCount,
      activeDraws,
      totalPlayers,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "verified", verifiedAt: { $gte: startOfToday } } },
        { $group: { _id: null, count: { $sum: 1 }, tickets: { $sum: "$quantity" }, revenue: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "verified", verifiedAt: { $gte: startOfYesterday, $lt: startOfToday } } },
        { $group: { _id: null, count: { $sum: 1 }, tickets: { $sum: "$quantity" }, revenue: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "verified", verifiedAt: { $gte: startOf7d } } },
        { $group: { _id: null, count: { $sum: 1 }, tickets: { $sum: "$quantity" }, revenue: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "verified", verifiedAt: { $gte: startOf30d } } },
        { $group: { _id: null, count: { $sum: 1 }, tickets: { $sum: "$quantity" }, revenue: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "verified" } },
        { $group: { _id: null, count: { $sum: 1 }, tickets: { $sum: "$quantity" }, revenue: { $sum: "$amount" } } },
      ]),
      Payment.countDocuments({ status: { $in: ["pending", "submitted"] } }),
      Draw.countDocuments({ status: "active" }),
      User.countDocuments({ role: "player", isActive: true }),
    ]);

    const pick = (arr) => arr[0] || { count: 0, tickets: 0, revenue: 0 };
    const today = pick(todayAgg);
    const yesterday = pick(yesterdayAgg);

    // Day-over-day percentage change
    const dodChange = yesterday.revenue > 0
      ? ((today.revenue - yesterday.revenue) / yesterday.revenue) * 100
      : null;

    res.json({
      today: today,
      yesterday: yesterday,
      dodChangePercent: dodChange,
      last7Days: pick(last7Agg),
      last30Days: pick(last30Agg),
      allTime: pick(allTimeAgg),
      pendingPayments: pendingCount,
      activeDraws,
      totalPlayers,
    });
  } catch (err) { next(err); }
};

// ===== Daily sales chart: last N days =====
exports.dailySales = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const start = daysAgo(days - 1);

    const result = await Payment.aggregate([
      { $match: { status: "verified", verifiedAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$verifiedAt", timezone: "UTC" } },
          tickets: { $sum: "$quantity" },
          revenue: { $sum: "$amount" },
          payments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with zeros so the chart isn't jagged
    const series = [];
    const map = new Map(result.map((r) => [r._id, r]));
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      series.push({
        date: key,
        tickets: row?.tickets || 0,
        revenue: row?.revenue || 0,
        payments: row?.payments || 0,
      });
    }

    res.json({ series });
  } catch (err) { next(err); }
};

// ===== Per-draw breakdown =====
exports.drawBreakdown = async (req, res, next) => {
  try {
    const result = await Payment.aggregate([
      { $match: { status: "verified" } },
      {
        $group: {
          _id: "$drawId",
          tickets: { $sum: "$quantity" },
          revenue: { $sum: "$amount" },
          buyers: { $addToSet: "$userId" },
        },
      },
      { $project: { _id: 1, tickets: 1, revenue: 1, uniqueBuyers: { $size: "$buyers" } } },
      {
        $lookup: {
          from: "draws",
          localField: "_id",
          foreignField: "_id",
          as: "draw",
        },
      },
      { $unwind: "$draw" },
      {
        $project: {
          drawId: "$_id",
          title: "$draw.title",
          slug: "$draw.slug",
          status: "$draw.status",
          drawAt: "$draw.drawAt",
          ticketPoolSize: "$draw.ticketPoolSize",
          ticketPrice: "$draw.ticketPrice",
          tickets: 1,
          revenue: 1,
          uniqueBuyers: 1,
          fillPercent: {
            $multiply: [
              { $divide: ["$tickets", { $max: ["$draw.ticketPoolSize", 1] }] },
              100,
            ],
          },
          _id: 0,
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]);

    res.json({ draws: result });
  } catch (err) { next(err); }
};

// ===== Country & payment method breakdown =====
exports.breakdowns = async (req, res, next) => {
  try {
    const [byCountry, byMethod] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "verified" } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $group: {
            _id: "$user.country",
            tickets: { $sum: "$quantity" },
            revenue: { $sum: "$amount" },
            buyers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            country: "$_id",
            tickets: 1,
            revenue: 1,
            buyers: { $size: "$buyers" },
            _id: 0,
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Payment.aggregate([
        { $match: { status: "verified" } },
        {
          $group: {
            _id: "$method",
            tickets: { $sum: "$quantity" },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            method: "$_id",
            tickets: 1,
            revenue: 1,
            count: 1,
            _id: 0,
          },
        },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    res.json({ byCountry, byMethod });
  } catch (err) { next(err); }
};

// ===== Promoter performance =====
exports.promoters = async (req, res, next) => {
  try {
    // Payments with a promo code attribution → group by promo
    const result = await Payment.aggregate([
      { $match: { status: "verified", promoCode: { $exists: true, $ne: null, $ne: "" } } },
      {
        $group: {
          _id: { $toUpper: "$promoCode" },
          tickets: { $sum: "$quantity" },
          revenue: { $sum: "$amount" },
          buyers: { $addToSet: "$userId" },
        },
      },
      {
        $lookup: {
          from: "streamers",
          let: { code: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: [{ $toUpper: "$promoCode" }, "$$code"] } } }],
          as: "streamer",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "streamer.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          promoCode: "$_id",
          name: { $arrayElemAt: ["$user.fullName", 0] },
          phone: { $arrayElemAt: ["$user.phone", 0] },
          tickets: 1,
          revenue: 1,
          uniqueBuyers: { $size: "$buyers" },
          commissionRate: { $arrayElemAt: ["$streamer.commissionRate", 0] },
          _id: 0,
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]);

    res.json({ promoters: result });
  } catch (err) { next(err); }
};
