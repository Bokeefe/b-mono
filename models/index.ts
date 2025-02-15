export interface Room {
    id: string;
    users: string[];
    suggestions: Suggestion[];
    startTime: number;
    isActive: boolean;
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