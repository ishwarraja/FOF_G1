import { Fighter, Skill, BattleState, BattleLogEntry, StatusEffectType } from '../types/game';
import { ELEMENT_ADVANTAGES } from '../data/characters';
import { soundFX } from './audio';

export function calculateElementalMultiplier(attackerElem: string, defenderElem: string): { multiplier: number; label: string } {
  if (attackerElem === 'Light' && defenderElem === 'Dark') return { multiplier: 1.3, label: 'EFFECTIVE!' };
  if (attackerElem === 'Dark' && defenderElem === 'Light') return { multiplier: 1.3, label: 'EFFECTIVE!' };
  
  const adv = ELEMENT_ADVANTAGES[attackerElem];
  if (!adv) return { multiplier: 1.0, label: 'NORMAL' };

  if (adv.strongAgainst === defenderElem) {
    return { multiplier: 1.35, label: 'SUPER EFFECTIVE!' };
  }
  if (adv.weakAgainst === defenderElem) {
    return { multiplier: 0.75, label: 'RESISTED' };
  }
  return { multiplier: 1.0, label: 'NORMAL' };
}

export function initializeBattle(playerTeam: Fighter[], enemyTeam: Fighter[], stageInfo?: any): BattleState {
  // Deep clone to isolate battle state
  const pTeam: Fighter[] = JSON.parse(JSON.stringify(playerTeam)).map((f: Fighter, idx: number) => ({
    ...f,
    gridIndex: idx,
    isAlive: true,
    statusEffects: [],
    currentStats: { ...f.baseStats, hp: f.baseStats.maxHp, energy: 30 },
  }));

  const eTeam: Fighter[] = JSON.parse(JSON.stringify(enemyTeam)).map((f: Fighter, idx: number) => ({
    ...f,
    gridIndex: idx,
    isAlive: true,
    statusEffects: [],
    currentStats: { ...f.baseStats, hp: f.baseStats.maxHp, energy: 20 },
  }));

  // Build initial action queue by speed
  const allFighters = [...pTeam, ...eTeam];
  allFighters.sort((a, b) => b.currentStats.spd - a.currentStats.spd);

  return {
    playerTeam: pTeam,
    enemyTeam: eTeam,
    activeFighterId: allFighters[0]?.id || null,
    turnCount: 1,
    actionQueue: allFighters.map(f => f.id),
    isBattleOver: false,
    winner: null,
    selectedAction: null,
    selectedTargetId: null,
    battleLogs: [
      {
        id: `log_${Date.now()}`,
        turn: 1,
        timestamp: new Date().toLocaleTimeString(),
        sourceName: 'System',
        action: 'Battle Commenced',
        message: 'The clash of elements begins! Stand your ground!',
        type: 'buff',
      },
    ],
    speedMultiplier: 1,
    isAutoBattle: false,
    stageInfo,
    floatingTexts: [],
  };
}

