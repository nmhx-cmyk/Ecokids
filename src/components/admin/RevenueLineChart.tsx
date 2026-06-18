"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatVnd } from "@/lib/utils/format";

interface RevenuePoint {
  date: string;
  revenue: number;
}

interface RevenueLineChartProps {
  data: RevenuePoint[];
}

const COMPACT = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function RevenueLineChart({ data }: RevenueLineChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(value: string) => value.slice(5)}
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(value: number) => COMPACT.format(value)}
            width={56}
          />
          <Tooltip
            formatter={(value) => [formatVnd(Number(value)), "Doanh thu"]}
            labelFormatter={(label) => `Ngày ${String(label)}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#ff6b5e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
