import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { FORGE_MATERIALS } from '../../data/items';
import { Equipment, Rune } from '../../types/game';
import { 
  Anvil, 
  Coins
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const ForgeView: React.FC = () => {
  const { profile, craftEquipment } = useGame();
  const [activeTab, setActiveTab] = useState<'gear' | 'runes'>('gear');

  const gearRecipes: {
    id: string;
    name: string;
    type: 'equipment';
    resultItem: Equipment;
    requiredMaterials: { materialId: string; count: number }[];
    goldCost: number;
  }[] = [
    {
      id: 'craft_pyros_blade',
      name: 'Infernal Sun-Edge',
      type: 'equipment',
      resultItem: {
        id: `weap_${Date.now()}_1`,
        name: 'Infernal Sun-Edge',
        slot: 'weapon',
        level: 1,
        maxLevel: 20,
        element: 'Fire',
        stats: { atk: 65, critRate: 10 },
        rarity: 'Legendary',
        description: 'Imbued with concentrated volcanic plasma from the Ashen Crucible.',
      },
      requiredMaterials: [
        { materialId: 'pyros_ember', count: 3 },
        { materialId: 'tectonic_slate', count: 2 },
      ],
      goldCost: 800,
    },
    {
      id: 'craft_boreas_shield',
      name: 'Glacial Aegis of Eternity',
      type: 'equipment',
      resultItem: {
        id: `arm_${Date.now()}_2`,
        name: 'Glacial Aegis of Eternity',
        slot: 'armor',
        level: 1,
        maxLevel: 20,
        element: 'Ice',
        stats: { hp: 600, def: 65 },
        rarity: 'Legendary',
        description: 'Forged from sub-zero glacier sheets that never melt.',
      },
      requiredMaterials: [
        { materialId: 'glacial_shard', count: 3 },
        { materialId: 'tectonic_slate', count: 2 },
      ],
      goldCost: 800,
    },
    {
      id: 'craft_tempest_ring',
      name: 'Skystride Hurricane Band',
      type: 'equipment',
      resultItem: {
        id: `acc_${Date.now()}_3`,
        name: 'Skystride Hurricane Band',
        slot: 'accessory',
        level: 1,
        maxLevel: 20,
        element: 'Wind',
        stats: { spd: 22, critRate: 15 },
        rarity: 'Legendary',
        description: 'Constantly generates tailwinds to quicken action gauges.',
      },
      requiredMaterials: [
        { materialId: 'tempest_feather', count: 4 },
        { materialId: 'sunstone_crystal', count: 2 },
      ],
      goldCost: 900,
    },
    {
      id: 'craft_void_cloak',
      name: 'Abyssal Singularity Cloak',
      type: 'equipment',
      resultItem: {
        id: `acc_${Date.now()}_4`,
        name: 'Abyssal Singularity Cloak',
        slot: 'accessory',
        level: 1,
        maxLevel: 20,
        element: 'Dark',
        stats: { atk: 50, critDmg: 30 },
        rarity: 'Legendary',
        description: 'Woven with dark antimatter fibers that swallow incoming kinetic energy.',
      },
      requiredMaterials: [
        { materialId: 'void_matter', count: 3 },
        { materialId: 'pyros_ember', count: 2 },
      ],
      goldCost: 1000,
    },
  ];

  const runeRecipes: {
    id: string;
    name: string;
    type: 'rune';
    resultItem: Rune;
    requiredMaterials: { materialId: string; count: number }[];
    goldCost: number;
  }[] = [
    {
      id: 'craft_rune_flame_crit',
      name: 'Rune of Blazing Precision',
      type: 'rune',
      resultItem: {
        id: `rune_${Date.now()}_1`,
        name: 'Rune of Blazing Precision',
        element: 'Fire',
        bonusStat: 'critRate',
        bonusValue: 12,
        rarity: 'Epic',
      },
      requiredMaterials: [
        { materialId: 'pyros_ember', count: 2 },
        { materialId: 'tempest_feather', count: 2 },
      ],
      goldCost: 500,
    },
    {
      id: 'craft_rune_frost_hp',
      name: 'Rune of Absolute Vitality',
      type: 'rune',
      resultItem: {
        id: `rune_${Date.now()}_2`,
        name: 'Rune of Absolute Vitality',
        element: 'Ice',
        bonusStat: 'hp',
        bonusValue: 450,
        rarity: 'Epic',
      },
      requiredMaterials: [
        { materialId: 'glacial_shard', count: 2 },
        { materialId: 'tectonic_slate', count: 2 },
      ],
      goldCost: 500,
    },
    {
      id: 'craft_rune_sun_atk',
      name: 'Rune of Solar Wrath',
      type: 'rune',
      resultItem: {
        id: `rune_${Date.now()}_3`,
        name: 'Rune of Solar Wrath',
        element: 'Light',
        bonusStat: 'atk',
        bonusValue: 40,
        rarity: 'Epic',
      },
      requiredMaterials: [
        { materialId: 'sunstone_crystal', count: 3 },
      ],
      goldCost: 600,
    },
  ];

  const handleCraft = (recipe: any) => {
    const success = craftEquipment(recipe);
    if (!success) {
      alert('Crafting failed! Make sure you have enough gold and required elemental materials from campaign drops.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-red-500 uppercase bg-red-600/10 px-2.5 py-1 border border-red-600/30 inline-block mb-2">
            // ANCIENT ARMORY & RUNIC ALTAR
          </span>
          <h2 className="font-black italic uppercase tracking-tight text-2xl sm:text-3xl text-white">
            The Celestial Forge
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl font-mono">
            Transmute elemental cores and raw minerals into legendary gear and powerful stat-enhancing runes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab('gear');
            }}
            className={`px-4 py-2 text-xs sm:text-sm font-black italic uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'gear'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-black/40 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            Legendary Gear
          </button>
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab('runes');
            }}
            className={`px-4 py-2 text-xs sm:text-sm font-black italic uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'runes'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-black/40 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            Elemental Runes
          </button>
        </div>
      </div>

      {/* Material Stockpile Overview */}
      <div className="bg-white/5 border border-white/10 p-5 shadow-xl space-y-3 backdrop-blur-sm">
        <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
          // MATERIAL STOCKPILE:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(FORGE_MATERIALS).map(([matKey, mat]) => {
            const count = profile.inventory.materials[matKey] || 0;
            return (
              <div
                key={matKey}
                className="bg-black/60 border border-white/10 p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono text-gray-400 truncate">{mat.name.split(' ')[0]}</span>
                  <span className={`text-[10px] font-mono font-bold px-1 ${
                    mat.rarity === 'Legendary' ? 'text-red-400 bg-red-950/60' : 'text-cyan-400 bg-cyan-950/60'
                  }`}>
                    {mat.rarity}
                  </span>
                </div>
                <div className="text-xl font-mono font-black text-white">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Crafting Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(activeTab === 'gear' ? gearRecipes : runeRecipes).map(recipe => {
          const canAffordGold = profile.gold >= recipe.goldCost;
          const hasMaterials = recipe.requiredMaterials.every(
            m => (profile.inventory.materials[m.materialId] || 0) >= m.count
          );
          const canCraft = canAffordGold && hasMaterials;

          return (
            <div
              key={recipe.id}
              className="bg-white/5 border border-white/10 p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-red-600/50 transition-all backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-red-400 bg-red-600/10 px-2 py-0.5 border border-red-600/30 uppercase">
                    {recipe.type === 'equipment' ? `${(recipe.resultItem as Equipment).slot} • ${(recipe.resultItem as Equipment).rarity}` : 'Elemental Rune'}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-mono text-red-400 font-bold">
                    <Coins className="w-3.5 h-3.5 text-red-500" />
                    <span>{recipe.goldCost} GOLD</span>
                  </div>
                </div>

                <h4 className="font-black italic uppercase text-base text-white mb-1">
                  {recipe.name}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-3 font-mono">
                  {'description' in recipe.resultItem ? (recipe.resultItem as Equipment).description : `Grants +${(recipe.resultItem as Rune).bonusValue} ${(recipe.resultItem as Rune).bonusStat.toUpperCase()} when inscribed into a rune socket.`}
                </p>

                {/* Stats granted preview */}
                <div className="bg-black/60 border border-white/10 p-2.5 text-xs font-mono text-cyan-300 mb-3">
                  {recipe.type === 'equipment' ? (
                    Object.entries((recipe.resultItem as Equipment).stats).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' | ')
                  ) : (
                    `+${(recipe.resultItem as Rune).bonusValue} ${(recipe.resultItem as Rune).bonusStat.toUpperCase()} BONUS`
                  )}
                </div>

                {/* Required Materials list */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">REQUIRED MATERIALS:</span>
                  <div className="flex flex-wrap gap-2">
                    {recipe.requiredMaterials.map(rm => {
                      const owned = profile.inventory.materials[rm.materialId] || 0;
                      const hasEnough = owned >= rm.count;
                      const matName = FORGE_MATERIALS[rm.materialId]?.name || rm.materialId;

                      return (
                        <span
                          key={rm.materialId}
                          className={`text-[11px] font-mono px-2 py-1 border flex items-center gap-1 ${
                            hasEnough
                              ? 'bg-black/60 text-gray-300 border-white/10'
                              : 'bg-red-950/40 text-red-400 border-red-900'
                          }`}
                        >
                          <span>{matName.split(' ')[0]}:</span>
                          <strong className={hasEnough ? 'text-emerald-400' : 'text-red-400'}>
                            {owned}/{rm.count}
                          </strong>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCraft(recipe)}
                disabled={!canCraft}
                className={`w-full py-3 px-4 font-black italic uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  canCraft
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                    : 'bg-black/40 border border-white/10 text-gray-600 cursor-not-allowed'
                }`}
              >
                <Anvil className="w-4 h-4" />
                <span>{canCraft ? 'Inscribe & Craft' : 'Insufficient Materials'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

