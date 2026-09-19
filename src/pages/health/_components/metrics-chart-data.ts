import { format } from "date-fns";
import type { HealthMetric } from "@/lib/api/types.ts";

function fmt(date: string) {
  return format(new Date(date), "MMM d");
}

export function buildMetricChartData(metrics: HealthMetric[]) {
  return [...metrics]
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
    .map((metric) => ({
      timestamp: metric.date,
      date: fmt(metric.date),
      weight: metric.weight_kg != null ? +metric.weight_kg.toFixed(1) : null,
      sleep: metric.sleep_hours != null ? +metric.sleep_hours.toFixed(1) : null,
      hr: metric.resting_hr,
      hrv: metric.hrv,
    }));
}
