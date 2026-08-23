"""
llm_service.py
Calls Claude with a full intelligence snapshot (inventory + all 4 analytics modules).
Returns structured JSON with executive summary + per-module AI reasoning.
"""
import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import SKU, AIInsight


MODEL = "claude-3-5-haiku-20241022"

PLACEHOLDER_SUMMARY = """## AI Insights Unavailable

No Anthropic API key configured. Add your key to `backend/.env` as `ANTHROPIC_API_KEY=sk-...` and trigger a sync to generate live AI insights.

The AI Reasoning panel will generate:
- Executive summary of inventory health
- Stockout prevention action plan
- Demand trend interpretation
- Stock transfer priority queue
- Liquidation campaign recommendations
"""


def _build_prompt(db: Session, analytics: dict | None = None) -> str:
    skus = db.query(SKU).all()
    critical = [s for s in skus if s.status == "Critical"]
    low      = [s for s in skus if s.status == "Low"]
    overstock= [s for s in skus if s.status == "Overstock"]
    healthy  = [s for s in skus if s.status == "Healthy"]
    stockouts= [s for s in critical if s.qty_on_hand <= 0]

    from collections import defaultdict
    cat_st: dict[str, list] = defaultdict(list)
    for s in skus:
        if s.sell_through_rate is not None:
            cat_st[s.category].append(s.sell_through_rate)
    cat_summary = {cat: round(sum(v)/len(v), 1) for cat, v in cat_st.items()}

    # Compact analytics summaries for prompt efficiency
    analytics_section = ""
    if analytics:
        sp = analytics.get("stockout_prevention", [])[:5]
        dt = analytics.get("demand_trends", {})
        tr = analytics.get("transfer_recommendations", [])[:5]
        lo = analytics.get("liquidation_opportunities", [])[:5]

        analytics_section = f"""
STOCKOUT PREVENTION (at-risk in 7–21 days, top 5):
{json.dumps([{{"sku": x["sku_id"], "name": x["product_name"], "location": x["warehouse"], "days_left": x["days_of_cover"], "urgency": x["urgency"], "has_incoming": x["has_incoming"]}} for x in sp], indent=2)}

DEMAND TRENDS SUMMARY:
Rising: {dt.get("summary", {}).get("rising", 0)} SKUs | Stable: {dt.get("summary", {}).get("stable", 0)} SKUs | Declining: {dt.get("summary", {}).get("declining", 0)} SKUs
Fastest movers: {json.dumps([{{"sku": x["sku_id"], "name": x["product_name"], "daily_sales": x["avg_daily_sales"], "trend": x["trend"]}} for x in dt.get("fastest_movers", [])[:3]], indent=2)}
Declining categories: {json.dumps([c for c in dt.get("category_trends", []) if c["trend"] == "Declining"], indent=2)}

STOCK TRANSFER OPPORTUNITIES (top 5):
{json.dumps([{{"sku": x["sku_id"], "from": x["from_warehouse"], "to": x["to_warehouse"], "qty": x["transfer_qty"], "impact_days": x["impact_days_added"], "priority": x["priority"]}} for x in tr], indent=2)}

LIQUIDATION CANDIDATES (top 5):
{json.dumps([{{"sku": x["sku_id"], "name": x["product_name"], "warehouse": x["warehouse"], "excess_units": x["excess_units"], "sell_through": x["sell_through_rate"], "suggested_discount": x["suggested_discount_pct"]}} for x in lo], indent=2)}
"""

    prompt = f"""You are a senior inventory strategist for Neeman's, a premium D2C socks brand sold across 5 locations (2 warehouses + 3 retail stores) in India.

Analyze the following real-time inventory intelligence and produce a comprehensive action plan.

INVENTORY SNAPSHOT ({datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}):
- Total SKU-location rows: {len(skus)} | Unique SKUs: {len(set(s.sku_id for s in skus))}
- Critical: {len(critical)} | Low: {len(low)} | Healthy: {len(healthy)} | Overstock: {len(overstock)}
- Complete stockouts: {len(stockouts)}

CRITICAL SKUs (top 8):
{json.dumps([{{"sku": s.sku_id, "name": s.product_name, "location": s.warehouse, "qty": s.qty_on_hand, "days_cover": s.days_of_cover, "daily_sales": s.avg_daily_sales, "incoming": s.incoming_stock_qty, "incoming_date": s.incoming_stock_date}} for s in critical[:8]], indent=2)}

CATEGORY SELL-THROUGH RATES (%):
{json.dumps(cat_summary, indent=2)}
{analytics_section}

Respond ONLY in valid JSON matching this schema exactly:
{{
  "executive_summary": "string (3-5 sentences, plain text)",
  "stockout_prevention_reasoning": {{
    "summary": "string",
    "top_actions": ["string", "string", "string"],
    "estimated_revenue_protected": "string"
  }},
  "demand_trend_reasoning": {{
    "summary": "string",
    "rising_opportunity": "string",
    "declining_concern": "string",
    "recommended_focus": "string"
  }},
  "transfer_reasoning": {{
    "summary": "string",
    "priority_transfers": ["string", "string"],
    "expected_impact": "string"
  }},
  "liquidation_reasoning": {{
    "summary": "string",
    "recommended_actions": ["string", "string"],
    "capital_recovery_estimate": "string"
  }},
  "alert_narratives": [
    {{"rank": 1, "sku_id": "string", "title": "string", "why_it_matters": "string", "action": "string", "severity": "critical|warning|info"}}
  ],
  "reorder_recommendations": [
    {{"sku_id": "string", "product_name": "string", "warehouse": "string", "recommended_qty": 0, "reasoning": "string"}}
  ]
}}"""
    return prompt


def generate_insights(db: Session, sync_run_id: int | None = None, analytics: dict | None = None) -> AIInsight:
    """Call Claude to generate insights; fall back to placeholder if no API key."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your_anthropic_api_key_here":
        insight = AIInsight(
            sync_run_id=sync_run_id,
            executive_summary=PLACEHOLDER_SUMMARY,
            alert_narratives=[],
            reorder_recommendations=[],
            model_used="none (no API key)",
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)
        return insight

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        prompt = _build_prompt(db, analytics=analytics)

        message = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()
        if "```" in raw:
            parts = raw.split("```")
            for part in parts[1:]:
                cleaned = part.strip()
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:].strip()
                if cleaned.startswith("{"):
                    raw = cleaned
                    break
        data = json.loads(raw)

        insight = AIInsight(
            sync_run_id=sync_run_id,
            executive_summary=data.get("executive_summary", ""),
            alert_narratives=data.get("alert_narratives", []),
            reorder_recommendations=data.get("reorder_recommendations", []),
            # Persist all 4 reasoning modules as real DB columns
            stockout_reasoning=data.get("stockout_prevention_reasoning"),
            demand_reasoning=data.get("demand_trend_reasoning"),
            transfer_reasoning=data.get("transfer_reasoning"),
            liquidation_reasoning=data.get("liquidation_reasoning"),
            model_used=MODEL,
            prompt_tokens=message.usage.input_tokens,
            completion_tokens=message.usage.output_tokens,
        )

        db.add(insight)
        db.commit()
        db.refresh(insight)
        return insight

    except Exception as e:
        import traceback
        print(f"[llm_service] Error calling Claude:\n{traceback.format_exc()}")
        insight = AIInsight(
            sync_run_id=sync_run_id,
            executive_summary=f"AI insights temporarily unavailable: {type(e).__name__}: {str(e)}",
            alert_narratives=[],
            reorder_recommendations=[],
            model_used=f"error: {MODEL}",
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)
        return insight
