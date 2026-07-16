from sqlalchemy import text
from langchain_groq import ChatGroq
from app.core.config import settings
from app.core.database import engine


# ABC ZONE MAPPING
# Class A SKUs (fastest moving) → must be in Fast zone
# Class B SKUs (medium moving)  → must be in Medium zone
# Class C SKUs (slow moving)    → must be in Slow zone
ABC_ZONE_MAP = {
    "A": "Fast",
    "B": "Medium",
    "C": "Slow"
}


def get_llm():
    """
    Returns Groq LLM instance.
    Used only for generating the final recommendation text.
    All calculations are done in pure Python above.
    """
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY,
        temperature=0
    )


def get_velocity_data():
    """
    Queries order_items table to count how many times
    each SKU has been ordered.
    
    This is the VELOCITY — how fast a SKU moves.
    Higher order count = higher velocity = needs to be closer to packing.
    
    Returns:
        list of dicts: [{"sku_id": "SKU01141", "order_count": 244}, ...]
        sorted from highest to lowest order count
    """
    query = text("""
        SELECT sku_id, COUNT(*) as order_count
        FROM order_items
        GROUP BY sku_id
        ORDER BY order_count DESC
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query)
        # Convert to list of dicts for easy processing
        rows = [{"sku_id": row[0], "order_count": row[1]} 
                for row in result]
    
    return rows


def classify_abc(velocity_data: list) -> list:
    """
    Assigns ABC classification to each SKU based on order frequency.
    
    Classification rules (industry standard):
    - Class A = top 20% by order count  → high velocity → Fast zone
    - Class B = next 30% by order count → medium velocity → Medium zone  
    - Class C = bottom 50%              → low velocity → Slow zone
    
    Args:
        velocity_data: list of dicts with sku_id and order_count,
                      sorted highest to lowest
    
    Returns:
        Same list with 'abc_class' and 'target_zone' added to each dict
    """
    total = len(velocity_data)
    
    # Calculate cutoff positions
    # Top 20% → Class A
    a_cutoff = int(total * 0.20)
    # Next 30% → Class B (from 20% to 50%)
    b_cutoff = int(total * 0.50)
    # Everything else → Class C
    
    for i, sku in enumerate(velocity_data):
        if i < a_cutoff:
            sku["abc_class"]   = "A"
            sku["target_zone"] = "Fast"
        elif i < b_cutoff:
            sku["abc_class"]   = "B"
            sku["target_zone"] = "Medium"
        else:
            sku["abc_class"]   = "C"
            sku["target_zone"] = "Slow"
    
    return velocity_data


def get_current_locations():
    """
    Gets the current physical location (zone) of every SKU
    by joining inventory with warehouse_nodes.
    
    inventory table tells us: which SKU is at which node_id
    warehouse_nodes table tells us: which zone that node is in
    
    Returns:
        dict: {sku_id: {"node_id": "A04", "current_zone": "Fast"}}
    """
    query = text("""
        SELECT 
            i.sku_id,
            i.node_id,
            n.zone as current_zone
        FROM inventory i
        JOIN warehouse_nodes n ON i.node_id = n.node_id
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query)
        # Build a dict keyed by sku_id for fast lookup
        locations = {}
        for row in result:
            locations[row[0]] = {
                "node_id":      row[1],
                "current_zone": row[2]
            }
    
    return locations


