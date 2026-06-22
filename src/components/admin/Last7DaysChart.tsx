import { formatVnd } from "@/lib/utils/format";

interface Last7DaysChartProps {
  data: Array<{ date: string; count: number; revenue: number }>;
}

function formatShortDate(iso: string): string {
  // iso = "YYYY-MM-DD" — display as dd/MM.
  const [, month, day] = iso.split("-");
  if (!month || !day) return iso;
  return `${day}/${month}`;
}

export function Last7DaysChart({ data }: Last7DaysChartProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.count, 0);
  const maxRevenue = Math.max(...data.map((item) => item.revenue), 0);
  const hasRevenue = maxRevenue > 0;
  const averageRevenue = data.length > 0 ? Math.round(totalRevenue / data.length) : 0;

  const yAxisLabels = hasRevenue ? [maxRevenue, Math.round(maxRevenue / 2), 0] : [0, 0, 0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-ink-200 bg-cream-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Tổng doanh thu</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">{formatVnd(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Tổng đơn</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">{totalOrders}</p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Trung bình/ngày
          </p>
          <p className="mt-1 text-lg font-semibold text-ink-900">{formatVnd(averageRevenue)}</p>
        </div>
      </div>

      <div
        className="relative min-h-72 overflow-hidden rounded-lg border border-ink-200 bg-white"
        role="img"
        aria-label="Doanh thu 7 ngày gần nhất"
      >
        <div className="absolute inset-x-0 top-4 flex flex-col gap-[70px] px-4">
          {yAxisLabels.map((label, index) => (
            <div key={`${label}-${index}`} className="flex items-center gap-3">
              <span className="text-ink-400 w-10 text-right text-[11px] sm:w-14">
                {hasRevenue ? formatVnd(label).replace(/\s?₫$/, "") : "0"}
              </span>
              <span className="bg-ink-100 h-px flex-1" />
            </div>
          ))}
        </div>

        {!hasRevenue ? (
          <div className="text-ink-600 absolute inset-x-4 top-16 ml-12 rounded-lg border border-dashed border-ink-200 bg-cream-50 px-4 py-3 text-sm sm:ml-16">
            Chưa phát sinh doanh thu trong 7 ngày này.
            {totalOrders > 0 ? ` Có ${totalOrders} đơn chưa ghi nhận thanh toán.` : ""}
          </div>
        ) : null}

        <div className="relative z-[1] grid min-h-72 grid-cols-7 items-end gap-1 px-4 pb-4 pl-16 pt-8 sm:gap-3 sm:pl-24">
          {data.map((item) => {
            const height = hasRevenue
              ? Math.max(8, Math.round((item.revenue / maxRevenue) * 168))
              : 8;
            const hasOrderWithoutRevenue = item.count > 0 && item.revenue === 0;
            const title = `${formatShortDate(item.date)} · ${formatVnd(item.revenue)} · ${item.count} đơn`;

            return (
              <div
                key={item.date}
                className="flex min-w-0 flex-col items-center gap-3"
                title={title}
              >
                <div className="flex h-44 w-full items-end justify-center">
                  {hasOrderWithoutRevenue ? (
                    <span className="border-coral-300 text-coral-700 mb-1 flex h-8 w-8 items-center justify-center rounded-full border bg-coral-50 text-xs font-semibold">
                      {item.count}
                    </span>
                  ) : item.revenue === 0 ? (
                    <span className="mb-1 h-2 w-full max-w-12 rounded-full bg-ink-200" />
                  ) : (
                    <div
                      className="shadow-coral-200 w-full max-w-12 rounded-t-lg bg-coral-500 shadow-sm transition-colors hover:bg-coral-600"
                      style={{ height }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="flex min-h-14 flex-col items-center gap-1 text-center">
                  <span className="text-xs font-medium text-ink-700">
                    {formatShortDate(item.date)}
                  </span>
                  <span className="text-[11px] text-ink-500">{item.count} đơn</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
