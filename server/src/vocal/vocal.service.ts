import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SongsService } from '../songs/songs.service';

const PYTHON_URL =
  process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

@Injectable()
export class VocalService {
  private readonly logger = new Logger(VocalService.name);

  constructor(private readonly songsService: SongsService) {}

  async separate(songId: string): Promise<void> {
    const song = await this.songsService.findById(songId);

    await this.songsService.update(songId, {
      processingState: 'processing',
      processingError: null,
    });

    try {
      const response = await axios.post(
        `${PYTHON_URL}/separate`,
        { song_id: songId, filename: song.filename },
        { timeout: 600_000 },
      );

      const { instrumental_filename } = response.data;
      await this.songsService.update(songId, {
        instrumentalFilename: instrumental_filename,
        processingState: 'done',
      });

      this.logger.log(`Vocal separation complete for ${song.title}`);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message;
      await this.songsService.update(songId, {
        processingState: 'error',
        processingError: message,
      });
      this.logger.error(`Vocal separation failed: ${message}`);
    }
  }
}
