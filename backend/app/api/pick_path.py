from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.agents.pick_path import run_pick_path


router = APIRouter()


class PickStep(BaseModel):
    """One step in the picking route."""
    step:    int
    node_id: str
    action:  str


class ItemInOrder(BaseModel):
    """Details of one item in the order."""
    sku_id:   str
    quantity: int
    node_id:  str
    zone:     str


class PickPathRequest(BaseModel):
    """Request body — just needs the order ID."""
    order_id: str


class PickPathResponse(BaseModel):
    """Complete optimized pick path result."""
    order_id:              str
    total_items:           int
    total_unique_bins:     int
    optimal_route:         List[str]
    optimized_distance_m:  float
    baseline_distance_m:   float
    distance_saved_pct:    float
    pick_steps:            List[PickStep]
    items_in_order:        List[ItemInOrder]


@router.post("/pickpath", response_model=PickPathResponse)
def get_pick_path(request: PickPathRequest):
    """
    POST /api/pickpath
    
    Takes an order_id and returns the optimal bin visit sequence
    for a picker to collect all items with minimum travel distance.
    """
    if not request.order_id.strip():
        raise HTTPException(
            status_code=400,
            detail="order_id cannot be empty"
        )

    result = run_pick_path(request.order_id)

    if "error" in result:
        raise HTTPException(
            status_code=404,
            detail=result["error"]
        )

    return result
