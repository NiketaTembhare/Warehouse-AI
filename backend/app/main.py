import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import query
from app.api import sop
from app.api import slotting
from app.api import pick_path
from app.api import chat
from app.api import mlflow_telemetry

import mlflow
from app.core.config import settings

from app.models import Base
from app.core.database import engine
from sqlalchemy import text
from app.db.import_csv import run as run_import_csv
from app.db.ingest_sops import ingest_documents

# ─── MLflow Setup (developer observability — not user-facing) ────────────────
mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
mlflow.set_experiment("warehouse_agents")

app = FastAPI(
    title="Warehouse AI Assistant",
    description="AI-powered warehouse slotting and picking optimization",
    version="1.0.0"
)

@app.on_event("startup")
def startup_db_init():
    """
    Auto-initializes tables, populates CSV datasets, and ingests SOP documents
    if the database or vector store is empty (e.g. on fresh Render/Cloud deployment).
    """
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            sku_count = conn.execute(text("SELECT COUNT(*) FROM sku_master")).scalar()
            if not sku_count or sku_count == 0:
                print("📦 Database is empty! Auto-seeding CSV datasets...")
                run_import_csv()
            else:
                print(f"✅ Database loaded with {sku_count} registered SKUs.")
    except Exception as e:
        print(f"⚠️ Startup DB auto-seed note: {e}")

    try:
        from app.agents.rag import get_collection
        collection = get_collection()
        if collection.count() == 0:
            print("📄 ChromaDB vector store is empty! Auto-ingesting SOP text files...")
            ingest_documents()
        else:
            print(f"✅ ChromaDB loaded with {collection.count()} SOP documents.")
    except Exception as e:
        print(f"⚠️ Startup SOP vector store note: {e}")

# ─── CORS ─────────────────────────────────────────────────────────────────────
# In production, set ALLOWED_ORIGINS env var to your Vercel URL
# e.g. ALLOWED_ORIGINS=https://warehouse-ai.vercel.app
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
if _raw_origins == "*":
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router, prefix="/api")
app.include_router(sop.router, prefix="/api")
app.include_router(slotting.router, prefix="/api")
app.include_router(pick_path.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(mlflow_telemetry.router, prefix="/api")

@app.get("/api/health")
@app.get("/health")
def health():
    return {
        "status": "running",
        "message": "Warehouse AI is online"
    }