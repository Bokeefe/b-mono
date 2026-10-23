import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface Room {
  id: string;
  users: string[];
  suggestions: Suggestion[];
  startTime: number;
  isActive: boolean;
  // Set when the timer expires. Kept on the room so late visitors (or phones
  // that dropped their socket) can still be told what the decision was.
  winner: Suggestion | null;
  completedAt: number | null;
  // Timestamp of when the room last went empty. `null` while someone is in it.
  emptySince: number | null;
}

interface Suggestion {
  id: string;
  place: string;
  suggestedBy: string;
  votes: string[];
}

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
})
export class LunchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Room timeout duration in seconds (20 minutes)
  private readonly ROOM_TIMEOUT_SECONDS = 1200;

  // How long a finished room sticks around so anyone opening the room URL
  // later still sees which place won. After this the room is discarded and
  // the URL starts a fresh vote.
  private readonly COMPLETED_ROOM_RETENTION_MS = 4 * 60 * 60 * 1000; // 4 hours

  // Grace period for an in-progress room with no connected users. Phones drop
  // their socket when backgrounded/locked, so we don't want to throw away a
  // live vote the moment the last tab goes away.
  private readonly EMPTY_ROOM_GRACE_MS = 2 * 60 * 1000; // 2 minutes

  private rooms: Map<string, Room> = new Map();
  private clientToUser: Map<string, { roomId: string; userName: string }> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Send active rooms list to newly connected client
    this.sendActiveRooms();
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Get user info for this client
    const userInfo = this.clientToUser.get(client.id);
    if (userInfo) {
      const { roomId, userName } = userInfo;
      const room = this.rooms.get(roomId);
      
      if (room) {
        // Remove user from room
        room.users = room.users.filter(user => user !== userName);
        
        if (room.users.length === 0) {
          // Don't delete right away: a phone that was backgrounded should be
          // able to rejoin the same room. cleanupRooms() discards it later if
          // nobody comes back.
          room.emptySince = Date.now();
        } else {
          // Update room for remaining users
          this.server.to(roomId).emit('roomState', room);
        }
      }
      
      // Remove client mapping
      this.clientToUser.delete(client.id);
    }
    
    // Update active rooms for all clients
    this.sendActiveRooms();
  }

  private sendActiveRooms() {
    const activeRooms = Array.from(this.rooms.entries())
      .filter(([_, room]) => room.isActive && room.users.length > 0)
      .map(([roomId, room]) => ({
        id: roomId,
        userCount: room.users.length,
        suggestions: room.suggestions.length
      }));
    this.server.emit('activeRooms', activeRooms);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { roomId: string, userName: string }) {
    const roomId = (payload?.roomId || '').trim();
    const userName = (payload?.userName || '').trim();

    if (!roomId) {
      return;
    }
    
    // Join the Socket.IO room
    client.join(roomId);

    // Store client to user mapping
    this.clientToUser.set(client.id, { roomId, userName });

    // Create or update room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        users: [],
        suggestions: [],
        startTime: Date.now(),
        isActive: true,
        winner: null,
        completedAt: null,
        emptySince: null
      };
      this.rooms.set(roomId, room);
    }

    if (userName && !room.users.includes(userName)) {
      room.users.push(userName);
    }
    room.emptySince = null;

    // Send current room state to everyone in the room
    this.server.to(roomId).emit('roomState', room);
    
    if (room.isActive) {
      // Send initial time update to the new user
      client.emit('timeUpdate', this.getTimeLeft(room));
    } else {
      // The vote is already over (late arrival, or a phone waking up after the
      // decision). Replay the decision to this client specifically.
      client.emit('roomComplete', {
        winner: room.winner,
        completedAt: room.completedAt
      });
    }
    
    // Update active rooms for all clients
    this.sendActiveRooms();
  }

  private getTimeLeft(room: Room): number {
    const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
    return Math.max(0, this.ROOM_TIMEOUT_SECONDS - elapsed);
  }

  @SubscribeMessage('addSuggestion')
  handleSuggestion(client: Socket, payload: { roomId: string, suggestion: Omit<Suggestion, 'votes'> }) {
    const { roomId, suggestion } = payload;
    const room = this.rooms.get(roomId);
    
    if (room && room.isActive) {
      const newSuggestion = {
        ...suggestion,
        votes: []
      };
      room.suggestions.push(newSuggestion);
      this.server.to(roomId).emit('roomState', room);
    }
  }

  @SubscribeMessage('vote')
  handleVote(client: Socket, payload: { roomId: string, suggestionId: string, userName: string }) {
    const { roomId, suggestionId, userName } = payload;
    const room = this.rooms.get(roomId);
    
    if (room && room.isActive) {
      // Remove user's vote from all suggestions first
      room.suggestions.forEach(suggestion => {
        suggestion.votes = suggestion.votes.filter(vote => vote !== userName);
      });
      
      // Add user's vote to the selected suggestion
      const targetSuggestion = room.suggestions.find(s => s.id === suggestionId);
      if (targetSuggestion) {
        targetSuggestion.votes.push(userName);
      }
      
      this.server.to(roomId).emit('roomState', room);
    }
  }

  @SubscribeMessage('getRooms')
  handleGetRooms() {
    this.sendActiveRooms();
  }

  // Tick every second: expire finished rooms and discard stale ones
  constructor() {
    setInterval(() => {
      this.checkRoomTimeouts();
      this.cleanupRooms();
    }, 1000); // Check every second for more precise timing

    // Send time updates every minute
    setInterval(() => {
      this.sendTimeUpdates();
    }, 60000); // Send every minute
  }

  private sendTimeUpdates() {
    this.rooms.forEach((room, roomId) => {
      if (room.isActive) {
        const timeLeft = this.getTimeLeft(room);
        
        // Check if time is up
        if (timeLeft <= 0) {
          this.completeRoom(room, roomId);
        } else {
          this.server.to(roomId).emit('timeUpdate', timeLeft);
        }
      }
    });
  }

  private checkRoomTimeouts() {
    const now = Date.now();
    this.rooms.forEach((room, roomId) => {
      if (room.isActive && now - room.startTime >= this.ROOM_TIMEOUT_SECONDS * 1000) {
        this.completeRoom(room, roomId);
      }
    });
  }

  private completeRoom(room: Room, roomId: string) {
    if (!room.isActive) {
      return;
    }

    room.isActive = false;
    room.completedAt = Date.now();
    room.winner = this.pickWinner(room.suggestions);

    // Keep the result on the room (see COMPLETED_ROOM_RETENTION_MS) and tell
    // everyone currently in the room. Clients that were disconnected while the
    // timer ran out get this replayed on their next joinRoom.
    this.server.to(roomId).emit('roomState', room);
    this.server.to(roomId).emit('roomComplete', {
      winner: room.winner,
      completedAt: room.completedAt
    });

    // Finished rooms should no longer be offered on the landing page
    this.sendActiveRooms();
  }

  private pickWinner(suggestions: Suggestion[]): Suggestion | null {
    let winner: Suggestion | null = null;
    let maxVotes = 0;

    suggestions.forEach(suggestion => {
      if (suggestion.votes.length > maxVotes) {
        maxVotes = suggestion.votes.length;
        winner = suggestion;
      } else if (suggestion.votes.length === maxVotes && maxVotes > 0) {
        // Random tiebreaker
        if (Math.random() > 0.5) {
          winner = suggestion;
        }
      }
    });

    return winner;
  }

  /**
   * Drop rooms nobody can use anymore:
   * - in-progress rooms that have been empty past the grace period
   * - finished rooms past the retention window
   */
  private cleanupRooms() {
    const now = Date.now();
    this.rooms.forEach((room, roomId) => {
      if (room.isActive) {
        // A room is only abandoned when nobody is connected to it either —
        // guards against a disconnect that races a reconnect.
        const connectedSockets = this.server?.sockets.adapter.rooms.get(roomId)?.size ?? 0;
        if (
          room.users.length === 0 &&
          connectedSockets === 0 &&
          room.emptySince !== null &&
          now - room.emptySince >= this.EMPTY_ROOM_GRACE_MS
        ) {
          this.rooms.delete(roomId);
        }
        return;
      }

      if (room.completedAt !== null && now - room.completedAt >= this.COMPLETED_ROOM_RETENTION_MS) {
        this.rooms.delete(roomId);
      }
    });
  }
}
