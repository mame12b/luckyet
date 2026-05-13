/**
 * Quantum RNG service.
 *
 * Source: ANU Quantum Random Numbers (https://qrng.anu.edu.au)
 * They generate randomness from quantum vacuum fluctuations.
 *
 * IMPORTANT: If quantum source is unreachable, we DO NOT fall back to Math.random().
 * Instead, we throw — the caller (admin draw flow) must decide whether to retry or
 * pause the operation. This preserves trust.
 */

const crypto = require("crypto");

const QUANTUM_URL = process.env.QUANTUM_API_URL || "https://qrng.anu.edu.au/API/jsonI.php";

/**
 * Fetch raw quantum bytes from ANU.
 * @param {number} count - how many uint8 values to fetch (1-1024)
 * @returns {Promise<{ bytes: Uint8Array, rawResponse: object, hash: string }>}
 */
async function fetchQuantumBytes(count = 32) {
  if (count < 1 || count > 1024) throw new Error("count must be 1-1024");

  const url = `${QUANTUM_URL}?length=${count}&type=uint8`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!res.ok) throw new Error(`Quantum API HTTP ${res.status}`);
  const data = await res.json();

  if (!data?.success || !Array.isArray(data?.data)) {
    throw new Error("Quantum API returned invalid data");
  }

  const bytes = new Uint8Array(data.data);
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");

  return { bytes, rawResponse: data, hash };
}

/**
 * Generate a quantum-random 12-digit ticket number.
 * Returns the number plus the audit trail (bytes used + hash).
 */
exports.generateTicketNumber = async () => {
  const { bytes, hash } = await fetchQuantumBytes(8);

  // Convert 8 bytes to a BigInt, then to 12-digit string
  let bigVal = 0n;
  for (const b of bytes) bigVal = (bigVal << 8n) | BigInt(b);

  const number = (bigVal % 1_000_000_000_000n).toString().padStart(12, "0");

  return {
    ticketNumber: number,
    quantumSource: {
      bytes: Buffer.from(bytes).toString("hex"),
      apiResponseHash: hash,
      generatedAt: new Date(),
    },
  };
};

/**
 * Select a winner index from [0, totalTickets) using quantum randomness.
 * Returns the index + full proof object suitable for public verification.
 */
exports.selectWinnerIndex = async (totalTickets) => {
  if (totalTickets < 1) throw new Error("No tickets in pool");

  const { bytes, rawResponse, hash } = await fetchQuantumBytes(32);

  // Build a large unbiased integer from 32 quantum bytes
  let bigVal = 0n;
  for (const b of bytes) bigVal = (bigVal << 8n) | BigInt(b);

  // Modulo selection. For very large totalTickets we'd reject-sample to avoid
  // modulo bias, but with 32 bytes (256 bits) vs. tickets in the thousands,
  // the bias is astronomically small.
  const index = Number(bigVal % BigInt(totalTickets));

  return {
    index,
    proof: {
      seed: Buffer.from(bytes).toString("hex"),
      apiResponseHash: hash,
      algorithm: "modulo-v1",
      algorithmDescription:
        "32 quantum bytes from ANU are concatenated big-endian into a 256-bit integer, then modulo totalTickets gives the winner index in the sorted ticket list (sorted by ticketNumber ascending).",
      selectedIndex: index,
      totalTicketsAtDraw: totalTickets,
      drawnAt: new Date(),
      rawResponse,
    },
  };
};

exports.fetchQuantumBytes = fetchQuantumBytes;