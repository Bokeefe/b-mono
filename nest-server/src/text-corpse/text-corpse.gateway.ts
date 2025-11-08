import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TextCorpseService } from './text-corpse.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  namespace: '/text-corpse',
})
export class TextCorpseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientToRoom: Map<string, string> = new Map();

  constructor(private readonly textCorpseService: TextCorpseService) { }

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    const roomId = this.clientToRoom.get(client.id);
    if (roomId) {
      this.clientToRoom.delete(client.id);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload: { roomId: string }) {
    const { roomId } = payload;

    if (!roomId) {
      console.error(`[TextCorpseGateway] No roomId provided in payload`);
      return;
    }

    // Leave previous room if any
    const previousRoom = this.clientToRoom.get(client.id);
    if (previousRoom) {
      client.leave(previousRoom);
    }

    // Join the Socket.IO room
    client.join(roomId);
    this.clientToRoom.set(client.id, roomId);

    // Get room data from JSON file and send it to the client
    try {
      const roomData = await this.textCorpseService.getRoomData(roomId);
      client.emit('roomData', { roomId, text: roomData ?? '' });
    } catch (error) {
      console.error(`[TextCorpseGateway] Error getting room data for ${roomId}:`, error);
      client.emit('roomData', { roomId, text: '' });
    }
  }

  @SubscribeMessage('updateText')
  async handleUpdateText(client: Socket, payload: { roomId: string; text: string }) {
    const { roomId, text } = payload;

    // Save to file
    await this.textCorpseService.saveRoomData(roomId, text);

    // Broadcast to all clients in the room
    this.server.to(roomId).emit('textUpdated', { roomId, text });
  }

  @SubscribeMessage('appendText')
  async handleAppendText(client: Socket, payload: { roomId: string; text: string }) {
    const { roomId, text } = payload;

    if (!roomId || !text) {
      console.error(`[TextCorpseGateway] Invalid appendText payload:`, payload);
      return;
    }

    try {
      // Append text to existing room text
      const updatedText = await this.textCorpseService.appendRoomText(roomId, text);

      // Broadcast to all clients in the room
      this.server.to(roomId).emit('textUpdated', { roomId, text: updatedText });
    } catch (error) {
      console.error(`[TextCorpseGateway] Error appending text for ${roomId}:`, error);
    }
  }

  @SubscribeMessage('getRoomData')
  async handleGetRoomData(client: Socket, payload: { roomId: string }) {
    const { roomId } = payload;
    try {
      const roomData = await this.textCorpseService.getRoomData(roomId);
      client.emit('roomData', { roomId, text: roomData ?? '' });
    } catch (error) {
      console.error(`[TextCorpseGateway] Error in getRoomData for ${roomId}:`, error);
      client.emit('roomData', { roomId, text: '' });
    }
  }

  @SubscribeMessage('getRooms')
  async handleGetRooms(client: Socket) {
    try {
      const data = await this.textCorpseService.getData();
      const roomIds = Object.keys(data || {});
      // Emit a simple array of room objects with id to match frontend expectations
      const activeRooms = roomIds.map((id) => ({ id }));
      client.emit('activeRooms', activeRooms);
    } catch (error) {
      console.error('[TextCorpseGateway] Error getting rooms list:', error);
      client.emit('activeRooms', []);
    }
  }
}
