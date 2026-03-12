/** Normalize ISO date to YYYY-MM-DD (strip T and time) */
export function formatDateOnly(isoOrDate: string): string {
  if (!isoOrDate) return '';
  const s = String(isoOrDate).trim();
  const datePart = s.split('T')[0];
  return datePart ?? s;
}
