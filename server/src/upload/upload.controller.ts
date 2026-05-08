import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { UploadService } from './upload.service';
import { mkdirSync } from 'fs';

const SONGS_DIR =
  process.env.SONGS_DIR || join(process.cwd(), '..', 'songs');

mkdirSync(SONGS_DIR, { recursive: true });

const audioStorage = diskStorage({
  destination: SONGS_DIR,
  filename: (req, file, cb) => {
    const safeExt = extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${safeExt}`);
  },
});

const lrcStorage = diskStorage({
  destination: SONGS_DIR,
  filename: (req, file, cb) => {
    cb(null, `${uuid()}.lrc`);
  },
});

const audioFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowed = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.webm']);
  if (!allowed.has(extname(file.originalname).toLowerCase())) {
    return cb(new BadRequestException('Unsupported audio format'), false);
  }
  cb(null, true);
};

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('audio')
  @UseInterceptors(
    FileInterceptor('audio', { storage: audioStorage, fileFilter: audioFilter }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploadService.processUpload(file);
  }

  @Post(':id/lrc')
  @UseInterceptors(FileInterceptor('lrc', { storage: lrcStorage }))
  async uploadLrc(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No LRC file provided');
    return this.uploadService.uploadLrc(id, file);
  }
}
