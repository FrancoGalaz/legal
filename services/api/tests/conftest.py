# ruff: noqa: E402
import asyncio
import os
from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
TEST_DB = API_ROOT / 'test_legal_agent.db'

if TEST_DB.exists():
    TEST_DB.unlink()

os.environ['DATABASE_URL'] = f"sqlite+aiosqlite:///{TEST_DB}"

if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.db import init_db, SessionLocal
from app.models.tenant import Tenant
from app.models.user import User
from app.core.auth import hash_password


async def seed_data():
    async with SessionLocal() as session:
        # Seed tenant
        tenant = Tenant(id="tenant-test-1", name="Test Firm", slug="test-firm")
        session.add(tenant)

        # Seed a test user
        user = User(
            id="test-user-1",
            email="test@legalagent.cl",
            name="Test User",
            hashed_password=hash_password("testpass123"),
            tenant_id="tenant-test-1",
            plan="free",
        )
        session.add(user)
        await session.commit()


asyncio.run(init_db())
asyncio.run(seed_data())
