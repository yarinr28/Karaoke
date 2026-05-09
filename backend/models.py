import re
import uuid
import json
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List


def sanitize_filename(title: str) -> str:
    """Convert a song title to a safe, readable filename component.
    'Learn to Fly' → 'Learn_to_Fly'
    """
    s = title.strip().replace(" ", "_")
    s = re.sub(r"[^\w\-]", "", s)   # keep alphanumeric, underscore, hyphen
    s = re.sub(r"_+", "_", s)       # collapse multiple underscores
    s = s.strip("_")
    return s or "Unknown"


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


def _normalize_word(w: dict) -> dict:
    """Ensure word dict uses the 'word' key (migrate legacy 'text' key)."""
    if "word" not in w and "text" in w:
        return {"word": w["text"], "start": w["start"], "end": w["end"]}
    return w


def _normalize_lyrics(raw: dict | None) -> dict | None:
    """
    Always return the line-based format:
      {"lines": [{"words": [{word, start, end}]}], "language": ..., "is_rtl": ...}

    Handles three legacy shapes:
      • already line-based  → normalise word keys, return as-is
      • flat {"words": [...]} → group into lines of 8 words
      • None / missing       → return None
    """
    if not raw:
        return raw

    if "lines" in raw:
        return {
            **raw,
            "lines": [
                {"words": [_normalize_word(w) for w in line.get("words", [])]}
                for line in raw["lines"]
            ],
        }

    if "words" in raw:
        words = [_normalize_word(w) for w in raw["words"]]
        line_size = 8
        lines = [
            {"words": words[i: i + line_size]}
            for i in range(0, len(words), line_size)
        ]
        return {
            "lines": lines,
            "language": raw.get("language", "unknown"),
            "is_rtl": raw.get("is_rtl", False),
        }

    return raw


def doc_to_dict(doc: dict) -> dict:
    raw_lyrics = json.loads(doc["lyrics_json"]) if doc.get("lyrics_json") else None
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
        "provided_lyrics": doc.get("provided_lyrics"),
        "lyrics": _normalize_lyrics(raw_lyrics),
        "language": doc.get("language"),
        "is_rtl": bool(doc.get("is_rtl", False)),
        "created_at": doc.get("created_at"),
    }


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class WordTimestamp(BaseModel):
    word: str
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
    provided_lyrics: Optional[str]
    lyrics: Optional[dict]
    language: Optional[str]
    is_rtl: bool
    created_at: Optional[str]
