import os
import re
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
import aiofiles
from database import get_songs_col
from models import new_song_doc, doc_to_dict, sanitize_filename
from routers.process import run_pipeline

router = APIRouter(prefix="/upload", tags=["upload"])

SONGS_DIR = Path(os.environ.get("SONGS_DIR", "../songs"))
ALLOWED = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".webm"}


# ── Helpers for manual upload ─────────────────────────────────────────────────

def _detect_rtl_language(text: str) -> tuple[str, bool]:
    """Detect language and RTL flag by Unicode range sampling."""
    he = sum(1 for c in text if "֐" <= c <= "׿")
    ar = sum(1 for c in text if "؀" <= c <= "ۿ" or "ݐ" <= c <= "ݿ")
    total = max(len(text.replace(" ", "")), 1)
    if he / total > 0.15:
        return "he", True
    if ar / total > 0.15:
        return "ar", True
    return "en", False


def _parse_lrc(lrc_text: str) -> dict:
    """Convert LRC format to our internal line-based lyrics JSON."""
    pattern = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)")
    entries: list[dict] = []
    for raw_line in lrc_text.splitlines():
        m = pattern.match(raw_line.strip())
        if not m:
            continue
        mins, secs, lyric = m.groups()
        start = int(mins) * 60 + float(secs)
        lyric = lyric.strip()
        if lyric:
            entries.append({"start": start, "text": lyric})

    lines = []
    for i, entry in enumerate(entries):
        start = entry["start"]
        end = entries[i + 1]["start"] if i + 1 < len(entries) else start + 5.0
        tokens = entry["text"].split()
        n = len(tokens)
        if not n:
            continue
        dur = (end - start) / n
        words = [
            {"word": w, "start": round(start + j * dur, 3), "end": round(start + (j + 1) * dur, 3)}
            for j, w in enumerate(tokens)
        ]
        lines.append({"words": words})

    all_text = " ".join(e["text"] for e in entries)
    language, is_rtl = _detect_rtl_language(all_text)
    return {"lines": lines, "language": language, "is_rtl": is_rtl}


async def _save_upload(upload: UploadFile, dest: Path) -> None:
    async with aiofiles.open(dest, "wb") as f:
        while chunk := await upload.read(1024 * 1024):
            await f.write(chunk)


def _extract_duration(path: Path) -> float:
    try:
        from mutagen import File as MFile
        meta = MFile(str(path))
        if meta and meta.info:
            return float(getattr(meta.info, "length", 0.0) or 0.0)
    except Exception:
        pass
    return 0.0


def _unique_path(directory: Path, filename: str) -> tuple[Path, str]:
    dest = directory / filename
    if not dest.exists():
        return dest, filename
    stem = Path(filename).stem
    ext = Path(filename).suffix
    new_name = f"{stem}_{str(uuid.uuid4())[:8]}{ext}"
    return directory / new_name, new_name


# ── Flow A: AI processing ─────────────────────────────────────────────────────

@router.post("")
async def upload_song(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    lyrics: str = Form(""),
    title: str = Form(""),
    artist: str = Form(""),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}")

    SONGS_DIR.mkdir(parents=True, exist_ok=True)

    temp_path = SONGS_DIR / f"{uuid.uuid4()}{ext}"
    async with aiofiles.open(temp_path, "wb") as f_out:
        while chunk := await file.read(1024 * 1024):
            await f_out.write(chunk)

    id3_title = Path(file.filename or "").stem
    id3_artist = ""
    duration = 0.0
    try:
        from mutagen import File as MFile
        meta = MFile(str(temp_path))
        if meta:
            if hasattr(meta, "tags") and meta.tags:
                id3_title = (
                    str(meta.tags.get("TIT2", id3_title))
                    or str(meta.tags.get("©nam", [id3_title])[0])
                    or id3_title
                )
                id3_artist = (
                    str(meta.tags.get("TPE1", ""))
                    or str(meta.tags.get("©ART", [""])[0])
                    or ""
                )
            if meta.info:
                duration = getattr(meta.info, "length", 0.0) or 0.0
    except Exception:
        pass

    final_title = title.strip() or id3_title
    final_artist = artist.strip() or id3_artist

    s_title = sanitize_filename(final_title) or "Unknown"
    s_artist = sanitize_filename(final_artist)
    base = f"{s_artist}_{s_title}" if s_artist else s_title
    filename = f"{base}_Original{ext}"
    dest, filename = _unique_path(SONGS_DIR, filename)
    temp_path.rename(dest)

    doc = new_song_doc(
        title=final_title,
        artist=final_artist,
        original_filename=filename,
        duration=duration,
        provided_lyrics=lyrics.strip() or None,
    )
    col = get_songs_col()
    await col.insert_one(doc)
    background_tasks.add_task(run_pipeline, doc["_id"])
    return doc_to_dict(doc)


