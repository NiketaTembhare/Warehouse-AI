from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.nl2sql import run_nl2sql
from app.agents.rag import query_sop
from app.agents.slotting import run_slotting
from app.agents.pick_path import run_pick_path

router = APIRouter()

class ChatRequest(BaseModel):
    query: str

def detect_intent(query: str) -> str:
    """
    Simple keyword-based intent detection.
    Classifies the query into one of 4 agent types.
    """
    q = query.lower()
    
    # Slotting keywords
    if any(word in q for word in [
        "slott", "relocat", "rearrang", "mismatch",
        "abc", "velocity", "re-slot", "move product",
        "optimize storage", "zone placement"
    ]):
        return "slotting"
    
    # Pick path keywords
    if any(word in q for word in [
        "pick", "route", "path", "order", "walking",
        "distance", "shortest", "tsp", "fulfil",
        "collect", "picking"
    ]):
        return "pick_path"
    
    # RAG / SOP keywords
    if any(word in q for word in [
        "sop", "policy", "procedure", "guideline",
        "rule", "safety", "damaged", "store", "storage",
        "chemical", "fragile", "heavy", "packing",
        "receiving", "how should", "what is the procedure",
        "where to keep", "how to handle"
    ]):
        return "rag"
    
    # Default → NL2SQL for all data questions
    return "nl2sql"


@router.post("/chat")
def chat(request: ChatRequest):
    """
    Unified chat endpoint.
    Detects intent and routes to the correct agent.
    Returns agent type + result in one response.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, 
                          detail="Query cannot be empty")
    
    intent = detect_intent(request.query)
    
    try:
        if intent == "slotting":
            result = run_slotting()
            return {
                "intent": "slotting",
                "query": request.query,
                **result
            }
        
        elif intent == "pick_path":
            # Extract order ID if mentioned, else return guidance
            import re
            match = re.search(r'ORD\d+', request.query.upper())
            if match:
                result = run_pick_path(match.group())
                return {
                    "intent": "pick_path",
                    "query": request.query,
                    **result
                }
            else:
                result = run_nl2sql(request.query)
                return {
                    "intent": "nl2sql",
                    "query": request.query,
                    **result
                }
        
        elif intent == "rag":
            result = query_sop(request.query)
            return {
                "intent": "rag",
                "query": request.query,
                **result
            }
        
        else:
            result = run_nl2sql(request.query)
            return {
                "intent": "nl2sql",
                "query": request.query,
                **result
            }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {str(e)}"
        )
