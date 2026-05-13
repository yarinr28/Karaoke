להרים:
docker compose --env-file .env.offline up -d
docker compose --env-file .env.online up -d

בילד דורש רשת:
docker compose up -d --build

בילד לקוד ברשת סגורה:
docker compose up -d --build backend
docker compose up -d --build frontend
# Karaoke — Fully Automated AI Karaoke System

Upload any MP3. The system automatically:
1. **Separates** vocals from music (Demucs by Meta)
2. **Transcribes** every word with precise timestamps (faster-whisper)
3. **Aligns** with corrected lyrics (Musixmatch API — optional)
4. **Renders** word-level highlighting in real-time

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.10+ · FastAPI · SQLite |
| AI: Stems | Demucs `htdemucs` model |
| AI: Lyrics | faster-whisper (local, no API cost) |
| Lyrics source | Musixmatch API (optional) |
| Frontend | Next.js 14 · App Router · Tailwind CSS |
| Real-Time | Native WebSocket (queue sync) |

---

## Prerequisites

- **Python 3.10+** and **pip**
- **Node.js 20+** and **npm**
- GPU optional but strongly recommended for Demucs + Whisper speed

---

## Quick Start

### 1. Set up the backend

```bash
cd backend
pip install -r requirements.txt

# Copy and edit config
cp .env.example .env
```

Start it:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000
```

> **First run:** Whisper downloads ~150 MB (`base`) model. Demucs downloads ~830 MB on first use.

### 2. Set up the frontend

```bash
cd frontend
npm install

# Optional: copy env file
cp .env.local.example .env.local
```

Start it:
```bash
npm run dev
# → http://localhost:3000
```

### 3. Open the app

| URL | What it is |
|---|---|
| `http://localhost:3000` | Home — choose Host or Join |
| `http://localhost:3000/host` | Host view (desktop / TV) |
| `http://localhost:3000/guest/XXXXXX` | Guest view (mobile) |

---

## How it works

### Upload → Auto-process pipeline

```
Upload MP3
  │
  ├─ ID3 metadata extraction (title, artist, duration)
  │
  ├─ Demucs: split into instrumental.wav + vocals.wav
  │
  ├─ faster-whisper: transcribe vocals.wav → word timestamps
  │
  └─ Musixmatch (optional): fetch corrected lyrics → align with timestamps
```

Progress is polled every 3 s and shown in the song list.

### Karaoke mode

Two audio tracks are loaded simultaneously in the Web Audio API:
- `instrumental.wav` — always playing
- `vocals.wav` — routed through a `GainNode`

**Karaoke ON** → `vocalsGain.value = 0` (silence vocals, hear backing track + your mic)  
**Karaoke OFF** → `vocalsGain.value = 1` (full original mix)

### Word highlighting

`requestAnimationFrame` polls `audio.currentTime` every frame (~16 ms). Binary search finds the active word and updates styles with sub-frame precision.

### Hebrew / RTL support

- Whisper detects language automatically
- `is_rtl` flag is set for Arabic, Hebrew, Farsi, Urdu, etc.
- Frontend applies `direction: rtl` CSS to the lyrics container

### Party session

1. Host opens `/host` — a 6-char code is created
2. Guests enter the code at `/guest/<CODE>` on their phones
3. Both sides sync via WebSocket — queue updates are real-time

---

## Environment variables

**`backend/.env`**

```env
PORT=8000
SONGS_DIR=../songs
MUSIXMATCH_API_KEY=          # optional — https://developer.musixmatch.com/
WHISPER_MODEL=base           # tiny | base | small | medium | large-v2
WHISPER_DEVICE=cpu           # cpu | cuda
WHISPER_COMPUTE=int8         # int8 (cpu) | float16 (gpu)
```

**`frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/queue
```

---

## Directory layout

```
Karaoke/
├── backend/                 Python FastAPI
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── routers/
│   │   ├── songs.py         CRUD + file streaming
│   │   ├── upload.py        multipart upload
│   │   ├── process.py       Demucs + Whisper pipeline
│   │   └── queue.py         WebSocket queue
│   └── services/
│       ├── demucs_service.py
│       ├── whisper_service.py
│       └── musixmatch_service.py
├── frontend/                Next.js 14 App Router
│   ├── app/
│   │   ├── page.tsx         Home
│   │   ├── host/page.tsx    Host view
│   │   └── guest/[code]/    Guest view
│   ├── components/
│   │   ├── KaraokePlayer    Dual-track audio + lyrics
│   │   ├── LyricsRenderer   Word-level rAF highlighting
│   │   ├── Visualizer       Canvas frequency analyser
│   │   ├── SongList         Library + processing status
│   │   ├── Queue            Drag-to-reorder queue
│   │   ├── FileUpload       Drag-and-drop
│   │   └── ProcessingStatus Live progress bar
│   └── hooks/
│       ├── useKaraokeAudio  Dual-track Web Audio API
│       └── useWebSocket     Queue WebSocket client
└── songs/                   Audio files + SQLite DB
```

---

## Performance notes

| Model | Device | Separation time | Transcription time |
|---|---|---|---|
| Demucs htdemucs | CPU | ~8 min/song | — |
| Demucs htdemucs | GPU | ~1 min/song | — |
| Whisper base | CPU | — | ~30 s/min audio |
| Whisper large-v2 | GPU | — | ~5 s/min audio |

For a party setup, use a machine with a CUDA GPU for near-real-time processing.
