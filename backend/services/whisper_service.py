"""
Two operating modes:

  align(vocals_path, lyrics_text, language)
    — Forced alignment: the provided lyrics are the ABSOLUTE source of truth.
      Whisper is used ONLY to generate word timestamps from the audio.
      Those timestamps are then zipped onto the user's words in sequential
      order. Whisper's guessed text is discarded entirely — every "word" field
      in the output is exactly a word the user typed.

  transcribe(vocals_path)
    — Free speech-to-text fallback when no lyrics are provided.

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
        import torch

        model_size = os.environ.get("WHISPER_MODEL", "large-v3")
        requested_device = os.environ.get("WHISPER_DEVICE", "cpu")
        requested_compute = os.environ.get("WHISPER_COMPUTE", "int8")

        # Fall back to CPU when CUDA is requested but unavailable
        if requested_device == "cuda" and not torch.cuda.is_available():
            print("[Whisper] CUDA not available — falling back to CPU")
            device = "cpu"
            # float16 is not efficient on CPU; use int8 instead
            compute_type = "int8" if requested_compute == "float16" else requested_compute
        else:
            device = requested_device
            compute_type = requested_compute

        print(f"[Whisper] Loading {model_size} on {device} ({compute_type})…")
        _model = stable_whisper.load_faster_whisper(
            model_size, device=device, compute_type=compute_type
        )
        print("[Whisper] Model ready.")
    return _model


def _load_audio_np(vocals_path: Path) -> np.ndarray:
    """
    Load vocals as mono float32 at 16 kHz (Whisper's expected input rate).
    torchaudio avoids any ffmpeg subprocess. Passing numpy to stable-ts
    bypasses stable-ts's own ffmpeg calls as well.
    """
    import torchaudio

    audio, sr = torchaudio.load(str(vocals_path))
    if audio.shape[0] > 1:
        audio = audio.mean(0, keepdim=True)
    if sr != 16000:
        audio = torchaudio.functional.resample(audio, sr, 16000)
    return audio.squeeze(0).numpy()


def _extract_timestamps(result) -> list[dict]:
    """Pull only start/end from a stable-ts result — text is intentionally ignored."""
    ts = []
    for segment in result.segments:
        if not segment.words:
            continue
        for word in segment.words:
            ts.append({
                "start": round(word.start, 3),
                "end": round(word.end, 3),
            })
    return ts


def _zip_words_to_timestamps(user_words: list[str], timestamps: list[dict]) -> list[dict]:
    """
    Map user_words[i] → timestamps[i] by sequential position.

    The user's word is ALWAYS kept.  If word and timestamp counts differ:
    - More timestamps than words: extra timestamps are discarded.
    - More words than timestamps: remaining words share the last timestamp.
    """
    n_ts = len(timestamps)
    output = []
    for i, word in enumerate(user_words):
        ts = timestamps[min(i, n_ts - 1)] if n_ts else {"start": 0.0, "end": 0.0}
        output.append({"word": word, "start": ts["start"], "end": ts["end"]})
    return output


def _detect_language(text: str) -> Optional[str]:
    """Identify language from Unicode script ranges in the provided text."""
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
    Forced alignment — user's lyrics are the absolute source of truth.

    Pipeline:
      1. Transcribe vocals with Whisper → word timestamps (Whisper text discarded).
      2. Split user lyrics by newlines → preserve line structure.
      3. Flatten all user words → zip sequentially onto timestamps.
      4. Rebuild the line structure with those timestamps.

    Result: {"lines": [{"words": [{"word": ..., "start": ..., "end": ...}]}], ...}
    Every "word" value is verbatim from the user's pasted text.
    """
    model = _get_model()

    if language is None:
        language = _detect_language(lyrics_text)

    audio_np = _load_audio_np(vocals_path)

    result = model.transcribe_stable(
        audio_np,
        language=language,
        word_timestamps=True,
        vad_filter=True,
    )

    timestamps = _extract_timestamps(result)
    detected_language = getattr(result, "language", None) or language or "unknown"
    is_rtl = (_detect_language(lyrics_text) in RTL_LANGUAGES) or (detected_language in RTL_LANGUAGES)

    # Split into lines, filter blank lines, split each line into words
    text_lines = [ln.strip() for ln in lyrics_text.splitlines() if ln.strip()]
    line_word_lists = [ln.split() for ln in text_lines]

    # Flatten to assign timestamps sequentially, then rebuild line structure
    all_user_words = [w for line in line_word_lists for w in line]
    print(f"[Whisper] {len(timestamps)} timestamps → {len(all_user_words)} user words across {len(text_lines)} lines")

    flat_aligned = _zip_words_to_timestamps(all_user_words, timestamps)

    # Reconstruct per-line structure
    lines = []
    idx = 0
    for word_list in line_word_lists:
        count = len(word_list)
        lines.append({"words": flat_aligned[idx: idx + count]})
        idx += count

    return {
        "lines": lines,
        "language": language or detected_language,
        "is_rtl": is_rtl,
    }


def transcribe(vocals_path: Path, language: Optional[str] = None) -> dict:
    """Free speech-to-text — used only when no lyrics were provided."""
    model = _get_model()
    audio_np = _load_audio_np(vocals_path)

    result = model.transcribe_stable(
        audio_np,
        language=language,
        word_timestamps=True,
        vad_filter=True,
    )

    detected_language = getattr(result, "language", None) or language or "unknown"
    is_rtl = detected_language in RTL_LANGUAGES

    words = []
    for segment in result.segments:
        if not segment.words:
            continue
        for word in segment.words:
            text = word.word.strip()
            if text:
                words.append({
                    "word": text,
                    "start": round(word.start, 3),
                    "end": round(word.end, 3),
                })

    return {
        "words": words,
        "language": detected_language,
        "is_rtl": is_rtl,
    }
