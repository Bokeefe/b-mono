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
            this.socket = io(baseUrl, {
                transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
                upgrade: true, // Allow transport upgrades
                rememberUpgrade: true, // Remember successful transport
                timeout: 20000, // 20 second timeout
                forceNew: true, // Force new connection
                reconnection: true, // Enable reconnection
                reconnectionAttempts: 10, // Try to reconnect 10 times
                reconnectionDelay: 1000, // Wait 1 second between attempts
                reconnectionDelayMax: 5000, // Max 5 seconds between attempts
                autoConnect: true, // Connect automatically
            });
            
            this.socket.on('connect', () => {
                console.log('Connected to WebSocket server');
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from WebSocket server:', reason);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

            this.socket.on('reconnect', (attemptNumber) => {
                console.log('Reconnected to WebSocket server after', attemptNumber, 'attempts');
            });

            this.socket.on('reconnect_error', (error) => {
                console.error('Socket reconnection error:', error);
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