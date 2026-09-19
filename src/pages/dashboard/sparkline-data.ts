export type TrendValue = number | null;

/** Preserve server ordering and null gaps; never turn absent history into zeroes. */
export function toSparklinePoints(data: TrendValue[]): { v: TrendValue }[] {
  return data.map((v) => ({ v }));
}

export function hasTrendObservations(data: TrendValue[]): boolean {
  return data.some((value) => value !== null);
}
