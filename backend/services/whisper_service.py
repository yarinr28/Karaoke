"""
Two operating modes:

  align(vocals_path, lyrics_text, language)
    — Forced alignment via stable-ts DTW.
      Maps exact words in lyrics_text onto the audio using Whisper cross-
      attention weights + Dynamic Time Warping.

  transcribe(vocals_path)
    — Free speech-to-text fallback when no lyrics are available.

Key: audio is pre-loaded with torchaudio and passed as a numpy array.
stable-ts only calls ffmpeg internally when it receives a file-path string;
passing a numpy array bypasses every internal subprocess call.
"""

import os
from pathlib import Path
from typing import Optional

import numpy as np

_model = None
RTL_LANGUAGES = {"ar", "he", "fa", "ur", "iw", "yi", "ug"}


def _get_model():
    global _model
    if _model is None:
        import stable_whisper

        model_size = os.environ.get("WHISPER_MODEL", "large-v3")
        device = os.environ.get("WHISPER_DEVICE", "cpu")
        compute_type = os.environ.get("WHISPER_COMPUTE", "int8")

        print(f"[Whisper] Loading {model_size} via stable-ts / faster-whisper on {device}…")
        _model = stable_whisper.load_faster_whisper(
            model_size, device=device, compute_type=compute_type
        )
        print("[Whisper] Model ready.")
    return _model


def _load_audio_np(vocals_path: Path) -> np.ndarray:
    """
    Load vocals as mono float32 numpy array at 16 kHz (Whisper's input rate).
    Uses torchaudio — no ffmpeg subprocess needed.
    Passing the result (numpy array) to stable-ts skips its internal ffmpeg calls.
    """
    import torchaudio

    audio, sr = torchaudio.load(str(vocals_path))
    if audio.shape[0] > 1:
        audio = audio.mean(0, keepdim=True)     # stereo → mono
    if sr != 16000:
        audio = torchaudio.functional.resample(audio, sr, 16000)
    return audio.squeeze(0).numpy()             # (samples,) float32


def _result_to_words(result) -> list[dict]:
    words = []
    for segment in result.segments:
        if not segment.words:
            continue
        for word in segment.words:
            text = word.word.strip()
            if text:
                words.append({
                    "text": text,
                    "start": round(word.start, 3),
                    "end": round(word.end, 3),
                })
    return words


def _detect_language(text: str) -> Optional[str]:
    """Identify language from Unicode script ranges in the lyrics text."""
    for ch in text:
        cp = ord(ch)
        if 0x0590 <= cp <= 0x05FF:
            return "he"
        if 0x0600 <= cp <= 0x06FF or 0xFB50 <= cp <= 0xFDFF:
            return "ar"
        if 0x0400 <= cp <= 0x04FF:
            return "ru"
    return None


def align(vocals_path: Path, lyrics_text: str, language: Optional[str] = None) -> dict:
    """
    Forced alignment: use DTW to map provided lyrics text onto the audio.
    Returns exact word timestamps for every word in lyrics_text.
    Falls back to free transcription if alignment fails.
    """
    model = _get_model()

    if language is None:
        language = _detect_language(lyrics_text)

    audio_np = _load_audio_np(vocals_path)

    try:
        result = model.align(audio_np, lyrics_text, language=language)
    except Exception as exc:
        print(f"[Whisper] align() failed ({exc}), falling back to transcribe")
        return _run_transcribe(model, audio_np, language)

    detected_language = language or "unknown"
    is_rtl = detected_language in RTL_LANGUAGES

    return {
        "words": _result_to_words(result),
        "language": detected_language,
        "is_rtl": is_rtl,
    }


def transcribe(vocals_path: Path, language: Optional[str] = None) -> dict:
    """Free speech-to-text fallback when no correct lyrics are available."""
    model = _get_model()
    audio_np = _load_audio_np(vocals_path)
    return _run_transcribe(model, audio_np, language)


def _run_transcribe(model, audio_np: np.ndarray, language: Optional[str]) -> dict:
    result = model.transcribe_stable(
        audio_np,
        language=language,
        word_timestamps=True,
        vad_filter=True,
    )

    detected_language = (
        getattr(result, "language", None) or language or "unknown"
    )
    is_rtl = detected_language in RTL_LANGUAGES

    return {
        "words": _result_to_words(result),
        "language": detected_language,
        "is_rtl": is_rtl,
    }
