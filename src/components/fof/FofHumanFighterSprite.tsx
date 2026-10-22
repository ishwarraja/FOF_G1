import React from 'react';
import { FightingEntity } from '../../types/fighting';

interface FofHumanFighterSpriteProps {
  entity: FightingEntity;
  isPlayer1: boolean;
  isHitstunFlash?: boolean;
  renderModeStyle?: 'auto' | 'artwork' | 'vector';
}

export const FofHumanFighterSprite: React.FC<FofHumanFighterSpriteProps> = ({
  entity,
  isPlayer1,
  isHitstunFlash = false,
  renderModeStyle = 'auto',
}) => {
  const { character, state, stateFrame, isMaxMode, isInvincible } = entity;
  const charId = character?.id || (isPlayer1 ? 'arjun' : 'david');
  const [imageError, setImageError] = React.useState<boolean>(false);

  // High-resolution character artwork source
  const characterImageUrl = !imageError ? (
    character?.customImageUrl ||
    character?.avatarUrl ||
    (charId === 'arjun' ? '/characters/arjun_battle.jpg' : undefined)
  ) : undefined;

  const showArtwork = (renderModeStyle === 'artwork' || renderModeStyle === 'auto') && characterImageUrl && !imageError;

  // Frame timing calculation for smooth idle breathing & cloth sway
  const t = (stateFrame || 0);
  const idleBob = Math.sin(t * 0.18) * 2.5;
  const hairSway = Math.sin(t * 0.15) * 3;
  const breathe = Math.sin(t * 0.18) * 0.8;

  // Joint & Kinematic Pose variables
  // Reference Root Origin: (60, 66)
  let rootY = 66 + idleBob;
  let rootX = 60;
  let torsoAngle = 0;
  let headAngle = 0;
  let headOffsetY = 0;
  let headOffsetX = 0;

  // Left (Back) Arm
  let backShoulderAngle = 18;
  let backElbowAngle = 35;

  // Right (Front) Arm
  let frontShoulderAngle = -28;
  let frontElbowAngle = 45;

  // Left (Back) Leg
  let backHipAngle = -8;
  let backKneeAngle = 12;

  // Right (Front) Leg
  let frontHipAngle = 12;
  let frontKneeAngle = 14;

  let bodyScale = 1;
  let isCrouched = false;
  let auraGlow = 'none';

  // Pose calculation by action state
  switch (state) {
    case 'IDLE':
      torsoAngle = -3 + breathe * 2;
      headAngle = 1 - breathe;
      backShoulderAngle = 15 + Math.sin(t * 0.18) * 4;
      backElbowAngle = 38 + Math.cos(t * 0.18) * 4;
      frontShoulderAngle = -32 - Math.sin(t * 0.18) * 5;
      frontElbowAngle = 55 + Math.sin(t * 0.18) * 5;
      backHipAngle = -6;
      backKneeAngle = 10;
      frontHipAngle = 10;
      frontKneeAngle = 14;
      break;

    case 'WALK_FWD':
      rootY = 65 + Math.abs(Math.sin(t * 0.3)) * 3;
      torsoAngle = 8;
      headAngle = -4;
      backShoulderAngle = Math.sin(t * 0.3) * 35;
      backElbowAngle = 30 + Math.abs(Math.sin(t * 0.3)) * 20;
      frontShoulderAngle = -Math.sin(t * 0.3) * 35;
      frontElbowAngle = 30 + Math.abs(Math.cos(t * 0.3)) * 20;
      backHipAngle = Math.sin(t * 0.3) * 26;
      backKneeAngle = 15 + Math.max(0, Math.sin(t * 0.3)) * 25;
      frontHipAngle = -Math.sin(t * 0.3) * 26;
      frontKneeAngle = 15 + Math.max(0, -Math.sin(t * 0.3)) * 25;
      break;

    case 'WALK_BACK':
      rootY = 66 + Math.abs(Math.sin(t * 0.28)) * 2.5;
      torsoAngle = -6;
      headAngle = 3;
      backShoulderAngle = 25 + Math.sin(t * 0.28) * 15;
      backElbowAngle = 50;
      frontShoulderAngle = -40 - Math.sin(t * 0.28) * 15;
      frontElbowAngle = 65;
      backHipAngle = -Math.sin(t * 0.28) * 22;
      backKneeAngle = 12 + Math.max(0, -Math.sin(t * 0.28)) * 20;
      frontHipAngle = Math.sin(t * 0.28) * 22;
      frontKneeAngle = 12 + Math.max(0, Math.sin(t * 0.28)) * 20;
      break;

    case 'CROUCH':
      isCrouched = true;
      rootY = 80;
      torsoAngle = 16;
      headAngle = -10;
      headOffsetY = 2;
      backShoulderAngle = 30;
      backElbowAngle = 65;
      frontShoulderAngle = -45;
      frontElbowAngle = 80;
      backHipAngle = -55;
      backKneeAngle = 95;
      frontHipAngle = 60;
      frontKneeAngle = 100;
      break;

    case 'JUMP':
    case 'JUMP_NEUTRAL':
    case 'JUMP_FWD':
    case 'JUMP_BACK':
      rootY = 60;
      torsoAngle = 4;
      backShoulderAngle = -55;
      backElbowAngle = 30;
      frontShoulderAngle = -75;
      frontElbowAngle = 40;
      backHipAngle = 35;
      backKneeAngle = 65;
      frontHipAngle = 50;
      frontKneeAngle = 80;
      break;

    case 'ATTACK_LP': // Fast Straight Jab
      torsoAngle = 14;
      headOffsetX = 3;
      backShoulderAngle = 30;
      backElbowAngle = 55;
      frontShoulderAngle = -85;
      frontElbowAngle = 5;
      backHipAngle = -14;
      backKneeAngle = 18;
      frontHipAngle = 20;
      frontKneeAngle = 22;
      break;

    case 'ATTACK_HP': // Heavy Slash / Heavy Sledge Strike
      torsoAngle = 26;
      headOffsetX = 5;
      backShoulderAngle = 45;
      backElbowAngle = 70;
      frontShoulderAngle = -115;
      frontElbowAngle = 15;
      backHipAngle = -22;
      backKneeAngle = 28;
      frontHipAngle = 32;
      frontKneeAngle = 30;
      auraGlow = character.accentColor;
      break;

    case 'ATTACK_LK': // Quick Low Snap Kick
      torsoAngle = -8;
      backShoulderAngle = 15;
      backElbowAngle = 40;
      frontShoulderAngle = -20;
      frontElbowAngle = 50;
      backHipAngle = -18;
      backKneeAngle = 22;
      frontHipAngle = 72;
      frontKneeAngle = 10;
      break;

    case 'ATTACK_HK': // High Roundhouse / Flying Heavy Kick
      torsoAngle = -22;
      backShoulderAngle = 35;
      backElbowAngle = 60;
      frontShoulderAngle = -45;
      frontElbowAngle = 70;
      backHipAngle = -30;
      backKneeAngle = 35;
      frontHipAngle = 98;
      frontKneeAngle = 8;
      auraGlow = character.accentColor;
      break;

    case 'BLOWBACK': // Heavy Dual-Strike / Knockback Slam
      torsoAngle = 30;
      backShoulderAngle = -75;
      backElbowAngle = 15;
      frontShoulderAngle = -95;
      frontElbowAngle = 10;
      backHipAngle = -32;
      backKneeAngle = 38;
      frontHipAngle = 40;
      frontKneeAngle = 32;
      auraGlow = '#f59e0b';
      break;

    case 'SPECIAL_1': // Fireball / Energy Blast Pose
      torsoAngle = 20;
      backShoulderAngle = -80;
      backElbowAngle = 10;
      frontShoulderAngle = -88;
      frontElbowAngle = 8;
      backHipAngle = -24;
      backKneeAngle = 30;
      frontHipAngle = 30;
      frontKneeAngle = 30;
      auraGlow = character.accentColor;
      break;

    case 'SPECIAL_2': // Dragon Punch (DP) Uppercut
      rootY = 56;
      torsoAngle = -15;
      headAngle = -20;
      backShoulderAngle = 30;
      backElbowAngle = 60;
      frontShoulderAngle = -160;
      frontElbowAngle = 5;
      backHipAngle = 20;
      backKneeAngle = 45;
      frontHipAngle = 60;
      frontKneeAngle = 85;
      auraGlow = character.accentColor;
      break;

    case 'SPECIAL_3': // Rush Flurry / Tackle
      torsoAngle = 28;
      backShoulderAngle = -60;
      backElbowAngle = 25;
      frontShoulderAngle = -105;
      frontElbowAngle = 20;
      backHipAngle = -35;
      backKneeAngle = 30;
      frontHipAngle = 45;
      frontKneeAngle = 35;
      auraGlow = character.accentColor;
      break;

    case 'SUPER':
    case 'CLIMAX':
      torsoAngle = 16;
      backShoulderAngle = -110;
      backElbowAngle = 10;
      frontShoulderAngle = -125;
      frontElbowAngle = 8;
      backHipAngle = -28;
      backKneeAngle = 32;
      frontHipAngle = 38;
      frontKneeAngle = 32;
      auraGlow = '#ef4444';
      break;

    case 'GUARD':
      torsoAngle = -12;
      headOffsetX = -3;
      backShoulderAngle = -65;
      backElbowAngle = 90;
      frontShoulderAngle = -75;
      frontElbowAngle = 95;
      backHipAngle = -16;
      backKneeAngle = 24;
      frontHipAngle = 18;
      frontKneeAngle = 24;
      auraGlow = '#3b82f6';
      break;

    case 'HIT_LIGHT':
      torsoAngle = -22;
      headAngle = -18;
      headOffsetX = -6;
      backShoulderAngle = 45;
      backElbowAngle = 30;
      frontShoulderAngle = 35;
      frontElbowAngle = 40;
      backHipAngle = -18;
      backKneeAngle = 15;
      frontHipAngle = 10;
      frontKneeAngle = 15;
      break;

    case 'HIT_HEAVY':
    case 'KNOCKDOWN':
      torsoAngle = -48;
      headAngle = -32;
      headOffsetX = -12;
      headOffsetY = 4;
      backShoulderAngle = 65;
      backElbowAngle = 20;
      frontShoulderAngle = 55;
      frontElbowAngle = 20;
      backHipAngle = -38;
      backKneeAngle = 30;
      frontHipAngle = 20;
      frontKneeAngle = 35;
      break;

    case 'ROLL_FWD':
    case 'ROLL_BACK':
      rootY = 82;
      torsoAngle = 55;
      backShoulderAngle = -45;
      backElbowAngle = 85;
      frontShoulderAngle = -60;
      frontElbowAngle = 90;
      backHipAngle = 45;
      backKneeAngle = 80;
      frontHipAngle = 70;
      frontKneeAngle = 95;
      auraGlow = '#e0e7ff';
      break;

    case 'TAUNT':
      if (charId === 'arjun') {
        torsoAngle = -6;
        backShoulderAngle = 30;
        backElbowAngle = 50;
        frontShoulderAngle = -145 + Math.sin(t * 0.4) * 8;
        frontElbowAngle = 15;
      } else if (charId === 'steele') {
        torsoAngle = 0;
        backShoulderAngle = 10;
        backElbowAngle = 20;
        frontShoulderAngle = -135;
        frontElbowAngle = 90;
      } else if (charId === 'valeria') {
        torsoAngle = 8;
        backShoulderAngle = -50;
        backElbowAngle = 40;
        frontShoulderAngle = -70 + Math.sin(t * 0.5) * 12;
        frontElbowAngle = 60;
      } else {
        torsoAngle = -4;
        backShoulderAngle = 20;
        backElbowAngle = 40;
        frontShoulderAngle = -90 + Math.sin(t * 0.5) * 10;
        frontElbowAngle = 45;
      }
      break;

    case 'VICTORY': {
      // Dynamic 3-stage victory animation sequence tailored to each fighter
      auraGlow = character.accentColor || '#fbbf24';
      if (charId === 'arjun') {
        if (t < 35) {
          // Stage 0: Ground stance & fierce warrior roar
          torsoAngle = 12 + Math.sin(t * 0.4) * 3;
          headAngle = -15;
          backShoulderAngle = 35;
          backElbowAngle = 65;
          frontShoulderAngle = -45;
          frontElbowAngle = 70;
          backHipAngle = -18;
          frontHipAngle = 22;
        } else if (t < 70) {
          // Stage 1: Massive industrial wrench ground slam
          rootY = 74;
          torsoAngle = 32;
          headAngle = 10;
          backShoulderAngle = -85;
          backElbowAngle = 20;
          frontShoulderAngle = -95;
          frontElbowAngle = 25;
          backHipAngle = -28;
          backKneeAngle = 36;
          frontHipAngle = 38;
          frontKneeAngle = 34;
        } else {
          // Stage 2: Rest wrench across shoulder & thrust iron fist skyward!
          torsoAngle = -6 + Math.sin(t * 0.15) * 2;
          headAngle = -12;
          backShoulderAngle = -125;
          backElbowAngle = 110;
          frontShoulderAngle = -170 + Math.sin(t * 0.2) * 4;
          frontElbowAngle = 8;
          backHipAngle = -10;
          frontHipAngle = 12;
        }
      } else if (charId === 'steele' || charId === 'david') {
        if (t < 35) {
          // Holster weapon with military precision
          torsoAngle = -4;
          headAngle = 0;
          backShoulderAngle = 15;
          backElbowAngle = 30;
          frontShoulderAngle = -30;
          frontElbowAngle = 60;
        } else if (t < 65) {
          // Tap tactical comms headset
          torsoAngle = -2;
          headAngle = -10;
          backShoulderAngle = 15;
          backElbowAngle = 25;
          frontShoulderAngle = -140;
          frontElbowAngle = 120;
        } else {
          // Rigid military folded arms pose with cyan scan
          torsoAngle = -5;
          headAngle = 2;
          backShoulderAngle = -115;
          backElbowAngle = 92;
          frontShoulderAngle = -115;
          frontElbowAngle = 92;
          backHipAngle = -8;
          frontHipAngle = 10;
          auraGlow = '#38bdf8';
        }
      } else if (charId === 'valeria') {
        if (t < 30) {
          // Twin blade aerial flourish
          torsoAngle = -10;
          backShoulderAngle = -150 + Math.sin(t * 0.5) * 25;
          backElbowAngle = 20;
          frontShoulderAngle = -150 - Math.sin(t * 0.5) * 25;
          frontElbowAngle = 20;
        } else if (t < 60) {
          // Sheathes blades behind back
          torsoAngle = 5;
          headAngle = 8;
          backShoulderAngle = 35;
          backElbowAngle = 105;
          frontShoulderAngle = 35;
          frontElbowAngle = 105;
        } else {
          // Hand on hip, playful anime peace sign
          torsoAngle = 8;
          headAngle = 14;
          backShoulderAngle = -45;
          backElbowAngle = 65;
          frontShoulderAngle = -135;
          frontElbowAngle = 35;
          backHipAngle = -12;
          frontHipAngle = 16;
          auraGlow = '#ec4899';
        }
      } else if (charId === 'victor') {
        if (t < 35) {
          // Dark matter swirl
          torsoAngle = 14;
          backShoulderAngle = -75;
          frontShoulderAngle = -85;
        } else if (t < 65) {
          // Dark flame command
          torsoAngle = -12;
          headAngle = -18;
          frontShoulderAngle = -155;
          frontElbowAngle = 12;
        } else {
          // Arrogant chin raised, adjusts gold collar
          torsoAngle = -14;
          headAngle = -22;
          headOffsetX = -4;
          backShoulderAngle = 25;
          backElbowAngle = 20;
          frontShoulderAngle = -125;
          frontElbowAngle = 105;
          auraGlow = '#a855f7';
        }
      } else if (charId === 'elena') {
        if (t < 35) {
          // Cryo skater pirouette
          torsoAngle = -14;
          backShoulderAngle = 60;
          frontShoulderAngle = -120;
        } else if (t < 65) {
          // Manifests ice flower in palm
          torsoAngle = -4;
          headAngle = 10;
          frontShoulderAngle = -75;
          frontElbowAngle = 85;
        } else {
          // Confident salute to forehead with shimmering snow
          torsoAngle = -6;
          headAngle = 4;
          backShoulderAngle = 18;
          backElbowAngle = 25;
          frontShoulderAngle = -145;
          frontElbowAngle = 125;
          auraGlow = '#06b6d4';
        }
      } else if (charId === 'maya') {
        if (t < 30) {
          // Shadowboxing 1-2 combo
          torsoAngle = 8;
          frontShoulderAngle = -100 + Math.sin(t * 0.6) * 35;
          backShoulderAngle = -100 - Math.sin(t * 0.6) * 35;
        } else if (t < 60) {
          // High celebratory kick snap
          torsoAngle = -22;
          frontHipAngle = 92;
          frontKneeAngle = 10;
          backHipAngle = -25;
        } else {
          // Dynamic low champion crouch, thumb up to herself
          rootY = 76;
          torsoAngle = 14;
          headAngle = -10;
          backShoulderAngle = -45;
          backElbowAngle = 55;
          frontShoulderAngle = -130;
          frontElbowAngle = 35;
          frontHipAngle = 45;
          frontKneeAngle = 55;
          auraGlow = '#f43f5e';
        }
      } else if (charId === 'leo') {
        if (t < 35) {
          // Primal battle roar
          rootY = 70;
          torsoAngle = 20;
          headAngle = -26;
          frontShoulderAngle = -85;
          backShoulderAngle = -85;
        } else if (t < 65) {
          // Double bicep flex
          torsoAngle = 0;
          headAngle = -8;
          frontShoulderAngle = -120;
          frontElbowAngle = 90;
          backShoulderAngle = -120;
          backElbowAngle = 90;
        } else {
          // Dual fists pumped skyward
          torsoAngle = -12;
          headAngle = -15;
          frontShoulderAngle = -170;
          frontElbowAngle = 10;
          backShoulderAngle = -170;
          backElbowAngle = 10;
          auraGlow = '#eab308';
        }
      } else if (charId === 'kai') {
        if (t < 35) {
          // Shinobi smoke stance
          rootY = 76;
          torsoAngle = 25;
          headAngle = -12;
        } else if (t < 65) {
          // Reappearing with arms folded
          torsoAngle = 0;
          frontShoulderAngle = -110;
          backShoulderAngle = -110;
        } else {
          // Mystical mudra seal
          torsoAngle = -4;
          headAngle = 2;
          frontShoulderAngle = -90;
          frontElbowAngle = 90;
          backShoulderAngle = -90;
          backElbowAngle = 90;
          auraGlow = '#9333ea';
        }
      } else if (charId === 'kabir') {
        if (t < 35) {
          // Martial Pranam bow
          torsoAngle = 24;
          headAngle = 15;
          frontShoulderAngle = -80;
          frontElbowAngle = 80;
          backShoulderAngle = -80;
          backElbowAngle = 80;
        } else {
          // Serene open palm strike guard
          torsoAngle = -4;
          headAngle = -2;
          frontShoulderAngle = -95;
          frontElbowAngle = 15;
          backShoulderAngle = -45;
          backElbowAngle = 65;
          auraGlow = '#f97316';
        }
      } else if (charId === 'zara') {
        if (t < 35) {
          // Wind acrobatic spin
          rootY = 56;
          torsoAngle = -30;
        } else {
          // Crouched kunai guard with cape billowing
          rootY = 80;
          torsoAngle = 12;
          frontShoulderAngle = -115;
          frontElbowAngle = 45;
          backShoulderAngle = 40;
          frontHipAngle = 65;
          backHipAngle = -30;
          auraGlow = '#14b8a6';
        }
      } else {
        // Universal Street Fighter Style Victory
        if (t < 35) {
          torsoAngle = -4;
          frontShoulderAngle = -45;
          backShoulderAngle = 20;
        } else {
          torsoAngle = -8;
          headAngle = -10;
          frontShoulderAngle = -165;
          frontElbowAngle = 12;
          backShoulderAngle = 15;
          backElbowAngle = 35;
          auraGlow = '#fbbf24';
        }
      }
      break;
    }

    case 'DEFEAT': {
      // Dynamic Defeat Collapse: Crumple to one knee, trembling breath, head bowed in defeat
      if (t < 30) {
        // Initial knee buckling & stagger
        rootY = 80 + Math.sin(t * 0.25) * 3;
        torsoAngle = 38;
        headAngle = 16;
        backShoulderAngle = 40;
        backElbowAngle = 35;
        frontShoulderAngle = 35;
        frontElbowAngle = 40;
        backHipAngle = 35;
        backKneeAngle = 45;
        frontHipAngle = 30;
        frontKneeAngle = 40;
      } else {
        // Collapsed onto one knee with head bowed down heavily
        rootY = 92;
        torsoAngle = 68 + Math.sin(t * 0.12) * 2;
        headAngle = 30;
        headOffsetY = 8;
        headOffsetX = 4;
        backShoulderAngle = 55;
        backElbowAngle = 25;
        frontShoulderAngle = 45;
        frontElbowAngle = 20;
        backHipAngle = 55;
        backKneeAngle = 75;
        frontHipAngle = 45;
        frontKneeAngle = 65;
      }
      auraGlow = '#3b0764';
      break;
    }

    default:
      break;
  }

  // Fighter specific color palettes & styles
  const getFighterPalette = () => {
    switch (charId) {
      case 'arjun':
        return {
          skin: '#d97706',
          skinShadow: '#b45309',
          hair: '#1c1917',
          hairHighlight: '#44403c',
          outfitPrimary: '#b45309', // Industrial Work Vest / Ochre
          outfitSecondary: '#292524', // Heavy Denim Work Pants
          outfitAccent: '#f59e0b', // Hazard Yellow Belt / Armbands
          boots: '#451a03',
          eyes: '#fef08a',
          weapon: '#94a3b8',
        };
      case 'steele':
        return {
          skin: '#fbcfe8',
          skinShadow: '#f472b6',
          hair: '#f8fafc', // Silver Commander Hair
          hairHighlight: '#38bdf8',
          outfitPrimary: '#1e293b', // Military Commander Greatcoat
          outfitSecondary: '#0f172a', // Tactical Slacks
          outfitAccent: '#38bdf8', // Neon Sky Trim
          boots: '#020617',
          eyes: '#0284c7',
          weapon: '#38bdf8',
        };
      case 'valeria':
        return {
          skin: '#fed7aa',
          skinShadow: '#fb923c',
          hair: '#06b6d4', // Cyan Plasma Anime Locks
          hairHighlight: '#67e8f9',
          outfitPrimary: '#0f172a', // Unit-0 Cyber Bodysuit
          outfitSecondary: '#1e1b4b',
          outfitAccent: '#22d3ee', // Glowing Cyan Circuits
          boots: '#0891b2',
          eyes: '#22d3ee',
          weapon: '#06b6d4',
        };
      case 'victor':
        return {
          skin: '#fde047',
          skinShadow: '#ca8a04',
          hair: '#e2e8f0', // Slick Silver Sovereign
          hairHighlight: '#f8fafc',
          outfitPrimary: '#3b0764', // Sovereign Velvet Tux
          outfitSecondary: '#1e1b4b',
          outfitAccent: '#fbbf24', // Gold Filigree & Monocle
          boots: '#18181b',
          eyes: '#fbbf24',
          weapon: '#fbbf24',
        };
      case 'elena':
        return {
          skin: '#fed7aa',
          skinShadow: '#f97316',
          hair: '#0284c7', // Cryo Frost Bob
          hairHighlight: '#38bdf8',
          outfitPrimary: '#083344', // Cryo Tech Coat
          outfitSecondary: '#164e63',
          outfitAccent: '#06b6d4',
          boots: '#0e7490',
          eyes: '#22d3ee',
          weapon: '#06b6d4',
        };
      case 'maya':
        return {
          skin: '#fbcfe8',
          skinShadow: '#e879f9',
          hair: '#ec4899', // Hot Pink Twin Braids
          hairHighlight: '#f472b6',
          outfitPrimary: '#701a75',
          outfitSecondary: '#4a044e',
          outfitAccent: '#f43f5e',
          boots: '#831843',
          eyes: '#f43f5e',
          weapon: '#ec4899',
        };
      case 'leo':
        return {
          skin: '#fed7aa',
          skinShadow: '#fb923c',
          hair: '#15803d', // Kinetic Green Spikes
          hairHighlight: '#4ade80',
          outfitPrimary: '#065f46',
          outfitSecondary: '#064e3b',
          outfitAccent: '#10b981',
          boots: '#047857',
          eyes: '#34d399',
          weapon: '#10b981',
        };
      case 'david':
        return {
          skin: '#fde047',
          skinShadow: '#ca8a04',
          hair: '#854d0e',
          hairHighlight: '#eab308',
          outfitPrimary: '#713f12',
          outfitSecondary: '#451a03',
          outfitAccent: '#facc15',
          boots: '#292524',
          eyes: '#fde047',
          weapon: '#eab308',
        };
      case 'kai':
        return {
          skin: '#cbd5e1',
          skinShadow: '#94a3b8',
          hair: '#581c87', // Shadow Cowl Violet
          hairHighlight: '#c084fc',
          outfitPrimary: '#3b0764',
          outfitSecondary: '#1e1b4b',
          outfitAccent: '#a855f7',
          boots: '#1e1b4b',
          eyes: '#c084fc',
          weapon: '#a855f7',
        };
      default:
        return {
          skin: '#fed7aa',
          skinShadow: '#fb923c',
          hair: '#b45309',
          hairHighlight: '#f59e0b',
          outfitPrimary: character.accentColor || '#dc2626',
          outfitSecondary: '#18181b',
          outfitAccent: '#fbbf24',
          boots: '#09090b',
          eyes: '#ffffff',
          weapon: character.accentColor || '#ef4444',
        };
    }
  };

  const pal = getFighterPalette();

  if (showArtwork && characterImageUrl) {
    const isVictory = state === 'VICTORY';
    const isDefeat = state === 'DEFEAT';

    return (
      <div
        id={`fighter-sprite-${entity.id}`}
        className={`relative select-none pointer-events-none flex flex-col items-center justify-end ${
          isHitstunFlash ? 'brightness-200 contrast-150 animate-hitstun-vibrate' : ''
        }`}
        style={{
          filter: isVictory
            ? `drop-shadow(0 0 24px ${auraGlow}) drop-shadow(0 0 8px #fde047)`
            : isDefeat
            ? 'grayscale(60%) brightness(75%) drop-shadow(0 8px 12px rgba(0,0,0,0.95))'
            : isInvincible
            ? 'drop-shadow(0 0 14px rgba(168,85,247,0.85))'
            : isMaxMode
            ? 'drop-shadow(0 0 18px rgba(239,68,68,0.9))'
            : auraGlow !== 'none'
            ? `drop-shadow(0 0 14px ${auraGlow})`
            : 'drop-shadow(0 8px 16px rgba(0,0,0,0.85))',
        }}
      >
        {/* Dynamic Ground Shadow */}
        <div
          className="absolute -bottom-1 w-32 h-6 bg-black/60 rounded-full blur-sm pointer-events-none"
          style={{
            transform: `scale(${Math.max(0.4, 1 - (entity.y / 240) * 0.5)})`,
            opacity: Math.max(0.2, 1 - entity.y / 300),
          }}
        />

        {/* Character Image Picture Container with combat dynamics */}
        <div
          className="relative w-56 h-72 sm:w-64 sm:h-80 md:w-72 md:h-[340px] flex items-end justify-center transition-transform duration-150 overflow-visible"
          style={{
            transform: isVictory
              ? `translateY(${Math.min(0, Math.max(-24, -rootY + 66))}px) scale(${bodyScale * 1.05})`
              : isDefeat
              ? `translateY(${Math.min(32, Math.max(16, -rootY + 110))}px) rotate(${isPlayer1 ? '-8deg' : '8deg'}) scale(${bodyScale * 0.92})`
              : `translateY(${Math.min(12, Math.max(-18, -rootY + 66))}px) rotate(${torsoAngle * 0.3}deg) scale(${bodyScale})`,
          }}
        >
          {/* Victory Floating Crown / Halo */}
          {isVictory && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none animate-bounce">
              <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-[11px] uppercase tracking-wider shadow-lg border border-white flex items-center gap-1">
                <span>★ WINNER ★</span>
              </div>
            </div>
          )}

          {/* Defeat Indicator */}
          {isDefeat && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
              <div className="px-2 py-0.5 rounded bg-red-950/90 text-red-400 font-bold text-[10px] uppercase tracking-wider border border-red-700/80 shadow">
                <span>K.O.</span>
              </div>
            </div>
          )}

          <img
            src={characterImageUrl}
            alt={character?.name || charId}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-contain object-bottom drop-shadow-2xl select-none pointer-events-none"
          />

          {/* Elemental Aura Glow in Max Mode or Victory */}
          {(isMaxMode || isVictory) && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse"
              style={{
                background: `radial-gradient(circle at 50% 60%, ${character?.accentColor || '#ef4444'}44, transparent 70%)`,
              }}
            />
          )}

          {/* Invincibility Shimmer */}
          {isInvincible && (
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-2xl pointer-events-none" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id={`fighter-sprite-${entity.id}`}
      className={`relative select-none pointer-events-none ${
        isHitstunFlash ? 'brightness-200 contrast-150' : ''
      }`}
      style={{
        filter: isInvincible
          ? 'drop-shadow(0 0 14px rgba(168,85,247,0.85))'
          : isMaxMode
          ? 'drop-shadow(0 0 16px rgba(239,68,68,0.9))'
          : auraGlow !== 'none'
          ? `drop-shadow(0 0 12px ${auraGlow})`
          : 'drop-shadow(0 6px 8px rgba(0,0,0,0.75))',
      }}
    >
      <svg
        viewBox="0 0 120 140"
        className="w-64 h-80 sm:w-72 sm:h-96 md:w-84 md:h-[370px] lg:w-[370px] lg:h-[420px] overflow-visible drop-shadow-[0_10px_16px_rgba(0,0,0,0.85)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Shading Gradients */}
          <linearGradient id={`grad_skin_${entity.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={pal.skin} />
            <stop offset="100%" stopColor={pal.skinShadow} />
          </linearGradient>

          <linearGradient id={`grad_outfit_${entity.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pal.outfitPrimary} />
            <stop offset="100%" stopColor={pal.outfitSecondary} />
          </linearGradient>

          <linearGradient id={`grad_hair_${entity.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={pal.hairHighlight} />
            <stop offset="60%" stopColor={pal.hair} />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>

          <radialGradient id={`aura_burst_${entity.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={pal.weapon} stopOpacity="0.8" />
            <stop offset="70%" stopColor={pal.outfitAccent} stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Ground Shadow */}
        <ellipse
          cx={rootX}
          cy="126"
          rx={isCrouched ? 30 : 22}
          ry="6"
          fill="rgba(0,0,0,0.65)"
        />

        {/* 2. MAX Mode / Special Energy Flare Aura */}
        {isMaxMode && (
          <g className="animate-pulse">
            <ellipse
              cx={rootX}
              cy={rootY}
              rx="36"
              ry="45"
              fill={`url(#aura_burst_${entity.id})`}
            />
            {/* Speed / Power Lines */}
            <path
              d={`M ${rootX - 25} 120 Q ${rootX - 35} 70 ${rootX - 10} 25 Q ${rootX + 10} 20 ${rootX + 25} 70 Q ${rootX + 35} 100 ${rootX + 20} 120 Z`}
              fill="none"
              stroke="#fca5a5"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          </g>
        )}

        {/* 3. BACK LEG (Anchored at Pelvis Hip: X=54, Y=rootY + 12) */}
        <g
          transform={`translate(54, ${rootY + 12}) rotate(${backHipAngle})`}
          style={{ transformOrigin: '0px 0px' }}
        >
          {/* Thigh */}
          <path
            d="M -4 0 C -5 8 -5 16 -3 24 L 5 24 C 6 16 5 8 4 0 Z"
            fill={`url(#grad_outfit_${entity.id})`}
            stroke="#09090b"
            strokeWidth="1.4"
          />

          {/* Knee & Calf & Boot (Anchored at Knee: X=0, Y=22) */}
          <g
            transform={`translate(0, 22) rotate(${backKneeAngle})`}
            style={{ transformOrigin: '0px 0px' }}
          >
            {/* Calf / Shin */}
            <path
              d="M -3 0 L -4 18 L 4 18 L 4 0 Z"
              fill={`url(#grad_outfit_${entity.id})`}
              stroke="#09090b"
              strokeWidth="1.4"
            />
            {/* Boot */}
            <path
              d="M -5 16 L -10 26 L 6 26 L 5 16 Z"
              fill={pal.boots}
              stroke="#09090b"
              strokeWidth="1.4"
            />
            {/* Boot Accent Strip */}
            <line x1="-3" y1="20" x2="3" y2="20" stroke={pal.outfitAccent} strokeWidth="1.5" />
          </g>
        </g>

        {/* 4. BACK ARM (Anchored at Shoulder: X=50, Y=rootY - 14) */}
        <g
          transform={`translate(50, ${rootY - 14}) rotate(${backShoulderAngle})`}
          style={{ transformOrigin: '0px 0px' }}
        >
          {/* Bicep / Sleeve */}
          <path
            d="M -3 0 C -4 6 -4 12 -3 18 L 4 18 C 4 12 4 6 3 0 Z"
            fill={`url(#grad_outfit_${entity.id})`}
            stroke="#09090b"
            strokeWidth="1.4"
          />

          {/* Forearm & Fist (Anchored at Elbow: X=0, Y=16) */}
          <g
            transform={`translate(0, 16) rotate(${backElbowAngle})`}
            style={{ transformOrigin: '0px 0px' }}
          >
            {/* Forearm */}
            <path
              d="M -3 0 L -3 14 L 3 14 L 3 0 Z"
              fill={`url(#grad_skin_${entity.id})`}
              stroke="#09090b"
              strokeWidth="1.4"
            />
            {/* Wristband */}
            <rect x="-3.5" y="6" width="7" height="4" fill={pal.outfitAccent} stroke="#09090b" strokeWidth="1" rx="1" />
            {/* Fist */}
            <circle cx="0" cy="17" r="4.5" fill={pal.skin} stroke="#09090b" strokeWidth="1.4" />
          </g>
        </g>

        {/* 5. TORSO & SPINE (Anchored at Pelvis Root: X=rootX, Y=rootY) */}
        <g
          transform={`translate(${rootX}, ${rootY}) rotate(${torsoAngle})`}
          style={{ transformOrigin: '0px 0px' }}
        >
          {/* Back Coat Tails / Gi Tails */}
          <path
            d={`M -8 10 C ${-14 + hairSway} 24 ${-16 - hairSway} 34 ${-8 + hairSway} 42 L 8 20 Z`}
            fill={pal.outfitSecondary}
            opacity="0.85"
          />

          {/* Pelvis / Waist Base */}
          <path
            d="M -10 4 L 10 4 L 8 16 L -8 16 Z"
            fill={pal.outfitSecondary}
            stroke="#09090b"
            strokeWidth="1.5"
          />

          {/* Main Torso / Chest / Gi */}
          <path
            d="M -12 -22 C -14 -12 -12 2 -10 6 L 10 6 C 12 2 14 -12 12 -22 Z"
            fill={`url(#grad_outfit_${entity.id})`}
            stroke="#09090b"
            strokeWidth="1.6"
          />

          {/* Chest Collar / Inner Shirt V-Neck */}
          <path
            d="M -6 -22 L 0 -10 L 6 -22 Z"
            fill={`url(#grad_skin_${entity.id})`}
            stroke="#09090b"
            strokeWidth="1.2"
          />

          {/* Belt / Sash with Knot & Hanging Ribbons */}
          <rect x="-11" y="2" width="22" height="6" fill={pal.outfitAccent} stroke="#09090b" strokeWidth="1.4" rx="1.5" />
          {/* Belt Buckle / Knot */}
          <rect x="-3" y="1" width="6" height="8" fill="#f8fafc" stroke="#09090b" strokeWidth="1.2" rx="1" />
          {/* Hanging Sash Tails */}
          <path
            d={`M -2 8 C ${-4 + hairSway * 0.5} 16 ${-3 - hairSway * 0.5} 24 ${-1} 30 L 3 30 C 1 24 2 16 2 8 Z`}
            fill={pal.outfitAccent}
            stroke="#09090b"
            strokeWidth="1"
          />

          {/* Martial Arts Chest Insignia / Tactical Straps */}
          {charId === 'arjun' && (
            <path d="M -8 -18 L 8 -6 M 8 -18 L -8 -6" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" />
          )}
          {charId === 'steele' && (
            <path d="M -8 -16 L 8 -16 L 4 -8 L -4 -8 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" opacity="0.9" />
          )}
          {charId === 'valeria' && (
            <circle cx="0" cy="-14" r="3.5" fill="#22d3ee" stroke="#0891b2" strokeWidth="1" filter="drop-shadow(0 0 4px #22d3ee)" />
          )}
          {charId === 'victor' && (
            <path d="M -4 -16 L 0 -20 L 4 -16 L 0 -12 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
          )}
        </g>

        {/* 6. FRONT LEG (Anchored at Pelvis Hip: X=66, Y=rootY + 12) */}
        <g
          transform={`translate(66, ${rootY + 12}) rotate(${frontHipAngle})`}
          style={{ transformOrigin: '0px 0px' }}
        >
          {/* Front Thigh */}
          <path
            d="M -4 0 C -5 8 -5 16 -3 24 L 5 24 C 6 16 5 8 4 0 Z"
            fill={`url(#grad_outfit_${entity.id})`}
            stroke="#09090b"
            strokeWidth="1.5"
          />
          {/* Side Trouser Stripe */}
          <line x1="1" y1="2" x2="2" y2="22" stroke={pal.outfitAccent} strokeWidth="1.2" />

          {/* Front Knee & Shin & Boot (Anchored at Knee: X=0, Y=22) */}
          <g
            transform={`translate(0, 22) rotate(${frontKneeAngle})`}
            style={{ transformOrigin: '0px 0px' }}
          >
            {/* Calf / Shin */}
            <path
              d="M -3 0 L -4 18 L 4 18 L 4 0 Z"
              fill={`url(#grad_outfit_${entity.id})`}
              stroke="#09090b"
              strokeWidth="1.5"
            />
            {/* Front Boot */}
            <path
              d="M -5 16 L -4 26 L 14 26 L 6 16 Z"
              fill={pal.boots}
              stroke="#09090b"
              strokeWidth="1.5"
            />
            {/* Boot Sole Grip & Laces */}
            <line x1="-3" y1="25" x2="13" y2="25" stroke="#09090b" strokeWidth="1.5" />
            <line x1="0" y1="18" x2="5" y2="18" stroke={pal.outfitAccent} strokeWidth="1.4" />
          </g>
        </g>

        {/* 7. HEAD & NECK (Anchored atop Chest: X=rootX + headOffsetX, Y=rootY - 24 + headOffsetY) */}
        <g
          transform={`translate(${rootX + headOffsetX}, ${rootY - 24 + headOffsetY}) rotate(${headAngle})`}
          style={{ transformOrigin: '0px 0px' }}
        >
          {/* Neck */}
          <path
            d="M -3 0 L -3 6 L 3 6 L 3 0 Z"
            fill={`url(#grad_skin_${entity.id})`}
            stroke="#09090b"
            strokeWidth="1.2"
          />

          {/* Face Base */}
          <path
            d="M -8 -16 C -8 -24 8 -24 8 -16 C 8 -8 4 0 0 2 C -4 0 -8 -8 -8 -16 Z"
            fill={`url(#grad_skin_${entity.id})`}
            stroke="#09090b"
            strokeWidth="1.4"
          />

          {/* Eye & Eyebrow */}
          <path d="M 0 -13 L 5 -13 L 4 -11 L 0 -12 Z" fill="#09090b" />
          <ellipse cx="3" cy="-11" rx="1.6" ry="1.2" fill={pal.eyes} />
          <circle cx="3.4" cy="-11.3" r="0.5" fill="#ffffff" />

          {/* Nose & Mouth */}
          <path d="M 5 -9 L 7 -7 L 4 -6" fill="none" stroke="#09090b" strokeWidth="1" />
          {state.startsWith('ATTACK') || state === 'SUPER' || state === 'CLIMAX' ? (
            // Shouting Battle Cry Mouth
            <path d="M 1 -4 Q 5 -1 6 -4 Z" fill="#991b1b" stroke="#09090b" strokeWidth="1" />
          ) : (
            // Determined Grit Line
            <line x1="1" y1="-3" x2="5" y2="-4" stroke="#09090b" strokeWidth="1.2" strokeLinecap="round" />
          )}

          {/* Headband / Circlet / Eyewear */}
          {charId === 'valeria' && (
            <path d="M -8 -15 L 8 -15 L 6 -17 L -6 -17 Z" fill="#22d3ee" stroke="#0891b2" strokeWidth="1" />
          )}
          {charId === 'victor' && (
            <circle cx="4" cy="-11" r="3.2" fill="none" stroke="#fbbf24" strokeWidth="1.2" />
          )}
          {charId === 'steele' && (
            <path d="M -8 -16 L 8 -16 L 7 -18 L -7 -18 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
          )}

          {/* Iconic Anime Hairstyles */}
          <g transform={`rotate(${hairSway * 0.6}, 0, -18)`}>
            <path
              d="M -9 -14 C -12 -22 -6 -28 0 -28 C 8 -28 14 -20 12 -12 C 9 -14 6 -15 2 -14 C -2 -14 -6 -14 -9 -14 Z"
              fill={`url(#grad_hair_${entity.id})`}
              stroke="#09090b"
              strokeWidth="1.5"
            />
            {/* Spiky Forehead Bangs */}
            <path
              d="M -6 -17 L -2 -11 L 1 -16 L 5 -12 L 8 -16"
              fill={`url(#grad_hair_${entity.id})`}
              stroke="#09090b"
              strokeWidth="1.2"
            />
          </g>
        </g>

        {/* 8. FRONT ARM & WEAPON (Anchored at Shoulder: X=70, Y=rootY - 14) */}
        <g
          transform={`translate(70, ${rootY - 14}) rotate(${frontShoulderAngle})`}
          style={{ transformOrigin: '0px 0px' }}
        >
          {/* Front Bicep / Shoulder Armor */}
          <path
            d="M -4 0 C -5 6 -5 12 -4 18 L 4 18 C 5 12 5 6 4 0 Z"
            fill={`url(#grad_outfit_${entity.id})`}
            stroke="#09090b"
            strokeWidth="1.5"
          />

          {/* Front Forearm, Glove & Weapon (Anchored at Elbow: X=0, Y=16) */}
          <g
            transform={`translate(0, 16) rotate(${frontElbowAngle})`}
            style={{ transformOrigin: '0px 0px' }}
          >
            {/* Forearm */}
            <path
              d="M -4 0 L -4 14 L 4 14 L 4 0 Z"
              fill={`url(#grad_skin_${entity.id})`}
              stroke="#09090b"
              strokeWidth="1.5"
            />
            {/* Combat Glove / Bracer */}
            <rect x="-4.5" y="4" width="9" height="8" fill={pal.outfitPrimary} stroke="#09090b" strokeWidth="1.2" rx="1.5" />
            {/* Fist */}
            <circle cx="0" cy="18" r="5" fill={pal.skin} stroke="#09090b" strokeWidth="1.5" />

            {/* Signature Signature Weapon Overlay */}
            {charId === 'arjun' && (
              // Reinforced Industrial Steel Wrench
              <g transform="translate(0, 18) rotate(-35)">
                <rect x="-3" y="-34" width="6" height="38" fill="#71717a" stroke="#18181b" strokeWidth="1.4" rx="1" />
                <path d="M -7 -34 L -7 -46 L 7 -46 L 7 -34 L 3 -34 L 3 -40 L -3 -40 L -3 -34 Z" fill="#d97706" stroke="#18181b" strokeWidth="1.4" />
              </g>
            )}

            {charId === 'steele' && (
              // Military Anti-Armor Carbon Saber
              <g transform="translate(0, 18) rotate(-40)">
                <rect x="-2" y="-4" width="4" height="10" fill="#27272a" stroke="#09090b" strokeWidth="1" />
                <path d="M -2.5 -4 L -2.5 -48 L 2.5 -44 L 2.5 -4 Z" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.5" filter="drop-shadow(0 0 4px #38bdf8)" />
              </g>
            )}

            {charId === 'valeria' && (
              // Unit-0 Titanium Plasma Arm Blades
              <g transform="translate(0, 18) rotate(-25)">
                <path d="M -2 0 L 14 -36 L 4 -44 L -4 -8 Z" fill="#22d3ee" opacity="0.9" filter="drop-shadow(0 0 8px #06b6d4)" />
                <path d="M 0 0 L 10 -30 L 3 -36 L -2 -6 Z" fill="#ffffff" />
              </g>
            )}

            {charId === 'victor' && (
              // Quantum Gravity Singularity Gauntlet
              <g transform="translate(0, 18)">
                <circle cx="0" cy="0" r="10" fill="none" stroke="#fbbf24" strokeWidth="2" filter="drop-shadow(0 0 6px #eab308)" />
                <circle cx="0" cy="0" r="5" fill="#a855f7" opacity="0.85" />
              </g>
            )}

            {charId === 'elena' && (
              // Cryo Chemical Injector
              <g transform="translate(0, 18) rotate(-30)">
                <rect x="-3" y="-24" width="6" height="26" rx="2" fill="#06b6d4" stroke="#0284c7" strokeWidth="1.2" />
                <circle cx="0" cy="-26" r="3" fill="#ffffff" />
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};
