import {
  CheckCircle2,
  CircleCheckBig,
  Clock,
  Package,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";

import { cn } from "@/lib/utils/cn";

interface Step {
  status: Exclude<OrderStatus, "CANCELED">;
  label: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { status: "PENDING", label: "Chờ xác nhận", icon: Clock },
  { status: "CONFIRMED", label: "Đã xác nhận", icon: CheckCircle2 },
  { status: "PACKING", label: "Đóng gói", icon: Package },
  { status: "SHIPPING", label: "Đang giao", icon: Truck },
  { status: "COMPLETED", label: "Hoàn thành", icon: CircleCheckBig },
];

interface OrderStatusTimelineProps {
  status: OrderStatus;
}

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  if (status === "CANCELED") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-danger">
        <XCircle className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Đơn hàng đã bị huỷ</p>
          <p className="text-xs text-ink-500">
            Đơn hàng này đã được huỷ và sẽ không được xử lý tiếp.
          </p>
        </div>
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-0">
      {STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isCurrent = index === activeIndex;
        const Icon = step.icon;

        return (
          <li
            key={step.status}
            className="flex items-start gap-3 lg:flex-1 lg:flex-col lg:items-center lg:text-center"
          >
            <div className="flex flex-col items-center lg:w-full lg:flex-row">
              <span
                className={cn(
                  "z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors lg:mx-auto",
                  isCompleted &&
                    "border-coral-600 bg-coral-600 text-white",
                  isCurrent && "border-coral-500 bg-coral-50 text-coral-600",
                  !isCompleted &&
                    !isCurrent &&
                    "border-ink-200 bg-white text-ink-500",
                )}
                aria-hidden="true"
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </span>
              {index < STEPS.length - 1 ? (
                <span
                  className={cn(
                    "ml-4 h-8 w-0.5 lg:ml-0 lg:mt-0 lg:h-0.5 lg:w-full lg:flex-1",
                    isCompleted ? "bg-coral-500" : "bg-ink-200",
                  )}
                />
              ) : null}
            </div>
            <div className="pb-3 lg:mt-2 lg:pb-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  isCurrent
                    ? "text-coral-600"
                    : isCompleted
                      ? "text-ink-900"
                      : "text-ink-500",
                )}
              >
                {step.label}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
