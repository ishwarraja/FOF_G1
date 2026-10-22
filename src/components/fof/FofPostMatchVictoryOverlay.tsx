import React, { useEffect, useState } from 'react';
import { FofFighterStats } from '../../types/fighting';
import { Crown, Sparkles, Trophy, Award, Zap, Flame, ShieldAlert, ArrowRight, Star, Film } from 'lucide-react';
import { getFighterPortrait } from '../../data/characterAvatars';

export interface PostMatchVictoryData {
  title: string;
  desc: string;
  quote: string;
  effectColor: string;
  elementIcon?: string;
}

export const CHARACTER_VICTORY_REGISTRY: Record<string, PostMatchVictoryData> = {
  arjun: {
    title: "STEELWORKER'S REBAR RESOLVE",
    desc: 'Slams his heavy industrial wrench into the arena floor, unleashing golden sparks, then raises a calloused iron fist into the floodlights.',
    quote: 'Solid as reinforced rebar. Our hands built this world, and our hands will defend it.',
    effectColor: '#f59e0b',
  },
  steele: {
    title: "ENFORCER'S IRON COMMAND",
    desc: 'Holsters sidearm with precision, straightens tactical commander coat, and folds arms in rigid authoritarian discipline under glowing cyan HUD scans.',
    quote: 'Mission parameters fulfilled. Order and authority restored through unyielding tactical force.',
    effectColor: '#38bdf8',
  },
  david: {
    title: "ENFORCER'S IRON COMMAND",
    desc: 'Holsters weapon with military cadence, adjusts tactical vest, and locks arms across chest as blue cyber scan sweeps the perimeter.',
    quote: 'Order is restored. Resistance to the protocol is futile.',
    effectColor: '#38bdf8',
  },
  valeria: {
    title: 'UNIT-0 APEX CALIBRATION',
    desc: 'Performs a swift dual-blade whirlwind flourish, docks energy blades into back magnets, and poses sideways with a playful cybernetic peace sign and optic glint.',
    quote: 'Threat neutralized. Combat efficiency 99.8%. Unit-Zero returning to active standby.',
    effectColor: '#ec4899',
  },
  victor: {
    title: "SOVEREIGN'S SHADOW ASCENT",
    desc: 'Swirls dark void flames around his boots, casually adjusts his gold monocle, and turns away with an imperious smirk.',
    quote: 'Kneel before the Sovereign. Your feeble resistance was merely an amusing diversion.',
    effectColor: '#a855f7',
  },
  elena: {
    title: 'ABSOLUTE ZERO EQUILIBRIUM',
    desc: 'Pirouettes gracefully amidst swirling sub-zero mist, manifests a crystalline ice lotus in her open palm, and blows it away into sparkling frost dust.',
    quote: 'All variables calculated to the fourth decimal. Your defeat was mathematically guaranteed.',
    effectColor: '#06b6d4',
  },
  maya: {
    title: 'NEON OVERDRIVE CELEBRATION',
    desc: 'Bounces rhythmically on the balls of her feet, executes a lightning 3-punch shadowbox combo, and strikes a dynamic low champion crouch with a beaming smile.',
    quote: "Too slow, too predictable! Next challenger, step up to the ring if you think you're ready!",
    effectColor: '#f43f5e',
  },
  leo: {
    title: 'APEX PREDATOR ROAR',
    desc: 'Unleashes a fierce primal battle cry shaking the canvas foundation, then raises dual clenched fists overhead in raw untamed glory.',
    quote: 'The wild will never be chained! True power flows from raw instinct, not cold machines!',
    effectColor: '#eab308',
  },
  kai: {
    title: 'PHANTOM SHADOW SEAL',
    desc: 'Vanishes in a billow of violet smoke, reappearing motionless with arms folded into a shinobi mystical mudra seal.',
    quote: 'You fought a shadow. The strike that felled you was already decided before you blinked.',
    effectColor: '#9333ea',
  },
  alexandra: {
    title: 'VERDICT OF SUPREME JUSTICE',
    desc: 'Brings down an ethereal judicial gavel of pure kinetic force, holding high the illuminated scales of justice with unwavering imperial majesty.',
    quote: 'The evidence has been presented. The verdict is delivered, and justice is executed.',
    effectColor: '#f59e0b',
  },
  amara: {
    title: 'VITAL HARMONY PULSE',
    desc: 'Channels soothing bio-luminescent lotus rings from her fingertips, steadying her breath in serene meditation.',
    quote: 'Combat exposes the spirit’s deepest fractures. Rest now; you fought with courage and honor.',
    effectColor: '#10b981',
  },
  kabir: {
    title: 'SACRED LOTUS EMBERS',
    desc: 'Bows in reverent martial Namaste as sacred Vedic flame rings ripple across the earth, then extends a glowing open palm with tranquil determination.',
    quote: 'The sacred fire burns away doubt and illusion. May your spirit rise stronger from this trial.',
    effectColor: '#f97316',
  },
  zara: {
    title: 'TEMPEST GALE SHEATHE',
    desc: 'Backflips through swirling wind vortexes, landing silently in a low-crouched kunai guard with cape billowing.',
    quote: 'The wind never bargains with the stone. It simply cuts through it.',
    effectColor: '#14b8a6',
  },
};

