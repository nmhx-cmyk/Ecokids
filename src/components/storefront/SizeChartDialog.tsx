"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";

interface SizeChartRow {
  size: string;
  height: string;
  weight: string;
}

const SIZE_CHART: ReadonlyArray<SizeChartRow> = [
  { size: "0-3M", height: "50-60", weight: "3-6" },
  { size: "3-6M", height: "60-65", weight: "6-8" },
  { size: "6-12M", height: "65-75", weight: "8-10" },
  { size: "1T", height: "75-85", weight: "10-12" },
  { size: "2T", height: "85-95", weight: "12-14" },
  { size: "3T", height: "95-100", weight: "14-16" },
  { size: "4T", height: "100-105", weight: "16-18" },
  { size: "6T", height: "105-115", weight: "18-22" },
  { size: "8T", height: "115-125", weight: "22-26" },
  { size: "10T", height: "125-135", weight: "26-32" },
  { size: "12T", height: "135-145", weight: "32-38" },
];

export interface SizeChartDialogProps {
  trigger: React.ReactNode;
}

export function SizeChartDialog({ trigger }: SizeChartDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bảng quy đổi size</DialogTitle>
          <DialogDescription>
            Tham khảo chiều cao và cân nặng để chọn size phù hợp cho bé.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 overflow-hidden rounded-xl border border-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-ink-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Size</th>
                <th className="px-3 py-2 text-left font-medium">
                  Chiều cao (cm)
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Cân nặng (kg)
                </th>
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row, i) => (
                <tr
                  key={row.size}
                  className={i % 2 === 0 ? "bg-white" : "bg-cream-50"}
                >
                  <td className="px-3 py-2 font-medium text-ink-900">
                    {row.size}
                  </td>
                  <td className="px-3 py-2 text-ink-700">{row.height}</td>
                  <td className="px-3 py-2 text-ink-700">{row.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs italic text-ink-500">
          Số đo trên chỉ mang tính tham khảo. Mỗi bé sẽ có thể trạng khác nhau.
        </p>
      </DialogContent>
    </Dialog>
  );
}
