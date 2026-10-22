import {
  FightingEntity,
  FightingMove,
  FightingProjectile,
  FofFighterStats,
} from '../types/fighting';
import { soundFX } from './audio';

export const ARENA_WIDTH = 1400;
export const STAGE_FLOOR_Y = 0;
export const GRAVITY = 1.35; // Standard downward acceleration
export const JUMP_VELOCITY = 18.5; // Tuned jump apex (~126px height) ensuring fighters remain comfortably inside screen

export const ELEMENT_ADVANTAGE_MAP: Record<string, { strongAgainst: string; weakAgainst: string }> = {
  Fire: { strongAgainst: 'Earth', weakAgainst: 'Ice' },
  Ice: { strongAgainst: 'Fire', weakAgainst: 'Wind' },
  Wind: { strongAgainst: 'Ice', weakAgainst: 'Earth' },
  Earth: { strongAgainst: 'Wind', weakAgainst: 'Fire' },
  Light: { strongAgainst: 'Dark', weakAgainst: 'Dark' },
  Dark: { strongAgainst: 'Light', weakAgainst: 'Light' },
};

/**
 * Fighting Game Durability Calibration:
 * Tuned to require ~15 solid punches/hits to knock out an opponent,
 * preventing sudden rounds that finish in 3 to 4 punches.
 */
export const FIGHT_STANDARD_DAMAGE_SCALE = 1.0;

export function calculateElementalDamage(baseDmg: number, atkElem: string, defElem: string): { finalDmg: number; multiplier: number; isCritEffect: boolean } {
  let multiplier = 1.0;
  const adv = ELEMENT_ADVANTAGE_MAP[atkElem];
  if (adv) {
    if (adv.strongAgainst === defElem) {
      multiplier = 1.15; // Controlled +15% elemental bonus
    } else if (adv.weakAgainst === defElem) {
      multiplier = 0.88; // Controlled -12% elemental reduction
    }
  }
  const isCrit = Math.random() < 0.10;
  const critMult = isCrit ? 1.25 : 1.0;
  const finalDmg = Math.max(8, Math.round(baseDmg * multiplier * critMult));
  return {
    finalDmg,
    multiplier: multiplier * critMult,
    isCritEffect: isCrit,
  };
}

export function createFightingEntity(
  character: FofFighterStats | undefined | null,
  isPlayer1: boolean,
  startX?: number
): FightingEntity {
  const safeChar: FofFighterStats = character || {
    id: isPlayer1 ? 'arjun' : 'david',
    name: isPlayer1 ? 'Arjun' : 'David',
    title: isPlayer1 ? 'Union Steelworker' : 'Aether Cyber-Striker',
    faction: isPlayer1 ? 'Ordinary Workers' : 'Corporate / Aether Core',
    element: isPlayer1 ? 'Earth' : 'Ice',
    role: isPlayer1 ? 'Brawler' : 'Striker',
    maxHp: 1000,
    atk: 100,
    def: 100,
    spd: 6,
    critRate: 10,
    signatureWeapon: 'Fists',
    avatarColor: isPlayer1 ? 'from-amber-600 to-stone-900' : 'from-blue-600 to-stone-900',
    accentColor: isPlayer1 ? '#f59e0b' : '#3b82f6',
    themeColor: isPlayer1 ? '#d97706' : '#2563eb',
    voiceLines: {
      intro: 'Ready!',
      victory: 'Victory!',
      superCall: 'Take this!',
      defeat: 'Ugh...',
    },
    backstory: 'Arcade tournament fighter.',
    moves: [],
  };
  const defaultX = isPlayer1 ? 260 : 740;
  return {
    id: `${safeChar.id || (isPlayer1 ? 'arjun' : 'david')}_${isPlayer1 ? 'p1' : 'p2'}_${Date.now()}`,
    character: safeChar,
    isPlayer1,
    x: startX !== undefined ? startX : defaultX,
    y: 0,
    vx: 0,
    vy: 0,
    facing: isPlayer1 ? 1 : -1,
    hp: safeChar.maxHp || 1000,
    maxHp: safeChar.maxHp || 1000,
    superMeter: 100, // Starts with 1 stock for exciting action
    maxMeter: 300,
    maxModeTimer: 0,
    isMaxMode: false,
    state: 'IDLE',
    stateFrame: 0,
    currentMove: null,
    comboHits: 0,
    comboDamage: 0,
    isInvincible: false,
    isBlocking: false,
    isGrounded: true,
    hasHitThisAttack: false,
    activeProjectiles: [],
  };
}

