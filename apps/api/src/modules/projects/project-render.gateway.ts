import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';
import { QUEUE_NAMES } from '../../queues/queue-names';

interface SocketServer {
  emit: (event: string, ...args: any[]) => boolean;
  to: (room: string) => { emit: (event: string, ...args: any[]) => boolean };
}

interface SocketClient {
  id: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, ...args: any[]) => boolean;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/render-progress',
})
export class ProjectRenderGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: SocketServer;

  private readonly logger = new Logger(ProjectRenderGateway.name);
  private queueEvents: QueueEvents | null = null;

  constructor(private readonly config: ConfigService) {}

  afterInit() {
    this.logger.log('ProjectRenderGateway initialized on namespace /render-progress');
    const redisUrl = this.config.get<string>('REDIS_URL');
    const connection = redisUrl
      ? { url: redisUrl }
      : {
          host: this.config.get<string>('REDIS_HOST', 'localhost'),
          port: this.config.get<number>('REDIS_PORT', 6379),
          password: this.config.get<string>('REDIS_PASSWORD'),
        };

    try {
      this.queueEvents = new QueueEvents(QUEUE_NAMES.VIDEO_RENDERING, { connection });

      this.queueEvents.on('progress', ({ jobId, data }) => {
        this.logger.debug(`Job ${jobId} progress: ${JSON.stringify(data)}`);
        this.server.emit('render:progress', { jobId, ...(typeof data === 'object' ? data : { progress: data }) });
      });

      this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
        this.logger.log(`Job ${jobId} completed successfully`);
        this.server.emit('render:completed', { jobId, result: returnvalue });
      });

      this.queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.logger.error(`Job ${jobId} failed: ${failedReason}`);
        this.server.emit('render:failed', { jobId, error: failedReason });
      });
    } catch (err) {
      this.logger.warn(`Could not attach BullMQ QueueEvents: ${err}`);
    }
  }

  handleConnection(client: SocketClient) {
    this.logger.debug(`Client connected to render progress: ${client.id}`);
  }

  handleDisconnect(client: SocketClient) {
    this.logger.debug(`Client disconnected from render progress: ${client.id}`);
  }

  @SubscribeMessage('subscribe_project')
  handleSubscribe(
    @ConnectedSocket() client: SocketClient,
    @MessageBody() data: { projectId: string },
  ) {
    if (data?.projectId) {
      client.join(`project:${data.projectId}`);
      this.logger.debug(`Client ${client.id} joined room project:${data.projectId}`);
      return { status: 'subscribed', projectId: data.projectId };
    }
    return { status: 'error', message: 'projectId required' };
  }

  broadcastProjectProgress(projectId: string, percent: number, stage: string, message: string) {
    this.server.to(`project:${projectId}`).emit('progress', {
      projectId,
      percent,
      stage,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
