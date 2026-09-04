from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy import text
from app.core.database import engine
from app.agents.pick_path import run_pick_path


router = APIRouter()


class PickStep(BaseModel):
    """One step in the picking route."""
    step:       int
    node_id:    str
    node_label: str = ""
    x:          float = 0.0
    y:          float = 0.0
    action:     str


class ItemInOrder(BaseModel):
    """Details of one item in the order."""
    sku_id:   str
    sku_name: str = ""
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
    optimal_route_labeled: List[str] = []
    optimized_distance_m:  float
    baseline_distance_m:   float
    distance_saved_pct:    float
    pick_steps:            List[PickStep]
    items_in_order:        List[ItemInOrder]


class OrderSummary(BaseModel):
    """Brief summary of an order for dropdown selection."""
    order_id: str
    status:   str


@router.get("/pick-path/orders")
@router.get("/pickpath/orders")
def get_orders():
    """
    Returns list of all orders with product names for the dropdown selector.
    Frontend uses this to populate the order picker.
    """
    from sqlalchemy import text
    from app.core.database import engine
    
    with engine.connect() as conn:
        if engine.dialect.name == "sqlite":
            query_sql = """
                SELECT 
                    o.order_id,
                    GROUP_CONCAT(DISTINCT s.sku_name) AS item_names,
                    COUNT(oi.sku_id) AS total_items
                FROM orders o
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                LEFT JOIN sku_master s ON oi.sku_id = s.sku_id
                GROUP BY o.order_id
                ORDER BY o.order_id
                LIMIT 100
            """
        else:
            query_sql = """
                SELECT 
                    o.order_id,
                    STRING_AGG(DISTINCT s.sku_name, ', ') AS item_names,
                    COUNT(oi.sku_id) AS total_items
                FROM orders o
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                LEFT JOIN sku_master s ON oi.sku_id = s.sku_id
                GROUP BY o.order_id
                ORDER BY o.order_id
                LIMIT 100
            """
        result = conn.execute(text(query_sql))
        orders = [
            {
                "order_id": row[0],
                "items_summary": f"{row[1].replace(',', ', ')} ({row[2]} item{'s' if row[2] != 1 else ''})" if row[1] else "Order Items"
            }
            for row in result
        ]
    return {"orders": orders}


@router.post("/pick-path")
@router.post("/pickpath")
def get_pick_path(request: PickPathRequest):
    """
    POST /api/pick-path and POST /api/pickpath
    
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

