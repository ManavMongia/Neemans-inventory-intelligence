"""
analytics_engine.py
Five intelligence modules for the Dashboard Automation Agent:
  1. Stockout Prevention  — at-risk SKUs before they go Critical
  2. Demand Trend Analysis — Rising / Stable / Declining per SKU & category
  3. Stock Transfer Recommendations — surplus→deficit same-SKU transfers
  4. Liquidation Opportunities — overstock with low sell-through
  5. (Helpers used by llm_service for AI Reasoning)
"""
from __future__ import annotations
from sqlalchemy.orm import Session
from models import SKU


# ─── 1. Stockout Prevention ───────────────────────────────────────────────────

def get_stockout_prevention(db: Session) -> list[dict]:
    """
    Find SKUs that are NOT yet Critical but will run out within 7–21 days.
    Risk score = avg_daily_sales × days_remaining  (higher = more revenue at risk).
    """
    skus = db.query(SKU).filter(SKU.status.in_(["Healthy", "Low"])).all()
    at_risk = []

    for sku in skus:
        doc = sku.days_of_cover
        if doc is None:
            continue

        # At-risk window: more than 7 days (not yet critical) but under 21 days
        if 7 <= doc <= 21:
            revenue_risk = round(sku.avg_daily_sales * doc, 1)
            days_until_reorder = max(0, round(doc - (sku.reorder_point / sku.avg_daily_sales if sku.avg_daily_sales else 0), 1))

            urgency = "high" if doc <= 10 else "medium" if doc <= 15 else "low"

            at_risk.append({
                "sku_id":             sku.sku_id,
                "product_name":       sku.product_name,
                "category":           sku.category,
                "warehouse":          sku.warehouse,
                "qty_on_hand":        sku.qty_on_hand,
                "avg_daily_sales":    sku.avg_daily_sales,
                "days_of_cover":      doc,
                "reorder_point":      sku.reorder_point,
                "days_until_reorder": days_until_reorder,
                "incoming_stock_qty": sku.incoming_stock_qty,
                "incoming_stock_date":sku.incoming_stock_date,
                "revenue_at_risk":    revenue_risk,
                "urgency":            urgency,
                "has_incoming":       bool(sku.incoming_stock_qty and sku.incoming_stock_qty > 0),
                "recommended_action": _stockout_action(sku, doc),
            })

    # Sort by urgency (high first), then by revenue_at_risk desc
    urgency_order = {"high": 0, "medium": 1, "low": 2}
    at_risk.sort(key=lambda x: (urgency_order[x["urgency"]], -x["revenue_at_risk"]))
    return at_risk


def _stockout_action(sku: SKU, doc: float) -> str:
    if sku.incoming_stock_qty and sku.incoming_stock_qty > 0:
        return f"Incoming restock of {int(sku.incoming_stock_qty)} units on {sku.incoming_stock_date} — monitor closely."
    reorder_qty = round(sku.avg_daily_sales * 30 + sku.reorder_point - sku.qty_on_hand, 0)
    return f"Place order for ~{max(0, int(reorder_qty))} units within {max(1, int(doc - 7))} days to avoid stockout."


# ─── 2. Demand Trend Analysis ─────────────────────────────────────────────────

