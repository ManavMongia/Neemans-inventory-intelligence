from sqlalchemy.orm import Session
from models import SKU


# Status thresholds
CRITICAL_DAYS = 7     # days_of_cover < 7 AND qty < reorder_point → Critical
OVERSTOCK_DAYS = 60   # days_of_cover > 60 AND qty > 3× reorder_point → Overstock


def _compute_days_of_cover(qty: float, avg_daily: float) -> float | None:
    if avg_daily and avg_daily > 0:
        return round(qty / avg_daily, 1)
    return None


def _compute_status(qty: float, reorder: float, doc: float | None) -> str:
    if qty <= 0:
        return "Critical"
    if doc is not None and doc < CRITICAL_DAYS and qty < reorder:
        return "Critical"
    if qty < reorder:
        return "Low"
    if doc is not None and doc > OVERSTOCK_DAYS and qty > 3 * reorder:
        return "Overstock"
    return "Healthy"


def _compute_reorder_qty(qty: float, avg_daily: float, reorder_point: float) -> float | None:
    """Suggest enough stock for 30 days above the reorder point."""
    target = avg_daily * 30 + reorder_point
    shortfall = target - qty
    return round(max(shortfall, 0), 0) if shortfall > 0 else None


def _compute_sell_through(qty_sold_proxy: float, qty_on_hand: float) -> float | None:
    """
    Sell-through ≈ avg_daily_sales * 30 / (avg_daily_sales*30 + qty_on_hand)
    A simple approximation for demo purposes.
    """
    sold = qty_sold_proxy * 30
    total = sold + qty_on_hand
    if total > 0:
        return round((sold / total) * 100, 1)
    return None


def recompute_all_metrics(db: Session) -> dict:
    """Recompute status, days-of-cover, sell-through, and reorder recommendation for all SKUs."""
    skus = db.query(SKU).all()
    updated = 0

    for sku in skus:
        doc = _compute_days_of_cover(sku.qty_on_hand, sku.avg_daily_sales)
        status = _compute_status(sku.qty_on_hand, sku.reorder_point, doc)
        reorder_qty = _compute_reorder_qty(
            sku.qty_on_hand, sku.avg_daily_sales, sku.reorder_point
        ) if status in ("Critical", "Low") else None
        sell_through = _compute_sell_through(sku.avg_daily_sales, sku.qty_on_hand)

        sku.days_of_cover = doc
        sku.status = status
        sku.reorder_recommendation_qty = reorder_qty
        sku.sell_through_rate = sell_through
        updated += 1

    db.commit()
    return {"metrics_updated": updated}


def get_kpis(db: Session) -> dict:
    """Compute aggregate KPI cards for the dashboard."""
    skus = db.query(SKU).all()
    if not skus:
        return {
            "total_skus": 0, "total_locations": 0, "critical_count": 0,
            "low_stock_count": 0, "healthy_count": 0, "overstock_count": 0,
            "stockout_count": 0, "avg_days_of_cover": 0.0, "estimated_hours_saved": 5.5
        }

    statuses = [s.status for s in skus]
    docs = [s.days_of_cover for s in skus if s.days_of_cover is not None]

    # Unique SKU IDs (not location-level rows)
    unique_skus = len(set(s.sku_id for s in skus))
    unique_locations = len(set(s.warehouse for s in skus))

    return {
        "total_skus": unique_skus,
        "total_locations": unique_locations,
        "critical_count": statuses.count("Critical"),
        "low_stock_count": statuses.count("Low"),
        "healthy_count": statuses.count("Healthy"),
        "overstock_count": statuses.count("Overstock"),
        "stockout_count": sum(1 for s in skus if s.qty_on_hand <= 0),
        "avg_days_of_cover": round(sum(docs) / len(docs), 1) if docs else 0.0,
        "estimated_hours_saved": 5.5,
    }


def get_alerts(db: Session) -> list[dict]:
    """Return narrated alerts for Critical and Low SKUs, plus Overstock."""
    skus = db.query(SKU).filter(SKU.status.in_(["Critical", "Low", "Overstock"])).all()
    alerts = []

    for sku in skus:
        doc_str = f"{sku.days_of_cover:.1f}" if sku.days_of_cover is not None else "N/A"
        if sku.status == "Critical":
            if sku.qty_on_hand <= 0:
                narrative = (
                    f"🚨 {sku.product_name} at {sku.warehouse} is completely out of stock. "
                    f"Average daily demand is {sku.avg_daily_sales:.1f} units. "
                    + (f"Incoming restock of {int(sku.incoming_stock_qty)} units expected on {sku.incoming_stock_date}."
                       if sku.incoming_stock_qty > 0 else "No restock scheduled — immediate action required.")
                )
            else:
                narrative = (
                    f"🚨 {sku.product_name} at {sku.warehouse} has only {int(sku.qty_on_hand)} units left "
                    f"({doc_str} days of cover). Reorder point is {int(sku.reorder_point)}. "
                    f"Recommend ordering {int(sku.reorder_recommendation_qty or 0)} units immediately."
                )
            severity = "critical"
        elif sku.status == "Low":
            narrative = (
                f"⚠️ {sku.product_name} at {sku.warehouse} is below reorder point "
                f"({int(sku.qty_on_hand)} units, reorder at {int(sku.reorder_point)}). "
                f"Approx {doc_str} days of cover remaining. "
                f"Recommended reorder: {int(sku.reorder_recommendation_qty or 0)} units."
            )
            severity = "warning"
        else:  # Overstock
            narrative = (
                f"📦 {sku.product_name} at {sku.warehouse} is overstocked with {int(sku.qty_on_hand)} units "
                f"({doc_str} days of cover). Consider promotions or redistribution."
            )
            severity = "info"

        alerts.append({
            "sku_id": sku.sku_id,
            "product_name": sku.product_name,
            "category": sku.category,
            "warehouse": sku.warehouse,
            "status": sku.status,
            "severity": severity,
            "qty_on_hand": sku.qty_on_hand,
            "reorder_point": sku.reorder_point,
            "days_of_cover": sku.days_of_cover,
            "narrative": narrative,
            "incoming_stock_qty": sku.incoming_stock_qty,
            "incoming_stock_date": sku.incoming_stock_date,
        })

    # Sort: Critical first, then Low, then Overstock
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))
    return alerts
