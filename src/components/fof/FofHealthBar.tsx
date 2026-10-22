import React, { useEffect, useState } from 'react';
import { Flame, Shield, Wind, Sparkles, Skull, Mountain, AlertTriangle } from 'lucide-react';

interface FofHealthBarProps {
  currentHp: number;
  maxHp: number;
  isPlayer1: boolean;
  fighterName: string;
  element: string;
  isMaxMode?: boolean;
  superMeter: number;
  maxMeter: number;
  meterStocks: number;
  accentColor?: string;
  playerLabel?: string;
  avatarUrl?: string;
  teamMembers?: { name: string; avatarUrl: string; isAlive: boolean; isCurrent: boolean }[];
}

export const FofHealthBar: React.FC<FofHealthBarProps> = ({
  currentHp,
  maxHp,
  isPlayer1,
  fighterName,
  element,
  isMaxMode = false,
  superMeter,
  maxMeter,
  meterStocks,
  accentColor = '#ef4444',
  playerLabel,
  avatarUrl,
  teamMembers,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  // Trailing ghost health bar for smooth arcade depletion
  const [ghostHpPercent, setGhostHpPercent] = useState<number>(hpPercent);
  const [hitFlash, setHitFlash] = useState<boolean>(false);

  useEffect(() => {
    // Flash white on hit
    setHitFlash(true);
    const flashTimer = setTimeout(() => setHitFlash(false), 120);

    // Delayed ghost bar depletion
    const ghostTimer = setTimeout(() => {
      setGhostHpPercent(hpPercent);
    }, 400);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(ghostTimer);
    };
  }, [hpPercent]);

  // Determine dynamic gradient color based on remaining health percentage
  let healthGradient = 'from-emerald-400 via-green-500 to-teal-500';
  let healthShadow = 'shadow-[0_0_12px_rgba(16,185,129,0.5)]';
  let statusTextColor = 'text-emerald-400';
  let healthStatusLabel = 'HEALTHY';

  if (hpPercent <= 20) {
    // Critical / Danger: Fiery red with pulse
    healthGradient = 'from-red-600 via-rose-600 to-red-700 animate-pulse';
    healthShadow = 'shadow-[0_0_18px_rgba(239,68,68,0.8)]';
    statusTextColor = 'text-red-400';
    healthStatusLabel = 'CRITICAL';
  } else if (hpPercent <= 40) {
    // Low: Orange to Red warning
    healthGradient = 'from-orange-400 via-amber-500 to-red-500';
    healthShadow = 'shadow-[0_0_14px_rgba(249,115,22,0.6)]';
    statusTextColor = 'text-orange-400';
    healthStatusLabel = 'WARNING';
  } else if (hpPercent <= 65) {
    // Medium: Lime to Yellow caution
    healthGradient = 'from-lime-400 via-yellow-400 to-amber-500';
    healthShadow = 'shadow-[0_0_12px_rgba(234,179,8,0.5)]';
    statusTextColor = 'text-yellow-400';
    healthStatusLabel = 'CAUTION';
  }

  // Render elemental icon
  const renderElemIcon = (elem: string) => {
    switch (elem) {
      case 'Fire':
        return <Flame className="w-3.5 h-3.5 text-orange-400 drop-shadow" />;
      case 'Ice':
        return <Shield className="w-3.5 h-3.5 text-cyan-400 drop-shadow" />;
      case 'Wind':
        return <Wind className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />;
      case 'Light':
        return <Sparkles className="w-3.5 h-3.5 text-yellow-300 drop-shadow" />;
      case 'Dark':
        return <Skull className="w-3.5 h-3.5 text-purple-400 drop-shadow" />;
      default:
        return <Mountain className="w-3.5 h-3.5 text-amber-500 drop-shadow" />;
    }
  };

  return (
    <div
      id={`fof-healthbar-${isPlayer1 ? 'p1' : 'p2'}`}
      className={`flex-1 flex ${isPlayer1 ? 'flex-row' : 'flex-row-reverse'} items-center gap-2 font-mono min-w-0`}
    >
      {/* Active Fighter Face Portrait in SF6 angled frame */}
      {avatarUrl && (
        <div
          className={`w-12 sm:w-14 h-12 sm:h-14 shrink-0 overflow-hidden relative bg-black/90 shadow-2xl border-2 transform ${
            isPlayer1 ? '-skew-x-6 border-pink-500 shadow-pink-900/60' : 'skew-x-6 border-cyan-400 shadow-cyan-900/60'
          }`}
        >
          <img
            src={avatarUrl}
            alt={fighterName}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="w-full h-full object-cover object-top transform scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          <span
            className={`absolute bottom-0.5 inset-x-0 text-center text-[8px] font-black uppercase tracking-wider ${
              isPlayer1 ? 'text-pink-300' : 'text-cyan-300'
            } drop-shadow`}
          >
            {playerLabel || (isPlayer1 ? '1P' : '2P')}
          </span>
        </div>
      )}

      {/* Main Bars Column */}
      <div className={`flex-1 flex flex-col ${isPlayer1 ? 'items-start' : 'items-end'} gap-1 w-full min-w-0`}>
        {/* Header Info: Name, Status, Element, SF6 Tag */}
        <div className={`flex items-center gap-2 ${isPlayer1 ? 'flex-row' : 'flex-row-reverse'} w-full`}>
          <div className={`flex items-center gap-1.5 ${isPlayer1 ? 'flex-row' : 'flex-row-reverse'}`}>
            <span
              className={`text-xs font-black uppercase px-1.5 py-0.5 rounded tracking-wider shadow-sm ${
                isPlayer1
                  ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-pink-500/50'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-500 text-white shadow-cyan-500/50'
              }`}
            >
              {playerLabel || (isPlayer1 ? '1P USER' : 'CPU')}
            </span>
            <span className="font-black italic uppercase text-sm sm:text-base text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate max-w-[150px] sm:max-w-[220px]">
              {fighterName}
            </span>
            {renderElemIcon(element)}
          </div>

          {isMaxMode && (
            <span className="text-[9px] px-2 py-0.5 bg-gradient-to-r from-amber-500 to-red-500 text-black font-black uppercase rounded tracking-wider animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]">
              DRIVE IMPACT
            </span>
          )}

          {hpPercent <= 20 && (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-red-950/90 border border-red-500 text-red-300 font-black rounded animate-bounce">
              <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
              DANGER
            </span>
          )}

          {/* Numerical Health readout */}
          <div className={`ml-auto ${isPlayer1 ? 'text-right' : 'text-left order-first'} text-[11px] font-black tracking-wider text-stone-300`}>
            <span className={hpPercent <= 20 ? 'text-red-400 font-extrabold' : 'text-white'}>{currentHp}</span>
            <span className="text-stone-500 text-[9px]"> / {maxHp}</span>
          </div>
        </div>

        {/* SF6 Slanted Parallelogram Healthbar */}
        <div
          className={`w-full h-6 sm:h-7 bg-black/95 border-2 border-stone-800 relative overflow-hidden shadow-2xl transform ${
            isPlayer1 ? '-skew-x-12 origin-left' : 'skew-x-12 origin-right'
          }`}
          style={{
            boxShadow: isPlayer1
              ? '0 0 16px rgba(236, 72, 153, 0.4)'
              : '0 0 16px rgba(6, 182, 212, 0.4)',
          }}
        >
          {/* Background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:10px_100%] z-0" />

          {/* 1. Ghost Damage Trail (Lags behind on hit with warm orange/red trail) */}
          <div
            className={`absolute inset-y-0 ${
              isPlayer1 ? 'left-0' : 'right-0'
            } bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 transition-all duration-700 ease-out z-10 opacity-90`}
            style={{ width: `${ghostHpPercent}%` }}
          />

          {/* 2. White Hit Flash */}
          {hitFlash && (
            <div
              className={`absolute inset-y-0 ${
                isPlayer1 ? 'left-0' : 'right-0'
              } bg-white transition-all duration-75 ease-out z-15`}
              style={{ width: `${Math.max(hpPercent, ghostHpPercent)}%` }}
            />
          )}

          {/* 3. Primary SF6 Health Bar: Pink gradient for P1, Blue gradient for P2 */}
          <div
            className={`absolute inset-y-0 ${
              isPlayer1 ? 'left-0' : 'right-0'
            } bg-gradient-to-r ${
              isPlayer1
                ? hpPercent <= 25
                  ? 'from-red-600 via-rose-600 to-red-500 animate-pulse'
                  : 'from-pink-500 via-rose-500 to-amber-400'
                : hpPercent <= 25
                ? 'from-red-600 via-rose-600 to-red-500 animate-pulse'
                : 'from-cyan-400 via-blue-500 to-indigo-500'
            } transition-all duration-200 ease-out z-20 overflow-hidden`}
            style={{ width: `${hpPercent}%` }}
          >
            {/* Top Gloss Specular Highlight Line */}
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
            {/* Diagonal Combat Stripes */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%,transparent)] bg-[size:12px_12px]" />
          </div>

          {/* Segment Tick Marks */}
          <div className="absolute inset-0 z-25 flex justify-between pointer-events-none px-1">
            <div className="w-[1px] h-full bg-black/60 ml-[25%]" />
            <div className="w-[2px] h-full bg-black/80" />
            <div className="w-[1px] h-full bg-black/60 mr-[25%]" />
          </div>
        </div>

        {/* Street Fighter 6 DRIVE GAUGE: 6 Segmented Blocks under Lifebar */}
        <div className={`flex items-center gap-1 w-full ${isPlayer1 ? 'justify-start' : 'justify-end'}`}>
          <span className="text-[9px] font-black italic tracking-widest text-emerald-400 mr-1 drop-shadow">
            DRIVE
          </span>
          <div className="flex items-center gap-1 flex-1 max-w-[280px]">
            {[0, 1, 2, 3, 4, 5].map((segIdx) => {
              // Drive gauge segments: 6 total
              const activeSegments = Math.ceil((currentHp / maxHp) * 6);
              const isFilled = segIdx < activeSegments;
              const isLow = activeSegments <= 2;
              return (
                <div
                  key={segIdx}
                  className={`flex-1 h-2 rounded-xs transform -skew-x-12 border transition-all duration-300 ${
                    isFilled
                      ? isLow
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                        : 'bg-gradient-to-r from-emerald-400 to-green-500 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                      : 'bg-stone-950/90 border-stone-800 shadow-inner'
                  }`}
                />
              );
            })}
          </div>
          {currentHp <= (maxHp * 0.2) && (
            <span className="text-[8px] font-extrabold text-red-400 animate-pulse ml-1">
              BURNOUT!
            </span>
          )}
        </div>

        {/* Team Members Lineup (3v3 format) */}
        {teamMembers && teamMembers.length > 1 && (
          <div className={`flex items-center gap-1.5 mt-0.5 ${isPlayer1 ? 'justify-start' : 'justify-end'}`}>
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mr-0.5">TEAM:</span>
            {teamMembers.map((member, mIdx) => (
              <div
                key={mIdx}
                className={`w-6 h-6 rounded-sm border overflow-hidden relative shadow-sm ${
                  member.isCurrent
                    ? isPlayer1
                      ? 'border-pink-400 ring-2 ring-pink-500/70 shadow-pink-500/50 scale-105'
                      : 'border-cyan-400 ring-2 ring-cyan-500/70 shadow-cyan-500/50 scale-105'
                    : member.isAlive
                    ? 'border-white/30 opacity-70 hover:opacity-100'
                    : 'border-red-900/50 opacity-30 grayscale'
                }`}
                title={`${member.name} (${member.isCurrent ? 'Active' : member.isAlive ? 'Standby' : 'KO'})`}
              >
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover object-top"
                />
                {!member.isAlive && (
                  <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center text-[9px] font-black text-red-400">
                    ✕
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
