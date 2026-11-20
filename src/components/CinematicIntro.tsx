import React, { useEffect, useState } from 'react';
import { ChevronRight, FastForward } from 'lucide-react';
import { spaceAudio } from '../game/audio';

interface CinematicIntroProps {
  captainName: string;
  onComplete: () => void;
}

const SLIDES = [
  {
    stardate: 'STARDATE 2389.014',
    title: 'The Unexplained Signal',
    body: 'Three weeks ago, deep-space listening arrays beyond the Kuiper perimeter intercepted an impossible harmonic pulse—repeating in prime-number intervals from an uncharted rift past NOVA-7.',
  },
  {
    stardate: 'STARDATE 2389.032',
    title: 'Vessel ODYSSEY-7 Commissioned',
    body: 'Humanity’s fastest long-range scout vessel, ODYSSEY-7, was outfitted with experimental Ion-Warp thrusters, Quantum Pulse scanners, and an adaptive subspace translator.',
  },
  {
    stardate: 'STARDATE 2389.041',
    title: 'Entering Sector Vexis',
    body: 'Six distinct worlds orbit an unstable magnetar remnant at the edge of known space. Alien civilizations stir beneath ocean trenches, volcanic calderas, and obsidian monoliths.',
  },
  {
    stardate: 'MISSION BRIEFING',
    title: 'Your Command Begins',
    body: 'Chart the sector, gather vital resources, forge alliances—or survive hostile Sentinel patrols—and uncover who sent the 2389 transmission.',
  },
];

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ captainName, onComplete }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => {
        if (prev >= SLIDES.length - 1) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const current = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between bg-[#030612]/90 p-8 md:p-16">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono-tabular tracking-[0.25em] text-sky-400">
          {current.stardate} · CAPTAIN {captainName.toUpperCase()}
        </span>
        <button
          onClick={() => {
            spaceAudio.playUiClick();
            onComplete();
          }}
          className="hud-panel-subtle px-3.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <span>Skip Intro</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto text-center space-y-5">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight text-balance">
          {current.title}
        </h2>
        <p className="text-base md:text-lg text-slate-300 leading-relaxed">
          {current.body}
        </p>

        {/* Step progress bars */}
        <div className="flex items-center justify-center gap-2 pt-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === index ? 'w-10 bg-sky-400' : i < index ? 'w-5 bg-sky-700' : 'w-5 bg-slate-700'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        {isLast ? (
          <button
            onClick={() => {
              spaceAudio.playWarpJump();
              onComplete();
            }}
            className="px-7 py-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-semibold tracking-wider text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>ASSUME BRIDGE COMMAND</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => {
              spaceAudio.playUiClick();
              setIndex((i) => Math.min(SLIDES.length - 1, i + 1));
            }}
            className="hud-panel px-5 py-2.5 rounded-lg text-xs font-medium text-sky-200 hover:border-sky-400/60 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next Transmission</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
