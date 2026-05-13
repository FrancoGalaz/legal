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

from app.core.db import init_db, get_async_session, SessionLocal
from app.main import app
from app.models.tenant import Tenant

async def seed_tenant():
    async with SessionLocal() as session:
        tenant = Tenant(id="tenant-test-1", name="Test Firm", slug="test-firm")
        session.add(tenant)
        await session.commit()

asyncio.run(init_db())
asyncio.run(seed_tenant())
