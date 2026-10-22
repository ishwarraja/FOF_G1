import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Fighter, Skill } from '../../types/game';
import { 
  Flame, 
  Shield, 
  Wind, 
  Sparkles, 
  Skull, 
  Mountain, 
  Zap, 
  Heart, 
  Sword, 
  Activity, 
  ArrowUpCircle,
  BookOpen,
  Layers,
  Award
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const RosterView: React.FC = () => {
  const { 
    profile, 
    selectedFighter, 
    setSelectedFighter, 
    upgradeFighterLevel, 
    upgradeFighterSkill,
    equipItem,
    unequipItem,
    equipRune,
    unequipRune
  } = useGame();

  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'skills' | 'gear' | 'lore'>('stats');

  const fighter = selectedFighter || profile.roster[0];

  const renderElementIcon = (element: string) => {
    switch (element) {
      case 'Fire': return <Flame className="w-4 h-4 text-red-500" />;
      case 'Ice': return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'Wind': return <Wind className="w-4 h-4 text-emerald-400" />;
      case 'Light': return <Sparkles className="w-4 h-4 text-yellow-300" />;
      case 'Dark': return <Skull className="w-4 h-4 text-purple-400" />;
      case 'Earth': return <Mountain className="w-4 h-4 text-amber-500" />;
      default: return <Sword className="w-4 h-4 text-gray-300" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Section: Hero Grid Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black italic uppercase tracking-wider text-xl text-white flex items-center gap-2">
            <Sword className="w-5 h-5 text-red-600" />
            <span>FOF Hero Roster (Draft v0.1)</span>
          </h2>
          <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
            {profile.roster.length} CHAMPIONS REGISTERED
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {profile.roster.map((f: Fighter) => {
            const isSelected = f.id === fighter.id;
            return (
              <button
                key={f.id}
                onClick={() => {
                  soundFX.playClick();
                  setSelectedFighter(f);
                }}
                className={`p-3 border text-left flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'bg-red-600/20 border-red-600 border-l-4 shadow-xl shadow-red-950/40'
                    : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {/* Background glow */}
                <div className={`absolute -right-6 -bottom-6 w-20 h-20 bg-gradient-to-tr ${f.avatarColor} opacity-20 rounded-full blur-xl pointer-events-none`} />

                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className={`w-8 h-8 bg-gradient-to-tr ${f.avatarColor} flex items-center justify-center font-black italic text-white shadow-md`}>
                    {f.name.charAt(0)}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/60 text-red-400 border border-white/10">
                    LV.{f.level}
                  </span>
                </div>

                <div>
                  <h4 className="font-black italic uppercase tracking-tight text-xs text-white truncate">{f.name}</h4>
                  <p className="text-[10px] text-gray-400 truncate">{f.title}</p>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px]">
                  <span className="flex items-center gap-1 font-bold text-gray-300">
                    {renderElementIcon(f.element)} {f.element}
                  </span>
                  <span className="text-gray-500 font-mono uppercase text-[9px]">{f.role}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Fighter Detailed Inspector - Artistic Flair */}
      {fighter && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white/5 border border-white/10 p-6 backdrop-blur-sm shadow-2xl">
          {/* Left Column: Character Visual Card & Quick Level Up */}
          <div className="flex flex-col justify-between space-y-4">
            <div className={`p-6 bg-gradient-to-b ${fighter.avatarColor} text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[300px] border border-white/20`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-black/60 px-2.5 py-1 backdrop-blur-sm border border-white/20">
                  {fighter.faction}
                </span>
                <span className="text-xs font-black tracking-widest text-red-400 bg-black/60 px-2 py-0.5 border border-white/20">
                  ★ ★ ★ ★ ★
                </span>
              </div>

              <div className="my-auto text-center space-y-1 py-4">
                <div className="w-20 h-20 mx-auto bg-black/50 border-2 border-white/30 flex items-center justify-center shadow-inner mb-2">
                  {renderElementIcon(fighter.element)}
                </div>
                <h3 className="font-black italic uppercase tracking-tighter text-2xl sm:text-3xl text-white leading-none">{fighter.name}</h3>
                <p className="text-xs text-white/90 font-mono uppercase tracking-widest">{fighter.title}</p>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-black/60 px-3 py-2 backdrop-blur-sm border border-white/20">
                <span>ROLE: <strong className="text-red-400">{fighter.role}</strong></span>
                <span>ELEMENT: <strong className="text-cyan-300">{fighter.element}</strong></span>
              </div>
            </div>

            {/* Level Up Box */}
            <div className="bg-black/60 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400 uppercase">EXPERIENCE LEVEL:</span>
                <span className="text-red-400 font-bold">LV. {fighter.level} / 50</span>
              </div>

              <button
                onClick={() => {
                  const success = upgradeFighterLevel(fighter.id);
                  if (!success) alert('Not enough Gold to level up! Clear campaign stages to earn gold.');
                }}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>LEVEL UP (COST: 200 GOLD)</span>
              </button>
            </div>
          </div>

          {/* Right 2 Columns: Tabs (Stats, Skills, Gear, Lore) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Sub-tab Pills */}
            <div className="flex space-x-2 border-b border-white/10 pb-2 overflow-x-auto">
              {[
                { id: 'stats', label: 'Attributes & Stats', icon: Activity },
                { id: 'skills', label: 'Abilities & Tree', icon: Zap },
                { id: 'gear', label: 'Gear & Runes', icon: Layers },
                { id: 'lore', label: 'Lore & Relic', icon: BookOpen },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      soundFX.playClick();
                      setActiveSubTab(tab.id as any);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Attributes & Stats */}
            {activeSubTab === 'stats' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold uppercase">
                      <Heart className="w-3.5 h-3.5" /> Max HP
                    </div>
                    <div className="text-xl font-mono font-black text-white">{fighter.currentStats.maxHp.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 font-mono">Base: {fighter.baseStats.maxHp}</div>
                  </div>

                  <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold uppercase">
                      <Sword className="w-3.5 h-3.5" /> Attack (ATK)
                    </div>
                    <div className="text-xl font-mono font-black text-white">{fighter.currentStats.atk}</div>
                    <div className="text-[10px] text-gray-500 font-mono">Base: {fighter.baseStats.atk}</div>
                  </div>

                  <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold uppercase">
                      <Shield className="w-3.5 h-3.5" /> Defense (DEF)
                    </div>
                    <div className="text-xl font-mono font-black text-white">{fighter.currentStats.def}</div>
                    <div className="text-[10px] text-gray-500 font-mono">Base: {fighter.baseStats.def}</div>
                  </div>

                  <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase">
                      <Zap className="w-3.5 h-3.5" /> Speed (SPD)
                    </div>
                    <div className="text-xl font-mono font-black text-white">{fighter.currentStats.spd}</div>
                    <div className="text-[10px] text-gray-500 font-mono">Base: {fighter.baseStats.spd}</div>
                  </div>

                  <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-bold uppercase">
                      <Sparkles className="w-3.5 h-3.5" /> Crit Rate
                    </div>
                    <div className="text-xl font-mono font-black text-white">{fighter.currentStats.critRate}%</div>
                    <div className="text-[10px] text-gray-500 font-mono">Base: {fighter.baseStats.critRate}%</div>
                  </div>

                  <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold uppercase">
                      <Award className="w-3.5 h-3.5" /> Crit DMG
                    </div>
                    <div className="text-xl font-mono font-black text-white">{fighter.currentStats.critDmg}%</div>
                    <div className="text-[10px] text-gray-500 font-mono">Base: {fighter.baseStats.critDmg}%</div>
                  </div>
                </div>

                <div className="bg-black/40 border-l-4 border-red-600 border border-white/10 p-4 text-xs text-gray-400 leading-relaxed font-mono">
                  <h4 className="font-bold text-white mb-1 uppercase tracking-wider">// Tactical Synergy Notes:</h4>
                  {fighter.element === 'Fire' && 'Fire strikes inflict burning damage over time and melt armor. High synergy with Light buffs.'}
                  {fighter.element === 'Ice' && 'Ice units provide colossal defensive barriers and turn-skipping freeze crowd controls.'}
                  {fighter.element === 'Wind' && 'Wind assassins boast high action speed, DEF penetration, and evasive counter-attacks.'}
                  {fighter.element === 'Light' && 'Light supports cleanse all debuffs, restore party health, and grant massive ATK/DEF buffs.'}
                  {fighter.element === 'Dark' && 'Dark mages weaken enemy armor with curses, draining vitality through soul siphons.'}
                  {fighter.element === 'Earth' && 'Earth brawlers gain stacking armor when struck and inflict crushing stuns on frontline foes.'}
                </div>
              </div>
            )}

            {/* Tab 2: Abilities & Tree */}
            {activeSubTab === 'skills' && (
              <div className="space-y-3">
                {fighter.skills.map((skill: Skill) => (
                  <div
                    key={skill.id}
                    className="bg-black/60 border border-white/10 p-4 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 uppercase ${
                          skill.type === 'Ultimate' ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-300'
                        }`}>
                          {skill.type}
                        </span>
                        <h4 className="font-black italic uppercase text-sm text-white">{skill.name}</h4>
                      </div>
                      <span className="text-xs font-mono text-red-400 font-bold">
                        SKILL LV. {skill.level} / {skill.maxLevel}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      {skill.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] font-mono text-gray-400">
                      <span>COOLDOWN: {skill.cooldown} TURNS | TARGET: {skill.targetType.replace('_', ' ').toUpperCase()}</span>
                      {skill.level < skill.maxLevel && (
                        <button
                          onClick={() => {
                            const success = upgradeFighterSkill(fighter.id, skill.id);
                            if (!success) alert('Not enough Gold to upgrade skill! (Cost: 350 Gold)');
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] transition-colors cursor-pointer"
                        >
                          Upgrade (+15% Scaling) — 350 Gold
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Gear & Runes */}
            {activeSubTab === 'gear' && (
              <div className="space-y-4">
                {/* Equipment Slots */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-gray-400 uppercase mb-2">Equipped Gear:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Weapon */}
                    <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Weapon Slot</span>
                      {fighter.equipment.weapon ? (
                        <div>
                          <div className="text-xs font-bold text-red-400">{fighter.equipment.weapon.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {Object.entries(fighter.equipment.weapon.stats).map(([k, v]) => `+${v} ${k}`).join(', ')}
                          </div>
                          <button
                            onClick={() => unequipItem(fighter.id, 'weapon')}
                            className="mt-2 text-[10px] font-mono text-red-500 hover:text-red-400 uppercase"
                          >
                            [ Unequip ]
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 italic">Empty Slot</div>
                      )}
                    </div>

                    {/* Armor */}
                    <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Armor Slot</span>
                      {fighter.equipment.armor ? (
                        <div>
                          <div className="text-xs font-bold text-blue-400">{fighter.equipment.armor.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {Object.entries(fighter.equipment.armor.stats).map(([k, v]) => `+${v} ${k}`).join(', ')}
                          </div>
                          <button
                            onClick={() => unequipItem(fighter.id, 'armor')}
                            className="mt-2 text-[10px] font-mono text-red-500 hover:text-red-400 uppercase"
                          >
                            [ Unequip ]
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 italic">Empty Slot</div>
                      )}
                    </div>

                    {/* Accessory */}
                    <div className="bg-black/60 border border-white/10 p-3 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Accessory Slot</span>
                      {fighter.equipment.accessory ? (
                        <div>
                          <div className="text-xs font-bold text-purple-400">{fighter.equipment.accessory.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {Object.entries(fighter.equipment.accessory.stats).map(([k, v]) => `+${v} ${k}`).join(', ')}
                          </div>
                          <button
                            onClick={() => unequipItem(fighter.id, 'accessory')}
                            className="mt-2 text-[10px] font-mono text-red-500 hover:text-red-400 uppercase"
                          >
                            [ Unequip ]
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 italic">Empty Slot</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rune Sockets */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-gray-400 uppercase mb-2">Rune Sockets (Max 3):</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((slotIdx) => {
                      const rune = fighter.runes[slotIdx];
                      return (
                        <div key={slotIdx} className="bg-black/60 border border-white/10 p-3 space-y-1">
                          <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Socket #{slotIdx + 1}</span>
                          {rune ? (
                            <div>
                              <div className="text-xs font-bold text-emerald-400">{rune.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                +{rune.bonusValue} {rune.bonusStat.toUpperCase()}
                              </div>
                              <button
                                onClick={() => unequipRune(fighter.id, rune.id)}
                                className="mt-2 text-[10px] font-mono text-red-500 hover:text-red-400 uppercase"
                              >
                                [ Remove Rune ]
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-600 italic">Empty Socket</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Available Inventory to Equip */}
                <div className="pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono font-bold text-red-500 uppercase mb-2">Armory Storage (Tap to Equip):</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {profile.inventory.equipment.map(eq => (
                      <button
                        key={eq.id}
                        onClick={() => equipItem(fighter.id, eq)}
                        className="p-2.5 bg-black/60 border border-white/10 hover:border-red-600 text-left flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-white uppercase">{eq.name} <span className="text-gray-400">({eq.slot})</span></div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {Object.entries(eq.stats).map(([k, v]) => `+${v} ${k}`).join(', ')}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-white bg-red-600 px-2 py-1 uppercase">
                          Equip
                        </span>
                      </button>
                    ))}

                    {profile.inventory.runes.map(r => (
                      <button
                        key={r.id}
                        onClick={() => equipRune(fighter.id, r)}
                        className="p-2.5 bg-black/60 border border-white/10 hover:border-emerald-500 text-left flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-emerald-400 uppercase">{r.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            +{r.bonusValue} {r.bonusStat.toUpperCase()}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-white bg-emerald-600 px-2 py-1 uppercase">
                          Socket
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Lore & Backstory */}
            {activeSubTab === 'lore' && (
              <div className="space-y-4">
                <div className="bg-black/60 border border-white/10 p-4 space-y-2 border-l-4 border-red-600">
                  <h4 className="font-black italic uppercase text-sm text-white">
                    Signature Relic: {fighter.signatureWeaponName}
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-mono">
                    {fighter.signatureWeaponDesc}
                  </p>
                </div>

                <div className="bg-black/60 border border-white/10 p-4 space-y-2">
                  <h4 className="font-black italic uppercase text-sm text-white">
                    Hero Biography & Origin
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {fighter.backstory}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

