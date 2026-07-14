import os
# pyrefly: ignore [missing-import]
import chromadb

def get_chroma_client(path: str = "./chroma_store") -> chromadb.PersistentClient:
    """
    Creates and returns a persistent ChromaDB client.
    
    Args:
        path: Filepath on disk where ChromaDB collections will be persisted.
        
    Returns:
        chromadb.PersistentClient instance.
    """
    # Initialize the persistent client so data survives application/server restarts
    return chromadb.PersistentClient(path=path)


def get_docs_path() -> str:
    """
    Locates the docs directory relative to the runtime environment.
    Checks both current directory and parent directory to support running
    from either the workspace root or the backend folder.
    
    Returns:
        The string path to the docs directory.
        
    Raises:
        FileNotFoundError: If the docs directory cannot be located.
    """
    # Check in the current working directory first (e.g. running from project root)
    if os.path.isdir("./docs"):
        return "./docs"
    # Check in the parent directory (e.g. running from backend/)
    elif os.path.isdir("../docs"):
        return "../docs"
    else:
        raise FileNotFoundError("Could not locate the 'docs' directory at './docs' or '../docs'")


def ingest_documents():
    """
    Reads all .txt files from the docs/ folder.
    Converts each document to a vector embedding using ChromaDB's default embedding function.
    Stores/Upserts the embeddings in ChromaDB to make them searchable.
    
    Run this ONCE before using the RAG agent.
    Run again if you add or modify SOP documents.
    """
    # Initialize the persistent Chroma DB client
    client = get_chroma_client()

    # Get or create the collection. In ChromaDB, a Collection is equivalent to a table.
    collection = client.get_or_create_collection(
        name="warehouse_sops"
    )

    # Locate the docs directory safely
    docs_path = get_docs_path()
    count = 0

    # Iterate through all files in the docs directory
    for filename in os.listdir(docs_path):
        # Only process text files (.txt)
        if not filename.endswith(".txt"):
            continue

        filepath = os.path.join(docs_path, filename)

        # Open and read the contents of the SOP file
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # upsert = insert if new, update if already exists
        # Using the filename as the unique identifier allows safe re-runs
        collection.upsert(
            documents=[content],
            ids=[filename]
        )

        count += 1
        print(f"[OK] Ingested: {filename}")

    print(f"\nTotal documents ingested: {count}")
    print("ChromaDB store saved at: ./chroma_store")


if __name__ == "__main__":
    # Execute the ingestion function when script is run directly
    ingest_documents()
