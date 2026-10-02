"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { SeriesPoint } from "@/lib/types";
import { formatMoney, formatShortDate } from "@/lib/format";

export function PerformanceChart({
  data,
  currency,
}: {
  data: SeriesPoint[];
  currency: string;
}) {
  const compact = (v: number) =>
    Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v);

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatShortDate(d)}
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => compact(v)}
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value), currency),
              name === "revenue"
                ? "Ventes"
                : name === "expenses"
                  ? "Dépenses"
                  : "Bénéfice",
            ]}
            labelFormatter={(d) => formatShortDate(String(d))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              fontSize: 12,
            }}
          />
          <Legend
            formatter={(value: string) =>
              value === "revenue"
                ? "Ventes"
                : value === "expenses"
                  ? "Dépenses"
                  : "Bénéfice"
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2563EB"
            strokeWidth={2}
            fill="url(#revGrad)"
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#DC2626"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#16A34A"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
