import React, { useEffect, useState, useRef } from 'react';
import { Swords, Flame, Zap, Trophy, Star, Shield, Wind, Sparkles, Skull, Mountain } from 'lucide-react';
import { soundFX } from '../../utils/audio';

export interface FofCurrentComboCounterProps {
  isPlayer1: boolean;
  hits: number;
  damage: number;
  timerProgress?: number;
  fighterName?: string;
  accentColor?: string;
  element?: string;
  isMaxMode?: boolean;
}

interface CompletedComboRecord {
  hits: number;
  damage: number;
  multiplier: number;
  exceededFiveHits: boolean;
  tierTitle: string;
}

export const FofCurrentComboCounter: React.FC<FofCurrentComboCounterProps> = ({
  isPlayer1,
  hits,
  damage,
  timerProgress = 1,
  fighterName = 'Fighter',
  accentColor = '#ef4444',
  element = 'Fire',
  isMaxMode = false,
}) => {
  const [isPopping, setIsPopping] = useState<boolean>(false);
  const [completedCombo, setCompletedCombo] = useState<CompletedComboRecord | null>(null);
  const [counterSparks, setCounterSparks] = useState<{ id: string; tx: number; ty: number; color: string; size: number; rot: number; shape: string }[]>([]);

  const prevHitsRef = useRef<number>(hits);
  const prevDamageRef = useRef<number>(damage);

  // Combo tier titles calibrated up to 35+ hits
  const getTierInfo = (h: number) => {
    if (h >= 35) return { title: '★ 35-HIT APEX TRANSCENDENCE! ★', badgeBg: 'from-amber-300 via-rose-500 to-yellow-300', textGlow: '#fbbf24', isApex: true };
    if (h >= 30) return { title: '30-HIT SUPREME GODSPEED!', badgeBg: 'from-fuchsia-500 via-purple-600 to-amber-400', textGlow: '#f59e0b', isApex: true };
    if (h >= 25) return { title: '25-HIT MAXIMUM OVERDRIVE!', badgeBg: 'from-pink-500 via-rose-600 to-amber-400', textGlow: '#ec4899', isApex: false };
    if (h >= 20) return { title: '20-HIT UNREAL OVERDRIVE!', badgeBg: 'from-fuchsia-600 via-pink-600 to-amber-400', textGlow: '#e879f9', isApex: false };
    if (h >= 16) return { title: '16-HIT APOCALYPTIC FURY!', badgeBg: 'from-red-600 via-rose-600 to-amber-500', textGlow: '#f43f5e', isApex: false };
    if (h >= 12) return { title: '12-HIT GODLIKE RUSH!', badgeBg: 'from-amber-400 via-orange-500 to-red-600', textGlow: '#f59e0b', isApex: false };
    if (h >= 9) return { title: '9-HIT UNSTOPPABLE!', badgeBg: 'from-purple-600 to-pink-600', textGlow: '#c084fc', isApex: false };
    if (h >= 7) return { title: '7-HIT OVERDRIVE!', badgeBg: 'from-red-600 via-amber-500 to-yellow-400', textGlow: '#ef4444', isApex: false };
    if (h >= 5) return { title: '5-HIT SUPERB!', badgeBg: 'from-amber-500 to-orange-600', textGlow: '#f59e0b', isApex: false };
    if (h >= 3) return { title: 'GREAT!', badgeBg: 'from-orange-500 to-amber-500', textGlow: '#fb923c', isApex: false };
    return { title: 'RHYTHM!', badgeBg: 'from-blue-600 to-cyan-500', textGlow: '#38bdf8', isApex: false };
  };

  useEffect(() => {
    if (hits > prevHitsRef.current && hits >= 2) {
      // Impact pop trigger
      setIsPopping(true);
      const timer = setTimeout(() => setIsPopping(false), 200);

      // Play sound FX for consecutive hits
      soundFX.playComboHit(hits);

      // Particle burst effect whenever combo counter increases above 5 hits
      if (hits > 5) {
        soundFX.playOverdriveSpark(hits);

        // Spawn localized sparkling particle burst around the combo counter
        const sparkCount = Math.min(18, 8 + Math.floor((hits - 5) * 0.5));
        const colors = ['#f59e0b', '#fef08a', '#ef4444', '#ffffff', accentColor];
        const newSparks = Array.from({ length: sparkCount }, (_, i) => {
          const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
          const dist = 28 + Math.random() * 48;
          return {
            id: `cspk_${Date.now()}_${i}_${Math.random()}`,
            tx: Math.cos(angle) * dist,
            ty: Math.sin(angle) * dist,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.floor(3 + Math.random() * 4),
            rot: Math.floor(Math.random() * 360),
            shape: Math.random() > 0.5 ? 'star' : 'spark',
          };
        });

        setCounterSparks(prev => [...prev.slice(-16), ...newSparks]);
        setTimeout(() => {
          setCounterSparks(prev => prev.filter(s => !newSparks.some(ns => ns.id === s.id)));
        }, 440);
      }

      // Trigger extra audio chime on breaking the 5-hit threshold
      if (hits === 6) {
        soundFX.playSuperFlash();
      }

      setCompletedCombo(null);
      prevHitsRef.current = hits;
      prevDamageRef.current = damage;

      return () => clearTimeout(timer);
    } else if (hits === 0 && prevHitsRef.current >= 2) {
      // Combo just ended
      const finalHits = prevHitsRef.current;
      const finalDamage = prevDamageRef.current;
      const exceededFiveHits = finalHits > 5;
      const multiplier = exceededFiveHits
        ? Number((1.15 + (Math.min(35, finalHits) - 5) * 0.05 + (isMaxMode ? 0.1 : 0)).toFixed(2))
        : 1.0;
      const tier = getTierInfo(finalHits);

      soundFX.playComboEndFlourish(finalHits);

      setCompletedCombo({
        hits: finalHits,
        damage: finalDamage,
        multiplier,
        exceededFiveHits,
        tierTitle: tier.title,
      });

      prevHitsRef.current = 0;
      prevDamageRef.current = 0;

      const finishTimer = setTimeout(() => {
        setCompletedCombo(null);
      }, 2400);

      return () => clearTimeout(finishTimer);
    } else {
      prevHitsRef.current = hits;
      if (damage > 0) prevDamageRef.current = damage;
    }
  }, [hits, damage, isMaxMode, accentColor]);

  // When combo exceeds 5 hits (hits > 5), dynamic scale effect engages up to 35 hits
  const exceedsFiveHits = hits > 5;
  const multiplier = exceedsFiveHits
    ? Number((1.15 + (Math.min(35, hits) - 5) * 0.05 + (isMaxMode ? 0.1 : 0)).toFixed(2))
    : 1.0;
  const bonusPct = Math.round((multiplier - 1) * 100);

  // Dynamic scale calculation: base scale 1.0; above 5 hits, scales up cleanly up to 35 hits without covering fighters
  const progressTo35 = Math.min(1, Math.max(0, (hits - 5) / 30));
  const dynamicScale = exceedsFiveHits
    ? (1.02 + progressTo35 * 0.12) * (isPopping ? 1.05 : 1.0)
    : isPopping
    ? 1.03
    : 1.0;

  const currentTier = getTierInfo(hits);

  // If no active combo and no recent completion, return null
  if (hits < 2 && !completedCombo) {
    return null;
  }

  const renderElementIcon = () => {
    switch (element) {
      case 'Fire': return <Flame className="w-3 h-3 text-orange-400 drop-shadow" />;
      case 'Ice': return <Shield className="w-3 h-3 text-cyan-400 drop-shadow" />;
      case 'Wind': return <Wind className="w-3 h-3 text-emerald-400 drop-shadow" />;
      case 'Light': return <Sparkles className="w-3 h-3 text-yellow-300 drop-shadow" />;
      case 'Dark': return <Skull className="w-3 h-3 text-purple-400 drop-shadow" />;
      default: return <Mountain className="w-3 h-3 text-amber-500 drop-shadow" />;
    }
  };

  return (
    <div
      id={`current-combo-counter-${isPlayer1 ? 'p1' : 'p2'}`}
      className={`mt-1 pointer-events-none select-none transition-transform duration-150 ease-out flex ${
        isPlayer1 ? 'justify-start' : 'justify-end'
      } w-full max-w-[240px] sm:max-w-[270px]`}
      style={{
        transform: `scale(${dynamicScale})`,
        transformOrigin: isPlayer1 ? 'top left' : 'top right',
      }}
    >
      {/* 1. ACTIVE CURRENT COMBO DISPLAY */}
      {hits >= 2 && (
        <div
          className={`relative rounded-xl border font-mono backdrop-blur-md transition-all duration-200 shadow-2xl p-1.5 sm:p-2 w-full ${
            exceedsFiveHits
              ? 'bg-gradient-to-br from-stone-950/95 via-amber-950/95 to-black/95 border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-overdrive-pulse'
              : 'bg-black/90 border-stone-700/80 text-gray-200 shadow-[0_4px_16px_rgba(0,0,0,0.85)]'
          }`}
          style={{
            borderColor: exceedsFiveHits ? '#f59e0b' : undefined,
            boxShadow: exceedsFiveHits
              ? `0 0 20px rgba(245, 158, 11, 0.6), 0 0 8px ${accentColor}`
              : `0 0 10px ${accentColor}40`,
          }}
        >
          {/* Header Row: 'CURRENT COMBO' Badge + Tier + Element */}
          <div className={`flex items-center gap-1.5 ${isPlayer1 ? 'flex-row' : 'flex-row-reverse'} justify-between`}>
            <div className="flex items-center gap-1.5">
              <div
                className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-black italic tracking-wider flex items-center gap-1 shadow-md ${
                  exceedsFiveHits
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black border-yellow-200'
                    : 'bg-stone-900 border-amber-500/70 text-amber-300'
                }`}
              >
                <Swords className="w-3 h-3 fill-current" />
                <span>CURRENT COMBO</span>
              </div>

              {renderElementIcon()}
            </div>

            {/* Tier Pill */}
            <div
              className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${currentTier.badgeBg} text-white font-extrabold italic text-[9px] sm:text-[10px] tracking-wider shadow`}
            >
              {currentTier.title}
            </div>
          </div>

          {/* Center Main Combo Hits & Total Damage */}
          <div className={`flex items-baseline gap-2.5 mt-1.5 ${isPlayer1 ? 'flex-row' : 'flex-row-reverse'}`}>
            <span
              className={`font-black italic tracking-tighter text-3xl sm:text-4xl lg:text-5xl leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] transition-transform duration-100 ${
                exceedsFiveHits ? 'text-amber-300 scale-105' : isPlayer1 ? 'text-yellow-400' : 'text-red-400'
              }`}
              style={{
                textShadow: exceedsFiveHits ? '0 0 16px #f59e0b, 0 0 30px #ef4444' : undefined,
              }}
            >
              {hits}
            </span>

            <div className={`flex flex-col ${isPlayer1 ? 'items-start' : 'items-end'}`}>
              <span className="font-black italic text-xs sm:text-sm text-white tracking-widest uppercase leading-none">
                CONSECUTIVE HITS
              </span>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-300 font-bold">
                <span className="bg-white/10 px-1.5 py-0.2 rounded border border-white/10 text-red-300">
                  {damage} DMG
                </span>
                <span className="text-stone-400 text-[9px] truncate max-w-[90px]">
                  ({fighterName.split(' ')[0]})
                </span>
              </div>
            </div>
          </div>

          {/* DYNAMIC MULTIPLIER OVERDRIVE BANNER: Activates when hits > 5, scales to 35 hits */}
          {exceedsFiveHits ? (
            <div className="mt-1.5 p-1.5 rounded-lg bg-gradient-to-r from-amber-500/25 via-red-500/30 to-amber-500/25 border border-amber-400/80 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between gap-1 text-[10px] font-black">
                <div className="flex items-center gap-1 text-amber-300 uppercase tracking-wide animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{hits >= 35 ? '★ 35-HIT APEX OVERDRIVE!' : hits >= 25 ? '★ 25-HIT GODSPEED!' : '★ 5+ HIT BONUS ACTIVE'}</span>
                </div>
                <span className="bg-amber-400 text-black px-1.5 py-0.2 rounded font-mono text-[10px] font-black shadow">
                  x{multiplier.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-stone-300 font-mono mt-0.5">
                <span className="text-amber-200">+{bonusPct}% BONUS DAMAGE</span>
                <span className="text-amber-400 font-bold">
                  {hits}/35 HITS {hits >= 35 ? 'MAX!' : ''}
                </span>
              </div>
            </div>
          ) : (
            /* Threshold Progress bar towards 5+ hit bonus */
            <div className="mt-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 flex items-center justify-between text-[9px] text-stone-400 font-mono">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>5+ HIT MULTIPLIER:</span>
              </div>
              <span className="text-amber-300 font-bold">
                {hits}/5 ({5 - hits + 1} more hit{5 - hits + 1 > 1 ? 's' : ''})
              </span>
            </div>
          )}

          {/* Local Counter Spark Burst Particles (Triggered on combo increases > 5) */}
          {counterSparks.map(spk => (
            <div
              key={spk.id}
              className="absolute pointer-events-none animate-combo-spark flex items-center justify-center z-20"
              style={{
                top: '40%',
                left: isPlayer1 ? '25%' : '75%',
                width: `${spk.size * 2}px`,
                height: `${spk.size * 2}px`,
                ['--tw-translate-x' as any]: `${spk.tx}px`,
                ['--tw-translate-y' as any]: `${spk.ty}px`,
                ['--tw-rotate' as any]: `${spk.rot}deg`,
                filter: `drop-shadow(0 0 6px ${spk.color})`,
              }}
            >
              {spk.shape === 'star' ? (
                <span className="text-[10px] leading-none" style={{ color: spk.color }}>★</span>
              ) : (
                <div
                  className="rounded-full"
                  style={{
                    width: `${spk.size}px`,
                    height: `${spk.size}px`,
                    backgroundColor: spk.color,
                  }}
                />
              )}
            </div>
          ))}

          {/* Combo Decay Window Timer Bar */}
          <div className="mt-1.5 w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-white/20 shadow-inner">
            <div
              className={`h-full transition-all duration-75 ease-linear rounded-full ${
                exceedsFiveHits
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 shadow-[0_0_8px_#f59e0b]'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, timerProgress * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. COMPLETED COMBO FINISH FLOURISH (Appears briefly when a combo ends) */}
      {!hits && completedCombo && (
        <div
          className={`relative rounded-xl border border-amber-400/80 bg-black/95 backdrop-blur-xl p-2 sm:p-2.5 font-mono shadow-2xl animate-combo-flourish max-w-[280px] sm:max-w-[320px] ${
            isPlayer1 ? 'origin-top-left' : 'origin-top-right'
          }`}
          style={{
            boxShadow: `0 0 24px ${accentColor}80, 0 0 12px rgba(245, 158, 11, 0.6)`,
          }}
        >
          <div className={`flex items-center gap-1 text-[10px] font-black text-amber-400 uppercase tracking-wider ${isPlayer1 ? 'flex-row' : 'flex-row-reverse'}`}>
            <Trophy className="w-3.5 h-3.5 fill-amber-400" />
            <span>COMBO COMPLETED</span>
            <div className="flex items-center gap-0.5 ml-1">
              <Star className="w-2.5 h-2.5 fill-amber-400" />
              <Star className="w-2.5 h-2.5 fill-amber-400" />
            </div>
          </div>

          <div className={`flex items-baseline gap-2 mt-1 ${isPlayer1 ? 'flex-row' : 'flex-row-reverse'}`}>
            <span className="text-2xl sm:text-3xl font-black italic text-white tracking-tighter">
              {completedCombo.hits} <span className="text-xs text-stone-400 font-mono">HITS</span>
            </span>
            <span className="text-xs sm:text-sm font-black text-red-400">
              {completedCombo.damage} DMG
            </span>
          </div>

          {completedCombo.exceededFiveHits ? (
            <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-black text-amber-300 flex items-center justify-between">
              <span>★ 5+ HIT MULTIPLIER ACHIEVED</span>
              <span className="font-mono">x{completedCombo.multiplier.toFixed(2)}</span>
            </div>
          ) : (
            <div className="mt-0.5 text-[8px] text-stone-400 uppercase">
              {completedCombo.tierTitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
