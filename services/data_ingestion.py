import pandas as pd
import os
from datetime import datetime
from sqlalchemy.orm import Session
from models import SKU


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

SOURCE_FILES = {
    "email": os.path.join(DATA_DIR, "inventory_email_export.csv"),
    "sheets": os.path.join(DATA_DIR, "inventory_sheets_export.csv"),
}


def _load_csv(path: str, source: str) -> pd.DataFrame:
    """Load a CSV file and tag with source."""
    df = pd.read_csv(path)
    df["source"] = source
    df["qty_on_hand"] = df["qty_on_hand"].fillna(0)
    df["reorder_point"] = df["reorder_point"].fillna(0)
    df["incoming_stock_qty"] = df["incoming_stock_qty"].fillna(0)
    df["incoming_stock_date"] = df["incoming_stock_date"].fillna("")
    df["avg_daily_sales"] = df["avg_daily_sales"].fillna(1.0)
    return df


def _merge_sources(dfs: list[pd.DataFrame]) -> pd.DataFrame:
    """
    Merge multiple source DataFrames into one.
    Each (sku_id, warehouse) pair is a unique row.
    If the same SKU+warehouse appears in both sources,
    prefer the one with the more recent last_updated.
    """
    combined = pd.concat(dfs, ignore_index=True)
    combined["last_updated"] = pd.to_datetime(combined["last_updated"], errors="coerce")
    # Sort so more-recent rows come first
    combined = combined.sort_values("last_updated", ascending=False)
    # Keep first occurrence of each (sku_id, warehouse) → most recent
    deduped = combined.drop_duplicates(subset=["sku_id", "warehouse"], keep="first")
    return deduped.reset_index(drop=True)


def _upsert_skus(db: Session, df: pd.DataFrame) -> tuple[int, int]:
    """Upsert DataFrame rows into the SKU table. Returns (processed, updated)."""
    processed = 0
    updated = 0

    for _, row in df.iterrows():
        existing = (
            db.query(SKU)
            .filter(SKU.sku_id == row["sku_id"], SKU.warehouse == row["warehouse"])
            .first()
        )

        last_updated_str = (
            row["last_updated"].strftime("%Y-%m-%d")
            if pd.notna(row["last_updated"])
            else datetime.utcnow().strftime("%Y-%m-%d")
        )

        fields = dict(
            product_name=str(row["product_name"]),
            category=str(row["category"]),
            qty_on_hand=float(row["qty_on_hand"]),
            reorder_point=float(row["reorder_point"]),
            incoming_stock_qty=float(row.get("incoming_stock_qty", 0)),
            incoming_stock_date=str(row.get("incoming_stock_date", "")) or None,
            avg_daily_sales=float(row["avg_daily_sales"]),
            source=str(row["source"]),
            last_updated=last_updated_str,
            updated_at=datetime.utcnow(),
        )

        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
            updated += 1
        else:
            sku = SKU(sku_id=str(row["sku_id"]), warehouse=str(row["warehouse"]), **fields)
            db.add(sku)

        processed += 1

    db.commit()
    return processed, updated


def ingest_all_sources(db: Session) -> dict:
    """Main entry point: load all CSVs, merge, upsert. Returns stats dict."""
    dfs = []
    sources_synced = []

    for source_name, filepath in SOURCE_FILES.items():
        if not os.path.exists(filepath):
            print(f"[ingest] WARNING: {filepath} not found, skipping.")
            continue
        df = _load_csv(filepath, source_name)
        dfs.append(df)
        sources_synced.append({"name": source_name, "file": os.path.basename(filepath), "rows": len(df)})

    if not dfs:
        return {"processed": 0, "updated": 0, "sources": []}

    merged = _merge_sources(dfs)
    processed, updated = _upsert_skus(db, merged)

    return {
        "processed": processed,
        "updated": updated,
        "sources": sources_synced,
    }
