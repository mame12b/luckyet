const AuditLog = require("../models/AuditLog");

/**
 * Log a sensitive action. Never throws — failures are logged but don't break flow.
 */
exports.logAudit = async ({
  actorId,
  actorRole,
  action,
  targetType,
  targetId,
  metadata,
  req,
}) => {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      metadata,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};