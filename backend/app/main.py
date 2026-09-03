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

# ─── MLflow Setup (developer observability — not user-facing) ────────────────
mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
mlflow.set_experiment("warehouse_agents")

app = FastAPI(
    title="Warehouse AI Assistant",
    description="AI-powered warehouse slotting and picking optimization",
    version="1.0.0"
)

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