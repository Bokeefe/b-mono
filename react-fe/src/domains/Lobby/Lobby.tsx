import { io, Socket } from 'socket.io-client';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { baseUrl } from '../../environment';
import './Lobby.scss';

const Lobby: React.FC = () => {
    // rooms will be a list of room ids coming from the server data file
    const [rooms, setRooms] = useState<string[]>([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Determine if we're in production
        const isProduction = typeof import.meta !== "undefined" &&
            (import.meta as any).env?.MODE === "production";

        // Socket.io connection options
        const socketOptions: any = {
            // Use polling first, then allow upgrade to websocket if available
            // This is more reliable than starting with websocket
            transports: isProduction ? ['polling'] : ['polling', 'websocket'],
            upgrade: true, // Allow upgrade in both dev and prod
            rememberUpgrade: false, // Don't remember failed upgrades
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
            // Prompt for password
            const password = prompt('Enter a password to unlock this corpse (or leave blank for no password):');
            if (password === null) {
                // User cancelled
                return;
            }
            
            // Store room creation info in sessionStorage to pass to the room component
            sessionStorage.setItem(`room-${newRoomName.trim()}`, JSON.stringify({
                password: password || '',
                isPublic: isPublic,
            }));
            
            navigate(`/text-corpse/${newRoomName.trim()}`);
        }
    };

    return (
        <div className="page-container">
            <h1>Exquisite Corpse</h1>

            <div className="room-selection">
                <h2>Add to an existing corpse</h2>
                <select
                    value={selectedRoom}
                    onChange={handleRoomSelect}
                    className="room-dropdown"
                >
                    <option value="">Select a corpse...</option>
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
                        placeholder="Enter corpse name"
                        className="room-input"
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                        />
                        <span>Make public (show in dropdown)</span>
                    </label>
                    <button type="submit" className="create-button">
                        Create Corpse
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Lobby;
