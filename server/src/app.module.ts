import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SongsModule } from './songs/songs.module';
import { QueueModule } from './queue/queue.module';
import { UploadModule } from './upload/upload.module';
import { VocalModule } from './vocal/vocal.module';

const SONGS_DIR = process.env.SONGS_DIR || join(process.cwd(), '..', 'songs');
const CLIENT_DIST = join(process.cwd(), '..', 'client', 'dist');

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/karaoke',
    ),
    ServeStaticModule.forRoot({
      rootPath: CLIENT_DIST,
      exclude: ['/api*'],
      serveStaticOptions: { fallthrough: true },
    }),
    SongsModule,
    QueueModule,
    UploadModule,
    VocalModule,
  ],
})
export class AppModule {}
