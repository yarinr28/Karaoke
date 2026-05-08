import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB", "karaoke")

_client: AsyncIOMotorClient | None = None


def get_songs_col() -> AsyncIOMotorCollection:
    return _client[DB_NAME]["songs"]


async def connect_db():
    global _client
    _client = AsyncIOMotorClient(MONGO_URL)
    await _client[DB_NAME].command("ping")
    print(f"[DB] Connected to MongoDB: {MONGO_URL}/{DB_NAME}")


async def close_db():
    if _client:
        _client.close()
