/**
 * Normalize Persian (۰-۹) and Eastern Arabic (٠-٩) digits to ASCII 0-9 for parsing.
 * Also maps Arabic decimal separator ٫ to '.' and strips thousands separators ٬ and ','.
 */
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const EASTERN_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeNumeralString(input) {
  if (input == null) return '';
  let s = String(input).trim();
  for (let i = 0; i < 10; i += 1) {
    const p = PERSIAN_DIGITS[i];
    const e = EASTERN_DIGITS[i];
    const d = String(i);
    s = s.split(p).join(d).split(e).join(d);
  }
  s = s.replace(/\u066b/g, '.').replace(/٫/g, '.');
  s = s.replace(/\u066c/g, '').replace(/٬/g, '');
  return s;
}

export function parseLocaleFloat(input) {
  const s = normalizeNumeralString(input).replace(/,/g, '');
  if (s === '' || s === '.' || s === '-') return NaN;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseLocaleInt(input) {
  const n = parseLocaleFloat(input);
  if (Number.isNaN(n)) return NaN;
  return Math.trunc(n);
}
