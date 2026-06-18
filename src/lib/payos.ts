import "server-only";
import { PayOS } from "@payos/node";

const clientId = process.env.PAYOS_CLIENT_ID;
const apiKey = process.env.PAYOS_API_KEY;
const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

/**
 * True only when all three PayOS credentials are present. Lets the app run
 * (COD checkout, builds, tests) without PayOS configured; online payment is
 * simply unavailable until the keys are set.
 */
export const isPayosConfigured = Boolean(clientId && apiKey && checksumKey);

let client: PayOS | null = null;

export function getPayos(): PayOS {
  if (!isPayosConfigured) {
    throw new Error("PayOS is not configured (missing PAYOS_* env vars).");
  }
  if (!client) {
    client = new PayOS({ clientId, apiKey, checksumKey });
  }
  return client;
}
