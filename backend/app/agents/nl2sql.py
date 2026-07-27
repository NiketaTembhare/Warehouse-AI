import time
import mlflow
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
    mlflow.set_experiment('warehouse_agents')
    with mlflow.start_run():
        start_time = time.time()
        mlflow.set_tag('agent', 'nl2sql')
        mlflow.log_param('query', question)

        """
        Takes a plain English question about warehouse data.
        Groq + LangChain converts it to SQL, runs it on PostgreSQL,
        returns a business-friendly answer with product names not just IDs.

        Key improvement: system prompt instructs the agent to always
        join sku_master to show product names, and to answer in 
        plain English that a warehouse manager can understand.

        Args:
            question: plain English warehouse question from the user

        Returns:
            dict with 'question' and 'answer'
        """
        llm = get_llm()
        db  = get_readonly_db()

        # System prompt tells the agent how to behave
        # This is the key improvement — without this, agent gives raw IDs
        system_prompt = """You are a helpful warehouse operations assistant.
    
    When answering questions:
    - Always use product names (sku_name from sku_master table) 
      not just SKU IDs, whenever possible
    - Join sku_master table to get product names when showing SKUs
    - Give answers in plain English that a warehouse manager 
      can understand without technical knowledge
    - Include relevant numbers and context in your answer
    - Keep answers concise and actionable
    - If showing multiple items, format them as a clear list

    Database tables available:
    - sku_master: product catalog with sku_id and sku_name
    - inventory: current stock levels per location
    - orders: customer orders
    - order_items: individual items within each order
    - warehouse_nodes: physical locations in the warehouse
    - warehouse_paths: connections between warehouse locations
    """

        agent = create_sql_agent(
            llm=llm,
            db=db,
            verbose=True,
            handle_parsing_errors=True,
            # Pass system prompt to guide the agent's behaviour
            agent_executor_kwargs={
                "system_message": system_prompt
            }
        )

        result = agent.invoke({"input": question})

        elapsed = time.time() - start_time
        mlflow.log_metric('response_time', elapsed)
        return {
            "question": question,
            "answer":   result["output"],
        }