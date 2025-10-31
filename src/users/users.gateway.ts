import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ActiveStatus } from './active-status.entity';
import { ActiveStatusService } from './services/active-status.service';
// import { ActiveStatusService } from './active-status.service'; // example service

// Attach to the main HTTP server (no custom port) for simpler client connection
@WebSocketGateway(3006, { cors: { origin: '*' } })
export class UsersGateway {
  constructor(private readonly activeStatusService: ActiveStatusService) {}
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('active.status')
  // Emit to the rider's room with a stable event name
  async handleBroadcastStatus(@MessageBody() activeStatus: ActiveStatus) {
    console.log('Broadcasting status for user:', activeStatus);
    await this.activeStatusService.update(activeStatus.userId, {
      status: activeStatus.status,
      latitude: activeStatus.latitude,
      longitude: activeStatus.longitude,
    });
    this.server.emit(`rider.${activeStatus.userId}.status`, activeStatus);
  }
}
