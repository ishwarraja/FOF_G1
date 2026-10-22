/**
 * Fate of Fighters (FOF) — Production 2.5D Sprite Engine & Frame-Accurate Animation Controller
 * Commercial 2.5D Arcade Standards (Guilty Gear -Strive- / Street Fighter 6 / King of Fighters XV)
 *
 * Core Responsibilities:
 * 1. Deterministic Action State Machine:
 *    - Looping states: IDLE, WALK_FORWARD, WALK_BACKWARD, CROUCH.
 *    - Combat states: LIGHT_PUNCH, HEAVY_PUNCH, LIGHT_KICK, HEAVY_KICK, SPECIAL_MOVE,
 *                    HURT_HIGH, HURT_LOW, KNOCKDOWN, KO, JUMP, BLOCK.
 * 2. Frame-Accurate Lifecycle:
 *    - Startup Frames -> Active Hitbox Frames -> Recovery Frames -> Auto-Revert to IDLE.
 *    - Playhead strictly resets to frame 0 upon action initiation.
 *    - Damage intake immediately interrupts startup/active frames and shifts to HURT.
 * 3. 2.5D Material & Rendering Rules:
 *    - depthWrite: true with polygonOffset enabled to permanently eliminate Z-fighting.
 *    - Dynamic renderOrder priority for active strikers.
 *    - Clean horizontal flipping (scale.x = -1 with material.side = THREE.DoubleSide).
 * 4. Ground Contact Shadow:
 *    - Clamped to floor plane (Y = 0) with radial opacity attenuation based on vertical altitude.
 */

import * as THREE from 'three';
import { FighterActionState, FightingEntity } from '../types/fighting';

export type ActionName =
  | 'IDLE'
  | 'WALK_FORWARD'
  | 'WALK_BACKWARD'
  | 'CROUCH'
  | 'JUMP'
  | 'BLOCK'
  | 'LIGHT_PUNCH'
  | 'HEAVY_PUNCH'
  | 'LIGHT_KICK'
  | 'HEAVY_KICK'
  | 'SPECIAL_MOVE'
  | 'HURT_HIGH'
  | 'HURT_LOW'
  | 'KNOCKDOWN'
  | 'KO'
  // Lowercase aliases for backward compatibility
  | 'idle'
  | 'walk_forward'
  | 'walk_backward'
  | 'crouch_idle'
  | 'jump'
  | 'block'
  | 'punch_light'
  | 'punch_heavy'
  | 'kick_light'
  | 'kick_heavy'
  | 'special_1'
  | 'special_2'
  | 'special_3'
  | 'hurt_high'
  | 'hurt_low'
  | 'knockdown'
  | 'ko';

export type FramePhase = 'startup' | 'active' | 'recovery';

export interface FrameHitbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameMetadata {
  frameIndex: number;
  phase: FramePhase;
  durationMs: number;
  isActive: boolean;
  hitbox: FrameHitbox | null;
  hurtbox: FrameHitbox;
}

export interface ActionConfig {
  actionName: ActionName;
  canonicalName: string;
  isLooping: boolean;
  frameCount: number;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  frameDurationMs: number;
  damage: number;
}

