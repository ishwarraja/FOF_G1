import React, { useEffect, useState, useRef } from 'react';
import { Flame, Zap, Sparkles, Swords, Crown, Star } from 'lucide-react';

interface ComboSideProps {
  isPlayer1: boolean;
  hits: number;
  damage: number;
  timerProgress: number;
  fighterName: string;
  accentColor: string;
}

interface CompletedRecord {
  hits: number;
  damage: number;
  tierTitle: string;
  timestamp: number;
}

export const FofCombatComboDisplay: React.FC<{
  p1Hits: number;
  p1Damage: number;
  p1Progress: number;
  p1Name: string;
  p1Color: string;
  p2Hits: number;
  p2Damage: number;
  p2Progress: number;
  p2Name: string;
  p2Color: string;
}> = ({
  p1Hits,
  p1Damage,
  p1Progress,
  p1Name,
  p1Color,
  p2Hits,
  p2Damage,
  p2Progress,
  p2Name,
  p2Color,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 overflow-hidden">
      {/* Player 1 Active On-Screen Combo Visual (Positioned Left-Center) */}
      <FofSingleCombatCombo
        isPlayer1={true}
        hits={p1Hits}
        damage={p1Damage}
        timerProgress={p1Progress}
        fighterName={p1Name}
        accentColor={p1Color}
      />

      {/* Player 2 Active On-Screen Combo Visual (Positioned Right-Center) */}
      <FofSingleCombatCombo
        isPlayer1={false}
        hits={p2Hits}
        damage={p2Damage}
        timerProgress={p2Progress}
        fighterName={p2Name}
        accentColor={p2Color}
      />
    </div>
  );
};

