from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON
from datetime import datetime
from database import Base


class SKU(Base):
    __tablename__ = "skus"

    id = Column(Integer, primary_key=True, index=True)
    sku_id = Column(String, index=True)
    product_name = Column(String)
    category = Column(String)
    warehouse = Column(String)
    qty_on_hand = Column(Float, default=0)
    reorder_point = Column(Float, default=0)
    incoming_stock_qty = Column(Float, default=0)
    incoming_stock_date = Column(String, nullable=True)
    avg_daily_sales = Column(Float, default=0)
    # Computed fields
    days_of_cover = Column(Float, nullable=True)
    status = Column(String, default="Healthy")  # Healthy / Low / Critical / Overstock
    sell_through_rate = Column(Float, nullable=True)
    reorder_recommendation_qty = Column(Float, nullable=True)
    source = Column(String, default="unknown")  # email / sheets
    last_updated = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SyncHistory(Base):
    __tablename__ = "sync_history"

    id = Column(Integer, primary_key=True, index=True)
    run_at = Column(DateTime, default=datetime.utcnow)
    trigger = Column(String, default="scheduler")  # scheduler / manual
    status = Column(String, default="success")  # success / error / partial
    duration_seconds = Column(Float, nullable=True)
    records_processed = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    new_alerts = Column(Integer, default=0)
    resolved_alerts = Column(Integer, default=0)
    new_stockouts = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    sources_synced = Column(JSON, nullable=True)


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    sync_run_id = Column(Integer, nullable=True)
    executive_summary = Column(Text)
    alert_narratives = Column(JSON, nullable=True)        # list of dicts
    reorder_recommendations = Column(JSON, nullable=True) # list of dicts
    # Structured reasoning from Claude (4 intelligence modules)
    stockout_reasoning = Column(JSON, nullable=True)
    demand_reasoning = Column(JSON, nullable=True)
    transfer_reasoning = Column(JSON, nullable=True)
    liquidation_reasoning = Column(JSON, nullable=True)
    model_used = Column(String, default="claude-3-5-haiku-20241022")
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
