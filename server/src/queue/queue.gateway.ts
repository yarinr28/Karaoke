import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueService, QueueItem } from './queue.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly queueService: QueueService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const entry = this.queueService.getSessionBySocket(client.id);
    if (entry) {
      this.queueService.leaveSession(client.id);
      this.broadcastSession(entry.code);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:create')
  handleCreateSession(@ConnectedSocket() client: Socket) {
    const code = this.queueService.createSession(client.id);
    client.join(code);
    const session = this.queueService.getSession(code);
    return { code, session };
  }

  @SubscribeMessage('session:join')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    const session = this.queueService.joinSession(data.code, client.id);
    if (!session) return { error: 'Session not found' };
    client.join(data.code);
    return { code: data.code, session };
  }

  @SubscribeMessage('queue:add')
  handleAddToQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; item: Omit<QueueItem, 'id'> },
  ) {
    try {
      const item = this.queueService.addToQueue(data.code, data.item);
      this.broadcastSession(data.code);
      return { ok: true, item };
    } catch (e) {
      return { error: e.message };
    }
  }

  @SubscribeMessage('queue:remove')
  handleRemoveFromQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; itemId: string },
  ) {
    try {
      this.queueService.removeFromQueue(data.code, data.itemId);
      this.broadcastSession(data.code);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  @SubscribeMessage('queue:reorder')
  handleReorderQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; orderedIds: string[] },
  ) {
    try {
      this.queueService.reorderQueue(data.code, data.orderedIds);
      this.broadcastSession(data.code);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  @SubscribeMessage('queue:next')
  handleNext(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    if (!this.queueService.isHost(data.code, client.id))
      return { error: 'Only host can advance queue' };
    const next = this.queueService.advanceQueue(data.code);
    this.broadcastSession(data.code);
    return { ok: true, next };
  }

  @SubscribeMessage('queue:get')
  handleGetQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    const session = this.queueService.getSession(data.code);
    if (!session) return { error: 'Session not found' };
    return { session };
  }

  @SubscribeMessage('playback:update')
  handlePlaybackUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; isPlaying: boolean; currentTime: number },
  ) {
    if (!this.queueService.isHost(data.code, client.id)) return;
    this.queueService.updatePlaybackState(data.code, data.isPlaying, data.currentTime);
    client.to(data.code).emit('playback:state', {
      isPlaying: data.isPlaying,
      currentTime: data.currentTime,
    });
  }

  private broadcastSession(code: string) {
    const session = this.queueService.getSession(code);
    this.server.to(code).emit('queue:updated', { session });
  }
}
