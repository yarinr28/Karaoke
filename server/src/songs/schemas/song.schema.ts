import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SongDocument = Song & Document;

@Schema({ timestamps: true })
export class Song {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  artist: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ default: null })
  instrumentalFilename: string;

  @Prop({ default: null })
  lrcFilename: string;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ default: null })
  coverArt: string;

  @Prop({
    type: String,
    enum: ['idle', 'processing', 'done', 'error'],
    default: 'idle',
  })
  processingState: string;

  @Prop({ default: null })
  processingError: string;
}

export const SongSchema = SchemaFactory.createForClass(Song);
