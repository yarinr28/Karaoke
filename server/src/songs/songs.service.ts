import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Song, SongDocument } from './schemas/song.schema';
import { join, extname, basename } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';

const SONGS_DIR =
  process.env.SONGS_DIR || join(process.cwd(), '..', 'songs');

const AUDIO_EXTS = new Set([
  '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.webm',
]);

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<SongDocument>,
  ) {}

  async syncWithDirectory(): Promise<void> {
    if (!existsSync(SONGS_DIR)) return;

    const files = readdirSync(SONGS_DIR);
    const audioFiles = files.filter((f) =>
      AUDIO_EXTS.has(extname(f).toLowerCase()),
    );

    for (const filename of audioFiles) {
      const exists = await this.songModel.findOne({ filename });
      if (exists) continue;

      const base = basename(filename, extname(filename));
      const lrcFilename = base + '.lrc';
      const hasLrc = existsSync(join(SONGS_DIR, lrcFilename));

      let title = base;
      let artist = '';
      let duration = 0;

      try {
        const { parseFile } = await import('music-metadata');
        const meta = await parseFile(join(SONGS_DIR, filename), {
          duration: true,
        });
        title = meta.common.title || base;
        artist = meta.common.artist || '';
        duration = meta.format.duration || 0;
      } catch {
        // fallback to filename
      }

      await this.create({
        title,
        artist,
        filename,
        lrcFilename: hasLrc ? lrcFilename : null,
        duration,
      });
    }

    // Remove DB records for deleted files
    const allSongs = await this.songModel.find();
    for (const song of allSongs) {
      if (!existsSync(join(SONGS_DIR, song.filename))) {
        await this.songModel.findByIdAndDelete(song._id);
      }
    }
  }

  async findAll(): Promise<SongDocument[]> {
    await this.syncWithDirectory();
    return this.songModel.find().sort({ title: 1 });
  }

  async findById(id: string): Promise<SongDocument> {
    const song = await this.songModel.findById(id);
    if (!song) throw new NotFoundException('Song not found');
    return song;
  }

  async create(data: Partial<Song>): Promise<SongDocument> {
    return new this.songModel(data).save();
  }

  async update(id: string, data: Partial<Song>): Promise<SongDocument> {
    const song = await this.songModel.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!song) throw new NotFoundException('Song not found');
    return song;
  }

  async delete(id: string): Promise<void> {
    await this.songModel.findByIdAndDelete(id);
  }

  getLyricsContent(lrcFilename: string): string | null {
    const lrcPath = join(SONGS_DIR, lrcFilename);
    if (!existsSync(lrcPath)) return null;
    return readFileSync(lrcPath, 'utf8');
  }

  getFilePath(filename: string): string {
    return join(SONGS_DIR, filename);
  }
}
