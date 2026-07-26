"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export interface TrendChartSeries {
  key: string;
  label: string;
}

export interface TrendChartProps<T extends Record<string, any>> {
  title?: string;
  data: T[];
  xKey: keyof T | string;
  series: TrendChartSeries[];
  type?: "line" | "area" | "bar";
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#ea580c",
];

export default function TrendChart<
  T extends Record<string, any>
>({
  title,
  data,
  xKey,
  series,
  type = "line",
  height = 350,
  loading = false,
  emptyMessage = "No chart data available.",
  className = "",
}: TrendChartProps<T>) {
  if (loading) {
    return (
      <div
        className={`rounded-lg border bg-white p-6 shadow-sm ${className}`}
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold">
            {title}
          </h2>
        )}

        <div
          className="flex items-center justify-center text-gray-500"
          style={{ height }}
        >
          Loading chart...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={`rounded-lg border bg-white p-6 shadow-sm ${className}`}
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold">
            {title}
          </h2>
        )}

        <div
          className="flex items-center justify-center text-gray-500"
          style={{ height }}
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border bg-white p-6 shadow-sm ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-lg font-semibold">
          {title}
        </h2>
      )}

      <ResponsiveContainer
        width="100%"
        height={height}
      >
        {type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey={String(xKey)} />

            <YAxis />

            <Tooltip />

            <Legend />

            {series.map((item, index) => (
              <Line
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stroke={
                  COLORS[
                    index % COLORS.length
                  ]
                }
                strokeWidth={2}
              />
            ))}
          </LineChart>
        ) : type === "area" ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey={String(xKey)} />

            <YAxis />

            <Tooltip />

            <Legend />

            {series.map((item, index) => (
              <Area
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stroke={
                  COLORS[
                    index % COLORS.length
                  ]
                }
                fill={
                  COLORS[
                    index % COLORS.length
                  ]
                }
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey={String(xKey)} />

            <YAxis />

            <Tooltip />

            <Legend />

            {series.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                fill={
                  COLORS[
                    index % COLORS.length
                  ]
                }
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}