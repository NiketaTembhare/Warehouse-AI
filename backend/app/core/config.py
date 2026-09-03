import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MLFLOW_DB_PATH = os.path.join(BASE_DIR, "mlflow.db").replace("\\", "/")

class Settings:
    DATABASE_URL           = os.getenv("DATABASE_URL")
    READ_ONLY_DATABASE_URL = os.getenv("READ_ONLY_DATABASE_URL")
    GROQ_API_KEY           = os.getenv("GROQ_API_KEY")
    SECRET_KEY             = os.getenv("SECRET_KEY")
    MLFLOW_TRACKING_URI    = os.getenv("MLFLOW_TRACKING_URI", f"sqlite:///{MLFLOW_DB_PATH}")

settings = Settings()