# PROJECT DOCUMENTATION

## SECTION 1 — PROJECT OVERVIEW
Warehouse AI is an intelligent assistant designed to streamline warehouse operations using natural language queries and AI-driven document retrieval. It solves the problem of warehouse staff needing complex database knowledge to find inventory or policy information by allowing them to ask simple questions in plain English. The system is primarily used by warehouse managers who need quick insights into inventory levels, order statuses, and slotting metrics, as well as pickers and staff who need to reference safety guidelines and packing standard operating procedures (SOPs).

## SECTION 2 — COMPLETE FOLDER STRUCTURE
```text
warehouse-ai/
├── .gitignore                    # Prevents secrets, virtual environments, and caches from entering version control
├── agent_test_cases.json         # JSON file containing sample test questions and expected SQL queries for agent testing
├── project_documentation.md      # This documentation file explaining the project
├── docs/
│   ├── packing_sop.txt           # Text file containing rules for packing orders
│   ├── receiving_sop.txt         # Text file containing rules for receiving goods
│   ├── safety_guidelines.txt     # Text file containing warehouse safety protocols
│   └── slotting_policy.txt       # Text file containing warehouse slotting policies
└── backend/
    ├── .env                      # Stores all secrets and API keys (Database URL, Groq API Key)
    ├── requirements.txt          # All Python packages needed to run the backend
    ├── chroma_store/             # Directory where ChromaDB stores its persistent vector database files
    ├── datasets/                 # Folder containing all raw CSV files (inventory, orders, skus, etc.) for initial data import
    └── app/
        ├── main.py               # FastAPI entry point, registers all routes and middlewares
        ├── agents/
        │   ├── __init__.py       # Marks agents directory as a Python package
        │   ├── nl2sql.py         # AI Agent that converts natural language to SQL queries using LangChain and Groq
        │   ├── rag.py            # Retrieval Augmented Generation logic for querying SOPs via ChromaDB
        │   ├── pick_path.py      # Placeholder for future optimal picking path agent
        │   └── slotting.py       # Placeholder for future slotting optimization agent
        ├── api/
        │   ├── __init__.py       # API Package Initializer
        │   ├── query.py          # API route handler for /api/query (natural language database questions)
        │   └── sop.py            # API route handler for /api/sop (SOP policy questions)
        ├── core/
        │   ├── config.py         # Loads and exposes environment variables from .env as typed Python objects
        │   └── database.py       # Configures SQLAlchemy engine and database session makers
        ├── db/
        │   ├── __init__.py       # Marks db directory as a Python package
        │   ├── import_csv.py     # Script to read CSV files from datasets/ and insert them into the PostgreSQL database
        │   └── ingest_sops.py    # Script to read text files from docs/ and insert them as vectors into ChromaDB
        └── models/
            ├── base.py           # Defines the SQLAlchemy Declarative Base that all models inherit from
            ├── inventory.py      # Database model for tracking SKU quantities across warehouse nodes
            ├── order.py          # Database model for customer orders
            ├── order_item.py     # Database model mapping specific SKUs to orders
            ├── sku.py            # Database model for product Stock Keeping Units and dimensions
            ├── user.py           # Database model for application users and role-based permissions
            └── warehouse.py      # Database model for physical warehouse nodes and connecting paths
```

## SECTION 3 — HOW ALL FILES CONNECT
```text
.env → config.py → database.py → import_csv.py
.env → config.py → database.py
.env → config.py → nl2sql.py → query.py → main.py
.env → config.py → rag.py → sop.py → main.py

docs/*.txt → ingest_sops.py → chroma_store/
chroma_store/ → rag.py

base.py → inventory.py
base.py → order.py
base.py → order_item.py
base.py → sku.py
base.py → user.py
base.py → warehouse.py
```

## SECTION 4 — KEY TECHNICAL CONCEPTS USED

**4.1 SQLAlchemy ORM**
What it is: An Object-Relational Mapper that lets you interact with a SQL database using Python classes instead of writing raw SQL strings.
Why we use it: It makes database code safer, more readable, and protects against SQL injection.
Example: Instead of `SELECT * FROM users WHERE id=1`, we write a class `User(Base)` and query it via `session.query(User).filter_by(id=1).first()`.

**4.2 FastAPI + Pydantic**
What they do: FastAPI is a modern framework for building high-performance web APIs. Pydantic is a data validation library that FastAPI uses to ensure incoming data matches the required format.
Why BaseModel matters: Inheriting from `BaseModel` defines a strict schema for requests and responses. If a user sends invalid data, Pydantic automatically rejects it with a helpful error before it even reaches your code.
Example: 
```python
class QueryRequest(BaseModel):
    question: str  # The API will automatically reject requests missing this string field
```

