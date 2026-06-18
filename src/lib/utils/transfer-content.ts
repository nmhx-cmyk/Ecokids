// Build the bank-transfer memo line shown to the buyer.
//
// Format: `<ORDER_CODE> <RECIPIENT_NAME_NO_DIACRITICS_UPPER>`.
// The recipient's name is NFD-normalized, diacritics are stripped, đ/Đ
// is folded to D, non-letters become spaces, multiple spaces collapse, and
// the result is uppercased.
//
// Examples:
//   buildBankTransferContent("ECO-2026-000001", "Nguyễn Văn A")
//     -> "ECO-2026-000001 NGUYEN VAN A"
//   buildBankTransferContent("ECO-1", "  Trần   Thị  Bích-Đào ")
//     -> "ECO-1 TRAN THI BICH DAO"
export function buildBankTransferContent(
  orderCode: string,
  recipientName: string,
): string {
  const normalized = recipientName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return `${orderCode} ${normalized}`.trim();
}
