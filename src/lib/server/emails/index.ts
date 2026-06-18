import "server-only";

import { sendEmail } from "@/lib/email";

import {
  orderPlacedTemplate,
  orderStatusTemplate,
  payosPaidTemplate,
  type OrderEmailData,
  type OrderEmailItem,
} from "./templates";

export type { OrderEmailData, OrderEmailItem };

export async function sendOrderPlacedEmail(to: string, data: OrderEmailData): Promise<boolean> {
  const { subject, html } = orderPlacedTemplate(data);
  return sendEmail({ to, subject, html });
}

export async function sendOrderStatusEmail(
  to: string,
  data: { orderCode: string; recipientName: string; status: string; statusLabel: string },
): Promise<boolean> {
  const { subject, html } = orderStatusTemplate(data);
  return sendEmail({ to, subject, html });
}

export async function sendPayosPaidEmail(
  to: string,
  data: { orderCode: string; recipientName: string; total: number },
): Promise<boolean> {
  const { subject, html } = payosPaidTemplate(data);
  return sendEmail({ to, subject, html });
}
