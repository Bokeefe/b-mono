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
  async handleJoinRoom(client: Socket, payload: { roomId: string; password?: string }) {
    const { roomId, password } = payload;

    if (!roomId) {
      console.error(`[TextCorpseGateway] No roomId provided in payload`);
      client.emit('joinRoomError', { error: 'No roomId provided' });
      return;
    }

    // Check if room exists and verify password if needed
    const roomData = await this.textCorpseService.getRoomDataFull(roomId);
    if (roomData && roomData.password) {
      // Room has a password, verify it
      const isValid = await this.textCorpseService.verifyPassword(roomId, password || '');
      if (!isValid) {
        // Send error but also send the room data (text) so user can see it, just locked
        const text = await this.textCorpseService.getRoomData(roomId);
        client.emit('roomData', { roomId, text: text ?? '', isLocked: true });
        client.emit('joinRoomError', { error: 'Invalid password' });
        return;
      }
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
      const text = await this.textCorpseService.getRoomData(roomId);
      client.emit('roomData', { roomId, text: text ?? '', isLocked: !!roomData?.password });
    } catch (error) {
      console.error(`[TextCorpseGateway] Error getting room data for ${roomId}:`, error);
      client.emit('roomData', { roomId, text: '', isLocked: false });
    }
  }

  @SubscribeMessage('unlockRoom')
  async handleUnlockRoom(client: Socket, payload: { roomId: string; password: string }) {
    const { roomId, password } = payload;

    if (!roomId || !password) {
      client.emit('unlockRoomError', { error: 'Room ID and password required' });
      return;
    }

    const isValid = await this.textCorpseService.verifyPassword(roomId, password);
    if (isValid) {
      client.emit('unlockRoomSuccess', { roomId });
    } else {
      client.emit('unlockRoomError', { error: 'Invalid password' });
    }
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(client: Socket, payload: { roomId: string; password: string; isPublic: boolean }) {
    const { roomId, password, isPublic } = payload;

    if (!roomId) {
      client.emit('createRoomError', { error: 'Room ID required' });
      return;
    }

    try {
      await this.textCorpseService.createRoom(roomId, password, isPublic);
      client.emit('createRoomSuccess', { roomId });
    } catch (error) {
      console.error(`[TextCorpseGateway] Error creating room ${roomId}:`, error);
      client.emit('createRoomError', { error: 'Failed to create room' });
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
      console.log('[TextCorpseGateway] getRooms requested by client:', client.id);
      // Only return public rooms
      const publicRoomIds = await this.textCorpseService.getPublicRooms();
      const activeRooms = publicRoomIds.map((id) => ({ id }));
      console.log('[TextCorpseGateway] Emitting activeRooms:', activeRooms);
      client.emit('activeRooms', activeRooms);
    } catch (error) {
      console.error('[TextCorpseGateway] Error getting rooms list:', error);
      client.emit('activeRooms', []);
    }
  }
}
