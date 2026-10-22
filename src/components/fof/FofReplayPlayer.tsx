import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MatchReplayData, ReplayFrame } from '../../types/replay';
import { FOF_CHARACTERS } from '../../data/fightingMoves';
import { createFightingEntity } from '../../utils/fightingEngine';
import { getStageVisual } from '../../data/stageBackgrounds';
import { getFighterPortrait } from '../../data/characterAvatars';
import { FofHumanFighterSprite } from './FofHumanFighterSprite';
import { saveReplay, getSavedReplays, exportReplayAsJson } from '../../utils/replayManager';
import { soundFX } from '../../utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Repeat,
  Download,
  Bookmark,
  BookmarkCheck,
  X,
  Trophy,
  Flame,
  Swords,
  Clock,
  Activity,
  Image as ImageIcon,
  Sparkles,
  Zap,
} from 'lucide-react';

interface FofReplayPlayerProps {
  replay: MatchReplayData;
  onClose: () => void;
}

const ARENA_WIDTH = 1000;

export const FofReplayPlayer: React.FC<FofReplayPlayerProps> = ({ replay, onClose }) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.25, 0.5, 1, 2
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [spriteStyle, setSpriteStyle] = useState<'artwork' | 'vector'>('artwork');
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    const saved = getSavedReplays();
    return saved.some(r => r.id === replay.id);
  });
  const [activeSparks, setActiveSparks] = useState<{ id: string; x: number; y: number; text?: string; isCrit?: boolean }[]>([]);

  const totalFrames = replay.frames.length;
  const currentFrame: ReplayFrame = replay.frames[currentFrameIndex] || replay.frames[0];

  // Base fighters
  const p1Base = FOF_CHARACTERS[replay.p1Character.id] || FOF_CHARACTERS.arjun;
  const p2Base = FOF_CHARACTERS[replay.p2Character.id] || FOF_CHARACTERS.steele;

  const stageVisual = getStageVisual(replay.stageId, replay.customBgUrl);

  // Maintain fighting entities for rendering sprites
  const p1Entity = useMemo(() => {
    const ent = createFightingEntity(p1Base, true);
    ent.x = currentFrame.p1.x;
    ent.y = currentFrame.p1.y;
    ent.hp = currentFrame.p1.hp;
    ent.superMeter = currentFrame.p1.superMeter;
    ent.state = currentFrame.p1.state;
    ent.facing = currentFrame.p1.facing;
    ent.isBlocking = currentFrame.p1.isBlocking;
    ent.isMaxMode = currentFrame.p1.isMaxMode;
    return ent;
  }, [p1Base, currentFrame.p1]);

  const p2Entity = useMemo(() => {
    const ent = createFightingEntity(p2Base, false);
    ent.x = currentFrame.p2.x;
    ent.y = currentFrame.p2.y;
    ent.hp = currentFrame.p2.hp;
    ent.superMeter = currentFrame.p2.superMeter;
    ent.state = currentFrame.p2.state;
    ent.facing = currentFrame.p2.facing;
    ent.isBlocking = currentFrame.p2.isBlocking;
    ent.isMaxMode = currentFrame.p2.isMaxMode;
    return ent;
  }, [p2Base, currentFrame.p2]);

  // Handle frame progression
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return;

    // Normal FPS is 30, so base interval is ~33.3ms
    const intervalMs = Math.max(10, Math.round(33.3 / playbackSpeed));

    const timer = setInterval(() => {
      setCurrentFrameIndex(prev => {
        if (prev >= totalFrames - 1) {
          if (isLooping) {
            return 0;
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, totalFrames, playbackSpeed, isLooping]);

  // Handle combat event sparks
  useEffect(() => {
    if (currentFrame.events && currentFrame.events.length > 0) {
      currentFrame.events.forEach(ev => {
        const id = `spk_${Date.now()}_${Math.random()}`;
        setActiveSparks(prev => [...prev.slice(-6), { id, x: ev.x, y: ev.y, text: ev.text, isCrit: ev.isCrit }]);
        setTimeout(() => {
          setActiveSparks(prev => prev.filter(s => s.id !== id));
        }, 500);
      });
    }
  }, [currentFrameIndex, currentFrame.events]);

  // Keyboard shortcuts for VCR review
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIndex(p => Math.max(0, p - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIndex(p => Math.min(totalFrames - 1, p + 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalFrames, onClose]);

  const handleSaveReplay = () => {
    soundFX.playClick();
    const success = saveReplay(replay);
    if (success) setIsSaved(true);
  };

  const handleExport = () => {
    soundFX.playClick();
    exportReplayAsJson(replay);
  };

  const p1Portrait = getFighterPortrait({
    id: replay.p1Character.id,
    avatarUrl: replay.p1Character.avatarUrl,
  });
  const p2Portrait = getFighterPortrait({
    id: replay.p2Character.id,
    avatarUrl: replay.p2Character.avatarUrl,
  });

  const p1HpPercent = Math.max(0, Math.min(100, (currentFrame.p1.hp / replay.maxHp) * 100));
  const p2HpPercent = Math.max(0, Math.min(100, (currentFrame.p2.hp / replay.maxHp) * 100));

  const currentTimeSeconds = (currentFrameIndex / (replay.fps || 30)).toFixed(1);
  const totalDurationSeconds = replay.durationSeconds.toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col font-mono select-none overflow-hidden animate-fade-in">
      {/* 1. Header Toolbar */}
      <header className="p-3 bg-stone-950/90 border-b border-red-600/30 flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="px-2 py-0.5 bg-red-950/80 border border-red-500 rounded text-red-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            REPLAY THEATER
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black italic uppercase text-white truncate flex items-center gap-2">
              <span>{replay.title}</span>
              {replay.isPreset && (
                <span className="px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-400/60 rounded text-[9px] text-yellow-300 font-mono not-italic font-bold">
                  ★ SHOWCASE
                </span>
              )}
            </h2>
            <p className="text-[10px] text-gray-400 truncate">
              Stage: <span className="text-gray-200">{stageVisual.keyVisualMotif || stageVisual.altText}</span> • {new Date(replay.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Picture / Vector Sprite Toggle */}
          <button
            onClick={() => {
              soundFX.playClick();
              setSpriteStyle(s => (s === 'artwork' ? 'vector' : 'artwork'));
            }}
            className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-emerald-400 text-gray-300 hover:text-emerald-300 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            title="Toggle Fighter Artwork vs Articulated Vector Rig"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{spriteStyle === 'artwork' ? 'PICTURE SPRITE' : 'VECTOR RIG'}</span>
          </button>

          {/* Bookmark / Save to Library */}
          <button
            onClick={handleSaveReplay}
            disabled={isSaved}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
              isSaved
                ? 'bg-amber-950/70 border-amber-500/60 text-amber-300 cursor-default'
                : 'bg-stone-900 hover:bg-amber-950/80 border-stone-700 hover:border-amber-400 text-gray-300 hover:text-amber-300'
            }`}
            title={isSaved ? 'Match Saved in Replay Library' : 'Save Replay to Library'}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" /> : <Bookmark className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{isSaved ? 'SAVED' : 'SAVE REPLAY'}</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExport}
            className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-blue-400 text-gray-300 hover:text-blue-300 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export Replay as JSON"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">EXPORT</span>
          </button>

          {/* Close Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-600 text-red-300 hover:text-white rounded-lg transition-all cursor-pointer"
            title="Close Replay (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Replay Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between">
        {/* Background Artwork Layer */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url(${stageVisual.imageUrl || stageVisual.thumbnailUrl})`,
              filter: 'brightness(0.85) contrast(1.1)',
            }}
          />
          {/* Subtle combat grid & lighting */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/70" />
        </div>

        {/* Combat Top HUD: Health & Super Meters */}
        <div className="relative z-20 max-w-5xl w-full mx-auto p-3 sm:p-4 space-y-2 pointer-events-none">
          {/* Fighter Badges & Health Bars */}
          <div className="flex items-center justify-between gap-4">
            {/* Player 1 Health Gauge */}
            <div className="flex-1 flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-red-500/80 bg-black shadow-lg shrink-0">
                <img
                  src={p1Portrait}
                  alt={replay.p1Character.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-200">
                  <span className="uppercase text-white tracking-wider flex items-center gap-1">
                    {replay.p1Character.name}
                    {replay.winner === 'p1' && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                  </span>
                  <span className="font-mono text-[11px] text-red-400">{currentFrame.p1.hp} HP</span>
                </div>
                <div className="h-3 w-full bg-black/80 rounded border border-stone-600/80 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-75"
                    style={{ width: `${p1HpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Round Timer Badge */}
            <div className="px-3 py-1 bg-black/90 border-2 border-amber-500/80 rounded-xl text-center shadow-xl shrink-0">
              <span className="text-xl sm:text-2xl font-black italic text-amber-400 font-mono leading-none block">
                {currentFrame.roundTimer}
              </span>
              <span className="text-[8px] text-gray-400 uppercase font-bold tracking-widest">
                ROUND TIMER
              </span>
            </div>

            {/* Player 2 Health Gauge */}
            <div className="flex-1 flex items-center gap-3 flex-row-reverse">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-500/80 bg-black shadow-lg shrink-0">
                <img
                  src={p2Portrait}
                  alt={replay.p2Character.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="flex-1 space-y-1 text-right">
                <div className="flex items-center justify-between flex-row-reverse text-xs font-bold text-gray-200">
                  <span className="uppercase text-white tracking-wider flex items-center gap-1 flex-row-reverse">
                    {replay.p2Character.name}
                    {replay.winner === 'p2' && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                  </span>
                  <span className="font-mono text-[11px] text-blue-400">{currentFrame.p2.hp} HP</span>
                </div>
                <div className="h-3 w-full bg-black/80 rounded border border-stone-600/80 overflow-hidden relative flex justify-end">
                  <div
                    className="h-full bg-gradient-to-l from-blue-600 to-cyan-400 transition-all duration-75"
                    style={{ width: `${p2HpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Input Telemetry Columns (Left & Right Sides) */}
        <div className="relative z-20 px-4 flex justify-between pointer-events-none">
          {/* P1 Input Stream */}
          <div className="bg-black/75 border border-red-500/40 rounded-xl p-2.5 max-w-[140px] text-left space-y-1 backdrop-blur-sm shadow-xl">
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest block border-b border-white/10 pb-1">
              P1 LIVE INPUTS
            </span>
            <div className="flex flex-wrap gap-1 min-h-[22px] items-center">
              {currentFrame.p1.inputs.length > 0 ? (
                currentFrame.p1.inputs.map((inp, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 bg-red-950/90 border border-red-500 text-red-200 text-[10px] font-bold rounded">
                    {inp}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-gray-500 italic">NEUTRAL</span>
              )}
            </div>
            {currentFrame.p1.moveName && (
              <span className="text-[10px] text-yellow-400 font-bold uppercase truncate block pt-0.5">
                ⚡ {currentFrame.p1.moveName}
              </span>
            )}
            {currentFrame.p1.isMaxMode && (
              <span className="text-[9px] text-purple-300 bg-purple-950/80 px-1 rounded border border-purple-500 block text-center font-bold">
                MAX MODE ON
              </span>
            )}
          </div>

          {/* P2 Input Stream */}
          <div className="bg-black/75 border border-blue-500/40 rounded-xl p-2.5 max-w-[140px] text-right space-y-1 backdrop-blur-sm shadow-xl">
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block border-b border-white/10 pb-1">
              P2 LIVE INPUTS
            </span>
            <div className="flex flex-wrap justify-end gap-1 min-h-[22px] items-center">
              {currentFrame.p2.inputs.length > 0 ? (
                currentFrame.p2.inputs.map((inp, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 bg-blue-950/90 border border-blue-500 text-blue-200 text-[10px] font-bold rounded">
                    {inp}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-gray-500 italic">NEUTRAL</span>
              )}
            </div>
            {currentFrame.p2.moveName && (
              <span className="text-[10px] text-cyan-300 font-bold uppercase truncate block pt-0.5">
                ⚡ {currentFrame.p2.moveName}
              </span>
            )}
          </div>
        </div>

        {/* 3. Fighters Display Stage */}
        <div className="relative w-full h-[320px] sm:h-[380px] pointer-events-none">
          {/* Ground surface line */}
          <div className="absolute bottom-4 left-0 right-0 h-1 bg-white/10 border-b border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]" />

          {/* Player 1 Sprite */}
          <div
            className="absolute transition-transform duration-75"
            style={{
              left: `${(currentFrame.p1.x / ARENA_WIDTH) * 100}%`,
              bottom: `${currentFrame.p1.y + 16}px`,
              transform: `translateX(-50%) scaleX(${currentFrame.p1.facing})`,
            }}
          >
            <div className="relative flex flex-col items-center">
              {currentFrame.p1.isBlocking && (
                <span className="absolute -top-4 text-[9px] font-mono font-bold text-blue-300 bg-black/90 px-1 border border-blue-400 z-20 rounded">
                  BLOCKING
                </span>
              )}
              <FofHumanFighterSprite
                entity={p1Entity}
                isPlayer1={true}
                renderModeStyle={spriteStyle}
              />
            </div>
          </div>

          {/* Player 2 Sprite */}
          <div
            className="absolute transition-transform duration-75"
            style={{
              left: `${(currentFrame.p2.x / ARENA_WIDTH) * 100}%`,
              bottom: `${currentFrame.p2.y + 16}px`,
              transform: `translateX(-50%) scaleX(${currentFrame.p2.facing})`,
            }}
          >
            <div className="relative flex flex-col items-center">
              {currentFrame.p2.isBlocking && (
                <span className="absolute -top-4 text-[9px] font-mono font-bold text-blue-300 bg-black/90 px-1 border border-blue-400 z-20 rounded">
                  BLOCKING
                </span>
              )}
              <FofHumanFighterSprite
                entity={p2Entity}
                isPlayer1={false}
                renderModeStyle={spriteStyle}
              />
            </div>
          </div>

          {/* Dynamic Hit Sparks and Floating Damage Numbers */}
          {activeSparks.map(spark => (
            <div
              key={spark.id}
              className="absolute pointer-events-none z-30 flex flex-col items-center animate-bounce"
              style={{
                left: `${(spark.x / ARENA_WIDTH) * 100}%`,
                bottom: `${spark.y + 30}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="w-8 h-8 rounded-full bg-yellow-400/80 blur-[2px] animate-ping" />
              {spark.text && (
                <span className="px-2 py-0.5 bg-black/90 border border-yellow-400 text-yellow-300 font-black text-xs rounded-lg shadow-xl uppercase -mt-4">
                  {spark.text}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 4. Bottom VCR Floating Scrubbing & Playback Controller */}
        <div className="relative z-30 p-3 sm:p-4 bg-stone-950/95 border-t border-white/10 shadow-2xl backdrop-blur-md space-y-2">
          {/* Progress Timeline Scrubber */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span className="flex items-center gap-1 text-gray-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {currentTimeSeconds}s / {totalDurationSeconds}s
              </span>
              <span className="font-bold text-yellow-400">
                FRAME {currentFrameIndex + 1} / {totalFrames}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(0, totalFrames - 1)}
              value={currentFrameIndex}
              onChange={e => {
                setIsPlaying(false);
                setCurrentFrameIndex(Number(e.target.value));
              }}
              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400"
            />
          </div>

          {/* VCR Interactive Buttons Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Speed & Loop options */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase hidden sm:inline">
                SPEED:
              </span>
              {[0.25, 0.5, 1, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    playbackSpeed === speed
                      ? 'bg-red-600 text-white shadow'
                      : 'bg-stone-900 text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  {speed}x
                </button>
              ))}

              <button
                onClick={() => setIsLooping(l => !l)}
                className={`p-1.5 rounded transition-all cursor-pointer border ${
                  isLooping
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                    : 'bg-stone-900 border-white/5 text-gray-500 hover:text-white'
                }`}
                title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Core Playback Buttons */}
            <div className="flex items-center gap-2">
              {/* Reset to Start */}
              <button
                onClick={() => setCurrentFrameIndex(0)}
                className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-gray-300 hover:text-white cursor-pointer transition-all active:scale-95"
                title="Restart from Frame 0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Step Back 1 Frame */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentFrameIndex(p => Math.max(0, p - 1));
                }}
                className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-gray-300 hover:text-white cursor-pointer transition-all active:scale-95"
                title="Step Backward 1 Frame (Left Arrow)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Main Play / Pause Button */}
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black italic uppercase text-xs tracking-wider shadow-lg flex items-center gap-1.5 cursor-pointer transition-all transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              {/* Step Forward 1 Frame */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentFrameIndex(p => Math.min(totalFrames - 1, p + 1));
                }}
                className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-gray-300 hover:text-white cursor-pointer transition-all active:scale-95"
                title="Step Forward 1 Frame (Right Arrow)"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Match Quick Stats */}
            <div className="text-[10px] text-gray-400 hidden lg:flex items-center gap-3 font-mono">
              <span>Max Combo: <strong className="text-yellow-400">P1 {replay.maxComboP1} / P2 {replay.maxComboP2}</strong></span>
              <span>Total Dmg: <strong className="text-red-400">P1 {replay.totalDamageP1} / P2 {replay.totalDamageP2}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
