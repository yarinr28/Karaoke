"""
Vocal separation microservice using Demucs.
Run: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import shutil
from pathlib import Path
from typing import Optional

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

SONGS_DIR = Path(os.environ.get("SONGS_DIR", "../songs"))
SONGS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Karaoke Vocal Separation Service")


class SeparateRequest(BaseModel):
    song_id: str
    filename: str


class SeparateResponse(BaseModel):
    song_id: str
    instrumental_filename: str


@app.get("/health")
def health():
    return {"status": "ok", "device": "cuda" if torch.cuda.is_available() else "cpu"}


@app.post("/separate", response_model=SeparateResponse)
def separate(req: SeparateRequest):
    input_path = SONGS_DIR / req.filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {req.filename}")

    stem = input_path.stem
    ext = input_path.suffix
    instrumental_filename = f"{stem}_instrumental{ext}"
    output_path = SONGS_DIR / instrumental_filename

    if output_path.exists():
        return SeparateResponse(
            song_id=req.song_id,
            instrumental_filename=instrumental_filename,
        )

    try:
        import demucs.separate as demucs_sep
        import subprocess
        import sys

        # Use demucs CLI — htdemucs model gives best quality
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tmp_out = SONGS_DIR / "demucs_tmp" / req.song_id
        tmp_out.mkdir(parents=True, exist_ok=True)

        result = subprocess.run(
            [
                sys.executable, "-m", "demucs",
                "--two-stems", "vocals",
                "-d", device,
                "-o", str(tmp_out),
                str(input_path),
            ],
            capture_output=True,
            text=True,
            timeout=600,
        )

        if result.returncode != 0:
            raise RuntimeError(result.stderr)

        # Demucs outputs: tmp_out/htdemucs/<stem>/no_vocals.wav
        no_vocals_path = next(tmp_out.rglob("no_vocals.*"), None)
        if not no_vocals_path:
            raise RuntimeError("Demucs did not produce no_vocals output")

        shutil.copy2(no_vocals_path, output_path)
        shutil.rmtree(tmp_out, ignore_errors=True)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return SeparateResponse(
        song_id=req.song_id,
        instrumental_filename=instrumental_filename,
    )
