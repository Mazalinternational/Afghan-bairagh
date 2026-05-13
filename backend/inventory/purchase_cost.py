"""
Resolve latest supplier unit cost per inventory item from press purchase JSON lines.
"""

from __future__ import annotations


def build_latest_supplier_unit_cost_by_item_id(limit: int = 600) -> dict[int, float]:
    """
    For each item id, return unit_cost from the most recent is_for_press purchase line
    that references that item. First matching purchase wins (query ordered newest first).
    """
    from purchases.models import Purchase

    result: dict[int, float] = {}
    qs = (
        Purchase.objects.filter(is_for_press=True)
        .only("purchase_items", "purchase_date")
        .order_by("-purchase_date")[:limit]
    )
    for purchase in qs:
        lines = purchase.purchase_items or []
        if not isinstance(lines, list):
            continue
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
    return result
