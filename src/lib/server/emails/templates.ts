import "server-only";

import { formatVnd } from "@/lib/utils/format";

const BRAND_COLOR = "#ff6b5e";

export interface OrderEmailItem {
  productName: string;
  variantSize: string;
  variantColor: string;
  quantity: number;
  subtotal: number;
}

export interface OrderEmailData {
  orderCode: string;
  recipientName: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingFee: number;
  discountTotal: number;
  total: number;
}

/**
 * Wraps body markup in a centered, inline-styled responsive shell. All CSS is
 * inline so it survives email clients that strip <style> blocks.
 */
function layout(heading: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:24px 32px;">
              <span style="font-size:22px;font-weight:bold;color:#ffffff;">Ecokids</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${heading}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
              Email được gửi tự động từ Ecokids. Vui lòng không trả lời email này.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function summaryRow(label: string, value: string, strong = false): string {
  const weight = strong ? "bold" : "normal";
  const size = strong ? "16px" : "14px";
  return `<tr>
    <td style="padding:6px 0;font-size:${size};font-weight:${weight};color:#374151;">${label}</td>
    <td align="right" style="padding:6px 0;font-size:${size};font-weight:${weight};color:#111827;">${value}</td>
  </tr>`;
}

function itemsTable(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      (item) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">
        ${item.productName}<br />
        <span style="font-size:12px;color:#6b7280;">${item.variantSize} / ${item.variantColor} × ${item.quantity}</span>
      </td>
      <td align="right" style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;white-space:nowrap;">
        ${formatVnd(item.subtotal)}
      </td>
    </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">${rows}</table>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;color:#374151;">Xin chào ${name},</p>`;
}

export function orderPlacedTemplate(data: OrderEmailData): {
  subject: string;
  html: string;
} {
  const summary = [
    summaryRow("Tạm tính", formatVnd(data.subtotal)),
    summaryRow("Phí vận chuyển", formatVnd(data.shippingFee)),
    data.discountTotal > 0 ? summaryRow("Giảm giá", `-${formatVnd(data.discountTotal)}`) : "",
    summaryRow("Tổng cộng", formatVnd(data.total), true),
  ].join("");

  const body = `${greeting(data.recipientName)}
    <p style="margin:0 0 16px;font-size:14px;color:#374151;">
      Cảm ơn bạn đã đặt hàng tại Ecokids. Đơn hàng <strong>${data.orderCode}</strong> của bạn đã được tiếp nhận.
    </p>
    ${itemsTable(data.items)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;padding-top:8px;">
      ${summary}
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;">Ecokids sẽ liên hệ và giao hàng sớm nhất. Cảm ơn bạn!</p>`;

  return {
    subject: `Xác nhận đơn hàng ${data.orderCode} - Ecokids`,
    html: layout("Cảm ơn bạn đã đặt hàng!", body),
  };
}

export function orderStatusTemplate(data: {
  orderCode: string;
  recipientName: string;
  status: string;
  statusLabel: string;
}): { subject: string; html: string } {
  const body = `${greeting(data.recipientName)}
    <p style="margin:0 0 16px;font-size:14px;color:#374151;">
      Đơn hàng <strong>${data.orderCode}</strong> của bạn hiện đang ở trạng thái:
    </p>
    <p style="margin:0 0 16px;">
      <span style="display:inline-block;padding:8px 16px;border-radius:999px;background-color:${BRAND_COLOR};color:#ffffff;font-size:14px;font-weight:bold;">${data.statusLabel}</span>
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;">Cảm ơn bạn đã mua sắm tại Ecokids!</p>`;

  return {
    subject: `Cập nhật đơn hàng ${data.orderCode} - Ecokids`,
    html: layout("Cập nhật trạng thái đơn hàng", body),
  };
}

export function payosPaidTemplate(data: {
  orderCode: string;
  recipientName: string;
  total: number;
}): { subject: string; html: string } {
  const body = `${greeting(data.recipientName)}
    <p style="margin:0 0 16px;font-size:14px;color:#374151;">
      Ecokids đã nhận được thanh toán <strong>${formatVnd(data.total)}</strong> cho đơn hàng <strong>${data.orderCode}</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;">
      Đơn hàng của bạn đang được xử lý và sẽ sớm được giao. Cảm ơn bạn!
    </p>`;

  return {
    subject: `Đã nhận thanh toán đơn ${data.orderCode} - Ecokids`,
    html: layout("Thanh toán thành công", body),
  };
}
