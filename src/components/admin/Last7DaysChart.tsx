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
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const barWidthPct = 100 / data.length;
  // Reserve top 4% for ceiling and bottom 24% for the label band.
  const top = 4;
  const bottom = 24;
  const usable = 100 - top - bottom;
  const padding = 1.5;

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label="Doanh thu 7 ngày gần nhất"
      >
        {data.map((d, i) => {
          const ratio = d.revenue / max;
          const heightPct = ratio * (usable / 100) * 60;
          const x = i * barWidthPct + padding;
          const w = barWidthPct - padding * 2;
          const y = 60 - (bottom / 100) * 60 - heightPct;
          const titleText = `${formatShortDate(d.date)} · ${formatVnd(d.revenue)} · ${d.count} đơn`;
          return (
            <g key={d.date}>
              <title>{titleText}</title>
              <rect
                x={x}
                y={y}
                width={w}
                height={Math.max(0.5, heightPct)}
                rx={0.6}
                className="fill-coral-500"
              />
              <text
                x={x + w / 2}
                y={59}
                textAnchor="middle"
                className="fill-ink-500"
                fontSize={3.2}
              >
                {formatShortDate(d.date)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
