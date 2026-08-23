from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import SyncHistory, AIInsight
from schemas import SyncHistoryOut, AIInsightOut, SyncTriggerResponse
from agent.scheduler import run_sync_cycle
from services.analytics_engine import (
    get_stockout_prevention,
    get_demand_trends,
    get_transfer_recommendations,
    get_liquidation_opportunities,
)

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/sync", response_model=SyncTriggerResponse)
def trigger_sync(db: Session = Depends(get_db)):
    """Manually trigger an agent sync cycle."""
    result = run_sync_cycle(trigger="manual")
    return SyncTriggerResponse(
        message="Sync completed successfully" if result["status"] == "success" else "Sync completed with errors",
        sync_id=result.get("sync_id", 0),
        duration_seconds=result.get("duration_seconds", 0),
        records_processed=result.get("records_processed", 0),
        new_alerts=result.get("new_alerts", 0),
        status=result.get("status", "unknown"),
    )


@router.get("/history", response_model=List[SyncHistoryOut])
def get_sync_history(db: Session = Depends(get_db), limit: int = 20):
    return (
        db.query(SyncHistory)
        .order_by(SyncHistory.run_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/insights", response_model=AIInsightOut)
def get_latest_insights(db: Session = Depends(get_db)):
    insight = (
        db.query(AIInsight)
        .order_by(AIInsight.generated_at.desc())
        .first()
    )
    if not insight:
        from datetime import datetime
        return AIInsightOut(
            id=0,
            generated_at=datetime.utcnow(),
            executive_summary="No insights generated yet. Click **Sync Now** on the Agent page to generate your first AI analysis.",
            alert_narratives=[],
            reorder_recommendations=[],
            model_used="none",
        )
    return insight


@router.get("/status")
def get_agent_status(db: Session = Depends(get_db)):
    """Get current agent status and last sync info."""
    last_sync = (
        db.query(SyncHistory)
        .order_by(SyncHistory.run_at.desc())
        .first()
    )
    last_insight = (
        db.query(AIInsight)
        .order_by(AIInsight.generated_at.desc())
        .first()
    )
    return {
        "last_sync": last_sync.run_at.isoformat() if last_sync else None,
        "last_sync_status": last_sync.status if last_sync else "never",
        "last_insight": last_insight.generated_at.isoformat() if last_insight else None,
        "total_syncs": db.query(SyncHistory).count(),
    }


# ─── New Intelligence Endpoints ───────────────────────────────────────────────

@router.get("/stockout-prevention")
def stockout_prevention(db: Session = Depends(get_db)):
    """SKUs at risk of stockout in the next 7–21 days, ranked by urgency."""
    return get_stockout_prevention(db)


@router.get("/demand-trends")
def demand_trends(db: Session = Depends(get_db)):
    """Demand trend analysis: Rising / Stable / Declining per SKU and category."""
    return get_demand_trends(db)


@router.get("/transfer-recommendations")
def transfer_recommendations(db: Session = Depends(get_db)):
    """Stock transfer recommendations: move surplus from one location to a deficit location."""
    return get_transfer_recommendations(db)


@router.get("/liquidation-opportunities")
def liquidation_opportunities(db: Session = Depends(get_db)):
    """Overstock SKUs with low sell-through — liquidation and promotion candidates."""
    return get_liquidation_opportunities(db)
