import os
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import OFFLINE_MODE
from database import connect_db, close_db
from routers import songs, upload, process, queue

SONGS_DIR = Path(os.environ.get("SONGS_DIR", "../songs"))
SONGS_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    mode = "OFFLINE (AI disabled)" if OFFLINE_MODE else "ONLINE (AI enabled)"
    print(f"[Karaoke] Mode: {mode}")
    print(f"[Karaoke] Songs directory: {SONGS_DIR.resolve()}")
    print("[Karaoke] API ready at http://0.0.0.0:8000")
    yield
    await close_db()


app = FastAPI(title="Karaoke API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(songs.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(process.router, prefix="/api")
app.include_router(queue.router)

app.mount("/songs", StaticFiles(directory=str(SONGS_DIR)), name="songs")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/status")
def status():
    return {
        "offline_mode": OFFLINE_MODE,
        "ai_available": not OFFLINE_MODE,
    }