def find_mismatches(velocity_data: list, locations: dict) -> list:
    """
    Compares where each SKU SHOULD be (based on ABC class)
    vs where it ACTUALLY IS (from inventory + warehouse_nodes).
    
    A mismatch means a high velocity SKU is in the wrong zone.
    Example: Class A SKU with 244 orders/day sitting in Slow zone
             → wastes picker time → needs to move to Fast zone
    
    Args:
        velocity_data: SKUs with abc_class and target_zone
        locations: current physical location per SKU
    
    Returns:
        list of mismatched SKUs with move recommendations
    """
    mismatches = []
    
    for sku in velocity_data:
        sku_id      = sku["sku_id"]
        target_zone = sku["target_zone"]
        
        # Skip if we don't have location data for this SKU
        if sku_id not in locations:
            continue
        
        current_zone = locations[sku_id]["current_zone"]
        node_id      = locations[sku_id]["node_id"]
        
        # Skip special zones — receiving and packing are not storage zones
        if current_zone in ["Receiving", "Packing"]:
            continue
        
        # Check if current zone matches target zone
        if current_zone != target_zone:
            mismatches.append({
                "sku_id":       sku_id,
                "order_count":  sku["order_count"],
                "abc_class":    sku["abc_class"],
                "current_node": node_id,
                "current_zone": current_zone,
                "target_zone":  target_zone,
                "action":       f"Move from {current_zone} zone to {target_zone} zone"
            })
    
    # Sort by order_count descending — highest priority mismatches first
    mismatches.sort(key=lambda x: x["order_count"], reverse=True)
    
    return mismatches


def generate_summary(mismatches: list, total_skus: int) -> str:
    """
    Uses Groq LLM to write a human-readable summary of the 
    slotting recommendations.
    
    NOTE: Groq does NOT calculate anything here.
    We pass it the already-calculated numbers and ask it 
    to write a clear explanation for the warehouse manager.
    
    Args:
        mismatches: list of mismatched SKUs
        total_skus: total number of SKUs analyzed
    
    Returns:
        str: Human-readable recommendation summary
    """
    # Build a text summary of top 5 mismatches to pass to LLM
    top5 = mismatches[:5]
    mismatch_text = "\n".join([
        f"- {m['sku_id']} (Class {m['abc_class']}, {m['order_count']} orders): "
        f"currently in {m['current_zone']} zone, should move to {m['target_zone']} zone"
        for m in top5
    ])
    
    prompt = f"""You are a warehouse optimization assistant.
Based on the analysis below, write a clear 3-4 sentence 
recommendation summary for the warehouse manager.
Be specific about which SKUs need to move and why.
Do not add any information not provided below.

ANALYSIS RESULTS:
- Total SKUs analyzed: {total_skus}
- Total mismatched SKUs found: {len(mismatches)}
- Top priority moves needed:
{mismatch_text}

Write the manager summary:"""
    
    llm = get_llm()
    response = llm.invoke(prompt)
    return response.content


def run_slotting() -> dict:
    """
    Main function — runs the complete slotting optimization pipeline.
    
    Flow:
    1. Get velocity data (order counts per SKU) from order_items
    2. Classify each SKU into A/B/C based on velocity
    3. Get current physical location of each SKU
    4. Find mismatches between current zone and target zone
    5. Generate human-readable summary using Groq
    
    Returns:
        dict with full slotting analysis results
    """
    # Step 1: Get how often each SKU is ordered
    velocity_data = get_velocity_data()
    total_skus = len(velocity_data)
    
    # Step 2: Classify into A (fast), B (medium), C (slow)
    velocity_data = classify_abc(velocity_data)
    
    # Step 3: Get current physical zone of each SKU
    locations = get_current_locations()
    
    # Step 4: Find SKUs in wrong zones
    mismatches = find_mismatches(velocity_data, locations)
    
    # Step 5: Generate readable summary using Groq
    summary = generate_summary(mismatches, total_skus)
    
    # Return complete results
    return {
        "total_skus_analyzed":   total_skus,
        "total_mismatches":      len(mismatches),
        "summary":               summary,
        "recommendations":       mismatches[:20],  # top 20 priority moves
        "abc_breakdown": {
            "class_a_count": sum(1 for s in velocity_data if s["abc_class"] == "A"),
            "class_b_count": sum(1 for s in velocity_data if s["abc_class"] == "B"),
            "class_c_count": sum(1 for s in velocity_data if s["abc_class"] == "C")
        }
    }
