import { Room } from '@b-mono/models';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../../services/socket.service';
import './Lunch.scss';

const Landing: React.FC = () => {
    const [name, setName] = useState('');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const navigate = useNavigate();
    const socket = socketService.getSocket();

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

        // Listen for active rooms list
        socket.on('activeRooms', (activeRooms: Room[]) => {
            console.log('activeRooms', activeRooms);
            setRooms(activeRooms);
        });

        return () => {
            socket.off('activeRooms');
        };
    }, []);

    const handleRoomSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRoom(e.target.value);
        if (e.target.value) {
            navigate(`/room/${e.target.value}`);
        }
    };

    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (newRoomName.trim()) {
            navigate(`/room/${newRoomName.trim()}`);
        }
    };

    return (
        <div className="page-container">
            <h1>Welcome, {name}!</h1>
            
            <div className="room-selection">
                <h2>Join a Lunch Room</h2>
                <select 
                    value={selectedRoom} 
                    onChange={handleRoomSelect}
                    className="room-dropdown"
                >
                    <option value="">Select a room...</option>
                    {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                            {room.id}
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

export default Landing;
