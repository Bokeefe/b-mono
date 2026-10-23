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
    winner?: Suggestion | null;
    completedAt?: number | null;
}

interface RoomCompletePayload {
    winner?: Suggestion | null;
    completedAt?: number | null;
}

// Landing collects the name, but people often open a room URL directly (shared
// link, phone notification). Fall back to a prompt, then to "Guest", so the
// socket can still join and receive the result.
let namePrompted = false;

const resolveUserName = (): string => {
    const stored = localStorage.getItem('name')?.trim();
    if (stored) {
        return stored;
    }

    if (!namePrompted) {
        namePrompted = true;
        const entered = window.prompt('What is your name?')?.trim();
        if (entered) {
            localStorage.setItem('name', entered);
            return entered;
        }
    }

    return 'Guest';
};

const formatDecisionTime = (timestamp: number): string =>
    new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const Room: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [timeLeft, setTimeLeft] = useState<number>(1200); // 20 minutes in seconds
    const [roomState, setRoomState] = useState<RoomState>({ users: [], suggestions: [], isActive: true });
    const [newSuggestion, setNewSuggestion] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const [winner, setWinner] = useState<string>('');
    const [completedAt, setCompletedAt] = useState<number | null>(null);
    const [userName] = useState<string>(resolveUserName);
    const socket = socketService.getSocket();

    useEffect(() => {
        if (!roomId) {
            return;
        }

        // joinRoom is idempotent: it (re)attaches this socket to the room and
        // replays the latest state — including the final result if voting is
        // already over.
        const joinRoom = () => socket.emit('joinRoom', { roomId, userName });

        const applyCompletion = ({ winner: winningSuggestion, completedAt: finishedAt }: RoomCompletePayload) => {
            setIsFinished(true);
            setWinner(winningSuggestion?.place || 'No winner determined');
            setCompletedAt(finishedAt ?? null);
        };

        const handleRoomState = (state: RoomState) => {
            setRoomState(state);

            // The winner is stored on the room, so a client that missed the
            // `roomComplete` broadcast (late arrival, phone asleep) still ends
            // up on the result as soon as any state arrives.
            if (state.isActive) {
                setIsFinished(false);
                setWinner('');
                setCompletedAt(null);
            } else {
                setIsFinished(true);
                setWinner(state.winner?.place || 'No winner determined');
                setCompletedAt(state.completedAt ?? null);
            }
        };

        // Join immediately (socket.io buffers this if the socket is still
        // connecting).
        joinRoom();

        // Mobile browsers suspend the socket when the tab is backgrounded and
        // reconnect with a new socket id, which loses the socket.io room
        // membership. Re-joining on (re)connect and on wake-up is what makes a
        // decision appear on a phone that was asleep when the timer ran out.
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            if (!socket.connected) {
                socket.connect();
            }
            joinRoom();
        };

        socket.on('connect', joinRoom);
        socket.on('roomState', handleRoomState);
        socket.on('roomComplete', applyCompletion);
        socket.on('timeUpdate', setTimeLeft);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            socket.off('connect', joinRoom);
            socket.off('roomState', handleRoomState);
            socket.off('roomComplete', applyCompletion);
            socket.off('timeUpdate', setTimeLeft);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [roomId, userName, socket]);

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
                    <h2>Voting Closed</h2>
                    <p>Today's lunch spot is:</p>
                    <div className="winner">{winner}</div>
                    {completedAt !== null && (
                        <p className="result-note">
                            Decided at {formatDecisionTime(completedAt)}. This result stays up for 4 hours,
                            so anyone opening this link later sees it.
                        </p>
                    )}
                </div>
            )}
            </div>
        </div>
    );
};

export default Room; 