const FofSingleCombatCombo: React.FC<ComboSideProps> = ({
  isPlayer1,
  hits,
  damage,
  timerProgress,
  fighterName,
  accentColor,
}) => {
  const [isPopping, setIsPopping] = useState(false);
  const [recentCompleted, setRecentCompleted] = useState<CompletedRecord | null>(null);
  const [sparks, setSparks] = useState<{ id: string; x: number; y: number; color: string; size: number }[]>([]);

  const prevHitsRef = useRef<number>(hits);
  const prevDamageRef = useRef<number>(damage);

  // Calibrated tiers up to 40+ hits
  const getPraiseTier = (h: number) => {
    if (h >= 40) return { text: '★ 40-HIT APEX TRANSCENDENCE! ★', color: '#fbbf24', bg: 'from-amber-400 via-rose-500 to-yellow-300', isApex: true };
    if (h >= 35) return { text: '35-HIT SUPREME OVERDRIVE!', color: '#f59e0b', bg: 'from-fuchsia-500 via-purple-600 to-amber-400', isApex: true };
    if (h >= 30) return { text: '30-HIT GODSPEED RUSH!', color: '#ec4899', bg: 'from-pink-500 via-rose-600 to-amber-400', isApex: false };
    if (h >= 25) return { text: '25-HIT MAXIMUM OVERDRIVE!', color: '#a855f7', bg: 'from-purple-600 to-pink-500', isApex: false };
    if (h >= 20) return { text: '20-HIT UNREAL RUSH!', color: '#ef4444', bg: 'from-red-600 to-rose-500', isApex: false };
    if (h >= 16) return { text: '16-HIT APOCALYPTIC FURY!', color: '#f97316', bg: 'from-orange-500 to-amber-500', isApex: false };
    if (h >= 12) return { text: '12-HIT GODLIKE RUSH!', color: '#fb923c', bg: 'from-orange-400 to-amber-400', isApex: false };
    if (h >= 9) return { text: '9-HIT UNSTOPPABLE!', color: '#eab308', bg: 'from-amber-500 to-yellow-400', isApex: false };
    if (h >= 7) return { text: '7-HIT OVERDRIVE!', color: '#fbbf24', bg: 'from-yellow-500 to-amber-400', isApex: false };
    if (h >= 5) return { text: '5-HIT SUPERB!', color: '#38bdf8', bg: 'from-cyan-500 to-blue-500', isApex: false };
    if (h >= 3) return { text: 'GREAT!', color: '#34d399', bg: 'from-emerald-500 to-teal-400', isApex: false };
    return { text: 'RHYTHM!', color: '#60a5fa', bg: 'from-blue-500 to-indigo-500', isApex: false };
  };

  useEffect(() => {
    if (hits > prevHitsRef.current && hits >= 2) {
      setIsPopping(true);
      const popTimer = setTimeout(() => setIsPopping(false), 140);

      // Generate localized flying spark particles
      const newSparks = Array.from({ length: Math.min(12, 5 + Math.floor(hits * 0.4)) }, (_, i) => ({
        id: `c_spk_${Date.now()}_${i}`,
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 60,
        color: ['#fbbf24', '#fef08a', '#ffffff', accentColor, '#ef4444'][Math.floor(Math.random() * 5)],
        size: Math.random() * 6 + 3,
      }));
      setSparks(newSparks);
      const sparkTimer = setTimeout(() => setSparks([]), 380);

      setRecentCompleted(null);
      prevHitsRef.current = hits;
      prevDamageRef.current = damage;

      return () => {
        clearTimeout(popTimer);
        clearTimeout(sparkTimer);
      };
    } else if (hits === 0 && prevHitsRef.current >= 2) {
      const finalH = prevHitsRef.current;
      const finalD = prevDamageRef.current;
      const tier = getPraiseTier(finalH);

      setRecentCompleted({
        hits: finalH,
        damage: finalD,
        tierTitle: tier.text,
        timestamp: Date.now(),
      });

      prevHitsRef.current = 0;
      prevDamageRef.current = 0;

      const finishTimer = setTimeout(() => {
        setRecentCompleted(null);
      }, 1600);
      return () => clearTimeout(finishTimer);
    } else {
      prevHitsRef.current = hits;
      if (damage > 0) prevDamageRef.current = damage;
    }
  }, [hits, damage, accentColor]);

  // If neither active nor recently completed, do not render
  if (hits < 2 && !recentCompleted) {
    return null;
  }

  const activeHits = hits >= 2 ? hits : (recentCompleted?.hits || 0);
  const activeDamage = hits >= 2 ? damage : (recentCompleted?.damage || 0);
  const tier = getPraiseTier(activeHits);

  // Bonus damage percentage up to 40 hits
  const bonusMultiplier = activeHits > 5 ? Number((1.15 + (Math.min(40, activeHits) - 5) * 0.05).toFixed(2)) : 1.0;
  const bonusPct = Math.round((bonusMultiplier - 1) * 100);

  // Dynamic scale pop and hit size:
  // Scales progressively from 2 to 40 hits
  const progressRatio = Math.min(1, Math.max(0, (activeHits - 2) / 38));
  const baseScale = 1.0 + progressRatio * 0.28;
  const popScale = isPopping ? baseScale * 1.22 : baseScale;

  return (
    <div
      className={`absolute top-[32%] -translate-y-1/2 transition-transform duration-100 ease-out pointer-events-none ${
        isPlayer1
          ? 'left-3 sm:left-6 md:left-10 origin-left'
          : 'right-3 sm:right-6 md:right-10 origin-right'
      }`}
      style={{
        transform: `scale(${popScale}) ${isPlayer1 ? 'rotate(-3deg)' : 'rotate(3deg)'}`,
      }}
    >
      {/* Dynamic Aura Glow behind combo box */}
      <div
        className="absolute inset-0 blur-2xl opacity-60 rounded-3xl -m-4 transition-all duration-200"
        style={{
          backgroundColor: activeHits >= 25 ? '#f59e0b' : accentColor,
        }}
      />

      {/* Main Real-Time Fighting Game Combo Box */}
      <div
        className={`relative flex flex-col ${
          isPlayer1 ? 'items-start text-left' : 'items-end text-right'
        } font-mono select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)]`}
      >
        {/* Flying Sparks on Impact */}
        {sparks.map(s => (
          <div
            key={s.id}
            className="absolute rounded-full animate-ping pointer-events-none"
            style={{
              left: `calc(50% + ${s.x}px)`,
              top: `calc(50% + ${s.y}px)`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              backgroundColor: s.color,
              boxShadow: `0 0 10px ${s.color}`,
            }}
          />
        ))}

        {/* 1. Header: Praise Rank Banner */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r ${tier.bg} text-white font-black italic text-[11px] sm:text-xs tracking-wider shadow-lg border border-white/40 mb-1 animate-pulse`}
          style={{
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          {activeHits >= 25 ? (
            <Crown className="w-3.5 h-3.5 text-yellow-200 animate-bounce" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
          )}
          <span>{tier.text}</span>
          <Star className="w-3 h-3 text-yellow-200 fill-yellow-200" />
        </div>

        {/* 2. Giant Hit Count Display (e.g. "3 HITS", "25 HITS", "35 HITS") */}
        <div className={`flex items-baseline gap-2 ${isPlayer1 ? 'flex-row' : 'flex-row-reverse'}`}>
          <span
            className={`text-6xl sm:text-7xl md:text-8xl font-black italic tracking-tighter leading-none transition-all duration-75 ${
              activeHits >= 40
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-red-500'
                : activeHits >= 30
                ? 'text-amber-300'
                : activeHits >= 20
                ? 'text-yellow-400'
                : 'text-white'
            }`}
            style={{
              textShadow: activeHits >= 25
                ? '0 0 25px #f59e0b, 0 0 45px #ef4444, 4px 4px 0 #000000'
                : '0 0 20px rgba(0,0,0,0.9), 3px 3px 0 #000000',
              WebkitTextStroke: activeHits >= 25 ? '1.5px #ffffff' : '1px #000000',
            }}
          >
            {activeHits}
          </span>

          <div className={`flex flex-col ${isPlayer1 ? 'items-start' : 'items-end'} leading-none`}>
            <span
              className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-wider text-amber-400 uppercase"
              style={{
                textShadow: '2px 2px 0 #000000, 0 0 12px rgba(245,158,11,0.6)',
              }}
            >
              HITS!
            </span>
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-gray-300 uppercase mt-0.5">
              {fighterName.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* 3. Real-time Damage & Bonus Multiplier Tag */}
        <div
          className={`flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-black/85 border border-amber-500/60 shadow-lg text-[11px] sm:text-xs font-bold ${
            isPlayer1 ? 'flex-row' : 'flex-row-reverse'
          }`}
        >
          <span className="text-gray-300">DAMAGE:</span>
          <span className="text-rose-400 font-black text-sm tracking-wide font-mono">
            {activeDamage}
          </span>
          {bonusPct > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-amber-500/25 border border-amber-400/80 text-amber-300 font-mono text-[10px] font-black animate-pulse">
              +{bonusPct}%
            </span>
          )}
        </div>

        {/* 4. Link Decay Window Bar (Timer Gauge) */}
        {hits >= 2 && (
          <div className="w-36 sm:w-44 h-1.5 bg-black/80 rounded-full mt-1.5 overflow-hidden border border-white/20 shadow-inner">
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                timerProgress > 0.4
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_8px_#f59e0b]'
                  : 'bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_8px_#ef4444]'
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, timerProgress * 100))}%`,
              }}
            />
          </div>
        )}

        {/* 5. Dropped Combo Flourish Pill */}
        {recentCompleted && (
          <div className="mt-1 px-2 py-0.5 rounded bg-zinc-900/90 border border-red-500/60 text-[10px] font-bold text-red-300 shadow animate-fade-in flex items-center gap-1">
            <Swords className="w-3 h-3 text-red-400" />
            <span>COMBO COMPLETED: {recentCompleted.hits} HITS</span>
          </div>
        )}
      </div>
    </div>
  );
};
