import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

_pool = None

async def create_pool():
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=os.getenv("DATABASE_URL"),
        min_size=1,
        max_size=10,
        statement_cache_size=0  # required for pgBouncer/Neon pooler
    )
    return _pool

async def close_pool():
    global _pool
    if _pool:
        await _pool.close()

def get_pool():
    return _pool
