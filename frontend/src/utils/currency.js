/**
 * Format currency value to AFN
 * @param {number|string} value - The value to format
 * @param {boolean} showSymbol - Whether to show AFN symbol (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, showSymbol = true) => {
  const num = parseFloat(value) || 0;
  const formatted = num.toFixed(2);
  return showSymbol ? `AFN ${formatted}` : formatted;
};

/**
 * Format currency without decimals
 * @param {number|string} value - The value to format
 * @param {boolean} showSymbol - Whether to show AFN symbol (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrencyWhole = (value, showSymbol = true) => {
  const num = parseFloat(value) || 0;
  const formatted = num.toFixed(0);
  return showSymbol ? `AFN ${formatted}` : formatted;
};

/**
 * Parse currency string to number
 * @param {string} value - The currency string to parse
 * @returns {number} Parsed number
 */
export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};
