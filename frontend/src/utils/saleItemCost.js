import { parseLocaleFloat } from './numerals';

/**
 * Effective purchase cost per unit for sales UI: manual inventory cost_price first,
 * then latest unit cost from press supplier purchases (purchase_items JSON), else none.
 * listUnitPrice is inventory unit_price (selling / list price) for display when cost unknown.
 */
export function effectivePurchaseUnitFromInventory(inv) {
  if (!inv) return { value: null, source: null, listUnitPrice: null };

  const listRaw = inv.unit_price;
  const listUnitPrice =
    listRaw != null && listRaw !== ''
      ? parseLocaleFloat(listRaw)
      : null;
  const listOk = Number.isFinite(listUnitPrice) && listUnitPrice >= 0 ? listUnitPrice : null;

  const cpRaw = inv.cost_price;
  if (cpRaw != null && cpRaw !== '') {
    const cp = parseLocaleFloat(cpRaw);
    if (Number.isFinite(cp) && cp > 0) {
      return { value: cp, source: 'inventory', listUnitPrice: listOk };
    }
  }

  const suRaw = inv.last_supplier_unit_cost;
  if (suRaw != null && suRaw !== '') {
    const su = typeof suRaw === 'number' ? suRaw : parseFloat(suRaw);
    if (Number.isFinite(su) && su > 0) {
      return { value: su, source: 'supplier', listUnitPrice: listOk };
    }
  }

  return { value: null, source: null, listUnitPrice: listOk };
}

/** String for order/sale line inputs — empty when no resolved unit cost. */
export function purchaseUnitCostStringFromInventory(inv) {
  const { value } = effectivePurchaseUnitFromInventory(inv);
  if (value != null && Number.isFinite(value)) return String(value);
  return '';
}
