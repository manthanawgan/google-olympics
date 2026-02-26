import { NextResponse } from 'next/server';

type Participant = {
    id: string; //unique identifier
    name: string;
    status: "approved" | "pending"; //if approved, they can participate
    submission?: string | null;
    score?: number | null;
};

type LeaderboardEntry = {
    teamName: string;
    score: number;
};

//Ensure this doesn't get cleared during hot reloads in dev
const globalForState = global as unknown as {
    gameState: {
        status: "idle" | "active" | "stopped";
        startTime: number | null;
        timeLimitMinutes: number;
        participants: Participant[];
        leaderboard: LeaderboardEntry[];
        leaderboardPublished: boolean;
        targetImage: string | null;
    } | undefined;
};

const defaultState = {
    status: "idle" as const,
    startTime: null,
    timeLimitMinutes: 10,
    participants: [],
    leaderboard: [],
    leaderboardPublished: false,
    targetImage: null,
};

let gameState = globalForState.gameState || defaultState;
if (process.env.NODE_ENV !== "production") globalForState.gameState = gameState;

export async function GET(req: Request) {
    const url = new URL(req.url);
    const isAdmin = url.searchParams.get('admin') === 'true';

    if (!isAdmin) {
        // Strip heavy image payloads for normal participant polling
        const safeState = {
            ...gameState,
            participants: gameState.participants.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                hasSubmitted: !!p.submission,
                score: p.score
            }))
        };
        return NextResponse.json(safeState);
    }

    return NextResponse.json(gameState);
}

export async function POST(req: Request) {
    const body = await req.json();
    const { status, timeLimitMinutes, startTime, participant, approveParticipantId, resetTokens, targetImage } = body;

    if (status !== undefined) gameState.status = status;
    if (timeLimitMinutes !== undefined) gameState.timeLimitMinutes = timeLimitMinutes;
    if (startTime !== undefined) gameState.startTime = startTime;
    if (body.leaderboard !== undefined) gameState.leaderboard = body.leaderboard;
    if (body.leaderboardPublished !== undefined) gameState.leaderboardPublished = body.leaderboardPublished;
    if (targetImage !== undefined) gameState.targetImage = targetImage;

    if (participant) {
        if (!gameState.participants.find(p => p.id === participant.id)) {
            participant.status = gameState.status === "idle" ? "approved" : "pending";
            gameState.participants.push(participant);
        }
    }

    //Admin approves a participant (chnge)
    if (approveParticipantId) {
        const p = gameState.participants.find(p => p.id === approveParticipantId);
        if (p) {
            p.status = "approved";
        }
    }

    if (body.submitImage) {
        const p = gameState.participants.find(p => p.id === body.submitImage.participantId);
        if (p) {
            p.submission = body.submitImage.image;
        }
    }

    if (body.scoreSubmission) {
        const p = gameState.participants.find(p => p.id === body.scoreSubmission.participantId);
        if (p) {
            p.score = body.scoreSubmission.score;
            let lbEntry = gameState.leaderboard.find(l => l.teamName === p.name);
            if (lbEntry) {
                lbEntry.score = body.scoreSubmission.score;
            } else {
                gameState.leaderboard.push({ teamName: p.name, score: body.scoreSubmission.score });
            }
            gameState.leaderboard.sort((a, b) => b.score - a.score);
        }
    }

    if (resetTokens) {
        gameState.participants = [];
        gameState.leaderboard = [];
        gameState.leaderboardPublished = false;
        gameState.targetImage = null;
    }

    // Always strip heavy payloads for normal responses
    const safeState = {
        ...gameState,
        participants: gameState.participants.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            hasSubmitted: !!p.submission,
            score: p.score
        }))
    };
    return NextResponse.json(safeState);
}
