import React, { useState, useEffect } from 'react';
import { Settings, Flame, Activity, Volume2, VolumeX, Pause, Play, Camera } from 'lucide-react';
import { FofSuperArtGauge } from './FofSuperArtGauge';

interface FofCombatHUDProps {
  // Match Status
  roundTimer: number;
  currentRound: number;
  p1RoundsWon: number;
  p2RoundsWon: number;
  onOpenSettings: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onCaptureFreezeFrame?: () => void;

  // On-screen Audio & Value Controls
  isMuted?: boolean;
  onToggleMute?: () => void;
  showCombatValues?: boolean;
  onToggleCombatValues?: () => void;
  debugMode?: boolean;
  combatValues?: {
    frameAdvantage?: number;
    distance?: number;
    p1ActionState?: string;
    p2ActionState?: string;
    damageScaling?: number;
  };

  // Player 1
  p1Name: string;
  p1Hp: number;
  p1MaxHp: number;
  p1SuperMeter: number;
  p1MaxMeter: number;
  p1MeterStocks: number;
  p1DriveSegments?: number; // 0 to 6
  p1MaxMode?: boolean;
  p1AvatarUrl?: string;
  p1ControllerBadge?: string;
  p1SubLabel?: string;
  p1AccentColor?: string;

  // Player 2
  p2Name: string;
  p2Hp: number;
  p2MaxHp: number;
  p2SuperMeter: number;
  p2MaxMeter: number;
  p2MeterStocks: number;
  p2DriveSegments?: number; // 0 to 6
  p2MaxMode?: boolean;
  p2AvatarUrl?: string;
  p2ControllerBadge?: string;
  p2SubLabel?: string;
  p2AccentColor?: string;

  // Dynamic Combo & Alerts (from fighting engine)
  p1ComboHits?: number;
  p1ComboDamage?: number;
  p2ComboHits?: number;
  p2ComboDamage?: number;
  recentPunishCounter?: boolean;
  recentCrossUp?: boolean;
  recentFirstAttack?: boolean;
}

