# Warehouse AI Project Documentation & Status Report

This document contains the complete code, module purpose, used libraries, and functional descriptions of every file in the project, followed by a **Project Status Report**.

---

## 1. Directory Tree Structure

```text
backend/
├── .env
├── requirements.txt
└── app/
    ├── main.py
    ├── agents/
    │   ├── __init__.py
    │   ├── nl2sql.py
    │   ├── pick_path.py (placeholder)
    │   ├── rag.py (placeholder)
    │   └── slotting.py (placeholder)
    ├── api/
    │   └── query.py
    ├── core/
    │   ├── config.py
    │   └── database.py
    ├── db/
    │   └── import_csv.py
    └── models/
        ├── base.py
        ├── inventory.py
        ├── order.py
        ├── order_item.py
        ├── sku.py
        ├── user.py
        └── warehouse.py
```

---

## 2. File-by-File Documentation

### File 1: `.env`
* **Path:** `backend/.env`
* **Purpose:** Stores sensitive environment variables and credentials (database connection URLs, API keys, security keys) configuration-free.
* **Libraries/Technologies:** Dotenv format.
* **Code:**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/warehouse_db
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_secret_key_here
READ_ONLY_DATABASE_URL=postgresql://read_only_username:read_only_password@localhost:5432/warehouse_db
```

---

### File 2: `requirements.txt`
* **Path:** `backend/requirements.txt`
* **Purpose:** Lists all Python third-party dependencies required to run the application.
* **Libraries/Technologies:** Standard Pip requirement format.
* **Code:**
```text
fastapi
uvicorn
sqlalchemy
psycopg2-binary
pandas
python-dotenv
python-jose[cryptography]
passlib[bcrypt]
langchain
langchain-google-genai
langchain-community
chromadb
sentence-transformers
networkx
ortools
langchain-groq
```

---

### File 3: `app/core/config.py`
* **Path:** `backend/app/core/config.py`
* **Purpose:** Loads configuration options from the environment/`.env` file and presents them as a typed python object.
* **Libraries Used:** `os`, `python-dotenv` (`load_dotenv`).
* **Classes:**
  * `Settings`: Holds configuration keys.
* **Key Variable:**
  * `settings`: Singleton instance of `Settings`.
* **Code:**
```python
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL          = os.getenv("DATABASE_URL")
    READ_ONLY_DATABASE_URL = os.getenv("READ_ONLY_DATABASE_URL")
    GROQ_API_KEY          = os.getenv("GROQ_API_KEY")
    SECRET_KEY            = os.getenv("SECRET_KEY")

settings = Settings()
```

---

### File 4: `app/core/database.py`
* **Path:** `backend/app/core/database.py`
* **Purpose:** Configures the SQLAlchemy database engine, session makers, and database session generator functions.
* **Libraries Used:** `sqlalchemy` (`create_engine`, `sessionmaker`), `app.core.config` (`settings`).
* **Functions:**
  * `get_db()`: Generates local transactional database sessions and closes them cleanly upon completion.
* **Code:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### File 5: `app/models/base.py`
* **Path:** `backend/app/models/base.py`
* **Purpose:** Defines the shared declarative Base model class from which all SQLAlchemy database tables inherit.
* **Libraries Used:** `sqlalchemy.ext.declarative` (`declarative_base`).
* **Code:**
```python
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
```

---

### File 6: `app/models/user.py`
* **Path:** `backend/app/models/user.py`
* **Purpose:** Database model representing application users and roles.
* **Libraries Used:** `sqlalchemy` (`Column`, `Integer`, `String`), `app.models.base` (`Base`).
* **Classes:**
  * `User`: Class mapping to `"user"` table. Contains user profiles, password hashes, and permissions.
* **Code:**
```python
from sqlalchemy import Column, Integer, String
from app.models.base import Base

class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Picker", nullable=False)  # Options: Admin, Manager, Picker
```

---

### File 7: `app/models/warehouse.py`
* **Path:** `backend/app/models/warehouse.py`
* **Purpose:** Models nodes (locations) and connecting paths inside the warehouse layout.
* **Libraries Used:** `sqlalchemy` (`Column`, `String`, `Integer`, `Float`), `app.models.base` (`Base`).
* **Classes:**
  * `WarehouseNode`: Represents specific bins, receiving, and packing stations.
  * `WarehousePath`: Represents connection links and distances between nodes.
* **Code:**
```python
from sqlalchemy import Column, String, Integer, Float
from app.models.base import Base

