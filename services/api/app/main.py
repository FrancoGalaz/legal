from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.documents import router as documents_router
from app.api.reviews import router as reviews_router
from app.api.auth import router as auth_router
from app.api.pricing import router as pricing_router
from app.core.config import settings
from app.core.db import init_db


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await init_db()
    yield


app = FastAPI(
    title="Legal Agent CL API",
    version=settings.APP_VERSION,
    description="API for the Chilean legal AI SaaS — contract review agent.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(reviews_router)
app.include_router(auth_router)
app.include_router(pricing_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.APP_VERSION}