export const ACTION_DEFINITIONS: Record<string, ActionConfig> = {
  IDLE: {
    actionName: 'IDLE',
    canonicalName: 'IDLE',
    isLooping: true,
    frameCount: 6,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 0,
    frameDurationMs: 80,
    damage: 0,
  },
  WALK_FORWARD: {
    actionName: 'WALK_FORWARD',
    canonicalName: 'WALK_FORWARD',
    isLooping: true,
    frameCount: 6,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 0,
    frameDurationMs: 70,
    damage: 0,
  },
  WALK_BACKWARD: {
    actionName: 'WALK_BACKWARD',
    canonicalName: 'WALK_BACKWARD',
    isLooping: true,
    frameCount: 6,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 0,
    frameDurationMs: 75,
    damage: 0,
  },
  CROUCH: {
    actionName: 'CROUCH',
    canonicalName: 'CROUCH',
    isLooping: true,
    frameCount: 4,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 0,
    frameDurationMs: 90,
    damage: 0,
  },
  JUMP: {
    actionName: 'JUMP',
    canonicalName: 'JUMP',
    isLooping: false,
    frameCount: 6,
    startupFrames: 2,
    activeFrames: 2,
    recoveryFrames: 2,
    frameDurationMs: 65,
    damage: 0,
  },
  BLOCK: {
    actionName: 'BLOCK',
    canonicalName: 'BLOCK',
    isLooping: true,
    frameCount: 4,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 0,
    frameDurationMs: 80,
    damage: 0,
  },
  LIGHT_PUNCH: {
    actionName: 'LIGHT_PUNCH',
    canonicalName: 'LIGHT_PUNCH',
    isLooping: false,
    frameCount: 4,
    startupFrames: 1,
    activeFrames: 2,
    recoveryFrames: 1,
    frameDurationMs: 60,
    damage: 35,
  },
  HEAVY_PUNCH: {
    actionName: 'HEAVY_PUNCH',
    canonicalName: 'HEAVY_PUNCH',
    isLooping: false,
    frameCount: 6,
    startupFrames: 2,
    activeFrames: 2,
    recoveryFrames: 2,
    frameDurationMs: 75,
    damage: 85,
  },
  LIGHT_KICK: {
    actionName: 'LIGHT_KICK',
    canonicalName: 'LIGHT_KICK',
    isLooping: false,
    frameCount: 4,
    startupFrames: 1,
    activeFrames: 2,
    recoveryFrames: 1,
    frameDurationMs: 65,
    damage: 40,
  },
  HEAVY_KICK: {
    actionName: 'HEAVY_KICK',
    canonicalName: 'HEAVY_KICK',
    isLooping: false,
    frameCount: 6,
    startupFrames: 2,
    activeFrames: 2,
    recoveryFrames: 2,
    frameDurationMs: 80,
    damage: 95,
  },
  SPECIAL_MOVE: {
    actionName: 'SPECIAL_MOVE',
    canonicalName: 'SPECIAL_MOVE',
    isLooping: false,
    frameCount: 7,
    startupFrames: 2,
    activeFrames: 3,
    recoveryFrames: 2,
    frameDurationMs: 70,
    damage: 150,
  },
  HURT_HIGH: {
    actionName: 'HURT_HIGH',
    canonicalName: 'HURT_HIGH',
    isLooping: false,
    frameCount: 4,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 4,
    frameDurationMs: 75,
    damage: 0,
  },
  HURT_LOW: {
    actionName: 'HURT_LOW',
    canonicalName: 'HURT_LOW',
    isLooping: false,
    frameCount: 4,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 4,
    frameDurationMs: 75,
    damage: 0,
  },
  KNOCKDOWN: {
    actionName: 'KNOCKDOWN',
    canonicalName: 'KNOCKDOWN',
    isLooping: false,
    frameCount: 6,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 6,
    frameDurationMs: 90,
    damage: 0,
  },
  KO: {
    actionName: 'KO',
    canonicalName: 'KO',
    isLooping: false,
    frameCount: 5,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 5,
    frameDurationMs: 120,
    damage: 0,
  },
};

/**
 * Normalizes input action or engine state to canonical ActionName
 */
export function normalizeActionName(input: string): string {
  const upper = input.toUpperCase();
  switch (upper) {
    case 'IDLE':
    case 'VICTORY':
    case 'TAUNT':
      return 'IDLE';
    case 'WALK_FWD':
    case 'WALK_FORWARD':
    case 'DASH':
    case 'ROLL_FWD':
      return 'WALK_FORWARD';
    case 'WALK_BACK':
    case 'WALK_BACKWARD':
    case 'BACKDASH':
    case 'ROLL_BACK':
      return 'WALK_BACKWARD';
    case 'CROUCH':
    case 'CROUCH_IDLE':
      return 'CROUCH';
    case 'JUMP':
    case 'JUMP_NEUTRAL':
    case 'JUMP_FWD':
    case 'JUMP_BACK':
      return 'JUMP';
    case 'GUARD':
    case 'BLOCK':
      return 'BLOCK';
    case 'ATTACK_LP':
    case 'LIGHT_PUNCH':
    case 'PUNCH_LIGHT':
      return 'LIGHT_PUNCH';
    case 'ATTACK_HP':
    case 'HEAVY_PUNCH':
    case 'PUNCH_HEAVY':
      return 'HEAVY_PUNCH';
    case 'ATTACK_LK':
    case 'LIGHT_KICK':
    case 'KICK_LIGHT':
      return 'LIGHT_KICK';
    case 'ATTACK_HK':
    case 'HEAVY_KICK':
    case 'KICK_HEAVY':
    case 'BLOWBACK':
      return 'HEAVY_KICK';
    case 'SPECIAL_1':
    case 'SPECIAL_2':
    case 'SPECIAL_3':
    case 'SUPER':
    case 'CLIMAX':
    case 'SPECIAL_MOVE':
      return 'SPECIAL_MOVE';
    case 'HIT_LIGHT':
    case 'HURT_HIGH':
      return 'HURT_HIGH';
    case 'HIT_HEAVY':
    case 'HURT_LOW':
      return 'HURT_LOW';
    case 'KNOCKDOWN':
      return 'KNOCKDOWN';
    case 'DEFEAT':
    case 'KO':
      return 'KO';
    default:
      return 'IDLE';
  }
}

