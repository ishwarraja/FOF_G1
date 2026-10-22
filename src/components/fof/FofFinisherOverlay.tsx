import React, { useEffect, useState } from 'react';
import { Zap, Sparkles, Swords, Flame, Crown, Skull } from 'lucide-react';

export interface FinisherVisualState {
  active: boolean;
  attackerName: string;
  defenderName: string;
  comboHits: number;
  damage: number;
  impactX: number;
  impactY: number;
  color: string;
  isP1Attacker: boolean;
  timestamp: number;
}

interface FofFinisherOverlayProps {
  finisherState: FinisherVisualState | null;
  arenaWidth: number;
}

export const FofFinisherOverlay: React.FC<FofFinisherOverlayProps> = ({
  finisherState,
  arenaWidth,
}) => {
  const [flashActive, setFlashActive] = useState(false);
  const [sparks, setSparks] = useState<{ id: string; x: number; y: number; size: number; angle: number; speed: number; color: string }[]>([]);

  useEffect(() => {
    if (finisherState && finisherState.active) {
      // Trigger instant high-contrast flash
      setFlashActive(true);
      const flashTimer = setTimeout(() => setFlashActive(false), 220);

      // Generate burst of golden celestial sparks radiating from impact
      const newSparks = Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
        return {
          id: `fspk_${Date.now()}_${i}`,
          x: (Math.random() - 0.5) * 60,
          y: (Math.random() - 0.5) * 60,
          size: Math.random() * 6 + 3,
          angle,
          speed: Math.random() * 120 + 80,
          color: ['#fbbf24', '#fef08a', '#ef4444', '#ffffff', '#f59e0b'][Math.floor(Math.random() * 5)],
        };
      });
      setSparks(newSparks);

      return () => {
        clearTimeout(flashTimer);
      };
    }
  }, [finisherState?.timestamp, finisherState?.active]);

  if (!finisherState || !finisherState.active) return null;

  const normalizedImpactX = Math.max(10, Math.min(90, (finisherState.impactX / arenaWidth) * 100));

  return (
    <div
      id="fof-specialized-finisher-overlay"
      className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none"
    >
      {/* 1. Monochromatic / Solar Golden Flash on Trigger */}
      {flashActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-300 via-white to-amber-400 opacity-80 mix-blend-screen transition-opacity duration-200 pointer-events-none z-50 animate-pulse" />
      )}

      {/* 2. Radial Action Speedlines Centered at the Finisher Impact Point */}
      <div
        className="absolute inset-0 opacity-70 pointer-events-none mix-blend-screen"
        style={{
          background: `radial-gradient(circle at ${normalizedImpactX}% 55%, transparent 12%, rgba(245, 158, 11, 0.2) 35%, rgba(0, 0, 0, 0.75) 85%)`,
        }}
      />

      {/* SVG Radial Speedlines radiating from impact coordinates */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-overlay animate-spin-slow"
        style={{
          transformOrigin: `${normalizedImpactX}% 55%`,
          animationDuration: '14s',
        }}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="finisherRayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i / 36) * 360;
          return (
            <line
              key={i}
              x1="500"
              y1="500"
              x2={500 + Math.cos((angle * Math.PI) / 180) * 800}
              y2={500 + Math.sin((angle * Math.PI) / 180) * 800}
              stroke="url(#finisherRayGrad)"
              strokeWidth={i % 3 === 0 ? '4' : '1.5'}
              strokeDasharray={i % 2 === 0 ? '8, 8' : 'none'}
            />
          );
        })}
      </svg>

      {/* 3. Concentric Expanding Golden Impact Ring at Collision Point */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${normalizedImpactX}%`,
          top: '55%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Shockwave Rings */}
        <div className="w-48 h-48 rounded-full border-4 border-amber-400/80 animate-ping" />
        <div className="absolute inset-0 w-64 h-64 -ml-8 -mt-8 rounded-full border-2 border-yellow-200/60 animate-hitstun-ring" />
        <div className="absolute inset-0 w-32 h-32 ml-8 mt-8 rounded-full bg-gradient-to-r from-amber-400/50 to-red-500/50 blur-xl animate-pulse" />

        {/* Dynamic Flying Ember Particles */}
        {sparks.map(spk => (
          <div
            key={spk.id}
            className="absolute w-2 h-2 rounded-full animate-ping"
            style={{
              transform: `translate(${Math.cos(spk.angle) * spk.speed}px, ${Math.sin(spk.angle) * spk.speed}px)`,
              backgroundColor: spk.color,
              boxShadow: `0 0 10px ${spk.color}`,
              transition: 'transform 0.6s cubic-bezier(0.1, 0.8, 0.2, 1)',
            }}
          />
        ))}
      </div>

      {/* 4. Cinematic Letterbox Bars (Top & Bottom Anamorphic Framing) */}
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 h-12 sm:h-14 bg-black/95 border-b-2 border-amber-400 flex items-center justify-between px-4 sm:px-8 shadow-2xl z-40">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
          <span className="text-[11px] sm:text-xs font-black tracking-widest text-amber-400 uppercase font-mono">
            ★ HIGH-LEVEL PLAY • 40+ HIT COMBO FINISHER ★
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono font-bold text-amber-200/90">
          <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span>GODSPEED EXECUTION</span>
          <span className="hidden sm:inline text-amber-500">•</span>
          <span className="hidden sm:inline text-white font-black">{finisherState.comboHits} HITS</span>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 inset-x-0 h-12 sm:h-14 bg-black/95 border-t-2 border-amber-400 flex items-center justify-between px-4 sm:px-8 shadow-2xl z-40">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-[11px] sm:text-xs font-mono font-bold text-gray-300">
            EXECUTING: <span className="text-amber-400 font-black uppercase">{finisherState.attackerName}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-gray-400">
          <span>COMBO DAMAGE:</span>
          <span className="text-rose-400 font-black text-sm sm:text-base tracking-wider">
            {finisherState.damage} PTS
          </span>
          <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-400/60 rounded text-amber-300 font-bold text-[9px] uppercase">
            MAX MULTIPLIER
          </span>
        </div>
      </div>

      {/* 5. Central High-Impact Finisher Title Banner */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none px-4">
        {/* Dramatic Glowing Backdrop Capsule */}
        <div className="relative flex flex-col items-center text-center p-4 sm:p-6 max-w-xl animate-scale-up">
          {/* Energy Halo Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/30 via-red-600/40 to-amber-600/30 blur-2xl rounded-3xl" />

          {/* Top Pill Tag */}
          <div className="relative inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-red-600 border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.8)] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-spin-slow" />
            <span className="text-xs sm:text-sm font-black italic tracking-widest text-white uppercase font-mono">
              ★ 40+ HIT APEX COMBO FINISHER ★
            </span>
            <Swords className="w-3.5 h-3.5 text-yellow-200" />
          </div>

          {/* Giant Title */}
          <h1
            className="relative text-3xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-red-500"
            style={{
              textShadow: '0 0 35px rgba(245, 158, 11, 0.9), 0 0 60px rgba(239, 68, 68, 0.6)',
              WebkitTextStroke: '1px rgba(0,0,0,0.8)',
            }}
          >
            ULTRA FINISHER
          </h1>

          {/* Massive Hit Counter Display */}
          <div className="relative flex items-center gap-3 mt-1">
            <span className="text-4xl sm:text-6xl md:text-7xl font-black italic font-mono text-white tracking-tight drop-shadow-[0_0_25px_#f59e0b]">
              {finisherState.comboHits}
            </span>
            <div className="flex flex-col text-left font-mono leading-none">
              <span className="text-xl sm:text-2xl font-black italic text-amber-400">HITS</span>
              <span className="text-[10px] sm:text-xs font-bold text-amber-200/80 tracking-widest">
                CRITICAL CHAIN
              </span>
            </div>
          </div>

          {/* Subtitle / Fighter Callout */}
          <p className="relative mt-2 text-xs sm:text-sm font-mono font-bold text-amber-100 tracking-wider bg-black/80 px-4 py-1 rounded-lg border border-amber-500/50 shadow-lg">
            {finisherState.attackerName} • MAXIMUM OVERDRIVE ANNIHILATION
          </p>
        </div>
      </div>
    </div>
  );
};