**4.3 LangChain SQL Agent**
What it does: It bridges a Large Language Model (LLM) to a SQL database, allowing the LLM to write and execute SQL queries based on user questions.
Step by Step: 
1. User asks "How many orders are pending?"
2. Agent reads the database schema.
3. Agent writes a SQL query: `SELECT COUNT(*) FROM orders WHERE status='pending';`
4. Agent executes the query on the database.
5. Agent reads the result (e.g., 5) and generates a human-friendly answer: "There are 5 pending orders."

**4.4 ChromaDB Vector Search**
What embeddings are: Arrays of numbers (vectors) that represent the deeper semantic meaning of text.
How semantic search works: Unlike keyword search (which only finds exact word matches), semantic search maps concepts closer together mathematically.
Example: A search for "damaged goods" will find documents containing "broken items" because their vectors point to a similar conceptual location in the database.

**4.5 RAG (Retrieval Augmented Generation)**
What it is: A technique where the system first retrieves relevant documents from a database (like ChromaDB) and then feeds those specific documents to the LLM to generate an answer.
Why it prevents hallucination: The LLM is strictly instructed to only use the provided context, preventing it from inventing fake facts.
Compare: Without RAG, asking "What is our safety policy?" makes the LLM guess based on general internet knowledge. With RAG, the LLM reads your exact `safety_guidelines.txt` before answering.

**4.6 Groq LLM**
What it is: An extremely fast inference engine running the Llama 3 LLM. 
Why temperature=0 matters: A temperature of 0 makes the model completely deterministic, removing randomness. This forces the model to give the most logical, factual answer every time, which is critical for accurate SQL generation.
Why we use it for text generation only: LLMs are language engines, not calculators. They are bad at doing complex math reliably, so we use them to write SQL (text) and let the database engine execute the math.

**4.7 Read-Only Database User**
What warehouse_reader is: A database user account with restricted permissions (`SELECT` only).
Why it exists: We pass this user's credentials to the LangChain SQL Agent. Since the LLM is autonomously generating and executing SQL, we cannot trust it with administrative access.
What happens if someone tries DELETE/DROP: If a user asks "Delete all orders," the agent might try to generate a `DROP TABLE orders` query. The PostgreSQL database will block it with a "Permission Denied" error, protecting the data.

## SECTION 5 — AGENT 1: NL2SQL AGENT (COMPLETE)

**5.1 Purpose**
This agent solves the problem of data accessibility by allowing warehouse managers to query real-time database metrics (like inventory levels and order statuses) using natural conversational English, eliminating the need to write complex SQL scripts.

**5.2 Full code of nl2sql.py with inline comments**
```python
# Import the Groq LLM wrapper from LangChain
from langchain_groq import ChatGroq
# Import the SQL Database connector utility
from langchain_community.utilities import SQLDatabase
# Import the function that creates the intelligent SQL agent
from langchain_community.agent_toolkits import create_sql_agent
# Import our configuration settings (like API keys and DB URLs)
from app.core.config import settings

def get_llm():
    """
    Creates and returns the Groq LLM instance.
    """
    return ChatGroq(
        # We use a 70B parameter model which is highly capable at writing SQL
        model="llama-3.3-70b-versatile",
        # Pull the API key from our secure .env file
        api_key=settings.GROQ_API_KEY,
        # Set temperature to 0 so the model is predictable and doesn't hallucinate
        temperature=0
    )

def get_readonly_db():
    """
    Connects to PostgreSQL using a strictly READ-ONLY user account.
    """
    return SQLDatabase.from_uri(
        # Connect using the restricted URL so the LLM cannot DROP or DELETE tables
        settings.READ_ONLY_DATABASE_URL,
        # Explicitly list the tables the LLM is allowed to see and query
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
    Takes a plain English question, converts it to SQL, runs it, and returns the answer.
    """
    # 1. Get the LLM engine
    llm = get_llm()
    # 2. Get the secure database connection
    db  = get_readonly_db()

    # 3. Create the agent that glues the LLM and DB together
    agent = create_sql_agent(
        llm=llm,
        db=db,
        verbose=True,              # Prints the internal thought process and SQL to terminal
        handle_parsing_errors=True # Tells the agent to auto-correct if it writes bad SQL syntax
    )

    # 4. Feed the user's question into the agent
    result = agent.invoke({"input": question})

    # 5. Return a clean dictionary containing the final output
    return {
        "question": question,
        "answer":   result["output"],
    }
```

**5.3 Step-by-step execution trace**
Input: "Which SKU has the highest order count?"
1. **Question Translation**: The LangChain agent receives the question and asks the database for its schema (tables and columns).
2. **SQL Generation**: The LLM analyzes the schema and writes: `SELECT sku_id, COUNT(*) as order_count FROM order_items GROUP BY sku_id ORDER BY order_count DESC LIMIT 1`
3. **Execution**: The agent safely executes this SELECT query against the read-only PostgreSQL connection.
4. **Result Retrieval**: The database returns `[("SKU01141", 244)]`.
5. **Answer Formulation**: The agent feeds this raw data back into the LLM, instructing it to provide a human-friendly response.
6. **Final Output**: The agent returns: "The SKU with the highest order count is SKU01141 with 244 orders."

