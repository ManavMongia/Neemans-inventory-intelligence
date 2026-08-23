from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models import SKU
from schemas import SKUOut, KPIResponse, AlertOut
from services.metrics_engine import get_kpis, get_alerts

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("", response_model=List[SKUOut])
def get_all_skus(
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None),
    warehouse: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("status"),
    order: str = Query("asc"),
):
    query = db.query(SKU)
    if category:
        query = query.filter(SKU.category == category)
    if warehouse:
        query = query.filter(SKU.warehouse == warehouse)
    if status:
        query = query.filter(SKU.status == status)
    if search:
        query = query.filter(
            SKU.product_name.ilike(f"%{search}%") | SKU.sku_id.ilike(f"%{search}%")
        )

    # Sort safely (only allow actual table column names)
    valid_cols = {c.name: c for c in SKU.__table__.columns}
    sort_col = valid_cols.get(sort_by, SKU.status)
    if order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    return query.all()


@router.get("/kpis", response_model=KPIResponse)
def get_kpi_cards(db: Session = Depends(get_db)):
    return get_kpis(db)


@router.get("/alerts", response_model=List[AlertOut])
def get_active_alerts(db: Session = Depends(get_db)):
    return get_alerts(db)


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(SKU.category).distinct().all()
    return [c[0] for c in cats]


@router.get("/warehouses")
def get_warehouses(db: Session = Depends(get_db)):
    whs = db.query(SKU.warehouse).distinct().all()
    return [w[0] for w in whs]


@router.get("/{sku_id}", response_model=List[SKUOut])
def get_sku_detail(sku_id: str, db: Session = Depends(get_db)):
    skus = db.query(SKU).filter(SKU.sku_id == sku_id).all()
    return skus


@router.get("/{sku_id}/trend")
def get_sku_trend(sku_id: str, db: Session = Depends(get_db)):
    """Return simulated 30-day stock trend for a SKU (aggregated across locations)."""
    import random
    from datetime import date, timedelta

    sku_rows = db.query(SKU).filter(SKU.sku_id == sku_id).all()
    if not sku_rows:
        return []

    # Use first row as reference
    ref = sku_rows[0]
    current_qty = sum(s.qty_on_hand for s in sku_rows)
    avg_daily = sum(s.avg_daily_sales for s in sku_rows)

    # Simulate backwards 30 days
    trend = []
    qty = current_qty
    today = date.today()
    for i in range(30, -1, -1):
        day = today - timedelta(days=i)
        trend.append({"date": day.isoformat(), "qty_on_hand": max(0, round(qty, 0))})
        # Add daily sales + some noise going backwards (reconstruct)
        qty += avg_daily + random.uniform(-avg_daily * 0.2, avg_daily * 0.2)

    # Reverse so oldest is first
    return trend
