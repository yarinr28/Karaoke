import asyncio
import json
import os
import traceback
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Form, HTTPException
from fastapi.responses import FileResponse
from database import get_songs_col
from models import doc_to_dict

router = APIRouter(prefix="/songs", tags=["songs"])

SONGS_DIR = Path(os.environ.get("SONGS_DIR", "../songs"))


@router.get("")
async def list_songs():
    col = get_songs_col()
    docs = await col.find().sort("created_at", -1).to_list(length=1000)
    return [doc_to_dict(d) for d in docs]


@router.get("/{song_id}")
async def get_song(song_id: str):
    col = get_songs_col()
    doc = await col.find_one({"_id": song_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Song not found")
    return doc_to_dict(doc)


@router.post("/{song_id}/lyrics")
async def update_lyrics(
    song_id: str,
    background_tasks: BackgroundTasks,
    lyrics: str = Form(...),
):
    """
    Save corrected lyrics and re-run forced alignment against the existing
    vocals stem. Overwrites any previous AI-generated or manually set lyrics.
    Returns immediately with processing_state='aligning'; poll GET /{song_id}
    for completion.
    """
    col = get_songs_col()
    doc = await col.find_one({"_id": song_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Song not found")
    if not doc.get("vocals_filename"):
        raise HTTPException(status_code=400, detail="Vocals stem not ready yet — process the song first")

    lyrics_clean = lyrics.strip()

    await col.update_one({"_id": song_id}, {"$set": {
        "provided_lyrics": lyrics_clean,
        "lyrics_json": None,          # wipe old lyrics immediately
        "processing_state": "aligning",
        "processing_step": "Aligning new lyrics with audio…",
        "processing_progress": 10,
        "processing_error": None,
    }})

    background_tasks.add_task(_realign, song_id, lyrics_clean)

    updated = await col.find_one({"_id": song_id})
    return doc_to_dict(updated)


@router.delete("/{song_id}")
async def delete_song(song_id: str):
    col = get_songs_col()
    result = await col.delete_one({"_id": song_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    return {"ok": True}


@router.get("/{song_id}/stream/original")
async def stream_original(song_id: str):
    col = get_songs_col()
    doc = await col.find_one({"_id": song_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Song not found")
    path = SONGS_DIR / doc["original_filename"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio file missing")
    return FileResponse(str(path), media_type="audio/mpeg")


@router.get("/{song_id}/stream/instrumental")
async def stream_instrumental(song_id: str):
    col = get_songs_col()
    doc = await col.find_one({"_id": song_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Song not found")
    if not doc.get("instrumental_filename"):
        raise HTTPException(status_code=404, detail="No instrumental track yet")
    path = SONGS_DIR / doc["instrumental_filename"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="Instrumental file missing")
    return FileResponse(str(path), media_type="audio/wav")


@router.get("/{song_id}/stream/vocals")
async def stream_vocals(song_id: str):
    col = get_songs_col()
    doc = await col.find_one({"_id": song_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Song not found")
    if not doc.get("vocals_filename"):
        raise HTTPException(status_code=404, detail="No vocals track yet")
    path = SONGS_DIR / doc["vocals_filename"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="Vocals file missing")
    return FileResponse(str(path), media_type="audio/wav")


# ── background task ───────────────────────────────────────────────────────────

async def _realign(song_id: str, lyrics_text: str):
    """Re-run forced alignment and overwrite lyrics in the DB."""
    from services import whisper_service

    col = get_songs_col()
    try:
        doc = await col.find_one({"_id": song_id})
        if not doc:
            return

        vocals_path = SONGS_DIR / doc["vocals_filename"]

        lyrics_data = await asyncio.to_thread(
            whisper_service.align, vocals_path, lyrics_text
        )

        await col.update_one({"_id": song_id}, {"$set": {
            "lyrics_json": json.dumps(lyrics_data),
            "language": lyrics_data.get("language"),
            "is_rtl": bool(lyrics_data.get("is_rtl")),
            "processing_state": "done",
            "processing_step": "Ready",
            "processing_progress": 100,
            "processing_error": None,
        }})
        print(f"[Lyrics] Saved realigned lyrics for {song_id}")

    except Exception as exc:
        traceback.print_exc()
        await col.update_one({"_id": song_id}, {"$set": {
            "processing_state": "error",
            "processing_step": "Alignment error",
            "processing_error": str(exc)[:500],
        }})