class WarehouseNode(Base):
    __tablename__ = "warehouse_nodes"

    node_id   = Column(String, primary_key=True)
    node_type = Column(String)
    zone      = Column(String)
    aisle     = Column(String)
    rack      = Column(Integer)
    shelf     = Column(Integer)
    x         = Column(Float)
    y         = Column(Float)


class WarehousePath(Base):
    __tablename__ = "warehouse_paths"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    from_node = Column(String)
    to_node   = Column(String)
    distance  = Column(Float)
```

---

### File 8: `app/models/sku.py`
* **Path:** `backend/app/models/sku.py`
* **Purpose:** Database model containing master details for Stock Keeping Units (SKUs).
* **Libraries Used:** `sqlalchemy` (`Column`, `String`, `Float`), `app.models.base` (`Base`).
* **Classes:**
  * `SKU`: Class mapping to `"sku_master"`. Contains dimension, weight, preferred storage, and zone details.
* **Code:**
```python
from sqlalchemy import Column, String, Float
from app.models.base import Base

class SKU(Base):
    __tablename__ = "sku_master"

    sku_id         = Column(String, primary_key=True)
    sku_name       = Column(String)
    category       = Column(String)
    sub_category   = Column(String)
    weight_kg      = Column(Float)
    length_cm      = Column(Float)
    width_cm       = Column(Float)
    height_cm      = Column(Float)
    storage_type   = Column(String)
    preferred_zone = Column(String)
```

---

### File 9: `app/models/inventory.py`
* **Path:** `backend/app/models/inventory.py`
* **Purpose:** Stores inventory levels for individual SKUs across physical warehouse node locations.
* **Libraries Used:** `sqlalchemy` (`Column`, `String`, `Integer`), `app.models.base` (`Base`).
* **Classes:**
  * `Inventory`: Class mapping to `"inventory"` table. Tracks quantity per node location.
* **Code:**
```python
from sqlalchemy import Column, String, Integer
from app.models.base import Base

class Inventory(Base):
    __tablename__ = "inventory"

    inventory_id = Column(String, primary_key=True)
    sku_id       = Column(String)
    node_id      = Column(String)
    quantity     = Column(Integer)
    last_updated = Column(String)
```

---

### File 10: `app/models/order.py`
* **Path:** `backend/app/models/order.py`
* **Purpose:** Models customer order metadata.
* **Libraries Used:** `sqlalchemy` (`Column`, `String`), `app.models.base` (`Base`).
* **Classes:**
  * `Order`: Class mapping to `"orders"` table. Tracks order status, priority, and date.
* **Code:**
```python
from sqlalchemy import Column, String
from app.models.base import Base

class Order(Base):
    __tablename__ = "orders"

    order_id    = Column(String, primary_key=True)
    order_date  = Column(String)
    customer_id = Column(String)
    priority    = Column(String)
    status      = Column(String)
```

---

### File 11: `app/models/order_item.py`
* **Path:** `backend/app/models/order_item.py`
* **Purpose:** Database model representing specific product quantities ordered inside each Order.
* **Libraries Used:** `sqlalchemy` (`Column`, `String`, `Integer`), `app.models.base` (`Base`).
* **Classes:**
  * `OrderItem`: Class mapping to `"order_items"` table. Connects order IDs to SKU IDs and quantity.
* **Code:**
```python
from sqlalchemy import Column, String, Integer
from app.models.base import Base

class OrderItem(Base):
    __tablename__ = "order_items"

    order_item_id = Column(String, primary_key=True)
    order_id      = Column(String)
    sku_id        = Column(String)
    quantity      = Column(Integer)
```

---

### File 12: `app/db/import_csv.py`
* **Path:** `backend/app/db/import_csv.py`
* **Purpose:** Read raw CSV files from the datasets folder, clean leading/trailing whitespaces, and ingest them into PostgreSQL tables using pandas and the SQLAlchemy engine.
* **Libraries Used:** `pandas`, `sys`, `os`, `app.core.database` (`engine`).
* **Functions:**
  * `import_csv(filepath, table_name)`: Loads single CSV datasets into target database tables in "append" mode.
  * `run()`: Entrypoint function coordinating import order for all 6 core files.
* **Code:**
```python
import pandas as pd
import sys
import os

# This makes sure Python can find your app/ folder
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.database import engine

