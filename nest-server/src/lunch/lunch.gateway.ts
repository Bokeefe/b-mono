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
  },
})
export class LunchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: Map<string, Room> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Send active rooms list to newly connected client
    this.sendActiveRooms();
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove user from their room
    this.rooms.forEach((room, roomId) => {
      room.users = room.users.filter(user => user !== client.id);
      if (room.users.length === 0) {
        this.rooms.delete(roomId);
      } else {
        this.server.to(roomId).emit('userList', room.users);
      }
    });
    // Update active rooms for all clients
    this.sendActiveRooms();
  }

  private sendActiveRooms() {
    const activeRooms = Array.from(this.rooms.entries())
      .filter(([_, room]) => room.isActive)
      .map(([roomId, room]) => ({
        id: roomId,
        userCount: room.users.length,
        suggestions: room.suggestions.length
      }));
    this.server.emit('activeRooms', activeRooms);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { roomId: string, userName: string }) {
    const { roomId, userName } = payload;
    
    // Join the Socket.IO room
    client.join(roomId);

    // Create or update room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: [userName],
        suggestions: [],
        startTime: Date.now(),
        isActive: true
      });
    } else {
      const room = this.rooms.get(roomId);
      if (room) {
        room.users.push(userName);
      }
    }

    // Send current room state to the client
    const room = this.rooms.get(roomId);
    this.server.to(roomId).emit('roomState', room);
    
    // Update active rooms for all clients
    this.sendActiveRooms();
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
      const suggestion = room.suggestions.find(s => s.id === suggestionId);
      if (suggestion && !suggestion.votes.includes(userName)) {
        suggestion.votes.push(userName);
        this.server.to(roomId).emit('roomState', room);
      }
    }
  }

  @SubscribeMessage('getRooms')
  handleGetRooms() {
    this.sendActiveRooms();
  }

  // Check for room timeouts every minute
  constructor() {
    setInterval(() => {
      this.checkRoomTimeouts();
    }, 60000); // Check every minute
  }

  private checkRoomTimeouts() {
    const now = Date.now();
    this.rooms.forEach((room, roomId) => {
      if (room.isActive && now - room.startTime >= 1200000) { // 20 minutes
        room.isActive = false;
        
        // Determine winner
        let winner = null;
        let maxVotes = 0;
        
        room.suggestions.forEach(suggestion => {
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

        this.server.to(roomId).emit('roomComplete', { winner });
      }
    });
  }
} 