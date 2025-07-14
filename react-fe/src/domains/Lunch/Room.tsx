import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import socketService from '../../services/socket.service';
import './Room.scss';

interface Suggestion {
    id: string;
    place: string;
    suggestedBy: string;
    votes: string[]; // array of user names who voted
}

interface RoomState {
    users: string[];
    suggestions: Suggestion[];
    isActive: boolean;
    startTime?: number;
}

const Room: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [timeLeft, setTimeLeft] = useState<number>(1200); // 20 minutes in seconds
    const [roomState, setRoomState] = useState<RoomState>({ users: [], suggestions: [], isActive: true });
    const [newSuggestion, setNewSuggestion] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const [winner, setWinner] = useState<string>('');
    const userName = localStorage.getItem('name') || '';
    const socket = socketService.getSocket();

    useEffect(() => {
        // Join room when component mounts
        if (roomId && userName) {
            socket.emit('joinRoom', { roomId, userName });
        }

        // Listen for room state updates
        socket.on('roomState', (state: RoomState) => {
            setRoomState(state);
        });

        // Listen for room completion
        socket.on('roomComplete', ({ winner }) => {
            setIsFinished(true);
            setWinner(winner?.place || 'No winner determined');
        });

        // Listen for time updates from server (every minute)
        socket.on('timeUpdate', (timeLeft: number) => {
            setTimeLeft(timeLeft);
        });

        return () => {
            socket.off('roomState');
            socket.off('roomComplete');
            socket.off('timeUpdate');
        };
    }, [roomId, userName]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        return `${mins <= 1 ? '<' : ''} ${mins} minute${mins <= 1 ? '' : 's'}`;
    };

    const handleSuggest = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSuggestion.trim() && roomId) {
            socket.emit('addSuggestion', {
                roomId,
                suggestion: {
                    id: Date.now().toString(),
                    place: newSuggestion.trim(),
                    suggestedBy: userName,
                }
            });
            setNewSuggestion('');
        }
    };

    const handleVote = (suggestionId: string) => {
        if (roomId) {
            socket.emit('vote', {
                roomId,
                suggestionId,
                userName
            });
        }
    };

    return (
        <div className="page-container">
            <div className="room-container">
                <h1>Lunch Room: {roomId}</h1>
                
            {!isFinished ? (
                <>
                    <div className="timer">Time Left: {formatTime(timeLeft)}</div>

                    {roomState.suggestions.length === 0 && userName && (
                        <div className="first-user-prompt">
                            You're the first one here! Please suggest a lunch spot.
                        </div>
                    )}

                    <form onSubmit={handleSuggest} className="suggestion-form">
                        <input
                            type="text"
                            value={newSuggestion}
                            onChange={(e) => setNewSuggestion(e.target.value)}
                            placeholder="Suggest a lunch spot..."
                            className="suggestion-input"
                        />
                        <button type="submit" className="suggest-button">
                            Suggest
                        </button>
                    </form>

                    <div className="suggestions-list">
                        <h2>Suggestions</h2>
                        {roomState.suggestions.map((suggestion) => (
                            <div key={suggestion.id} className="suggestion-item">
                                <div className="suggestion-details">
                                    <span className="place">{suggestion.place}</span>
                                    
                                    <span className="suggested-by"><span>by</span><br/>{suggestion.suggestedBy}</span>
                                    <span className="votes"><span>Votes:</span><br/>{suggestion.votes.length}</span>
                                </div>
                                <button
                                    onClick={() => handleVote(suggestion.id)}
                                    className={`vote-button ${suggestion.votes.includes(userName) ? 'voted' : ''}`}
                                >
                                    {suggestion.votes.includes(userName) ? '✓ Voted' : 'Vote'}
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="winner-announcement">
                    <h2>Time's Up!</h2>
                    <p>Today's lunch spot is:</p>
                    <div className="winner">{winner}</div>
                </div>
            )}
            </div>
        </div>
    );
};

export default Room; 