import time
import mlflow
import re
from sqlalchemy import text
from langchain_groq import ChatGroq
from app.core.config import settings
from app.core.database import engine

def get_llm():
    """
    Returns the ChatGroq LLM instance.
    Model: llama-3.1-8b-instant
    """
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=settings.GROQ_API_KEY,
        temperature=0
    )

def run_nl2sql(question: str) -> dict:
    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
    mlflow.set_experiment('warehouse_agents')
    with mlflow.start_run():
        start_time = time.time()
        mlflow.set_tag('agent', 'nl2sql')
        mlflow.set_tag('agent_name', 'nl2sql')
        mlflow.set_tag('model', 'llama-3.1-8b-instant')
        mlflow.set_tag('status', 'SUCCESS')
        mlflow.log_param('query', question)
        mlflow.log_param('question', question)

        system_prompt = """You are an expert PostgreSQL DBA for an enterprise warehouse management system.
Database Schema:
1. sku_master (sku_id TEXT, sku_name TEXT, category TEXT, sub_category TEXT, weight_kg FLOAT, storage_type TEXT, preferred_zone TEXT)
2. inventory (inventory_id TEXT, sku_id TEXT, node_id TEXT, quantity INT)
3. orders (order_id TEXT, order_date TEXT, customer_id TEXT, priority TEXT, status TEXT)
4. order_items (id INT, order_id TEXT, sku_id TEXT, quantity INT)
5. warehouse_nodes (node_id TEXT, node_type TEXT, zone TEXT, aisle TEXT, rack INT, shelf INT, x FLOAT, y FLOAT)

Rules for SQL Generation:
- Output ONLY the raw SQL query string inside no code blocks, no explanations, no markdown.
- ALWAYS JOIN sku_master ON sku_id to SELECT s.sku_name alongside sku_id. NEVER return raw SKU IDs alone without product names.
- For product location questions, join inventory, warehouse_nodes, and sku_master.
- For order stats, query orders and order_items tables.
"""

        try:
            llm = get_llm()
            prompt = f"{system_prompt}\n\nUser Question: {question}\nSQL Query:"
            sql_response = llm.invoke(prompt).content.strip()
            
            # Strip code block syntax if present
            sql_clean = re.sub(r'```sql|```', '', sql_response).strip()
            
            # Execute on PostgreSQL
            with engine.connect() as conn:
                result = conn.execute(text(sql_clean))
                rows = result.fetchall()
                cols = result.keys()
                
            if not rows:
                answer = f"I queried the warehouse database for '{question}', but found no matching records."
            else:
                formatted_data = [dict(zip(cols, row)) for row in rows[:10]]
                
                # Format final answer with LLM
                answer_prompt = f"""You are an intelligent warehouse management assistant. Summarize these database query results into a clear, professional, human-readable response for a warehouse manager.

IMPORTANT RULE: Always include product names (sku_name) in your response so the warehouse manager immediately knows what item is being referred to (e.g. "Soft Toothbrushes 4-Pack (SKU01141)"). Never state a bare SKU ID without its product name.

User Question: {question}
Query Results: {formatted_data}

Answer:"""
                answer = llm.invoke(answer_prompt).content.strip()
                
        except Exception as e:
            err_msg = str(e)
            # Direct SQL fallback for common questions if Groq API rate limit (429) or LLM generation fails
            try:
                q_lower = question.lower()
                with engine.connect() as conn:
                    if "pending" in q_lower or "order" in q_lower:
                        res = conn.execute(text("SELECT COUNT(*) FROM orders WHERE status = 'PENDING' OR status IS NULL"))
                        cnt = res.scalar()
                        answer = f"There are currently {cnt} pending/active orders in the warehouse system."
                    elif "fast" in q_lower or "selling" in q_lower or "top" in q_lower or "popular" in q_lower:
                        res = conn.execute(text("""
                            SELECT s.sku_name, SUM(oi.quantity) as total_units 
                            FROM order_items oi 
                            JOIN sku_master s ON oi.sku_id = s.sku_id 
                            GROUP BY s.sku_name 
                            ORDER BY total_units DESC LIMIT 5
                        """))
                        items = [f"• {row[0]}: {row[1]} units sold" for row in res]
                        answer = "Here are our top selling products:\n" + "\n".join(items) if items else "Top selling products retrieved."
                    else:
                        res = conn.execute(text("SELECT COUNT(*) FROM sku_master"))
                        cnt = res.scalar()
                        answer = f"The warehouse inventory master tracks {cnt} active registered product SKUs."
            except Exception:
                answer = f"Database Assistant Error: {err_msg}"

        elapsed = time.time() - start_time
        mlflow.log_metric('response_time', elapsed)
        return {
            "question": question,
            "answer": answer
        }