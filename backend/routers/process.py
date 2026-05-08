"""
Full processing pipeline:
  1. Demucs — split into instrumental.wav + vocals.wav
  2. Lyrics acquisition — provided by user > Musixmatch API > none
  3a. If lyrics available → stable-ts forced alignment (DTW) on vocals.wav
  3b. If no lyrics       → faster-whisper free transcription

Demucs and Whisper are CPU/GPU-bound blocking calls; they run in a thread pool
via asyncio.to_thread so they don't block the event loop.
"""

import asyncio
import json
import os
from pathlib import Path
from fastapi import APIRouter
from database import get_songs_col

router = APIRouter(prefix="/process", tags=["process"])
SONGS_DIR = Path(os.environ.get("SONGS_DIR", "../songs"))


async def _update(song_id: str, **fields):
    col = get_songs_col()
    await col.update_one({"_id": song_id}, {"$set": fields})


async def run_pipeline(song_id: str):
    """Async background task — runs the full processing pipeline for one song."""
    from services import demucs_service, whisper_service, musixmatch_service

    col = get_songs_col()
    try:
        doc = await col.find_one({"_id": song_id})
        if not doc:
            return

        input_path = SONGS_DIR / doc["original_filename"]

        # ── Step 1: Demucs ────────────────────────────────────────────────────
        await _update(
            song_id,
            processing_state="separating",
            processing_step="Separating vocals (Demucs)…",
            processing_progress=5,
        )

        instrumental_path, vocals_path = await asyncio.to_thread(
            demucs_service.separate, input_path, SONGS_DIR
        )

        await _update(
            song_id,
            instrumental_filename=instrumental_path.name,
            vocals_filename=vocals_path.name,
            processing_progress=40,
        )

        # ── Step 2: Acquire lyrics ────────────────────────────────────────────
        lyrics_text: str | None = doc.get("provided_lyrics")

        if not lyrics_text:
            await _update(
                song_id,
                processing_step="Fetching lyrics (Musixmatch)…",
                processing_progress=45,
            )
            try:
                lyrics_text = await musixmatch_service.fetch_lyrics(
                    doc["title"], doc.get("artist", "")
                )
            except Exception as e:
                print(f"[Musixmatch] Skipped: {e}")
                lyrics_text = None

        # ── Step 3: Align or transcribe ───────────────────────────────────────
        if lyrics_text:
            source = "user" if doc.get("provided_lyrics") else "Musixmatch"
            await _update(
                song_id,
                processing_state="aligning",
                processing_step=f"Aligning lyrics [{source}] with audio (DTW)…",
                processing_progress=55,
            )
            lyrics_data = await asyncio.to_thread(
                whisper_service.align, vocals_path, lyrics_text
            )
        else:
            await _update(
                song_id,
                processing_state="transcribing",
                processing_step="Transcribing lyrics (Whisper)…",
                processing_progress=55,
            )
            lyrics_data = await asyncio.to_thread(
                whisper_service.transcribe, vocals_path
            )

        # ── Done ──────────────────────────────────────────────────────────────
        await _update(
            song_id,
            lyrics_json=json.dumps(lyrics_data),
            language=lyrics_data.get("language"),
            is_rtl=bool(lyrics_data.get("is_rtl")),
            processing_state="done",
            processing_step="Ready",
            processing_progress=100,
        )

        print(f"[Pipeline] Done: {song_id}")

    except Exception as exc:
        import traceback
        print(f"[Pipeline] Error for {song_id}: {exc}")
        traceback.print_exc()
        try:
            await _update(
                song_id,
                processing_state="error",
                processing_step="Error",
                processing_error=str(exc)[:500],
            )
        except Exception:
            pass
