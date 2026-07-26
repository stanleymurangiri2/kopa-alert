"use client";

import React from "react";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  loading?: boolean;
  className?: string;
  valueClassName?: string;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  loading = false,
  className = "",
  valueClassName = "",
}: KpiCardProps) {
  function getTrendColor() {
    if (!trend) return "";

    switch (trend.direction) {
      case "up":
        return "text-green-600";

      case "down":
        return "text-red-600";

      default:
        return "text-gray-600";
    }
  }

  function getTrendIcon() {
    if (!trend) return "";

    switch (trend.direction) {
      case "up":
        return "▲";

      case "down":
        return "▼";

      default:
        return "■";
    }
  }

  if (loading) {
    return (
      <div
        className={`rounded-xl border bg-white p-5 shadow-sm animate-pulse ${className}`}
      >
        <div className="h-4 w-24 rounded bg-gray-200" />

        <div className="mt-4 h-8 w-36 rounded bg-gray-200" />

        <div className="mt-3 h-3 w-20 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${className}`}
    >
      <div className="flex items-start justify-between">

        <div className="min-w-0">

          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h2
            className={`mt-2 text-3xl font-bold text-gray-900 break-words ${valueClassName}`}
          >
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-sm text-gray-500">
              {subtitle}
            </p>
          )}

        </div>

        {icon && (
          <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
            {icon}
          </div>
        )}

      </div>

      {trend && (
        <div
          className={`mt-4 flex items-center gap-2 text-sm font-medium ${getTrendColor()}`}
        >
          <span>{getTrendIcon()}</span>

          <span>{trend.value}%</span>

          {trend.label && (
            <span className="text-gray-500">
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}