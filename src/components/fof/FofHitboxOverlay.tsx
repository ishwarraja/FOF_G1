import React, { useState } from 'react';
import { FightingEntity, FightingProjectile } from '../../types/fighting';
import { ARENA_WIDTH } from '../../utils/fightingEngine';
import { Shield, Flame, Activity, Zap, Layers, Sparkles, Crosshair, Gauge, Eye, ChevronRight } from 'lucide-react';

interface FofHitboxOverlayProps {
  p1Entity: FightingEntity;
  p2Entity: FightingEntity;
  projectiles: FightingProjectile[];
  showDebugDetails?: boolean;
  isTrainingMode?: boolean;
  worldToScreenPercent?: (x: number) => number;
  cameraZoom?: number;
  debugMode?: boolean;
}

export type LimbSegmentType =
  | 'HEAD'
  | 'TORSO'
  | 'LEAD_ARM'
  | 'REAR_ARM'
  | 'LEAD_LEG'
  | 'REAR_LEG';

export interface LimbBoundingBox {
  id: LimbSegmentType;
  label: string;
  x: number; // Arena X center/offset
  y: number; // Arena Y bottom
  width: number;
  height: number;
  status: 'HURTBOX' | 'ACTIVE_STRIKE' | 'GUARD' | 'INVINCIBLE' | 'HIT_STUN';
  damage?: number;
  moveName?: string;
  isRegisteredHit?: boolean;
}

