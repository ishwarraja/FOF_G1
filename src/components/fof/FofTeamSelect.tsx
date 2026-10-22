import React, { useState } from 'react';
import { FOF_CHARACTERS, FOF_STAGES, INDIAN_CULTURE_STAGES } from '../../data/fightingMoves';
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
  FolderOpen,
  Image as ImageIcon,
  HelpCircle,
  Gamepad2,
  Swords,
  Layers,
  Upload,
  CheckCircle2,
  Sparkle,
  Compass,
} from 'lucide-react';

interface FofTeamSelectProps {
  onStartMatch: (
    p1Team: FofFighterStats[],
    p2Team: FofFighterStats[],
    stageId: string,
    format?: '3v3_TEAM' | '1v1_SINGLE',
    scenario?: CombatControlScenario,
    cpuDiff?: number
  ) => void;
}

export const FofTeamSelect: React.FC<FofTeamSelectProps> = ({ onStartMatch }) => {
  const allCharacters = Object.values(FOF_CHARACTERS);

  // Match Format Mode: 1v1 Single Duel vs 3v3 Team
  const [matchFormat, setMatchFormat] = useState<'3v3_TEAM' | '1v1_SINGLE'>('3v3_TEAM');

  // Combat Control Scenario (as requested: 1. Auto fight PC vs PC, 2. User vs PC, 3. 2 Opponents Local PvP)
  const [controlScenario, setControlScenario] = useState<CombatControlScenario>('USER_VS_CPU');

  // CPU Difficulty (1 to 5)
  const [cpuDifficulty, setCpuDifficulty] = useState<number>(3);

  // Player 1 picks
  const [p1TeamIds, setP1TeamIds] = useState<string[]>(['arjun', 'steele', 'elena']);
  // CPU / Player 2 picks
  const [p2TeamIds, setP2TeamIds] = useState<string[]>(['david', 'maya', 'valeria']);

  // Selected stage (Default to Indian Culture Time Temple)
  const [selectedStageId, setSelectedStageId] = useState<string>('stage_kala_chakra_time');
  // 15-second Stage Selection Modal state
  const [isStageModalOpen, setIsStageModalOpen] = useState<boolean>(false);
  // Inspector character
  const [inspectedCharId, setInspectedCharId] = useState<string>('arjun');
  // Selecting for team 1 or team 2
  const [activePickingTeam, setActivePickingTeam] = useState<'p1' | 'p2'>('p1');

  // Inspector Sub-tab: Overview vs Moves vs Custom Image Art Guide
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'moves' | 'custom_image'>('overview');

  // Custom Image URL live tester state
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [customAvatarOverride, setCustomAvatarOverride] = useState<Record<string, string>>({});
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Filter for Roster Grid
  const [selectedFactionFilter, setSelectedFactionFilter] = useState<string>('ALL');

  const inspectedChar = FOF_CHARACTERS[inspectedCharId] || allCharacters[0];

  const maxTeamSize = matchFormat === '3v3_TEAM' ? 3 : 1;

  // Handle format switch and adjust team sizes
  const handleFormatChange = (fmt: '3v3_TEAM' | '1v1_SINGLE') => {
    soundFX.playClick();
    setMatchFormat(fmt);
    if (fmt === '1v1_SINGLE') {
      if (p1TeamIds.length > 1) setP1TeamIds([p1TeamIds[0]]);
      if (p2TeamIds.length > 1) setP2TeamIds([p2TeamIds[0]]);
    } else {
      if (p1TeamIds.length < 3) {
        const pool1 = allCharacters.map(c => c.id).filter(id => !p1TeamIds.includes(id));
        setP1TeamIds([...p1TeamIds, ...pool1.slice(0, 3 - p1TeamIds.length)]);
      }
      if (p2TeamIds.length < 3) {
        const pool2 = allCharacters.map(c => c.id).filter(id => !p2TeamIds.includes(id));
        setP2TeamIds([...p2TeamIds, ...pool2.slice(0, 3 - p2TeamIds.length)]);
      }
    }
  };

  const handleTogglePick = (charId: string) => {
    soundFX.playClick();
    setInspectedCharId(charId);

    if (activePickingTeam === 'p1') {
      if (p1TeamIds.includes(charId)) {
        if (p1TeamIds.length > 1 || matchFormat === '3v3_TEAM') {
          setP1TeamIds(prev => prev.filter(id => id !== charId));
        }
      } else {
        if (p1TeamIds.length < maxTeamSize) {
          setP1TeamIds(prev => [...prev, charId]);
        } else if (maxTeamSize === 1) {
          setP1TeamIds([charId]);
        }
      }
    } else {
      if (p2TeamIds.includes(charId)) {
        if (p2TeamIds.length > 1 || matchFormat === '3v3_TEAM') {
          setP2TeamIds(prev => prev.filter(id => id !== charId));
        }
      } else {
        if (p2TeamIds.length < maxTeamSize) {
          setP2TeamIds(prev => [...prev, charId]);
        } else if (maxTeamSize === 1) {
          setP2TeamIds([charId]);
        }
      }
    }
  };

  const handleReorder = (team: 'p1' | 'p2', index: number, direction: 'up' | 'down') => {
    soundFX.playClick();
    const list = team === 'p1' ? [...p1TeamIds] : [...p2TeamIds];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    if (team === 'p1') setP1TeamIds(list);
    else setP2TeamIds(list);
  };

  const handleRandomize = (target: 'p1' | 'p2' | 'both') => {
    soundFX.playWhoosh();
    const shuffled = [...allCharacters].sort(() => Math.random() - 0.5);
    const count = maxTeamSize;

    if (target === 'p1' || target === 'both') {
      const picks = shuffled.slice(0, count).map(c => c.id);
      setP1TeamIds(picks);
    }
    if (target === 'p2' || target === 'both') {
      const remaining = shuffled.filter(c => target === 'both' ? !p1TeamIds.includes(c.id) : true);
      const picks = (remaining.length >= count ? remaining : shuffled).slice(0, count).map(c => c.id);
      setP2TeamIds(picks);
    }
  };

  const handleStart = () => {
    if (p1TeamIds.length !== maxTeamSize || p2TeamIds.length !== maxTeamSize) return;
    soundFX.playClick();
    setIsStageModalOpen(true);
  };

  const handleStageSelected = (stageId: string) => {
    setSelectedStageId(stageId);
    setIsStageModalOpen(false);
    soundFX.playReadyFight();

    // Map characters with custom avatar overrides if supplied
    const team1 = p1TeamIds.map(id => {
      const base = FOF_CHARACTERS[id];
      if (customAvatarOverride[id]) {
        return { ...base, customImageUrl: customAvatarOverride[id], avatarUrl: customAvatarOverride[id] };
      }
      return base;
    });

    const team2 = p2TeamIds.map(id => {
      const base = FOF_CHARACTERS[id];
      if (customAvatarOverride[id]) {
        return { ...base, customImageUrl: customAvatarOverride[id], avatarUrl: customAvatarOverride[id] };
      }
      return base;
    });

    onStartMatch(team1, team2, stageId, matchFormat, controlScenario, cpuDifficulty);
  };

  const handleApplyCustomImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setCustomAvatarOverride(prev => ({
      ...prev,
      [inspectedCharId]: customImageUrl.trim(),
    }));
    soundFX.playSuperFlash();
    setUploadNotice(`Custom image applied to ${inspectedChar.name}!`);
    setTimeout(() => setUploadNotice(null), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const result = uploadEvt.target?.result as string;
        if (result) {
          setCustomAvatarOverride(prev => ({
            ...prev,
            [inspectedCharId]: result,
          }));
          soundFX.playSuperFlash();
          setUploadNotice(`Loaded "${file.name}" for ${inspectedChar.name}!`);
          setTimeout(() => setUploadNotice(null), 3500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderElemIcon = (elem: string) => {
    switch (elem) {
      case 'Fire': return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'Ice': return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Wind': return <Wind className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Light': return <Sparkles className="w-3.5 h-3.5 text-yellow-300" />;
      case 'Dark': return <Skull className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Mountain className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const filteredCharacters = selectedFactionFilter === 'ALL'
    ? allCharacters
    : allCharacters.filter(c => c.faction.toUpperCase() === selectedFactionFilter);

  const isReadyToFight = p1TeamIds.length === maxTeamSize && p2TeamIds.length === maxTeamSize;

  return (
    <div className="max-w-7xl mx-auto space-y-5 font-mono select-none">
      {/* 1. Top Configuration Bar: Match Format & Combat Control Scenarios */}
      <div className="bg-black/90 border border-white/15 p-4 sm:p-5 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest px-2 py-0.5 bg-red-600/30 text-red-400 border border-red-500/50 rounded uppercase">
                COMBAT CONFIGURATOR
              </span>
              <span className="text-xs text-gray-400">ROSTER & SCENARIO SELECTION</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-tighter mt-1 flex items-center gap-2">
              <Swords className="w-7 h-7 text-red-500" />
              CHOOSE FIGHTERS & MATCH SCENARIO
            </h2>
          </div>

          {/* Match Format Toggle: 3v3 Team vs 1v1 Single */}
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10 shrink-0">
            <span className="text-[11px] font-bold text-gray-400 px-2 uppercase">FORMAT:</span>
            <button
              onClick={() => handleFormatChange('3v3_TEAM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                matchFormat === '3v3_TEAM'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              3v3 TEAM BATTLE
            </button>
            <button
              onClick={() => handleFormatChange('1v1_SINGLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                matchFormat === '1v1_SINGLE'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              1v1 SINGLE DUEL
            </button>
          </div>
        </div>

        {/* 2. Three Requested Combat Scenarios */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Scenario 1: Auto Fight PC vs PC */}
          <div
            onClick={() => {
              soundFX.playClick();
              setControlScenario('CPU_VS_CPU');
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              controlScenario === 'CPU_VS_CPU'
                ? 'border-purple-500 bg-purple-950/40 shadow-lg shadow-purple-950/50 ring-1 ring-purple-400'
                : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500/50 flex items-center justify-center text-purple-300">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase block tracking-wider">SCENARIO 1</span>
                  <h4 className="text-xs font-black italic uppercase text-white">AUTO FIGHT (PC vs PC)</h4>
                </div>
              </div>
              {controlScenario === 'CPU_VS_CPU' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
            </div>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              Both fighters are controlled by the AI engine. Sit back and watch high-level CPU vs CPU arcade combat.
            </p>
          </div>

          {/* Scenario 2: User vs PC */}
          <div
            onClick={() => {
              soundFX.playClick();
              setControlScenario('USER_VS_CPU');
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              controlScenario === 'USER_VS_CPU'
                ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-950/50 ring-1 ring-blue-400'
                : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-900/60 border border-blue-500/50 flex items-center justify-center text-blue-300">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-blue-400 font-bold uppercase block tracking-wider">SCENARIO 2</span>
                  <h4 className="text-xs font-black italic uppercase text-white">USER vs PC (SOLO)</h4>
                </div>
              </div>
              {controlScenario === 'USER_VS_CPU' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
            </div>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              You command Player 1 using Keyboard, Gamepad, or Touch Pad against the computer AI opponent.
            </p>
          </div>

          {/* Scenario 3: Fight between 2 Opponents (Local PvP) */}
          <div
            onClick={() => {
              soundFX.playClick();
              setControlScenario('USER_VS_USER');
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              controlScenario === 'USER_VS_USER'
                ? 'border-amber-500 bg-amber-950/40 shadow-lg shadow-amber-950/50 ring-1 ring-amber-400'
                : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-900/60 border border-amber-500/50 flex items-center justify-center text-amber-300">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase block tracking-wider">SCENARIO 3</span>
                  <h4 className="text-xs font-black italic uppercase text-white">2 OPPONENTS (LOCAL PvP)</h4>
                </div>
              </div>
              {controlScenario === 'USER_VS_USER' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              Duel a friend on 1 screen! P1 uses WASD+Action keys, P2 uses Arrow Keys+Numpad / 2nd Gamepad.
            </p>
          </div>
        </div>

        {/* AI Difficulty Selector (Visible for Scenarios with CPU) */}
        {controlScenario !== 'USER_VS_USER' && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-gray-400" />
              <span className="font-bold text-gray-300 uppercase">CPU AI DIFFICULTY:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => {
                    soundFX.playClick();
                    setCpuDifficulty(lvl);
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    cpuDifficulty === lvl
                      ? 'bg-red-600 text-white shadow'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  LV.{lvl} {lvl === 1 ? '(ROOKIE)' : lvl === 3 ? '(STANDARD)' : lvl === 5 ? '(GODLIKE)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Team Selection Status Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950 border border-white/10 p-3 sm:p-4 rounded-xl">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => {
              soundFX.playClick();
              setActivePickingTeam('p1');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-2 ${
              activePickingTeam === 'p1'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-2 ring-blue-400'
                : 'bg-blue-950/40 text-blue-300 border border-blue-800/40 hover:bg-blue-900/40'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            SELECTING 1P TEAM ({p1TeamIds.length}/{maxTeamSize})
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setActivePickingTeam('p2');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-2 ${
              activePickingTeam === 'p2'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 ring-2 ring-red-400'
                : 'bg-red-950/40 text-red-300 border border-red-800/40 hover:bg-red-900/40'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
            SELECTING 2P / CPU TEAM ({p2TeamIds.length}/{maxTeamSize})
          </button>
        </div>

        {/* Quick Randomizers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRandomize('p1')}
            className="px-2.5 py-1.5 bg-blue-950/50 hover:bg-blue-900/50 border border-blue-800/40 text-blue-300 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
            title="Randomize Player 1 Roster"
          >
            <Shuffle className="w-3 h-3" />
            RND 1P
          </button>
          <button
            onClick={() => handleRandomize('p2')}
            className="px-2.5 py-1.5 bg-red-950/50 hover:bg-red-900/50 border border-red-800/40 text-red-300 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
            title="Randomize Player 2 Roster"
          >
            <Shuffle className="w-3 h-3" />
            RND 2P
          </button>
          <button
            onClick={() => handleRandomize('both')}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-700 to-red-700 hover:from-blue-600 hover:to-red-600 text-white rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow"
            title="Randomize Both Teams"
          >
            <Shuffle className="w-3.5 h-3.5" />
            RND BOTH
          </button>
        </div>
      </div>

      {/* 4. Main Matrix: Fighter Grid (Left) & Inspector + Order (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Fighter Grid & Stages */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-black/85 border border-white/10 p-4 rounded-2xl shadow-xl">
            {/* Faction Filter Tabs */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10 overflow-x-auto">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider shrink-0">
                // ROSTER ({allCharacters.length})
              </span>
              <div className="flex items-center gap-1">
                {['ALL', 'WORKERS', 'MILITARY', 'HEALTHCARE', 'GOVERNMENT'].map(fac => (
                  <button
                    key={fac}
                    onClick={() => setSelectedFactionFilter(fac)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 ${
                      selectedFactionFilter === fac
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {fac}
                  </button>
                ))}
              </div>
            </div>

            {/* Character Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredCharacters.map(char => {
                const isP1 = p1TeamIds.includes(char.id);
                const isP2 = p2TeamIds.includes(char.id);
                const isInspected = inspectedCharId === char.id;
                const p1Order = p1TeamIds.indexOf(char.id);
                const p2Order = p2TeamIds.indexOf(char.id);
                const norm = normalizeCharacterId(char.id);
                const dedicatedIcon = CHARACTER_ICONS[norm];
                const displayImg = customAvatarOverride[char.id] || dedicatedIcon || char.avatarUrl;

                return (
                  <div
                    key={char.id}
                    onClick={() => handleTogglePick(char.id)}
                    className={`relative p-3 border rounded-xl flex flex-col items-center justify-between gap-2 transition-all cursor-pointer select-none group ${
                      isInspected ? 'ring-2 ring-red-500 scale-[1.02]' : ''
                    } ${
                      isP1
                        ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-950/50'
                        : isP2
                        ? 'border-red-500 bg-red-950/40 shadow-lg shadow-red-950/50'
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    {/* Order Badges */}
                    {isP1 && (
                      <span className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                        1P #{p1Order + 1}
                      </span>
                    )}
                    {isP2 && (
                      <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                        2P #{p2Order + 1}
                      </span>
                    )}

                    {/* Custom Image Indicator */}
                    {displayImg && (
                      <span className="absolute bottom-2 right-2 p-1 bg-amber-500/80 rounded-full text-black" title="Character Icon Active">
                        <Sparkle className="w-2.5 h-2.5" />
                      </span>
                    )}

                    {/* Portrait Avatar */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-tr ${char.avatarColor} flex items-center justify-center text-white text-xl font-black italic shadow-md overflow-hidden relative mt-1`}>
                      {displayImg ? (
                        <img
                          src={displayImg}
                          alt={char.name}
                          className="w-full h-full object-cover object-top"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        char.name.charAt(0)
                      )}
                    </div>

                    <div className="text-center truncate w-full">
                      <h4 className="text-xs font-black italic uppercase text-white truncate group-hover:text-red-400 transition-colors">
                        {char.name.split(' ')[0]}
                      </h4>
                      <span className="text-[10px] text-gray-400 block truncate">{char.role}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      {renderElemIcon(char.element)}
                      <span>{char.element}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indian Culture 3D Battle Arena Stage Selector */}
          <div className="bg-black/85 border border-white/10 p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                // 5 SACRED INDIAN CULTURE BATTLE ARENAS
              </h3>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setIsStageModalOpen(true);
                }}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                15S SELECTOR MODAL
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INDIAN_CULTURE_STAGES.map(stg => {
                const visual = getStageVisual(stg.id);
                const isSelected = selectedStageId === stg.id;
                return (
                  <button
                    key={stg.id}
                    onClick={() => {
                      soundFX.playClick();
                      setSelectedStageId(stg.id);
                    }}
                    className={`relative p-2.5 border text-left rounded-xl transition-all cursor-pointer overflow-hidden group h-20 flex flex-col justify-end ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-lg shadow-amber-600/30'
                        : 'border-white/10 hover:border-amber-400/50 opacity-85 hover:opacity-100'
                    }`}
                  >
                    {/* Background Image of the Location */}
                    <img
                      src={visual.thumbnailUrl}
                      alt={stg.name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/25 pointer-events-none" />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-black uppercase text-xs text-white drop-shadow truncate">
                          {stg.name.split(':')[0]}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold font-mono">
                        <span>{stg.sanskritName || stg.theme}</span>
                        <span className="text-[9px] text-gray-300 uppercase">{stg.culturalCategory?.split('_')[0]}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Character Inspector, Custom Art Guide & Lineup Order */}
        <div className="lg:col-span-5 space-y-4">
          {/* Character Inspector Box */}
          <div className="bg-black/90 border border-white/15 p-5 rounded-2xl shadow-2xl space-y-3">
            {/* Header with Sub-tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black italic uppercase text-white flex items-center gap-2">
                  {inspectedChar.name}
                  {renderElemIcon(inspectedChar.element)}
                </h3>
                <p className="text-[11px] text-red-400 font-bold">{inspectedChar.title}</p>
              </div>

              {/* Inspector Mode Tabs */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-[10px]">
                <button
                  onClick={() => setInspectorTab('overview')}
                  className={`px-2 py-1 rounded font-bold uppercase transition-all cursor-pointer ${
                    inspectorTab === 'overview' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  STATS
                </button>
                <button
                  onClick={() => setInspectorTab('moves')}
                  className={`px-2 py-1 rounded font-bold uppercase transition-all cursor-pointer ${
                    inspectorTab === 'moves' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  MOVES
                </button>
                <button
                  onClick={() => setInspectorTab('custom_image')}
                  className={`px-2 py-1 rounded font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    inspectorTab === 'custom_image' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  ART FOLDER
                </button>
              </div>
            </div>

            {/* TAB 1: OVERVIEW & STANCE PREVIEW */}
            {inspectorTab === 'overview' && (
              <>
                <div className="p-3 bg-gradient-to-b from-stone-950 to-black border border-white/10 rounded-xl flex items-center justify-center relative overflow-hidden h-44 shadow-inner">
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={
                        customAvatarOverride[inspectedChar.id] ||
                        CHARACTER_ICONS[normalizeCharacterId(inspectedChar.id)] ||
                        `/assets/characters/${inspectedChar.id}/select_slice.png`
                      }
                      alt={inspectedChar.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback1) {
                          target.dataset.fallback1 = 'true';
                          target.src = getFighterPortrait(inspectedChar);
                        } else if (!target.dataset.fallback2) {
                          target.dataset.fallback2 = 'true';
                          target.src = inspectedChar.customImageUrl || inspectedChar.avatarUrl || '/characters/arjun.jpg';
                        }
                      }}
                      className="w-full h-full object-cover object-top rounded-lg shadow-xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
                      <span className="text-[10px] font-black uppercase text-amber-400 bg-black/80 px-2 py-0.5 rounded border border-amber-500/40">
                        {inspectedChar.role}
                      </span>
                      <span className="text-[9px] text-gray-300 italic font-serif truncate max-w-[200px]">
                        "{inspectedChar.motto}"
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stat Matrix */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-gray-400 block text-[10px]">HEALTH (HP)</span>
                    <span className="font-black text-white">{inspectedChar.maxHp}</span>
                  </div>
                  <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-gray-400 block text-[10px]">ATTACK (ATK)</span>
                    <span className="font-black text-red-400">{inspectedChar.atk}</span>
                  </div>
                  <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-gray-400 block text-[10px]">DEFENSE (DEF)</span>
                    <span className="font-black text-blue-400">{inspectedChar.def}</span>
                  </div>
                  <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-gray-400 block text-[10px]">SPEED / CRIT</span>
                    <span className="font-black text-emerald-400">{inspectedChar.spd} / {inspectedChar.critRate}%</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-gray-300">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Signature Weapon:</span>
                  <p className="text-yellow-400 text-[11px] font-bold">{inspectedChar.signatureWeapon}</p>
                </div>

                <div className="text-xs space-y-1 text-gray-400">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Intro Voice Line:</span>
                  <p className="text-[11px] italic">"{inspectedChar.voiceLines.intro}"</p>
                </div>
              </>
            )}

            {/* TAB 2: MOVES LIST */}
            {inspectorTab === 'moves' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {inspectedChar.moves.map((move, idx) => (
                  <div key={idx} className="p-2 bg-white/5 border border-white/10 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <div className="font-black uppercase text-white">{move.name}</div>
                      <div className="text-[10px] text-gray-400">{move.motion} • {move.button}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      move.type === 'SUPER' || move.type === 'CLIMAX'
                        ? 'bg-amber-600/40 text-amber-300 border border-amber-500'
                        : move.type === 'SPECIAL'
                        ? 'bg-blue-600/40 text-blue-300 border border-blue-500'
                        : 'bg-stone-800 text-gray-300'
                    }`}>
                      {move.type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: CUSTOM CHARACTER DESIGN IMAGE ASSET GUIDE */}
            {inspectorTab === 'custom_image' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-950/30 border border-amber-700/50 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <FolderOpen className="w-4 h-4" />
                    <span>CHARACTER IMAGE ASSET FOLDER</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Place your custom PNG/WebP character illustrations in the project's static asset directory:
                  </p>
                  <code className="block p-2 bg-black/80 border border-amber-600/40 rounded text-[11px] text-amber-300 font-mono select-all">
                    public/characters/{inspectedChar.id}.png
                  </code>
                </div>

                {/* In-app Image URL / Upload Tester */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">
                    Live Custom Image URL or Upload:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`https://example.com/${inspectedChar.id}.png`}
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      className="flex-1 bg-black/80 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
                    />
                    <button
                      onClick={handleApplyCustomImageUrl}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer shrink-0"
                    >
                      APPLY
                    </button>
                  </div>

                  {/* Local File Upload Button */}
                  <label className="flex items-center justify-center gap-2 p-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-red-500 rounded-lg text-[11px] text-gray-300 hover:text-white cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5 text-red-400" />
                    <span>Upload Local File for {inspectedChar.name}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {uploadNotice && (
                    <div className="p-2 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-[11px] rounded-lg animate-fade-in flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{uploadNotice}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lineup Orders (Point, Mid, Anchor) & Start Button */}
          <div className="bg-black/90 border border-white/15 p-5 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                // TEAM 1 LINEUP ({p1TeamIds.length}/{maxTeamSize})
              </h3>
              <span className="text-[10px] text-blue-400 font-bold">1P ROSTER</span>
            </div>

            <div className="space-y-2">
              {p1TeamIds.map((id, idx) => {
                const char = FOF_CHARACTERS[id];
                if (!char) return null;
                const slotName = matchFormat === '1v1_SINGLE'
                  ? 'DUELIST'
                  : idx === 0
                  ? '1ST: POINT'
                  : idx === 1
                  ? '2ND: MID'
                  : '3RD: ANCHOR';

                const portrait = customAvatarOverride[char.id] || char.customImageUrl || char.avatarUrl || getFighterPortrait(char);
                return (
                  <div
                    key={id}
                    className="p-2 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-blue-400/60 shrink-0 bg-black/80 relative shadow-md">
                        <img
                          src={portrait}
                          alt={char.name}
                          className="w-full h-full object-cover object-top"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-blue-400 font-mono text-[10px] block">
                          {slotName}
                        </span>
                        <span className="font-black italic uppercase text-white text-xs sm:text-sm">
                          {char.name.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    {matchFormat === '3v3_TEAM' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReorder('p1', idx, 'up')}
                          disabled={idx === 0}
                          className="px-1.5 py-0.5 bg-black/60 border border-white/20 text-[10px] rounded hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleReorder('p1', idx, 'down')}
                          disabled={idx === p1TeamIds.length - 1}
                          className="px-1.5 py-0.5 bg-black/60 border border-white/20 text-[10px] rounded hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Launch Match Button */}
            <button
              onClick={handleStart}
              disabled={!isReadyToFight}
              className="w-full py-4 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-black font-black italic uppercase tracking-wider text-base rounded-xl shadow-xl shadow-red-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-black" />
              DEPLOY TO FOF ARENA
            </button>
          </div>
        </div>
      </div>

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