export function executeAction(
  state: BattleState,
  actorId: string,
  skill: Skill,
  targetId?: string
): BattleState {
  const newState: BattleState = JSON.parse(JSON.stringify(state));
  const isActorPlayer = newState.playerTeam.some(f => f.id === actorId);
  const actorTeam = isActorPlayer ? newState.playerTeam : newState.enemyTeam;
  const opposingTeam = isActorPlayer ? newState.enemyTeam : newState.playerTeam;

  const actor = actorTeam.find(f => f.id === actorId);
  if (!actor || !actor.isAlive) return newState;

  // Check if actor is Stunned or Frozen
  const hasStunOrFreeze = actor.statusEffects?.some(s => s.type === 'Stun' || s.type === 'Freeze');
  if (hasStunOrFreeze) {
    newState.battleLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      turn: newState.turnCount,
      timestamp: new Date().toLocaleTimeString(),
      sourceName: actor.name,
      action: 'Turn Skipped',
      message: `${actor.name} is incapacitated (Frozen/Stunned) and cannot move!`,
      type: 'status',
    });
    return advanceTurn(newState);
  }

  // Handle Audio triggers
  if (skill.type === 'Ultimate') {
    soundFX.playUltimateCast();
  } else if (skill.element === 'Fire') {
    soundFX.playFireBlast();
  } else if (skill.element === 'Ice') {
    soundFX.playIceFreeze();
  } else if (skill.element === 'Wind') {
    soundFX.playWindSlash();
  } else if (skill.element === 'Light') {
    soundFX.playHolyHeal();
  } else if (skill.element === 'Dark') {
    soundFX.playDarkVoid();
  } else if (skill.element === 'Earth') {
    soundFX.playEarthQuake();
  } else {
    soundFX.playAttackSlash();
  }

  // Consume energy for Ultimate or add energy for active
  if (skill.type === 'Ultimate') {
    actor.currentStats.energy = 0;
  } else {
    actor.currentStats.energy = Math.min(100, actor.currentStats.energy + 25);
  }

  // Handle Target Resolution
  let targets: Fighter[] = [];
  if (skill.targetType === 'all_enemies') {
    targets = opposingTeam.filter(f => f.isAlive);
  } else if (skill.targetType === 'all_allies') {
    targets = actorTeam.filter(f => f.isAlive);
  } else if (skill.targetType === 'self') {
    targets = [actor];
  } else if (skill.targetType === 'lowest_hp_ally') {
    const aliveAllies = actorTeam.filter(f => f.isAlive);
    aliveAllies.sort((a, b) => (a.currentStats.hp / a.currentStats.maxHp) - (b.currentStats.hp / b.currentStats.maxHp));
    targets = aliveAllies.slice(0, 1);
  } else {
    // Single enemy target
    let target = opposingTeam.find(f => f.id === targetId && f.isAlive);
    // If no target provided or target dead, find frontline first
    if (!target) {
      const aliveOpponents = opposingTeam.filter(f => f.isAlive);
      // Check if any opponent has Taunt
      const taunter = aliveOpponents.find(f => f.statusEffects?.some(s => s.type === 'Taunt'));
      target = taunter || aliveOpponents[0];
    }
    if (target) targets = [target];
  }

  // Execute on targets
  targets.forEach(target => {
    // Healing logic
    if (skill.healMultiplier) {
      const healAmount = Math.round(target.currentStats.maxHp * skill.healMultiplier * (1 + (actor.currentStats.atk / 500)));
      target.currentStats.hp = Math.min(target.currentStats.maxHp, target.currentStats.hp + healAmount);
      
      // Cleanse debuffs
      if (skill.id === 'aurelia_active_1') {
        target.statusEffects = (target.statusEffects || []).filter(s => s.type === 'AtkBuff' || s.type === 'DefBuff' || s.type === 'Shield');
      }

      newState.floatingTexts.push({
        id: `flt_${Date.now()}_${Math.random()}`,
        targetId: target.id,
        text: `+${healAmount} HP`,
        type: 'heal',
      });

      newState.battleLogs.unshift({
        id: `log_${Date.now()}_${Math.random()}`,
        turn: newState.turnCount,
        timestamp: new Date().toLocaleTimeString(),
        sourceName: actor.name,
        action: skill.name,
        targetName: target.name,
        heal: healAmount,
        message: `${actor.name} cast ${skill.name} healing ${target.name} for ${healAmount} HP!`,
        type: 'heal',
      });
      return;
    }

    // Shielding logic
    if (skill.shieldMultiplier) {
      const shieldVal = Math.round(target.currentStats.maxHp * skill.shieldMultiplier);
      target.statusEffects = target.statusEffects || [];
      target.statusEffects.push({
        type: 'Shield',
        duration: 2,
        value: shieldVal,
        sourceName: actor.name,
      });

      newState.floatingTexts.push({
        id: `flt_${Date.now()}_${Math.random()}`,
        targetId: target.id,
        text: `+${shieldVal} Barrier`,
        type: 'shield',
      });
      return;
    }

    // Passive Evasion check (Zephyr Gale Step)
    if (target.id === 'zephyr' && Math.random() < 0.30 && skill.targetType === 'single_enemy') {
      newState.floatingTexts.push({
        id: `flt_${Date.now()}_${Math.random()}`,
        targetId: target.id,
        text: 'EVADED!',
        type: 'miss',
      });
      newState.battleLogs.unshift({
        id: `log_${Date.now()}_${Math.random()}`,
        turn: newState.turnCount,
        timestamp: new Date().toLocaleTimeString(),
        sourceName: target.name,
        action: 'Gale Step Evasion',
        targetName: actor.name,
        message: `${target.name} seamlessly drifted away from ${actor.name}'s strike!`,
        type: 'buff',
      });
      return;
    }

    // Damage Calculation
    const elemMult = calculateElementalMultiplier(actor.element, target.element);
    let effectiveAtk = actor.currentStats.atk;
    
    // Ignis Cinder Fury passive check
    if (actor.id === 'ignis' && (actor.currentStats.hp / actor.currentStats.maxHp) <= 0.40) {
      effectiveAtk = Math.round(effectiveAtk * 1.35);
    }

    // Attack buffs / debuffs
    const atkBuff = (actor.statusEffects || []).find(s => s.type === 'AtkBuff');
    if (atkBuff) {
      effectiveAtk = Math.round(effectiveAtk * (1 + atkBuff.value / 100));
    }

    let effectiveDef = target.currentStats.def;
    const defBuff = (target.statusEffects || []).find(s => s.type === 'DefBuff');
    if (defBuff) {
      effectiveDef = Math.max(10, Math.round(effectiveDef * (1 + defBuff.value / 100)));
    }

    // Critical roll
    const isCrit = Math.random() * 100 < actor.currentStats.critRate;
    const critMult = isCrit ? (actor.currentStats.critDmg / 100) : 1.0;
    if (isCrit) soundFX.playCriticalHit();

    // Damage formula
    const multiplier = skill.damageMultiplier || 1.0;
    const rawDamage = (effectiveAtk * multiplier) * (100 / (100 + effectiveDef * 0.8));
    const variance = 0.92 + Math.random() * 0.16;
    let finalDamage = Math.max(20, Math.round(rawDamage * elemMult.multiplier * critMult * variance));

    // Curse amplification
    const isCurse = (target.statusEffects || []).some(s => s.type === 'Curse');
    if (isCurse) {
      finalDamage = Math.round(finalDamage * 1.20);
    }

    // Check Shield absorption
    const shieldIndex = (target.statusEffects || []).findIndex(s => s.type === 'Shield');
    if (shieldIndex >= 0 && target.statusEffects) {
      const shield = target.statusEffects[shieldIndex];
      if (shield.value >= finalDamage) {
        shield.value -= finalDamage;
        finalDamage = 0;
      } else {
        finalDamage -= shield.value;
        target.statusEffects.splice(shieldIndex, 1);
      }
    }

    // Apply Damage
    target.currentStats.hp = Math.max(0, target.currentStats.hp - finalDamage);
    target.currentStats.energy = Math.min(100, target.currentStats.energy + 15); // Hit generates energy

    // Passive triggers on hit (Terran Granite Skin)
    if (target.id === 'terran') {
      target.currentStats.def = Math.round(target.currentStats.def * 1.08);
    }

    // Lifesteal (Ignis Cinder Fury or Malakor Soul Siphon)
    if (skill.id === 'malakor_active_2' || (actor.id === 'ignis' && (actor.currentStats.hp / actor.currentStats.maxHp) <= 0.40)) {
      const lifestealHeal = Math.round(finalDamage * 0.5);
      actor.currentStats.hp = Math.min(actor.currentStats.maxHp, actor.currentStats.hp + lifestealHeal);
    }

    // Apply Status Effects (Burn, Freeze, Stun, Curse)
    if (skill.effectType && (!skill.effectChance || Math.random() <= skill.effectChance)) {
      target.statusEffects = target.statusEffects || [];
      target.statusEffects.push({
        type: skill.effectType,
        duration: skill.effectDuration || 2,
        value: skill.effectValue || 0,
        sourceName: actor.name,
      });
    }

    // Check target death
    if (target.currentStats.hp <= 0) {
      target.isAlive = false;
      newState.battleLogs.unshift({
        id: `log_${Date.now()}_${Math.random()}`,
        turn: newState.turnCount,
        timestamp: new Date().toLocaleTimeString(),
        sourceName: target.name,
        action: 'Fallen in Combat',
        message: `${target.name} has fallen!`,
        type: 'death',
      });
    }

    // Floating text
    newState.floatingTexts.push({
      id: `flt_${Date.now()}_${Math.random()}`,
      targetId: target.id,
      text: `${isCrit ? 'CRIT! ' : ''}-${finalDamage} ${elemMult.label !== 'NORMAL' ? `(${elemMult.label})` : ''}`,
      type: isCrit ? 'crit' : 'damage',
    });

    // Battle log entry
    newState.battleLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      turn: newState.turnCount,
      timestamp: new Date().toLocaleTimeString(),
      sourceName: actor.name,
      action: skill.name,
      targetName: target.name,
      damage: finalDamage,
      isCrit,
      message: `${actor.name} used ${skill.name} on ${target.name} dealing ${finalDamage} damage! ${isCrit ? '💥 CRITICAL HIT!' : ''}`,
      type: 'attack',
    });
  });

  // Check victory / defeat condition
  const areAllPlayersDead = newState.playerTeam.every(f => !f.isAlive);
  const areAllEnemiesDead = newState.enemyTeam.every(f => !f.isAlive);

  if (areAllEnemiesDead) {
    newState.isBattleOver = true;
    newState.winner = 'player';
    soundFX.playVictoryFanfare();
    return newState;
  }
  if (areAllPlayersDead) {
    newState.isBattleOver = true;
    newState.winner = 'enemy';
    soundFX.playDefeat();
    return newState;
  }

  return advanceTurn(newState);
}

