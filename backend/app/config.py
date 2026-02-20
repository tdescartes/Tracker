from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://homebase_user:password@localhost:5432/homebase_db"

    # JWT
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # OCR
    VERYFI_CLIENT_ID: str = ""
    VERYFI_CLIENT_SECRET: str = ""
    VERYFI_USERNAME: str = ""
    VERYFI_API_KEY: str = ""
    GOOGLE_CLOUD_VISION_API_KEY: str = ""
    USE_TESSERACT: bool = True  # Fall back to free local OCR

    # Storage
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = "homebase-receipts"
    AWS_REGION: str = "us-east-1"
    USE_LOCAL_STORAGE: bool = True
    LOCAL_UPLOAD_DIR: str = "./uploads"

    # General
    APP_NAME: str = "HomeBase"
    DEBUG: bool = True
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Phase 2 — Recipe suggestions
    SPOONACULAR_API_KEY: str = ""   # Optional; falls back to built-in recipes if not set

    # Phase 3 — Plaid bank integration
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"      # sandbox | development | production

    class Config:
        env_file = ".env"


settings = Settings()
