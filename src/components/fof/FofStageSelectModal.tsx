import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FofStage } from '../../types/fighting';
import { INDIAN_CULTURE_STAGES } from '../../data/fightingMoves';
import { getStageVisual } from '../../data/stageBackgrounds';
import { soundFX } from '../../utils/audio';
import {
  Clock,
  Compass,
  Trees,
  Users,
  Sparkles,
  Shuffle,
  CheckCircle2,
  X,
  Volume2,
  ShieldAlert,
  Flame,
  Globe2,
  Eye,
} from 'lucide-react';

interface FofStageSelectModalProps {
  isOpen: boolean;
  currentStageId?: string;
  initialStageId?: string;
  onSelectStage: (stageId: string) => void;
  onClose?: () => void;
  autoCountdownSeconds?: number; // default 15
}

export const FofStageSelectModal: React.FC<FofStageSelectModalProps> = ({
  isOpen,
  currentStageId,
  initialStageId,
  onSelectStage,
  onClose,
  autoCountdownSeconds = 15,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    currentStageId || initialStageId || INDIAN_CULTURE_STAGES[0].id
  );
  const [timeLeft, setTimeLeft] = useState<number>(autoCountdownSeconds);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployingStageName, setDeployingStageName] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const selectedIdRef = useRef<string>(selectedId);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Handle stage selection with lock-in transition
  const handleConfirmStage = useCallback(
    (stageId: string) => {
      if (isDeploying) return;
      const stage = INDIAN_CULTURE_STAGES.find(s => s.id === stageId) || INDIAN_CULTURE_STAGES[0];
      setIsDeploying(true);
      setDeployingStageName(stage.name);
      soundFX.playReadyFight();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Brief cinematic delay for visual feedback before match launch
      setTimeout(() => {
        onSelectStage(stage.id);
      }, 750);
    },
    [isDeploying, onSelectStage]
  );

  // Random stage selection
  const handleRandomSelect = useCallback(() => {
    if (isDeploying) return;
    soundFX.playSuperFlash();
    const randomIndex = Math.floor(Math.random() * INDIAN_CULTURE_STAGES.length);
    const randomStage = INDIAN_CULTURE_STAGES[randomIndex];
    setSelectedId(randomStage.id);
    handleConfirmStage(randomStage.id);
  }, [handleConfirmStage, isDeploying]);

  // 15-second countdown timer management
  useEffect(() => {
    if (!isOpen) return;

    setIsDeploying(false);
    setDeployingStageName('');
    setTimeLeft(autoCountdownSeconds);
    startTimeRef.current = Date.now();

    const targetEndTime = Date.now() + autoCountdownSeconds * 1000;

    timerRef.current = setInterval(() => {
      const remainingMs = targetEndTime - Date.now();
      const remainingSec = Math.max(0, remainingMs / 1000);
      setTimeLeft(remainingSec);

      // Audio tick every full second
      if (Math.floor(remainingSec) < 5 && Math.floor(remainingSec) > 0) {
        // Warning sound when timer is critically low
        soundFX.playClick();
      }

      // Auto countdown expiration: Randomly choose a stage and start!
      if (remainingMs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        const randomIndex = Math.floor(Math.random() * INDIAN_CULTURE_STAGES.length);
        const autoChosenStage = INDIAN_CULTURE_STAGES[randomIndex];
        setSelectedId(autoChosenStage.id);
        handleConfirmStage(autoChosenStage.id);
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, autoCountdownSeconds, handleConfirmStage]);

  if (!isOpen) return null;

  const currentSelectedStage =
    INDIAN_CULTURE_STAGES.find(s => s.id === selectedId) || INDIAN_CULTURE_STAGES[0];

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'TIME_CYCLE':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'SPACE_COSMOS':
        return <Globe2 className="w-4 h-4 text-indigo-400" />;
      case 'SPACE_OBSERVATORY':
        return <Compass className="w-4 h-4 text-rose-400" />;
      case 'FOREST_SACRED':
        return <Trees className="w-4 h-4 text-emerald-400" />;
      case 'GATHERING_UTSAV':
        return <Users className="w-4 h-4 text-orange-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'TIME_CYCLE':
        return 'TIME • कालचक्र';
      case 'SPACE_COSMOS':
        return 'SPACE • अन्तरिक्ष';
      case 'SPACE_OBSERVATORY':
        return 'SPACE • जन्तर मन्तर';
      case 'FOREST_SACRED':
        return 'FOREST • दण्डकारण्य';
      case 'GATHERING_UTSAV':
        return 'GATHERING • महाकुम्भ';
      default:
        return 'INDIAN HERITAGE';
    }
  };

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / autoCountdownSeconds) * 100));
  const isUrgent = timeLeft <= 5;

  return (
    <div
      id="fof-stage-select-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none"
    >
      {/* Background ambient lighting based on highlighted stage */}
      <div
        className={`absolute inset-0 opacity-25 bg-gradient-to-br ${currentSelectedStage.bgGradient} transition-all duration-700 pointer-events-none`}
      />

      <div className="relative w-full max-w-5xl bg-stone-950/95 border-2 border-amber-500/60 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden max-h-[92vh]">
        {/* Top Header with 15-Second Countdown Bar */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 p-4 sm:p-5 border-b border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shadow-lg">
                <Compass className="w-6 h-6 text-amber-400 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500">
                    SACRED BATTLEGROUND SELECTION
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold">
                    INDIAN CULTURAL ARENAS
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  Select an arena within 15 seconds, or combat will begin at a randomly chosen sacred realm.
                </p>
              </div>
            </div>

            {/* Countdown Badge & Optional Close */}
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 font-mono transition-all ${
                  isUrgent
                    ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                    : 'bg-stone-900/90 border-amber-500/60 text-amber-400 shadow-md'
                }`}
              >
                <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-400 animate-spin' : 'text-amber-400'}`} />
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-gray-400 uppercase leading-none">AUTO LOCK-IN</span>
                  <span className="text-base sm:text-lg font-black tracking-tight leading-tight">
                    {timeLeft.toFixed(1)}s
                  </span>
                </div>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                  aria-label="Close stage selection"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Smooth Depleting Countdown Progress Bar */}
          <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-white/10 relative">
            <div
              className={`h-full transition-all duration-100 ease-linear rounded-full ${
                isUrgent
                  ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-400'
                  : 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Deploying Interstitial Overlay */}
        {isDeploying && (
          <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-amber-400 tracking-widest uppercase">
                // TELEPORTING TO ARENA //
              </span>
              <h3 className="text-2xl font-black text-white italic tracking-wider">
                {deployingStageName}
              </h3>
            </div>
          </div>
        )}

        {/* Main Content Area: Stages Grid & Detail Inspector */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 5 Stages Selection Cards (Left 7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-2.5">
            <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>// 5 SACRED REALMS OF BHARAT (WITH ARENA BACKDROPS)</span>
              <span className="text-amber-400 font-bold">CLICK CARD TO PREVIEW</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {INDIAN_CULTURE_STAGES.map((stage, idx) => {
                const isSelected = stage.id === selectedId;
                const visual = getStageVisual(stage.id);
                return (
                  <div
                    key={stage.id}
                    onClick={() => {
                      soundFX.playClick();
                      setSelectedId(stage.id);
                    }}
                    className={`group relative p-2.5 sm:p-3 rounded-xl border-2 transition-all cursor-pointer select-none overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-950/90 via-stone-900 to-stone-950 border-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.4)] translate-x-1.5'
                        : 'bg-stone-900/70 hover:bg-stone-900 border-white/10 hover:border-amber-500/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    {/* Ambient Stage Gradient Strip */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${stage.bgGradient} opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none`}
                    />

                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Background Image Thumbnail of the Arena Location */}
                        <div className="relative w-24 sm:w-32 h-16 sm:h-20 rounded-lg overflow-hidden shrink-0 border border-white/20 group-hover:border-amber-400 shadow-md">
                          <img
                            src={visual.thumbnailUrl}
                            alt={visual.altText}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                          
                          {/* Number Index Badge */}
                          <div
                            className={`absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                              isSelected
                                ? 'bg-amber-500 text-black shadow'
                                : 'bg-black/75 text-gray-300'
                            }`}
                          >
                            0{idx + 1}
                          </div>

                          {/* Quick Motif Tag */}
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono font-bold text-amber-300">
                            {stage.culturalCategory?.split('_')[0]}
                          </div>
                        </div>

                        {/* Title & Theme Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-black italic tracking-wide text-white truncate">
                              {stage.name}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs font-sans font-bold text-amber-300">
                              {stage.sanskritName}
                            </span>
                            <span className="text-[10px] text-gray-500">•</span>
                            <div className="flex items-center gap-1 text-[10px] text-gray-300 font-mono">
                              {getCategoryIcon(stage.culturalCategory)}
                              <span>{getCategoryLabel(stage.culturalCategory)}</span>
                            </div>
                          </div>

                          {/* Visual Motif Highlight */}
                          <div className="text-[10px] text-gray-400 font-mono mt-1 truncate">
                            <span className="text-amber-400/80">Motif: </span>
                            <span>{visual.keyVisualMotif}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Select Trigger */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleConfirmStage(stage.id);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-black uppercase italic tracking-wider transition-all shrink-0 cursor-pointer shadow-md ${
                          isSelected
                            ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/30 active:scale-95'
                            : 'bg-white/10 hover:bg-amber-500 hover:text-black text-white'
                        }`}
                      >
                        {isSelected ? 'DEPLOY' : 'CHOOSE'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Inspector for Selected Stage (Right 5 Cols) */}
          <div className="lg:col-span-5 bg-stone-900/90 border border-white/15 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
            {/* Visual Atmospheric Glow */}
            <div
              className={`absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br ${currentSelectedStage.bgGradient} blur-3xl opacity-60 pointer-events-none`}
            />

            <div className="space-y-3.5 relative z-10">
              {/* Category Pill & Sanskrit Name */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                  {getCategoryIcon(currentSelectedStage.culturalCategory)}
                  <span>{getCategoryLabel(currentSelectedStage.culturalCategory)}</span>
                </div>
                <span className="text-sm font-sans font-black text-amber-400">
                  {currentSelectedStage.sanskritName}
                </span>
              </div>

              {/* Large Widescreen Panoramic Stage Background Image */}
              {(() => {
                const activeVisual = getStageVisual(currentSelectedStage.id);
                return (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.35)] group/backdrop">
                    <img
                      src={activeVisual.imageUrl}
                      alt={activeVisual.altText}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover/backdrop:scale-105 transition-transform duration-700"
                    />
                    {/* Vignette Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10 pointer-events-none" />

                    {/* Motif & Ambient Tag */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-amber-400/60 text-amber-300 text-[10px] font-mono font-bold shadow-lg">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{activeVisual.keyVisualMotif}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[9px] font-mono font-black uppercase">
                        2.5D ARENA
                      </div>
                    </div>

                    {/* Bottom Stage Banner */}
                    <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                      <div>
                        <span className="text-[9px] font-mono text-amber-300 uppercase tracking-widest block font-bold">
                          // LOCATION BACKDROP
                        </span>
                        <h4 className="text-base sm:text-lg font-black italic uppercase text-white drop-shadow-md">
                          {currentSelectedStage.name.split(':')[0]}
                        </h4>
                      </div>
                      <span className="text-xs font-sans font-black text-amber-300 drop-shadow">
                        {currentSelectedStage.sanskritName}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Cultural Relation / Heritage Lore */}
              <div className="p-3 bg-black/60 border border-amber-500/30 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>INDIAN CULTURAL HERITAGE</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed font-sans">
                  {currentSelectedStage.culturalRelation}
                </p>
              </div>

              {/* Environmental Overview */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  // ARENA ATMOSPHERE
                </span>
                <p className="text-xs text-stone-400 leading-relaxed">
                  {currentSelectedStage.description}
                </p>
              </div>

              {/* Music / Audio Mood */}
              {currentSelectedStage.musicMood && (
                <div className="flex items-center gap-2 text-xs text-amber-200/90 font-mono bg-white/5 p-2 rounded-lg border border-white/10">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{currentSelectedStage.musicMood}</span>
                </div>
              )}
            </div>

            {/* Stage Action Controls */}
            <div className="pt-3 border-t border-white/10 space-y-2 mt-3 relative z-10">
              <button
                id="btn-confirm-stage"
                onClick={() => handleConfirmStage(currentSelectedStage.id)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black italic uppercase tracking-wider text-sm rounded-xl shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 fill-black text-amber-400" />
                DEPLOY TO {currentSelectedStage.name.split(':')[0]}
              </button>

              <button
                id="btn-random-stage"
                onClick={handleRandomSelect}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 border border-white/20 hover:border-amber-400 text-stone-200 hover:text-white font-mono font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                RANDOM CHOOSE & START MATCH
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-2.5 bg-black/80 border-t border-white/10 text-center text-[10px] font-mono text-gray-400 flex items-center justify-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>
            15-Second Automated Rule: If no selection is made before time expires, the match will automatically deploy to a randomly chosen Indian cultural battleground.
          </span>
        </div>
      </div>
    </div>
  );
};