**5.4 Five Verified Examples**

EXAMPLE 1:
INPUT:  "Which SKU has the highest order count?"
SQL:    SELECT sku_id, COUNT(*) as order_count FROM order_items 
        GROUP BY sku_id ORDER BY order_count DESC LIMIT 1
OUTPUT: "The SKU with the highest order count is SKU01141 
        with a count of 244."

EXAMPLE 2:
INPUT:  "How many warehouse nodes in Fast zone?"
SQL:    SELECT COUNT(*) FROM warehouse_nodes WHERE zone = 'Fast'
OUTPUT: "There are 20 warehouse nodes in the Fast zone."

EXAMPLE 3:
INPUT:  "Top 3 SKU categories?"
SQL:    SELECT category, COUNT(*) as count FROM sku_master GROUP BY category ORDER BY count DESC LIMIT 3
OUTPUT: "The top 3 SKU categories are Groceries with 54, Electronics with 52, and Household with 38."

EXAMPLE 4:
INPUT:  "Average weight of Electronics SKUs?"
SQL:    SELECT AVG(weight_kg) FROM sku_master WHERE category = 'Electronics'
OUTPUT: "The average weight of Electronics SKUs is 1.44 kg."

EXAMPLE 5:
INPUT:  "How many unique orders with status Pending?"
SQL:    SELECT COUNT(DISTINCT order_id) FROM orders WHERE status = 'Pending'
OUTPUT: "There are 0 unique orders with a status of Pending."

## SECTION 6 — RAG SOP AGENT (COMPLETE)

**6.1 Purpose**
This agent answers warehouse policy and procedure questions by searching through standard operating procedure (SOP) documents, ensuring responses are always based on official company guidelines rather than generic AI knowledge.

**6.2 Full code of rag.py with inline comments**
```python
import chromadb
from langchain_groq import ChatGroq
from app.core.config import settings

def get_collection() -> chromadb.Collection:
    """
    Connects to the persistent ChromaDB store on disk.
    """
    client = chromadb.PersistentClient(path="./chroma_store")
    return client.get_or_create_collection(name="warehouse_sops")

def get_llm() -> ChatGroq:
    """
    Creates and returns the ChatGroq model instance.
    """
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY,
        temperature=0
    )

def query_sop(question: str) -> dict:
    """
    Performs semantic search against ChromaDB, then prompts Groq to answer.
    """
    # 1. Connect to the ChromaDB collection
    collection = get_collection()
    
    # 2. Search for the top 3 most relevant document chunks
    results = collection.query(
        query_texts=[question],
        n_results=3
    )

    # 3. Extract the text and source filenames from the results
    retrieved_docs = results["documents"][0]
    sources = results["ids"][0]
    context = "\n\n---\n\n".join(retrieved_docs)

    # 4. Build a strict prompt forcing the LLM to use only the provided context
    prompt = f"""You are a warehouse operations assistant.
Answer the question using ONLY the SOP context provided below.
If the answer is not in the context, say "I could not find this in the warehouse SOPs."
Do not make up any information.

SOP CONTEXT:
{context}

QUESTION: {question}

ANSWER:"""

    # 5. Send the prompt to Groq and get the answer
    llm = get_llm()
    response = llm.invoke(prompt)

    # 6. Return the answer along with the source files used
    return {
        "question": question,
        "answer":   response.content,
        "sources":  sources
    }
```

**6.3 Full code of ingest_sops.py with inline comments**
```python
import os
import chromadb

def get_chroma_client(path: str = "./chroma_store") -> chromadb.PersistentClient:
    """
    Creates and returns a persistent ChromaDB client.
    """
    return chromadb.PersistentClient(path=path)

def get_docs_path() -> str:
    """
    Locates the docs directory relative to the runtime environment.
    """
    if os.path.isdir("./docs"):
        return "./docs"
    elif os.path.isdir("../docs"):
        return "../docs"
    else:
        raise FileNotFoundError("Could not locate the 'docs' directory at './docs' or '../docs'")

def ingest_documents():
    """
    Reads all .txt files from the docs/ folder.
    Converts each document to a vector embedding using ChromaDB.
    """
    # 1. Connect to ChromaDB and get/create the collection
    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name="warehouse_sops"
    )
    docs_path = get_docs_path()
    count = 0

    # 2. Iterate through all files in the docs folder
    for filename in os.listdir(docs_path):
        if not filename.endswith(".txt"):
            continue

        filepath = os.path.join(docs_path, filename)
        # 3. Read the file content
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # 4. Insert or update the document in ChromaDB (upsert automatically embeds the text)
        collection.upsert(
            documents=[content],
            ids=[filename]
        )
        count += 1
        print(f"[OK] Ingested: {filename}")

    print(f"\nTotal documents ingested: {count}")
    print("ChromaDB store saved at: ./chroma_store")

if __name__ == "__main__":
    ingest_documents()
```

