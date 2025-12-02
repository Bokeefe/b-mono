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
            // Determine if we're in production
            const isProduction = typeof import.meta !== "undefined" &&
                (import.meta as any).env?.MODE === "production";
            
            // Socket.io connection options
            const socketOptions: any = {
                // Use polling only - works reliably through Cloudflare without WebSocket upgrade issues
                transports: ['polling'],
                upgrade: false, // Disable WebSocket upgrade attempts
                timeout: 20000, // 20 second timeout
                forceNew: true, // Force new connection
                reconnection: true, // Enable reconnection
                reconnectionAttempts: 10, // Try to reconnect 10 times
                reconnectionDelay: 1000, // Wait 1 second between attempts
                reconnectionDelayMax: 5000, // Max 5 seconds between attempts
                autoConnect: true, // Connect automatically
            };

            // In production, socket.io is proxied through nginx at /socket.io/
            // Socket.io client defaults to /socket.io path, which matches nginx proxy
            // Explicitly set path to ensure it works correctly
            if (isProduction) {
                socketOptions.path = '/socket.io';
            }

            // Use environment configuration for both dev and production
            this.socket = io(baseUrl, socketOptions);
            
            this.socket.on('connect', () => {
                console.log('Connected to WebSocket server', {
                    url: baseUrl,
                    path: socketOptions.path || '/socket.io',
                    id: this.socket?.id
                });
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from WebSocket server:', reason);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', {
                    error,
                    message: error.message,
                    type: (error as any).type,
                    url: baseUrl,
                    path: socketOptions.path || '/socket.io',
                    description: (error as any).description
                });
            });

            this.socket.on('reconnect', (attemptNumber) => {
                console.log('Reconnected to WebSocket server after', attemptNumber, 'attempts');
            });

            this.socket.on('reconnect_error', (error) => {
                console.error('Socket reconnection error:', {
                    error,
                    message: error.message,
                    type: (error as any).type,
                    description: (error as any).description
                });
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