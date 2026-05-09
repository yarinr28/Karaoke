import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
import aiofiles
from database import get_songs_col
from models import new_song_doc, doc_to_dict, sanitize_filename
from routers.process import run_pipeline

router = APIRouter(prefix="/upload", tags=["upload"])

SONGS_DIR = Path(os.environ.get("SONGS_DIR", "../songs"))
ALLOWED = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".webm"}


@router.post("")
async def upload_song(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    lyrics: str = Form(""),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}")

    SONGS_DIR.mkdir(parents=True, exist_ok=True)

    # Save to a temp UUID path first so we can read metadata before naming
    temp_path = SONGS_DIR / f"{uuid.uuid4()}{ext}"

    async with aiofiles.open(temp_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)

    title = Path(file.filename or "").stem
    artist = ""
    duration = 0.0
    try:
        from mutagen import File as MFile
        meta = MFile(str(temp_path))
        if meta:
            if hasattr(meta, "tags") and meta.tags:
                title = (
                    str(meta.tags.get("TIT2", title))
                    or str(meta.tags.get("©nam", [title])[0])
                    or title
                )
                artist = (
                    str(meta.tags.get("TPE1", ""))
                    or str(meta.tags.get("©ART", [""])[0])
                    or ""
                )
            if meta.info:
                duration = getattr(meta.info, "length", 0.0) or 0.0
    except Exception:
        pass

    # Rename to descriptive filename: {Song_Title}_Original.ext
    sanitized = sanitize_filename(title)
    filename = f"{sanitized}_Original{ext}"
    dest = SONGS_DIR / filename
    if dest.exists():
        # Collision: two songs with the same title → append a short unique suffix
        filename = f"{sanitized}_{str(uuid.uuid4())[:8]}_Original{ext}"
        dest = SONGS_DIR / filename
    temp_path.rename(dest)

    doc = new_song_doc(
        title=title,
        artist=artist,
        original_filename=filename,
        duration=duration,
        provided_lyrics=lyrics.strip() or None,
    )
    col = get_songs_col()
    await col.insert_one(doc)

    background_tasks.add_task(run_pipeline, doc["_id"])

    return doc_to_dict(doc)
