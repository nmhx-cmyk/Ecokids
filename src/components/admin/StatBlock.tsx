import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface StatBlockDelta {
  value: string;
  label: string;
  positive: boolean;
}

interface StatBlockProps {
  title: string;
  value: string;
  delta?: StatBlockDelta;
}

export function StatBlock({ title, value, delta }: StatBlockProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <p className="text-sm font-medium text-ink-500">{title}</p>
        <p className="text-3xl font-bold text-ink-900">{value}</p>
        {delta ? (
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 font-medium",
                delta.positive
                  ? "bg-mint-50 text-mint-600"
                  : "bg-red-50 text-danger",
              )}
            >
              {delta.value}
            </span>
            <span className="text-ink-500">{delta.label}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
