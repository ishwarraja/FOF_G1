import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { BOSS_ROSTER, createEnemy } from '../../data/enemies';
import { Fighter } from '../../types/game';
import { 
  Layers, 
  Swords, 
  Play, 
  Skull,
  Sliders
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const ArenaView: React.FC = () => {
  const { profile, startBattle } = useGame();
  const [selectedMode, setSelectedMode] = useState<'boss_rush' | 'endless_abyss' | 'custom_duel'>('boss_rush');
  const [customLevel, setCustomLevel] = useState<number>(10);
  const [customCount, setCustomCount] = useState<number>(3);

  const deployTeam = profile.formation
    .map(id => profile.roster.find(r => r.id === id))
    .filter((f): f is Fighter => !!f);

  const handleStartBossRush = (bossKey: keyof typeof BOSS_ROSTER, level: number) => {
    soundFX.playClick();
    const boss = BOSS_ROSTER[bossKey](level);
    const minion1 = createEnemy('minion_1', 'Abyssal Herald', 'Boss Minion', boss.element, 'Striker', level - 1);
    const minion2 = createEnemy('minion_2', 'Nether Shifter', 'Boss Minion', 'Dark', 'Mage', level - 1);

    startBattle(deployTeam.length > 0 ? deployTeam : profile.roster, [boss, minion1, minion2]);
  };

  const handleStartEndlessAbyss = () => {
    soundFX.playClick();
    const waveLvl = Math.max(5, 5 + profile.arenaStats.endlessWaveRecord * 2);
    const enemies = [
      createEnemy('abyss_front_1', 'Abyss Vanguard', 'Wave Fiend', 'Fire', 'Tank', waveLvl, 1.3, 1.2),
      createEnemy('abyss_front_2', 'Glacial Stalker', 'Wave Fiend', 'Ice', 'Striker', waveLvl, 1.2, 1.3),
      createEnemy('abyss_back_1', 'Void Channeler', 'Wave Sorcerer', 'Dark', 'Mage', waveLvl, 1.1, 1.4),
    ];
    startBattle(deployTeam.length > 0 ? deployTeam : profile.roster, enemies);
  };

  const handleStartCustomDuel = () => {
    soundFX.playClick();
    const elements: Fighter['element'][] = ['Fire', 'Ice', 'Wind', 'Light', 'Dark', 'Earth'];
    const roles: Fighter['role'][] = ['Striker', 'Tank', 'Assassin', 'Healer', 'Mage', 'Brawler'];

    const enemies: Fighter[] = [];
    for (let i = 0; i < customCount; i++) {
      const el = elements[i % elements.length];
      const ro = roles[i % roles.length];
      enemies.push(createEnemy(`custom_sim_${i}`, `Simulated Combatant #${i + 1}`, 'AI Simulation Target', el, ro, customLevel, 1.1, 1.1));
    }

    startBattle(deployTeam.length > 0 ? deployTeam : profile.roster, enemies);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Arena Header */}
      <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-red-500 uppercase bg-red-600/10 px-2.5 py-1 border border-red-600/30 inline-block mb-2">
            // TRIAL GROUNDS & ARENA
          </span>
          <h2 className="font-black italic uppercase tracking-tight text-2xl sm:text-3xl text-white">
            Combat Simulation & Boss Trials
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl font-mono">
            Test squad builds against legendary rift entities, climb the infinite abyss, and simulate custom matches.
          </p>
        </div>

        {/* Stats records */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-black/60 border border-white/10 px-4 py-2">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider">TOTAL VICTORIES</span>
            <span className="text-base font-black text-red-400">{profile.arenaStats.totalVictories}</span>
          </div>
          <div className="bg-black/60 border border-white/10 px-4 py-2">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider">ABYSS RECORD</span>
            <span className="text-base font-black text-white">FLOOR {profile.arenaStats.endlessWaveRecord + 1}</span>
          </div>
        </div>
      </div>

      {/* Mode Navigation Selector */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'boss_rush', label: 'Grand Boss Rush', icon: Skull },
          { id: 'endless_abyss', label: 'Endless Abyss Waves', icon: Layers },
          { id: 'custom_duel', label: 'Custom Duel Sandbox', icon: Sliders },
        ].map(mode => {
          const Icon = mode.icon;
          const isActive = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => {
                soundFX.playClick();
                setSelectedMode(mode.id as any);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode 1: Boss Rush */}
      {selectedMode === 'boss_rush' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { key: 'pyros_drake', name: 'Pyros Infernal Drake', title: 'Scourge of Mount Pyros', level: 8, elem: 'Fire', color: 'from-orange-600 to-red-900' },
            { key: 'frost_colossus', name: 'Cryo-Titan Ymir', title: 'Ruler of Whispering Glaciers', level: 12, elem: 'Ice', color: 'from-cyan-600 to-blue-900' },
            { key: 'tempest_lord', name: 'Tempest Void Wyvern', title: 'Sovereign of Skystride', level: 15, elem: 'Wind', color: 'from-emerald-600 to-teal-900' },
            { key: 'shadow_archon', name: 'Shadow Archon Malakor', title: 'Echo of the Void Singularity', level: 18, elem: 'Dark', color: 'from-purple-800 to-black' },
            { key: 'void_leviathan', name: 'Primordial Void Leviathan', title: 'World-Devourer of Eternity', level: 25, elem: 'Dark', color: 'from-rose-950 via-purple-950 to-black' },
          ].map(boss => (
            <div
              key={boss.key}
              className="bg-white/5 border border-white/10 p-5 flex flex-col justify-between space-y-4 hover:border-red-600/60 transition-all shadow-xl backdrop-blur-sm"
            >
              <div>
                <div className={`w-full h-28 bg-gradient-to-tr ${boss.color} p-4 flex flex-col justify-between shadow-inner mb-3 border border-white/10`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase bg-black/60 px-2 py-0.5 text-white">
                      {boss.elem} Boss
                    </span>
                    <span className="text-xs font-mono font-bold text-red-400">
                      LV.{boss.level}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black italic uppercase text-base text-white">{boss.name}</h4>
                    <p className="text-xs text-white/80 font-mono">{boss.title}</p>
                  </div>
                </div>

                <div className="text-xs font-mono text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>THREAT RATING:</span>
                    <span className="text-red-500 font-bold">★ ★ ★ ★ ★</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ESTIMATED HP:</span>
                    <span className="text-white font-bold">{(boss.level * 800 * 2.5).toLocaleString()} HP</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartBossRush(boss.key as any, boss.level)}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>Challenge Boss</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mode 2: Endless Abyss */}
      {selectedMode === 'endless_abyss' && (
        <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-6 sm:p-8 space-y-6 max-w-2xl mx-auto text-center shadow-2xl backdrop-blur-sm">
          <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-red-600 via-red-900 to-black flex items-center justify-center p-1 shadow-2xl shadow-red-600/30 border border-white/20">
            <Layers className="w-10 h-10 text-white animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="font-black italic uppercase tracking-tight text-2xl text-white">
              The Endless Abyssal Spire
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto leading-relaxed font-mono">
              Descend through infinite layers of the corrupted void. Enemies gain +10% stats with every floor cleared. Test the absolute limits of your FOF squad!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-xs font-mono">
            <div className="bg-black/60 border border-white/10 p-3">
              <span className="text-gray-500 block text-[10px] uppercase">Current Floor</span>
              <span className="text-xl font-black text-red-400">Floor {profile.arenaStats.endlessWaveRecord + 1}</span>
            </div>
            <div className="bg-black/60 border border-white/10 p-3">
              <span className="text-gray-500 block text-[10px] uppercase">Highest Record</span>
              <span className="text-xl font-black text-white">Floor {profile.arenaStats.endlessWaveRecord + 1}</span>
            </div>
          </div>

          <button
            onClick={handleStartEndlessAbyss}
            className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-wider shadow-xl shadow-red-600/40 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Enter Floor {profile.arenaStats.endlessWaveRecord + 1}</span>
          </button>
        </div>
      )}

      {/* Mode 3: Custom Duel Sandbox */}
      {selectedMode === 'custom_duel' && (
        <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-6 sm:p-8 space-y-6 max-w-xl mx-auto shadow-2xl backdrop-blur-sm">
          <div className="space-y-1">
            <h3 className="font-black italic uppercase text-xl text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-red-500" />
              <span>Combat Sandbox Simulator</span>
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Configure simulated target dummies to test damage outputs, combo rotations, and elemental advantages.
            </p>
          </div>

          {/* Level slider */}
          <div className="space-y-2 bg-black/60 border border-white/10 p-4">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400 uppercase">Enemy Combat Level:</span>
              <span className="text-red-400 font-bold">Level {customLevel}</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={customLevel}
              onChange={(e) => setCustomLevel(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Count selector */}
          <div className="space-y-2 bg-black/60 border border-white/10 p-4">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400 uppercase">Opponents Count:</span>
              <span className="text-white font-bold">{customCount} Combatants</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map(num => (
                <button
                  key={num}
                  onClick={() => setCustomCount(num)}
                  className={`flex-1 py-2 text-xs font-mono font-bold border transition-all cursor-pointer ${
                    customCount === num
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartCustomDuel}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-wider shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Launch Simulation Match</span>
          </button>
        </div>
      )}
    </div>
  );
};

