from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import query
from app.api import sop
from app.api import slotting

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

app.include_router(query.router, prefix="/api")
app.include_router(sop.router, prefix="/api")
app.include_router(slotting.router, prefix="/api")

@app.get("/health")
def health():
    return {
        "status": "running",
        "message": "Warehouse AI is online"
    }