import { io, Socket } from 'socket.io-client';

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
            this.socket = io('http://localhost:4171');
            
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