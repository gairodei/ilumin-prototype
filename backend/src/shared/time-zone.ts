/**
 * Explicit IANA time zones (no default: U-04 is open). Area/Location names only — no abbreviations, offsets or POSIX
 * strings — and known to this runtime. The database re-validates against its own zone table (is_valid_batch_time_zone).
 */
const IANA = /^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)\/[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+)?$/;

export function isIanaZone(tz: string): boolean {
  if (!IANA.test(tz)) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
