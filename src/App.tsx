import React, { useState, useCallback } from 'react';
import { FOF_CHARACTERS, FOF_BOSSES, FOF_STAGES } from './data/fightingMoves';
import { STORY_CAMPAIGN_ACTS, StoryChapter } from './data/storyArcs';
import { FofMatchState, FofFighterStats, CombatControlScenario } from './types/fighting';
import { FofStageCanvas } from './components/fof/FofStageCanvas';
import { FofWebConsoleController } from './components/fof/FofWebConsoleController';
import { FofTeamSelect } from './components/fof/FofTeamSelect';
import { FofRosterIntroScreen } from './components/fof/FofRosterIntroScreen';
import { FofStoryMode } from './components/fof/FofStoryMode';
import { FofTrainingMode } from './components/fof/FofTrainingMode';
import { FofCodexRoster } from './components/fof/FofCodexRoster';
import { FofUnitTestConsole } from './components/fof/FofUnitTestConsole';
import { FofDriveSyncModal } from './components/fof/FofDriveSyncModal';
import { FofLiveMatchmakingConsole } from './components/fof/FofLiveMatchmakingConsole';
import { FofReplayTheaterModal } from './components/fof/FofReplayTheaterModal';
import { soundFX } from './utils/audio';
import {
  Swords,
  BookOpen,
  Dumbbell,
  Users,
  Terminal,
  Volume2,
  VolumeX,
  Trophy,
  Flame,
  RotateCcw,
  Cloud,
  Radio,
  Sliders,
  Sparkles,
  Play,
  RefreshCw,
  Film,
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'intro' | 'arena' | 'team_select' | 'story' | 'training' | 'matchmaking' | 'codex' | 'tests'>('intro');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [unlockedActs, setUnlockedActs] = useState<string[]>(['act_1']);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [cpuDifficulty, setCpuDifficulty] = useState<number>(3);
  const [activeStoryChapter, setActiveStoryChapter] = useState<StoryChapter | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isReplayTheaterOpen, setIsReplayTheaterOpen] = useState<boolean>(false);
  const [hitboxOverlayEnabled, setHitboxOverlayEnabled] = useState<boolean>(false);

  // Match State - Default initialized with FOF v2.0 Resistance vs Hegemony roster
  const [matchState, setMatchState] = useState<FofMatchState>(() => ({
    mode: 'ARCADE_3V3',
    p1Team: [FOF_CHARACTERS.steele, FOF_CHARACTERS.arjun, FOF_CHARACTERS.elena],
    p2Team: [FOF_BOSSES.valeria, FOF_CHARACTERS.david, FOF_CHARACTERS.maya],
    p1CurrentIndex: 0,
    p2CurrentIndex: 0,
    p1Wins: 0,
    p2Wins: 0,
    currentRound: 1,
    roundTimer: 60,
    stageBg: 'from-amber-950 via-stone-900 to-black',
    stageId: 'stage_kala_chakra_time',
    stageName: 'Kala Chakra: Sun Temple of Time',
    winner: null,
    isMatchOver: false,
  }));

  const [p1PerfectRounds, setP1PerfectRounds] = useState<number>(0);

  const toggleSound = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  const handleInputHistoryAdd = useCallback((cmd: string) => {
    setInputHistory(prev => [cmd, ...prev.slice(0, 15)]);
  }, []);

  const handleRoundFinish = useCallback((winner: 'p1' | 'p2' | 'draw', isPerfect?: boolean) => {
    if (winner === 'p1' && isPerfect) {
      setP1PerfectRounds(c => c + 1);
    }

    // Safely unlock story progress outside state updater
    if (winner === 'p1' && activeStoryChapter) {
      const nextActNum = parseInt(activeStoryChapter.id.replace('act_', '')) + 1;
      const nextActId = `act_${nextActNum}`;
      setUnlockedActs(curr => [...new Set([...curr, nextActId])]);
    }

    setMatchState(prev => {
      let nextP1Wins = prev.p1Wins;
      let nextP2Wins = prev.p2Wins;
      let nextP1Idx = prev.p1CurrentIndex;
      let nextP2Idx = prev.p2CurrentIndex;

      if (winner === 'p1') {
        nextP1Wins += 1;
        nextP2Idx += 1; // P2 next fighter enters
      } else if (winner === 'p2') {
        nextP2Wins += 1;
        nextP1Idx += 1; // P1 next fighter enters
      } else {
        // Draw: both advance
        nextP1Idx += 1;
        nextP2Idx += 1;
      }

      // Check if match is won
      const isP1TeamDefeated = nextP1Idx >= prev.p1Team.length;
      const isP2TeamDefeated = nextP2Idx >= prev.p2Team.length;

      if (isP1TeamDefeated || isP2TeamDefeated) {
        const overallWinner = isP2TeamDefeated ? 'p1' : 'p2';
        return {
          ...prev,
          p1Wins: nextP1Wins,
          p2Wins: nextP2Wins,
          winner: overallWinner,
          isMatchOver: true,
        };
      }

      return {
        ...prev,
        p1Wins: nextP1Wins,
        p2Wins: nextP2Wins,
        p1CurrentIndex: nextP1Idx,
        p2CurrentIndex: nextP2Idx,
        currentRound: prev.currentRound + 1,
        roundTimer: 60,
      };
    });
  }, [activeStoryChapter]);

  const handleStartMatch = (
    p1Team: FofFighterStats[],
    p2Team: FofFighterStats[],
    stageId: string,
    format: '3v3_TEAM' | '1v1_SINGLE' = '3v3_TEAM',
    scenario: CombatControlScenario = 'USER_VS_CPU',
    cpuDiff: number = 3
  ) => {
    const stage = FOF_STAGES.find(s => s.id === stageId);
    setP1PerfectRounds(0);
    setCpuDifficulty(cpuDiff);
    setMatchState({
      mode: format === '1v1_SINGLE' ? '1v1_SINGLE' : 'ARCADE_3V3',
      controlScenario: scenario,
      p1Team,
      p2Team,
      p1CurrentIndex: 0,
      p2CurrentIndex: 0,
      p1Wins: 0,
      p2Wins: 0,
      currentRound: 1,
      roundTimer: 60,
      stageBg: stage ? stage.bgGradient : 'from-amber-950 via-stone-900 to-black',
      stageId: stage?.id || 'stage_pyros',
      stageName: stage?.name || 'Pyros Foundry',
      winner: null,
      isMatchOver: false,
    });
    setActiveStoryChapter(null);
    setActiveTab('arena');
  };

  const handleStartStoryBattle = (chapter: StoryChapter) => {
    const stage = FOF_STAGES.find(s => s.id === chapter.stageId);
    setP1PerfectRounds(0);
    setActiveStoryChapter(chapter);
    setMatchState({
      mode: 'STORY_ACT',
      p1Team: chapter.playerTeam,
      p2Team: chapter.enemyTeam,
      p1CurrentIndex: 0,
      p2CurrentIndex: 0,
      p1Wins: 0,
      p2Wins: 0,
      currentRound: 1,
      roundTimer: 60,
      stageBg: stage ? stage.bgGradient : 'from-purple-950 via-stone-900 to-black',
      winner: null,
      isMatchOver: false,
    });
    setActiveTab('arena');
  };

  const handleSelectTrainingFighter = (fighter: FofFighterStats) => {
    setP1PerfectRounds(0);
    setMatchState({
      mode: 'TRAINING',
      p1Team: [fighter],
      p2Team: [FOF_CHARACTERS.valeria],
      p1CurrentIndex: 0,
      p2CurrentIndex: 0,
      p1Wins: 0,
      p2Wins: 0,
      currentRound: 1,
      roundTimer: 60,
      stageBg: 'from-slate-950 via-zinc-900 to-black',
      winner: null,
      isMatchOver: false,
    });
    setActiveTab('arena');
  };

  const handleResetMatch = () => {
    soundFX.playReadyFight();
    setP1PerfectRounds(0);
    setMatchState(prev => ({
      ...prev,
      p1CurrentIndex: 0,
      p2CurrentIndex: 0,
      p1Wins: 0,
      p2Wins: 0,
      currentRound: 1,
      roundTimer: 60,
      winner: null,
      isMatchOver: false,
    }));
  };

  const currentP1Fighter = matchState.p1Team[matchState.p1CurrentIndex] || matchState.p1Team[0];

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Arcade Navigation Bar - Hidden during active combat arena for unobstructed cinematic viewport */}
      {activeTab !== 'arena' && (
        <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b-2 border-red-600/40 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/40">
              <Swords className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black italic tracking-tighter text-white uppercase flex items-center gap-1.5">
                  <span className="text-red-500">FATE</span> OF <span className="text-amber-400">FIGHTERS</span>
                </h1>
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-red-950 border border-red-700 text-red-300 font-bold uppercase rounded">
                  FOF v2.0.0 // LIVE CONSOLE
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono hidden sm:block">
                3v3 Tactical Arcade System • The Manufactured Collapse Narrative
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('intro');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'intro'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/40 ring-1 ring-amber-400/50'
                  : 'text-amber-400 hover:text-white hover:bg-amber-950/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              INTRO ROSTER
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('arena');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'arena'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              ARENA
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('team_select');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'team_select'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              CHARACTER SELECT
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('story');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'story'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              STORY MODE
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('training');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'training'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              DOJO LAB
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('matchmaking');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'matchmaking'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/40'
                  : 'text-amber-400 hover:text-white hover:bg-amber-950/40'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              MATCHMAKING // ORCHESTRATOR
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('codex');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'codex'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              CODEX
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('tests');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'tests'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              TEST SUITE
            </button>

            <button
              id="btn-nav-replay-theater"
              onClick={() => {
                soundFX.playClick();
                setIsReplayTheaterOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-300 hover:text-white"
              title="Open Match Replay Theater & Archives"
            >
              <Film className="w-3.5 h-3.5 text-red-400" />
              REPLAYS
            </button>
          </nav>

          {/* Audio & Cloud Persistence Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFX.playClick();
                setIsDriveModalOpen(true);
              }}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500 rounded-lg text-xs font-mono flex items-center gap-1.5 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Google Drive Cloud Sync"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">CLOUD SYNC</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </header>
      )}

      {/* Main App Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* VIEW 0: ARCADE ROSTER SHOWCASE & FIGHTER INTRO (Street Fighter / KOF Style) */}
        {activeTab === 'intro' && (
          <FofRosterIntroScreen
            onStartMatch={handleStartMatch}
            isMuted={isMuted}
            onToggleSound={toggleSound}
          />
        )}

        {/* VIEW 1: ACTIVE BATTLE ARENA */}
        {activeTab === 'arena' && (
          <div className="space-y-4">
            {/* Victory / Defeat Overlay Banner if match is over */}
            {matchState.isMatchOver && (
              <div className="bg-gradient-to-r from-red-950 via-black to-red-950 border-2 border-red-500 p-6 rounded-2xl text-center space-y-3 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <Trophy className="w-8 h-8 animate-bounce" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-wider text-white">
                  {matchState.winner === 'p1' ? 'VICTORY - MATCH WON!' : 'DEFEAT - OPPONENT TRIUMPHS!'}
                </h2>
                {p1PerfectRounds > 0 && matchState.winner === 'p1' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 border border-yellow-400/80 rounded-full text-yellow-300 font-mono font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                    ★ {p1PerfectRounds} PERFECT ROUND{p1PerfectRounds > 1 ? 'S' : ''} ACHIEVED! (+{(p1PerfectRounds * 5000).toLocaleString()} BONUS PTS)
                  </div>
                )}
                <p className="text-sm text-gray-300 font-mono">
                  {activeStoryChapter
                    ? `Story Chapter '${activeStoryChapter.actTitle}' completed!`
                    : 'FOF 3v3 team elimination concludes.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleResetMatch}
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black italic uppercase text-xs rounded-xl shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    REMATCH // PLAY AGAIN
                  </button>
                  <button
                    onClick={() => {
                      soundFX.playClick();
                      setActiveTab('intro');
                    }}
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-600 hover:border-amber-400 text-gray-200 hover:text-white font-bold uppercase text-xs rounded-xl shadow cursor-pointer flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-amber-400" />
                    ROSTER INTRO // NEW MATCH
                  </button>
                </div>
              </div>
            )}

            {/* 2D / 2.5D Real-time Fighting Canvas with Integrated Combat HUD */}
            <FofStageCanvas
              matchState={matchState}
              onMatchStateUpdate={setMatchState}
              onRoundFinish={handleRoundFinish}
              onRestartMatch={handleResetMatch}
              onStartMatch={() => handleResetMatch()}
              onNavigateToIntro={() => setActiveTab('intro')}
              onInputHistoryAdd={handleInputHistoryAdd}
              cpuDifficulty={cpuDifficulty}
              isTrainingMode={matchState.mode === 'TRAINING'}
              debugMode={hitboxOverlayEnabled}
              hitboxOverlayEnabled={hitboxOverlayEnabled}
              isHitboxOverlayEnabled={hitboxOverlayEnabled}
              onToggleHitboxOverlay={setHitboxOverlayEnabled}
            />

            {/* Virtual Web Console & Input Controller */}
            <FofWebConsoleController
              currentFighter={currentP1Fighter}
              onExecuteMove={(move) => {
                // Dispatch move
                const event = new CustomEvent('fof-player-move', { detail: move });
                window.dispatchEvent(event);
              }}
            />

            {/* Live Input Command Stream & Difficulty Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-black/70 border border-white/10 rounded-xl font-mono text-xs text-gray-400">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-red-400 font-bold uppercase text-[10px] shrink-0">
                  INPUT HISTORY:
                </span>
                <div className="flex items-center gap-1.5 truncate">
                  {inputHistory.map((cmd, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 bg-white/10 text-white text-[10px] rounded font-bold"
                    >
                      {cmd}
                    </span>
                  ))}
                  {inputHistory.length === 0 && <span className="text-gray-600">Awaiting commands...</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-gray-400 uppercase font-bold">CPU AI:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setCpuDifficulty(lvl)}
                      className={`w-6 h-6 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                        cpuDifficulty === lvl
                          ? 'border-red-500 bg-red-600 text-white'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FOF 3V3 TEAM SELECT */}
        {activeTab === 'team_select' && (
          <FofTeamSelect onStartMatch={handleStartMatch} />
        )}

        {/* VIEW 3: 4-ACT STORY MODE CAMPAIGN */}
        {activeTab === 'story' && (
          <FofStoryMode
            onStartStoryBattle={handleStartStoryBattle}
            unlockedActs={unlockedActs}
          />
        )}

        {/* VIEW 4: DOJO / TRAINING LAB */}
        {activeTab === 'training' && (
          <FofTrainingMode
            onSelectTrainingFighter={handleSelectTrainingFighter}
            isHitboxOverlayEnabled={hitboxOverlayEnabled}
            onToggleHitboxOverlay={setHitboxOverlayEnabled}
          />
        )}

        {/* VIEW 5: LIVE MATCHMAKING & ELO ORCHESTRATION CONSOLE */}
        {activeTab === 'matchmaking' && <FofLiveMatchmakingConsole />}

        {/* VIEW 6: CODEX ROSTER & LORE */}
        {activeTab === 'codex' && <FofCodexRoster />}

        {/* VIEW 7: AUTOMATED UNIT TEST CONSOLE */}
        {activeTab === 'tests' && <FofUnitTestConsole />}

        {/* GOOGLE DRIVE FOF SYNC MODAL */}
        <FofDriveSyncModal
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
        />

        {/* MATCH REPLAY THEATER MODAL */}
        <FofReplayTheaterModal
          isOpen={isReplayTheaterOpen}
          onClose={() => setIsReplayTheaterOpen(false)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-4 px-6 text-center text-xs text-gray-500 font-mono">
        <p>Fate of Fighters: The Manufactured Collapse • FOF Engine v2.0.0 • 60 FPS Real-time Web Canvas • Go/Redis Orchestration Console</p>
      </footer>
    </div>
  );
}

export default App;
