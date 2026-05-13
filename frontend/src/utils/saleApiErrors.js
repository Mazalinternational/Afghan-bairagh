/**
 * Normalize axios / DRF error payloads into a single string, then map known
 * English backend messages to i18n keys so Dari (prs) toasts stay localized.
 */

function collectErrorStrings(data, out = []) {
  if (data == null) return out;
  if (typeof data === 'string') {
    out.push(data);
    return out;
  }
  if (Array.isArray(data)) {
    data.forEach((x) => collectErrorStrings(x, out));
    return out;
  }
  if (typeof data === 'object') {
    if (typeof data.string === 'string') {
      out.push(data.string);
      return out;
    }
    Object.values(data).forEach((x) => collectErrorStrings(x, out));
  }
  return out;
}

export function extractApiErrorString(error) {
  const data = error?.response?.data;
  if (data == null) return null;
  if (typeof data === 'string') return data.trim() || null;
  const strings = collectErrorStrings(data, []);
  const joined = strings.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return joined || null;
}

function stripErrorDetailArtifacts(s) {
  if (!s || typeof s !== 'string') return '';
  const t = s.trim();
  const m = t.match(/string='([^']*)'(?:,\s*code='[^']*')?/);
  if (m) return m[1].trim();
  return t;
}

const RE_INSUFFICIENT_LINE = /^Insufficient (press stock|home stock) for (.+)\. Available: (\d+), Required: (\d+)$/i;
const RE_INSUFFICIENT_PRESS = /^Insufficient press stock\. Available: (\d+)$/i;
const RE_INSUFFICIENT_HOME = /^Insufficient home stock\. Available: (\d+)$/i;
const RE_INSUFFICIENT_TOTAL = /^Insufficient total stock\. Available: (\d+)$/i;
const RE_INSUFFICIENT_STOCK_SERVICE = /^Insufficient stock\. Available: (\d+)$/i;
const RE_FAILED_REVERT = /^Failed to revert stock:\s*(.+)$/i;

function mapCoreMessage(core, t) {
  if (!core) return null;
  const c = core.trim();

  const exact = {
    'Sale is already confirmed': 'sales.apiErrorSaleAlreadyConfirmed',
    'Cannot confirm a cancelled sale': 'sales.apiErrorCannotConfirmCancelledSale',
    'Sale is already cancelled': 'sales.apiErrorSaleAlreadyCancelled',
    'Direct sale is already confirmed': 'sales.apiErrorDirectSaleAlreadyConfirmed',
    'Quantity must be greater than zero': 'sales.quantityMustBeGreaterThanZero',
    'Price must be greater than zero': 'sales.priceMustBeGreaterThanZero',
    'Payment amount must be greater than zero': 'sales.apiErrorPaymentMustBePositive',
    'Cost cannot be negative': 'sales.costPriceNonNegative',
    'Insufficient stock for adjustment': 'sales.apiErrorInsufficientStockAdjustment',
  };
  if (exact[c]) return t(exact[c]);

  let m = c.match(RE_INSUFFICIENT_LINE);
  if (m) {
    const stockKey = m[1].toLowerCase() === 'press stock' ? 'sales.pressStock' : 'sales.homeStock';
    return t('sales.apiErrorInsufficientStockForItem', {
      stockType: t(stockKey),
      itemName: m[2],
      available: m[3],
      required: m[4],
    });
  }

  m = c.match(RE_INSUFFICIENT_PRESS);
  if (m) {
    return t('sales.apiErrorInsufficientStockSimple', {
      stockType: t('sales.pressStock'),
      available: m[1],
    });
  }
  m = c.match(RE_INSUFFICIENT_HOME);
  if (m) {
    return t('sales.apiErrorInsufficientStockSimple', {
      stockType: t('sales.homeStock'),
      available: m[1],
    });
  }
  m = c.match(RE_INSUFFICIENT_TOTAL);
  if (m) {
    return t('sales.apiErrorInsufficientStockSimple', {
      stockType: t('sales.totalStockLabel'),
      available: m[1],
    });
  }
  m = c.match(RE_INSUFFICIENT_STOCK_SERVICE);
  if (m) {
    return t('sales.apiErrorInsufficientStockSimple', {
      stockType: t('sales.stockLabelGeneric'),
      available: m[1],
    });
  }

  m = c.match(RE_FAILED_REVERT);
  if (m) {
    const inner = mapCoreMessage(stripErrorDetailArtifacts(m[1]), t);
    return inner || t('sales.apiErrorFailedToRevertStock');
  }

  return null;
}

/**
 * @param {unknown} error - axios error
 * @param {function} t - i18n t()
 * @param {string} [fallbackKey='sales.failedToCreate'] - i18n key if message unknown
 */
export function translateSaleApiError(error, t, fallbackKey = 'sales.failedToCreate') {
  const raw = extractApiErrorString(error);
  if (!raw) return t(fallbackKey);
  const core = stripErrorDetailArtifacts(raw);
  const mapped = mapCoreMessage(core, t);
  if (mapped) return mapped;
  return t(fallbackKey);
}
