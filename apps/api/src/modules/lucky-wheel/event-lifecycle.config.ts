export const DEFAULT_AUTO_FINALIZE_GRACE_MINUTES = 30;

export function resolveAutoFinalizeGraceMinutes(rawValue?: string) {
  const parsed = Number(rawValue);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }

  return DEFAULT_AUTO_FINALIZE_GRACE_MINUTES;
}
