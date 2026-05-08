const audio = document.getElementById('audio');
const searchInput = document.getElementById('searchInput');
const songListEl = document.getElementById('songList');
const songTitleEl = document.getElementById('songTitle');
const lyricsTagEl = document.getElementById('lyricsTag');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeBar = document.getElementById('volumeBar');
const volIcon = document.getElementById('volIcon');
const noSong = document.getElementById('noSong');
const noLyrics = document.getElementById('noLyrics');
const lyricsList = document.getElementById('lyricsList');

let songs = [];
let currentIndex = -1;
let lyrics = [];
let currentLyricIndex = -1;
let isSeeking = false;
let prevVolume = 0.8;

// ── Bootstrap ─────────────────────────────────────────

async function init() {
    audio.volume = volumeBar.value / 100;
    setupEventListeners();
    await loadSongs();
}

async function loadSongs() {
    try {
        const res = await fetch('/api/songs');
        songs = await res.json();
        if (!Array.isArray(songs)) throw new Error('bad response');
        renderSongList();
    } catch {
        songListEl.innerHTML = '<div class="empty-state">Could not load songs.<br>Make sure the server is running.</div>';
    }
}

// ── Rendering ─────────────────────────────────────────

function renderSongList() {
    const q = searchInput.value.trim().toLowerCase();
    const visible = q ? songs.filter(s => s.name.toLowerCase().includes(q)) : songs;

    if (visible.length === 0) {
        songListEl.innerHTML = q
            ? '<div class="empty-state">No songs match your search.</div>'
            : '<div class="empty-state">No audio files found.<br>Add songs to the <strong>songs/</strong> folder.</div>';
        return;
    }

    songListEl.innerHTML = visible.map(song => {
        const idx = songs.indexOf(song);
        const isActive = idx === currentIndex;
        return `<div class="song-item${isActive ? ' active' : ''}" data-index="${idx}">
            <span class="song-item-icon">${isActive ? '🎵' : '🎤'}</span>
            <span class="song-item-name">${esc(song.name)}</span>
            ${song.hasLyrics ? '<span class="lrc-badge">LRC</span>' : ''}
        </div>`;
    }).join('');

    songListEl.querySelectorAll('.song-item').forEach(el => {
        el.addEventListener('click', () => loadSong(Number(el.dataset.index)));
    });
}

function renderLyrics() {
    noSong.hidden = true;

    if (lyrics.length === 0) {
        lyricsList.hidden = true;
        noLyrics.hidden = false;
        lyricsTagEl.textContent = '';
        return;
    }

    noLyrics.hidden = true;
    lyricsList.hidden = false;
    lyricsTagEl.textContent = '♪ lyrics';

    lyricsList.innerHTML = lyrics.map((line, i) =>
        `<li class="lyric-line" data-index="${i}" data-time="${line.time}">${esc(line.text)}</li>`
    ).join('');

    lyricsList.querySelectorAll('.lyric-line').forEach(el => {
        el.addEventListener('click', () => {
            audio.currentTime = parseFloat(el.dataset.time);
            if (audio.paused) audio.play();
        });
    });
}

