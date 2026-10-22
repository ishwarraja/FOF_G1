import React, { useState } from 'react';
import {
  Camera,
  Play,
  StepForward,
  Eye,
  EyeOff,
  Download,
  X,
  Crosshair,
  Shield,
  Zap,
  Activity,
  Maximize2,
} from 'lucide-react';
import { FightingEntity } from '../../types/fighting';

interface FofFreezeFrameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onStepFrame?: () => void;
  p1Entity: FightingEntity;
  p2Entity: FightingEntity;
  stageName?: string;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  onTakeScreenshot: () => void;
}

export const FofFreezeFrameModal: React.FC<FofFreezeFrameModalProps> = ({
  isOpen,
  onClose,
  onResume,
  onStepFrame,
  p1Entity,
  p2Entity,
  stageName = 'Kala Chakra: Sun Temple of Time',
  isDebugMode,
  onToggleDebugMode,
  onTakeScreenshot,
}) => {
  const [isMinimalView, setIsMinimalView] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCapture = () => {
    onTakeScreenshot();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  // If minimal view is active, render only a small unobtrusive pill at the top
  if (isMinimalView) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-4">
        {/* Top Minimal Controller Pill */}
        <div className="pointer-events-auto mx-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-cyan-500/50 shadow-2xl text-white font-mono text-xs animate-fade-in">
          <div className="flex items-center gap-2 pr-3 border-r border-stone-700">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-black uppercase tracking-wider text-cyan-400">FREEZE FRAME MODE</span>
          </div>

          {onStepFrame && (
            <button
              onClick={onStepFrame}
              className="p-1.5 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Advance 1 Frame"
            >
              <StepForward className="w-3.5 h-3.5 text-amber-400" />
              <span>+1 FRAME</span>
            </button>
          )}

          <button
            onClick={handleCapture}
            className="p-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Download Clean Screenshot"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>CAPTURE</span>
          </button>

          <button
            onClick={() => setIsMinimalView(false)}
            className="p-1.5 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Expand Full Inspector UI"
          >
            <Maximize2 className="w-3.5 h-3.5 text-stone-400" />
            <span>INSPECTOR</span>
          </button>

          <button
            onClick={onResume}
            className="p-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Resume Combat"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>RESUME</span>
          </button>
        </div>

        {/* Bottom Tip */}
        <div className="text-center text-[11px] font-mono text-white/70 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          Clean Screenshot Mode Active // Click "INSPECTOR" to view frame data and hitbox settings
        </div>
      </div>
    );
  }

  return (
    <div
      id="freeze-frame-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-zinc-950/95 border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_35px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-900/50 bg-gradient-to-r from-cyan-950/80 via-zinc-950 to-blue-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black italic uppercase tracking-wider text-white">
                  MATCH CAPTURE // FREEZE FRAME
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[10px] font-mono font-bold">
                  PAUSED
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono">
                Stage: {stageName} &bull; 60 FPS Combat Telemetry & Pose Analysis
              </p>
            </div>
          </div>

          <button
            id="btn-close-freeze-frame"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 transition-all cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
          {/* Quick Action Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Resume Button */}
            <button
              id="btn-freeze-resume"
              onClick={onResume}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>RESUME FIGHT</span>
            </button>

            {/* Step +1 Frame */}
            {onStepFrame && (
              <button
                id="btn-freeze-step-frame"
                onClick={onStepFrame}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-400 text-amber-300 hover:text-white font-black uppercase tracking-wider shadow transition-all cursor-pointer active:scale-95"
              >
                <StepForward className="w-4 h-4 text-amber-400" />
                <span>STEP +1 FRAME</span>
              </button>
            )}

            {/* Clean View Mode */}
            <button
              id="btn-freeze-clean-view"
              onClick={() => setIsMinimalView(true)}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-cyan-400 text-stone-200 hover:text-white font-black uppercase tracking-wider shadow transition-all cursor-pointer active:scale-95"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>CLEAN VIEW</span>
            </button>

            {/* Take Clean Screenshot */}
            <button
              id="btn-freeze-download-capture"
              onClick={handleCapture}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black uppercase tracking-wider shadow transition-all cursor-pointer active:scale-95 ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-950/50'
              }`}
            >
              {downloadSuccess ? (
                <>
                  <Download className="w-4 h-4 animate-bounce" />
                  <span>SAVED!</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>SAVE SCREENSHOT</span>
                </>
              )}
            </button>
          </div>

          {/* Hitbox & Visual Inspector Toggles */}
          <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-stone-200">Hitbox & Collision Visualization</span>
              <span className="text-[10px] text-stone-500 hidden sm:inline">
                (Displays Active Hurtboxes & Attack Vectors)
              </span>
            </div>
            <button
              id="btn-freeze-toggle-hitboxes"
              onClick={onToggleDebugMode}
              className={`px-3 py-1.5 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDebugMode
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-black/60 border-stone-700 text-stone-400 hover:text-white'
              }`}
            >
              {isDebugMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isDebugMode ? 'HITBOXES: ON' : 'HITBOXES: OFF'}</span>
            </button>
          </div>

          {/* Active Fighters Combat Poses & Frame Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Player 1: General Jonas Steele */}
            <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-700/80 space-y-2">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  <span className="font-black text-sm text-white uppercase">{p1Entity.character?.name || 'General Jonas Steele'}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-950/60 text-pink-300 border border-pink-700/50">
                  PLAYER 1
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-500 block">Current Action:</span>
                  <span className="font-bold text-amber-300">{p1Entity.state}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Move Active:</span>
                  <span className="font-bold text-cyan-300">{p1Entity.currentMove?.name || 'None (Neutral)'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">World Position:</span>
                  <span className="font-mono text-stone-300">X: {Math.round(p1Entity.x)} / Y: {Math.round(p1Entity.y)}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Facing Direction:</span>
                  <span className="font-mono text-stone-300">{p1Entity.facing === 1 ? 'Right →' : 'Left ←'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Health:</span>
                  <span className="font-mono text-emerald-400 font-bold">{p1Entity.hp} / {p1Entity.maxHp} HP</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Super Meter:</span>
                  <span className="font-mono text-cyan-400 font-bold">{p1Entity.superMeter} / {p1Entity.maxMeter}</span>
                </div>
              </div>
            </div>

            {/* Player 2: Valeria Unit-0 */}
            <div className="p-3.5 rounded-xl bg-stone-900/80 border border-cyan-800/60 space-y-2">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="font-black text-sm text-white uppercase">{p2Entity.character?.name || 'Valeria Unit-0'}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-700/50">
                  PLAYER 2 (CPU)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-500 block">Current Action:</span>
                  <span className="font-bold text-amber-300">{p2Entity.state}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Move Active:</span>
                  <span className="font-bold text-cyan-300">{p2Entity.currentMove?.name || 'None (Neutral)'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">World Position:</span>
                  <span className="font-mono text-stone-300">X: {Math.round(p2Entity.x)} / Y: {Math.round(p2Entity.y)}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Facing Direction:</span>
                  <span className="font-mono text-stone-300">{p2Entity.facing === 1 ? 'Right →' : 'Left ←'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Health:</span>
                  <span className="font-mono text-emerald-400 font-bold">{p2Entity.hp} / {p2Entity.maxHp} HP</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Super Meter:</span>
                  <span className="font-mono text-cyan-400 font-bold">{p2Entity.superMeter} / {p2Entity.maxMeter}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Combat Spacing & Frame Advantage Strip */}
          <div className="p-3 rounded-xl bg-black/60 border border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-stone-400">Inter-Fighter Distance:</span>
              <span className="font-bold text-white font-mono">{Math.round(Math.abs(p1Entity.x - p2Entity.x))} px</span>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-stone-400">P1 Guard Status:</span>
              <span className="font-bold text-white">{p1Entity.isBlocking ? 'Blocking' : 'Open'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-stone-400">Invincibility:</span>
              <span className="font-bold text-white">{p1Entity.isInvincible ? 'P1 ACTIVE' : (p2Entity.isInvincible ? 'P2 ACTIVE' : 'NONE')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            Press ESC or Space to resume fight &bull; Click "Clean View" for full-screen inspection
          </span>
          <button
            onClick={onResume}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Resume
          </button>
        </div>
      </div>
    </div>
  );
};
