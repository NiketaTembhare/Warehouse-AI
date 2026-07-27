from typing import TypedDict, Optional, Any
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from app.agents.nl2sql import run_nl2sql
from app.agents.rag import query_sop
from app.agents.slotting import run_slotting
from app.agents.pick_path import run_pick_path
from app.core.config import settings

class AgentState(TypedDict):
    query: str
    intent: Optional[str]
    order_id: Optional[str]
    response: Optional[Any]

class IntentClassification(BaseModel):
    intent: str = Field(description="One of: 'nl2sql', 'rag', 'slotting', 'pick_path', 'unknown'")
    order_id: Optional[str] = Field(description="The order ID if the intent is pick_path, else null")

def classify_intent_node(state: AgentState):
    query = state["query"]
    
    # Initialize LLM with structured output
    llm = ChatGroq(
        temperature=0, 
        model_name="llama3-70b-8192", 
        api_key=settings.GROQ_API_KEY
    )
    structured_llm = llm.with_structured_output(IntentClassification)
    
    prompt = f"""You are a warehouse routing agent. Determine the intent of the following user query and extract an order ID if the intent is pick_path.
Possible intents:
- nl2sql: The user is asking a question about database information like "which SKUs are ordered most this week?", "what are the order trends?", or general inventory questions.
- rag: The user is asking a question about warehouse policies, SOPs, how to store things (e.g., "How should heavy items be stored?"), safety guidelines.
- slotting: The user wants to optimize slotting, analyze SKUs, or run slotting optimization (e.g., "Run slotting optimization").
- pick_path: The user wants to get a pick path for a specific order (e.g., "Get pick path for order ORD001929").

Query: {query}"""
    
    result = structured_llm.invoke(prompt)
    return {"intent": result.intent, "order_id": result.order_id}

def nl2sql_node(state: AgentState):
    res = run_nl2sql(state["query"])
    return {"response": res}

def rag_node(state: AgentState):
    res = query_sop(state["query"])
    return {"response": res}

def slotting_node(state: AgentState):
    res = run_slotting()
    return {"response": res}

def pick_path_node(state: AgentState):
    order_id = state.get("order_id")
    if not order_id:
        return {"response": {"error": "No order_id provided for pick_path."}}
    res = run_pick_path(order_id)
    return {"response": res}

def error_node(state: AgentState):
    return {"response": {"error": f"Could not determine intent for query: {state['query']}"}}

def route_intent(state: AgentState):
    intent = state.get("intent", "unknown")
    if intent in ["nl2sql", "rag", "slotting", "pick_path"]:
        return intent
    return "error"

# Build Graph
builder = StateGraph(AgentState)

# Add Nodes
builder.add_node("classify", classify_intent_node)
builder.add_node("nl2sql", nl2sql_node)
builder.add_node("rag", rag_node)
builder.add_node("slotting", slotting_node)
builder.add_node("pick_path", pick_path_node)
builder.add_node("error", error_node)

# Add Edges
builder.set_entry_point("classify")

builder.add_conditional_edges(
    "classify",
    route_intent,
    {
        "nl2sql": "nl2sql",
        "rag": "rag",
        "slotting": "slotting",
        "pick_path": "pick_path",
        "error": "error"
    }
)

builder.add_edge("nl2sql", END)
builder.add_edge("rag", END)
builder.add_edge("slotting", END)
builder.add_edge("pick_path", END)
builder.add_edge("error", END)

# Compile Graph
router_app = builder.compile()
