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
  Play, 
  Pause, 
  FastForward, 
  ChevronRight, 
  Award, 
  Target,
  FileText
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const BattleArena: React.FC = () => {
  const { 
    battleState, 
    performBattleAction, 
    exitBattle, 
    toggleAutoBattle, 
    setBattleSpeed 
  } = useGame();

  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showLogDrawer, setShowLogDrawer] = useState<boolean>(false);

  if (!battleState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Flame className="w-16 h-16 text-red-500/40 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black italic uppercase text-white">No Active Battle</h2>
        <p className="text-sm text-gray-400 mt-2 max-w-md font-mono">
          Head over to Campaign or the Arena to deploy your champions into tactical combat!
        </p>
      </div>
    );
  }

  const { playerTeam, enemyTeam, activeFighterId, isBattleOver, winner, isAutoBattle, speedMultiplier, battleLogs, floatingTexts } = battleState;
  const activeFighter = [...playerTeam, ...enemyTeam].find(f => f.id === activeFighterId);
  const isPlayerTurn = playerTeam.some(f => f.id === activeFighterId && f.isAlive);

  // Helper to render element icon
  const renderElementBadge = (element: string) => {
    switch (element) {
      case 'Fire': return <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 bg-red-950/80 px-1.5 py-0.5 border border-red-800"><Flame className="w-3 h-3" /> Fire</span>;
      case 'Ice': return <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 border border-cyan-800"><Shield className="w-3 h-3" /> Ice</span>;
      case 'Wind': return <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 border border-emerald-800"><Wind className="w-3 h-3" /> Wind</span>;
      case 'Light': return <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-yellow-300 bg-yellow-950/80 px-1.5 py-0.5 border border-yellow-800"><Sparkles className="w-3 h-3" /> Light</span>;
      case 'Dark': return <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-purple-400 bg-purple-950/80 px-1.5 py-0.5 border border-purple-800"><Skull className="w-3 h-3" /> Dark</span>;
      case 'Earth': return <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-500 bg-stone-900/80 px-1.5 py-0.5 border border-amber-800"><Mountain className="w-3 h-3" /> Earth</span>;
      default: return null;
    }
  };

  const handleSkillClick = (skill: Skill) => {
    soundFX.playClick();
    if (!activeFighter || !isPlayerTurn) return;

    if (skill.currentCooldown && skill.currentCooldown > 0) return;

    if (skill.type === 'Ultimate' && activeFighter.currentStats.energy < (skill.energyCost || 100)) {
      return;
    }

    if (skill.targetType === 'all_enemies' || skill.targetType === 'all_allies' || skill.targetType === 'self' || skill.targetType === 'lowest_hp_ally') {
      performBattleAction(activeFighter.id, skill);
      setSelectedSkill(null);
      setSelectedTargetId(null);
    } else {
      setSelectedSkill(skill);
      if (selectedTargetId) {
        performBattleAction(activeFighter.id, skill, selectedTargetId);
        setSelectedSkill(null);
        setSelectedTargetId(null);
      }
    }
  };

  const handleTargetClick = (target: Fighter) => {
    if (!target.isAlive) return;
    soundFX.playClick();
    setSelectedTargetId(target.id);

    if (selectedSkill && activeFighter && isPlayerTurn) {
      performBattleAction(activeFighter.id, selectedSkill, target.id);
      setSelectedSkill(null);
      setSelectedTargetId(null);
    }
  };

  // Render a single combatant card on the grid
  const renderFighterCard = (fighter: Fighter, isPlayer: boolean) => {
    const isActive = fighter.id === activeFighterId;
    const isTargeted = fighter.id === selectedTargetId;
    const hpPercent = Math.max(0, Math.min(100, Math.round((fighter.currentStats.hp / fighter.currentStats.maxHp) * 100)));
    const energyPercent = Math.max(0, Math.min(100, fighter.currentStats.energy));
    const isUltReady = energyPercent >= 100;
    const shield = fighter.statusEffects?.find(s => s.type === 'Shield');

    const fFloats = floatingTexts.filter(f => f.targetId === fighter.id);

    return (
      <div
        key={fighter.id}
        onClick={() => handleTargetClick(fighter)}
        className={`relative p-3 border transition-all duration-200 select-none ${
          !fighter.isAlive
            ? 'opacity-25 grayscale border-white/5 bg-black/40 cursor-not-allowed'
            : isActive
            ? 'border-red-600 bg-red-600/20 border-l-4 shadow-xl shadow-red-950/40 transform -translate-y-0.5'
            : isTargeted
            ? 'border-red-500 bg-red-950/40 ring-1 ring-red-500 cursor-pointer'
            : 'border-white/10 bg-black/60 hover:border-white/30 hover:bg-white/5 cursor-pointer'
        }`}
      >
        {/* Floating Numbers & Combat Text */}
        <div className="absolute -top-4 left-0 right-0 pointer-events-none flex flex-col items-center gap-1 z-30 font-mono">
          {fFloats.slice(-2).map(ft => (
            <span
              key={ft.id}
              className={`text-xs font-black px-2 py-0.5 shadow-lg animate-damage-float ${
                ft.type === 'crit'
                  ? 'bg-red-600 text-yellow-200 text-sm ring-1 ring-yellow-400'
                  : ft.type === 'heal'
                  ? 'bg-emerald-600 text-emerald-100'
                  : ft.type === 'shield'
                  ? 'bg-cyan-600 text-cyan-100'
                  : ft.type === 'miss'
                  ? 'bg-gray-700 text-gray-200'
                  : 'bg-red-950 text-red-300 border border-red-700'
              }`}
            >
              {ft.text}
            </span>
          ))}
        </div>

        {/* Turn Marker */}
        {isActive && (
          <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 shadow-md animate-pulse tracking-wider">
            ACTIVE TURN
          </div>
        )}

        {/* Target Reticle Indicator */}
        {isTargeted && (
          <div className="absolute -top-2.5 right-2 text-red-500 animate-spin">
            <Target className="w-4 h-4" />
          </div>
        )}

        {/* Header: Name, Level, Element */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <div className={`w-7 h-7 bg-gradient-to-tr ${fighter.avatarColor} flex items-center justify-center text-white text-xs font-black italic shrink-0 shadow`}>
              {fighter.name.charAt(0)}
            </div>
            <div className="truncate">
              <h4 className="text-xs font-black italic uppercase text-white truncate">{fighter.name}</h4>
              <span className="text-[10px] text-gray-400 font-mono">LV.{fighter.level} {fighter.role}</span>
            </div>
          </div>
          <div className="shrink-0">{renderElementBadge(fighter.element)}</div>
        </div>

        {/* HP Bar */}
        <div className="space-y-1 my-1">
          <div className="flex justify-between text-[10px] font-mono text-gray-400">
            <span>HP</span>
            <span>{fighter.currentStats.hp} / {fighter.currentStats.maxHp}</span>
          </div>
          <div className="w-full h-2 bg-black/80 overflow-hidden border border-white/10 relative">
            <div
              className={`h-full transition-all duration-300 ${
                hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-red-600'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
            {shield && (
              <div
                className="absolute top-0 right-0 h-full bg-cyan-400/80 animate-pulse"
                style={{ width: `${Math.min(100, Math.round((shield.value / fighter.currentStats.maxHp) * 100))}%` }}
              />
            )}
          </div>
        </div>

        {/* Energy Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px] font-mono text-gray-400">
            <span>ENERGY</span>
            <span>{energyPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-black/80 overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-300 ${
                isUltReady ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
              }`}
              style={{ width: `${energyPercent}%` }}
            />
          </div>
        </div>

        {/* Status Effects List */}
        {fighter.statusEffects && fighter.statusEffects.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-white/10">
            {fighter.statusEffects.map((st, i) => (
              <span
                key={i}
                className="text-[9px] px-1 bg-black/80 text-red-400 border border-white/10 font-mono"
                title={`${st.type} (${st.duration} turns remaining)`}
              >
                {st.type}:{st.duration}t
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Top Action Timeline & Controls */}
      <div className="bg-white/5 border border-white/10 p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg backdrop-blur-sm">
        {/* Speed Timeline */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest shrink-0">// ACTION ORDER:</span>
          {battleState.actionQueue.map((fid, idx) => {
            const fighter = [...playerTeam, ...enemyTeam].find(f => f.id === fid);
            if (!fighter || !fighter.isAlive) return null;
            const isP = playerTeam.some(f => f.id === fid);
            return (
              <div
                key={`${fid}_${idx}`}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold shrink-0 border ${
                  idx === 0
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                    : isP
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                    : 'bg-red-950/60 text-red-300 border-red-800/60'
                }`}
              >
                <span>{fighter.name.split(' ')[0]}</span>
                {idx < battleState.actionQueue.length - 1 && <ChevronRight className="w-3 h-3 text-gray-500" />}
              </div>
            );
          })}
        </div>

        {/* Combat Mode Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setBattleSpeed(speedMultiplier === 1 ? 2 : 1)}
            className="flex items-center gap-1 px-3 py-1.5 bg-black/60 border border-white/10 text-gray-200 hover:text-red-400 font-bold transition-colors cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>{speedMultiplier}x SPEED</span>
          </button>

          <button
            onClick={toggleAutoBattle}
            className={`flex items-center gap-1 px-3 py-1.5 border font-bold transition-all cursor-pointer ${
              isAutoBattle
                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/30'
                : 'bg-black/60 text-gray-300 border-white/10 hover:text-white'
            }`}
          >
            {isAutoBattle ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>AUTO: {isAutoBattle ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-black/60 border border-white/10 text-gray-300 hover:text-white cursor-pointer"
            title="Toggle Battle Logs"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (window.confirm('Surrender this battle and retreat?')) {
                exitBattle(false);
              }
            }}
            className="px-3 py-1.5 bg-red-950/80 border border-red-900 text-red-300 hover:bg-red-900 cursor-pointer"
          >
            RETREAT
          </button>
        </div>
      </div>

      {/* Main Tactical Grid (Player Team Left vs Enemy Team Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white/5 border border-white/10 p-4 sm:p-6 backdrop-blur-sm shadow-2xl relative overflow-hidden">
        {/* Visual arena center line / divider */}
        <div className="hidden lg:block absolute inset-y-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-red-600/30 to-transparent pointer-events-none" />

        {/* Player Formation Grid (3 Front, 3 Back) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black italic uppercase text-sm text-blue-400 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Vanguard Squad (Allies)
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              ALIVE: {playerTeam.filter(f => f.isAlive).length} / {playerTeam.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Frontline */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold text-center">
                FRONTLINE (DEFENDERS)
              </div>
              {playerTeam.slice(0, 3).map(f => renderFighterCard(f, true))}
            </div>

            {/* Backline */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold text-center">
                BACKLINE (RANGED / SUPPORT)
              </div>
              {playerTeam.slice(3, 6).map(f => renderFighterCard(f, true))}
            </div>
          </div>
        </div>

        {/* Enemy Formation Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black italic uppercase text-sm text-red-500 flex items-center gap-2">
              <Skull className="w-4 h-4" /> Abyssal Legion (Enemies)
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              ALIVE: {enemyTeam.filter(f => f.isAlive).length} / {enemyTeam.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Frontline */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold text-center">
                ENEMY FRONTLINE
              </div>
              {enemyTeam.slice(0, 3).map(f => renderFighterCard(f, false))}
            </div>

            {/* Backline */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold text-center">
                ENEMY BACKLINE
              </div>
              {enemyTeam.slice(3, 6).map(f => renderFighterCard(f, false))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Command Dock */}
      {isPlayerTurn && activeFighter && (
        <div className="bg-white/5 border border-white/10 border-l-4 border-red-600 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 bg-gradient-to-tr ${activeFighter.avatarColor} flex items-center justify-center font-black italic text-white shadow-md`}>
                {activeFighter.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-black italic uppercase text-sm text-red-400">
                  {activeFighter.name}'s Command Turn
                </h4>
                <p className="text-xs text-gray-400 font-mono">
                  Select a skill, then tap a target if required.
                </p>
              </div>
            </div>

            {selectedSkill && (
              <div className="bg-red-600/20 border border-red-600 text-white px-3 py-1 text-xs font-mono animate-pulse">
                READY: {selectedSkill.name.toUpperCase()} (SELECT TARGET ON GRID)
              </div>
            )}
          </div>

          {/* Skill Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {activeFighter.skills.map((skill: Skill) => {
              const isCooldown = (skill.currentCooldown || 0) > 0;
              const isUlt = skill.type === 'Ultimate';
              const isUltReady = isUlt && activeFighter.currentStats.energy >= (skill.energyCost || 100);
              const isSelected = selectedSkill?.id === skill.id;

              return (
                <button
                  key={skill.id}
                  onClick={() => handleSkillClick(skill)}
                  disabled={isCooldown || (isUlt && !isUltReady)}
                  className={`p-3 border text-left flex flex-col justify-between transition-all duration-200 relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'border-red-600 bg-red-600/30 ring-1 ring-red-500 shadow-lg'
                      : isUlt
                      ? isUltReady
                        ? 'border-red-500 bg-gradient-to-br from-red-950 via-red-900 to-black hover:border-red-400 shadow-xl shadow-red-600/30'
                        : 'border-white/10 bg-black/40 opacity-50 cursor-not-allowed'
                      : isCooldown
                      ? 'border-white/10 bg-black/40 opacity-40 cursor-not-allowed'
                      : 'border-white/10 bg-black/60 hover:border-red-600 hover:bg-white/5'
                  }`}
                >
                  {/* Cooldown Overlay */}
                  {isCooldown && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] flex items-center justify-center font-mono font-bold text-gray-400 text-xs uppercase">
                      Cooldown: {skill.currentCooldown} turns
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-black italic uppercase text-xs text-white">{skill.name}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 uppercase ${
                      isUlt ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-300'
                    }`}>
                      {skill.type}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                    {skill.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-1 border-t border-white/10">
                    <span>TARGET: {skill.targetType.replace('_', ' ').toUpperCase()}</span>
                    {isUlt && <span className="text-red-400">COST: {skill.energyCost || 100} EP</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Battle Combat Log Drawer */}
      {showLogDrawer && (
        <div className="bg-black/90 border border-white/10 p-4 shadow-xl max-h-60 overflow-y-auto font-mono text-xs space-y-1.5">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-gray-400 font-bold uppercase">
            <span>// COMBAT ACTION LOGS</span>
            <span>TURN: {battleState.turnCount}</span>
          </div>
          {battleLogs.map((log) => (
            <div key={log.id} className="text-gray-300 flex items-start gap-2 py-0.5">
              <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
              <span className={`font-semibold shrink-0 ${
                log.type === 'attack' ? 'text-red-400' : log.type === 'heal' ? 'text-emerald-400' : log.type === 'death' ? 'text-red-500' : 'text-cyan-400'
              }`}>
                [{log.sourceName}]:
              </span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Victory / Defeat Modal */}
      {isBattleOver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 sm:p-8 border text-center shadow-2xl ${
            winner === 'player'
              ? 'bg-black/95 border-red-600 shadow-red-600/30'
              : 'bg-black/95 border-red-900 shadow-red-950/50'
          }`}>
            <div className="inline-flex p-4 mb-4 bg-black border border-white/10">
              {winner === 'player' ? (
                <Award className="w-16 h-16 text-red-500 animate-bounce" />
              ) : (
                <Skull className="w-16 h-16 text-red-600 animate-pulse" />
              )}
            </div>

            <h2 className="font-black italic uppercase tracking-tight text-3xl sm:text-4xl text-white mb-2">
              {winner === 'player' ? 'VICTORY ACHIEVED' : 'DEFEAT'}
            </h2>

            <p className="text-sm text-gray-400 mb-6 font-mono">
              {winner === 'player'
                ? 'Your squad prevailed against the rift aberrations and restored balance to this sector!'
                : 'Your squad was overwhelmed by the rift forces. Upgrade your fighters in the Forge and try again!'}
            </p>

            {/* Rewards showcase if won in campaign stage */}
            {winner === 'player' && battleState.stageInfo && (
              <div className="bg-white/5 border border-white/10 p-4 mb-6 text-left space-y-2 font-mono">
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  STAGE CLEARED: {battleState.stageInfo.title}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>GOLD EARNED:</span>
                  <span className="text-red-400 font-bold">+{battleState.stageInfo.firstClearRewards.gold} GOLD</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>EXPERIENCE:</span>
                  <span className="text-emerald-400 font-bold">+{battleState.stageInfo.firstClearRewards.exp} EXP TO ALL HEROES</span>
                </div>
                {battleState.stageInfo.firstClearRewards.shardId && (
                  <div className="flex items-center justify-between text-xs text-cyan-300 pt-1 border-t border-white/10">
                    <span>CREST SHARD LIBERATED:</span>
                    <span className="font-bold">✨ SHARD RESTORED!</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => exitBattle(true)}
                className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                {winner === 'player' ? 'Claim Spoils & Continue' : 'Return to Citadel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

