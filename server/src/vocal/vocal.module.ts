import { Module } from '@nestjs/common';
import { VocalController } from './vocal.controller';
import { VocalService } from './vocal.service';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [SongsModule],
  controllers: [VocalController],
  providers: [VocalService],
})
export class VocalModule {}