**6.4 Step-by-step execution trace**
Input: "How should heavy items above 15kg be stored?"
1. **Question**: User sends "How should heavy items above 15kg be stored?" to the `/api/sop` endpoint.
2. **ChromaDB Search**: The question is embedded and compared against the vector database.
3. **Context Retrieved**: ChromaDB finds the relevant section in `slotting_policy.txt` regarding weight limits.
4. **Prompt Built**: A prompt is constructed containing the question and the retrieved policy text.
5. **Groq Answers**: The LLM reads the policy and formulates a concise answer based strictly on that text.
6. **Output Returned**: The final answer is returned to the user, complete with the source filename (`slotting_policy.txt`).

**6.5 Five verified input/output examples using real test data**

EXAMPLE 1:
INPUT:   "Heavy items above 15kg"
OUTPUT:  "Heavy items above 15kg must be stored at ground level only."
SOURCES: [slotting_policy.txt, safety_guidelines.txt]

EXAMPLE 2:
INPUT:   "Procedure for damaged goods"
OUTPUT:  "Damaged goods must be moved to Zone D within 2 hours."
SOURCES: [receiving_sop.txt, slotting_policy.txt]

EXAMPLE 3:
INPUT:   "Chemicals near food"
OUTPUT:  "No, chemicals must never be stored together with food items."
SOURCES: [slotting_policy.txt, safety_guidelines.txt]

EXAMPLE 4:
INPUT:   "High velocity SKUs"
OUTPUT:  "High velocity SKUs should be stored in Zone A near the packing station."
SOURCES: [slotting_policy.txt, packing_sop.txt]

EXAMPLE 5:
INPUT:   "When to schedule re-slotting"
OUTPUT:  "Re-slotting should be scheduled during the Night shift."
SOURCES: [slotting_policy.txt]

**6.6 Side-by-side comparison**
- **WITHOUT RAG**: Groq answers from general training data (e.g., "Generally, heavy items should be placed on lower shelves to avoid injury..."). It is a generic guess.
- **WITH RAG**: Groq reads `slotting_policy.txt` and answers exactly according to company rules (e.g., "Heavy items above 15kg must be stored at ground level only.").

## SECTION 7 — DATA FLOW SUMMARY

**NL2SQL Flow (9 steps from question to answer):**
1. Manager types question in the frontend or API.
2. Question is sent to FastAPI `/api/query` route.
3. Pydantic validates the request format.
4. `run_nl2sql` is called with the question.
5. LangChain agent retrieves database schema.
6. Agent uses Groq LLM to write a SQL query based on the schema and question.
7. Agent executes the SQL query against the read-only PostgreSQL connection.
8. Database returns raw data (e.g., numbers or lists).
9. Agent formulates a natural language answer and returns it via FastAPI.

**RAG Flow (8 steps from question to answer):**
1. Picker/Manager types question in the frontend or API.
2. Question is sent to FastAPI `/api/sop` route.
3. Pydantic validates the request format.
4. `query_sop` function connects to ChromaDB.
5. ChromaDB performs a semantic search to find top matching document chunks.
6. A strict prompt is built using the retrieved text as context.
7. Groq LLM generates an answer using ONLY the provided context.
8. The answer and source files are returned via FastAPI.

## SECTION 8 — CURRENT STATUS TABLE

| Component       | Status      | File               | Notes         |
|-----------------|-------------|--------------------|---------------|
| PostgreSQL DB   | Complete    | models/, db/       | 7 tables      |
| NL2SQL Agent    | Complete    | agents/nl2sql.py   | Tested ✅     |
| RAG SOP Agent   | Complete    | agents/rag.py      | Tested ✅     |
| Slotting Agent  | In Progress | agents/slotting.py | Building next |
| Pick Path Agent | Planned     | agents/pick_path.py| After slot    |
| LangGraph Router| Planned     | agents/router.py   | After agents  |
| JWT Auth        | Planned     | core/security.py   | After router  |
| React Frontend  | Planned     | frontend/          | Last          |

## SECTION 9 — HOW TO RUN THE PROJECT

1. `cd D:\warehouse-ai\backend`
2. `.\venv\Scripts\activate`
3. `pip install -r requirements.txt`
4. (PostgreSQL setup - already done)
5. `python -m app.db.import_csv`
6. `python -m app.db.ingest_sops`
7. `uvicorn app.main:app --reload`
8. Open `http://localhost:8000/docs`
9. Test `/api/query` and `/api/sop`