export function advanceTurn(state: BattleState): BattleState {
  const nextQueue = [...state.actionQueue];
  // Remove current actor and put at end if alive
  const prevActorId = nextQueue.shift();
  if (prevActorId) {
    const allAlive = [...state.playerTeam, ...state.enemyTeam].filter(f => f.isAlive);
    if (allAlive.some(f => f.id === prevActorId)) {
      nextQueue.push(prevActorId);
    }
  }

  // Find next alive fighter
  let nextActorId: string | null = null;
  while (nextQueue.length > 0) {
    const candidateId = nextQueue[0];
    const candidate = [...state.playerTeam, ...state.enemyTeam].find(f => f.id === candidateId && f.isAlive);
    if (candidate) {
      nextActorId = candidateId;
      break;
    } else {
      nextQueue.shift();
    }
  }

  // If queue exhausted, rebuild from alive fighters
  if (!nextActorId) {
    const alive = [...state.playerTeam, ...state.enemyTeam].filter(f => f.isAlive);
    alive.sort((a, b) => b.currentStats.spd - a.currentStats.spd);
    alive.forEach(f => nextQueue.push(f.id));
    nextActorId = nextQueue[0] || null;
  }

  // Tick Status Effects and cooldowns for the next actor
  if (nextActorId) {
    const actor = [...state.playerTeam, ...state.enemyTeam].find(f => f.id === nextActorId);
    if (actor && actor.isAlive) {
      // Tick Cooldowns
      actor.skills.forEach(s => {
        if (s.currentCooldown && s.currentCooldown > 0) {
          s.currentCooldown -= 1;
        }
      });

      // Tick Status Effects (Burn damage, Shield decay, Buff duration)
      if (actor.statusEffects && actor.statusEffects.length > 0) {
        actor.statusEffects.forEach(effect => {
          if (effect.type === 'Burn') {
            const burnDmg = Math.round(actor.currentStats.maxHp * (effect.value || 0.05));
            actor.currentStats.hp = Math.max(1, actor.currentStats.hp - burnDmg);
            state.floatingTexts.push({
              id: `burn_${Date.now()}`,
              targetId: actor.id,
              text: `Burn -${burnDmg}`,
              type: 'damage',
            });
          }
          effect.duration -= 1;
        });
        actor.statusEffects = actor.statusEffects.filter(e => e.duration > 0);
      }
    }
  }

  return {
    ...state,
    actionQueue: nextQueue,
    activeFighterId: nextActorId,
    turnCount: state.turnCount + 1,
    selectedAction: null,
    selectedTargetId: null,
  };
}
