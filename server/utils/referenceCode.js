const crypto = require("crypto");

// Use unambiguous alphabet (no 0/O, no 1/I)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a short reference code like "LK-A7F3K2".
 * Cryptographically random, easy to read out loud or type.
 */
exports.generateReferenceCode = (prefix = "LK") => {
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (const b of bytes) {
    code += ALPHABET[b % ALPHABET.length];
  }
  return `${prefix}-${code}`;
};