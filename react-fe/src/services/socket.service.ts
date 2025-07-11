import { io, Socket } from 'socket.io-client';
import { baseUrl } from '../environment';

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;

    private constructor() {}

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    connect() {
        if (!this.socket) {
            // Use environment configuration for both dev and production
            this.socket = io(baseUrl);
            
            this.socket.on('connect', () => {
                console.log('Connected to WebSocket server');
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from WebSocket server');
            });
        }
        return this.socket;
    }

    getSocket(): Socket {
        if (!this.socket) {
            return this.connect();
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export default SocketService.getInstance(); 