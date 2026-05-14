from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "legal-agent-api"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/legal_agent"
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT auth — change JWT_SECRET_KEY in production!
    JWT_SECRET_KEY: str = "change-me-in-production-use-a-real-secret"
    JWT_EXPIRATION_DAYS: int = 30

    # LLM config — set OPENAI_API_KEY or OPENROUTER_API_KEY
    OPENAI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://openrouter.ai/api/v1"
    LLM_MODEL: str = "deepseek/deepseek-v4-flash"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
