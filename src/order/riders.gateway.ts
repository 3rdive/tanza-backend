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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway(3006, {
  cors: {
    origin: '*',
  },
})
export class RiderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) throw new Error('Missing token');

      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.data.userId = payload.sub;
      console.log(`✅ Client connected: ${payload.sub}`);
    } catch (err) {
      console.log('❌ Invalid socket connection:', err.message || err);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected: ${client.data.userId}`);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() channel: string,
  ) {
    await client.join(channel);
    console.log(`👥 User ${client.data.userId} joined ${channel}`);
    client.emit('joined', { channel });
  }

  // Method to broadcast a new order to the rider
  notifyRiderNewOrder(riderId: string, order: any) {
    const channel = `rider.${riderId}.pending.order`;
    this.server.to(channel).emit(channel, order);
    console.log(`📦 Sent new pending order to ${channel}`);
  }
}
