import type { HealthMetric } from "@/lib/api/types.ts";
import { detectedTimeZone, formatInstant } from "@/lib/time-zone.ts";

export function buildMetricChartData(
  metrics: HealthMetric[],
  timeZone = detectedTimeZone(),
) {
  return [...metrics]
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
    .map((metric) => ({
      timestamp: metric.date,
      date: formatInstant(metric.date, timeZone, {
        month: "short",
        day: "numeric",
      }),
      weight: metric.weight_kg != null ? +metric.weight_kg.toFixed(1) : null,
      sleep: metric.sleep_hours != null ? +metric.sleep_hours.toFixed(1) : null,
      hr: metric.resting_hr,
      hrv: metric.hrv,
    }));
}
