import React, { useState, useEffect } from 'react';
import { FOF_CHARACTERS, FOF_BOSSES, FOF_STAGES, INDIAN_CULTURE_STAGES } from '../../data/fightingMoves';
import { getStageVisual } from '../../data/stageBackgrounds';
import { FofFighterStats, CombatControlScenario } from '../../types/fighting';
import { soundFX } from '../../utils/audio';
import { FofHumanFighterSprite } from './FofHumanFighterSprite';
import { createFightingEntity } from '../../utils/fightingEngine';
import { getFighterPortrait } from '../../data/characterAvatars';
import { CHARACTER_ICONS, normalizeCharacterId } from '../../utils/characterAssetLoader';
import { FofStageSelectModal } from './FofStageSelectModal';
import {
  Flame,
  Shield,
  Wind,
  Sparkles,
  Skull,
  Mountain,
  Play,
  Bot,
  User,
  Users,
  Shuffle,
  Volume2,
  VolumeX,
  Swords,
  Layers,
  ChevronRight,
  Zap,
  Info,
  Sliders,
  Check,
  CheckCircle2,
  Crosshair,
  Crown,
  Compass,
} from 'lucide-react';

interface FofRosterIntroScreenProps {
  onStartMatch: (
    p1Team: FofFighterStats[],
    p2Team: FofFighterStats[],
    stageId: string,
    format?: '3v3_TEAM' | '1v1_SINGLE',
    scenario?: CombatControlScenario,
    cpuDiff?: number
  ) => void;
  isMuted?: boolean;
  onToggleSound?: () => void;
}

/**
 * Production Character Splash Card with Dynamic Asset Binding:
 * 1. Primary: /assets/characters/[character_id]/select_slice.png
 * 2. Secondary: /assets/characters/[character_id]/portrait.png (or portrait.svg)
 * 3. Tertiary: fighter.customImageUrl or fighter.avatarUrl
 * 4. Fallback: stylized cel-shaded SVG vector silhouette (strictly purges low-poly faceted 3D primitives)
 */
const CharacterSelectSplashCard: React.FC<{
  fighter: FofFighterStats;
  isExpanded: boolean;
  isP1: boolean;
  isP2: boolean;
}> = ({ fighter, isExpanded, isP1, isP2 }) => {
  const [loadFailed, setLoadFailed] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  const normalized = normalizeCharacterId(fighter.id);
  const dedicatedIcon = CHARACTER_ICONS[normalized];

  const candidateUrls = [
    dedicatedIcon,
    `/assets/characters/${fighter.id}/select_slice.png`,
    `/assets/characters/${fighter.id}/portrait.png`,
    `/assets/characters/${fighter.id}/portrait.svg`,
    fighter.customImageUrl,
    fighter.avatarUrl,
  ].filter(Boolean) as string[];

  const currentUrl = candidateUrls[srcIndex];

  const handleImgError = () => {
    if (srcIndex + 1 < candidateUrls.length) {
      setSrcIndex(srcIndex + 1);
    } else {
      setLoadFailed(true);
    }
  };

  if (!loadFailed && currentUrl) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <img
          src={currentUrl}
          alt={fighter.name}
          referrerPolicy="no-referrer"
          onError={handleImgError}
          className={`w-full h-full object-cover object-center transition-all duration-700 ease-out filter drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] ${
            isExpanded
              ? 'scale-100 sm:scale-105 contrast-110 saturate-110'
              : 'scale-125 opacity-80 group-hover:scale-130 group-hover:opacity-100'
          }`}
        />
        {/* Dynamic bottom vignette for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
        {/* Soft color ambient wash */}
        <div
          className="absolute inset-0 mix-blend-overlay opacity-30 pointer-events-none"
          style={{ backgroundColor: fighter.accentColor }}
        />
      </div>
    );
  }

  // Clean stylized SVG vector silhouette fallback (strictly avoids low-poly 3D primitives)
  return (
    <div
      className={`transition-all duration-500 transform ${
        isExpanded
          ? 'scale-125 sm:scale-140 translate-y-2'
          : 'scale-90 opacity-70 group-hover:scale-95'
      }`}
    >
      <FofHumanFighterSprite
        entity={createFightingEntity(fighter, isP1, 0)}
        isPlayer1={isP1 || !isP2}
        renderModeStyle="vector"
      />
    </div>
  );
};

