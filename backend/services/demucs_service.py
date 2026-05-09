"""
Vocal separation using the Demucs Python API (not the CLI subprocess).

Audio loading uses torchaudio.load() — works cleanly on torchaudio==2.5.1
which bundles soundfile/libsndfile and handles MP3, WAV, FLAC, OGG natively.
Audio saving uses the Python stdlib wave module (no extra DLL dependency).
"""

from pathlib import Path


def separate(input_path: Path, output_dir: Path, title_base: str | None = None) -> tuple[Path, Path]:
    """
    Separate vocals from music in input_path.
    Returns (instrumental_path, vocals_path) as 44100 Hz stereo WAV files.

    title_base: sanitized song title used for output filenames
                (e.g. 'Learn_to_Fly' → 'Learn_to_Fly_Instrumental.wav').
                Falls back to the input stem when not provided.
    """
    base = title_base or input_path.stem
    instrumental_path = output_dir / f"{base}_Instrumental.wav"
    vocals_path = output_dir / f"{base}_Vocals.wav"

    if instrumental_path.exists() and vocals_path.exists():
        return instrumental_path, vocals_path

    audio, sr = _load_audio(input_path)          # (1, 2, samples) float32 tensor
    _run_demucs(audio, sr, instrumental_path, vocals_path)

    return instrumental_path, vocals_path


def _load_audio(path: Path):
    """
    Load any audio file (MP3, WAV, FLAC, OGG) using torchaudio 2.5.1.
    Returns (tensor, sample_rate) where tensor shape is (1, 2, samples).
    """
    import torchaudio

    TARGET_SR = 44100

    audio, sr = torchaudio.load(str(path))  # (channels, samples) float32

    if audio.shape[0] == 1:
        audio = audio.repeat(2, 1)
    elif audio.shape[0] > 2:
        audio = audio[:2]

    if sr != TARGET_SR:
        audio = torchaudio.functional.resample(audio, sr, TARGET_SR)

    return audio.unsqueeze(0), TARGET_SR  # (1, 2, samples)


def _run_demucs(audio, sr: int, instrumental_path: Path, vocals_path: Path):
    """
    Run htdemucs via Python API on an already-loaded tensor.
    Writes instrumental and vocals as 44100 Hz 16-bit WAV files.
    """
    import wave
    import numpy as np
    import torch
    from demucs.pretrained import get_model
    from demucs.apply import apply_model

    print("[Demucs] Loading htdemucs model…")
    model = get_model("htdemucs")
    model.eval()

    device = "cuda" if _cuda_available() else "cpu"
    model = model.to(device)
    audio = audio.to(device)

    # Resample if the model expects a different rate (htdemucs uses 44100)
    if sr != model.samplerate:
        import julius
        audio = julius.resample_frac(audio, sr, model.samplerate)

    print("[Demucs] Separating stems…")
    with torch.no_grad():
        sources = apply_model(model, audio, progress=True)
        # sources shape: (1, n_sources, 2, samples)

    src_names = list(model.sources)          # e.g. ['drums','bass','other','vocals']
    idx = {name: i for i, name in enumerate(src_names)}

    vocals = sources[0, idx["vocals"]]       # (2, samples)
    instrumental = sum(
        sources[0, idx[k]] for k in src_names if k != "vocals"
    )                                        # (2, samples)

    sr_out = model.samplerate

    vocals = vocals.cpu().clamp(-1.0, 1.0).numpy().T          # (samples, 2)
    instrumental = instrumental.cpu().clamp(-1.0, 1.0).numpy().T

    _write_wav(vocals_path, vocals, sr_out)
    _write_wav(instrumental_path, instrumental, sr_out)
    print("[Demucs] Done!")


def _write_wav(path: Path, data, samplerate: int):
    """Write float32 (samples, channels) array as 16-bit PCM WAV using stdlib wave."""
    import wave, numpy as np
    pcm = (data * 32767.0).clip(-32768, 32767).astype(np.int16)
    n_channels = pcm.shape[1] if pcm.ndim == 2 else 1
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(n_channels)
        wf.setsampwidth(2)        # 16-bit = 2 bytes
        wf.setframerate(samplerate)
        wf.writeframes(pcm.tobytes())


def _cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False