def import_csv(filepath, table_name):
    """
    Reads one CSV file and loads it into the matching PostgreSQL table.
    if_exists='append' means add rows, don't delete existing ones.
    index=False means don't write the pandas row numbers as a column.
    """
    df = pd.read_csv(filepath)

    # Strip whitespace from string columns
    # (your sku_master.csv had some whitespace in preferred_zone)
    df = df.apply(lambda col: col.str.strip() if col.dtype == "object" else col)

    df.to_sql(table_name, engine, if_exists="append", index=False)
    print(f"✅ Imported {len(df)} rows into '{table_name}'")


def run():
    print("Starting CSV import...\n")

    import_csv("datasets/warehouse_nodes.csv", "warehouse_nodes")
    import_csv("datasets/warehouse_paths.csv", "warehouse_paths")
    import_csv("datasets/sku_master.csv",      "sku_master")
    import_csv("datasets/inventory.csv",        "inventory")
    import_csv("datasets/orders.csv",           "orders")
    import_csv("datasets/order_items.csv",      "order_items")

    print("\n All CSVs imported successfully into PostgreSQL.")


if __name__ == "__main__":
    run()
```

---

### File 13: `app/agents/nl2sql.py`
* **Path:** `backend/app/agents/nl2sql.py`
* **Purpose:** Implements the natural language to SQL (NL2SQL) Agent. Converts users' plain English text questions into database queries, executes them using a restricted read-only SQL connection, and responds with a computed summary.
* **Libraries Used:** `langchain_groq` (`ChatGroq`), `langchain_community.utilities` (`SQLDatabase`), `langchain_community.agent_toolkits` (`create_sql_agent`), `app.core.config` (`settings`).
* **Functions:**
  * `get_llm()`: Initialises the `ChatGroq` model (`llama-3.3-70b-versatile`) with a deterministic temperature of 0.
  * `get_readonly_db()`: Sets up the SQLDatabase connection interface restricted to SELECT operations over 6 permitted tables.
  * `run_nl2sql(question)`: Configures and invokes the LangChain SQL agent.
* **Code:**
```python
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
```

---

### File 14: `app/api/query.py`
* **Path:** `backend/app/api/query.py`
* **Purpose:** Exposes the API endpoint `/api/query` that triggers the NL2SQL agent.
* **Libraries Used:** `fastapi` (`APIRouter`, `HTTPException`), `pydantic` (`BaseModel`), `app.agents.nl2sql` (`run_nl2sql`).
* **Classes:**
  * `QueryRequest`: Defines structural request format (question validation).
  * `QueryResponse`: Defines structural output format (question and computed answer).
* **Functions:**
  * `query_warehouse(request)`: Route handler executing the agent call and checking for empty requests.
* **Code:**
```python
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
```

---

### File 15: `app/main.py`
* **Path:** `backend/app/main.py`
* **Purpose:** Application root configuring FastAPI, global CORS middleware rules, API route routers, and health checks.
* **Libraries Used:** `fastapi` (`FastAPI`), `fastapi.middleware.cors` (`CORSMiddleware`), `app.api` (`query`).
* **Functions:**
  * `health()`: Verifies backend liveness over `/health` route.
* **Code:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import query                        # ← add this line

app = FastAPI(
    title="Warehouse AI Assistant",
    description="AI-powered warehouse slotting and picking optimization",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router, prefix="/api")  # ← add this line

@app.get("/health")
def health():
    return {
        "status": "running",
        "message": "Warehouse AI is online"
    }
```

---

## 3. Project Status Report

### Current Progress & Configuration Status:
1. **Database Wiring & Data Loading**:
   - Core SQL database and tables mapped accurately to CSV layouts.
   - CSV data loader (`import_csv.py`) ready to ingest tables into PostgreSQL database via SQLAlchemy engine.
2. **Environment & Core Config**:
   - `Settings` class successfully modified to completely remove unused Gemini configurations.
   - Groq API Key added to `.env` and loaded under settings properties.
   - Dependencies updated: `langchain-groq` added to `requirements.txt` to enable imports.
3. **NL2SQL Agent Capability**:
   - Uses `llama-3.3-70b-versatile` model hosted on Groq via Read-Only database connection schema for query execution.
   - Accessible via API endpoint `/api/query` under `uvicorn app.main:app --reload` server.
4. **Current Status**: 
   - **Active & Stable**. Config imports validated successfully.