export function mapEntityStateToAction(state: FighterActionState): ActionName {
  return normalizeActionName(state) as ActionName;
}

/**
 * Resolves canonical action name to manifest actions / actionOffsets key
 */
export function resolveManifestActionKey(actionName: string): string {
  const lower = actionName.toLowerCase();
  const aliasMap: Record<string, string> = {
    light_punch: 'punch_light',
    heavy_punch: 'punch_heavy',
    light_kick: 'kick_light',
    heavy_kick: 'kick_heavy',
    crouch: 'crouch_idle',
    special_move: 'special_1',
    super: 'special_2',
    climax: 'special_3',
    walk_fwd: 'walk_forward',
    walk_back: 'walk_backward',
    guard: 'block',
    hit_light: 'hurt_high',
    hit_heavy: 'hurt_low',
  };
  return aliasMap[lower] || lower;
}

export class CharacterAnimationController {
  public characterId: string;
  public currentActionName: ActionName = 'IDLE';
  public currentFrameIndex: number = 0;
  public frameTimerMs: number = 0;
  public isActionComplete: boolean = false;
  public isHitboxActive: boolean = false;
  public currentPhase: FramePhase = 'startup';
  public debugMode: boolean = false;
  public isAttacking: boolean = false;

  // Three.js Render Mesh & Depth Configuration
  public mesh: THREE.Mesh;
  public material: THREE.MeshStandardMaterial;
  private spriteTexture: THREE.Texture | null = null;
  private filteringMode: 'nearest' | 'linear' = 'linear';

  // Grounding & Dimensions
  public spriteWidth: number = 2.45;
  public spriteHeight: number = 2.45;

  // Contact Shadow Decal anchored at floor plane (Y = 0)
  public shadowMesh: THREE.Mesh;
  public shadowBaseOpacity: number = 0.85;

  // Active Hitbox & Hurtbox Wireframes
  public hitboxWireframe: THREE.LineSegments | null = null;
  public hurtboxWireframe: THREE.LineSegments | null = null;

  // Actions Manifest and JSON Metadata
  public manifest: any = null;
  public isLoaded: boolean = false;

  // Fallback Offscreen Canvas
  private offscreenCanvas: any = null;
  private offscreenCtx: any = null;
  private canvasTexture: THREE.CanvasTexture | null = null;
  private cachedActionImages: Map<string, any> = new Map();

