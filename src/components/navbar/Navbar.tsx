import React from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Swords, 
  Users, 
  Grid3X3, 
  Flame, 
  Anvil, 
  BookOpen, 
  Cloud, 
  Volume2, 
  VolumeX, 
  Coins, 
  Gem, 
  Zap, 
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const Navbar: React.FC = () => {
  const { 
    profile, 
    activeTab, 
    setActiveTab, 
    driveSyncStatus, 
    setIsDriveModalOpen,
    isMuted,
    toggleMute,
    resetGameProgress,
    battleState
  } = useGame();

  const navItems: {
    id: 'campaign' | 'roster' | 'formation' | 'arena' | 'forge' | 'codex';
    label: string;
    icon: any;
    badge?: string;
  }[] = [
    { id: 'campaign', label: 'Story Campaign', icon: Swords, badge: `${profile.campaignProgress.completedStageIds.length} Cleared` },
    { id: 'roster', label: 'FOF Roster', icon: Users, badge: `${profile.roster.length} Heroes` },
    { id: 'formation', label: 'Formation Matrix', icon: Grid3X3 },
    { id: 'arena', label: 'Battle Arena', icon: Flame },
    { id: 'forge', label: 'Ancient Forge', icon: Anvil },
    { id: 'codex', label: 'Lore & Crest', icon: BookOpen, badge: `${profile.shards.filter(s => s.isUnlocked).length}/6 Shards` },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/10 shadow-2xl">
      {/* Top Resource Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 text-xs">
        {/* Brand & Crest */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/5 border border-white/10 p-1 flex items-center justify-center relative skew-flair-subtle">
            <div className="w-full h-full bg-red-600 flex items-center justify-center text-white font-black italic text-base">
              F
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black italic tracking-tighter text-base sm:text-lg text-white uppercase leading-none">
                Fate of Fighters <span className="text-red-600">v0.1</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold text-gray-500 font-mono mt-0.5">
              <span>System: Build 0.1.04</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Region: Neo-Kyoto</span>
              <span className="text-red-500">[ Plot-Synced ]</span>
            </div>
          </div>
        </div>

        {/* Player Profile & Resources */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs font-mono">
          {/* Level */}
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-sm border border-white/10 text-white">
            <div className="w-2 h-2 rounded-none bg-red-600 animate-pulse" />
            <span className="font-bold uppercase tracking-wider text-[11px]">LVL {profile.level}</span>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-1.5 bg-white/5 text-amber-300 px-3 py-1 rounded-sm border border-white/10">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">{profile.gold.toLocaleString()}</span>
          </div>

          {/* Crystals */}
          <div className="flex items-center gap-1.5 bg-white/5 text-cyan-300 px-3 py-1 rounded-sm border border-white/10">
            <Gem className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold">{profile.crystals.toLocaleString()}</span>
          </div>

          {/* Stamina */}
          <div className="flex items-center gap-1.5 bg-white/5 text-emerald-400 px-3 py-1 rounded-sm border border-white/10">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>{profile.stamina}/{profile.maxStamina}</span>
          </div>

          {/* Google Drive Cloud Sync Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              setIsDriveModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono uppercase tracking-wider transition-all duration-200 border ${
              driveSyncStatus.connected
                ? 'bg-red-600/20 text-red-300 border-red-600/60 hover:bg-red-600 hover:text-white shadow-lg shadow-red-600/20'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-white/20'
            }`}
            title="Google Drive Cloud Save & Synchronization"
          >
            <Cloud className={`w-3.5 h-3.5 ${driveSyncStatus.connected ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
            <span>{driveSyncStatus.connected ? 'Drive Synced' : 'Cloud Sync'}</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-sm bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-red-600/50 transition-colors"
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-green-400" />}
          </button>

          {/* Reset progress */}
          <button
            onClick={() => {
              if (window.confirm('Reset all game progress back to default v0.1 draft?')) {
                resetGameProgress();
              }
            }}
            className="p-1.5 rounded-sm bg-white/5 border border-white/10 text-gray-500 hover:text-red-400 transition-colors"
            title="Reset Game Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab(item.id);
                }}
                disabled={battleState !== null && activeTab === 'battle'}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 relative ${
                  isActive
                    ? 'bg-white/10 text-white border-b-2 border-red-600 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-b-2 border-transparent'
                } ${battleState !== null && activeTab === 'battle' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-gray-500'}`} />
                <span className="italic">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 font-mono ${
                    isActive ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {battleState && (
            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('battle');
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-black italic tracking-wider whitespace-nowrap bg-red-600 text-white animate-pulse ml-auto shadow-lg shadow-red-600/30 transform skew-flair-subtle"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>BATTLE IN PROGRESS</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

