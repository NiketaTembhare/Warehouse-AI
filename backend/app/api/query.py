from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.agents.nl2sql import run_nl2sql
from app.core.database import get_db


router = APIRouter()


# This defines exactly what the request body must look like
class QueryRequest(BaseModel):
    question: str


# This defines exactly what the response will look like
class QueryResponse(BaseModel):
    question: str
    answer: str


class DashboardStatsResponse(BaseModel):
    total_orders: int
    completed_orders: int
    total_skus: int


@router.get("/dashboard-stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    GET /api/dashboard-stats
    Returns KPI stats for total orders, completed orders, and total SKUs directly from database.
    """
    try:
        total_orders = db.execute(text("SELECT COUNT(*) FROM orders")).scalar() or 0
        completed_orders = db.execute(text("SELECT COUNT(*) FROM orders WHERE status = 'Completed'")).scalar() or 0
        total_skus = db.execute(text("SELECT COUNT(*) FROM sku_master")).scalar() or 0
        return {
            "total_orders": int(total_orders),
            "completed_orders": int(completed_orders),
            "total_skus": int(total_skus)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard stats: {str(e)}")


@router.post("/query", response_model=QueryResponse)
def query_warehouse(request: QueryRequest):
    """
    Accepts a plain English question about the warehouse.
    Returns an AI-generated answer backed by real database data.
    """

    # Don't process empty questions
    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty"
        )

    result = run_nl2sql(request.question)
    return result