export const FofCombatHUD: React.FC<FofCombatHUDProps> = ({
  roundTimer,
  currentRound,
  p1RoundsWon,
  p2RoundsWon,
  onOpenSettings,
  isPaused = false,
  onTogglePause,
  onCaptureFreezeFrame,

  isMuted = false,
  onToggleMute,
  showCombatValues = false,
  onToggleCombatValues,
  debugMode = false,
  combatValues,

  p1Name,
  p1Hp,
  p1MaxHp,
  p1SuperMeter,
  p1MaxMeter,
  p1MeterStocks,
  p1DriveSegments = 6,
  p1MaxMode = false,
  p1AvatarUrl,
  p1ControllerBadge = 'D',
  p1SubLabel = 'You',
  p1AccentColor = '#ec4899',

  p2Name,
  p2Hp,
  p2MaxHp,
  p2SuperMeter,
  p2MaxMeter,
  p2MeterStocks,
  p2DriveSegments = 6,
  p2MaxMode = false,
  p2AvatarUrl,
  p2ControllerBadge = 'C',
  p2SubLabel = 'CPU Level 8',
  p2AccentColor = '#06b6d4',

  p1ComboHits = 0,
  p1ComboDamage = 0,
  p2ComboHits = 0,
  p2ComboDamage = 0,
  recentPunishCounter = false,
  recentCrossUp = false,
  recentFirstAttack = false,
}) => {
  // P1 Health Percentages & Ghost Depletion
  const p1HpPercent = Math.max(0, Math.min(100, (p1Hp / p1MaxHp) * 100));
  const [p1GhostHp, setP1GhostHp] = useState(p1HpPercent);
  const [p1HitFlash, setP1HitFlash] = useState(false);

  useEffect(() => {
    setP1HitFlash(true);
    const flashTimer = setTimeout(() => setP1HitFlash(false), 90);
    const ghostTimer = setTimeout(() => setP1GhostHp(p1HpPercent), 350);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(ghostTimer);
    };
  }, [p1HpPercent]);

  // P2 Health Percentages & Ghost Depletion
  const p2HpPercent = Math.max(0, Math.min(100, (p2Hp / p2MaxHp) * 100));
  const [p2GhostHp, setP2GhostHp] = useState(p2HpPercent);
  const [p2HitFlash, setP2HitFlash] = useState(false);

  useEffect(() => {
    setP2HitFlash(true);
    const flashTimer = setTimeout(() => setP2HitFlash(false), 90);
    const ghostTimer = setTimeout(() => setP2GhostHp(p2HpPercent), 350);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(ghostTimer);
    };
  }, [p2HpPercent]);

  // Drive segments fallback (default 6 segments, calculate from remaining HP ratio)
  const calcP1Drive = Math.max(0, Math.min(6, Math.ceil((p1Hp / p1MaxHp) * 6)));
  const calcP2Drive = Math.max(0, Math.min(6, Math.ceil((p2Hp / p2MaxHp) * 6)));

  const activeP1Drive = p1DriveSegments ?? calcP1Drive;
  const activeP2Drive = p2DriveSegments ?? calcP2Drive;

  // Active combo to display (matching ExpectedOutput.jpg on the right/mid side)
  const activeHits = Math.max(p1ComboHits, p2ComboHits);
  const isP1Combo = p1ComboHits >= p2ComboHits;

  return (
    <div
      id="modern-combat-hud-root"
      className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-3 sm:p-5 overflow-hidden font-sans"
    >
      {/* ========================================================================= */}
      {/* TOP COMBAT BAR: P1 Health, Round Timer, P2 Health, Settings Gear          */}
      {/* ========================================================================= */}
      <div className="relative w-full flex items-start justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* PLAYER 1 LIFEBAR & IDENTITY (Left) */}
        <div className="flex-1 flex items-start gap-2 sm:gap-3 min-w-0">
          {/* Angled Portrait Box */}
          {p1AvatarUrl && (
            <div className="relative shrink-0 w-12 sm:w-16 h-12 sm:h-16 bg-black/95 border-2 border-pink-500 transform -skew-x-12 shadow-[0_0_15px_rgba(236,72,153,0.5)] overflow-hidden">
              <img
                src={p1AvatarUrl}
                alt={p1Name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'true';
                    target.src = '/characters/arjun.jpg';
                  }
                }}
                className="w-full h-full object-cover object-top scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          )}

          {/* Name & Slanted Health Bar */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            {/* Top Name Row */}
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-stone-900 border border-stone-600 rounded text-[10px] font-black text-pink-400">
                {p1ControllerBadge}
              </span>
              <span className="font-black italic uppercase text-base sm:text-xl text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate">
                {p1Name}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest hidden sm:inline">
                {p1SubLabel}
              </span>
            </div>

            {/* Slanted Parallelogram Health Bar */}
            <div className="relative w-full h-5 sm:h-6 bg-stone-950/95 border-2 border-stone-800 transform -skew-x-12 origin-left shadow-2xl overflow-hidden">
              {/* Ghost Damage Bar (trailing orange/yellow) */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 transition-all duration-500 ease-out z-10"
                style={{ width: `${p1GhostHp}%` }}
              />

              {/* White Impact Hit Flash */}
              {p1HitFlash && (
                <div
                  className="absolute inset-y-0 left-0 bg-white transition-all duration-75 z-15"
                  style={{ width: `${Math.max(p1HpPercent, p1GhostHp)}%` }}
                />
              )}

              {/* Primary Active Health Gradient */}
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${
                  p1HpPercent <= 25
                    ? 'from-red-600 via-rose-600 to-red-500 animate-pulse'
                    : 'from-pink-600 via-rose-500 to-amber-300'
                } transition-all duration-150 ease-out z-20 overflow-hidden shadow-[0_0_12px_rgba(236,72,153,0.6)]`}
                style={{ width: `${p1HpPercent}%` }}
              >
                {/* Specular gloss line */}
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-b from-white/40 to-transparent" />
              </div>
            </div>

            {/* Drive Gauge (6 segmented neon green blocks under lifebar) */}
            <div className="flex items-center gap-1 w-full max-w-[280px]">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = idx < activeP1Drive;
                const isLow = activeP1Drive <= 2;
                return (
                  <div
                    key={idx}
                    className={`flex-1 h-2 sm:h-2.5 rounded-xs transform -skew-x-12 border transition-all duration-200 ${
                      isFilled
                        ? isLow
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                          : 'bg-gradient-to-r from-emerald-400 to-green-500 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-stone-950/90 border-stone-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER ROUND TIMER & ROUND DOTS */}
        <div className="relative shrink-0 flex flex-col items-center justify-center px-2 sm:px-4">
          {/* Round win dots */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`w-2 h-2 rounded-full border border-pink-400 ${
                p1RoundsWon >= 1 ? 'bg-pink-500 shadow-[0_0_6px_#ec4899]' : 'bg-transparent'
              }`}
            />
            <span
              className={`w-2 h-2 rounded-full border border-pink-400 ${
                p1RoundsWon >= 2 ? 'bg-pink-500 shadow-[0_0_6px_#ec4899]' : 'bg-transparent'
              }`}
            />
            <span className="text-[9px] font-black uppercase text-stone-500 mx-1">VS</span>
            <span
              className={`w-2 h-2 rounded-full border border-cyan-400 ${
                p2RoundsWon >= 1 ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]' : 'bg-transparent'
              }`}
            />
            <span
              className={`w-2 h-2 rounded-full border border-cyan-400 ${
                p2RoundsWon >= 2 ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]' : 'bg-transparent'
              }`}
            />
          </div>

          {/* Large Digital SF6 Style Timer Number */}
          <div className="relative px-3 py-1 bg-black/90 border-2 border-stone-800 rounded-lg shadow-2xl flex items-center justify-center">
            <span
              className={`font-mono text-3xl sm:text-5xl font-black italic tracking-tighter leading-none ${
                roundTimer <= 10
                  ? 'text-red-500 animate-pulse drop-shadow-[0_0_12px_#ef4444]'
                  : 'text-purple-300 drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]'
              }`}
            >
              {roundTimer.toString().padStart(2, '0')}
            </span>
          </div>

          <span className="text-[8px] font-mono font-black uppercase tracking-widest text-stone-400 mt-1">
            ROUND {currentRound}
          </span>

          {/* Dynamic Street Fighter 6 / Tekken 8 Style Real-Time Combat Values Bar (Developer Debug Only: ADV, DIST, SCALE) */}
          {debugMode && (
            <div
              id="hud-combat-values-strip"
              className="mt-1.5 px-3 py-0.5 bg-black/90 backdrop-blur-md border border-amber-400/50 rounded-lg shadow-2xl flex items-center gap-2.5 font-mono text-[10px] text-stone-300 animate-fade-in pointer-events-none"
            >
              <div className="flex items-center gap-1">
                <span className="text-stone-400 font-black">ADV:</span>
                <span className={`font-black ${
                  (combatValues?.frameAdvantage ?? 0) > 0
                    ? 'text-emerald-400'
                    : (combatValues?.frameAdvantage ?? 0) < 0
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}>
                  {(combatValues?.frameAdvantage ?? 0) > 0 ? `+${combatValues?.frameAdvantage}F` : `${combatValues?.frameAdvantage ?? 0}F`}
                </span>
              </div>
              <div className="w-px h-2.5 bg-stone-700" />
              <div className="flex items-center gap-1">
                <span className="text-stone-400 font-black">DIST:</span>
                <span className="text-cyan-300 font-bold">{combatValues?.distance ? `${combatValues.distance}px` : '280px'}</span>
              </div>
              <div className="w-px h-2.5 bg-stone-700" />
              <div className="flex items-center gap-1">
                <span className="text-stone-400 font-black">SCALE:</span>
                <span className="text-amber-400 font-bold">{combatValues?.damageScaling ? `${Math.round(combatValues.damageScaling * 100)}%` : '100%'}</span>
              </div>
            </div>
          )}
        </div>

        {/* PLAYER 2 LIFEBAR & IDENTITY (Right) */}
        <div className="flex-1 flex items-start gap-2 sm:gap-3 flex-row-reverse min-w-0">
          {/* Angled Portrait Box */}
          {p2AvatarUrl && (
            <div className="relative shrink-0 w-12 sm:w-16 h-12 sm:h-16 bg-black/95 border-2 border-cyan-400 transform skew-x-12 shadow-[0_0_15px_rgba(6,182,212,0.5)] overflow-hidden">
              <img
                src={p2AvatarUrl}
                alt={p2Name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'true';
                    target.src = '/characters/General_Jonas_Steele_01.jpeg';
                  }
                }}
                className="w-full h-full object-cover object-top scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          )}

          {/* Name & Slanted Health Bar */}
          <div className="flex-1 flex flex-col items-end gap-1 min-w-0">
            {/* Top Name Row */}
            <div className="flex items-center gap-2 flex-row-reverse">
              <span className="w-5 h-5 flex items-center justify-center bg-stone-900 border border-stone-600 rounded text-[10px] font-black text-cyan-400">
                {p2ControllerBadge}
              </span>
              <span className="font-black italic uppercase text-base sm:text-xl text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate">
                {p2Name}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest hidden sm:inline">
                {p2SubLabel}
              </span>
            </div>

            {/* Slanted Parallelogram Health Bar (Mirrored) */}
            <div className="relative w-full h-5 sm:h-6 bg-stone-950/95 border-2 border-stone-800 transform skew-x-12 origin-right shadow-2xl overflow-hidden">
              {/* Ghost Damage Bar */}
              <div
                className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-600 via-amber-500 to-yellow-400 transition-all duration-500 ease-out z-10"
                style={{ width: `${p2GhostHp}%` }}
              />

              {/* White Impact Hit Flash */}
              {p2HitFlash && (
                <div
                  className="absolute inset-y-0 right-0 bg-white transition-all duration-75 z-15"
                  style={{ width: `${Math.max(p2HpPercent, p2GhostHp)}%` }}
                />
              )}

              {/* Primary Active Health Gradient */}
              <div
                className={`absolute inset-y-0 right-0 bg-gradient-to-l ${
                  p2HpPercent <= 25
                    ? 'from-red-600 via-rose-600 to-red-500 animate-pulse'
                    : 'from-blue-600 via-cyan-400 to-teal-300'
                } transition-all duration-150 ease-out z-20 overflow-hidden shadow-[0_0_12px_rgba(6,182,212,0.6)]`}
                style={{ width: `${p2HpPercent}%` }}
              >
                {/* Specular gloss line */}
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-b from-white/40 to-transparent" />
              </div>
            </div>

            {/* Drive Gauge (6 segmented neon green blocks under lifebar) */}
            <div className="flex items-center gap-1 w-full max-w-[280px] flex-row-reverse">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = idx < activeP2Drive;
                const isLow = activeP2Drive <= 2;
                return (
                  <div
                    key={idx}
                    className={`flex-1 h-2 sm:h-2.5 rounded-xs transform skew-x-12 border transition-all duration-200 ${
                      isFilled
                        ? isLow
                          ? 'bg-gradient-to-l from-amber-400 to-orange-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                          : 'bg-gradient-to-l from-emerald-400 to-green-500 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-stone-950/90 border-stone-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Modern SF6 / KOF XV Top Combat Control Cluster */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {/* Prominent Pause / Resume Button */}
          {onTogglePause && (
            <button
              id="btn-hud-toggle-pause"
              onClick={onTogglePause}
              className={`pointer-events-auto px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border font-mono text-[10px] sm:text-[11px] font-black tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
                isPaused
                  ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'bg-black/60 hover:bg-black/90 border-white/20 hover:border-amber-400 text-stone-200 hover:text-white'
              }`}
              title={isPaused ? 'Resume Battle (Space / ESC)' : 'Pause Battle (Space / ESC)'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current text-white" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
            </button>
          )}

          {/* Freeze Frame / Match Capture Button */}
          {onCaptureFreezeFrame && (
            <button
              id="btn-hud-freeze-frame"
              onClick={onCaptureFreezeFrame}
              className="pointer-events-auto px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-300 text-cyan-300 hover:text-white font-mono text-[10px] sm:text-[11px] font-black tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)] active:scale-95"
              title="Capture / Freeze Frame & Pose Inspector"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">CAPTURE</span>
            </button>
          )}

          {/* On-Screen Value / Combat Data Button (Developer Debug Only) */}
          {debugMode && onToggleCombatValues && (
            <button
              id="btn-hud-toggle-values"
              onClick={onToggleCombatValues}
              className={`pointer-events-auto px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl border font-mono text-[10px] sm:text-[11px] font-black tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
                showCombatValues
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-black/60 hover:bg-black/90 border-white/20 text-stone-400 hover:text-white'
              }`}
              title="Toggle Live Frame Advantage & Combat Values (VALUE)"
            >
              <Activity className={`w-3.5 h-3.5 ${showCombatValues ? 'text-amber-400 animate-pulse' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">VALUE</span>
            </button>
          )}

          {/* Volume / Audio Quick Toggle */}
          {onToggleMute && (
            <button
              id="btn-hud-toggle-sound"
              onClick={onToggleMute}
              className={`pointer-events-auto p-2 sm:p-2.5 rounded-xl bg-black/60 hover:bg-black/90 border transition-all cursor-pointer shadow-lg active:scale-95 ${
                isMuted
                  ? 'border-rose-500/60 text-rose-400'
                  : 'border-white/20 hover:border-emerald-400 text-stone-300 hover:text-white'
              }`}
              title={isMuted ? 'Combat Audio Muted (Click to Unmute)' : 'Combat Audio Active (Click to Mute)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          )}

          {/* Minimal Unobtrusive Settings Gear */}
          <button
            id="btn-hud-open-settings"
            onClick={onOpenSettings}
            className="pointer-events-auto p-2 sm:p-2.5 rounded-xl bg-black/60 hover:bg-black/90 border border-white/20 hover:border-amber-400 text-stone-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
            title="Battle Settings / Operational Controls (ESC)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MID-RIGHT COMBAT ALERTS (HITS, PUNISH COUNTER, CROSS-UP as in reference)  */}
      {/* ========================================================================= */}
      <div className="absolute top-[35%] right-6 sm:right-10 flex flex-col items-end gap-2 pointer-events-none z-30">
        {/* Dynamic Combo Counter */}
        {activeHits >= 2 && (
          <div className="flex items-baseline gap-2 font-mono drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-fade-in">
            <span
              className="text-6xl sm:text-7xl font-black italic tracking-tighter text-white"
              style={{
                textShadow: '0 0 20px rgba(0,0,0,0.9), 3px 3px 0 #000000',
                WebkitTextStroke: '1px #000000',
              }}
            >
              {activeHits}
            </span>
            <span
              className="text-3xl sm:text-4xl font-black italic tracking-wider text-amber-400 uppercase"
              style={{
                textShadow: '2px 2px 0 #000000, 0 0 10px rgba(245,158,11,0.6)',
              }}
            >
              HITS
            </span>
          </div>
        )}

        {/* PUNISH COUNTER BANNER (Warm Orange / Red with White Bold Text) */}
        {recentPunishCounter && (
          <div className="px-4 py-1.5 rounded bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 border border-amber-300 text-white font-black italic text-xs sm:text-sm uppercase tracking-wider shadow-2xl animate-pulse">
            ★ PUNISH COUNTER
          </div>
        )}

        {/* CROSS-UP PILL BANNER (Electric Blue / Cyan) */}
        {recentCrossUp && (
          <div className="px-3 py-1 rounded-full bg-cyan-600/90 border border-cyan-300 text-white font-black italic text-xs uppercase tracking-wider shadow-lg shadow-cyan-900/50">
            CROSS-UP
          </div>
        )}

        {/* FIRST ATTACK ALERT */}
        {recentFirstAttack && (
          <div className="px-3 py-0.5 rounded bg-red-950/80 border border-red-500 text-red-300 font-bold text-[10px] uppercase tracking-wider animate-bounce">
            FIRST ATTACK!
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM COMBAT CORNERS: Super Art Gauges (LV 0-3 in corners)                */}
      {/* ========================================================================= */}
      <div className="w-full flex items-end justify-between max-w-7xl mx-auto pointer-events-none">
        {/* Player 1 Super Art Gauge (Bottom Left) */}
        <FofSuperArtGauge
          isPlayer1={true}
          superMeter={p1SuperMeter}
          maxMeter={p1MaxMeter}
          meterStocks={p1MeterStocks}
          accentColor={p1AccentColor}
          fighterName={p1Name}
        />

        {/* Player 2 Super Art Gauge (Bottom Right) */}
        <FofSuperArtGauge
          isPlayer1={false}
          superMeter={p2SuperMeter}
          maxMeter={p2MaxMeter}
          meterStocks={p2MeterStocks}
          accentColor={p2AccentColor}
          fighterName={p2Name}
        />
      </div>
    </div>
  );
};
