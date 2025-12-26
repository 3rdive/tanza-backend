import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ActiveStatus } from './active-status.entity';
import { ActiveStatusService } from './services/active-status.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Attach to the main HTTP server (no custom port) for simpler client connection
@WebSocketGateway(3006, { cors: { origin: '*' } })
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly activeStatusService: ActiveStatusService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) throw new Error('Missing token');

      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.data.userId = payload.sub;
      console.log(`✅ User connected: ${payload.sub}`);
    } catch (err) {
      console.log('❌ Invalid user socket connection:', err.message || err);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      try {
        await this.activeStatusService.update(userId, {
          status: 'inactive',
        });
        console.log(`🔌 User ${userId} disconnected and set to inactive`);
      } catch (err) {
        console.log(
          `❌ Error setting user ${userId} to inactive:`,
          err.message || err,
        );
      }
    }
  }

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
