import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  BookOpen, 
  Sparkles, 
  Lock, 
  Unlock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const CodexView: React.FC = () => {
  const { profile } = useGame();
  const [activeTab, setActiveTab] = useState<'crest' | 'elements' | 'factions'>('crest');

  const unlockedShardsCount = profile.shards.filter(s => s.isUnlocked).length;

  const factions = [
    {
      name: 'Crimson Vanguard',
      element: 'Fire',
      leader: 'Ignis the Cinderblade',
      banner: 'from-orange-600 to-red-800',
      description: 'An unyielding legion stationed at the foot of Mount Pyros. They weaponize raw volcanic magma and battle-forged steel to burn away darkness.',
    },
    {
      name: 'Glacial Enclave',
      element: 'Ice',
      leader: 'Valeria the Frost Sentinel',
      banner: 'from-cyan-600 to-blue-900',
      description: 'Guardians of the Whispering Tundra. Bound by ancient cryo-oaths, they manipulate zero-kelvin barriers to safeguard the northern realm.',
    },
    {
      name: 'Windward Syndicate',
      element: 'Wind',
      leader: 'Zephyr the Stormstrider',
      banner: 'from-emerald-500 to-teal-800',
      description: 'Aerial aerialists and storm-runners inhabiting the floating islands of Skystride. Masters of hypersonic velocity and critical strike assassination.',
    },
    {
      name: 'Sunstone Order',
      element: 'Light',
      leader: 'Aurelia the Radiant Luminary',
      banner: 'from-yellow-400 to-amber-600',
      description: 'Devoted high priests and priestesses of the Solstice Spire. They channel pure celestial solar light to purge corruption and mend any mortal wound.',
    },
    {
      name: 'Shadow Abyssal',
      element: 'Dark',
      leader: 'Malakor the Void Sovereign',
      banner: 'from-purple-800 to-indigo-950',
      description: 'Ancient dark sorcerers who commune with the cosmos past the Veil of Nyx, weaving reality-warping void singularity curses.',
    },
    {
      name: 'Earthbound Bastion',
      element: 'Earth',
      leader: 'Terran the Stoneclad Colossus',
      banner: 'from-amber-700 to-stone-900',
      description: 'Subterranean titan brawlers forged deep within Obsidian mountain quarries, capable of triggering tectonic earthquakes.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-red-500 uppercase bg-red-600/10 px-2.5 py-1 border border-red-600/30 inline-block mb-2">
            // ARCHIVES OF AETHELGARD
          </span>
          <h2 className="font-black italic uppercase tracking-tight text-2xl sm:text-3xl text-white">
            The Crest of Eternity & Lore Codex
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl font-mono">
            Uncover cosmic lore of the Crest Shards, learn elemental mechanics, and study faction histories.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2">
          {[
            { id: 'crest', label: 'Crest Shards', icon: Sparkles },
            { id: 'elements', label: 'Elemental Wheel', icon: Layers },
            { id: 'factions', label: 'Faction Archives', icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-black italic uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-black/40 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Crest of Eternity Shards Shrine */}
      {activeTab === 'crest' && (
        <div className="space-y-6">
          {/* Shrine Progress */}
          <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl backdrop-blur-sm">
            <div className="space-y-1">
              <h3 className="font-black italic uppercase text-lg text-white">
                Altar of the Crest of Eternity
              </h3>
              <p className="text-xs text-gray-400 max-w-lg font-mono">
                Clearing campaign acts liberates Prime Shards, permanently bestowing global passive bonuses to your entire roster.
              </p>
            </div>
            <div className="bg-black/60 border border-white/10 px-5 py-2.5 font-mono text-center">
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider">SHARDS RESTORED</span>
              <span className="text-xl font-black text-red-400">{unlockedShardsCount} / 6</span>
            </div>
          </div>

          {/* 6 Shards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.shards.map((shard) => {
              return (
                <div
                  key={shard.id}
                  className={`border p-5 flex flex-col justify-between space-y-4 transition-all shadow-xl backdrop-blur-sm ${
                    shard.isUnlocked
                      ? 'bg-white/5 border-red-600/80 shadow-red-950/40'
                      : 'bg-black/40 border-white/10 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-red-400 bg-red-600/10 px-2.5 py-0.5 border border-red-600/30 uppercase">
                        {shard.element} Shard
                      </span>
                      <span className="text-xs font-mono font-bold flex items-center gap-1 text-gray-400">
                        {shard.isUnlocked ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Unlock className="w-3.5 h-3.5" /> RESTORED
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> LOCKED
                          </span>
                        )}
                      </span>
                    </div>

                    <h4 className="font-black italic uppercase text-lg text-white mb-1">
                      {shard.name}
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed mb-3">
                      {shard.description}
                    </p>

                    <div className="bg-black/60 border border-white/10 p-3 text-xs font-mono text-cyan-300">
                      <span className="text-gray-500 block text-[10px] uppercase mb-0.5">PERMANENT REALM PASSIVE:</span>
                      <strong>{shard.passiveBonus}</strong>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-gray-500 pt-2 border-t border-white/10 uppercase">
                    ORIGIN: {shard.actOrigin}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Elemental Wheel */}
      {activeTab === 'elements' && (
        <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-6 sm:p-8 space-y-6 max-w-3xl mx-auto shadow-2xl backdrop-blur-sm">
          <div className="text-center space-y-1">
            <h3 className="font-black italic uppercase text-xl text-white">
              Elemental Counter Matrix
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Targeting an element with its counter deals <strong className="text-emerald-400">+35% Super Effective Damage</strong>, while attacking an element you are weak against reduces damage by <strong className="text-red-400">25%</strong>.
            </p>
          </div>

          {/* Elemental Ring Visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-black/60 border border-white/10 p-4 space-y-3">
              <h4 className="font-black italic uppercase text-xs font-mono text-red-400 border-b border-white/10 pb-2">
                4-Way Elemental Cycle
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 bg-black/40 border border-white/5 text-orange-400">
                  <span>🔥 Fire</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-amber-500">🏔️ Earth</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-black/40 border border-white/5 text-amber-500">
                  <span>🏔️ Earth</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-emerald-400">🌪️ Wind</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-black/40 border border-white/5 text-emerald-400">
                  <span>🌪️ Wind</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-cyan-400">❄️ Ice</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-black/40 border border-white/5 text-cyan-400">
                  <span>❄️ Ice</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-orange-400">🔥 Fire</span>
                </div>
              </div>
            </div>

            <div className="bg-black/60 border border-white/10 p-4 space-y-3">
              <h4 className="font-black italic uppercase text-xs font-mono text-purple-400 border-b border-white/10 pb-2">
                Light & Dark Equilibrium
              </h4>
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-black/40 border border-white/5 text-yellow-300 space-y-1">
                  <div className="font-bold">✨ Light Element (Aurelia)</div>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Deals +30% damage to Dark monsters while cleansing team curses and amplifying defense.
                  </p>
                </div>
                <div className="p-3 bg-black/40 border border-white/5 text-purple-300 space-y-1">
                  <div className="font-bold">💀 Dark Element (Malakor)</div>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Deals +30% damage to Light units while draining life essence and inflicting vulnerability curses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Faction Archives */}
      {activeTab === 'factions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {factions.map(fac => (
            <div
              key={fac.name}
              className="bg-white/5 border border-white/10 p-5 space-y-3 shadow-xl hover:border-red-600/50 transition-all backdrop-blur-sm"
            >
              <div className={`h-24 bg-gradient-to-tr ${fac.banner} p-3 flex flex-col justify-between shadow-inner border border-white/10`}>
                <span className="text-[10px] font-mono font-bold uppercase bg-black/60 text-white px-2 py-0.5 w-fit">
                  {fac.element} Faction
                </span>
                <h4 className="font-black italic uppercase text-base text-white">{fac.name}</h4>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                {fac.description}
              </p>

              <div className="pt-2 border-t border-white/10 text-[11px] font-mono text-red-400">
                CHAMPION: <strong className="text-white">{fac.leader}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

