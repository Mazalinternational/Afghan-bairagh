"""
Resolve latest supplier unit cost per inventory item from press purchase JSON lines.
"""

from __future__ import annotations


def _purchase_lines_have_item_ids(lines: list) -> bool:
    """True if any JSON line references an inventory item id."""
    for line in lines:
        if not isinstance(line, dict):
            continue
        raw = line.get("item")
        if raw in (None, "", 0, "0"):
            continue
        try:
            int(raw)
        except (TypeError, ValueError):
            continue
        return True
    return False


def build_latest_supplier_unit_cost_by_item_id(limit: int = 600) -> dict[int, float]:
    """
    For each item id, return unit_cost from the most recent is_for_press purchase line
    that references that item. First matching purchase wins (query ordered newest first).

    Also handles legacy purchases: no usable JSON lines but Purchase.item is set — uses
    total cost / quantity as unit cost (same rule as older single-line purchases).
    """
    from purchases.models import Purchase

    result: dict[int, float] = {}
    qs = (
        Purchase.objects.filter(is_for_press=True)
        .only("purchase_items", "purchase_date", "item_id", "quantity", "cost")
        .order_by("-purchase_date")[:limit]
    )
    for purchase in qs:
        lines = purchase.purchase_items or []
        if not isinstance(lines, list):
            lines = []

        for line in lines:
            if not isinstance(line, dict):
                continue
            try:
                iid = int(line.get("item"))
            except (TypeError, ValueError):
                continue
            if iid in result:
                continue
            try:
                uc = float(line.get("unit_cost") or 0)
            except (TypeError, ValueError):
                uc = 0.0
            if uc > 0:
                result[iid] = round(uc, 2)

        if purchase.item_id and purchase.item_id not in result:
            if _purchase_lines_have_item_ids(lines):
                continue
            try:
                qty = float(purchase.quantity or 0)
                cost = float(purchase.cost or 0)
            except (TypeError, ValueError):
                continue
            if qty > 0 and cost > 0:
                uc = round(cost / qty, 2)
                if uc > 0:
                    result[int(purchase.item_id)] = uc
    return result
