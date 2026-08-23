import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from routers.inventory import router as inventory_router
from routers.agent import router as agent_router
from agent.scheduler import run_sync_cycle, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[startup] Initializing database...")
    init_db()

    print("[startup] Running initial sync...")
    try:
        result = run_sync_cycle(trigger="startup")
        print(f"[startup] Initial sync complete: {result}")
    except Exception as e:
        print(f"[startup] Initial sync failed (non-fatal): {e}")

    # Start background scheduler
    interval = int(os.getenv("SYNC_INTERVAL_MINUTES", "30"))
    scheduler = start_scheduler(interval_minutes=interval)

    yield

    # Shutdown
    if scheduler:
        scheduler.shutdown(wait=False)
        print("[shutdown] Scheduler stopped.")


app = FastAPI(
    title="Neeman's Inventory Intelligence API",
    description="AI-powered inventory dashboard backend with automation agent",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(inventory_router)
app.include_router(agent_router)


@app.get("/")
def root():
    return {
        "message": "Neeman's Inventory Intelligence API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
