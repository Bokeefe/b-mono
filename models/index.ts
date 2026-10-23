export interface Room {
    id: string;
    users: string[];
    suggestions: Suggestion[];
    startTime: number;
    isActive: boolean;
    /** Set when the timer expires; kept on the room so late visitors still see it. */
    winner: Suggestion | null;
    /** Timestamp (ms) the room was decided, or null while voting is open. */
    completedAt: number | null;
}

export interface Suggestion {
    id: string;
    place: string;
    suggestedBy: string;
    votes: string[];
}

export interface ActiveRoom {
    id: string;
    userCount: number;
    suggestions: number;
}