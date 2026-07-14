from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.nl2sql import run_nl2sql


router = APIRouter()


# This defines exactly what the request body must look like
class QueryRequest(BaseModel):
    question: str


# This defines exactly what the response will look like
class QueryResponse(BaseModel):
    question: str
    answer: str


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