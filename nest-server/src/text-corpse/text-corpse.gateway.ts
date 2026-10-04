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
  // Rooms each connected client has successfully unlocked (with a password).
  // A room is only "locked" for a client that hasn't unlocked it yet.
  private unlockedRooms: Map<string, Set<string>> = new Map();

  constructor(private readonly textCorpseService: TextCorpseService) { }

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    this.clientToRoom.delete(client.id);
    this.unlockedRooms.delete(client.id);
  }

  private isUnlocked(clientId: string, roomId: string): boolean {
    return this.unlockedRooms.get(clientId)?.has(roomId) ?? false;
  }

  private markUnlocked(clientId: string, roomId: string): void {
    const rooms = this.unlockedRooms.get(clientId) ?? new Set<string>();
    rooms.add(roomId);
    this.unlockedRooms.set(clientId, rooms);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload: { roomId: string; password?: string }) {
    const { roomId, password } = payload;

    if (!roomId) {
      console.error(`[TextCorpseGateway] No roomId provided in payload`);
      client.emit('joinRoomError', { error: 'No roomId provided' });
      return;
    }

    // Every corpse starts LOCKED (the text is hidden). A room only becomes
    // unlocked once this client supplies a valid password - either while
    // joining (e.g. the creator) or later via the `unlockRoom` event.
    const providedPassword = (password ?? '').trim();
    let unlocked = this.isUnlocked(client.id, roomId);

    if (!unlocked && providedPassword) {
      const isValid = await this.textCorpseService.verifyPassword(roomId, providedPassword);
      if (isValid) {
        // Remember that this client may now see the full corpse
        this.markUnlocked(client.id, roomId);
        unlocked = true;
      }
    }

    // Leave previous room if any
    const previousRoom = this.clientToRoom.get(client.id);
    if (previousRoom && previousRoom !== roomId) {
      client.leave(previousRoom);
    }

    // Join the Socket.IO room. Even locked clients join so they still receive
    // live text updates (a locked corpse only hides the *older* text).
    client.join(roomId);
    this.clientToRoom.set(client.id, roomId);

    // Get room data from JSON file and send it to the client
    try {
      const text = await this.textCorpseService.getRoomData(roomId);
      client.emit('roomData', { roomId, text: text ?? '', isLocked: !unlocked });
    } catch (error) {
      console.error(`[TextCorpseGateway] Error getting room data for ${roomId}:`, error);
      client.emit('roomData', { roomId, text: '', isLocked: !unlocked });
    }

    // If a password was supplied but rejected, let the client know.
    if (!unlocked && providedPassword) {
      client.emit('joinRoomError', { error: 'Invalid password' });
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
      // Remember the unlock so subsequent joins/refreshes stay unlocked
      this.markUnlocked(client.id, roomId);
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
      const roomData = await this.textCorpseService.getRoomDataFull(roomId);
      const isLocked = !this.isUnlocked(client.id, roomId);
      client.emit('roomData', { roomId, text: roomData?.text ?? '', isLocked });
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
