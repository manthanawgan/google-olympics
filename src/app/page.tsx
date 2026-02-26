"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type GlobalStatus = "idle" | "active" | "stopped";

export default function Home() {
  const [hasRegistered, setHasRegistered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [userId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [participantStatus, setParticipantStatus] = useState<"none" | "pending" | "approved">("none");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [globalStatus, setGlobalStatus] = useState<GlobalStatus>("idle");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ teamName: string, score: number }[]>([]);
  const [leaderboardPublished, setLeaderboardPublished] = useState(false);
  const [targetImage, setTargetImage] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    //polling api to get global admin states :>
    const fetchState = async () => {
      try {
        const res = await fetch("/api/state");
        const data = await res.json();
        setGlobalStatus(data.status);
        setStartTime(data.startTime);
        setTimeLimitMinutes(data.timeLimitMinutes);
        setLeaderboard(data.leaderboard || []);
        setLeaderboardPublished(data.leaderboardPublished || false);
        setTargetImage(data.targetImage || null);

        if (hasRegistered) {
          const me = data.participants?.find((p: any) => p.id === userId);
          if (me) {
            setParticipantStatus(me.status);
            setHasSubmitted(me.hasSubmitted);
          }
        }

      } catch (e) {
        console.error("Failed to fetch state:", e);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [hasRegistered, userId]);

  useEffect(() => {
    //fas timer calculation interval
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsModalOpen(false);
      setHasRegistered(true);
      setParticipantStatus("pending");

      //regsitering on on the global state
      try {
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participant: {
              id: userId,
              name: name.trim(),
              status: "pending"
            }
          })
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmissionFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSubmissionFile(e.target.files[0]);
    }
  };

  const handleSendSubmission = () => {
    if (!submissionFile || isSubmitting) return;
    setIsSubmitting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      try {
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submitImage: {
              participantId: userId,
              image: dataUrl
            }
          })
        });
        setHasSubmitted(true);
      } catch (e) {
        console.error("Submission failed", e);
      } finally {
        setIsSubmitting(false);
      }
    };
    reader.readAsDataURL(submissionFile);
  };

  let timeDisplay = "";
  let isExceeded = false;
  if (globalStatus === "active" && startTime) {
    const elapsedMs = currentTime - startTime;
    const limitMs = timeLimitMinutes * 60 * 1000;

    if (elapsedMs > limitMs) {
      isExceeded = true;
      const exceededMs = elapsedMs - limitMs;
      const extendedSecs = Math.floor(exceededMs / 1000);
      const m = Math.floor(extendedSecs / 60);
      const s = extendedSecs % 60;
      timeDisplay = `Time Limit Exceeded by ${m}m ${s < 10 ? '0' : ''}${s}s`;
    } else {
      const remainMs = limitMs - elapsedMs;
      const remainSecs = Math.floor(remainMs / 1000);
      const m = Math.floor(remainSecs / 60);
      const s = remainSecs % 60;
      timeDisplay = `Remaining Time: ${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
  }

  //deduce current Participant View
  let view = "register";
  if (hasRegistered) {
    if (globalStatus === "idle") {
      view = "waiting";
    } else if (globalStatus === "active") {
      if (participantStatus === "approved") {
        view = "active";
      } else {
        view = "awaiting_approval";
      }
    } else if (globalStatus === "stopped") {
      view = "stopped";
    }
  } else {
    //if round hasn't started natively but they're on landing: keep them on register view.
    //or if the round IS active and they haven't registered, they see 'Register Now'
    view = "register";
  }

  return (
    <main className="min-h-screen relative flex flex-col items-center pt-8 pb-16 px-4">
      {/* Background Kites/Elements */}
      <div className="absolute top-[30%] left-[10%] hidden md:block">
        <Image src="/Kite_Element_1.svg" width={50} height={50} alt="kite" className="opacity-70" />
      </div>
      <div className="absolute top-[40%] right-[10%] hidden md:block w-[70px]">
        <Image src="/Kite_Element_2.svg" width={70} height={70} alt="kite 2" className="opacity-70" />
      </div>

      {/* Navbar */}
      <nav className="flex items-center justify-between bg-white border-2 border-black rounded-full mb-12 px-4 py-2 shadow-[4px_4px_0px_black] w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2 px-2">
          <Image src="/GDG Logo.svg" width={24} height={24} alt="GDGC Logo" />
          <span className="font-bold whitespace-nowrap hidden sm:inline-block">GDG Vit Bhopal</span>
        </div>
        <div className="flex items-center text-sm font-medium">
          <Button
            onClick={() => setIsLeaderboardOpen(true)}
            className="font-bold border-2 border-black shadow-[2px_2px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[1px_1px_0px_black] transition-all bg-[#FFF3C4] text-black hover:bg-[#FFE066] rounded-full px-6 py-2 h-auto"
          >
            Leaderboard
          </Button>
        </div>
      </nav>

      {/* Hero Content text */}
      <div className="flex flex-col items-center text-center mt-4">
        <div className="mb-4">
          <Image src="/GDG Logo.svg" width={80} height={30} alt="GDG Logo Large" className="mx-auto" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3">
          <span className="text-[#F9AB00]">Google Developer Group</span>
          <br />
          <span className="text-[#F9AB00]">On Campus</span>
        </h1>
        <p className="text-sm md:text-base font-semibold tracking-wide mt-2">
          Vit Bhopal
        </p>

        {/* Dynamic Content Based on API State */}
        <div className="group relative mt-16 w-full max-w-2xl min-h-[350px] flex items-center justify-center p-8 bg-white border-[1px] border-black rounded-[2rem]">
          {/* The outer very thin decorative line seen in the ref image around the box */}
          <div className="absolute inset-[-12px] border-[0.5px] border-black rounded-[2.5rem] opacity-30 pointer-events-none" />

          {view === "register" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="relative bg-[#FFF3C4] border-2 border-black rounded-xl py-4 px-12 text-2xl font-bold transition-transform hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_#FFA500] shadow-[6px_6px_0px_#FFA500] flex items-center gap-2"
            >
              Register Now <span className="text-3xl ml-2">→</span>
            </button>
          )}

          {view === "waiting" && (
            <div className="text-center animate-pulse flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-t-[#F9AB00] border-r-[#EA4335] border-b-[#4285F4] border-l-[#34A853] rounded-full animate-spin"></div>
              <h2 className="text-2xl font-bold">Welcome, {name}!</h2>
              <p className="text-lg text-gray-600 font-medium">Waiting for admin to start the round...</p>
            </div>
          )}

          {view === "awaiting_approval" && (
            <div className="text-center animate-pulse flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-t-[#EA4335] border-r-transparent border-b-[#EA4335] border-l-transparent rounded-full animate-spin"></div>
              <h2 className="text-2xl font-bold text-red-600">You're Late!</h2>
              <p className="text-lg text-gray-600 font-medium">The round has already started. The admin will let you in shortly...</p>
            </div>
          )}

          {view === "active" && (
            <div className="w-full flex flex-col gap-6">
              <div className={`p-3 text-center rounded-xl border-2 border-black font-bold text-lg shadow-[4px_4px_0px_black] ${isExceeded ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                {timeDisplay}
              </div>
              <div className="w-full flex flex-col gap-6">

                {targetImage && (
                  <div className="w-full border-2 border-black rounded-xl p-4 bg-gray-50 flex flex-col items-center">
                    <h3 className="font-bold mb-3 text-center text-2xl text-[#34A853]">Target Reference</h3>
                    <div
                      className="w-full relative flex justify-center bg-white border-2 border-black rounded-xl overflow-hidden p-2 select-none"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      {/* Invisible overlay to completely block CSS/right-click inspect tracing to the image layer directly */}
                      <div className="absolute inset-0 z-10 bg-transparent"></div>

                      <img
                        src={targetImage}
                        alt="target reference"
                        className="w-full max-h-[500px] object-contain select-none pointer-events-none"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}

                <div className="w-full flex flex-col md:flex-row gap-6 items-stretch justify-between">
                  {/* Left smaller column: Upload */}
                  <div className="w-full md:w-2/3 flex flex-col">
                    <div className="border-2 border-black rounded-xl p-6 bg-gray-50 flex-1 flex flex-col justify-center">
                      <h3 className="font-bold mb-4 text-center text-lg">Upload Submission</h3>
                      {hasSubmitted ? (
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-[#34A853] bg-green-50 rounded-xl">
                          <span className="font-extrabold text-green-700 text-xl mb-1">Received!</span>
                          <span className="text-sm font-semibold text-green-600 text-center">Your submission has been securely sent to the judge.</span>
                        </div>
                      ) : (
                        <>
                          <Input onChange={handleSubmissionFile} type="file" accept="image/*" className="mb-4 border-2 border-black bg-white cursor-pointer" />
                          <div className="mt-auto">
                            <Button
                              onClick={handleSendSubmission}
                              disabled={!submissionFile || isSubmitting}
                              className="w-full bg-[#EA4335] text-white hover:bg-[#D33626] font-bold text-lg border-2 border-black shadow-[4px_4px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_black] transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:hover:shadow-[4px_4px_0px_black]"
                            >
                              {isSubmitting ? "Uploading..." : "Send Submission"}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right smaller column: Leaderboard Button */}
                  <div className="w-full md:w-1/3 flex flex-col">
                    <div className="h-full flex flex-col items-center justify-center border-2 border-black border-dashed rounded-xl p-6 bg-[#F8F9FA]">
                      <div className="bg-[#4285F4] rounded-full w-12 h-12 flex items-center justify-center mb-4 border-2 border-black">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2.09c.65 0 1.25.33 1.62.87l1.08 1.62c.38.54.97.87 1.62.87h4.22c.65 0 1.25-.33 1.62-.87l1.08-1.62c.38-.54.97-.87 1.62-.87H21M3 17h18m-9-9V3m0 0L8.5 6.5M12 3l3.5 3.5" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-md mb-4 text-center">See where you stand</h3>
                      <Button onClick={() => setIsLeaderboardOpen(true)} variant="outline" className="border-2 border-black font-bold shadow-[4px_4px_0px_black] hover:shadow-[2px_2px_0px_black] hover:translate-y-px hover:translate-x-px w-full">
                        View Leaderboard
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {view === "stopped" && (
            <div className="text-center flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border-2 border-red-200 w-full h-full">
              <div className="bg-red-500 rounded-full w-16 h-16 flex items-center justify-center mb-4 border-2 border-black">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-red-600 mb-2">Round Stopped</h2>
              <p className="text-lg text-gray-700 mb-6 font-medium">Submissions are now closed.</p>
              <Button onClick={() => setIsLeaderboardOpen(true)} variant="outline" className="border-2 border-black font-bold shadow-[4px_4px_0px_black] hover:shadow-[2px_2px_0px_black] hover:translate-y-px hover:translate-x-px bg-white">
                View Final Leaderboard
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border-2 border-black shadow-[8px_8px_0px_#FFA500] rounded-2xl sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center mb-2">Join Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartSubmit} className="flex flex-col gap-6 mt-2">
            <div>
              <label className="text-sm font-bold mb-2 block">Participant Name</label>
              <Input
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-2 border-black rounded-lg h-14 text-xl font-semibold bg-gray-50 focus-visible:ring-offset-0 focus-visible:ring-[#F9AB00]"
                autoFocus
                required
              />
            </div>
            <DialogFooter className="sm:justify-center">
              <Button type="submit" className="w-full bg-[#FFF3C4] text-black border-2 border-black hover:bg-[#FFE066] text-xl h-14 font-bold transition-all shadow-[4px_4px_0px_#FFA500] hover:translate-y-px hover:translate-x-px hover:shadow-[3px_3px_0px_#FFA500]">
                Register
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
        <DialogContent className="border-2 border-black shadow-[8px_8px_0px_#4285F4] rounded-2xl sm:max-w-lg bg-white max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center mb-2">Leaderboard</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 mt-4 flex flex-col gap-3">
            {!leaderboardPublished ? (
              <div className="text-center p-8 bg-gray-50 border-2 border-black rounded-xl">
                <p className="font-bold text-lg text-gray-500">The leaderboard hasn't been published yet.</p>
                <p className="font-medium text-gray-400 mt-2">Check back later!</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 border-2 border-black rounded-xl">
                <p className="font-bold text-lg text-gray-500">Leaderboard is currently empty.</p>
              </div>
            ) : (
              leaderboard.map((entry, idx) => (
                <div key={idx} className={`flex items-center justify-between p-4 border-2 border-black rounded-xl ${idx === 0 ? 'bg-[#FFF3C4]' : idx === 1 ? 'bg-gray-100' : idx === 2 ? 'bg-[#FBEBB5]' : 'bg-white'}`}>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-xl min-w-[30px]">#{idx + 1}</span>
                    <span className="font-bold text-lg">{entry.teamName}</span>
                  </div>
                  <span className="font-extrabold text-xl">{entry.score} pts</span>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="sm:justify-center mt-4">
            <Button onClick={() => setIsLeaderboardOpen(false)} variant="outline" className="w-full text-black border-2 border-black text-lg h-12 font-bold transition-all shadow-[4px_4px_0px_black] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_black]">
              Close window
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
