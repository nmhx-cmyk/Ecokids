import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function ProductNotFound() {
  return (
    <div className="container max-w-3xl py-16">
      <EmptyState
        icon={<PackageOpen className="h-6 w-6" strokeWidth={1.5} />}
        title="Sản phẩm không tồn tại"
        description="Sản phẩm bạn đang tìm có thể đã được gỡ hoặc đường dẫn không chính xác."
        action={
          <Button asChild>
            <Link href="/products">Khám phá sản phẩm khác</Link>
          </Button>
        }
      />
    </div>
  );
}
