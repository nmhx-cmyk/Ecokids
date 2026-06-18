import "server-only";

/**
 * True only when RESEND_API_KEY is present. Lets the app run (checkout, builds,
 * tests) without email configured; transactional email is simply skipped until
 * the key is set.
 */
export const isEmailConfigured = Boolean(process.env.RESEND_API_KEY);

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Low-level Resend sender over the HTTP API (no SDK dependency). Never throws —
 * email must never break the order flow. Returns true on a successful send,
 * false when unconfigured or on any failure.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!isEmailConfigured) {
    console.warn("[email] RESEND_API_KEY not set, skipping send");
    return false;
  }

  const from = process.env.RESEND_FROM ?? "Ecokids <onboarding@resend.dev>";

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[email] Resend responded ${response.status} ${response.statusText}`, detail);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] failed to send", error);
    return false;
  }
}
