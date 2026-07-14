from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.rag import query_sop


# Create router instance to group all SOP policy routes
router = APIRouter()


class SOPRequest(BaseModel):
    """
    Validates request payload structure for querying warehouse SOPs.
    """
    question: str


class SOPResponse(BaseModel):
    """
    Defines output model structure for SOP RAG queries.
    """
    question: str
    answer:   str
    sources:  list


@router.post("/sop", response_model=SOPResponse)
def ask_sop(request: SOPRequest):
    """
    FastAPI Route: POST /api/sop
    Takes a plain text policy or SOP question.
    Returns an answer constructed from ingested SOP document contents.
    
    Args:
        request: SOPRequest with the question field.
        
    Returns:
        SOPResponse: dict matching the SOPResponse schema.
    """
    # Enforce that the question string cannot be empty or just whitespace
    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty"
        )

    # Delegate to RAG agent for ChromaDB lookup and LLM inference
    result = query_sop(request.question)
    return result
