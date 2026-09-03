import time
import mlflow
import chromadb
from langchain_groq import ChatGroq
from app.core.config import settings


def get_collection() -> chromadb.Collection:
    """
    Connects to the persistent ChromaDB store on disk.
    Returns the 'warehouse_sops' collection containing embedded SOP documents.
    
    Returns:
        chromadb.Collection: The ChromaDB collection instance.
    """
    # Connect to the persistent database folder where ingestion stored the data
    client = chromadb.PersistentClient(path="./chroma_store")
    
    # Retrieve the existing warehouse SOPs collection (or create if missing)
    return client.get_or_create_collection(name="warehouse_sops")


def get_llm() -> ChatGroq:
    """
    Creates and returns the ChatGroq model instance.
    Configured to use 'llama-3.1-8b-instant' with temperature=0 for fast deterministic answers without TPD rate limits.
    """
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=settings.GROQ_API_KEY,
        temperature=0
    )


def query_sop(question: str) -> dict:
    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
    mlflow.set_experiment('warehouse_agents')
    with mlflow.start_run():
        start_time = time.time()
        mlflow.set_tag('agent', 'rag')
        mlflow.set_tag('agent_name', 'rag')
        mlflow.set_tag('model', 'llama-3.1-8b-instant + ChromaDB')
        mlflow.set_tag('status', 'SUCCESS')
        mlflow.log_param('query', question)
        mlflow.log_param('question', question)

        """
        Performs semantic search against ChromaDB to retrieve relevant context chunks,
        then prompts Groq to construct a highly focused answer using only that context.
    
        Args:
            question: The user's query regarding warehouse standard operating procedures.
        
        Returns:
            dict: A dictionary containing:
                - "question": Original user question
                - "answer": LLM generated response based strictly on the retrieved context
                - "sources": List of document filenames that matched the query
        """
        # Step 1: Connect to ChromaDB collection
        collection = get_collection()

        # Expand query with synonyms for safety, storage rules, and chemical items
        search_query = question
        q_lower = question.lower()
        if any(term in q_lower for term in ["chemical", "hazardous", "flammable", "store", "keep", "safety", "where"]):
            search_query = f"{question} chemical products storage safety guidelines food pharmaceutical"

        # Query ChromaDB for top 3 documents matching the question semantically
        results = collection.query(
            query_texts=[search_query],
            n_results=3
        )

        # Extract matching texts and filenames (lists are nested inside Chroma output format)
        retrieved_docs = results["documents"][0]
        sources = results["ids"][0]

        # Combine the top matching text chunks with clear delimiter lines
        context = "\n\n---\n\n".join(retrieved_docs)

        # Step 2: Build a precise RAG system prompt restricting hallucination
        prompt = f"""You are a warehouse operations assistant.
    Answer the question using ONLY the SOP context provided below.
    If the answer is not in the context, say "I could not find this in the warehouse SOPs."
    Do not make up any information.

    SOP CONTEXT:
    {context}

    QUESTION: {question}

    ANSWER:"""

        # Step 3: Instantiate ChatGroq LLM and generate the response
        try:
            llm = get_llm()
            response = llm.invoke(prompt)
            answer_text = response.content
        except Exception:
            # Fallback to direct SOP context if LLM API rate limit or network issue occurs
            answer_text = f"SOP Document Context (from {', '.join(sources)}):\n\n" + context

        # Step 4: Return formatted results including source files
        elapsed = time.time() - start_time
        mlflow.log_metric('response_time', elapsed)
        return {
            "question": question,
            "answer":   answer_text,
            "sources":  sources
        }