export interface InputCommandRecord {
  dir: 'NEUTRAL' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'DOWN_RIGHT' | 'DOWN_LEFT' | 'UP_RIGHT' | 'UP_LEFT';
  timestamp: number;
}

/**
 * Command Motion Parser:
 * Checks rolling input buffer for DOUBLE_QCF, HCF, DP, QCF, or QCB motions.
 * Automatically condenses duplicate consecutive directions and applies a 600ms freshness window.
 */
export function detectMotion(
  history: InputCommandRecord[],
  facing: 1 | -1
): 'DOUBLE_QCF' | 'HCF' | 'DP' | 'QCF' | 'QCB' | 'NONE' {
  if (history.length < 2) return 'NONE';

  const now = Date.now();
  // Only look at inputs within the last 650ms
  const freshHistory = history.filter(h => now - h.timestamp <= 650);
  if (freshHistory.length < 2) return 'NONE';

  // Compress consecutive duplicates (e.g., ['DOWN', 'DOWN', 'DOWN', 'RIGHT'] -> ['DOWN', 'RIGHT'])
  const dirs: string[] = [];
  for (const item of freshHistory) {
    if (dirs.length === 0 || dirs[dirs.length - 1] !== item.dir) {
      if (item.dir !== 'NEUTRAL') {
        dirs.push(item.dir);
      }
    }
  }

  if (dirs.length < 2) return 'NONE';

  const forwardDir = facing === 1 ? 'RIGHT' : 'LEFT';
  const backwardDir = facing === 1 ? 'LEFT' : 'RIGHT';
  const downForwardDir = facing === 1 ? 'DOWN_RIGHT' : 'DOWN_LEFT';
  const downBackwardDir = facing === 1 ? 'DOWN_LEFT' : 'DOWN_RIGHT';

  // 1. Check Double QCF: (Down -> DownForward/Forward -> Forward) x 2
  let qcfCount = 0;
  for (let i = 0; i < dirs.length - 1; i++) {
    if (dirs[i] === 'DOWN') {
      if (
        (dirs[i + 1] === downForwardDir && dirs[i + 2] === forwardDir) ||
        dirs[i + 1] === forwardDir
      ) {
        qcfCount++;
        i += dirs[i + 1] === downForwardDir ? 2 : 1;
      }
    }
  }
  if (qcfCount >= 2) {
    return 'DOUBLE_QCF';
  }

  // 2. Check HCF (Half Circle Forward: Backward -> Down-Backward/Down -> Down-Forward/Forward -> Forward)
  for (let i = 0; i < dirs.length - 2; i++) {
    if (dirs[i] === backwardDir || dirs[i] === downBackwardDir) {
      // Find Down then Forward
      const remaining = dirs.slice(i + 1);
      const hasDown = remaining.some(d => d === 'DOWN' || d === downBackwardDir);
      const hasFwd = remaining[remaining.length - 1] === forwardDir || remaining.some(d => d === downForwardDir || d === forwardDir);
      if (hasDown && hasFwd) {
        return 'HCF';
      }
    }
  }

  // 3. Check DP (Dragon Punch / 623): Forward -> Down -> Down-Forward/Forward
  for (let i = 0; i < dirs.length - 1; i++) {
    if (dirs[i] === forwardDir) {
      if (
        (dirs[i + 1] === 'DOWN' && (dirs[i + 2] === downForwardDir || dirs[i + 2] === forwardDir)) ||
        (dirs[i + 1] === downForwardDir && dirs[i + 2] === forwardDir)
      ) {
        return 'DP';
      }
    }
  }

  // 4. Check QCF (236): Down -> Down-Forward -> Forward (or Down -> Forward)
  for (let i = 0; i < dirs.length - 1; i++) {
    if (dirs[i] === 'DOWN') {
      if (
        (dirs[i + 1] === downForwardDir && dirs[i + 2] === forwardDir) ||
        dirs[i + 1] === forwardDir
      ) {
        return 'QCF';
      }
    }
  }

  // 5. Check QCB (214): Down -> Down-Backward -> Backward (or Down -> Backward)
  for (let i = 0; i < dirs.length - 1; i++) {
    if (dirs[i] === 'DOWN') {
      if (
        (dirs[i + 1] === downBackwardDir && dirs[i + 2] === backwardDir) ||
        dirs[i + 1] === backwardDir
      ) {
        return 'QCB';
      }
    }
  }

  return 'NONE';
}

