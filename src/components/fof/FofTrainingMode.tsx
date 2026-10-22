import React, { useState } from 'react';
import { FOF_CHARACTERS } from '../../data/fightingMoves';
import { FofFighterStats } from '../../types/fighting';
import { soundFX } from '../../utils/audio';
import { FofHumanFighterSprite } from './FofHumanFighterSprite';
import { createFightingEntity } from '../../utils/fightingEngine';
import { Dumbbell, Play, Layers, Eye, EyeOff, Shield, Flame, Activity, Crosshair, Gauge, Keyboard, Film } from 'lucide-react';
import { FofControlMappingModal } from './FofControlMappingModal';
import { FofReplayTheaterModal } from './FofReplayTheaterModal';

interface FofTrainingModeProps {
  onSelectTrainingFighter: (fighter: FofFighterStats) => void;
  isHitboxOverlayEnabled?: boolean;
  onToggleHitboxOverlay?: (active: boolean) => void;
}

export const FofTrainingMode: React.FC<FofTrainingModeProps> = ({
  onSelectTrainingFighter,
  isHitboxOverlayEnabled,
  onToggleHitboxOverlay,
}) => {
  const characters = Object.values(FOF_CHARACTERS);
  const [selectedCharId, setSelectedCharId] = useState<string>('ignis');
  const [dummyAction, setDummyAction] = useState<'stand' | 'crouch' | 'guard' | 'counter'>('guard');
  const [isControlModalOpen, setIsControlModalOpen] = useState<boolean>(false);
  const [isReplayTheaterOpen, setIsReplayTheaterOpen] = useState<boolean>(false);

  // Hitbox Overlay Mode Toggle State
  const [hitboxOverlayMode, setHitboxOverlayMode] = useState<boolean>(() => {
    if (isHitboxOverlayEnabled !== undefined) return isHitboxOverlayEnabled;
    try {
      const saved = localStorage.getItem('fof_debug_hitbox_mode');
      return saved !== null ? saved === 'true' : true; // Default ON in Dojo Lab
    } catch {
      return true;
    }
  });

  const fighter = FOF_CHARACTERS[selectedCharId] || characters[0];

  const handleSelect = (id: string) => {
    soundFX.playClick();
    setSelectedCharId(id);
  };

  const handleToggleHitbox = () => {
    soundFX.playClick();
    const next = !hitboxOverlayMode;
    setHitboxOverlayMode(next);
    try {
      localStorage.setItem('fof_debug_hitbox_mode', String(next));
    } catch {
      // ignore
    }
    if (onToggleHitboxOverlay) {
      onToggleHitboxOverlay(next);
    }
    window.dispatchEvent(new CustomEvent('fof-toggle-hitbox-overlay', { detail: next }));
  };

  const handleLaunchDojo = () => {
    soundFX.playReadyFight();
    // Ensure hitbox mode setting is persisted for the canvas
    try {
      localStorage.setItem('fof_debug_hitbox_mode', String(hitboxOverlayMode));
    } catch {
      // ignore
    }
    onSelectTrainingFighter(fighter);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-mono select-none">
      {/* 1. Header & Quick Launch Bar */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            ARCADE DOJO // TRAINING & FRAME DATA LAB
          </span>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-tight">
            MOVE LISTS & HITBOX ANALYSIS
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Master frame data (startup/active/recovery), on-block frame advantage, and weapon attack range.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Keyboard Control Mapping Modal Button */}
          <button
            id="btn-dojo-control-mapping"
            onClick={() => {
              soundFX.playClick();
              setIsControlModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl border-2 border-amber-500/50 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-white font-black italic uppercase text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-amber-950/40"
            title="Configure and rebind keyboard controls for attacks and special moves"
          >
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span>CONTROL MAPPING</span>
          </button>

          {/* Match Replay Theater Modal Button */}
          <button
            id="btn-dojo-replay-theater"
            onClick={() => {
              soundFX.playClick();
              setIsReplayTheaterOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl border-2 border-red-500/50 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white font-black italic uppercase text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-red-950/40"
            title="Open Match Replay Theater to watch, analyze, or export recent matches"
          >
            <Film className="w-4 h-4 text-red-400" />
            <span>REPLAY THEATER</span>
          </button>

          {/* Direct Hitbox Overlay Mode Toggle */}
          <button
            id="btn-dojo-toggle-hitbox"
            onClick={handleToggleHitbox}
            className={`px-4 py-2.5 rounded-xl border-2 font-black italic uppercase text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg ${
              hitboxOverlayMode
                ? 'bg-purple-950/90 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)] ring-1 ring-purple-400/50'
                : 'bg-black/80 hover:bg-stone-900 border-white/20 text-gray-400 hover:text-white'
            }`}
          >
            {hitboxOverlayMode ? (
              <Eye className="w-4 h-4 text-purple-300 animate-pulse" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
            <span>HITBOX OVERLAY: {hitboxOverlayMode ? 'ACTIVE [ON]' : 'DISABLED [OFF]'}</span>
          </button>

          {/* Launch Practice Button */}
          <button
            id="btn-dojo-start-practice"
            onClick={handleLaunchDojo}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black italic uppercase text-xs rounded-xl shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            START DOJO PRACTICE {hitboxOverlayMode ? '(WITH HITBOXES)' : ''}
          </button>
        </div>
      </div>

      {/* 2. Hitbox Overlay Mode Explanatory Card */}
      <div className={`p-4 rounded-2xl border transition-all duration-200 ${
        hitboxOverlayMode
          ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-950/30'
          : 'bg-black/60 border-white/10 opacity-70'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider">
              DOJO LAB HITBOX & ATTACK RANGE SYSTEM
            </h3>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            hitboxOverlayMode ? 'bg-purple-900 text-purple-200 border border-purple-400' : 'bg-stone-800 text-gray-400'
          }`}>
            {hitboxOverlayMode ? 'RENDERS DIRECTLY ON STAGE CANVAS' : 'OVERLAY HIDDEN'}
          </span>
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-3 text-[11px]">
          <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-emerald-500/30">
            <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-emerald-300 text-[10px]">HURTBOX (GREEN)</div>
              <div className="text-[9px] text-gray-400 leading-tight">Head, Torso, Limbs</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-red-500/30">
            <span className="w-3 h-3 rounded bg-red-600/60 border border-red-500 shrink-0 animate-pulse" />
            <div>
              <div className="font-bold text-red-300 text-[10px]">STRIKE HITBOX (RED)</div>
              <div className="text-[9px] text-gray-400 leading-tight">Active attacking frame</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-blue-500/30">
            <span className="w-3 h-3 rounded bg-blue-500/40 border border-blue-400 shrink-0" />
            <div>
              <div className="font-bold text-blue-300 text-[10px]">GUARD BOX (BLUE)</div>
              <div className="text-[9px] text-gray-400 leading-tight">Blocks incoming hits</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-purple-500/30">
            <span className="w-3 h-3 rounded bg-purple-500/40 border border-purple-400 shrink-0" />
            <div>
              <div className="font-bold text-purple-300 text-[10px]">INVINCIBLE (PURPLE)</div>
              <div className="text-[9px] text-gray-400 leading-tight">Rolls & Super startup</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-amber-500/30 col-span-2 sm:col-span-1">
            <span className="w-3 h-3 rounded bg-amber-500/50 border border-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-amber-300 text-[10px]">RANGE RULER (AMBER)</div>
              <div className="text-[9px] text-gray-400 leading-tight">Measures reach in px</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Character Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {characters.map(char => (
          <button
            key={char.id}
            onClick={() => handleSelect(char.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
              selectedCharId === char.id
                ? 'border-red-500 bg-red-600/20 text-white shadow-lg ring-1 ring-red-500/50'
                : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {char.name.split(' ')[0]} ({char.element})
          </button>
        ))}
      </div>

      {/* 4. Moveset Table with Attack Range and Frame Data */}
      <div className="bg-black/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-20 bg-black/60 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
              <div className="scale-60">
                <FofHumanFighterSprite entity={createFightingEntity(fighter, true, 0)} isPlayer1={true} />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{fighter.faction}</span>
              <h3 className="text-base sm:text-lg font-black italic uppercase text-white">
                {fighter.name} Frame & Range Data
              </h3>
              <p className="text-xs text-yellow-400 font-bold">{fighter.signatureWeapon}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 text-[10px] uppercase font-bold">Dummy Stance:</span>
            {(['stand', 'crouch', 'guard', 'counter'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setDummyAction(mode)}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border transition-all cursor-pointer ${
                  dummyAction === mode
                    ? 'border-red-500 bg-red-600 text-white shadow'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Moves Table with Frame Data & Attack Range */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/60 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                <th className="p-3">Move Name</th>
                <th className="p-3">Command Input</th>
                <th className="p-3">Type</th>
                <th className="p-3">Damage</th>
                <th className="p-3">Attack Range</th>
                <th className="p-3">Frame Timeline (S/A/R)</th>
                <th className="p-3">On-Block Advantage</th>
                <th className="p-3">Meter</th>
                <th className="p-3">Tactical Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fighter.moves.map(move => {
                const totalFrames = move.startupFrames + move.activeFrames + move.recoveryFrames;
                const reachPx = Math.round(move.range * 1.35 + 35);
                const onBlockAdv = move.blockStun - (move.recoveryFrames + 1);

                return (
                  <tr key={move.id} className="hover:bg-white/5 transition-colors">
                    {/* Move Name */}
                    <td className="p-3 font-bold text-white whitespace-nowrap">
                      {move.name}
                    </td>

                    {/* Command Input */}
                    <td className="p-3 font-mono text-red-400 font-bold whitespace-nowrap">
                      {move.command}
                    </td>

                    {/* Move Type */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        move.type === 'SUPER'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : move.type === 'CLIMAX'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : move.type === 'SPECIAL'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-white/10 text-gray-300'
                      }`}>
                        {move.type}
                      </span>
                    </td>

                    {/* Damage */}
                    <td className="p-3 font-bold text-yellow-400 whitespace-nowrap">
                      {move.damage} DMG
                    </td>

                    {/* Attack Range Reach Gauge */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 w-28">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-amber-300">{reachPx}px</span>
                          <span className="text-gray-400 text-[9px]">
                            {reachPx < 200 ? 'Close' : reachPx < 320 ? 'Mid' : 'Long'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                            style={{ width: `${Math.min(100, (reachPx / 420) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Frame Timeline (Startup / Active / Recovery) */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 w-32 font-mono">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-amber-400">{move.startupFrames}f</span>
                          <span className="text-red-400">{move.activeFrames}f</span>
                          <span className="text-cyan-400">{move.recoveryFrames}f</span>
                          <span className="text-gray-400">({totalFrames}f)</span>
                        </div>
                        <div className="h-2 w-full bg-stone-800 rounded overflow-hidden flex border border-white/10">
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${(move.startupFrames / totalFrames) * 100}%` }}
                            title={`Startup: ${move.startupFrames}f`}
                          />
                          <div
                            className="h-full bg-red-600"
                            style={{ width: `${(move.activeFrames / totalFrames) * 100}%` }}
                            title={`Active: ${move.activeFrames}f`}
                          />
                          <div
                            className="h-full bg-cyan-600"
                            style={{ width: `${(move.recoveryFrames / totalFrames) * 100}%` }}
                            title={`Recovery: ${move.recoveryFrames}f`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* On-Block Advantage */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        onBlockAdv >= 0
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                          : onBlockAdv >= -4
                          ? 'bg-yellow-950 text-yellow-300 border border-yellow-500'
                          : 'bg-red-950 text-red-300 border border-red-500'
                      }`}>
                        {onBlockAdv > 0 ? `+${onBlockAdv}` : onBlockAdv}f {onBlockAdv >= 0 ? '(SAFE)' : onBlockAdv >= -4 ? '(SAFE)' : '(PUNISH)'}
                      </span>
                    </td>

                    {/* Meter Cost/Gain */}
                    <td className="p-3 text-gray-400 font-mono whitespace-nowrap">
                      {move.meterCost > 0 ? `-${move.meterCost} MP` : `+${move.meterGain} MP`}
                    </td>

                    {/* Description / Role */}
                    <td className="p-3 text-gray-400 text-[11px] max-w-xs">
                      {move.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Control Mapping Settings Modal */}
      <FofControlMappingModal
        isOpen={isControlModalOpen}
        onClose={() => setIsControlModalOpen(false)}
      />

      {/* Match Replay Theater Modal */}
      <FofReplayTheaterModal
        isOpen={isReplayTheaterOpen}
        onClose={() => setIsReplayTheaterOpen(false)}
      />
    </div>
  );
};