export const FofRosterIntroScreen: React.FC<FofRosterIntroScreenProps> = ({
  onStartMatch,
  isMuted = false,
  onToggleSound,
}) => {
  // Combine core characters and boss characters
  const allCharactersList: FofFighterStats[] = [
    ...Object.values(FOF_CHARACTERS),
    ...Object.values(FOF_BOSSES),
  ];

  // Match Format: 1v1 Single Duel vs 3v3 Team
  const [matchFormat, setMatchFormat] = useState<'3v3_TEAM' | '1v1_SINGLE'>('3v3_TEAM');

  // Combat Scenario: USER_VS_CPU, USER_VS_USER, CPU_VS_CPU
  const [controlScenario, setControlScenario] = useState<CombatControlScenario>('USER_VS_CPU');

  // Selected Stage (Defaults to Indian Culture Kala Chakra Time Temple)
  const [selectedStageId, setSelectedStageId] = useState<string>('stage_kala_chakra_time');

  // 15-second Stage Selection Modal state
  const [isStageModalOpen, setIsStageModalOpen] = useState<boolean>(false);
  const [pendingLaunchScenario, setPendingLaunchScenario] = useState<CombatControlScenario | null>(null);

  // CPU Difficulty (1 to 5)
  const [cpuDifficulty, setCpuDifficulty] = useState<number>(3);

  // Selected P1 Team
  const [p1TeamIds, setP1TeamIds] = useState<string[]>(['arjun', 'steele', 'elena']);

  // Selected P2 / CPU Team
  const [p2TeamIds, setP2TeamIds] = useState<string[]>(['david', 'maya', 'valeria']);

  // Active Hovered / Expanded Fighter ID
  const [activeFighterId, setActiveFighterId] = useState<string>('arjun');

  // Current Target Team Selection toggle ('p1' or 'p2')
  const [activeTargetTeam, setActiveTargetTeam] = useState<'p1' | 'p2'>('p1');

  // Match Start Splash Screen Animation
  const [isLaunchingMatch, setIsLaunchingMatch] = useState<boolean>(false);

  const maxTeamSize = matchFormat === '3v3_TEAM' ? 3 : 1;

  const currentFighter =
    allCharactersList.find(c => c.id === activeFighterId) || allCharactersList[0];

  // Adjust team picks when switching format
  const handleFormatChange = (fmt: '3v3_TEAM' | '1v1_SINGLE') => {
    soundFX.playClick();
    setMatchFormat(fmt);
    if (fmt === '1v1_SINGLE') {
      if (p1TeamIds.length > 1) setP1TeamIds([p1TeamIds[0]]);
      if (p2TeamIds.length > 1) setP2TeamIds([p2TeamIds[0]]);
    } else {
      if (p1TeamIds.length < 3) {
        const pool1 = allCharactersList.map(c => c.id).filter(id => !p1TeamIds.includes(id));
        setP1TeamIds([...p1TeamIds, ...pool1.slice(0, 3 - p1TeamIds.length)]);
      }
      if (p2TeamIds.length < 3) {
        const pool2 = allCharactersList.map(c => c.id).filter(id => !p2TeamIds.includes(id));
        setP2TeamIds([...p2TeamIds, ...pool2.slice(0, 3 - p2TeamIds.length)]);
      }
    }
  };

  const handlePickForP1 = (charId: string) => {
    soundFX.playClick();
    setActiveFighterId(charId);

    if (p1TeamIds.includes(charId)) {
      if (p1TeamIds.length > 1 || matchFormat === '3v3_TEAM') {
        setP1TeamIds(prev => prev.filter(id => id !== charId));
      }
    } else {
      if (p1TeamIds.length < maxTeamSize) {
        setP1TeamIds(prev => [...prev, charId]);
      } else {
        // Replace last or single
        if (maxTeamSize === 1) {
          setP1TeamIds([charId]);
        } else {
          setP1TeamIds(prev => [prev[1], prev[2], charId].filter(Boolean));
        }
      }
    }
  };

  const handlePickForP2 = (charId: string) => {
    soundFX.playClick();
    setActiveFighterId(charId);

    if (p2TeamIds.includes(charId)) {
      if (p2TeamIds.length > 1 || matchFormat === '3v3_TEAM') {
        setP2TeamIds(prev => prev.filter(id => id !== charId));
      }
    } else {
      if (p2TeamIds.length < maxTeamSize) {
        setP2TeamIds(prev => [...prev, charId]);
      } else {
        if (maxTeamSize === 1) {
          setP2TeamIds([charId]);
        } else {
          setP2TeamIds(prev => [prev[1], prev[2], charId].filter(Boolean));
        }
      }
    }
  };

  const handleRandomize = () => {
    soundFX.playWhoosh();
    const shuffled = [...allCharactersList].sort(() => Math.random() - 0.5);
    const count = maxTeamSize;
    const p1Picks = shuffled.slice(0, count).map(c => c.id);
    const remaining = shuffled.filter(c => !p1Picks.includes(c.id));
    const p2Picks = (remaining.length >= count ? remaining : shuffled).slice(0, count).map(c => c.id);

    setP1TeamIds(p1Picks);
    setP2TeamIds(p2Picks);
    if (p1Picks[0]) setActiveFighterId(p1Picks[0]);
  };

  const executeMatchLaunch = (
    stageIdToUse: string,
    scenarioToUse: CombatControlScenario = 'USER_VS_CPU',
    customP1Team?: FofFighterStats[],
    customP2Team?: FofFighterStats[]
  ) => {
    soundFX.playReadyFight();
    setIsLaunchingMatch(true);

    const team1 = customP1Team || (p1TeamIds
      .map(id => allCharactersList.find(c => c.id === id))
      .filter(Boolean) as FofFighterStats[]);
    const team2 = customP2Team || (p2TeamIds
      .map(id => allCharactersList.find(c => c.id === id))
      .filter(Boolean) as FofFighterStats[]);

    setTimeout(() => {
      onStartMatch(team1, team2, stageIdToUse, matchFormat, scenarioToUse, cpuDifficulty);
    }, 600);
  };

  const handleStartGame = () => {
    if (p1TeamIds.length === 0 || p2TeamIds.length === 0) return;
    soundFX.playClick();
    setPendingLaunchScenario(controlScenario);
    setIsStageModalOpen(true);
  };

  const handleStartDemoFight = (featuredCharId?: string) => {
    soundFX.playClick();
    let team1Ids = [...p1TeamIds];
    let team2Ids = [...p2TeamIds];

    if (featuredCharId) {
      if (!team1Ids.includes(featuredCharId)) {
        team1Ids = [featuredCharId, ...team1Ids.filter(id => id !== featuredCharId)].slice(0, maxTeamSize);
      }
      // If team2 is empty or identical, pick rivals
      if (team2Ids.length === 0 || (team2Ids.length === 1 && team2Ids[0] === featuredCharId)) {
        const pool = allCharactersList.filter(c => c.id !== featuredCharId);
        team2Ids = pool.slice(0, maxTeamSize).map(c => c.id);
      }
    }

    if (team1Ids.length < maxTeamSize) {
      const pool = allCharactersList.filter(c => !team1Ids.includes(c.id));
      team1Ids = [...team1Ids, ...pool.slice(0, maxTeamSize - team1Ids.length).map(c => c.id)];
    }
    if (team2Ids.length < maxTeamSize) {
      const pool = allCharactersList.filter(c => !team2Ids.includes(c.id) && !team1Ids.includes(c.id));
      team2Ids = [...team2Ids, ...pool.slice(0, maxTeamSize - team2Ids.length).map(c => c.id)];
    }

    setP1TeamIds(team1Ids);
    setP2TeamIds(team2Ids);
    setPendingLaunchScenario('CPU_VS_CPU');
    setIsStageModalOpen(true);
  };

  const handleStageSelected = (stageId: string) => {
    setSelectedStageId(stageId);
    setIsStageModalOpen(false);
    executeMatchLaunch(stageId, pendingLaunchScenario || controlScenario);
  };

  const renderElementIcon = (elem: string) => {
    switch (elem) {
      case 'Fire':
        return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'Ice':
        return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Wind':
        return <Wind className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Light':
        return <Sparkles className="w-3.5 h-3.5 text-yellow-300" />;
      case 'Dark':
        return <Skull className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Mountain className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const isReady = p1TeamIds.length === maxTeamSize && p2TeamIds.length === maxTeamSize;

  const currentStage = FOF_STAGES.find(s => s.id === selectedStageId) || FOF_STAGES[0];

  return (
    <div className="relative w-full min-h-[92vh] flex flex-col justify-between font-mono select-none overflow-hidden bg-stone-950 text-white p-2 sm:p-4 rounded-3xl border border-white/10 shadow-2xl">
      {/* Background Graphic Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950 via-stone-950 to-black" />
      <div
        className="absolute inset-0 pointer-events-none opacity-10 bg-repeat bg-center"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* MATCH LAUNCH FLASH SCREEN OVERLAY */}
      {isLaunchingMatch && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-red-500 font-black text-6xl sm:text-8xl tracking-widest italic animate-bounce font-display">
              VS
            </div>
            <div className="text-3xl sm:text-5xl font-black uppercase text-amber-400 tracking-wider animate-pulse">
              {controlScenario === 'CPU_VS_CPU' ? '🤖 DEMO MODE // AI VS AI' : 'GET READY TO FIGHT!'}
            </div>
            <div className="text-sm text-gray-400 font-bold uppercase tracking-widest">
              DEPLOYING ARENA: {currentStage.name}
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER & MATCH CONFIGURATION BAR */}
      <header className="relative z-10 bg-black/80 backdrop-blur-md border border-white/15 rounded-2xl p-3 sm:p-4 mb-3 shadow-xl">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Title & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-stone-900 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-red-900/40 shrink-0">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest px-2 py-0.5 bg-red-600/40 text-red-300 border border-red-500/50 rounded uppercase">
                  ARCADE ROSTER SHOWCASE
                </span>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  FOF v2.0.0
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase drop-shadow flex items-center gap-2">
                FATE OF FIGHTERS: THE MANUFACTURED COLLAPSE
              </h1>
            </div>
          </div>

          {/* Quick Settings Bar: Format, Scenario, Stage, Random */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Format Toggle */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15">
              <button
                onClick={() => handleFormatChange('3v3_TEAM')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  matchFormat === '3v3_TEAM'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                3v3 TEAM
              </button>
              <button
                onClick={() => handleFormatChange('1v1_SINGLE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  matchFormat === '1v1_SINGLE'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                1v1 DUEL
              </button>
            </div>

            {/* Scenario Dropdown / Selector */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15">
              <button
                onClick={() => {
                  soundFX.playClick();
                  setControlScenario('USER_VS_CPU');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  controlScenario === 'USER_VS_CPU'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="P1 Keyboard/Gamepad vs Computer AI"
              >
                <User className="w-3 h-3 text-amber-300" />
                P1 vs CPU
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setControlScenario('USER_VS_USER');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  controlScenario === 'USER_VS_USER'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="2 Players Local on Keyboard / Gamepads"
              >
                <Swords className="w-3 h-3 text-blue-300" />
                2P PvP
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setControlScenario('CPU_VS_CPU');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  controlScenario === 'CPU_VS_CPU'
                    ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400'
                    : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
                }`}
                title="Demo Mode: Computer AI vs Computer AI"
              >
                <Bot className="w-3 h-3 text-purple-300" />
                DEMO (AI vs AI)
              </button>
            </div>

            {/* Stage Selector Pill */}
            <select
              value={selectedStageId}
              onChange={e => {
                soundFX.playClick();
                setSelectedStageId(e.target.value);
              }}
              className="bg-black/80 border border-white/20 text-xs font-bold uppercase text-gray-200 px-3 py-1.5 rounded-xl cursor-pointer hover:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {FOF_STAGES.map(s => (
                <option key={s.id} value={s.id}>
                  🏟️ {s.name}
                </option>
              ))}
            </select>

            {/* Randomize Button */}
            <button
              onClick={handleRandomize}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold uppercase text-gray-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-400" />
              RANDOM
            </button>

            {/* Sound Toggle */}
            {onToggleSound && (
              <button
                onClick={onToggleSound}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-gray-200 rounded-xl transition-all cursor-pointer"
                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CENTER: THE SIGNATURE VERTICAL SLICE CHARACTER SHOWCASE STRIP (Street Fighter / KOF Style) */}
      <main className="relative z-10 flex-1 flex flex-col gap-3 my-1">
        {/* Active Team Selection Instructions Banner */}
        <div className="flex items-center justify-between px-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">
              CLICK A VERTICAL SLICE TO INSPECT & DEPLOY:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTargetTeam('p1')}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                  activeTargetTeam === 'p1'
                    ? 'bg-red-600 text-white ring-2 ring-red-400'
                    : 'bg-red-950/50 text-red-400 hover:bg-red-900/50'
                }`}
              >
                DEPLOY P1 ({p1TeamIds.length}/{maxTeamSize})
              </button>
              <button
                onClick={() => setActiveTargetTeam('p2')}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                  activeTargetTeam === 'p2'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-blue-950/50 text-blue-400 hover:bg-blue-900/50'
                }`}
              >
                DEPLOY P2/CPU ({p2TeamIds.length}/{maxTeamSize})
              </button>
            </div>
          </div>

          <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ROSTER: {allCharactersList.length} FIGHTERS AVAILABLE</span>
          </div>
        </div>

        {/* CONTIGUOUS VERTICAL SLICE GALLERY CONTAINER */}
        <div className="relative w-full h-[400px] sm:h-[460px] md:h-[490px] flex rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/90 group">
          {allCharactersList.map((fighter, index) => {
            const isP1 = p1TeamIds.includes(fighter.id);
            const p1Index = p1TeamIds.indexOf(fighter.id);
            const isP2 = p2TeamIds.includes(fighter.id);
            const p2Index = p2TeamIds.indexOf(fighter.id);
            const isExpanded = activeFighterId === fighter.id;
            const isBoss = fighter.id === 'valeria' || fighter.id === 'victor';

            return (
              <div
                key={fighter.id}
                onMouseEnter={() => {
                  if (activeFighterId !== fighter.id) {
                    soundFX.playClick();
                    setActiveFighterId(fighter.id);
                  }
                }}
                onClick={() => {
                  soundFX.playClick();
                  setActiveFighterId(fighter.id);
                  if (activeTargetTeam === 'p1') {
                    handlePickForP1(fighter.id);
                  } else {
                    handlePickForP2(fighter.id);
                  }
                }}
                className={`relative h-full transition-all duration-500 ease-out cursor-pointer overflow-hidden flex flex-col justify-between border-r border-black/80 last:border-r-0 ${
                  isExpanded
                    ? 'flex-[3.5] sm:flex-[4] z-20 shadow-[0_0_40px_rgba(0,0,0,0.9)]'
                    : 'flex-[1] hover:flex-[1.8] opacity-75 hover:opacity-100'
                }`}
                style={{
                  background: `linear-gradient(180deg, ${fighter.themeColor || '#444'} 0%, #111 60%, #000 100%)`,
                }}
              >
                {/* Background Ambient Glow & Character Color Flare */}
                <div
                  className="absolute inset-0 opacity-40 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 30%, ${fighter.accentColor || '#f59e0b'} 0%, transparent 70%)`,
                  }}
                />

                {/* Diagonal Slanted Speed Lines on Hover / Active */}
                <div
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                    isExpanded ? 'opacity-25' : 'opacity-10'
                  }`}
                  style={{
                    backgroundImage: `repeating-linear-gradient( -45deg, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 2px, transparent 2px, transparent 12px )`,
                  }}
                />

                {/* Top Strip Elements: Element Badge & P1/P2 Tag */}
                <div className="relative z-10 p-2 sm:p-3 flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div
                      className="w-7 h-7 rounded-lg bg-black/70 border border-white/20 flex items-center justify-center shadow backdrop-blur-sm"
                      title={fighter.element}
                    >
                      {renderElementIcon(fighter.element)}
                    </div>
                    {isBoss && (
                      <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded uppercase shadow">
                        BOSS
                      </span>
                    )}
                  </div>

                  {/* Selection Indicator Badges */}
                  <div className="flex flex-col items-end gap-1">
                    {isP1 && (
                      <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-md shadow-lg shadow-red-600/50 border border-red-400 animate-pulse flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        P1 #{p1Index + 1}
                      </span>
                    )}
                    {isP2 && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-md shadow-lg shadow-blue-600/50 border border-blue-400 animate-pulse flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        P2 #{p2Index + 1}
                      </span>
                    )}
                  </div>
                </div>

                {/* Center Sprite / Dynamic Character Splash Card with Full-Height Portrait Art */}
                <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden w-full h-full">
                  <CharacterSelectSplashCard
                    fighter={fighter}
                    isExpanded={isExpanded}
                    isP1={isP1}
                    isP2={isP2}
                  />
                </div>

                {/* Bottom Slice Banner: Character Name & Role */}
                <div className="relative z-10 p-2 sm:p-3 bg-gradient-to-t from-black via-black/90 to-transparent">
                  {/* For Collapsed Slices: Vertical Stacked Title */}
                  {!isExpanded && (
                    <div className="flex flex-col items-center">
                      <span
                        className="text-xs sm:text-sm font-black italic tracking-tighter uppercase text-white drop-shadow-md text-center line-clamp-1"
                        style={{ color: fighter.accentColor }}
                      >
                        {fighter.name.split(' ')[0]}
                      </span>
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                        {fighter.role}
                      </span>
                    </div>
                  )}

                  {/* For Expanded Slice: Rich Card Information & Quick Pick Buttons */}
                  {isExpanded && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-white/20 pb-1">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getFighterPortrait(fighter)}
                            alt={fighter.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover border border-amber-400/80 shadow-md ring-1 ring-black"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base sm:text-xl font-black italic uppercase text-white tracking-tight">
                                {fighter.name}
                              </h3>
                              <span
                                className="text-[10px] font-black uppercase px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${fighter.accentColor}33`,
                                  color: fighter.accentColor,
                                }}
                              >
                                {fighter.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-300 italic font-serif">"{fighter.motto}"</p>
                          </div>
                        </div>

                        {/* Combat Stats Radar */}
                        <div className="flex items-center gap-2 text-[10px] text-gray-300 shrink-0 font-mono">
                          <span className="text-red-400 font-bold">ATK {fighter.atk}</span>
                          <span className="text-blue-400 font-bold">DEF {fighter.def}</span>
                          <span className="text-emerald-400 font-bold">SPD {fighter.spd}</span>
                          <span className="text-amber-400 font-bold">HP {fighter.maxHp}</span>
                        </div>
                      </div>

                      {/* Action Buttons to Assign as P1, P2, or Launch Demo Fight */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handlePickForP1(fighter.id);
                          }}
                          className={`flex-1 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[120px] ${
                            isP1
                              ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 ring-2 ring-red-400'
                              : 'bg-red-950/60 hover:bg-red-800 text-red-200 border border-red-600/50'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          {isP1 ? `P1 PICKED (#${p1Index + 1})` : '+ ASSIGN P1'}
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handlePickForP2(fighter.id);
                          }}
                          className={`flex-1 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[120px] ${
                            isP2
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-2 ring-blue-400'
                              : 'bg-blue-950/60 hover:bg-blue-800 text-blue-200 border border-blue-600/50'
                          }`}
                        >
                          <Swords className="w-3.5 h-3.5" />
                          {isP2 ? `P2 PICKED (#${p2Index + 1})` : '+ ASSIGN OPPONENT'}
                        </button>

                        {/* Dedicated Demo Mode Battle Button for this fighter */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleStartDemoFight(fighter.id);
                          }}
                          className="flex-1 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[120px] bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 hover:from-purple-700 hover:to-indigo-600 text-purple-200 hover:text-white border border-purple-500/60 shadow-lg shadow-purple-950/60 active:scale-95 ring-1 ring-purple-400/40"
                          title={`Watch computer AI fight using ${fighter.name}`}
                        >
                          <Bot className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                          <span>⚡ DEMO FIGHT</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Selection Glowing Border */}
                {isExpanded && (
                  <div
                    className="absolute inset-0 border-2 pointer-events-none rounded-none shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]"
                    style={{ borderColor: fighter.accentColor || '#f59e0b' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 3. BOTTOM DEPLOYMENT HUD & BIG START GAME BUTTON */}
      <footer className="relative z-10 bg-black/90 border border-white/15 rounded-2xl p-3 sm:p-4 mt-2 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* P1 Lineup Summary */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                PLAYER 1 SQUAD ({p1TeamIds.length}/{maxTeamSize})
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {Array.from({ length: maxTeamSize }).map((_, idx) => {
                  const charId = p1TeamIds[idx];
                  const fighter = allCharactersList.find(c => c.id === charId);
                  const portrait = fighter ? getFighterPortrait(fighter) : '';
                  return (
                    <div
                      key={idx}
                      onClick={() => charId && setActiveFighterId(charId)}
                      className={`w-14 sm:w-16 h-14 rounded-xl border flex flex-col items-center justify-center p-0.5 transition-all cursor-pointer overflow-hidden relative group ${
                        fighter
                          ? 'border-red-500 bg-red-950/80 shadow-md shadow-red-900/40 ring-1 ring-red-400/50'
                          : 'border-white/10 bg-white/5 border-dashed text-gray-500'
                      }`}
                      title={fighter ? `${fighter.name} (Click to inspect)` : 'Empty slot'}
                    >
                      {fighter ? (
                        <>
                          <img
                            src={portrait}
                            alt={fighter.name}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover object-top opacity-95 group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                          <div className="relative z-10 flex flex-col items-center text-center mt-auto pb-0.5 w-full px-0.5">
                            <span className="text-[10px] font-black uppercase text-white truncate max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                              {fighter.name.split(' ')[0]}
                            </span>
                            <span className="text-[8px] text-red-300 font-bold uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                              1P #{idx + 1}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[9px] text-gray-500 uppercase">EMPTY</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VS Badge */}
            <div className="px-3 py-1 bg-red-600/30 border border-red-500/50 rounded-xl text-center">
              <span className="text-lg font-black italic text-red-400 tracking-tighter">VS</span>
            </div>

            {/* P2 / Opponent Lineup Summary */}
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                OPPONENT / CPU SQUAD ({p2TeamIds.length}/{maxTeamSize})
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {Array.from({ length: maxTeamSize }).map((_, idx) => {
                  const charId = p2TeamIds[idx];
                  const fighter = allCharactersList.find(c => c.id === charId);
                  const portrait = fighter ? getFighterPortrait(fighter) : '';
                  return (
                    <div
                      key={idx}
                      onClick={() => charId && setActiveFighterId(charId)}
                      className={`w-14 sm:w-16 h-14 rounded-xl border flex flex-col items-center justify-center p-0.5 transition-all cursor-pointer overflow-hidden relative group ${
                        fighter
                          ? 'border-blue-500 bg-blue-950/80 shadow-md shadow-blue-900/40 ring-1 ring-blue-400/50'
                          : 'border-white/10 bg-white/5 border-dashed text-gray-500'
                      }`}
                      title={fighter ? `${fighter.name} (Click to inspect)` : 'Empty slot'}
                    >
                      {fighter ? (
                        <>
                          <img
                            src={portrait}
                            alt={fighter.name}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover object-top opacity-95 group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                          <div className="relative z-10 flex flex-col items-center text-center mt-auto pb-0.5 w-full px-0.5">
                            <span className="text-[10px] font-black uppercase text-white truncate max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                              {fighter.name.split(' ')[0]}
                            </span>
                            <span className="text-[8px] text-blue-300 font-bold uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                              2P #{idx + 1}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[9px] text-gray-500 uppercase">EMPTY</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Stage & Scenario Preview Pill with 15s selector */}
          <div
            onClick={() => {
              soundFX.playClick();
              setIsStageModalOpen(true);
            }}
            className="hidden xl:flex items-center gap-3 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 hover:border-amber-400/60 transition-all cursor-pointer group"
            title="Click to select 1 of 5 Indian Culture Stages (15s timer)"
          >
            {/* Stage Location Image Thumbnail */}
            <div className="w-10 h-7 rounded-md overflow-hidden border border-amber-400/40 shrink-0 relative">
              <img
                src={getStageVisual(selectedStageId).thumbnailUrl}
                alt="Selected Stage"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="text-left">
              <span className="text-[9px] text-amber-400 font-bold uppercase block tracking-wider flex items-center gap-1">
                <span>STAGE (15S SELECT)</span>
              </span>
              <span className="text-xs font-black uppercase text-amber-300">
                {INDIAN_CULTURE_STAGES.find(s => s.id === selectedStageId)?.name.split(':')[0] || currentStage.name}
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[9px] text-gray-400 font-bold uppercase block">MODE</span>
              <span className="text-xs font-black uppercase text-gray-200">
                {controlScenario === 'USER_VS_CPU'
                  ? 'P1 vs AI'
                  : controlScenario === 'USER_VS_USER'
                  ? 'Local 2P'
                  : 'AI vs AI'}
              </span>
            </div>
          </div>

          {/* Action Buttons: START GAME and DEMO MODE */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
            {/* DEMO MODE (AI VS AI) QUICK LAUNCH BUTTON */}
            <button
              onClick={() => handleStartDemoFight()}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 hover:from-purple-800 hover:to-indigo-700 text-purple-100 border border-purple-400/60 shadow-xl shadow-purple-950/60 active:scale-95 ring-1 ring-purple-400/50"
              title="Watch computer AI fighters battle each other automatically"
            >
              <Bot className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>DEMO MODE (CPU vs CPU)</span>
            </button>

            {/* THE GIANT ARCADE "START THE GAME" BUTTON */}
            <button
              onClick={handleStartGame}
              disabled={!isReady}
              className={`w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer ${
                isReady
                  ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-xl shadow-red-600/50 hover:shadow-red-600/80 active:scale-95 ring-2 ring-amber-400/80 animate-pulse'
                  : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START THE GAME</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>

      {/* 15-Second Indian Culture Stage Selection Modal */}
      <FofStageSelectModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        onSelectStage={handleStageSelected}
        initialStageId={selectedStageId}
      />
    </div>
  );
};