  constructor(
    characterId: string,
    filtering: 'nearest' | 'linear' = 'linear',
    debugMode: boolean = false
  ) {
    this.characterId = characterId;
    this.filteringMode = filtering;
    this.debugMode = debugMode;

    // Anchor geometry at feet ground plane (Y = 0)
    const geometry = new THREE.PlaneGeometry(this.spriteWidth, this.spriteHeight);
    geometry.translate(0, this.spriteHeight / 2, 0);

    // Layering & Transparency:
    // depthWrite: true + polygonOffset enabled permanently eliminates Z-fighting and mesh clipping
    this.material = new THREE.MeshStandardMaterial({
      transparent: true,
      alphaTest: 0.5,
      depthWrite: true,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
      side: THREE.DoubleSide,
      roughness: 0.42,
      metalness: 0.18,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.mesh.name = `Sprite25D_${characterId}`;

    // Contact shadow decal quad strictly anchored at floor plane Y = 0
    this.shadowMesh = this.createContactShadowMesh();

    // Setup debug hitbox & hurtbox visualizers
    this.setupHitboxVisualizers();

    // Initialize asset pipeline
    this.loadManifestAndAssets();
  }

  /**
   * Builds the contact shadow decal quad.
   * Anchored strictly at floor plane Y = 0.
   */
  private createContactShadowMesh(): THREE.Mesh {
    let texture: THREE.Texture;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 120);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
        gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.68)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.28)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(128, 128, 120, 0, Math.PI * 2);
        ctx.fill();
      }
      texture = new THREE.CanvasTexture(canvas);
    } else {
      texture = new THREE.Texture();
    }

    const geo = new THREE.PlaneGeometry(1.95, 0.8);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.shadowBaseOpacity,
      depthWrite: false,
    });

    const shadow = new THREE.Mesh(geo, mat);
    // Explicitly anchor at stage floor plane Y = 0
    shadow.position.set(0, 0, 0);
    shadow.renderOrder = 3;
    return shadow;
  }

  /**
   * Sets up hitbox and hurtbox visualizers for QA inspection
   */
  private setupHitboxVisualizers(): void {
    const boxGeo = new THREE.BoxGeometry(1, 1, 0.2);
    const edges = new THREE.EdgesGeometry(boxGeo);

    const hitMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
    this.hitboxWireframe = new THREE.LineSegments(edges, hitMat);
    this.hitboxWireframe.visible = false;
    this.hitboxWireframe.renderOrder = 50;
    this.mesh.add(this.hitboxWireframe);

    const hurtMat = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 1 });
    this.hurtboxWireframe = new THREE.LineSegments(edges.clone(), hurtMat);
    this.hurtboxWireframe.visible = false;
    this.hurtboxWireframe.renderOrder = 49;
    this.mesh.add(this.hurtboxWireframe);
  }

  /**
   * Loads actions.json manifest and compiles SpriteSheet texture
   */
  private async loadManifestAndAssets(): Promise<void> {
    if (typeof fetch === 'undefined') return;

    const jsonUrl = `/assets/characters/${this.characterId}/actions/actions.json`;
    try {
      const res = await fetch(jsonUrl);
      if (res.ok) {
        this.manifest = await res.json();
        if (this.manifest?.spriteSheet?.url) {
          const loader = new THREE.TextureLoader();
          loader.load(
            this.manifest.spriteSheet.url,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              this.applyFiltering(tex);
              this.spriteTexture = tex;
              this.material.map = tex;
              this.material.needsUpdate = true;
              this.isLoaded = true;
              this.applyCurrentFrameUV();
            },
            undefined,
            () => {
              this.initOffscreenFallback();
            }
          );
          return;
        }
      }
    } catch {
      // Manifest not found or non-browser environment
    }

    this.initOffscreenFallback();
  }

  private initOffscreenFallback(): void {
    if (typeof document === 'undefined') {
      this.isLoaded = true;
      return;
    }
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 192;
    this.offscreenCanvas.height = 192;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    this.canvasTexture = new THREE.CanvasTexture(this.offscreenCanvas);
    this.canvasTexture.colorSpace = THREE.SRGBColorSpace;
    this.applyFiltering(this.canvasTexture);
    this.material.map = this.canvasTexture;
    this.material.needsUpdate = true;
    this.isLoaded = true;
  }

  private applyFiltering(tex: THREE.Texture): void {
    if (this.filteringMode === 'nearest') {
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
    } else {
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
    }
  }

  /**
   * Plays an action state, resetting frame playhead strictly to 0
   */
  public playAction(actionName: ActionName | string, restartIfSame: boolean = false): void {
    const canonical = normalizeActionName(actionName) as ActionName;

    if (this.currentActionName === canonical && !restartIfSame) {
      return;
    }

    this.currentActionName = canonical;
    this.currentFrameIndex = 0;
    this.frameTimerMs = 0;
    this.isActionComplete = false;

    const cfg = ACTION_DEFINITIONS[canonical] || ACTION_DEFINITIONS.IDLE;
    this.isAttacking = cfg.activeFrames > 0;
    this.updatePhaseAndHitboxState();
    this.applyCurrentFrameUV();
    this.updateHitboxVisualization();
  }

  /**
   * Deterministic phase calculator: Startup -> Active -> Recovery -> Return to IDLE
   */
  private updatePhaseAndHitboxState(): void {
    const canonical = this.currentActionName;
    const resolvedKey = resolveManifestActionKey(canonical);
    const manifestAction = this.manifest?.actions?.[resolvedKey] || this.manifest?.actions?.[canonical.toLowerCase()];

    // Respect character-specific frame metadata from actions.json manifest when present
    if (manifestAction && manifestAction.frames && manifestAction.frames[this.currentFrameIndex]) {
      const frameData = manifestAction.frames[this.currentFrameIndex];
      this.currentPhase = (frameData.phase as FramePhase) || (frameData.isActive ? 'active' : (this.currentFrameIndex < (manifestAction.startupFrames || 1) ? 'startup' : 'recovery'));
      this.isHitboxActive = !!frameData.isActive;
      return;
    }

    const cfg = ACTION_DEFINITIONS[canonical] || ACTION_DEFINITIONS.IDLE;

    if (cfg.frameCount === 0 || !this.isAttacking) {
      this.currentPhase = 'startup';
      this.isHitboxActive = false;
      return;
    }

    const frame = this.currentFrameIndex;
    if (frame < cfg.startupFrames) {
      this.currentPhase = 'startup';
      this.isHitboxActive = false;
    } else if (frame < cfg.startupFrames + cfg.activeFrames) {
      this.currentPhase = 'active';
      this.isHitboxActive = true;
    } else {
      this.currentPhase = 'recovery';
      this.isHitboxActive = false;
    }
  }

  /**
   * Damage intake immediately interrupts any active or startup attack and shifts to HURT
   */
  public takeDamage(isHeavy: boolean = false): void {
    const hurtAction: ActionName = isHeavy ? 'HURT_LOW' : 'HURT_HIGH';
    this.playAction(hurtAction, true);
    this.isHitboxActive = false;
    this.isAttacking = false;
  }

  /**
   * Advances the animation frame tick by elapsed seconds
   */
  public update(deltaSeconds: number): void {
    const deltaMs = deltaSeconds * 1000;
    this.frameTimerMs += deltaMs;

    const cfg = ACTION_DEFINITIONS[this.currentActionName] || ACTION_DEFINITIONS.IDLE;
    const frameDurationMs = cfg.frameDurationMs || 75;

    if (this.frameTimerMs >= frameDurationMs) {
      this.frameTimerMs -= frameDurationMs;

      if (this.currentFrameIndex + 1 < cfg.frameCount) {
        this.currentFrameIndex++;
        this.updatePhaseAndHitboxState();
        this.applyCurrentFrameUV();
        this.updateHitboxVisualization();
      } else {
        if (cfg.isLooping) {
          this.currentFrameIndex = 0;
          this.updatePhaseAndHitboxState();
          this.applyCurrentFrameUV();
          this.updateHitboxVisualization();
        } else {
          // Attack or one-shot action completed: auto-revert to IDLE
          this.isActionComplete = true;
          this.isAttacking = false;
          this.isHitboxActive = false;
          this.playAction('IDLE');
        }
      }
    }
  }

  /**
   * Synchronizes controller with active fighting entity state and updates grounded shadow
   */
  public syncWithEntity(
    entity: FightingEntity,
    deltaSeconds: number,
    isHitstun: boolean,
    debugMode: boolean = false
  ): void {
    this.debugMode = debugMode;

    if (isHitstun || entity.state.startsWith('HIT_')) {
      const isHeavy = entity.state === 'HIT_HEAVY';
      this.takeDamage(isHeavy);
    } else {
      const mapped = mapEntityStateToAction(entity.state);
      this.playAction(mapped);
    }

    // Clean Horizontal Facing Flip (scale.x = -1 with DoubleSide) without inverting normals
    this.mesh.scale.x = entity.facing === 1 ? 1 : -1;

    // Strict Ground Contact Shadow Anchoring:
    // Shadow decal position Y remains strictly clamped to floor plane (Y = 0)
    this.shadowMesh.position.set(this.mesh.position.x, 0, this.mesh.position.z);

    // Opacity scales inversely with character jump altitude
    const altitude = Math.max(0, entity.y);
    const maxJumpHeight = 250;
    const altitudeRatio = Math.min(1.0, altitude / maxJumpHeight);
    const currentOpacity = this.shadowBaseOpacity * Math.max(0.18, 1.0 - altitudeRatio * 0.75);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = currentOpacity;

    const shadowScale = Math.max(0.45, 1.0 - altitudeRatio * 0.45);
    this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);

    // Cel-flash hit reaction
    if (isHitstun || entity.state.startsWith('HIT_')) {
      this.material.emissive.setHex(0xffffff);
      this.material.emissiveIntensity = 0.85;
      this.mesh.position.x = (Math.random() - 0.5) * 0.08;
    } else {
      this.material.emissive.setHex(0x000000);
      this.material.emissiveIntensity = 0;
      this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, 0, 0.3);
    }

    this.update(deltaSeconds);
  }

  /**
   * Updates UV texture offset & repeat for current frame
   */
  private applyCurrentFrameUV(): void {
    if (!this.spriteTexture || !this.manifest?.spriteSheet) {
      return;
    }

    const sheet = this.manifest.spriteSheet;
    const resolvedKey = resolveManifestActionKey(this.currentActionName);
    const lowerKey = this.currentActionName.toLowerCase();
    const offsetInfo =
      sheet.actionOffsets[resolvedKey] ||
      sheet.actionOffsets[lowerKey] ||
      sheet.actionOffsets[this.currentActionName];
    if (!offsetInfo) return;

    const sheetIdx = (offsetInfo.startSheetIndex ?? 0) + this.currentFrameIndex;
    const cols = sheet.cols || 16;
    const rows = sheet.rows || 1;

    const col = sheetIdx % cols;
    const row = Math.floor(sheetIdx / cols);

    const uWidth = 1 / cols;
    const vHeight = 1 / rows;

    this.spriteTexture.repeat.set(uWidth, vHeight);
    this.spriteTexture.offset.set(col * uWidth, 1 - (row + 1) * vHeight);
  }

  private updateHitboxVisualization(): void {
    if (!this.debugMode) {
      if (this.hitboxWireframe) this.hitboxWireframe.visible = false;
      if (this.hurtboxWireframe) this.hurtboxWireframe.visible = false;
      return;
    }

    if (this.hitboxWireframe) {
      this.hitboxWireframe.visible = this.isHitboxActive;
      if (this.isHitboxActive) {
        const hb = this.getActiveHitbox();
        if (hb) {
          const w = (hb.w / 192) * 2.5;
          const h = (hb.h / 192) * 2.5;
          const posX = ((hb.x - 96 + hb.w / 2) / 192) * 2.5;
          const posY = ((168 - hb.y) / 192) * 2.5;
          this.hitboxWireframe.scale.set(Math.max(0.4, w), Math.max(0.3, h), 0.2);
          this.hitboxWireframe.position.set(posX, posY, 0.05);
        } else {
          this.hitboxWireframe.scale.set(1.2, 0.6, 0.2);
          this.hitboxWireframe.position.set(0.65, 1.4, 0.05);
        }
      }
    }

    if (this.hurtboxWireframe) {
      this.hurtboxWireframe.visible = true;
      this.hurtboxWireframe.scale.set(0.9, 1.8, 0.2);
      this.hurtboxWireframe.position.set(0, 1.0, 0.04);
    }
  }

  public getActiveHitbox(): FrameHitbox | null {
    if (!this.isHitboxActive) return null;
    const resolvedKey = resolveManifestActionKey(this.currentActionName);
    const manifestAction = this.manifest?.actions?.[resolvedKey] || this.manifest?.actions?.[this.currentActionName.toLowerCase()];
    if (manifestAction?.frames?.[this.currentFrameIndex]?.hitbox) {
      return manifestAction.frames[this.currentFrameIndex].hitbox;
    }
    return { x: 60, y: 75, w: 70, h: 40 };
  }

  public getCurrentHurtbox(): FrameHitbox {
    const resolvedKey = resolveManifestActionKey(this.currentActionName);
    const manifestAction = this.manifest?.actions?.[resolvedKey] || this.manifest?.actions?.[this.currentActionName.toLowerCase()];
    if (manifestAction?.frames?.[this.currentFrameIndex]?.hurtbox) {
      return manifestAction.frames[this.currentFrameIndex].hurtbox;
    }
    return { x: 30, y: 20, w: 50, h: 140 };
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    if (this.spriteTexture) this.spriteTexture.dispose();
    if (this.canvasTexture) this.canvasTexture.dispose();
    this.shadowMesh.geometry.dispose();
    (this.shadowMesh.material as THREE.Material).dispose();
    if (this.hitboxWireframe) {
      this.hitboxWireframe.geometry.dispose();
      (this.hitboxWireframe.material as THREE.Material).dispose();
    }
    if (this.hurtboxWireframe) {
      this.hurtboxWireframe.geometry.dispose();
      (this.hurtboxWireframe.material as THREE.Material).dispose();
    }
  }
}
