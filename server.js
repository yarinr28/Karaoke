const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const SONGS_DIR = path.join(__dirname, 'songs');

if (!fs.existsSync(SONGS_DIR)) {
    fs.mkdirSync(SONGS_DIR);
}

app.use(express.static(path.join(__dirname, 'public')));

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.webm']);

app.get('/api/songs', (req, res) => {
    try {
        const files = fs.readdirSync(SONGS_DIR);
        const songs = files
            .filter(f => AUDIO_EXTS.has(path.extname(f).toLowerCase()))
            .map(f => {
                const base = path.basename(f, path.extname(f));
                return {
                    name: base,
                    filename: f,
                    hasLyrics: fs.existsSync(path.join(SONGS_DIR, base + '.lrc'))
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(songs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read songs directory' });
    }
});

app.get('/api/lyrics/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const base = path.basename(filename, path.extname(filename));
    const lrcPath = path.join(SONGS_DIR, base + '.lrc');

    if (!fs.existsSync(lrcPath)) {
        return res.status(404).json({ error: 'No lyrics found' });
    }
    res.type('text/plain').sendFile(lrcPath);
});

app.get('/songs/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(SONGS_DIR, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Not found');
    }
    res.sendFile(filePath);
});

app.listen(PORT, () => {
    console.log(`Karaoke app running at http://localhost:${PORT}`);
    console.log(`Put your songs in: ${SONGS_DIR}`);
});