export function getVictoryData(charId: string = 'arjun'): PostMatchVictoryData {
  const lower = charId.toLowerCase();
  return (
    CHARACTER_VICTORY_REGISTRY[lower] || {
      title: "CHAMPION'S TRIUMPH",
      desc: 'Stands tall over the battleground with unwavering resolve, basking in the stadium lights as the arena crowns its champion.',
      quote: 'Victory belongs to those with unyielding will and relentless determination!',
      effectColor: '#f59e0b',
    }
  );
}

export interface PostMatchVictoryVisualState {
  active: boolean;
  winner: 'p1' | 'p2';
  winningFighter: FofFighterStats;
  losingFighter: FofFighterStats;
  isPerfect: boolean;
  maxCombo: number;
  damageDealt: number;
  winnerHpPercent: number;
  isMatchDeciding: boolean;
  subStep: number; // 0: KO Impact, 1: Flourish / Roar, 2: Iconic Signature Victory Pose
}

interface FofPostMatchVictoryOverlayProps {
  postMatchState: PostMatchVictoryVisualState | null;
  onProceedToScoreScreen: () => void;
  onWatchReplay?: () => void;
}

export const FofPostMatchVictoryOverlay: React.FC<FofPostMatchVictoryOverlayProps> = ({
  postMatchState,
  onProceedToScoreScreen,
  onWatchReplay,
}) => {
  const [progressPercent, setProgressPercent] = useState(0);
  const [celebrationSparks, setCelebrationSparks] = useState<
    { id: string; x: number; y: number; size: number; speedY: number; color: string }[]
  >([]);

  const winnerCharId = postMatchState?.winningFighter.id || 'arjun';
  const victoryData = getVictoryData(winnerCharId);

  // Spawn celebratory rising victory particles
  useEffect(() => {
    if (!postMatchState?.active) {
      setProgressPercent(0);
      setCelebrationSparks([]);
      return;
    }

    const colors = ['#fbbf24', '#f59e0b', '#ffffff', victoryData.effectColor, '#fef08a'];
    const newSparks = Array.from({ length: 36 }, (_, i) => ({
      id: `vspk_${Date.now()}_${i}`,
      x: 20 + Math.random() * 60,
      y: 90 + Math.random() * 15,
      size: Math.random() * 5 + 3,
      speedY: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setCelebrationSparks(newSparks);

    // Auto-progress timer over 4.5 seconds
    const startTime = Date.now();
    const duration = 4500;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgressPercent(pct);
      if (elapsed >= duration) {
        clearInterval(interval);
        onProceedToScoreScreen();
      }
    }, 50);

    // Keyboard listener: Space, Enter, or Escape skips directly to score screen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onProceedToScoreScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [postMatchState?.active, onProceedToScoreScreen, victoryData.effectColor]);

  if (!postMatchState || !postMatchState.active) return null;

  const isP1Winner = postMatchState.winner === 'p1';
  const winner = postMatchState.winningFighter;
  const loser = postMatchState.losingFighter;

  const winnerAvatar = getFighterPortrait(winner.id);
  const loserAvatar = getFighterPortrait(loser.id);

  return (
    <div
      id="fof-post-match-victory-overlay"
      className="absolute inset-0 z-40 pointer-events-auto select-none overflow-hidden flex flex-col justify-between"
      onClick={onProceedToScoreScreen}
    >
      {/* 1. Dramatic Golden / Stage Aura Spotlight focusing on the winning champion */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: isP1Winner
            ? `radial-gradient(ellipse at 32% 65%, ${victoryData.effectColor}33 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.85) 90%)`
            : `radial-gradient(ellipse at 68% 65%, ${victoryData.effectColor}33 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.85) 90%)`,
        }}
      />

      {/* Floating Celebratory Golden Sparks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {celebrationSparks.map(spk => (
          <div
            key={spk.id}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${spk.x}%`,
              bottom: `${Math.random() * 80 + 10}%`,
              width: `${spk.size}px`,
              height: `${spk.size * 1.5}px`,
              backgroundColor: spk.color,
              boxShadow: `0 0 10px ${spk.color}`,
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      {/* 2. Top Header Ribbon: Street Fighter 6 Style Dynamic Champion Banner */}
      <div className="relative z-10 w-full pt-3 px-4 sm:px-6 pointer-events-none">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Top Pill with Accolades */}
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-black/80 border border-yellow-500/60 shadow-xl backdrop-blur-md mb-2">
            <Crown className="w-4 h-4 text-yellow-400 animate-bounce" />
            <span className="font-mono font-black text-xs sm:text-sm tracking-wider uppercase text-yellow-300">
              {postMatchState.isMatchDeciding ? 'MATCH DECISIVE VICTORY' : 'ROUND VICTORY'}
            </span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-gray-300 font-mono text-xs font-bold">
              {isP1Winner ? 'PLAYER 1' : 'PLAYER 2 / CPU'} TRIUMPHS
            </span>
            {postMatchState.isPerfect && (
              <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow">
                <Star className="w-3 h-3 fill-black" /> PERFECT
              </span>
            )}
          </div>

          {/* Large Gold Foil Champion Title */}
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-wider text-transparent bg-clip-text drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
            style={{
              backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #fde047 30%, #f59e0b 70%, #b45309 100%)',
            }}
          >
            {winner.name} WINS!
          </h1>

          {/* Unique Victory Pose Signature Name */}
          <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-amber-300/90 bg-amber-950/60 border border-amber-500/40 px-3 py-0.5 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>POSE: {victoryData.title}</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Cards: Champion Victory Profile & Defeated Challenger Status */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 my-auto pointer-events-none flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Winner Heroic Champion Card */}
        <div
          className={`flex items-center gap-4 bg-gradient-to-r from-black/90 via-stone-900/90 to-black/90 border-2 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-lg transition-all duration-500 animate-slide-up ${
            isP1Winner ? 'md:self-start' : 'md:self-end md:flex-row-reverse'
          }`}
          style={{ borderColor: victoryData.effectColor }}
        >
          {/* Winner Portrait with Champion Glow Ring */}
          <div className="relative flex-shrink-0">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shadow-xl relative"
              style={{ borderColor: victoryData.effectColor }}
            >
              <img
                src={winnerAvatar}
                alt={winner.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top filter brightness-110"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 15px ${victoryData.effectColor}88`,
                }}
              />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-500 border border-white text-black flex items-center justify-center font-black text-xs shadow-lg">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Winner Text & Quote */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-400/80 rounded text-[10px] font-bold text-yellow-300 uppercase">
                {winner.combatArchetype || winner.role || 'CHAMPION'}
              </span>
              <span className="text-[11px] text-gray-400 font-mono font-semibold">
                HP: {postMatchState.winnerHpPercent}%
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black uppercase text-white truncate tracking-wide">
              {winner.name}
            </h2>

            {/* In-Character Victory Speech Quote */}
            <blockquote className="text-xs sm:text-[13px] text-amber-200/90 italic font-medium border-l-2 pl-2.5 py-0.5 line-clamp-2" style={{ borderColor: victoryData.effectColor }}>
              "{victoryData.quote}"
            </blockquote>

            {/* Animation sequence description */}
            <p className="text-[10px] text-gray-400 line-clamp-1 italic">
              ✦ {victoryData.desc}
            </p>
          </div>
        </div>

        {/* Defeated Opponent Status Card */}
        <div
          className={`flex items-center gap-3 bg-black/85 border border-stone-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md max-w-sm filter grayscale contrast-125 opacity-90 transition-all duration-500 ${
            isP1Winner ? 'md:self-end' : 'md:self-start'
          }`}
        >
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-red-700/80 flex-shrink-0">
            <img
              src={loserAvatar}
              alt={loser.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top opacity-60"
            />
            <div className="absolute inset-0 bg-red-950/40 flex items-center justify-center font-black text-[9px] text-red-300 uppercase tracking-tighter">
              K.O.
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-mono text-red-400 font-bold uppercase">
              <ShieldAlert className="w-3 h-3 text-red-500" />
              <span>DEFEATED</span>
            </div>
            <p className="text-xs font-bold text-gray-300 truncate">{loser.name}</p>
            <p className="text-[10px] text-gray-500 italic truncate">
              "{loser.voiceLines?.defeat || 'The line... collapsed...'}"
            </p>
          </div>
        </div>
      </div>

      {/* 4. Bottom Interactive Skip & Progression Bar */}
      <div className="relative z-10 w-full pb-4 px-4 sm:px-6 pointer-events-auto">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-2">
          {/* Interactive Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onWatchReplay && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onWatchReplay();
                }}
                className="px-5 py-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-amber-500/70 hover:border-amber-400 text-amber-300 hover:text-white font-black italic uppercase text-xs tracking-wider shadow-xl cursor-pointer flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                title="Watch Full Replay of this Match"
              >
                <Film className="w-3.5 h-3.5 text-amber-400" />
                <span>WATCH MATCH REPLAY</span>
              </button>
            )}

            <button
              onClick={e => {
                e.stopPropagation();
                onProceedToScoreScreen();
              }}
              className="group px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-black italic uppercase text-xs sm:text-sm tracking-wider shadow-2xl cursor-pointer flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 border border-yellow-300/40"
            >
              <span>CONTINUE TO SCORE SCREEN</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <p className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-gray-300">SPACE</span>
            <span>or</span>
            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-gray-300">CLICK</span>
            <span>to advance • Auto-advances in {Math.max(0, Math.ceil((100 - progressPercent) / 22))}s</span>
          </p>

          {/* Auto-progression timing gauge */}
          <div className="w-48 h-1 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
