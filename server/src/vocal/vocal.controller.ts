import { Controller, Post, Param, Get } from '@nestjs/common';
import { VocalService } from './vocal.service';
import { SongsService } from '../songs/songs.service';

@Controller('vocal')
export class VocalController {
  constructor(
    private readonly vocalService: VocalService,
    private readonly songsService: SongsService,
  ) {}

  @Post(':id/separate')
  async separate(@Param('id') id: string) {
    // Fire-and-forget — client polls song state
    this.vocalService.separate(id).catch(() => {});
    return { ok: true, message: 'Vocal separation started' };
  }

  @Get(':id/status')
  async status(@Param('id') id: string) {
    const song = await this.songsService.findById(id);
    return {
      processingState: song.processingState,
      processingError: song.processingError,
      hasInstrumental: !!song.instrumentalFilename,
    };
  }
}
