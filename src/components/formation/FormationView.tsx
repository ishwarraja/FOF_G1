import React from 'react';
import { useGame } from '../../context/GameContext';
import { Fighter } from '../../types/game';
import { 
  Shield, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  Info
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const FormationView: React.FC = () => {
  const { profile, updateFormation } = useGame();

  const currentFighters: (Fighter | null)[] = profile.formation.map(id => {
    return profile.roster.find(f => f.id === id) || null;
  });

  // Calculate synergy perks
  const activeElements = currentFighters.filter(Boolean).map(f => f!.element);
  const uniqueElements = new Set(activeElements);

  const totalCP = currentFighters.reduce((sum, f) => {
    if (!f) return sum;
    return sum + f.currentStats.atk * 2 + f.currentStats.def + Math.round(f.currentStats.maxHp / 10);
  }, 0);

  const handleSlotClick = (slotIdx: number) => {
    soundFX.playClick();
    const currentFighterInSlot = currentFighters[slotIdx];
    const availableRoster = profile.roster.filter(f => !profile.formation.includes(f.id) || f.id === currentFighterInSlot?.id);

    if (availableRoster.length === 0) return;

    const currentRosterIdx = availableRoster.findIndex(f => f.id === currentFighterInSlot?.id);
    const nextFighter = availableRoster[(currentRosterIdx + 1) % availableRoster.length];

    const newFormation = [...profile.formation];
    newFormation[slotIdx] = nextFighter.id;
    updateFormation(newFormation);
  };

  const handleAutoFill = () => {
    soundFX.playClick();
    const sorted = [...profile.roster].sort((a, b) => b.level - a.level);
    const newForm = sorted.slice(0, 6).map(f => f.id);
    updateFormation(newForm);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-red-500 uppercase bg-red-600/10 px-2.5 py-1 border border-red-600/30 inline-block mb-2">
            // TACTICAL DEPLOYMENT MATRIX
          </span>
          <h2 className="font-black italic uppercase tracking-tight text-2xl sm:text-3xl text-white">
            Squad Formation & Resonance
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl font-mono">
            Frontline heroes absorb direct incoming attacks and shield allies. Backline heroes gain +15% Critical Damage bonus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black/60 border border-white/10 px-4 py-2 text-right font-mono">
            <span className="text-[10px] text-gray-500 block uppercase tracking-widest">SQUAD POWER</span>
            <span className="text-lg font-black text-red-400">{totalCP.toLocaleString()} CP</span>
          </div>

          <button
            onClick={handleAutoFill}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all text-xs sm:text-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Optimal Auto-Fill</span>
          </button>
        </div>
      </div>

      {/* Main Formation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 3x2 Tactical Grid */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 space-y-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-gray-400 border-b border-white/10 pb-3">
            <span className="flex items-center gap-1.5 text-blue-400 font-bold">
              <Shield className="w-4 h-4" /> Frontline (Tank / Brawler)
            </span>
            <span className="flex items-center gap-1.5 text-red-400 font-bold">
              <Zap className="w-4 h-4" /> Backline (Damage / Support)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Frontline (Slots 0, 1, 2) */}
            <div className="space-y-3">
              {[0, 1, 2].map((slotIdx) => {
                const fighter = currentFighters[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    onClick={() => handleSlotClick(slotIdx)}
                    className={`p-4 border transition-all cursor-pointer select-none ${
                      fighter
                        ? 'bg-black/60 border-blue-500/50 hover:border-blue-400 shadow-md'
                        : 'bg-black/20 border-dashed border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-blue-400 uppercase font-bold tracking-wider">
                        Front Slot #{slotIdx + 1}
                      </span>
                      {fighter && (
                        <span className="text-[10px] font-mono text-gray-300 bg-white/10 px-1.5 py-0.5">
                          LV.{fighter.level}
                        </span>
                      )}
                    </div>

                    {fighter ? (
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-tr ${fighter.avatarColor} flex items-center justify-center font-black italic text-white shadow`}>
                          {fighter.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black italic uppercase text-sm text-white">{fighter.name}</h4>
                          <span className="text-xs text-gray-400 font-mono">{fighter.role} • {fighter.element}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 font-mono uppercase italic py-2 text-center">[ TAP TO ASSIGN ]</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Backline (Slots 3, 4, 5) */}
            <div className="space-y-3">
              {[3, 4, 5].map((slotIdx) => {
                const fighter = currentFighters[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    onClick={() => handleSlotClick(slotIdx)}
                    className={`p-4 border transition-all cursor-pointer select-none ${
                      fighter
                        ? 'bg-black/60 border-red-500/50 hover:border-red-400 shadow-md'
                        : 'bg-black/20 border-dashed border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-red-400 uppercase font-bold tracking-wider">
                        Back Slot #{slotIdx - 2} (+15% Crit)
                      </span>
                      {fighter && (
                        <span className="text-[10px] font-mono text-gray-300 bg-white/10 px-1.5 py-0.5">
                          LV.{fighter.level}
                        </span>
                      )}
                    </div>

                    {fighter ? (
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-tr ${fighter.avatarColor} flex items-center justify-center font-black italic text-white shadow`}>
                          {fighter.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black italic uppercase text-sm text-white">{fighter.name}</h4>
                          <span className="text-xs text-gray-400 font-mono">{fighter.role} • {fighter.element}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 font-mono uppercase italic py-2 text-center">[ TAP TO ASSIGN ]</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Active Elemental Synergies */}
        <div className="bg-white/5 border border-white/10 p-6 space-y-4 shadow-xl flex flex-col justify-between backdrop-blur-sm">
          <div className="space-y-3">
            <h3 className="font-black italic uppercase tracking-wider text-base text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-500" /> Active Synergies
            </h3>

            {/* Synergy 1: Full Prism Resonance */}
            <div className={`p-3 border text-xs space-y-1 ${
              uniqueElements.size >= 5
                ? 'bg-red-600/20 border-red-600 text-white'
                : 'bg-black/60 border-white/10 text-gray-500'
            }`}>
              <div className="flex items-center justify-between font-bold uppercase tracking-wider font-mono">
                <span>Prism Resonance (5+ Elements)</span>
                <span>{uniqueElements.size >= 5 ? 'ACTIVE' : `${uniqueElements.size}/5`}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                +20% All Party Stats, +15% Ultimate Energy Recharge Speed.
              </p>
            </div>

            {/* Synergy 2: Flame & Frost Duo */}
            <div className={`p-3 border text-xs space-y-1 ${
              activeElements.includes('Fire') && activeElements.includes('Ice')
                ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-200'
                : 'bg-black/60 border-white/10 text-gray-500'
            }`}>
              <div className="flex items-center justify-between font-bold uppercase tracking-wider font-mono">
                <span>Thermal Convergence (Fire + Ice)</span>
                <span>{activeElements.includes('Fire') && activeElements.includes('Ice') ? 'ACTIVE' : 'INACTIVE'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Frozen enemies take +25% Fire damage when shattered.
              </p>
            </div>

            {/* Synergy 3: Light & Shadow Equilibrium */}
            <div className={`p-3 border text-xs space-y-1 ${
              activeElements.includes('Light') && activeElements.includes('Dark')
                ? 'bg-purple-950/40 border-purple-500/80 text-purple-200'
                : 'bg-black/60 border-white/10 text-gray-500'
            }`}>
              <div className="flex items-center justify-between font-bold uppercase tracking-wider font-mono">
                <span>Twilight Equilibrium (Light + Dark)</span>
                <span>{activeElements.includes('Light') && activeElements.includes('Dark') ? 'ACTIVE' : 'INACTIVE'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Heals apply an extra 10% lifesteal aura to all allies.
              </p>
            </div>
          </div>

          <div className="bg-black/60 border border-white/10 p-4 text-[11px] text-gray-400 font-mono leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>Tap any slot on the grid to cycle between available fighters from your FOF roster.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

