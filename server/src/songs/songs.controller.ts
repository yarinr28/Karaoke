import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Delete,
} from '@nestjs/common';
import { Response } from 'express';
import { SongsService } from './songs.service';
import { existsSync } from 'fs';

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  findAll() {
    return this.songsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.songsService.findById(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.songsService.delete(id);
  }

  @Get(':id/lyrics')
  async getLyrics(@Param('id') id: string) {
    const song = await this.songsService.findById(id);
    if (!song.lrcFilename) throw new NotFoundException('No lyrics available');
    const content = this.songsService.getLyricsContent(song.lrcFilename);
    if (!content) throw new NotFoundException('Lyrics file not found');
    return { lrc: content };
  }

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Res() res: Response) {
    const song = await this.songsService.findById(id);
    const filePath = this.songsService.getFilePath(song.filename);
    if (!existsSync(filePath)) throw new NotFoundException('Audio file missing');
    res.sendFile(filePath);
  }

  @Get(':id/instrumental')
  async streamInstrumental(@Param('id') id: string, @Res() res: Response) {
    const song = await this.songsService.findById(id);
    if (!song.instrumentalFilename)
      throw new NotFoundException('No instrumental version available');
    const filePath = this.songsService.getFilePath(song.instrumentalFilename);
    if (!existsSync(filePath)) throw new NotFoundException('Instrumental file missing');
    res.sendFile(filePath);
  }
}
