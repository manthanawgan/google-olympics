"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [globalStatus, setGlobalStatus] = useState("idle");
    const [timeLimit, setTimeLimit] = useState(10);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoggingIn(true);

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                setIsLoggedIn(true);
            } else {
                if (res.status === 500) {
                    setError("Server configuration error (.env missing)");
                } else {
                    setError("Invalid credentials");
                }
            }
        } catch (err) {
            setError("Login request failed");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const [participants, setParticipants] = useState<{ id: string, name: string, status: string, submission?: string, score?: number }[]>([]);
    const [leaderboardPublished, setLeaderboardPublished] = useState(false);
    const [targetImage, setTargetImage] = useState<string | null>(null);
    const [inputScores, setInputScores] = useState<Record<string, string>>({});

    const fetchState = async () => {
        try {
            const res = await fetch("/api/state?admin=true");
            const data = await res.json();
            setGlobalStatus(data.status);
            setStartTime(data.startTime);
            setParticipants(data.participants || []);
            setLeaderboardPublished(data.leaderboardPublished || false);
            setTargetImage(data.targetImage || null);
            if (data.status === "idle" || data.status === "stopped") {
                setTimeLimit(data.timeLimitMinutes);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const rows = text.split("\n").map(r => r.trim()).filter(r => r.length > 0);

            const parsedLeaderboard = rows.slice(1).map(row => {
                const parts = row.split(",");
                return {
                    teamName: parts[0] || "Unknown",
                    score: parseInt(parts[1] || "0", 10) || 0
                };
            }).sort((a, b) => b.score - a.score);

            await updateGlobalState({ leaderboard: parsedLeaderboard });
            alert("Leaderboard uploaded and sorted by score!");
        };
        reader.readAsText(file);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            await updateGlobalState({ targetImage: dataUrl });
            alert("Target image uploaded successfully!");
        };
        reader.readAsDataURL(file);
    };

    const handlePublishLeaderboard = () => {
        updateGlobalState({ leaderboardPublished: !leaderboardPublished });
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchState();
            const interval = setInterval(fetchState, 2000);
            return () => clearInterval(interval);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const updateGlobalState = async (updates: any) => {
        await fetch("/api/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        });
        fetchState();
    };

    const handleStart = () => {
        updateGlobalState({
            status: "active",
            startTime: Date.now(),
            timeLimitMinutes: timeLimit,
        });
    };

    const handleStop = () => {
        updateGlobalState({ status: "stopped" });
    };

    const handleReset = () => {
        updateGlobalState({ status: "idle", startTime: null, resetTokens: true });
    };

    const handleApprove = (id: string) => {
        updateGlobalState({ approveParticipantId: id });
    };

    const handleScoreSubmission = async (participantId: string) => {
        const scoreVal = parseInt(inputScores[participantId]);
        if (isNaN(scoreVal)) return;

        await updateGlobalState({
            scoreSubmission: { participantId, score: scoreVal }
        });
        alert("Score published to leaderboard!");
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
                <form onSubmit={handleLogin} className="bg-white p-8 border-2 border-black rounded-xl shadow-[8px_8px_0px_#FFA500] w-96 flex flex-col gap-4">
                    <h2 className="text-2xl font-bold text-center mb-4">Admin Login</h2>
                    {error && <p className="text-red-500 font-bold text-sm text-center">{error}</p>}
                    <div>
                        <label className="font-bold text-sm block mb-1">Username</label>
                        <Input value={username} onChange={e => setUsername(e.target.value)} className="border-2 border-black" />
                    </div>
                    <div>
                        <label className="font-bold text-sm block mb-1">Password</label>
                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="border-2 border-black" />
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoggingIn}
                        className="bg-[#4285F4] text-white hover:bg-blue-600 font-bold border-2 border-black shadow-[4px_4px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_black] transition-all disabled:opacity-50"
                    >
                        {isLoggingIn ? "Authenticating..." : "Login"}
                    </Button>
                </form>
            </div>
        );
    }

    //timer logic for admin dashboard
    let timeDisplay = "";
    if (globalStatus === "active" && startTime) {
        const elapsedMs = currentTime - startTime;
        const limitMs = timeLimit * 60 * 1000;

        if (elapsedMs > limitMs) {
            const exceededMs = elapsedMs - limitMs;
            const extendedSecs = Math.floor(exceededMs / 1000);
            const m = Math.floor(extendedSecs / 60);
            const s = extendedSecs % 60;
            timeDisplay = `Time Exceeded by: ${m}m ${s < 10 ? '0' : ''}${s}s`;
        } else {
            const remainMs = limitMs - elapsedMs;
            const remainSecs = Math.floor(remainMs / 1000);
            const m = Math.floor(remainSecs / 60);
            const s = remainSecs % 60;
            timeDisplay = `Time Remaining: ${m}m ${s < 10 ? '0' : ''}${s}s`;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl bg-white border-2 border-black rounded-2xl p-8 shadow-[8px_8px_0px_#34A853]">
                <h1 className="text-3xl font-extrabold mb-8 text-center border-b-2 border-black pb-4">Admin Dashboard</h1>

                <div className="flex flex-col md:flex-row gap-8 mb-8 justify-center">
                    <div className="flex-1 border-2 border-black rounded-xl p-6 bg-gray-50">
                        <h3 className="font-bold text-sm text-gray-500 mb-1">Round Status</h3>
                        <div className={`text-3xl font-bold capitalize ${globalStatus === "active" ? "text-green-600" : globalStatus === "stopped" ? "text-red-600" : "text-gray-800"}`}>
                            {globalStatus}
                        </div>
                        {timeDisplay && (
                            <div className={`mt-3 text-lg font-bold ${timeDisplay.includes("Exceeded") ? "text-red-500 animate-pulse" : "text-blue-600"}`}>
                                {timeDisplay}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 border-2 border-black rounded-xl p-6 bg-gray-50 flex flex-col justify-center">
                        <h3 className="font-bold text-sm mb-2">Round Time Limit (Mins)</h3>
                        <Input
                            type="number"
                            value={timeLimit}
                            onChange={e => setTimeLimit(Number(e.target.value))}
                            disabled={globalStatus === "active"}
                            className="border-2 border-black font-bold text-xl h-12"
                            min={0.1}
                            step={0.1}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 justify-center mt-4">
                    <div className="flex flex-row gap-4 w-full">
                        <Button
                            onClick={handleStart}
                            disabled={globalStatus === "active"}
                            className={`flex-1 text-xl font-bold h-16 border-2 border-black transition-all ${globalStatus === "active" ? "bg-gray-300 text-gray-500" : "bg-[#34A853] hover:bg-green-600 text-white shadow-[4px_4px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_black]"}`}
                        >
                            Start Round
                        </Button>
                        <Button
                            onClick={handleStop}
                            disabled={globalStatus !== "active"}
                            className={`flex-1 text-xl font-bold h-16 border-2 border-black transition-all ${globalStatus !== "active" ? "bg-gray-300 text-gray-500" : "bg-[#EA4335] hover:bg-red-600 text-white shadow-[4px_4px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_black]"}`}
                        >
                            Stop Round
                        </Button>
                    </div>
                    <Button
                        onClick={handleReset}
                        variant="outline"
                        className="w-full text-lg font-bold h-14 border-2 border-black shadow-[4px_4px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_black] transition-all bg-white hover:bg-gray-100 mt-2"
                    >
                        Reset State Globally
                    </Button>
                </div>
            </div>

            <div className="w-full max-w-2xl bg-white border-2 border-black rounded-2xl p-8 shadow-[8px_8px_0px_#4285F4] mt-8">
                <h2 className="text-2xl font-extrabold mb-6 border-b-2 border-black pb-2">Participant Access Control</h2>
                {participants.length === 0 ? (
                    <p className="text-gray-500 font-medium text-center py-4">No participants registered yet.</p>
                ) : (
                    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                        {participants.map((p) => (
                            <div key={p.id} className="flex flex-row items-center justify-between p-4 border-2 border-black rounded-xl bg-gray-50">
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg">{p.name}</span>
                                    <span className={`text-sm font-semibold ${p.status === "approved" ? "text-green-600" : "text-amber-600"}`}>
                                        Status: {p.status.toUpperCase()}
                                    </span>
                                </div>
                                {p.status === "pending" && (
                                    <Button
                                        onClick={() => handleApprove(p.id)}
                                        className="bg-[#F9AB00] hover:bg-amber-500 text-black border-2 border-black shadow-[2px_2px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[1px_1px_0px_black] font-bold"
                                    >
                                        Approve Access
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-full max-w-2xl bg-white border-2 border-black rounded-2xl p-8 shadow-[8px_8px_0px_#F9AB00] mt-8 mb-16">
                <h2 className="text-2xl font-extrabold mb-4 border-b-2 border-black pb-2">Leaderboard Management</h2>
                <div className="flex flex-col gap-6">
                    <div className="border-2 border-black rounded-xl p-6 bg-gray-50">
                        <label className="font-bold text-sm block mb-2">Upload Leaderboard Data (CSV format: TeamName,Score)</label>
                        <Input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="bg-white border-2 border-black cursor-pointer"
                        />
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 p-6 border-2 border-black rounded-xl">
                        <div className="flex flex-col">
                            <span className="font-bold text-lg">Publish to Participants view?</span>
                            <span className={`text-sm font-semibold ${leaderboardPublished ? 'text-green-600' : 'text-red-500'}`}>
                                Current State: {leaderboardPublished ? "PUBLISHED" : "HIDDEN"}
                            </span>
                        </div>
                        <Button
                            onClick={handlePublishLeaderboard}
                            className={`font-bold border-2 border-black shadow-[4px_4px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_black] transition-all text-black ${leaderboardPublished ? 'bg-red-400 hover:bg-red-500' : 'bg-green-400 hover:bg-green-500'}`}
                        >
                            {leaderboardPublished ? "Unpublish Leaderboard" : "Publish Leaderboard"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-2xl bg-white border-2 border-black rounded-2xl p-8 shadow-[8px_8px_0px_#EA4335] mb-16">
                <h2 className="text-2xl font-extrabold mb-4 border-b-2 border-black pb-2">Target Image Control</h2>
                <div className="flex flex-col gap-6">
                    <div className="border-2 border-black rounded-xl p-6 bg-gray-50 flex flex-col gap-4">
                        <label className="font-bold text-sm block">Upload Image Context for Participants</label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="bg-white border-2 border-black cursor-pointer"
                        />
                        {targetImage && (
                            <div className="mt-4 flex flex-col items-center">
                                <span className="font-bold text-sm mb-2 text-green-600">Current Assigned Image:</span>
                                <img src={targetImage} alt="target snapshot" className="max-w-xs border-2 border-black rounded-lg shadow-sm" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {participants.some(p => p.submission) && (
                <div className="w-full max-w-7xl bg-white border-2 border-black rounded-2xl p-8 shadow-[8px_8px_0px_#34A853] mb-16">
                    <h2 className="text-3xl font-extrabold mb-8 border-b-2 border-black pb-4 text-center">Participant Submissions Gallery & Scoring</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {participants.filter(p => p.submission).map(p => (
                            <div key={p.id} className="border-2 border-black rounded-xl p-4 bg-gray-50 flex flex-col gap-4 shadow-[4px_4px_0px_black] transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_black]">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-xl truncate">{p.name}</span>
                                    {p.score !== undefined && p.score !== null && (
                                        <span className="bg-green-100 text-green-700 font-extrabold px-3 py-1 rounded-md text-sm border-2 border-green-300">
                                            Score: {p.score}
                                        </span>
                                    )}
                                </div>
                                <div className="w-full h-48 bg-white border-2 border-black rounded-lg overflow-hidden flex justify-center items-center">
                                    <img src={p.submission!} alt={`${p.name} submission`} className="max-w-full max-h-full object-contain p-1" />
                                </div>
                                <div className="flex gap-3 mt-auto pt-4 border-t-2 border-dashed border-gray-300">
                                    <Input
                                        type="number"
                                        placeholder="Pts"
                                        value={inputScores[p.id] || ""}
                                        onChange={(e) => setInputScores({ ...inputScores, [p.id]: e.target.value })}
                                        className="w-20 border-2 border-black font-bold h-12 text-center"
                                    />
                                    <Button
                                        onClick={() => handleScoreSubmission(p.id)}
                                        className={`flex-1 font-bold border-2 border-black shadow-[3px_3px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[1px_1px_0px_black] transition-all h-12 text-black ${p.score !== undefined && p.score !== null ? 'bg-[#34A853] hover:bg-green-500 text-white' : 'bg-[#F9AB00] hover:bg-amber-400'}`}
                                    >
                                        {p.score !== undefined && p.score !== null ? "Update Score" : "Submit Score"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
