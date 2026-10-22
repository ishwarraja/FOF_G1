import React, { useState, useEffect, useRef } from 'react';
import { MatchReplayData } from '../../types/replay';
import {
  getSavedReplays,
  getLastMatchReplay,
  getPresetShowcaseReplays,
  deleteReplay,
  saveReplay,
  exportReplayAsJson,
  importReplayFromJson,
} from '../../utils/replayManager';
import { getFighterPortrait } from '../../data/characterAvatars';
import { getStageVisual } from '../../data/stageBackgrounds';
import { FofReplayPlayer } from './FofReplayPlayer';
import { soundFX } from '../../utils/audio';
import {
  Film,
  Play,
  Download,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Upload,
  Trophy,
  Clock,
  Swords,
  Search,
  X,
  Sparkles,
  Flame,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface FofReplayTheaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReplay?: MatchReplayData | null;
}

export const FofReplayTheaterModal: React.FC<FofReplayTheaterModalProps> = ({
  isOpen,
  onClose,
  initialReplay = null,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'saved' | 'showcase'>('all');
  const [savedReplays, setSavedReplays] = useState<MatchReplayData[]>([]);
  const [lastMatch, setLastMatch] = useState<MatchReplayData | null>(null);
  const [showcaseReplays, setShowcaseReplays] = useState<MatchReplayData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReplay, setActiveReplay] = useState<MatchReplayData | null>(initialReplay);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load replays
  const loadData = () => {
    setSavedReplays(getSavedReplays());
    setLastMatch(getLastMatchReplay());
    setShowcaseReplays(getPresetShowcaseReplays());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (initialReplay) {
        setActiveReplay(initialReplay);
      }
    }
  }, [isOpen, initialReplay]);

  // Listen for storage events
  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener('fof-replays-updated', handleUpdate);
    return () => window.removeEventListener('fof-replays-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  // Filtered lists
  const allReplays = [
    ...(lastMatch ? [lastMatch] : []),
    ...savedReplays.filter(r => r.id !== lastMatch?.id),
    ...showcaseReplays,
  ];

  const currentList =
    activeTab === 'saved'
      ? savedReplays
      : activeTab === 'showcase'
      ? showcaseReplays
      : allReplays;

  const filteredReplays = currentList.filter(rep => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      rep.title.toLowerCase().includes(query) ||
      rep.p1Character.name.toLowerCase().includes(query) ||
      rep.p2Character.name.toLowerCase().includes(query) ||
      rep.stageId.toLowerCase().includes(query)
    );
  });

  const handleWatch = (replay: MatchReplayData) => {
    soundFX.playClick();
    setActiveReplay(replay);
  };

  const handleSave = (replay: MatchReplayData) => {
    soundFX.playClick();
    saveReplay(replay);
    loadData();
  };

  const handleDelete = (id: string) => {
    soundFX.playClick();
    deleteReplay(id);
    loadData();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      const imported = importReplayFromJson(content);
      if (imported) {
        setUploadNotice(`Replay "${imported.title}" imported successfully!`);
        loadData();
        setTimeout(() => setUploadNotice(null), 3500);
      } else {
        setUploadNotice('Failed to import: Invalid replay file structure.');
        setTimeout(() => setUploadNotice(null), 3500);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-mono select-none animate-fade-in">
      {/* If a replay is active, render the full interactive Replay Player */}
      {activeReplay ? (
        <FofReplayPlayer
          replay={activeReplay}
          onClose={() => setActiveReplay(null)}
        />
      ) : (
        <div className="bg-stone-950 border-2 border-red-600/40 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* 1. Modal Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/60 via-stone-900 to-black border-b border-red-600/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600/20 border border-red-500 rounded-xl text-red-400">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest block">
                  COMBAT VAULT // REPLAY THEATER
                </span>
                <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tight flex items-center gap-2">
                  MATCH ARCHIVES & INPUT PLAYBACK
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Import JSON Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400 text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                title="Import Replay File (.json)"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">IMPORT REPLAY</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  soundFX.playClick();
                  onClose();
                }}
                className="p-2 bg-white/5 hover:bg-red-950/80 border border-white/10 hover:border-red-500 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
                title="Close Replay Theater"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Upload Notification Toast */}
          {uploadNotice && (
            <div className="bg-blue-950/90 border-y border-blue-500 text-blue-200 px-4 py-2 text-xs text-center font-bold animate-pulse">
              {uploadNotice}
            </div>
          )}

          {/* 2. Hero Card: Watch Last Match (if available) */}
          {lastMatch && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/40 via-stone-900 to-black border-b border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-red-500/80 bg-black shrink-0">
                    <img
                      src={getFighterPortrait({ id: lastMatch.p1Character.id, avatarUrl: lastMatch.p1Character.avatarUrl })}
                      alt={lastMatch.p1Character.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <span className="font-black text-gray-500 text-sm">VS</span>
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-blue-500/80 bg-black shrink-0">
                    <img
                      src={getFighterPortrait({ id: lastMatch.p2Character.id, avatarUrl: lastMatch.p2Character.avatarUrl })}
                      alt={lastMatch.p2Character.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-red-600/30 border border-red-500 rounded text-[9px] font-black text-red-300 uppercase">
                        MOST RECENT FIGHT
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {lastMatch.durationSeconds}s • {lastMatch.frames.length} frames
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {lastMatch.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleWatch(lastMatch)}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black italic uppercase text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all transform hover:scale-105 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>WATCH RECENT MATCH</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Search & Category Tabs Bar */}
          <div className="p-3 bg-black/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            {/* Category Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                ALL DUELS ({allReplays.length})
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab('saved');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'saved'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bookmark className="w-3 h-3 text-amber-400" />
                SAVED ARCHIVES ({savedReplays.length})
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab('showcase');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'showcase'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3 h-3 text-yellow-400" />
                SHOWCASE MATCHES ({showcaseReplays.length})
              </button>
            </div>

            {/* Search Field */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search fighter or stage..."
                className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          </div>

          {/* 4. Replay Cards Grid */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[55vh]">
            {filteredReplays.length === 0 ? (
              <div className="p-12 text-center space-y-2 border border-dashed border-white/10 rounded-xl">
                <Film className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-sm font-bold text-gray-400">NO MATCH REPLAYS FOUND</p>
                <p className="text-xs text-gray-600">
                  Complete a fight in Battle Arena or Training Mode to automatically record a replay.
                </p>
              </div>
            ) : (
              filteredReplays.map(replay => {
                const stage = getStageVisual(replay.stageId, replay.customBgUrl);
                const isItemSaved = savedReplays.some(r => r.id === replay.id);
                const p1Img = getFighterPortrait({ id: replay.p1Character.id, avatarUrl: replay.p1Character.avatarUrl });
                const p2Img = getFighterPortrait({ id: replay.p2Character.id, avatarUrl: replay.p2Character.avatarUrl });

                return (
                  <div
                    key={replay.id}
                    className="p-3.5 bg-black/60 hover:bg-stone-900 border border-white/10 hover:border-red-500/80 rounded-xl transition-all flex flex-wrap items-center justify-between gap-4 group"
                  >
                    {/* Left: Fighter Matchup Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center -space-x-2 shrink-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-red-500/80 bg-black">
                          <img
                            src={p1Img}
                            alt={replay.p1Character.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-blue-500/80 bg-black">
                          <img
                            src={p2Img}
                            alt={replay.p2Character.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                            {replay.title}
                          </h4>
                          {replay.isPreset && (
                            <span className="px-1.5 py-0.2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded text-[8px] font-black uppercase">
                              SHOWCASE
                            </span>
                          )}
                          {replay.isPerfect && (
                            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded text-[8px] font-black uppercase">
                              PERFECT
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="text-gray-300 font-bold">
                            Winner:{' '}
                            <strong className="text-amber-400">
                              {replay.winner === 'p1'
                                ? replay.p1Character.name
                                : replay.winner === 'p2'
                                ? replay.p2Character.name
                                : 'DRAW'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>{stage.keyVisualMotif || stage.altText}</span>
                          <span>•</span>
                          <span>{replay.durationSeconds}s ({replay.totalFrames} frames)</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Save to library */}
                      {!replay.isPreset && (
                        <button
                          onClick={() => handleSave(replay)}
                          disabled={isItemSaved}
                          className={`p-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer border ${
                            isItemSaved
                              ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                              : 'bg-stone-900 hover:bg-amber-950/80 border-stone-700 hover:border-amber-400 text-gray-300 hover:text-amber-300'
                          }`}
                          title={isItemSaved ? 'Saved in Archive' : 'Save to Archive'}
                        >
                          {isItemSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" /> : <Bookmark className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                      )}

                      {/* Export */}
                      <button
                        onClick={() => exportReplayAsJson(replay)}
                        className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-blue-400 text-gray-300 hover:text-blue-300 rounded-lg transition-all cursor-pointer"
                        title="Export JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete (only user saved replays) */}
                      {!replay.isPreset && isItemSaved && (
                        <button
                          onClick={() => handleDelete(replay.id)}
                          className="p-2 bg-stone-900 hover:bg-red-950/80 border border-stone-700 hover:border-red-500 text-gray-400 hover:text-red-300 rounded-lg transition-all cursor-pointer"
                          title="Delete Replay"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Watch Button */}
                      <button
                        onClick={() => handleWatch(replay)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black italic uppercase text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all transform active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>WATCH</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
