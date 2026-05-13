FROM python:3.11-slim

WORKDIR /app

# build-essential  — needed for C extensions (julius, antlr4, etc.)
# libsndfile1      — audio file I/O (torchaudio / soundfile)
# libgomp1         — OpenMP for demucs
# ffmpeg           — runtime tool (torchaudio ffmpeg backend)
# NO ffmpeg *-dev headers: av>=12 ships pre-built manylinux wheels that
# bundle their own FFmpeg, so we never compile av from source.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

COPY requirements.txt .

# Step 1 — CPU-only PyTorch (~180 MB vs ~2.7 GB with CUDA).
# Docker default is CPU; for GPU see docker-compose deploy block.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install \
        torch==2.5.1 torchaudio==2.5.1 \
        --index-url https://download.pytorch.org/whl/cpu

# Step 2 — Pre-built av wheel (manylinux, bundles its own FFmpeg).
# Must be installed before requirements.txt so pip's resolver sees av>=12
# already satisfied and picks a faster-whisper version compatible with it.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install "av>=12.0.0,<14.0.0"

# Step 3 — everything else (torch + av already satisfied, pip skips them)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Step 4 — Pre-download model weights at build time so the container works
# without internet access at runtime.

# Demucs htdemucs (~83 MB, cached to /root/.cache/torch/hub/checkpoints/)
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

# faster-whisper model files (downloaded via huggingface_hub, no GPU memory needed)
# ARG makes WHISPER_MODEL available as an env var in the RUN step below.
ARG WHISPER_MODEL=large-v3
RUN python -c "\
import os; \
from huggingface_hub import snapshot_download; \
snapshot_download('Systran/faster-whisper-' + os.environ.get('WHISPER_MODEL', 'large-v3'))"

COPY . .

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