/**
 * Resolves the appropriate move given a motion input and attack button pressed
 */
export function resolveSpecialOrNormalMove(
  entityOrMoves: FightingEntity | FightingMove[],
  detectedMotion: 'DOUBLE_QCF' | 'HCF' | 'DP' | 'QCF' | 'QCB' | 'NONE' | string,
  button: 'LP' | 'HP' | 'LK' | 'HK' | 'CD' | string,
  superMeter = 0,
  isMaxMode = false
): FightingMove | null {
  const moves = Array.isArray(entityOrMoves) ? entityOrMoves : entityOrMoves.character.moves;
  const currentMeter = Array.isArray(entityOrMoves) ? superMeter : entityOrMoves.superMeter;
  const inMaxMode = Array.isArray(entityOrMoves) ? isMaxMode : entityOrMoves.isMaxMode;

  const isPunch = button === 'LP' || button === 'HP';
  const isKick = button === 'LK' || button === 'HK';

  // 1. Double QCF motion -> Check Super Move
  if (detectedMotion === 'DOUBLE_QCF') {
    const superMove = moves.find(m => m.type === 'SUPER' || m.motion === 'DOUBLE_QCF');
    if (superMove && (currentMeter >= superMove.meterCost || inMaxMode)) {
      return superMove;
    }
  }

  // 2. HCF motion -> Check Climax or Super
  if (detectedMotion === 'HCF') {
    const climaxMove = moves.find(m => m.type === 'CLIMAX' || m.motion === 'HCF');
    if (climaxMove && (currentMeter >= climaxMove.meterCost || inMaxMode)) {
      return climaxMove;
    }
    const superMove = moves.find(m => m.type === 'SUPER');
    if (superMove && (currentMeter >= superMove.meterCost || inMaxMode)) {
      return superMove;
    }
  }

  // 3. DP motion (623) -> Check DP Special Move (Special 2)
  if (detectedMotion === 'DP') {
    const dpMove = moves.find(
      m => m.motion === 'DP' || (m.type === 'SPECIAL' && m.id?.includes('sp2'))
    );
    if (dpMove) return dpMove;
  }

  // 4. QCF motion (236) -> Check QCF Special Move (Special 1 or Special matching button)
  if (detectedMotion === 'QCF') {
    const qcfMove = moves.find(
      m =>
        m.motion === 'QCF' ||
        (m.type === 'SPECIAL' && (m.button === 'P' ? isPunch : isKick)) ||
        (m.type === 'SPECIAL' && m.id?.includes('sp1'))
    );
    if (qcfMove) return qcfMove;
  }

  // 5. QCB motion (214) -> Check QCB Special Move (Special 3 or Special matching button)
  if (detectedMotion === 'QCB') {
    const qcbMove = moves.find(
      m =>
        m.motion === 'QCB' ||
        (m.type === 'SPECIAL' && m.id?.includes('sp3')) ||
        (m.type === 'SPECIAL' && m.id?.includes('sp2'))
    );
    if (qcbMove) return qcbMove;
  }

  // 6. Fallback to standard normal button move
  const normalMove = moves.find(m => m.button === button && (m.type === 'NORMAL' || !m.motion || m.motion === 'NONE'));
  if (normalMove) return normalMove;

  // Ultimate fallback
  return moves.find(m => m.button === button) || moves[0] || null;
}

/**
 * Executes a move on the entity
 */
