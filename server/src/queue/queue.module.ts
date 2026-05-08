import { Module } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';
import { QueueService } from './queue.service';

@Module({
  providers: [QueueGateway, QueueService],
  exports: [QueueService],
})
export class QueueModule {}
