import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL          = os.getenv("DATABASE_URL")
    READ_ONLY_DATABASE_URL = os.getenv("READ_ONLY_DATABASE_URL")
    GROQ_API_KEY          = os.getenv("GROQ_API_KEY")
    SECRET_KEY            = os.getenv("SECRET_KEY")

settings = Settings()