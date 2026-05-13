const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verify access token from Authorization header.
 * Attaches req.user with id and role.
 */
exports.requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.userId).select("role isActive lockedUntil");
    if (!user) return res.status(401).json({ message: "User not found" });
    if (!user.isActive) return res.status(403).json({ message: "Account disabled" });
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({ message: "Account temporarily locked" });
    }

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Restrict route to specific roles.
 * Usage: requireRole("admin", "super_admin")
 */
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};