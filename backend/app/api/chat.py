from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.router import router_app

router = APIRouter()

class ChatRequest(BaseModel):
    query: str

@router.post("/chat")
def chat_endpoint(request: ChatRequest):
    """
    POST /api/chat
    Accepts a natural language query, uses the LangGraph router to classify intent,
    and returns the response from the corresponding agent.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    initial_state = {"query": request.query}
    
    try:
        # Invoke the LangGraph state graph
        result = router_app.invoke(initial_state)
        return {
            "intent": result.get("intent"),
            "response": result.get("response")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
