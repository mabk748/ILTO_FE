export function detectedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: unknown): string {
  return typeof value === "string" && isValidTimeZone(value)
    ? value
    : detectedTimeZone();
}

type DateValue = string | number | Date;

function validDate(value: DateValue): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatInstant(
  value: DateValue,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = validDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(undefined, {
    ...options,
    timeZone: normalizeTimeZone(timeZone),
  }).format(date);
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(value: DateValue, timeZone: string): ZonedParts | null {
  const date = validDate(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Convert an instant to the wall-clock value expected by datetime-local. */
export function toZonedDateTimeInput(
  value: DateValue,
  timeZone: string = detectedTimeZone(),
): string {
  const parts = zonedParts(value, timeZone);
  if (!parts) return "";
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Convert a wall-clock value in an IANA zone to one unambiguous UTC instant. */
export function zonedDateTimeToUtc(
  value: string,
  timeZone: string = detectedTimeZone(),
  label = "Date and time",
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!match || !isValidTimeZone(timeZone)) {
    throw new Error(`${label} must be valid in the selected time zone.`);
  }
  const desired: ZonedParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
  const desiredUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second,
  );
  const canonical = new Date(desiredUtc);
  if (
    canonical.getUTCFullYear() !== desired.year ||
    canonical.getUTCMonth() + 1 !== desired.month ||
    canonical.getUTCDate() !== desired.day ||
    canonical.getUTCHours() !== desired.hour ||
    canonical.getUTCMinutes() !== desired.minute ||
    canonical.getUTCSeconds() !== desired.second
  ) {
    throw new Error(`${label} must be valid in the selected time zone.`);
  }

  let instant = desiredUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = zonedParts(instant, timeZone);
    if (!observed) break;
    const observedUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    const correction = desiredUtc - observedUtc;
    instant += correction;
    if (correction === 0) break;
  }

  const roundTrip = zonedParts(instant, timeZone);
  if (
    !roundTrip ||
    roundTrip.year !== desired.year ||
    roundTrip.month !== desired.month ||
    roundTrip.day !== desired.day ||
    roundTrip.hour !== desired.hour ||
    roundTrip.minute !== desired.minute
  ) {
    throw new Error(
      `${label} does not exist in the selected time zone because of a clock change.`,
    );
  }
  return new Date(instant).toISOString();
}
