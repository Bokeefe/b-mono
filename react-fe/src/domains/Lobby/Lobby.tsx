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

        // Connect to the text-corpse namespace and request the list of rooms
        const nsSocket: Socket = io(`${baseUrl}/text-corpse`, {
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true,
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            autoConnect: true,
        });

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
                <h2>Join a Room</h2>
                <select
                    value={selectedRoom}
                    onChange={handleRoomSelect}
                    className="room-dropdown"
                >
                    <option value="">Select a room...</option>
                    {rooms.map((room) => (
                        <option key={room} value={room}>
                            {room}
                        </option>
                    ))}
                </select>
            </div>

            <div className="create-room">
                <h2>Or Create a New Room</h2>
                <form onSubmit={handleCreateRoom}>
                    <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="Enter room name"
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
