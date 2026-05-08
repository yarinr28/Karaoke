"""
Fetch lyrics from Musixmatch API and align them with Whisper word timestamps.
"""

import os
import re
from difflib import SequenceMatcher
from typing import Optional
import httpx

MUSIXMATCH_BASE = "https://api.musixmatch.com/ws/1.1"


async def fetch_lyrics(title: str, artist: str) -> Optional[str]:
    """Returns plain-text lyrics or None if unavailable."""
    api_key = os.environ.get("MUSIXMATCH_API_KEY", "")
    if not api_key:
        return None

    async with httpx.AsyncClient(timeout=10) as client:
        # Step 1: find track
        search_resp = await client.get(
            f"{MUSIXMATCH_BASE}/matcher.lyrics.get",
            params={
                "apikey": api_key,
                "q_track": title,
                "q_artist": artist,
                "format": "json",
            },
        )
        if search_resp.status_code != 200:
            return None

        data = search_resp.json()
        try:
            lyrics_body = (
                data["message"]["body"]["lyrics"]["lyrics_body"]
            )
            # Musixmatch free tier appends a copyright footer — strip it
            lyrics_body = re.sub(
                r"\*{4,}.*$", "", lyrics_body, flags=re.DOTALL
            ).strip()
            return lyrics_body if lyrics_body else None
        except (KeyError, TypeError):
            return None


def align_lyrics_with_timestamps(
    lyrics_text: str, whisper_words: list
) -> list:
    """
    Replace Whisper word text with Musixmatch spellings while keeping timestamps.
    Uses sequence matching to map lyrics words → whisper words.

    Returns the same word list structure [{text, start, end}] but with
    corrected spellings where matches are confident.
    """
    if not lyrics_text or not whisper_words:
        return whisper_words

    # Tokenize lyrics into clean words
    mx_words = re.findall(r"[\w']+", lyrics_text.lower())
    w_texts = [w["text"].lower().strip("'\".,!?") for w in whisper_words]

    # Build alignment map: mx_idx → whisper_idx
    matcher = SequenceMatcher(None, mx_words, w_texts, autojunk=False)
    whisper_to_mx: dict[int, str] = {}

    for block in matcher.get_matching_blocks():
        mx_start, w_start, length = block
        for offset in range(length):
            original_mx = re.findall(r"[\w']+", lyrics_text)[mx_start + offset]
            whisper_to_mx[w_start + offset] = original_mx

    result = []
    for i, word in enumerate(whisper_words):
        corrected = whisper_to_mx.get(i, word["text"])
        result.append({**word, "text": corrected})

    return result
