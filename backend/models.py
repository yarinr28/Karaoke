import uuid
import json
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List


def new_song_doc(
    *,
    title: str,
    artist: str,
    original_filename: str,
    duration: float,
    provided_lyrics: Optional[str] = None,
) -> dict:
    return {
        "_id": str(uuid.uuid4()),
        "title": title,
        "artist": artist,
        "original_filename": original_filename,
        "instrumental_filename": None,
        "vocals_filename": None,
        "duration": duration,
        "processing_state": "queued",
        "processing_step": "Queued for processing",
        "processing_progress": 0,
        "processing_error": None,
        "provided_lyrics": provided_lyrics,
        "lyrics_json": None,
        "language": None,
        "is_rtl": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def doc_to_dict(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "artist": doc.get("artist", ""),
        "original_filename": doc.get("original_filename", "Unknown"),
        "instrumental_filename": doc.get("instrumental_filename"),
        "vocals_filename": doc.get("vocals_filename"),
        "duration": doc.get("duration", 0.0),
        "processing_state": doc.get("processing_state", "queued"),
        "processing_step": doc.get("processing_step", ""),
        "processing_progress": doc.get("processing_progress", 0),
        "processing_error": doc.get("processing_error"),
        "lyrics": json.loads(doc["lyrics_json"]) if doc.get("lyrics_json") else None,
        "language": doc.get("language"),
        "is_rtl": bool(doc.get("is_rtl", False)),
        "created_at": doc.get("created_at"),
    }


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class WordTimestamp(BaseModel):
    text: str
    start: float
    end: float


class LyricsData(BaseModel):
    words: List[WordTimestamp]
    language: str
    is_rtl: bool


class SongResponse(BaseModel):
    id: str
    title: str
    artist: str
    original_filename: str
    instrumental_filename: Optional[str]
    vocals_filename: Optional[str]
    duration: float
    processing_state: str
    processing_step: str
    processing_progress: int
    processing_error: Optional[str]
    lyrics: Optional[dict]
    language: Optional[str]
    is_rtl: bool
    created_at: Optional[str]