# ── Flow B: Manual / pre-processed ───────────────────────────────────────────

@router.post("/manual")
async def upload_manual(
    original: UploadFile = File(...),
    instrumental: UploadFile = File(...),
    vocals: UploadFile = File(None),
    title: str = Form(""),
    artist: str = Form(""),
    metadata_json: str = Form(""),
):
    orig_ext = Path(original.filename or "").suffix.lower()
    inst_ext = Path(instrumental.filename or "").suffix.lower()

    if orig_ext not in ALLOWED:
        raise HTTPException(400, f"Unsupported original audio format: {orig_ext}")
    if inst_ext not in ALLOWED:
        raise HTTPException(400, f"Unsupported instrumental audio format: {inst_ext}")
    if vocals and vocals.filename:
        voc_ext = Path(vocals.filename).suffix.lower()
        if voc_ext not in ALLOWED:
            raise HTTPException(400, f"Unsupported vocals audio format: {voc_ext}")
    else:
        vocals = None

    # Parse metadata JSON — extract title, artist, and lyrics if present
    lyrics_data = None
    language: str | None = None
    is_rtl = False

    if metadata_json.strip():
        try:
            meta = json.loads(metadata_json)
            if not title:
                title = meta.get("title", "")
            if not artist:
                artist = meta.get("artist", "")
            lj = meta.get("lyrics_json")
            if isinstance(lj, str) and lj.strip():
                lyrics_data = json.loads(lj)
            elif isinstance(lj, dict):
                lyrics_data = lj
            language = meta.get("language") or None
            is_rtl = bool(meta.get("is_rtl", False))
        except (json.JSONDecodeError, Exception):
            pass

    final_title = title.strip()
    final_artist = artist.strip()
    if not final_title:
        raise HTTPException(400, "title is required")

    # Detect language/RTL if not provided
    if lyrics_data and (not language or language == "unknown"):
        all_words = " ".join(
            w.get("word", "")
            for line in lyrics_data.get("lines", [])
            for w in line.get("words", [])
        )
        language, is_rtl = _detect_rtl_language(all_words)
        lyrics_data["language"] = language
        lyrics_data["is_rtl"] = is_rtl

    SONGS_DIR.mkdir(parents=True, exist_ok=True)

    s_title = sanitize_filename(final_title) or "Unknown"
    s_artist = sanitize_filename(final_artist)
    base = f"{s_artist}_{s_title}" if s_artist else s_title

    # Save original
    orig_dest, orig_filename = _unique_path(SONGS_DIR, f"{base}_Original{orig_ext}")
    await _save_upload(original, orig_dest)
    duration = _extract_duration(orig_dest)

    # Save instrumental
    inst_dest, inst_filename = _unique_path(SONGS_DIR, f"{base}_Instrumental{inst_ext}")
    await _save_upload(instrumental, inst_dest)

    # Save vocals (optional)
    voc_filename = None
    if vocals:
        voc_ext = Path(vocals.filename or "").suffix.lower()
        voc_dest, voc_filename = _unique_path(SONGS_DIR, f"{base}_Vocals{voc_ext}")
        await _save_upload(vocals, voc_dest)

    doc = {
        "_id": str(uuid.uuid4()),
        "title": final_title,
        "artist": final_artist,
        "original_filename": orig_filename,
        "instrumental_filename": inst_filename,
        "vocals_filename": voc_filename,
        "duration": duration,
        "processing_state": "done",
        "processing_step": "Ready",
        "processing_progress": 100,
        "processing_error": None,
        "provided_lyrics": None,
        "lyrics_json": json.dumps(lyrics_data) if lyrics_data else None,
        "language": language,
        "is_rtl": is_rtl,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    col = get_songs_col()
    await col.insert_one(doc)
    return doc_to_dict(doc)
