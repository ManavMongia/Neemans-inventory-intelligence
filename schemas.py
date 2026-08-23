from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class SKUBase(BaseModel):
    sku_id: str
    product_name: str
    category: str
    warehouse: str
    qty_on_hand: float
    reorder_point: float
    incoming_stock_qty: float
    incoming_stock_date: Optional[str] = None
    avg_daily_sales: float
    last_updated: str


class SKUOut(SKUBase):
    id: int
    days_of_cover: Optional[float] = None
    status: str
    sell_through_rate: Optional[float] = None
    reorder_recommendation_qty: Optional[float] = None
    source: str

    model_config = ConfigDict(from_attributes=True)


class KPIResponse(BaseModel):
    total_skus: int
    total_locations: int
    critical_count: int
    low_stock_count: int
    healthy_count: int
    overstock_count: int
    stockout_count: int
    avg_days_of_cover: float
    estimated_hours_saved: float


class AlertOut(BaseModel):
    sku_id: str
    product_name: str
    category: str
    warehouse: str
    status: str
    severity: str  # critical / warning / info
    qty_on_hand: float
    reorder_point: float
    days_of_cover: Optional[float] = None
    narrative: str
    incoming_stock_qty: float
    incoming_stock_date: Optional[str] = None


class SyncHistoryOut(BaseModel):
    id: int
    run_at: datetime
    trigger: str
    status: str
    duration_seconds: Optional[float] = None
    records_processed: int
    records_updated: int
    new_alerts: int
    resolved_alerts: int
    new_stockouts: int
    error_message: Optional[str] = None
    sources_synced: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


class AIInsightOut(BaseModel):
    id: int
    generated_at: datetime
    executive_summary: str
    alert_narratives: Optional[List[Any]] = None
    reorder_recommendations: Optional[List[Any]] = None
    stockout_reasoning: Optional[Any] = None
    demand_reasoning: Optional[Any] = None
    transfer_reasoning: Optional[Any] = None
    liquidation_reasoning: Optional[Any] = None
    model_used: str

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class SyncTriggerResponse(BaseModel):
    message: str
    sync_id: int
    duration_seconds: float
    records_processed: int
    new_alerts: int
    status: str

