# pyrefly: ignore [missing-import]
from langchain_groq import ChatGroq
# pyrefly: ignore [missing-import]
from langchain_community.utilities import SQLDatabase
# pyrefly: ignore [missing-import]
from langchain_community.agent_toolkits import create_sql_agent
from app.core.config import settings


def get_llm():
    """
    Creates and returns the Groq LLM instance.
    
    Model: llama-3.3-70b-versatile
    - Free on Groq
    - 70 billion parameter model — very good at SQL generation
    - temperature=0 means deterministic answers, no hallucination
    """
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY,
        temperature=0
    )


def get_readonly_db():
    """
    Connects to PostgreSQL using the READ-ONLY user.
    This user can only SELECT — cannot INSERT, UPDATE, or DELETE.
    Safe to expose to LLM-generated SQL queries.
    """
    return SQLDatabase.from_uri(
        settings.READ_ONLY_DATABASE_URL,
        include_tables=[
            "warehouse_nodes",
            "warehouse_paths",
            "sku_master",
            "inventory",
            "orders",
            "order_items"
        ]
    )


def run_nl2sql(question: str) -> dict:
    """
    Takes a plain English question about warehouse data.
    Groq + LangChain converts it to SQL, runs it on PostgreSQL,
    returns a clean answer.

    Args:
        question: plain English warehouse question from the user

    Returns:
        dict with 'question' and 'answer'
    """
    llm = get_llm()
    db  = get_readonly_db()

    agent = create_sql_agent(
        llm=llm,
        db=db,
        verbose=True,              # shows SQL thinking in terminal
        handle_parsing_errors=True
    )

    result = agent.invoke({"input": question})

    return {
        "question": question,
        "answer":   result["output"],
    }