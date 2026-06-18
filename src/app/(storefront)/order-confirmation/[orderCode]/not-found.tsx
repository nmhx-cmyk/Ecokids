import Link from "next/link";
import { PackageX } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function OrderConfirmationNotFound() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        icon={<PackageX className="h-6 w-6" aria-hidden="true" />}
        title="Không tìm thấy đơn hàng"
        description="Mã đơn hàng có thể sai hoặc bạn không có quyền xem đơn này."
        action={
          <Button asChild>
            <Link href="/">Về trang chủ</Link>
          </Button>
        }
      />
    </div>
  );
}
