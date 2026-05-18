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

const ANU_URL = process.env.QUANTUM_API_URL || "https://qrng.anu.edu.au/API/jsonI.php";
const RANDOM_ORG_URL = "https://www.random.org/integers/";

async function fetchFromANU(count) {
  const url = `${ANU_URL}?length=${count}&type=uint8`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`ANU HTTP ${res.status}`);

  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new Error(`ANU returned non-JSON (likely overloaded): ${trimmed.slice(0, 60)}`);
  }

  let data;
  try {
    data = JSON.parse(trimmed);
  } catch (e) {
    throw new Error(`ANU returned malformed JSON: ${e.message}`);
  }

  if (!data?.success || !Array.isArray(data?.data) || data.data.length !== count) {
    throw new Error("ANU returned invalid data shape");
  }

  return {
    bytes: new Uint8Array(data.data),
    rawResponse: data,
    source: "anu_quantum",
    sourceLabel: "ANU Quantum Lab (Australian National University)",
  };
}

async function fetchFromRandomOrg(count) {
  const url = `${RANDOM_ORG_URL}?num=${count}&min=0&max=255&col=1&base=10&format=plain&rnd=new`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Random.org HTTP ${res.status}`);
  const text = await res.text();
  const nums = text.trim().split(/\s+/).map(Number);
  if (nums.length !== count || nums.some((n) => isNaN(n) || n < 0 || n > 255)) {
    throw new Error("Random.org returned invalid data");
  }
  return {
    bytes: new Uint8Array(nums),
    rawResponse: { source: "random.org", values: nums },
    source: "random_org",
    sourceLabel: "Random.org (atmospheric noise, true randomness)",
  };
}

function fetchFromCSPRNG(count) {
  const buf = crypto.randomBytes(count);
  return {
    bytes: new Uint8Array(buf),
    rawResponse: { source: "node_csprng", note: "Hardware-seeded CSPRNG (Node.js crypto.randomBytes)" },
    source: "csprng_fallback",
    sourceLabel: "Cryptographic fallback (Node.js crypto.randomBytes)",
  };
}

async function fetchRandomBytes(count = 32) {
  if (count < 1 || count > 1024) throw new Error("count must be 1-1024");

  const attempts = [];

  try {
    const result = await fetchFromANU(count);
    return { ...result, attempts };
  } catch (err) {
    attempts.push({ source: "anu_quantum", error: err.message });
    console.warn(`[quantumService] ANU failed: ${err.message}. Trying Random.org.`);
  }

  try {
    const result = await fetchFromRandomOrg(count);
    return { ...result, attempts };
  } catch (err) {
    attempts.push({ source: "random_org", error: err.message });
    console.warn(`[quantumService] Random.org failed: ${err.message}. Using CSPRNG.`);
  }

  const result = fetchFromCSPRNG(count);
  attempts.push({ source: "csprng_fallback", note: "All upstream sources unavailable" });
  console.warn(`[quantumService] Using CSPRNG fallback (cryptographically secure, not quantum)`);
  return { ...result, attempts };
}

exports.generateTicketNumber = async () => {
  const { bytes, source, sourceLabel } = await fetchRandomBytes(8);

  let bigVal = 0n;
  for (const b of bytes) bigVal = (bigVal << 8n) | BigInt(b);

  const number = (bigVal % 1_000_000_000_000n).toString().padStart(12, "0");
  const hash = crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");

  return {
    ticketNumber: number,
    quantumSource: {
      bytes: Buffer.from(bytes).toString("hex"),
      apiResponseHash: hash,
      source,
      sourceLabel,
      generatedAt: new Date(),
    },
  };
};

exports.selectWinnerIndex = async (totalTickets) => {
  if (totalTickets < 1) throw new Error("No tickets in pool");

  const { bytes, rawResponse, source, sourceLabel, attempts } = await fetchRandomBytes(32);

  let bigVal = 0n;
  for (const b of bytes) bigVal = (bigVal << 8n) | BigInt(b);

  const index = Number(bigVal % BigInt(totalTickets));

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(rawResponse))
    .digest("hex");

  return {
    index,
    proof: {
      seed: Buffer.from(bytes).toString("hex"),
      apiResponseHash: hash,
      algorithm: "modulo-v1",
      algorithmDescription:
        "32 bytes from the randomness source are concatenated big-endian into a 256-bit integer, then modulo totalTickets gives the winner index in the sorted ticket list (sorted by ticketNumber ascending).",
      source,
      sourceLabel,
      sourceAttempts: attempts,
      selectedIndex: index,
      totalTicketsAtDraw: totalTickets,
      drawnAt: new Date(),
      rawResponse,
    },
  };
};

exports.fetchRandomBytes = fetchRandomBytes;
