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
    Configured to use 'llama-3.3-70b-versatile' with temperature=0 for deterministic answers.
    
    Returns:
        ChatGroq: Configured LangChain ChatGroq LLM.
    """
    # Initialize ChatGroq LLM with deterministic settings and the loaded API key
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY,
        temperature=0
    )


def query_sop(question: str) -> dict:
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

    # Query ChromaDB for top 3 documents matching the question semantically
    results = collection.query(
        query_texts=[question],
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
    llm = get_llm()
    response = llm.invoke(prompt)

    # Step 4: Return formatted results including source files
    return {
        "question": question,
        "answer":   response.content,
        "sources":  sources
    }
