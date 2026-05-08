import { Injectable } from '@nestjs/common';
import { join, extname, basename } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { SongsService } from '../songs/songs.service';
import { SongDocument } from '../songs/schemas/song.schema';

const SONGS_DIR =
  process.env.SONGS_DIR || join(process.cwd(), '..', 'songs');

@Injectable()
export class UploadService {
  constructor(private readonly songsService: SongsService) {}

  async processUpload(file: Express.Multer.File): Promise<SongDocument> {
    const filename = file.filename;
    const base = basename(filename, extname(filename));

    let title = base;
    let artist = '';
    let duration = 0;

    try {
      const { parseFile } = await import('music-metadata');
      const meta = await parseFile(join(SONGS_DIR, filename), { duration: true });
      title = meta.common.title || base;
      artist = meta.common.artist || '';
      duration = meta.format.duration || 0;
    } catch {
      // use filename as title
    }

    // Check for matching LRC file
    const lrcFilename = base + '.lrc';
    const hasLrc = existsSync(join(SONGS_DIR, lrcFilename));

    return this.songsService.create({
      title,
      artist,
      filename,
      lrcFilename: hasLrc ? lrcFilename : null,
      duration,
      processingState: 'idle',
    });
  }

  async uploadLrc(songId: string, file: Express.Multer.File): Promise<SongDocument> {
    return this.songsService.update(songId, {
      lrcFilename: file.filename,
    });
  }
}
