import time
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from services.data_ingestion import ingest_all_sources
from services.metrics_engine import recompute_all_metrics, get_alerts
from services.llm_service import generate_insights
from services.analytics_engine import get_full_analytics_snapshot
from models import SyncHistory, SKU


def run_sync_cycle(trigger: str = "scheduler") -> dict:
    """
    Full agent sync cycle:
    1. Ingest data from all sources
    2. Recompute metrics
    3. Detect changes vs. previous state
    4. Generate LLM insights
    5. Write sync history log
    Returns a summary dict.
    """
    db: Session = SessionLocal()
    start = time.time()
    status = "success"
    error_msg = None

    try:
        # Snapshot pre-sync alert counts for delta detection
        pre_alerts = {a["sku_id"] + "|" + a["warehouse"]: a["status"]
                      for a in _get_current_alert_snapshot(db)}

        # Step 1: Ingest
        ingest_result = ingest_all_sources(db)

        # Step 2: Recompute metrics
        metrics_result = recompute_all_metrics(db)

        # Step 3: Detect changes
        post_alerts = {a["sku_id"] + "|" + a["warehouse"]: a["status"]
                       for a in _get_current_alert_snapshot(db)}

        new_alerts_keys = set(post_alerts) - set(pre_alerts)
        resolved_alerts_keys = set(pre_alerts) - set(post_alerts)
        new_stockouts = sum(
            1 for k in new_alerts_keys if post_alerts.get(k) == "Critical"
        )

        # Step 4: LLM insights — create sync record first to get ID
        sync_entry = SyncHistory(
            run_at=datetime.utcnow(),
            trigger=trigger,
            status="in_progress",
            records_processed=ingest_result.get("processed", 0),
            records_updated=ingest_result.get("updated", 0),
            new_alerts=len(new_alerts_keys),
            resolved_alerts=len(resolved_alerts_keys),
            new_stockouts=new_stockouts,
            sources_synced=ingest_result.get("sources", []),
        )
        db.add(sync_entry)
        db.commit()
        db.refresh(sync_entry)

        # Run analytics before LLM so Claude gets full context
        analytics = get_full_analytics_snapshot(db)
        generate_insights(db, sync_run_id=sync_entry.id, analytics=analytics)

        # Step 5: Finalize sync log
        duration = round(time.time() - start, 2)
        sync_entry.status = "success"
        sync_entry.duration_seconds = duration
        db.commit()

        return {
            "sync_id": sync_entry.id,
            "status": "success",
            "duration_seconds": duration,
            "records_processed": ingest_result.get("processed", 0),
            "records_updated": ingest_result.get("updated", 0),
            "new_alerts": len(new_alerts_keys),
            "resolved_alerts": len(resolved_alerts_keys),
            "new_stockouts": new_stockouts,
            "sources": ingest_result.get("sources", []),
        }

    except Exception as e:
        status = "error"
        error_msg = str(e)
        duration = round(time.time() - start, 2)
        print(f"[agent] Sync error: {e}")

        err_entry = SyncHistory(
            run_at=datetime.utcnow(),
            trigger=trigger,
            status="error",
            duration_seconds=duration,
            records_processed=0,
            records_updated=0,
            new_alerts=0,
            resolved_alerts=0,
            new_stockouts=0,
            error_message=error_msg,
        )
        db.add(err_entry)
        db.commit()

        return {
            "sync_id": err_entry.id,
            "status": "error",
            "duration_seconds": duration,
            "records_processed": 0,
            "error": error_msg,
        }
    finally:
        db.close()


def _get_current_alert_snapshot(db: Session) -> list[dict]:
    alert_skus = db.query(SKU).filter(SKU.status.in_(["Critical", "Low"])).all()
    return [{"sku_id": s.sku_id, "warehouse": s.warehouse, "status": s.status} for s in alert_skus]


def start_scheduler(interval_minutes: int = 30):
    """Start APScheduler background scheduler for automatic syncs."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            lambda: run_sync_cycle("scheduler"),
            "interval",
            minutes=interval_minutes,
            id="inventory_sync",
            name="Inventory Sync",
            replace_existing=True,
        )
        scheduler.start()
        print(f"[agent] Scheduler started — syncing every {interval_minutes} minutes.")
        return scheduler
    except Exception as e:
        print(f"[agent] Could not start scheduler: {e}")
        return None
