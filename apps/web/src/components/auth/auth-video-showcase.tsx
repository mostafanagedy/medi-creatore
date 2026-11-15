"use client";

import { useEffect, useState } from "react";

const demoClips: [{ src: string; title: string }, ...{ src: string; title: string }[]] = [
  {
    src: "/videos/flower-demo.mp4",
    title: "Nature in motion · CC0",
  },
  {
    src: "/videos/sintel-trailer.mp4",
    title: "Sintel · Blender Foundation (CC BY 3.0)",
  },
];

const clipDurationSeconds = 8;

export function AuthVideoShowcase() {
  const [activeClip, setActiveClip] = useState(0);
  const [progress, setProgress] = useState(0);
  const [failedClips, setFailedClips] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const currentClip = demoClips[activeClip] ?? demoClips[0];

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const updatePlaybackPreference = () =>
      setShouldPlay(motionQuery.matches && desktopQuery.matches);

    updatePlaybackPreference();
    motionQuery.addEventListener("change", updatePlaybackPreference);
    desktopQuery.addEventListener("change", updatePlaybackPreference);
    return () => {
      motionQuery.removeEventListener("change", updatePlaybackPreference);
      desktopQuery.removeEventListener("change", updatePlaybackPreference);
    };
  }, []);

  const advanceClip = () => {
    setProgress(0);
    setActiveClip((current) => (current + 1) % demoClips.length);
  };

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-[#080812]"
    >
      {shouldPlay && !showFallback && (
        <video
          key={currentClip.src}
          src={currentClip.src}
          autoPlay
          muted
          playsInline
          preload="metadata"
          onTimeUpdate={(event) => {
            const currentTime = event.currentTarget.currentTime;
            setProgress(Math.min((currentTime / clipDurationSeconds) * 100, 100));
            if (currentTime >= clipDurationSeconds) advanceClip();
          }}
          onEnded={advanceClip}
          onError={() => {
            const nextFailedCount = failedClips + 1;
            setFailedClips(nextFailedCount);
            if (nextFailedCount >= demoClips.length) {
              setShowFallback(true);
            } else {
              advanceClip();
            }
          }}
          className="absolute inset-0 h-full w-full object-cover brightness-[0.4] transition-opacity duration-700"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-[#080812]/35 via-[#080812]/20 to-primary/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080812]/70 via-transparent to-[#080812]/25" />

      <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-4 text-white/80">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
            AI video showcase
          </p>
          <p className="mt-1 text-xs text-white/55">
            {currentClip.title} · demo footage; replace with generated clips
          </p>
        </div>
        {shouldPlay && !showFallback && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {demoClips.map((clip, index) => (
              <span
                key={clip.src}
                className={`h-1 rounded-full transition-all duration-300 ${
                  activeClip === index ? "w-8 bg-white" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {shouldPlay && !showFallback && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
