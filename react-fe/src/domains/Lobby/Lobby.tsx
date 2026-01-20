import { io, Socket } from 'socket.io-client';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { baseUrl } from '../../environment';
import './Lobby.scss';

const Lobby: React.FC = () => {
    const [name, setName] = useState('');
    // rooms will be a list of room ids coming from the server data file
    const [rooms, setRooms] = useState<string[]>([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Get name from localStorage
        let storedName = localStorage.getItem('name');
        if (!storedName) {
            storedName = prompt('What is your name?');
            if (storedName) {
                localStorage.setItem('name', storedName);
            }
        }
        setName(storedName || '');

        // Determine if we're in production
        const isProduction = typeof import.meta !== "undefined" &&
            (import.meta as any).env?.MODE === "production";

        // Socket.io connection options
        const socketOptions: any = {
            // Use polling only in production - works reliably through Cloudflare without WebSocket upgrade issues
            // Allow websocket in dev for better performance
            transports: isProduction ? ['polling'] : ['websocket', 'polling'],
            upgrade: !isProduction, // Disable WebSocket upgrade in production
            rememberUpgrade: !isProduction,
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            autoConnect: true,
        };

        // In production, socket.io is proxied through nginx at /socket.io/
        // Socket.io client defaults to /socket.io path, which matches nginx proxy
        // Explicitly set path to ensure it works correctly with namespaces
        if (isProduction) {
            socketOptions.path = '/socket.io';
        }

        // Connect to the text-corpse namespace and request the list of rooms
        const nsSocket: Socket = io(`${baseUrl}/text-corpse`, socketOptions);

        const handleActiveRooms = (activeRooms: Array<{ id: string }>) => {
            console.log('activeRooms', activeRooms);
            const ids = activeRooms.map(r => r.id);
            setRooms(ids);
        };

        nsSocket.on('connect', () => {
            nsSocket.emit('getRooms');
        });

        nsSocket.on('activeRooms', handleActiveRooms);

        nsSocket.on('connect_error', (err) => console.error('Lobby socket connect error', err));

        return () => {
            nsSocket.off('activeRooms', handleActiveRooms);
            nsSocket.disconnect();
        };
    }, []);

    const handleRoomSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRoom(e.target.value);
        if (e.target.value) {
            navigate(`/text-corpse/${e.target.value}`);
        }
    };

    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (newRoomName.trim()) {
            navigate(`/text-corpse/${newRoomName.trim()}`);
        }
    };

    return (
        <div className="page-container">
            <h1>Welcome, {name}!</h1>

            <div className="room-selection">
                <h2>Create a new <a href="https://en.wikipedia.org/wiki/Exquisite_corpse" target="_blank" rel="noopener noreferrer">Exquisite Corpse</a></h2>
                <select
                    value={selectedRoom}
                    onChange={handleRoomSelect}
                    className="room-dropdown"
                >
                    <option value="">Add to an existing corpse...</option>
                    {rooms.map((room) => (
                        <option key={room} value={room}>
                            {room}
                        </option>
                    ))}
                </select>
            </div>

            <div className="create-room">
                <h2>Or Create a New One</h2>
                <form onSubmit={handleCreateRoom}>
                    <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="Enter name"
                        className="room-input"
                    />
                    <button type="submit" className="create-button">
                        Create Room
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Lobby;
