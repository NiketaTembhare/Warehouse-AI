from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.agents.slotting import run_slotting


router = APIRouter()


class SlottingMove(BaseModel):
    """
    Represents a single SKU move recommendation.
    Each field tells the manager exactly what to move and where.
    """
    sku_id:       str    # which product to move
    order_count:  int    # how many times it was ordered (velocity)
    abc_class:    str    # A, B, or C classification
    current_node: str    # where it is now (e.g. D10)
    current_zone: str    # which zone it is now (e.g. Slow)
    target_zone:  str    # which zone it should be in (e.g. Fast)
    action:       str    # plain English instruction


class ABCBreakdown(BaseModel):
    """Shows how many SKUs fall into each ABC category."""
    class_a_count: int
    class_b_count: int
    class_c_count: int


class SlottingResponse(BaseModel):
    """Complete response from the slotting optimization agent."""
    total_skus_analyzed: int
    total_mismatches:    int
    summary:             str
    recommendations:     List[SlottingMove]
    abc_breakdown:       ABCBreakdown


@router.post("/slotting", response_model=SlottingResponse)
def optimize_slotting():
    """
    POST /api/slotting
    
    Runs the full slotting optimization analysis.
    No request body needed — analyzes all SKUs automatically.
    
    Returns recommendations for which SKUs to move and where.
    """
    try:
        result = run_slotting()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Slotting analysis failed: {str(e)}"
        )
