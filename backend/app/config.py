from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://tracker_user:password@localhost:5432/tracker_db"

    # JWT
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # OCR — PaddleOCR (free, offline, high accuracy)
    USE_PADDLEOCR: bool = True  # Use PaddleOCR (CPU) as primary OCR engine

    # AI / LLM — Gemini for receipt structuring
    GEMINI_API_KEY: str = ""  # Google AI Studio key for Gemini 2.0 Flash

    # Storage — local disk now, S3/MinIO later
    USE_LOCAL_STORAGE: bool = True
    LOCAL_UPLOAD_DIR: str = "./uploads"
    S3_ENDPOINT_URL: str = ""    # MinIO endpoint e.g. http://your-server:9000
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "tracker"

    # General
    APP_NAME: str = "Tracker"
    DEBUG: bool = True
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    MOBILE_ORIGIN: str = "http://localhost:8081"

    # Phase 2 — Recipe suggestions
    SPOONACULAR_API_KEY: str = ""   # Optional; falls back to built-in recipes if not set

    # Phase 3 — Plaid bank integration
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"      # sandbox | development | production

    # Configurable subscription keywords (comma-separated, or leave empty for defaults)
    KNOWN_SUBSCRIPTIONS: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