def get_demand_trends(db: Session) -> dict:
    """
    Classify each SKU's velocity and aggregate by category.
    Trend = sell_through_rate bucketed into Rising / Stable / Declining.
    Also surfaces fastest and slowest movers overall.
    """
    skus = db.query(SKU).all()
    sku_trends = []
    cat_data: dict[str, list] = {}

    for sku in skus:
        st = sku.sell_through_rate or 0.0
        trend = _classify_trend(st)
        velocity = _classify_velocity(sku.avg_daily_sales)

        sku_trends.append({
            "sku_id":           sku.sku_id,
            "product_name":     sku.product_name,
            "category":         sku.category,
            "warehouse":        sku.warehouse,
            "avg_daily_sales":  sku.avg_daily_sales,
            "sell_through_rate":sku.sell_through_rate,
            "trend":            trend,
            "velocity":         velocity,
            "days_of_cover":    sku.days_of_cover,
            "status":           sku.status,
        })

        if sku.category not in cat_data:
            cat_data[sku.category] = []
        cat_data[sku.category].append({
            "avg_daily_sales": sku.avg_daily_sales,
            "sell_through":    st,
            "trend":           trend,
        })

    # Category-level aggregation
    category_trends = []
    for cat, rows in cat_data.items():
        avg_st   = round(sum(r["sell_through"] for r in rows) / len(rows), 1)
        avg_vel  = round(sum(r["avg_daily_sales"] for r in rows) / len(rows), 2)
        rising   = sum(1 for r in rows if r["trend"] == "Rising")
        declining= sum(1 for r in rows if r["trend"] == "Declining")
        cat_trend = "Rising" if rising > len(rows) * 0.5 else "Declining" if declining > len(rows) * 0.5 else "Stable"
        category_trends.append({
            "category":       cat,
            "avg_sell_through": avg_st,
            "avg_daily_sales":  avg_vel,
            "trend":            cat_trend,
            "sku_count":        len(rows),
            "rising_count":     rising,
            "declining_count":  declining,
        })

    category_trends.sort(key=lambda x: -x["avg_sell_through"])

    fastest = sorted(sku_trends, key=lambda x: -(x["avg_daily_sales"] or 0))[:5]
    slowest = sorted(
        [s for s in sku_trends if (s["avg_daily_sales"] or 0) > 0],
        key=lambda x: (x["avg_daily_sales"] or 0)
    )[:5]

    return {
        "sku_trends":      sku_trends,
        "category_trends": category_trends,
        "fastest_movers":  fastest,
        "slowest_movers":  slowest,
        "summary": {
            "rising":   sum(1 for s in sku_trends if s["trend"] == "Rising"),
            "stable":   sum(1 for s in sku_trends if s["trend"] == "Stable"),
            "declining":sum(1 for s in sku_trends if s["trend"] == "Declining"),
        },
    }


def _classify_trend(sell_through: float) -> str:
    if sell_through >= 65:  return "Rising"
    if sell_through >= 35:  return "Stable"
    return "Declining"


def _classify_velocity(avg_daily: float) -> str:
    if avg_daily >= 8:  return "Fast Mover"
    if avg_daily >= 4:  return "Medium Mover"
    if avg_daily >= 1:  return "Slow Mover"
    return "Stagnant"


# ─── 3. Stock Transfer Recommendations ───────────────────────────────────────

def get_transfer_recommendations(db: Session) -> list[dict]:
    """
    For each sku_id, find pairs where:
      - Source location: Healthy or Overstock (surplus > 1.5× reorder_point)
      - Destination location: Critical or Low
    Recommend transferring enough to bring destination to a safe level.
    """
    skus = db.query(SKU).all()

    # Group by sku_id
    by_sku: dict[str, list] = {}
    for sku in skus:
        by_sku.setdefault(sku.sku_id, []).append(sku)

    recommendations = []

    for sku_id, locations in by_sku.items():
        if len(locations) < 2:
            continue

        deficits  = [s for s in locations if s.status in ("Critical", "Low")]
        surpluses  = [s for s in locations if s.qty_on_hand > 1.5 * s.reorder_point and s.qty_on_hand > 30]

        for dest in deficits:
            for src in surpluses:
                if src.warehouse == dest.warehouse:
                    continue

                # How much does destination need to reach 14-day cover?
                target_qty = round(dest.avg_daily_sales * 14 + dest.reorder_point)
                transfer_needed = max(0, target_qty - dest.qty_on_hand)

                # How much can source spare (keep 14 days cover for itself)?
                src_min_keep = round(src.avg_daily_sales * 14 + src.reorder_point)
                src_can_give = max(0, src.qty_on_hand - src_min_keep)

                transfer_qty = min(transfer_needed, src_can_give)
                if transfer_qty < 5:
                    continue

                impact_days = round(transfer_qty / dest.avg_daily_sales, 1) if dest.avg_daily_sales > 0 else 0

                recommendations.append({
                    "sku_id":           sku_id,
                    "product_name":     dest.product_name,
                    "category":         dest.category,
                    "from_warehouse":   src.warehouse,
                    "to_warehouse":     dest.warehouse,
                    "from_qty":         src.qty_on_hand,
                    "to_qty":           dest.qty_on_hand,
                    "transfer_qty":     int(transfer_qty),
                    "impact_days_added":impact_days,
                    "dest_status":      dest.status,
                    "src_days_cover":   src.days_of_cover,
                    "dest_days_cover":  dest.days_of_cover,
                    "priority":         "urgent" if dest.status == "Critical" else "recommended",
                })

    # Sort: urgent first, then by transfer quantity
    recommendations.sort(key=lambda x: (0 if x["priority"] == "urgent" else 1, -x["transfer_qty"]))
    return recommendations[:10]  # top 10