export function executeMove(
  entity: FightingEntity,
  move: FightingMove,
  onProjectileSpawn?: (proj: FightingProjectile) => void
): boolean {
  if (entity.state === 'HIT_LIGHT' || entity.state === 'HIT_HEAVY' || entity.state === 'KNOCKDOWN' || entity.state === 'DEFEAT') {
    return false;
  }

  // Super meter cost check
  if (move.type === 'SUPER' && entity.superMeter < move.meterCost) {
    return false;
  }
  if (move.type === 'CLIMAX' && entity.superMeter < move.meterCost && !entity.isMaxMode) {
    return false;
  }

  // Deduct meter
  if (move.type === 'SUPER') {
    entity.superMeter = Math.max(0, entity.superMeter - move.meterCost);
    soundFX.playSuperFlash();
  } else if (move.type === 'CLIMAX') {
    entity.superMeter = Math.max(0, entity.superMeter - (entity.isMaxMode ? 100 : move.meterCost));
    entity.isMaxMode = false;
    soundFX.playClimaxFlash();
  } else {
    soundFX.playWhoosh();
  }

  // Trigger character-specific move battle cry / voice clip
  soundFX.playMoveVoice(entity.character?.id || 'arjun', move);

  entity.currentMove = move;
  entity.stateFrame = 0;
  entity.hasHitThisAttack = false;
  entity.isInvincible = !!move.invincibleStartup;

  if (move.type === 'NORMAL') {
    if (move.button === 'LP') entity.state = 'ATTACK_LP';
    else if (move.button === 'HP') entity.state = 'ATTACK_HP';
    else if (move.button === 'LK') entity.state = 'ATTACK_LK';
    else entity.state = 'ATTACK_HK';
  } else if (move.type === 'COMMAND_NORMAL') {
    entity.state = 'BLOWBACK';
  } else if (move.type === 'SPECIAL') {
    if (move.id?.includes('spec_1')) entity.state = 'SPECIAL_1';
    else if (move.id?.includes('spec_2')) entity.state = 'SPECIAL_2';
    else entity.state = 'SPECIAL_3';

    // Spawn projectile if applicable
    if (move.projectile && onProjectileSpawn) {
      const proj: FightingProjectile = {
        id: `proj_${Date.now()}_${Math.random()}`,
        ownerId: entity.id,
        isPlayer1: entity.isPlayer1,
        x: entity.x + entity.facing * 50,
        y: entity.y + 70,
        vx: entity.facing * move.projectile.speed,
        element: move.projectile.element,
        radius: move.projectile.radius,
        damage: move.damage,
        hitsLeft: move.projectile.hits,
        color: move.projectile.color,
        lifeTime: 120,
      };
      onProjectileSpawn(proj);
      soundFX.playFireballLaunch();
    }
  } else if (move.type === 'SUPER') {
    entity.state = 'SUPER';
  } else if (move.type === 'CLIMAX') {
    entity.state = 'CLIMAX';
  }

  return true;
}

/**
 * Checks melee attack collision between active move and target
 */
export function checkMeleeHit(
  attacker: FightingEntity,
  defender: FightingEntity
): { hit: boolean; blocked: boolean; damage: number; isCrit: boolean } | null {
  if (!attacker.currentMove || attacker.hasHitThisAttack) return null;

  const totalFrames =
    attacker.currentMove.startupFrames +
    attacker.currentMove.activeFrames +
    attacker.currentMove.recoveryFrames;

  const isActiveFrame =
    attacker.stateFrame >= attacker.currentMove.startupFrames &&
    attacker.stateFrame < attacker.currentMove.startupFrames + attacker.currentMove.activeFrames;

  if (!isActiveFrame) return null;

  // Range and distance check for enlarged character models
  const dx = Math.abs(attacker.x - defender.x);
  const dy = Math.abs(attacker.y - defender.y);

  // Must face the opponent or have close proximity
  const isFacingDefender =
    (attacker.facing === 1 && defender.x >= attacker.x - 45) ||
    (attacker.facing === -1 && defender.x <= attacker.x + 45);

  if (!isFacingDefender) return null;

  const effectiveRange = attacker.currentMove.range * 1.35 + 35;

  if (dx <= effectiveRange && dy <= 220) {
    attacker.hasHitThisAttack = true;

    // Check if defender is blocking (holding away while grounded and not attacking)
    const isBlocking = defender.isBlocking && defender.isGrounded && !defender.currentMove;

    if (defender.isInvincible) {
      return null;
    }

    // Calibrate hit damage to 40 base damage standard
    const calibratedDamage = Math.max(40, Math.round(attacker.currentMove.damage * FIGHT_STANDARD_DAMAGE_SCALE));
    const { finalDmg, isCritEffect } = calculateElementalDamage(
      calibratedDamage,
      attacker.character.element,
      defender.character.element
    );

    if (isBlocking) {
      soundFX.playBlock();
      const chipDmg = Math.round(finalDmg * 0.15);
      return { hit: true, blocked: true, damage: chipDmg, isCrit: false };
    }

    // Direct hit!
    if (attacker.currentMove.type === 'SUPER' || attacker.currentMove.type === 'CLIMAX') {
      soundFX.playHitHeavy();
    } else if (attacker.currentMove.button === 'HP' || attacker.currentMove.button === 'HK' || attacker.currentMove.type === 'SPECIAL') {
      soundFX.playHitHeavy();
    } else {
      soundFX.playHitLight();
    }

    return { hit: true, blocked: false, damage: finalDmg, isCrit: isCritEffect };
  }

  return null;
}

