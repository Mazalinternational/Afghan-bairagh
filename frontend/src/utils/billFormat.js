/**
 * Format a number for display without unnecessary trailing zeros (e.g. 5.00 → "5", 5.50 → "5.5").
 * Values are rounded to 2 decimal places first for stable string output.
 */
export function formatNumberTrimZeros(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  const n =
    typeof value === 'string' ? parseFloat(String(value).replace(/,/g, '')) : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n * 100) / 100;
  if (Object.is(rounded, -0)) return '0';
  return parseFloat(rounded.toFixed(2)).toString();
}

/**
 * Safe bill date parts for print layouts. Returns null if missing or invalid
 * so the UI can show an em dash (optional date on bill).
 */
export function formatBillDateParts(raw) {
  if (raw == null || raw === '') return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('fa-AF-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day')
  };
}
