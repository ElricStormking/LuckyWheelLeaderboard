import type { SpinAllowanceDto } from "@lucky-wheel/contracts";

export const DAILY_SPIN_LIMIT = 1;

export type NormalizedDailySpinAllowance = SpinAllowanceDto & {
  canSpinToday: boolean;
};

export function createArchivedDailySpinAllowance(): NormalizedDailySpinAllowance {
  return {
    grantedSpinCount: 0,
    usedSpinCount: 0,
    remainingSpinCount: 0,
    spinAllowanceSource: "archive_snapshot",
    canSpinToday: false,
  };
}

export function createServerDailySpinAllowance(
  usedSpinCount: number,
  dailySpinLimit = DAILY_SPIN_LIMIT,
): NormalizedDailySpinAllowance {
  const normalizedDailySpinLimit = Math.max(0, Math.floor(dailySpinLimit));
  const normalizedUsedSpinCount = Math.max(0, Math.floor(usedSpinCount));
  const effectiveUsedSpinCount = Math.min(
    normalizedUsedSpinCount,
    normalizedDailySpinLimit,
  );
  const remainingSpinCount = Math.max(
    0,
    normalizedDailySpinLimit - effectiveUsedSpinCount,
  );
  const canSpinToday = remainingSpinCount > 0;

  return {
    grantedSpinCount: normalizedDailySpinLimit,
    usedSpinCount: effectiveUsedSpinCount,
    remainingSpinCount,
    spinAllowanceSource: "lucky_wheel_server",
    canSpinToday,
  };
}

export function resolveCurrentDayWindow(timezone: string, reference = new Date()) {
  const offsetMinutes = resolveTimeZoneOffsetMinutes(timezone, reference);
  const shiftedReference = new Date(reference.getTime() + offsetMinutes * 60_000);
  const start = new Date(
    Date.UTC(
      shiftedReference.getUTCFullYear(),
      shiftedReference.getUTCMonth(),
      shiftedReference.getUTCDate(),
      0,
      0,
      0,
      0,
    ) - offsetMinutes * 60_000,
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    start,
    end,
  };
}

function resolveTimeZoneOffsetMinutes(timezone: string, reference: Date) {
  const directOffset = parseTimeZoneOffset(timezone);
  if (directOffset !== null) {
    return directOffset;
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const zonePart = formatter
      .formatToParts(reference)
      .find((part) => part.type === "timeZoneName")?.value;
    const resolvedOffset = zonePart ? parseTimeZoneOffset(zonePart) : null;

    if (resolvedOffset !== null) {
      return resolvedOffset;
    }
  } catch {
    // Fall back to UTC when the configured timezone cannot be resolved.
  }

  return 0;
}

function parseTimeZoneOffset(value: string) {
  const normalized = value.trim().toUpperCase();

  if (normalized === "UTC" || normalized === "GMT" || normalized === "Z") {
    return 0;
  }

  const match = normalized.match(/^(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  const direction = match[1] === "-" ? -1 : 1;

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return direction * (hours * 60 + minutes);
}