export const FIGHTER_PUSHBOX_WIDTH = 90; // Standard 2D arcade pushbox width in px
export const FIGHTER_PUSHBOX_HALF_WIDTH = 45;
export const SAME_AXIS_SEPARATION_MIN = 85; // Guaranteed minimum distance between grounded fighters
export const MAX_ALLOWED_OVERLAP_DURATION_SEC = 1.0; // Strictly capped at 1.0 second max overlap
export const SAME_AXIS_EPSILON = 2.0; // Axis difference below which fighters are on identical axis

export interface PushboxResolutionResult {
  p1X: number;
  p2X: number;
  overlapDurationSec: number;
  isOverlapping: boolean;
  onSameAxis: boolean;
  forcedSeparationTriggered: boolean;
  distance: number;
}

/**
 * Resolves body pushbox collisions between two fighters.
 * Guarantees fighters never stay on the same axis for >1s, and enforces a hard 1.0-second
 * overlap ceiling with progressive push-apart physics and boundary awareness.
 */
export function resolvePushboxCollision(
  p1: FightingEntity,
  p2: FightingEntity,
  minAllowedX: number,
  maxAllowedX: number,
  prevOverlapDurationSec: number,
  dt: number
): PushboxResolutionResult {
  // If either fighter is in an intentional invincible roll through, allow pass-through
  const p1RollingThrough = p1.state === 'ROLL_FWD' && p1.isInvincible;
  const p2RollingThrough = p2.state === 'ROLL_FWD' && p2.isInvincible;

  // High aerial passes: if vertical distance is significant (jump cross-up), allow pass-through
  const verticalDiff = Math.abs(p1.y - p2.y);
  const isHighAirCross = verticalDiff > 70 || p1.y > 60 || p2.y > 60;

  let currentDist = Math.abs(p1.x - p2.x);
  const onSameAxis = currentDist < SAME_AXIS_EPSILON;

  // Pass-through allowed during active roll or high air cross-up (unless landed and on same axis)
  if ((p1RollingThrough || p2RollingThrough || isHighAirCross) && !onSameAxis) {
    return {
      p1X: p1.x,
      p2X: p2.x,
      overlapDurationSec: 0,
      isOverlapping: false,
      onSameAxis: false,
      forcedSeparationTriggered: false,
      distance: currentDist,
    };
  }

  const isOverlapping = currentDist < SAME_AXIS_SEPARATION_MIN;
  let newOverlapDurationSec = (isOverlapping || onSameAxis) ? prevOverlapDurationSec + dt : 0;
  let forcedSeparationTriggered = false;

  if (isOverlapping || onSameAxis) {
    // 1. Determine separation direction
    let p1Dir = -1;
    let p2Dir = 1;

    if (p1.x < p2.x) {
      p1Dir = -1;
      p2Dir = 1;
    } else if (p1.x > p2.x) {
      p1Dir = 1;
      p2Dir = -1;
    } else {
      // Exactly identical axis (p1.x === p2.x): break symmetry deterministically
      p1Dir = p1.isPlayer1 ? -1 : 1;
      p2Dir = -p1Dir;
    }

    // 2. HARD CAP: Characters MUST NOT overlap or stay on the same axis for more than 1.0 second!
    if (newOverlapDurationSec >= MAX_ALLOWED_OVERLAP_DURATION_SEC) {
      forcedSeparationTriggered = true;
      const targetDist = SAME_AXIS_SEPARATION_MIN;
      const mid = (p1.x + p2.x) / 2;

      let targetP1X = mid + p1Dir * (targetDist / 2);
      let targetP2X = mid + p2Dir * (targetDist / 2);

      // Clamp target positions against stage boundaries
      if (targetP1X < minAllowedX) {
        targetP1X = minAllowedX;
        targetP2X = minAllowedX + targetDist;
      } else if (targetP2X > maxAllowedX) {
        targetP2X = maxAllowedX;
        targetP1X = maxAllowedX - targetDist;
      }

      if (targetP2X < minAllowedX) {
        targetP2X = minAllowedX;
        targetP1X = minAllowedX + targetDist;
      } else if (targetP1X > maxAllowedX) {
        targetP1X = maxAllowedX;
        targetP2X = maxAllowedX - targetDist;
      }

      p1.x = Math.max(minAllowedX, Math.min(maxAllowedX, targetP1X));
      p2.x = Math.max(minAllowedX, Math.min(maxAllowedX, targetP2X));

      // Neutralize converging velocity
      if (p1Dir === -1 && p1.vx > 0) p1.vx = 0;
      if (p1Dir === 1 && p1.vx < 0) p1.vx = 0;
      if (p2Dir === -1 && p2.vx > 0) p2.vx = 0;
      if (p2Dir === 1 && p2.vx < 0) p2.vx = 0;

      newOverlapDurationSec = 0;
      currentDist = Math.abs(p1.x - p2.x);

      return {
        p1X: p1.x,
        p2X: p2.x,
        overlapDurationSec: 0,
        isOverlapping: false,
        onSameAxis: false,
        forcedSeparationTriggered: true,
        distance: currentDist,
      };
    }

    // 3. Progressive Natural Pushback (Street Fighter 6 pushbox dynamics)
    const penetration = SAME_AXIS_SEPARATION_MIN - currentDist;
    const frameScale = Math.max(0.5, Math.min(2.0, dt * 60));

    // Base push velocity scales with penetration depth and ramps up with duration
    let pushSpeed = (penetration * 0.35 + 4.5) * frameScale;
    if (newOverlapDurationSec > 0.3) {
      pushSpeed *= 2.2;
    }
    if (newOverlapDurationSec > 0.7) {
      pushSpeed *= 3.5;
    }

    // Wall / corner awareness: prevent pushing an opponent out of the stage
    const p1AtLeftWall = p1.x <= minAllowedX + 2;
    const p1AtRightWall = p1.x >= maxAllowedX - 2;
    const p2AtLeftWall = p2.x <= minAllowedX + 2;
    const p2AtRightWall = p2.x >= maxAllowedX - 2;

    let p1Shift = 0;
    let p2Shift = 0;

    if (p1Dir === -1) {
      if (p1AtLeftWall) {
        p2Shift = pushSpeed;
      } else if (p2AtRightWall) {
        p1Shift = -pushSpeed;
      } else {
        p1Shift = -pushSpeed * 0.5;
        p2Shift = pushSpeed * 0.5;
      }
    } else {
      if (p1AtRightWall) {
        p2Shift = -pushSpeed;
      } else if (p2AtLeftWall) {
        p1Shift = pushSpeed;
      } else {
        p1Shift = pushSpeed * 0.5;
        p2Shift = -pushSpeed * 0.5;
      }
    }

    // Dampen incoming velocity towards the opponent
    if (p1Dir === -1 && p1.vx > 0) p1.vx = Math.max(0, p1.vx * 0.2);
    if (p1Dir === 1 && p1.vx < 0) p1.vx = Math.min(0, p1.vx * 0.2);
    if (p2Dir === -1 && p2.vx > 0) p2.vx = Math.max(0, p2.vx * 0.2);
    if (p2Dir === 1 && p2.vx < 0) p2.vx = Math.min(0, p2.vx * 0.2);

    p1.x = Math.max(minAllowedX, Math.min(maxAllowedX, p1.x + p1Shift));
    p2.x = Math.max(minAllowedX, Math.min(maxAllowedX, p2.x + p2Shift));

    currentDist = Math.abs(p1.x - p2.x);
    if (currentDist >= SAME_AXIS_SEPARATION_MIN) {
      newOverlapDurationSec = 0;
    }
  }

  return {
    p1X: p1.x,
    p2X: p2.x,
    overlapDurationSec: newOverlapDurationSec,
    isOverlapping: currentDist < SAME_AXIS_SEPARATION_MIN,
    onSameAxis: currentDist < SAME_AXIS_EPSILON,
    forcedSeparationTriggered,
    distance: currentDist,
  };
}