function updateLyricsHighlight(currentTime) {
    if (!lyrics.length) return;

    let newIdx = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].time) { newIdx = i; break; }
    }

    if (newIdx === currentLyricIndex) return;
    currentLyricIndex = newIdx;

    const items = lyricsList.querySelectorAll('.lyric-line');
    items.forEach((el, i) => {
        el.className = 'lyric-line';
        if (i === newIdx) el.classList.add('active');
        else if (Math.abs(i - newIdx) <= 2) el.classList.add('near');
    });

    if (newIdx >= 0 && items[newIdx]) {
        items[newIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ── Song loading ──────────────────────────────────────

async function loadSong(index) {
    if (index < 0 || index >= songs.length) return;

    currentIndex = index;
    const song = songs[index];

    songTitleEl.textContent = song.name;
    playBtn.disabled = false;
    lyrics = [];
    currentLyricIndex = -1;

    renderSongList();

    audio.src = `/songs/${encodeURIComponent(song.filename)}`;
    audio.load();

    if (song.hasLyrics) {
        try {
            const res = await fetch(`/api/lyrics/${encodeURIComponent(song.filename)}`);
            if (res.ok) lyrics = parseLRC(await res.text());
        } catch {
            // no lyrics fallback is fine
        }
    }

    renderLyrics();

    audio.play().then(() => {
        playBtn.textContent = '⏸';
    }).catch(() => {
        // autoplay blocked — user must click play
    });
}

// ── LRC parser ────────────────────────────────────────

function parseLRC(text) {
    const result = [];
    let offset = 0;
    const timeRe = /\[(\d{1,2}):(\d{2})[.:,](\d{2,3})\]/g;

    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;

        const offsetMatch = line.match(/^\[offset:\s*([+-]?\d+)\]/i);
        if (offsetMatch) { offset = parseInt(offsetMatch[1]) / 1000; continue; }

        if (/^\[(?:ar|ti|al|au|by|re|ve|length):/i.test(line)) continue;

        const times = [];
        let match;
        let lastEnd = 0;
        timeRe.lastIndex = 0;

        while ((match = timeRe.exec(line)) !== null) {
            const ms = parseInt(match[3].padEnd(3, '0'));
            times.push(parseInt(match[1]) * 60 + parseInt(match[2]) + ms / 1000 + offset);
            lastEnd = match.index + match[0].length;
        }

        if (!times.length) continue;

        const lyricText = line.slice(lastEnd).trim() || '♪';
        for (const t of times) result.push({ time: t, text: lyricText });
    }

    return result.sort((a, b) => a.time - b.time);
}

// ── Helpers ───────────────────────────────────────────

function fmt(s) {
    if (isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function esc(str) {
    return str
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setVolIcon(vol) {
    volIcon.textContent = vol === 0 ? '🔇' : vol < 0.5 ? '🔉' : '🔊';
}

function updateProgressFill() {
    const pct = progressBar.max > 0 ? (progressBar.value / progressBar.max) * 100 : 0;
    progressBar.style.background =
        `linear-gradient(to right, var(--accent-bright) ${pct}%, var(--border) ${pct}%)`;
}

function updateVolumeFill() {
    const pct = volumeBar.value;
    volumeBar.style.background =
        `linear-gradient(to right, var(--text-dim) ${pct}%, var(--border) ${pct}%)`;
}

// ── Event listeners ───────────────────────────────────

function setupEventListeners() {
    // Play / pause
    playBtn.addEventListener('click', () => {
        if (audio.paused) audio.play(); else audio.pause();
    });

    audio.addEventListener('play',  () => { playBtn.textContent = '⏸'; });
    audio.addEventListener('pause', () => { playBtn.textContent = '▶'; });

    // Progress
    audio.addEventListener('timeupdate', () => {
        if (!isSeeking && audio.duration) {
            progressBar.value = (audio.currentTime / audio.duration) * 1000;
            currentTimeEl.textContent = fmt(audio.currentTime);
            updateProgressFill();
        }
        updateLyricsHighlight(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = fmt(audio.duration);
    });

    audio.addEventListener('ended', () => {
        playBtn.textContent = '▶';
        if (currentIndex < songs.length - 1) loadSong(currentIndex + 1);
    });

    // Seek
    progressBar.addEventListener('pointerdown', () => { isSeeking = true; });

    progressBar.addEventListener('input', () => {
        updateProgressFill();
        if (audio.duration) currentTimeEl.textContent = fmt((progressBar.value / 1000) * audio.duration);
    });

    document.addEventListener('pointerup', () => {
        if (!isSeeking) return;
        isSeeking = false;
        if (audio.duration) audio.currentTime = (progressBar.value / 1000) * audio.duration;
    });

    // Volume
    volumeBar.addEventListener('input', () => {
        audio.volume = volumeBar.value / 100;
        setVolIcon(audio.volume);
        updateVolumeFill();
        if (audio.volume > 0) prevVolume = audio.volume;
    });

    volIcon.addEventListener('click', () => {
        if (audio.volume > 0) {
            prevVolume = audio.volume;
            audio.volume = 0;
            volumeBar.value = 0;
        } else {
            audio.volume = prevVolume;
            volumeBar.value = Math.round(prevVolume * 100);
        }
        setVolIcon(audio.volume);
        updateVolumeFill();
    });

    // Prev / Next
    prevBtn.addEventListener('click', () => {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
        } else if (currentIndex > 0) {
            loadSong(currentIndex - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < songs.length - 1) loadSong(currentIndex + 1);
    });

    // Search
    searchInput.addEventListener('input', renderSongList);

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.target === searchInput) return;
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (!playBtn.disabled) playBtn.click();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                audio.currentTime = Math.max(0, audio.currentTime - 5);
                break;
            case 'ArrowRight':
                e.preventDefault();
                audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
                break;
            case 'ArrowUp':
                e.preventDefault();
                audio.volume = Math.min(1, Math.round((audio.volume + 0.1) * 10) / 10);
                volumeBar.value = Math.round(audio.volume * 100);
                setVolIcon(audio.volume);
                updateVolumeFill();
                break;
            case 'ArrowDown':
                e.preventDefault();
                audio.volume = Math.max(0, Math.round((audio.volume - 0.1) * 10) / 10);
                volumeBar.value = Math.round(audio.volume * 100);
                setVolIcon(audio.volume);
                updateVolumeFill();
                break;
        }
    });

    // Initial fill for volume bar
    updateVolumeFill();
    updateProgressFill();
}

init();
