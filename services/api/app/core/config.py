from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "legal-agent-api"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/legal_agent"
    REDIS_URL: str = "redis://localhost:6379/0"

    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