/**
 * Simple AI logic for CPU opponent
 */
export function updateCpuAI(
  cpu: FightingEntity,
  player: FightingEntity,
  difficulty: number, // 1 to 5
  onPerformMove: (move: FightingMove) => void
) {
  if (cpu.state === 'HIT_LIGHT' || cpu.state === 'HIT_HEAVY' || cpu.state === 'KNOCKDOWN' || cpu.state === 'DEFEAT') {
    return;
  }

  const dist = Math.abs(cpu.x - player.x);
  const moves = cpu.character.moves;

  // Chance to block incoming attack
  if (player.currentMove && dist < 180) {
    const blockChance = 0.3 + difficulty * 0.12;
    if (Math.random() < blockChance) {
      cpu.isBlocking = true;
      cpu.state = 'GUARD';
      return;
    }
  } else {
    cpu.isBlocking = false;
  }

  // If idle, make tactical decisions based on distance
  if (cpu.state === 'IDLE' || cpu.state === 'WALK_FWD' || cpu.state === 'WALK_BACK') {
    const roll = Math.random();

    // Climax / Super if meter ready
    if (cpu.superMeter >= 300 && roll < 0.25) {
      const climax = moves.find(m => m.type === 'CLIMAX');
      if (climax) {
        onPerformMove(climax);
        return;
      }
    }

    if (cpu.superMeter >= 100 && roll < 0.35 && dist < 350) {
      const superMove = moves.find(m => m.type === 'SUPER');
      if (superMove) {
        onPerformMove(superMove);
        return;
      }
    }

    // Long range (> 250px): Throw projectile or dash forward
    if (dist > 250) {
      if (roll < 0.4) {
        const spec1 = moves.find(m => m?.id?.includes('spec_1'));
        if (spec1) {
          onPerformMove(spec1);
          return;
        }
      }
      // Move closer
      cpu.facing = player.x > cpu.x ? 1 : -1;
      cpu.vx = cpu.facing * (3 + difficulty * 0.8);
      cpu.state = 'WALK_FWD';
      return;
    }

    // Mid range (100 - 250px): Specials or Heavy Normals
    if (dist >= 100 && dist <= 250) {
      if (roll < 0.45) {
        const specials = moves.filter(m => m.type === 'SPECIAL');
        if (specials.length > 0) {
          const selected = specials[Math.floor(Math.random() * specials.length)];
          onPerformMove(selected);
          return;
        }
      } else if (roll < 0.7) {
        const hpMove = moves.find(m => m.button === 'HP');
        if (hpMove) {
          onPerformMove(hpMove);
          return;
        }
      } else {
        // Step in or jump
        if (roll < 0.85 && cpu.isGrounded) {
          cpu.vy = JUMP_VELOCITY * 0.85;
          cpu.vx = cpu.facing * 4;
          cpu.isGrounded = false;
          cpu.state = 'JUMP';
        }
      }
      return;
    }

    // Close range (< 100px): Fast jabs, throw/grab special, DP anti-air, spacing, or roll
    if (dist < 100) {
      // Halt forward push so CPU doesn't endlessly press into opponent body
      if (cpu.isGrounded && (cpu.state === 'WALK_FWD' || cpu.vx * cpu.facing > 0)) {
        cpu.vx = 0;
        cpu.state = 'IDLE';
      }

      if (!player.isGrounded && roll < 0.6) {
        // Anti-air DP
        const dp = moves.find(m => m.motion === 'DP');
        if (dp) {
          onPerformMove(dp);
          return;
        }
      }

      if (roll < 0.35) {
        const lp = moves.find(m => m.button === 'LP');
        if (lp) onPerformMove(lp);
      } else if (roll < 0.60) {
        const lk = moves.find(m => m.button === 'LK');
        if (lk) onPerformMove(lk);
      } else if (roll < 0.75) {
        const blowback = moves.find(m => m.type === 'COMMAND_NORMAL');
        if (blowback) onPerformMove(blowback);
      } else if (roll < 0.88) {
        // Tactical neutral spacing: step back and raise guard
        cpu.state = 'WALK_BACK';
        cpu.vx = -cpu.facing * 3.5;
        cpu.isBlocking = true;
      } else {
        // Roll through
        cpu.state = 'ROLL_FWD';
        cpu.vx = cpu.facing * 7;
        cpu.isInvincible = true;
      }
      return;
    }
  }
}
