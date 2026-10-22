import React, { useEffect, useState, useRef } from 'react';
import { Zap, Flame, Award, Sparkles, TrendingUp, CheckCircle, Trophy, Star, Swords } from 'lucide-react';
import { soundFX } from '../../utils/audio';

export interface ComboSummary {
  id: string;
  hits: number;
  damage: number;
  rating: string;
  maxMultiplier: number;
  exceededFiveHits: boolean;
  isPlayer1: boolean;
  characterName: string;
  accentColor: string;
}

export interface FofComboMeterProps {
  hits: number;
  damage: number;
  timerProgress: number; // 0 to 1 (remaining combo window)
  isPlayer1: boolean;
  characterName: string;
  accentColor?: string;
  element?: string;
  isMaxMode?: boolean;
}

export const FofComboMeter: React.FC<FofComboMeterProps> = ({
  hits,
  damage,
  timerProgress,
  isPlayer1,
  characterName,
  accentColor = '#ef4444',
  element = 'Fire',
  isMaxMode = false,
}) => {
  // Retain last combo state to display visual flourish on completion
  const [completedCombo, setCompletedCombo] = useState<ComboSummary | null>(null);
  const [hitPopAnimation, setHitPopAnimation] = useState<boolean>(false);
  const prevHitsRef = useRef<number>(0);
  const prevDamageRef = useRef<number>(0);

  // Helper to compute rating title & styles based on hit count
  const getRatingInfo = (hitCount: number) => {
    if (hitCount >= 15) {
      return {
        title: 'GODLIKE SUPREMACY!',
        badgeBg: 'from-amber-400 via-rose-500 to-purple-600',
        borderColor: 'border-amber-300',
        glow: 'shadow-[0_0_35px_rgba(245,158,11,0.9)]',
        textColor: 'text-amber-200',
        flourishSub: 'SUPREME COMBO FINISH!',
        Icon: Award,
      };
    } else if (hitCount >= 10) {
      return {
        title: 'CLIMAX OVERDRIVE!',
        badgeBg: 'from-red-600 via-rose-600 to-amber-500',
        borderColor: 'border-red-400',
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.8)]',
        textColor: 'text-red-300',
        flourishSub: 'DEVASTATING FINISH!',
        Icon: Flame,
      };
    } else if (hitCount >= 7) {
      return {
        title: 'SUPERIOR RUSH!',
        badgeBg: 'from-orange-600 to-amber-500',
        borderColor: 'border-amber-400',
        glow: 'shadow-[0_0_25px_rgba(245,158,11,0.7)]',
        textColor: 'text-amber-300',
        flourishSub: 'EXCELLENT COMBINATION!',
        Icon: Flame,
      };
    } else if (hitCount >= 4) {
      return {
        title: 'GREAT CHAIN!',
        badgeBg: 'from-emerald-600 to-teal-500',
        borderColor: 'border-emerald-400',
        glow: 'shadow-[0_0_22px_rgba(16,185,129,0.6)]',
        textColor: 'text-emerald-300',
        flourishSub: 'NICE CHAIN!',
        Icon: Zap,
      };
    } else {
      return {
        title: 'NICE COMBO',
        badgeBg: 'from-blue-600 to-cyan-500',
        borderColor: 'border-cyan-400',
        glow: 'shadow-[0_0_20px_rgba(6,182,212,0.6)]',
        textColor: 'text-cyan-300',
        flourishSub: 'COMBO COMPLETE',
        Icon: Sparkles,
      };
    }
  };

  // Monitor combo state changes: trigger pulse on new hit & trigger flourish when combo ends
  useEffect(() => {
    if (hits > prevHitsRef.current && hits >= 2) {
      // Trigger pop bounce on increment
      setHitPopAnimation(true);
      const popTimer = setTimeout(() => setHitPopAnimation(false), 180);

      // Play procedural rising pitch combo sound
      soundFX.playComboHit(hits);

      // Play special chime when exceeding 5 hits for the first time in this combo string
      if (hits === 6) {
        soundFX.playSuperFlash();
      }

      // Clear any prior completed combo flourish
      setCompletedCombo(null);
      prevHitsRef.current = hits;
      prevDamageRef.current = damage;
      return () => clearTimeout(popTimer);
    } else if (hits === 0 && prevHitsRef.current >= 2) {
      // Combo ended -> Trigger visual flourish effect
      const finalHits = prevHitsRef.current;
      const finalDamage = prevDamageRef.current;
      const rating = getRatingInfo(finalHits);
      const exceededFiveHits = finalHits > 5;
      const mult = exceededFiveHits
        ? Number((1.15 + (finalHits - 5) * 0.05 + (isMaxMode ? 0.10 : 0)).toFixed(2))
        : 1.0;

      // Play combo finish sound flourish
      soundFX.playComboEndFlourish(finalHits);

      setCompletedCombo({
        id: `flourish_${Date.now()}`,
        hits: finalHits,
        damage: finalDamage,
        rating: rating.title,
        maxMultiplier: mult,
        exceededFiveHits,
        isPlayer1,
        characterName,
        accentColor,
      });

      prevHitsRef.current = 0;
      prevDamageRef.current = 0;

      // Auto dismiss flourish after 1.8 seconds
      const finishTimer = setTimeout(() => {
        setCompletedCombo(null);
      }, 1800);

      return () => clearTimeout(finishTimer);
    } else if (hits === 0) {
      prevHitsRef.current = 0;
      prevDamageRef.current = 0;
    }
  }, [hits, damage, isMaxMode, isPlayer1, characterName, accentColor]);

  // Multiplier Bonus activates ONLY when combo exceeds 5 hits (hits > 5)
  const exceedsFiveHits = hits > 5;
  const baseMultiplierBonus = exceedsFiveHits ? 1.15 + (hits - 5) * 0.05 : 1.0;
  const maxModeBonus = isMaxMode && exceedsFiveHits ? 0.10 : 0.0;
  const finalMultiplier = Number((baseMultiplierBonus + maxModeBonus).toFixed(2));
  const bonusPercent = Math.round((finalMultiplier - 1) * 100);
  const multiplierScale = Math.min(1.4, 1 + (hits - 5) * 0.08);

  const activeRating = getRatingInfo(hits);
  const ActiveIcon = activeRating.Icon;

  return (
    <>
      {/* 1. ACTIVE LIVE CURRENT COMBO COUNTER (Appears when consecutive hits >= 2) */}
      {hits >= 2 && (
        <div
          id={`fof-combo-meter-${isPlayer1 ? 'p1' : 'p2'}`}
          className={`absolute top-20 z-30 pointer-events-none font-mono flex flex-col transition-all duration-75 ${
            isPlayer1 ? 'left-4 sm:left-6 items-start' : 'right-4 sm:right-6 items-end'
          } ${hitPopAnimation ? 'animate-combo-pop' : ''}`}
          style={{
            transformOrigin: isPlayer1 ? 'top left' : 'top right',
          }}
        >
          {/* Header Row: 'CURRENT COMBO' Label + Active Tier Badge */}
          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-0.5 rounded-full bg-black/90 border border-amber-400/80 text-amber-300 font-mono font-black italic text-[11px] sm:text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>CURRENT COMBO</span>
            </div>

            <div
              className={`px-2.5 py-0.5 rounded-full bg-gradient-to-r ${activeRating.badgeBg} text-white font-bold italic text-[10px] sm:text-[11px] tracking-wider flex items-center gap-1 border ${activeRating.borderColor} ${activeRating.glow}`}
            >
              <ActiveIcon className="w-3 h-3 fill-current" />
              <span className="drop-shadow">{activeRating.title}</span>
            </div>

            {isMaxMode && (
              <span className="px-1.5 py-0.5 bg-yellow-400 text-black text-[9px] rounded font-black border border-yellow-500 shadow">
                MAX+
              </span>
            )}
          </div>

          {/* Main Consecutive Hit Counter Readout */}
          <div className="flex items-baseline gap-2.5 mt-1.5 drop-shadow-[0_6px_16px_rgba(0,0,0,0.95)]">
            <span
              className={`font-black italic tracking-tighter text-4xl sm:text-5xl lg:text-6xl ${
                isPlayer1 ? 'text-yellow-300' : 'text-red-400'
              }`}
              style={{
                textShadow: `0 0 24px ${accentColor}, 0 0 8px #000, 0 4px 10px black`,
              }}
            >
              {hits}
            </span>
            <div className="flex flex-col">
              <span className="font-black italic text-lg sm:text-2xl text-white tracking-wider leading-tight uppercase">
                CONSECUTIVE HITS
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-gray-200 tracking-wider bg-black/70 px-1.5 py-0.5 rounded border border-white/10">
                {damage} TOTAL DMG
              </span>
            </div>
          </div>

          {/* Multiplier Bonus Status: Unlocked when combo exceeds 5 hits */}
          {exceedsFiveHits ? (
            <div
              className="mt-1.5 transition-transform duration-150 animate-combo-pop"
              style={{
                transform: `scale(${multiplierScale})`,
                transformOrigin: isPlayer1 ? 'top left' : 'top right',
              }}
            >
              <div
                className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-black shadow-xl flex items-center gap-2.5 border-2 border-yellow-200 ${
                  isPlayer1 ? 'border-l-4' : 'border-r-4'
                }`}
                style={{
                  boxShadow: `0 0 25px rgba(245,158,11,0.85), 0 0 12px ${accentColor}`,
                }}
              >
                <Flame className="w-4 h-4 fill-black text-yellow-200 shrink-0 animate-bounce" />
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] sm:text-xs font-black italic uppercase tracking-wider text-black">
                      ★ MULTIPLIER BONUS ACTIVE! ★
                    </span>
                    <span className="text-xs sm:text-sm font-black italic tracking-wider bg-black text-yellow-300 px-1.5 py-0.5 rounded shadow">
                      x{finalMultiplier.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-black text-yellow-950 uppercase">
                    <span>+{bonusPercent}% BONUS DAMAGE</span>
                    <span>•</span>
                    <span>EXCEEDED 5 HITS!</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-black/90 backdrop-blur-sm border border-white/20 shadow-md flex items-center gap-2 text-[10px]">
              <Flame className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-gray-400 font-bold uppercase">MULTIPLIER BONUS:</span>
                <span className="text-amber-300 font-bold">{hits}/5 HITS</span>
                <span className="text-gray-400 text-[9px]">
                  ({5 - hits + 1} more consecutive hit{5 - hits + 1 > 1 ? 's' : ''} to unlock)
                </span>
              </div>
            </div>
          )}

          {/* Combo Decay Window Timer Bar */}
          <div className="w-36 sm:w-48 mt-2 h-2 bg-black/90 rounded-full overflow-hidden border border-white/25 shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${Math.max(0, Math.min(100, timerProgress * 100))}%`,
                background:
                  timerProgress > 0.5
                    ? `linear-gradient(to right, #10b981, #f59e0b)`
                    : timerProgress > 0.25
                    ? `linear-gradient(to right, #f59e0b, #ef4444)`
                    : `#ef4444`,
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />
          </div>

          {/* Attacker attribution pill */}
          <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-300 font-bold uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <span>{characterName.split(' ')[0]} • {element} CHAIN</span>
          </div>
        </div>
      )}

      {/* 2. COMBO END DISTINCT VISUAL FLOURISH CELEBRATION CARD */}
      {completedCombo && hits < 2 && (
        <div
          id={`fof-combo-flourish-${isPlayer1 ? 'p1' : 'p2'}`}
          className={`absolute top-20 z-30 pointer-events-none font-mono flex flex-col animate-combo-flourish ${
            isPlayer1 ? 'left-4 sm:left-6 items-start' : 'right-4 sm:right-6 items-end'
          }`}
          style={{
            transformOrigin: isPlayer1 ? 'top left' : 'top right',
          }}
        >
          {/* Radial shockwave burst background */}
          <div
            className="absolute -inset-4 rounded-3xl animate-flourish-burst pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${completedCombo.accentColor}55 0%, transparent 75%)`,
            }}
          />

          {/* Flourish Header Ribbon */}
          <div
            className="relative px-3 py-1 rounded-t-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black italic text-[11px] sm:text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_25px_rgba(245,158,11,0.8)] border border-amber-300"
          >
            <Trophy className="w-3.5 h-3.5 text-black fill-black" />
            <span className="font-extrabold uppercase">CURRENT COMBO COMPLETE</span>
            <div className="flex items-center gap-0.5 ml-1">
              <Star className="w-2.5 h-2.5 fill-black" />
              <Star className="w-2.5 h-2.5 fill-black" />
              <Star className="w-2.5 h-2.5 fill-black" />
            </div>
          </div>

          {/* Flourish Stat Box */}
          <div
            className="relative px-3.5 py-2.5 rounded-b-xl bg-black/95 backdrop-blur-xl border-x border-b border-amber-400/80 shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex flex-col min-w-[220px]"
            style={{
              boxShadow: `0 0 25px ${completedCombo.accentColor}88`,
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black italic text-amber-300 drop-shadow">
                  {completedCombo.hits}
                </span>
                <span className="text-xs font-black text-white italic">HITS</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm sm:text-base font-black text-red-400 drop-shadow">
                  {completedCombo.damage} DMG
                </span>
                {completedCombo.exceededFiveHits ? (
                  <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-1 rounded border border-amber-400/40">
                    ★ 5+ HIT MULTIPLIER: x{completedCombo.maxMultiplier.toFixed(2)} ★
                  </span>
                ) : (
                  <span className="text-[8px] font-bold text-gray-400">
                    STANDARD DAMAGE
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1.5 text-[9px] font-bold text-gray-300 uppercase">
              <span className="text-amber-200">{completedCombo.rating}</span>
              <span className="text-gray-400">{completedCombo.characterName.split(' ')[0]}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
