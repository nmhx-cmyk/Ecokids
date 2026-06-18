import { Banknote } from "lucide-react";

import { CopyButton } from "@/components/storefront/CopyButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { BANK_INFO } from "@/lib/constants/shipping";
import { formatVnd } from "@/lib/utils/format";
import { buildBankTransferContent } from "@/lib/utils/transfer-content";

interface BankTransferInstructionsProps {
  order: {
    orderCode: string;
    total: number;
    shippingAddress: unknown;
  };
}

export function BankTransferInstructions({
  order,
}: BankTransferInstructionsProps) {
  const address = order.shippingAddress as { recipientName: string };
  const transferContent = buildBankTransferContent(
    order.orderCode,
    address.recipientName,
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Banknote className="h-5 w-5 text-coral-600" aria-hidden="true" />
        <CardTitle>Thông tin chuyển khoản</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="divide-y divide-ink-100">
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-sm text-ink-500">Ngân hàng</dt>
            <dd className="text-sm font-medium text-ink-900">
              {BANK_INFO.bankName}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-sm text-ink-500">Số tài khoản</dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-ink-900">
              <span className="font-mono">{BANK_INFO.accountNumber}</span>
              <CopyButton
                value={BANK_INFO.accountNumber}
                label="Sao chép số tài khoản"
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-sm text-ink-500">Chủ tài khoản</dt>
            <dd className="text-sm font-medium text-ink-900">
              {BANK_INFO.accountHolder}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-sm text-ink-500">Số tiền</dt>
            <dd className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <span>{formatVnd(order.total)}</span>
              <CopyButton
                value={String(order.total)}
                label="Sao chép số tiền"
              />
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border border-coral-200 bg-coral-50 p-4">
          <p className="text-sm font-medium text-ink-900">
            Nội dung chuyển khoản — vui lòng ghi đúng để đơn hàng được xác nhận
            nhanh nhất:
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-cream-100 p-3">
            <code className="break-all font-mono text-base font-semibold text-ink-900">
              {transferContent}
            </code>
            <CopyButton
              value={transferContent}
              label="Sao chép nội dung chuyển khoản"
            />
          </div>
        </div>

        <p className="text-xs text-ink-500">
          Đơn hàng sẽ tự động được xác nhận sau khi nhận được tiền (thường trong
          vòng 1-2 giờ). Nếu chưa thấy cập nhật sau 24h, vui lòng liên hệ với
          chúng tôi.
        </p>
      </CardContent>
    </Card>
  );
}