export const FofHitboxOverlay: React.FC<FofHitboxOverlayProps> = ({
  p1Entity,
  p2Entity,
  projectiles,
  showDebugDetails = false,
  isTrainingMode = false,
  worldToScreenPercent,
  cameraZoom = 1.0,
  debugMode = false,
}) => {
  if (!debugMode && !showDebugDetails) {
    return null;
  }
  const [showLimbSegments, setShowLimbSegments] = useState<boolean>(true);
  const [showGlobalCapsule, setShowGlobalCapsule] = useState<boolean>(true);
  const [showAttackRange, setShowAttackRange] = useState<boolean>(true);
  const [showFrameData, setShowFrameData] = useState<boolean>(false);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(false);

  // Dynamic Camera Screen Mapper
  const toScreenX = (x: number) => {
    if (worldToScreenPercent) return worldToScreenPercent(x);
    return (x / ARENA_WIDTH) * 100;
  };

  const toScreenWidth = (widthPx: number) => {
    if (worldToScreenPercent) {
      return Math.abs(worldToScreenPercent(widthPx) - worldToScreenPercent(0));
    }
    return (widthPx / ARENA_WIDTH) * 100;
  };

  // Helper to compute individual articulated limb bounding boxes
  const computeLimbSegments = (
    entity: FightingEntity,
    isP1: boolean
  ): LimbBoundingBox[] => {
    const isCrouched = entity.state === 'CROUCH';
    const isAirborne = !entity.isGrounded;
    const isGuarding = entity.isBlocking;
    const isHitstun =
      entity.state === 'HIT_LIGHT' ||
      entity.state === 'HIT_HEAVY' ||
      entity.state === 'KNOCKDOWN';
    const isInvincible = entity.isInvincible;

    const currentMove = entity.currentMove;
    const isAttacking = !!currentMove;
    const currentFrame = entity.stateFrame;
    const isAttackActive =
      isAttacking &&
      currentFrame >= currentMove.startupFrames &&
      currentFrame < currentMove.startupFrames + currentMove.activeFrames;

    const isPunchMove =
      isAttacking &&
      (currentMove.button === 'LP' ||
        currentMove.button === 'HP' ||
        currentMove.type === 'SUPER' ||
        currentMove.type === 'CLIMAX');
    const isKickMove =
      isAttacking &&
      (currentMove.button === 'LK' ||
        currentMove.button === 'HK' ||
        (currentMove.type === 'SPECIAL' && !isPunchMove));

    const facing = entity.facing; // 1 = right, -1 = left
    const baseX = entity.x;
    const baseY = entity.y;

    const limbs: LimbBoundingBox[] = [];

    // 1. HEAD & HELMET / FACE SEGMENT
    const headY = isCrouched ? baseY + 170 : baseY + 265;
    const headX = baseX - 30;
    limbs.push({
      id: 'HEAD',
      label: 'HEAD',
      x: headX,
      y: headY,
      width: 60,
      height: 65,
      status: isInvincible
        ? 'INVINCIBLE'
        : isHitstun
        ? 'HIT_STUN'
        : isGuarding
        ? 'GUARD'
        : 'HURTBOX',
    });

    // 2. TORSO & CORE SEGMENT
    const torsoY = isCrouched ? baseY + 75 : baseY + 135;
    const torsoH = isCrouched ? 95 : 130;
    const torsoX = baseX - 42;
    limbs.push({
      id: 'TORSO',
      label: 'TORSO',
      x: torsoX,
      y: torsoY,
      width: 84,
      height: torsoH,
      status: isInvincible
        ? 'INVINCIBLE'
        : isHitstun
        ? 'HIT_STUN'
        : isGuarding
        ? 'GUARD'
        : 'HURTBOX',
    });

    // 3. LEAD ARM / STRIKING FIST SEGMENT
    const isLeadArmPunching = isPunchMove;
    const leadArmWidth = isLeadArmPunching && isAttackActive ? Math.max(90, currentMove.range * 1.25) : isLeadArmPunching ? 70 : 50;
    const leadArmHeight = isLeadArmPunching && isAttackActive ? 55 : 45;
    const leadArmY = isCrouched ? baseY + 95 : isLeadArmPunching ? baseY + 175 : baseY + 155;
    const leadArmX =
      facing === 1
        ? isLeadArmPunching
          ? baseX + 20
          : isGuarding
          ? baseX + 25
          : baseX + 15
        : isLeadArmPunching
        ? baseX - 20 - leadArmWidth
        : isGuarding
        ? baseX - 25 - leadArmWidth
        : baseX - 15 - leadArmWidth;

    limbs.push({
      id: 'LEAD_ARM',
      label: isLeadArmPunching && isAttackActive ? 'LEAD FIST [STRIKE]' : 'LEAD ARM',
      x: leadArmX,
      y: leadArmY,
      width: leadArmWidth,
      height: leadArmHeight,
      status: isInvincible
        ? 'INVINCIBLE'
        : isLeadArmPunching && isAttackActive
        ? 'ACTIVE_STRIKE'
        : isGuarding
        ? 'GUARD'
        : isHitstun
        ? 'HIT_STUN'
        : 'HURTBOX',
      damage: isLeadArmPunching && isAttackActive ? currentMove.damage : undefined,
      moveName: isLeadArmPunching ? currentMove.name : undefined,
      isRegisteredHit: isLeadArmPunching && isAttackActive,
    });

    // 4. REAR / TRAIL ARM SEGMENT
    const rearArmWidth = 45;
    const rearArmHeight = 45;
    const rearArmY = isCrouched ? baseY + 95 : baseY + 165;
    const rearArmX = facing === 1 ? baseX - 55 : baseX + 10;
    limbs.push({
      id: 'REAR_ARM',
      label: 'REAR ARM',
      x: rearArmX,
      y: rearArmY,
      width: rearArmWidth,
      height: rearArmHeight,
      status: isInvincible
        ? 'INVINCIBLE'
        : isHitstun
        ? 'HIT_STUN'
        : isGuarding
        ? 'GUARD'
        : 'HURTBOX',
    });

    // 5. LEAD LEG / KICKING FOOT SEGMENT
    const isLeadLegKicking = isKickMove;
    const leadLegWidth = isLeadLegKicking && isAttackActive ? Math.max(100, currentMove.range * 1.3) : 52;
    const leadLegHeight = isLeadLegKicking && isAttackActive ? 60 : isCrouched ? 70 : isAirborne ? 85 : 135;
    const leadLegY = isLeadLegKicking && isAttackActive ? baseY + 105 : isAirborne ? baseY + 45 : baseY;
    const leadLegX =
      facing === 1
        ? isLeadLegKicking
          ? baseX + 20
          : baseX + 10
        : isLeadLegKicking
        ? baseX - 20 - leadLegWidth
        : baseX - 10 - leadLegWidth;

    limbs.push({
      id: 'LEAD_LEG',
      label: isLeadLegKicking && isAttackActive ? 'LEAD FOOT [KICK]' : 'LEAD LEG',
      x: leadLegX,
      y: leadLegY,
      width: leadLegWidth,
      height: leadLegHeight,
      status: isInvincible
        ? 'INVINCIBLE'
        : isLeadLegKicking && isAttackActive
        ? 'ACTIVE_STRIKE'
        : isHitstun
        ? 'HIT_STUN'
        : 'HURTBOX',
      damage: isLeadLegKicking && isAttackActive ? currentMove.damage : undefined,
      moveName: isLeadLegKicking ? currentMove.name : undefined,
      isRegisteredHit: isLeadLegKicking && isAttackActive,
    });

    // 6. REAR / TRAIL LEG SEGMENT
    const rearLegWidth = 50;
    const rearLegHeight = isCrouched ? 70 : isAirborne ? 85 : 135;
    const rearLegY = isAirborne ? baseY + 45 : baseY;
    const rearLegX = facing === 1 ? baseX - 50 : baseX + 5;
    limbs.push({
      id: 'REAR_LEG',
      label: 'REAR LEG',
      x: rearLegX,
      y: rearLegY,
      width: rearLegWidth,
      height: rearLegHeight,
      status: isInvincible
        ? 'INVINCIBLE'
        : isHitstun
        ? 'HIT_STUN'
        : 'HURTBOX',
    });

    return limbs;
  };

  // Helper to compute master hurtbox capsule
  const getFighterHurtbox = (entity: FightingEntity) => {
    const isCrouched = entity.state === 'CROUCH' || entity.state === 'ATTACK_LK';
    const isAirborne = !entity.isGrounded;
    const isRolling = entity.state === 'ROLL_FWD' || entity.state === 'ROLL_BACK';

    const width = 140;
    const height = isCrouched ? 200 : 340;
    const headHeight = isCrouched ? 65 : 85;
    const bodyHeight = height - headHeight;

    return {
      width,
      height,
      headHeight,
      bodyHeight,
      isCrouched,
      isAirborne,
      isRolling,
      isInvincible: entity.isInvincible,
      isBlocking: entity.isBlocking,
    };
  };

  // Helper to compute attack hitbox parameters for a fighter
  const getFighterHitbox = (entity: FightingEntity) => {
    if (!entity.currentMove) return null;

    const move = entity.currentMove;
    const { startupFrames, activeFrames, recoveryFrames, range, type, button } = move;
    const currentFrame = entity.stateFrame;

    let phase: 'STARTUP' | 'ACTIVE' | 'RECOVERY' = 'STARTUP';
    if (currentFrame < startupFrames) {
      phase = 'STARTUP';
    } else if (currentFrame < startupFrames + activeFrames) {
      phase = 'ACTIVE';
    } else {
      phase = 'RECOVERY';
    }

    const isActive = phase === 'ACTIVE';
    const boxWidth = Math.max(100, range * 1.35 + 40);
    const boxHeight = type === 'SUPER' || type === 'CLIMAX' ? 240 : type === 'SPECIAL' ? 200 : 160;
    const offsetY = type === 'SUPER' ? 90 : 120;

    // Frame Advantage calculations
    // On block advantage = blockStun - (recoveryFrames + 1)
    const onBlockAdvantage = move.blockStun - (move.recoveryFrames + 1);
    // On hit advantage = hitStun - (recoveryFrames + 1)
    const onHitAdvantage = move.hitStun - (move.recoveryFrames + 1);

    return {
      moveName: move.name,
      moveType: type,
      button,
      command: move.command,
      damage: move.damage,
      phase,
      isActive,
      currentFrame,
      startupFrames,
      activeFrames,
      recoveryFrames,
      totalFrames: startupFrames + activeFrames + recoveryFrames,
      boxWidth,
      boxHeight,
      offsetY,
      range,
      reachPx: Math.round(range * 1.35 + 35),
      onBlockAdvantage,
      onHitAdvantage,
      blockStun: move.blockStun,
      hitStun: move.hitStun,
    };
  };

  const p1Limbs = computeLimbSegments(p1Entity, true);
  const p2Limbs = computeLimbSegments(p2Entity, false);

  const p1Hurtbox = getFighterHurtbox(p1Entity);
  const p2Hurtbox = getFighterHurtbox(p2Entity);
  const p1Hitbox = getFighterHitbox(p1Entity);
  const p2Hitbox = getFighterHitbox(p2Entity);

  // Distance calculations
  const fighterDistance = Math.round(Math.abs(p1Entity.x - p2Entity.x));
  const p1EffectiveReach = p1Hitbox ? p1Hitbox.reachPx : 180;
  const p1CanConnect = p1EffectiveReach >= fighterDistance;

  // Helper for limb style & color badges
  const getLimbStyle = (limb: LimbBoundingBox) => {
    switch (limb.status) {
      case 'ACTIVE_STRIKE':
        return {
          border: 'border-red-500 bg-red-600/40 shadow-[0_0_16px_rgba(239,68,68,0.9)] animate-pulse z-40',
          badge: 'bg-red-950 text-red-200 border-red-500',
          textColor: 'text-red-300 font-extrabold',
          icon: <Flame className="w-2.5 h-2.5 text-red-400 fill-red-400" />,
        };
      case 'GUARD':
        return {
          border: 'border-blue-400 bg-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.6)] z-30',
          badge: 'bg-blue-950 text-blue-200 border-blue-400',
          textColor: 'text-blue-200 font-bold',
          icon: <Shield className="w-2.5 h-2.5 text-blue-400" />,
        };
      case 'INVINCIBLE':
        return {
          border: 'border-purple-400 bg-purple-500/30 shadow-[0_0_14px_rgba(168,85,247,0.7)] z-30',
          badge: 'bg-purple-950 text-purple-200 border-purple-400',
          textColor: 'text-purple-200 font-bold',
          icon: <Sparkles className="w-2.5 h-2.5 text-purple-300" />,
        };
      case 'HIT_STUN':
        return {
          border: 'border-amber-400 bg-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse z-30',
          badge: 'bg-amber-950 text-amber-200 border-amber-400',
          textColor: 'text-amber-300 font-bold',
          icon: <Zap className="w-2.5 h-2.5 text-amber-400" />,
        };
      case 'HURTBOX':
      default:
        return {
          border: 'border-emerald-400/80 bg-emerald-500/15 shadow-[0_0_6px_rgba(16,185,129,0.3)] z-20',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
          textColor: 'text-emerald-300 font-semibold',
          icon: <Activity className="w-2 h-2 text-emerald-400" />,
        };
    }
  };

  return (
    <div
      id="fof-debug-hitbox-overlay"
      className="absolute inset-0 pointer-events-none z-35 font-mono select-none overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* 1. ARTICULATED REAL-TIME LIMB SEGMENT BOUNDING BOXES (PLAYER 1 & PLAYER 2) */}
      {/* ========================================================================= */}
      {showLimbSegments && (
        <>
          {/* Player 1 Limb Segment Bounding Boxes */}
          {p1Limbs.map(limb => {
            const style = getLimbStyle(limb);
            return (
              <div
                key={`p1_limb_${limb.id}`}
                className={`absolute flex flex-col justify-between items-center rounded border transition-all duration-75 ${style.border}`}
                style={{
                  left: `${toScreenX(limb.x)}%`,
                  bottom: `${limb.y + 16}px`,
                  width: `${limb.width}px`,
                  height: `${limb.height}px`,
                }}
              >
                {/* Limb Label Tag */}
                <div
                  className={`w-full flex items-center justify-between px-1 py-0.2 border-b text-[7px] font-black uppercase tracking-tighter leading-none ${style.badge}`}
                >
                  <span className="flex items-center gap-0.5 truncate">
                    {style.icon}
                    {limb.label}
                  </span>
                  {limb.damage && (
                    <span className="text-white font-extrabold ml-0.5">
                      {limb.damage}D
                    </span>
                  )}
                </div>

                {/* Real-time coordinates marker */}
                {showCoordinates && (
                  <div className="text-[6px] text-white/80 pb-0.5 font-bold tracking-tight">
                    {Math.round(limb.x)},{Math.round(limb.y)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Player 2 Limb Segment Bounding Boxes */}
          {p2Limbs.map(limb => {
            const style = getLimbStyle(limb);
            return (
              <div
                key={`p2_limb_${limb.id}`}
                className={`absolute flex flex-col justify-between items-center rounded border transition-all duration-75 ${style.border}`}
                style={{
                  left: `${toScreenX(limb.x)}%`,
                  bottom: `${limb.y + 16}px`,
                  width: `${limb.width}px`,
                  height: `${limb.height}px`,
                }}
              >
                {/* Limb Label Tag */}
                <div
                  className={`w-full flex items-center justify-between px-1 py-0.2 border-b text-[7px] font-black uppercase tracking-tighter leading-none ${style.badge}`}
                >
                  <span className="flex items-center gap-0.5 truncate">
                    {style.icon}
                    {limb.label}
                  </span>
                  {limb.damage && (
                    <span className="text-white font-extrabold ml-0.5">
                      {limb.damage}D
                    </span>
                  )}
                </div>

                {/* Real-time coordinates marker */}
                {showCoordinates && (
                  <div className="text-[6px] text-white/80 pb-0.5 font-bold tracking-tight">
                    {Math.round(limb.x)},{Math.round(limb.y)}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. GLOBAL HURTBOX CAPSULES (PLAYER 1 & PLAYER 2) */}
      {/* ========================================================================= */}
      {showGlobalCapsule && (
        <>
          {/* Player 1 Global Hurtbox & Master Hitbox */}
          <div
            className="absolute transition-all duration-75"
            style={{
              left: `${toScreenX(p1Entity.x)}%`,
              bottom: `${p1Entity.y + 16}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Origin Anchor Marker */}
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-white shadow-[0_0_8px_#22d3ee] z-30" />

            <div
              className={`relative flex flex-col items-center justify-end rounded-md border-2 border-dashed transition-all ${
                p1Hurtbox.isInvincible
                  ? 'border-purple-400 bg-purple-500/10'
                  : p1Hurtbox.isBlocking
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-emerald-400/40 bg-emerald-500/5'
              }`}
              style={{
                width: `${p1Hurtbox.width}px`,
                height: `${p1Hurtbox.height}px`,
              }}
            >
              <div className="w-full flex-1 flex flex-col items-center justify-end pb-1 opacity-75">
                <span className="text-[8px] font-extrabold uppercase text-white/90">
                  P1 MAIN CAPSULE
                </span>
                <span className="text-[6px] font-bold text-emerald-300 uppercase">
                  {p1Entity.state}
                </span>
              </div>
            </div>

            {/* Attack Hitbox Overlay */}
            {p1Hitbox && (
              <div
                className={`absolute flex flex-col items-center justify-center rounded border-2 transition-all ${
                  p1Hitbox.isActive
                    ? 'border-red-500 bg-red-600/40 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse z-40'
                    : 'border-amber-400/80 bg-amber-500/15 border-dashed z-20 opacity-70'
                }`}
                style={{
                  width: `${p1Hitbox.boxWidth}px`,
                  height: `${p1Hitbox.boxHeight}px`,
                  bottom: `${p1Hitbox.offsetY}px`,
                  left: p1Entity.facing === 1 ? `${p1Hurtbox.width * 0.4}px` : 'auto',
                  right: p1Entity.facing === -1 ? `${p1Hurtbox.width * 0.4}px` : 'auto',
                }}
              >
                <span
                  className={`text-[8px] font-black uppercase tracking-wider px-1 rounded leading-tight ${
                    p1Hitbox.isActive
                      ? 'bg-red-950 text-red-200 border border-red-400'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/60'
                  }`}
                >
                  {p1Hitbox.isActive ? '🔥 HITBOX ACTIVE' : `⏳ ${p1Hitbox.phase}`}
                </span>
                <span className="text-[7px] font-bold text-white uppercase drop-shadow mt-0.5">
                  {p1Hitbox.moveName} ({p1Hitbox.damage} DMG)
                </span>
                <span className="text-[6px] font-bold text-gray-200 mt-0.5">
                  F: {p1Hitbox.currentFrame}/{p1Hitbox.totalFrames} (S:{p1Hitbox.startupFrames} A:{p1Hitbox.activeFrames} R:{p1Hitbox.recoveryFrames})
                </span>
              </div>
            )}

            {/* Diagnostic HUD Tag */}
            {showDebugDetails && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 border border-emerald-500/80 rounded px-1.5 py-0.5 text-[8px] text-emerald-300 shadow-md flex items-center gap-1">
                <span className="font-black text-white">P1:</span>
                <span>X:{Math.round(p1Entity.x)}</span>
                <span>Y:{Math.round(p1Entity.y)}</span>
                <span>VX:{p1Entity.vx.toFixed(1)}</span>
                <span>VY:{p1Entity.vy.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Player 2 Global Hurtbox & Master Hitbox */}
          <div
            className="absolute transition-all duration-75"
            style={{
              left: `${toScreenX(p2Entity.x)}%`,
              bottom: `${p2Entity.y + 16}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Origin Anchor Marker */}
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-rose-400 border border-white shadow-[0_0_8px_#fb7185] z-30" />

            <div
              className={`relative flex flex-col items-center justify-end rounded-md border-2 border-dashed transition-all ${
                p2Hurtbox.isInvincible
                  ? 'border-purple-400 bg-purple-500/10'
                  : p2Hurtbox.isBlocking
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-emerald-400/40 bg-emerald-500/5'
              }`}
              style={{
                width: `${p2Hurtbox.width}px`,
                height: `${p2Hurtbox.height}px`,
              }}
            >
              <div className="w-full flex-1 flex flex-col items-center justify-end pb-1 opacity-75">
                <span className="text-[8px] font-extrabold uppercase text-white/90">
                  P2 MAIN CAPSULE
                </span>
                <span className="text-[6px] font-bold text-emerald-300 uppercase">
                  {p2Entity.state}
                </span>
              </div>
            </div>

            {/* Attack Hitbox Overlay */}
            {p2Hitbox && (
              <div
                className={`absolute flex flex-col items-center justify-center rounded border-2 transition-all ${
                  p2Hitbox.isActive
                    ? 'border-red-500 bg-red-600/40 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse z-40'
                    : 'border-amber-400/80 bg-amber-500/15 border-dashed z-20 opacity-70'
                }`}
                style={{
                  width: `${p2Hitbox.boxWidth}px`,
                  height: `${p2Hitbox.boxHeight}px`,
                  bottom: `${p2Hitbox.offsetY}px`,
                  left: p2Entity.facing === 1 ? `${p2Hurtbox.width * 0.4}px` : 'auto',
                  right: p2Entity.facing === -1 ? `${p2Hurtbox.width * 0.4}px` : 'auto',
                }}
              >
                <span
                  className={`text-[8px] font-black uppercase tracking-wider px-1 rounded leading-tight ${
                    p2Hitbox.isActive
                      ? 'bg-red-950 text-red-200 border border-red-400'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/60'
                  }`}
                >
                  {p2Hitbox.isActive ? '🔥 HITBOX ACTIVE' : `⏳ ${p2Hitbox.phase}`}
                </span>
                <span className="text-[7px] font-bold text-white uppercase drop-shadow mt-0.5">
                  {p2Hitbox.moveName} ({p2Hitbox.damage} DMG)
                </span>
                <span className="text-[6px] font-bold text-gray-200 mt-0.5">
                  F: {p2Hitbox.currentFrame}/{p2Hitbox.totalFrames} (S:{p2Hitbox.startupFrames} A:{p2Hitbox.activeFrames} R:{p2Hitbox.recoveryFrames})
                </span>
              </div>
            )}

            {/* Diagnostic HUD Tag */}
            {showDebugDetails && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 border border-emerald-500/80 rounded px-1.5 py-0.5 text-[8px] text-emerald-300 shadow-md flex items-center gap-1">
                <span className="font-black text-white">P2:</span>
                <span>X:{Math.round(p2Entity.x)}</span>
                <span>Y:{Math.round(p2Entity.y)}</span>
                <span>VX:{p2Entity.vx.toFixed(1)}</span>
                <span>VY:{p2Entity.vy.toFixed(1)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. ATTACK RANGE & SPACING RULER (HELPING PLAYERS UNDERSTAND ATTACK RANGE)  */}
      {/* ========================================================================= */}
      {showAttackRange && (
        <>
          {/* Ground Laser Spacing Gauge Between Fighters */}
          <div
            className="absolute bottom-4 pointer-events-none transition-all duration-75"
            style={{
              left: `${toScreenX(Math.min(p1Entity.x, p2Entity.x))}%`,
              width: `${toScreenWidth(fighterDistance)}%`,
              height: '14px',
            }}
          >
            {/* Center Distance Marker Badge */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1 px-2 py-0.5 rounded bg-black/90 border border-amber-500/70 text-[8px] text-amber-300 shadow-lg font-black tracking-wider">
              <Crosshair className="w-2.5 h-2.5 text-amber-400" />
              <span>OPPONENT GAP: {fighterDistance}px</span>
              <span className={`text-[7px] px-1 rounded ${
                p1CanConnect ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-stone-900 text-gray-400'
              }`}>
                {p1CanConnect ? 'TARGET IN REACH' : 'OUT OF REACH'}
              </span>
            </div>

            {/* Connecting Measurement Line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 opacity-80" />
            <div className="flex justify-between w-full text-[6px] text-amber-400/80 font-bold pt-0.5">
              <span>| P1 PIVOT</span>
              <span>GAP: {fighterDistance}px</span>
              <span>P2 PIVOT |</span>
            </div>
          </div>

          {/* Player 1 Active Attack Reach Projection */}
          {(() => {
            const reach = p1EffectiveReach;
            const startX = p1Entity.x;
            const endX = p1Entity.x + p1Entity.facing * reach;
            const leftX = Math.min(startX, endX);
            const reachWidth = Math.abs(endX - startX);
            const connects = reach >= fighterDistance;

            return (
              <div
                className="absolute bottom-10 pointer-events-none transition-all duration-75"
                style={{
                  left: `${toScreenX(leftX)}%`,
                  width: `${toScreenWidth(reachWidth)}%`,
                }}
              >
                {/* Horizontal Attack Range Corridor */}
                <div
                  className={`h-6 border-y-2 rounded flex items-center justify-center px-1 transition-all ${
                    p1Hitbox?.isActive
                      ? 'border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                      : connects
                      ? 'border-amber-400/90 bg-amber-400/10'
                      : 'border-cyan-400/60 bg-cyan-400/5'
                  }`}
                >
                  <span className="text-[7px] font-black uppercase text-white drop-shadow flex items-center gap-1">
                    <Flame className={`w-2.5 h-2.5 ${p1Hitbox?.isActive ? 'text-red-400 animate-pulse' : 'text-amber-300'}`} />
                    <span>P1 REACH: {reach}px</span>
                    <span className="text-[6px] text-yellow-300">
                      ({p1Hitbox ? p1Hitbox.moveName : 'NEUTRAL JAB'})
                    </span>
                    <span className={`px-1 py-0.2 rounded text-[6px] ${connects ? 'bg-emerald-900 text-emerald-200' : 'bg-red-950 text-red-200'}`}>
                      {connects ? '✓ REACHES' : '✗ WHIFF'}
                    </span>
                  </span>
                </div>

                {/* Vertical Strike Barrier at Max Range */}
                <div
                  className={`absolute top-0 bottom-0 w-1 ${
                    p1Entity.facing === 1 ? 'right-0' : 'left-0'
                  } ${p1Hitbox?.isActive ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-amber-400'}`}
                />
              </div>
            );
          })()}
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. REAL-TIME FRAME DATA INSPECTOR (HELPING PLAYERS UNDERSTAND FRAME DATA)  */}
      {/* ========================================================================= */}
      {showFrameData && isTrainingMode && (
        <div className="absolute top-24 left-3 pointer-events-auto bg-black/95 border-2 border-amber-500/80 rounded-xl p-3 text-[9px] text-gray-200 shadow-2xl backdrop-blur-md max-w-sm z-40 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-black uppercase">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>DOJO FRAME DATA ANALYZER</span>
            </div>
            <span className="px-1.5 py-0.2 bg-amber-950 border border-amber-500 text-amber-300 rounded text-[7px] font-bold">
              {p1Hitbox ? p1Hitbox.phase : 'IDLE / READY'}
            </span>
          </div>

          {/* Move Summary Card */}
          {p1Hitbox ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-extrabold text-[11px] uppercase">
                    {p1Hitbox.moveName}
                  </span>
                  <span className="text-gray-400 text-[8px] ml-1.5 font-mono">
                    [{p1Hitbox.command}]
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-600/30 text-red-300 border border-red-500">
                  {p1Hitbox.damage} DMG
                </span>
              </div>

              {/* Segmented Real-Time Frame Timeline Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[7px] font-bold text-gray-400">
                  <span className="text-amber-400">Startup: {p1Hitbox.startupFrames}f</span>
                  <span className="text-red-400">Active: {p1Hitbox.activeFrames}f</span>
                  <span className="text-cyan-400">Recovery: {p1Hitbox.recoveryFrames}f</span>
                  <span className="text-white">Total: {p1Hitbox.totalFrames}f</span>
                </div>

                {/* Visual Timeline Track */}
                <div className="relative h-4 w-full bg-stone-900 border border-white/20 rounded overflow-hidden flex">
                  {/* Startup frames bar */}
                  <div
                    className="h-full bg-amber-500/80 border-r border-black/50 flex items-center justify-center text-[7px] font-black text-black"
                    style={{ width: `${(p1Hitbox.startupFrames / p1Hitbox.totalFrames) * 100}%` }}
                    title={`Startup: ${p1Hitbox.startupFrames} frames`}
                  >
                    S
                  </div>

                  {/* Active frames bar */}
                  <div
                    className="h-full bg-red-600 border-r border-black/50 flex items-center justify-center text-[7px] font-black text-white animate-pulse"
                    style={{ width: `${(p1Hitbox.activeFrames / p1Hitbox.totalFrames) * 100}%` }}
                    title={`Active: ${p1Hitbox.activeFrames} frames`}
                  >
                    A
                  </div>

                  {/* Recovery frames bar */}
                  <div
                    className="h-full bg-cyan-600 flex items-center justify-center text-[7px] font-black text-white"
                    style={{ width: `${(p1Hitbox.recoveryFrames / p1Hitbox.totalFrames) * 100}%` }}
                    title={`Recovery: ${p1Hitbox.recoveryFrames} frames`}
                  >
                    R
                  </div>

                  {/* Current Frame Cursor Needle */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff] z-20 transition-all duration-75"
                    style={{
                      left: `${Math.min(100, (p1Hitbox.currentFrame / p1Hitbox.totalFrames) * 100)}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[7px] text-gray-300 font-mono">
                  <span>Current Frame: <strong className="text-white font-black">{p1Hitbox.currentFrame}</strong> / {p1Hitbox.totalFrames}</span>
                  <span className="text-yellow-400 uppercase font-black">{p1Hitbox.phase}</span>
                </div>
              </div>

              {/* Frame Advantage on Block & Hit */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
                <div className="p-1.5 rounded bg-black/60 border border-white/10 flex flex-col">
                  <span className="text-[7px] text-gray-400 uppercase font-bold">Advantage on Block:</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-[11px] font-black ${
                      p1Hitbox.onBlockAdvantage >= 0
                        ? 'text-emerald-400'
                        : p1Hitbox.onBlockAdvantage >= -4
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}>
                      {p1Hitbox.onBlockAdvantage > 0 ? `+${p1Hitbox.onBlockAdvantage}` : p1Hitbox.onBlockAdvantage}f
                    </span>
                    <span className="text-[6px] text-gray-400 uppercase">
                      {p1Hitbox.onBlockAdvantage >= 0
                        ? '(SAFE / PLUS)'
                        : p1Hitbox.onBlockAdvantage >= -4
                        ? '(SAFE)'
                        : '(PUNISHABLE)'}
                    </span>
                  </div>
                </div>

                <div className="p-1.5 rounded bg-black/60 border border-white/10 flex flex-col">
                  <span className="text-[7px] text-gray-400 uppercase font-bold">Advantage on Hit:</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[11px] font-black text-cyan-400">
                      {p1Hitbox.onHitAdvantage > 0 ? `+${p1Hitbox.onHitAdvantage}` : p1Hitbox.onHitAdvantage}f
                    </span>
                    <span className="text-[6px] text-gray-400 uppercase">
                      (LINK WINDOW)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center text-gray-400 space-y-1">
              <p className="text-[8px]">Player 1 is currently in Neutral / Stance state.</p>
              <p className="text-[7px] text-amber-300/80">Press Light/Heavy Punch, Kick, or execute a Special Move to inspect frame phases and reach.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PROJECTILE COLLIDERS */}
      {/* ========================================================================= */}
      {projectiles.map(proj => (
        <div
          key={`debug_proj_${proj.id}`}
          className="absolute flex items-center justify-center pointer-events-none rounded-full border-2 border-yellow-400 bg-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.8)] z-35"
          style={{
            left: `${toScreenX(proj.x)}%`,
            bottom: `${proj.y}px`,
            width: `${proj.radius * 2 + 10}px`,
            height: `${proj.radius * 2 + 10}px`,
            transform: 'translate(-50%, 50%)',
          }}
        >
          <span className="text-[7px] font-black text-black bg-yellow-400 px-0.5 rounded leading-none">
            PROJ {proj.damage}
          </span>
        </div>
      ))}

      {/* ========================================================================= */}
      {/* 6. FLOOR SURFACE CONTACT BOUNDARY */}
      {/* ========================================================================= */}
      <div className="absolute bottom-4 left-0 right-0 h-0.5 bg-cyan-400/70 border-b border-dashed border-cyan-300 shadow-[0_0_8px_#22d3ee]">
        <div className="absolute right-2 -top-3.5 text-[8px] font-black text-cyan-300 bg-black/80 px-1 border border-cyan-500">
          GROUND CONTACT Y:0
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. INTERACTIVE DEBUG TELEMETRY CONTROLS & REGISTRATION LEGEND */}
      {/* ========================================================================= */}
      <div className="absolute bottom-6 left-3 pointer-events-auto bg-black/95 border border-white/20 rounded-xl p-2.5 text-[8px] text-gray-300 shadow-2xl space-y-2 backdrop-blur-md max-w-sm z-40">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <div className="text-[9px] font-black text-white uppercase flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>HITBOX OVERLAY & FRAME DATA LAB</span>
          </div>
          <span className="px-1.5 py-0.2 bg-purple-950 border border-purple-500/80 rounded text-purple-300 text-[7px] font-bold">
            DOJO TRAINING MODE
          </span>
        </div>

        {/* Granular Visualizer Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowLimbSegments(p => !p)}
            className={`px-2 py-1 rounded text-[7px] font-bold uppercase transition-all cursor-pointer border ${
              showLimbSegments
                ? 'bg-purple-900/90 border-purple-400 text-purple-100 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Limbs: {showLimbSegments ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowAttackRange(p => !p)}
            className={`px-2 py-1 rounded text-[7px] font-bold uppercase transition-all cursor-pointer border ${
              showAttackRange
                ? 'bg-amber-900/90 border-amber-400 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Range Ruler: {showAttackRange ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowFrameData(p => !p)}
            className={`px-2 py-1 rounded text-[7px] font-bold uppercase transition-all cursor-pointer border ${
              showFrameData
                ? 'bg-red-900/90 border-red-400 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Frame Gauge: {showFrameData ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowGlobalCapsule(p => !p)}
            className={`px-2 py-1 rounded text-[7px] font-bold uppercase transition-all cursor-pointer border ${
              showGlobalCapsule
                ? 'bg-emerald-900/90 border-emerald-400 text-emerald-100'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Capsule: {showGlobalCapsule ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowCoordinates(p => !p)}
            className={`px-2 py-1 rounded text-[7px] font-bold uppercase transition-all cursor-pointer border ${
              showCoordinates
                ? 'bg-cyan-900/90 border-cyan-400 text-cyan-100'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Coords: {showCoordinates ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Visual Registration Legend */}
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-[7px] pt-1 border-t border-white/10">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-400 shrink-0" />
            <span className="text-emerald-300">Vulnerable Hurtbox</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-red-600/60 border border-red-500 shrink-0 animate-pulse" />
            <span className="text-red-300">Active Strike Hitbox</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-500/40 border border-blue-400 shrink-0" />
            <span className="text-blue-300">Guard / Block Box</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-400 shrink-0" />
            <span className="text-amber-300">Hitstun Registration</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-purple-500/40 border border-purple-400 shrink-0" />
            <span className="text-purple-300">Invincible Frames</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-yellow-500/50 border border-yellow-400 shrink-0" />
            <span className="text-yellow-300">Attack Range Line</span>
          </div>
        </div>
      </div>
    </div>
  );
};