# ─── 4. Liquidation Opportunities ────────────────────────────────────────────

def get_liquidation_opportunities(db: Session) -> list[dict]:
    """
    Identify overstock items with low sell-through that are tying up capital.
    Score = excess_units × avg_daily_sales (cost of carrying excess vs. potential turns).
    """
    skus = db.query(SKU).filter(SKU.status == "Overstock").all()
    opportunities = []

    for sku in skus:
        st = sku.sell_through_rate or 0.0
        # Excess = qty above 2× reorder point
        excess_units = max(0, sku.qty_on_hand - 2 * sku.reorder_point)
        days_to_clear = round(excess_units / sku.avg_daily_sales, 0) if sku.avg_daily_sales > 0 else None

        # Carrying cost proxy: excess × avg_daily_sales (days of excess demand it represents)
        carrying_score = round(excess_units * sku.avg_daily_sales, 1)

        discount_pct = 20 if st >= 20 else 30 if st >= 10 else 40
        strategy = _liquidation_strategy(st, days_to_clear, excess_units)

        opportunities.append({
            "sku_id":           sku.sku_id,
            "product_name":     sku.product_name,
            "category":         sku.category,
            "warehouse":        sku.warehouse,
            "qty_on_hand":      sku.qty_on_hand,
            "reorder_point":    sku.reorder_point,
            "excess_units":     int(excess_units),
            "days_of_cover":    sku.days_of_cover,
            "days_to_clear":    int(days_to_clear) if days_to_clear else None,
            "sell_through_rate":st,
            "avg_daily_sales":  sku.avg_daily_sales,
            "carrying_score":   carrying_score,
            "suggested_discount_pct": discount_pct,
            "strategy":         strategy,
            "severity":         "high" if st < 20 else "medium" if st < 35 else "low",
        })

    # Sort by carrying_score descending (most capital tied up first)
    opportunities.sort(key=lambda x: -x["carrying_score"])
    return opportunities


def _liquidation_strategy(sell_through: float, days_to_clear, excess_units: int) -> str:
    if sell_through < 15:
        return f"Flash sale or bundle deal — slow mover with {excess_units} excess units. Immediate discount recommended."
    if sell_through < 30:
        return f"Promotional campaign — consider 20–30% discount or multi-buy offer to accelerate movement."
    if days_to_clear and days_to_clear > 90:
        return f"Long clearance tail ({int(days_to_clear)} days at current rate). Consider B2B bulk sale or redistribution."
    return f"Monitor — sell-through acceptable but excess units ({excess_units}) should be watched."


# ─── 5. Full Analytics Snapshot (used by LLM service) ────────────────────────

def get_full_analytics_snapshot(db: Session) -> dict:
    """Bundle all 4 analytics for the LLM prompt."""
    return {
        "stockout_prevention":      get_stockout_prevention(db),
        "demand_trends":            get_demand_trends(db),
        "transfer_recommendations": get_transfer_recommendations(db),
        "liquidation_opportunities":get_liquidation_opportunities(db),
    }
