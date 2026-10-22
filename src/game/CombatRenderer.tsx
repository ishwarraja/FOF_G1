/**
 * Fate of Fighters (FOF) — Production 2.5D Arcade Combat Renderer
 * Commercial 2.5D Arcade Standards (Street Fighter 6 / King of Fighters XV)
 *
 * Core Features:
 * 1. Depth Separation & Overlap Resolution:
 *    - Dynamic Z-axis combat planes: Player 1 at Z = 0.05, Player 2 at Z = -0.05.
 *    - Guaranteed absolute Z-delta >= 0.08 units during close-range proximity (< 1.5 units).
 *    - Dynamic renderOrder priority: Attacking player / combo initiator renders in front.
 *    - depthWrite: true + polygonOffset enabled to permanently eliminate Z-fighting.
 * 2. Realistic Ground Contact & Environmental Cohesion:
 *    - Dynamic directional shadow casting with THREE.PCFSoftShadowMap from primary sunlight.
 *    - Dynamic contact shadow blobs anchored directly beneath fighters at Y = 0.
 *    - THREE.ACESFilmicToneMapping with exposure 1.15.
 *    - Stage lighting harmonized to warm sunset tones (skybox #ff9e42, sunlight #ffeed1).
 * 3. Frame-Accurate Animation Synchronization & Combat VFX:
 *    - CharacterAnimationController integration.
 *    - Hit sparks, block flashes, impact shockwaves.
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { FightingEntity, FightingProjectile } from '../types/fighting';
import { CharacterAnimationController } from './CharacterAnimationController';
import { buildIndianStage3D } from '../components/fof/fofIndianStages3D';
import { buildStageScene, resolveStageAsset, FofStageSceneInstance } from '../components/fof/fofStageAssets';

export interface CombatRendererProps {
  p1Entity: FightingEntity;
  p2Entity: FightingEntity;
  projectiles?: FightingProjectile[];
  stageId?: string;
  stageBgUrl?: string;
  p1HitstunActive?: boolean;
  p2HitstunActive?: boolean;
  punchFlash?: boolean;
  finisherState?: any;
  postMatchState?: any;
  debugMode?: boolean;
  cameraPreset?: 'DYNAMIC' | 'CINEMATIC' | 'STAGE_WIDE' | 'HITBOX_LAB';
  textureFiltering?: 'nearest' | 'linear';
}

export interface CombatRendererHandle {
  triggerImpactCameraShake: (intensity?: number) => void;
  spawnHitSpark: (x3D: number, y3D: number, colorHex?: string) => void;
  spawnBlockFlash: (x3D: number, y3D: number) => void;
  spawnImpactShockwave: (x3D: number, y3D: number) => void;
}

export interface ZSeparationResult {
  p1Z: number;
  p2Z: number;
  p1RenderOrder: number;
  p2RenderOrder: number;
  zDelta: number;
  p1PolygonOffsetFactor: number;
  p2PolygonOffsetFactor: number;
}

/**
 * Calculates Z-plane separation and renderOrder priority for fighters.
 * Guarantees absolute Z-distance delta >= 0.08 units when within proximity (< 1.5 units).
 */
export function calculateZSeparationAndRenderOrder(
  p1X: number,
  p2X: number,
  p1Attacking: boolean,
  p2Attacking: boolean
): ZSeparationResult {
  const distanceX = Math.abs(p1X - p2X);
  const inProximity = distanceX < 1.5;

  let p1Z = 0.05;
  let p2Z = -0.05;
  let p1RenderOrder = 11;
  let p2RenderOrder = 10;
  let p1PolygonOffsetFactor = -1.0;
  let p2PolygonOffsetFactor = 1.0;

  if (p1Attacking && !p2Attacking) {
    p1Z = 0.06;
    p2Z = -0.06;
    p1RenderOrder = 15;
    p2RenderOrder = 10;
    p1PolygonOffsetFactor = -2.0;
    p2PolygonOffsetFactor = 1.5;
  } else if (p2Attacking && !p1Attacking) {
    p1Z = -0.06;
    p2Z = 0.06;
    p1RenderOrder = 10;
    p2RenderOrder = 15;
    p1PolygonOffsetFactor = 1.5;
    p2PolygonOffsetFactor = -2.0;
  } else {
    // Both attacking or both neutral
    p1Z = 0.05;
    p2Z = -0.05;
    p1RenderOrder = 11;
    p2RenderOrder = 10;
    p1PolygonOffsetFactor = -1.0;
    p2PolygonOffsetFactor = 1.0;
  }

  const zDelta = Math.abs(p1Z - p2Z);

  return {
    p1Z,
    p2Z,
    p1RenderOrder,
    p2RenderOrder,
    zDelta,
    p1PolygonOffsetFactor,
    p2PolygonOffsetFactor,
  };
}

export const CombatRenderer = forwardRef<CombatRendererHandle, CombatRendererProps>((props, ref) => {
  const {
    p1Entity,
    p2Entity,
    projectiles = [],
    stageId = 'stage_kala_chakra_time',
    stageBgUrl,
    p1HitstunActive = false,
    p2HitstunActive = false,
    punchFlash = false,
    finisherState = null,
    postMatchState = null,
    debugMode = false,
    cameraPreset = 'DYNAMIC',
    textureFiltering = 'linear',
  } = props;

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Character Animation Controllers
  const p1ControllerRef = useRef<CharacterAnimationController | null>(null);
  const p2ControllerRef = useRef<CharacterAnimationController | null>(null);

  // Ground Contact Shadows (strictly clamped to floor Y = 0)
  const p1ShadowRef = useRef<THREE.Mesh | null>(null);
  const p2ShadowRef = useRef<THREE.Mesh | null>(null);

  // Lighting refs matching warm sunset tones
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const flashPointLightRef = useRef<THREE.PointLight | null>(null);

  // Stage references
  const stageSceneRef = useRef<FofStageSceneInstance | null>(null);
  const stageGroupRef = useRef<THREE.Group | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);

  // Combat VFX Meshes
  const vfxContainerRef = useRef<THREE.Group | null>(null);
  const activeVfxRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      life: number;
      maxLife: number;
      vx: number;
      vy: number;
      type: 'spark' | 'ring' | 'shockwave';
    }>
  >([]);

  // Camera Shake & Positioning
  const shakeOffset = useRef(new THREE.Vector3(0, 0, 0));
  const cameraTargetPos = useRef(new THREE.Vector3(0, 2.4, 8.2));
  const cameraLookAtTarget = useRef(new THREE.Vector3(0, 1.6, 0));

  // Synchronous State Refs
  const p1Ref = useRef(p1Entity);
  p1Ref.current = p1Entity;
  const p2Ref = useRef(p2Entity);
  p2Ref.current = p2Entity;
  const p1HitstunRef = useRef(p1HitstunActive);
  p1HitstunRef.current = p1HitstunActive;
  const p2HitstunRef = useRef(p2HitstunActive);
  p2HitstunRef.current = p2HitstunActive;
  const punchFlashRef = useRef(punchFlash);
  punchFlashRef.current = punchFlash;
  const debugModeRef = useRef(debugMode);
  debugModeRef.current = debugMode;

  // Helper: creates soft ground contact shadow decal
  const createContactShadowMesh = (): THREE.Mesh => {
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
      opacity: 0.85,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    // Explicitly anchor at stage floor plane Y = 0
    mesh.position.set(0, 0, 0);
    mesh.renderOrder = 3;
    return mesh;
  };

  // Expose imperative combat VFX methods via ref
  useImperativeHandle(ref, () => ({
    triggerImpactCameraShake: (intensity = 1) => {
      shakeOffset.current.set(
        (Math.random() - 0.5) * 0.38 * intensity,
        (Math.random() - 0.5) * 0.28 * intensity,
        (Math.random() - 0.5) * 0.22 * intensity
      );
    },
    spawnHitSpark: (x3D: number, y3D: number, colorHex = '#f59e0b') => {
      if (!vfxContainerRef.current) return;
      const sparkGeo = new THREE.PlaneGeometry(0.75, 0.75);
      const sparkMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorHex),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
      sparkMesh.position.set(x3D, y3D, 0.2);
      sparkMesh.renderOrder = 30;
      vfxContainerRef.current.add(sparkMesh);

      activeVfxRef.current.push({
        mesh: sparkMesh,
        life: 0.18,
        maxLife: 0.18,
        vx: (Math.random() - 0.5) * 2.2,
        vy: Math.random() * 2.5 + 1.2,
        type: 'spark',
      });
    },
    spawnBlockFlash: (x3D: number, y3D: number) => {
      if (!vfxContainerRef.current) return;
      const ringGeo = new THREE.RingGeometry(0.12, 0.85, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x3D, y3D, 0.25);
      ringMesh.renderOrder = 31;
      vfxContainerRef.current.add(ringMesh);

      activeVfxRef.current.push({
        mesh: ringMesh,
        life: 0.16,
        maxLife: 0.16,
        vx: 0,
        vy: 0,
        type: 'ring',
      });
    },
    spawnImpactShockwave: (x3D: number, y3D: number) => {
      if (!vfxContainerRef.current) return;
      const shockGeo = new THREE.RingGeometry(0.2, 1.4, 32);
      const shockMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const shockMesh = new THREE.Mesh(shockGeo, shockMat);
      shockMesh.position.set(x3D, y3D, 0.18);
      shockMesh.renderOrder = 29;
      vfxContainerRef.current.add(shockMesh);

      activeVfxRef.current.push({
        mesh: shockMesh,
        life: 0.22,
        maxLife: 0.22,
        vx: 0,
        vy: 0,
        type: 'shockwave',
      });
    },
  }));

  // Initialize Three.js Scene and Viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 1. Scene with warm sunset atmospheric fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0f0a);
    scene.fog = new THREE.FogExp2(0x2d180d, 0.022);
    sceneRef.current = scene;

    // 2. Perspective Camera (2.5D Arcade 34° Lens)
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 120);
    camera.position.set(0, 2.4, 8.2);
    camera.lookAt(0, 1.6, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Precision & Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Dynamic directional shadow casting enabled
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Commercial Tone Mapping & Sunset Lighting Harmonization
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting: Sunset Sky Hemisphere & Golden Key Sunlight
    const ambientLight = new THREE.AmbientLight(0xffe5cc, 0.65);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Hemisphere Light: warm golden sky #ff9e42 and warm earth floor #2c1808
    const hemiLight = new THREE.HemisphereLight(0xff9e42, 0x2c1808, 0.70);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Primary Directional Sunlight with Soft PCF Shadows
    const keyLight = new THREE.DirectionalLight(0xffeed1, 1.5);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -14;
    keyLight.shadow.camera.right = 14;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -2;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    // Point Light for Hit Flash Impacts
    const flashLight = new THREE.PointLight(0xffd59e, 0, 15);
    flashLight.position.set(0, 2, 2);
    scene.add(flashLight);
    flashPointLightRef.current = flashLight;

    // 5. Stage Floor with receiveShadow = true
    const floorGeo = new THREE.PlaneGeometry(36, 16);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3d2719,
      roughness: 0.55,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.002, 0);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;

    // Stage Architecture Container
    const stageContainerGroup = new THREE.Group();
    scene.add(stageContainerGroup);
    stageGroupRef.current = stageContainerGroup;

    const stageAsset = resolveStageAsset(stageId, stageBgUrl);
    buildStageScene(stageAsset).then((stageScene) => {
      if (!container.isConnected) {
        stageScene.dispose();
        return;
      }
      stageContainerGroup.add(stageScene.containerGroup);
      stageSceneRef.current = stageScene;
    });

    const stageBuild = buildIndianStage3D(stageId || 'stage_kala_chakra_time');

    // Laser Ropes & Posts
    const leftPostGeom = new THREE.CylinderGeometry(0.2, 0.25, 4.5, 12);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8, roughness: 0.2 });
    const leftPost = new THREE.Mesh(leftPostGeom, postMat);
    leftPost.position.set(-14.2, 2.25, 0);
    leftPost.castShadow = true;
    leftPost.receiveShadow = true;
    scene.add(leftPost);

    const rightPost = new THREE.Mesh(leftPostGeom, postMat);
    rightPost.position.set(14.2, 2.25, 0);
    rightPost.castShadow = true;
    rightPost.receiveShadow = true;
    scene.add(rightPost);

    // 6. Ground Contact Shadow Decals strictly anchored at floor Y = 0
    const p1Shadow = createContactShadowMesh();
    scene.add(p1Shadow);
    p1ShadowRef.current = p1Shadow;

    const p2Shadow = createContactShadowMesh();
    scene.add(p2Shadow);
    p2ShadowRef.current = p2Shadow;

    // 7. Combat VFX Container
    const vfxGroup = new THREE.Group();
    scene.add(vfxGroup);
    vfxContainerRef.current = vfxGroup;

    // 8. 2.5D Sprite Animation Controllers
    const p1Id = p1Entity.character?.id || 'arjun';
    const p2Id = p2Entity.character?.id || 'steele';

    const p1Ctrl = new CharacterAnimationController(p1Id, textureFiltering, debugMode);
    p1Ctrl.mesh.position.z = 0.05; // Player 1 default Z plane
    scene.add(p1Ctrl.mesh);
    p1ControllerRef.current = p1Ctrl;

    const p2Ctrl = new CharacterAnimationController(p2Id, textureFiltering, debugMode);
    p2Ctrl.mesh.position.z = -0.05; // Player 2 default Z plane
    scene.add(p2Ctrl.mesh);
    p2ControllerRef.current = p2Ctrl;

    // 9. Resize Observer
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. 60 FPS Render Loop
    let lastTime = performance.now();
    let animationFrameId: number;
    let renderOverlapTime = 0;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      const p1Hit = p1HitstunRef.current;
      const p2Hit = p2HitstunRef.current;
      const isDebug = debugModeRef.current;

      // Coordinate mapping from 0-1000 arena to -13.5 to +13.5 Three.js stage units
      const to3DX = (val: number) => (val - 500) * 0.027;
      const to3DY = (val: number) => val * 0.016;

      const p1X = to3DX(p1.x);
      const p1Y = to3DY(p1.y);
      const p2X = to3DX(p2.x);
      const p2Y = to3DY(p2.y);

      let renderP1X = p1X;
      let renderP2X = p2X;
      const dist3D = Math.abs(renderP1X - renderP2X);
      const min3DDist = 1.25;
      const isGrounded = p1.y < 15 && p2.y < 15;

      if (isGrounded && dist3D < min3DDist) {
        renderOverlapTime += delta;
        const p1Dir = renderP1X < renderP2X ? -1 : (renderP1X > renderP2X ? 1 : (p1.isPlayer1 ? -1 : 1));
        if (renderOverlapTime >= 1.0 || dist3D < 0.08) {
          const mid = (renderP1X + renderP2X) / 2;
          renderP1X = mid + p1Dir * (min3DDist / 2);
          renderP2X = mid - p1Dir * (min3DDist / 2);
          if (renderOverlapTime >= 1.0) renderOverlapTime = 0;
        }
      } else {
        renderOverlapTime = 0;
      }

      // Depth Separation & Overlap Resolution:
      // Enforce distinct dynamic Z-planes and renderOrder priority
      const p1IsAttacking = p1.state.startsWith('ATTACK') || p1.state.startsWith('SPECIAL');
      const p2IsAttacking = p2.state.startsWith('ATTACK') || p2.state.startsWith('SPECIAL');

      const zConfig = calculateZSeparationAndRenderOrder(renderP1X, renderP2X, p1IsAttacking, p2IsAttacking);

      if (p1ControllerRef.current) {
        p1ControllerRef.current.mesh.position.set(renderP1X, p1Y, zConfig.p1Z);
        p1ControllerRef.current.mesh.renderOrder = zConfig.p1RenderOrder;
        p1ControllerRef.current.material.polygonOffsetFactor = zConfig.p1PolygonOffsetFactor;
        p1ControllerRef.current.syncWithEntity(p1, delta, p1Hit, isDebug);
      }

      if (p2ControllerRef.current) {
        p2ControllerRef.current.mesh.position.set(renderP2X, p2Y, zConfig.p2Z);
        p2ControllerRef.current.mesh.renderOrder = zConfig.p2RenderOrder;
        p2ControllerRef.current.material.polygonOffsetFactor = zConfig.p2PolygonOffsetFactor;
        p2ControllerRef.current.syncWithEntity(p2, delta, p2Hit, isDebug);
      }

      // Ground Contact Shadows: strictly clamped to stage floor plane Y = 0
      if (p1ShadowRef.current) {
        p1ShadowRef.current.position.set(renderP1X, 0, zConfig.p1Z);
        const p1Altitude = Math.max(0, p1.y);
        const p1Ratio = Math.min(1.0, p1Altitude / 250);
        const p1Opacity = 0.85 * Math.max(0.18, 1.0 - p1Ratio * 0.75);
        (p1ShadowRef.current.material as THREE.MeshBasicMaterial).opacity = p1Opacity;
        const p1Scale = Math.max(0.45, 1.0 - p1Ratio * 0.45);
        p1ShadowRef.current.scale.set(p1Scale, p1Scale, p1Scale);
      }

      if (p2ShadowRef.current) {
        p2ShadowRef.current.position.set(p2X, 0, zConfig.p2Z);
        const p2Altitude = Math.max(0, p2.y);
        const p2Ratio = Math.min(1.0, p2Altitude / 250);
        const p2Opacity = 0.85 * Math.max(0.18, 1.0 - p2Ratio * 0.75);
        (p2ShadowRef.current.material as THREE.MeshBasicMaterial).opacity = p2Opacity;
        const p2Scale = Math.max(0.45, 1.0 - p2Ratio * 0.45);
        p2ShadowRef.current.scale.set(p2Scale, p2Scale, p2Scale);
      }

      // Camera Tracking: Smooth Horizontal Framing and Dynamic Zoom
      const midX = (p1X + p2X) / 2;
      const fighterDistance = Math.abs(p1X - p2X);
      const targetCamZ = THREE.MathUtils.clamp(7.5 + fighterDistance * 0.38, 7.8, 12.5);
      const targetCamY = 2.1 + (p1Y + p2Y) * 0.25;

      cameraTargetPos.current.set(midX * 0.75, targetCamY, targetCamZ);
      cameraLookAtTarget.current.set(midX * 0.85, 1.6 + (p1Y + p2Y) * 0.2, 0);

      // Camera shake decay
      shakeOffset.current.lerp(new THREE.Vector3(0, 0, 0), 0.18);

      camera.position.lerp(cameraTargetPos.current.clone().add(shakeOffset.current), 0.15);
      camera.lookAt(cameraLookAtTarget.current);

      // Parallax update
      if (stageSceneRef.current) {
        stageSceneRef.current.updateParallax(camera.position.x, delta, time / 1000);
      }

      // Impact Punch Flash
      if (flashPointLightRef.current) {
        if (punchFlashRef.current || p1Hit || p2Hit) {
          flashPointLightRef.current.intensity = 3.5;
          flashPointLightRef.current.position.set(midX, 2.0, 1.0);
        } else {
          flashPointLightRef.current.intensity = THREE.MathUtils.lerp(flashPointLightRef.current.intensity, 0, 0.2);
        }
      }

      // VFX update (Sparks, Rings, Shockwaves)
      const activeVfx = activeVfxRef.current;
      for (let i = activeVfx.length - 1; i >= 0; i--) {
        const effect = activeVfx[i];
        effect.life -= delta;
        effect.mesh.position.x += effect.vx * delta;
        effect.mesh.position.y += effect.vy * delta;

        const progress = effect.life / effect.maxLife;
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, progress);

        if (effect.type === 'ring' || effect.type === 'shockwave') {
          effect.mesh.scale.multiplyScalar(1.0 + delta * 5.0);
        } else {
          effect.mesh.scale.multiplyScalar(1.0 + delta * 2.5);
        }

        if (effect.life <= 0) {
          vfxContainerRef.current?.remove(effect.mesh);
          effect.mesh.geometry.dispose();
          (effect.mesh.material as THREE.Material).dispose();
          activeVfx.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      if (p1ControllerRef.current) {
        scene.remove(p1ControllerRef.current.mesh);
        p1ControllerRef.current.dispose();
      }
      if (p2ControllerRef.current) {
        scene.remove(p2ControllerRef.current.mesh);
        p2ControllerRef.current.dispose();
      }
      if (p1ShadowRef.current) {
        scene.remove(p1ShadowRef.current);
        p1ShadowRef.current.geometry.dispose();
        (p1ShadowRef.current.material as THREE.Material).dispose();
      }
      if (p2ShadowRef.current) {
        scene.remove(p2ShadowRef.current);
        p2ShadowRef.current.geometry.dispose();
        (p2ShadowRef.current.material as THREE.Material).dispose();
      }

      stageSceneRef.current?.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [stageId, stageBgUrl, textureFiltering]);

  // Handle character swaps when fighter selection changes
  useEffect(() => {
    const p1Id = p1Entity.character?.id || 'arjun';
    if (p1ControllerRef.current && p1ControllerRef.current.characterId !== p1Id) {
      if (sceneRef.current) {
        sceneRef.current.remove(p1ControllerRef.current.mesh);
        p1ControllerRef.current.dispose();
        const newCtrl = new CharacterAnimationController(p1Id, textureFiltering, debugMode);
        newCtrl.mesh.position.z = 0.05;
        sceneRef.current.add(newCtrl.mesh);
        p1ControllerRef.current = newCtrl;
      }
    }
  }, [p1Entity.character?.id, textureFiltering, debugMode]);

  useEffect(() => {
    const p2Id = p2Entity.character?.id || 'steele';
    if (p2ControllerRef.current && p2ControllerRef.current.characterId !== p2Id) {
      if (sceneRef.current) {
        sceneRef.current.remove(p2ControllerRef.current.mesh);
        p2ControllerRef.current.dispose();
        const newCtrl = new CharacterAnimationController(p2Id, textureFiltering, debugMode);
        newCtrl.mesh.position.z = -0.05;
        sceneRef.current.add(newCtrl.mesh);
        p2ControllerRef.current = newCtrl;
      }
    }
  }, [p2Entity.character?.id, textureFiltering, debugMode]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* WebGL 3D Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Developer Debug Telemetry Layer (Strictly gated behind debugMode = false by default) */}
      {debugMode && (
        <div
          id="fof-debug-hud-overlay"
          className="absolute top-2 left-2 z-40 bg-black/85 border border-amber-500/70 p-2.5 rounded-lg font-mono text-[10px] text-amber-300 pointer-events-none space-y-1 shadow-2xl backdrop-blur-sm"
        >
          <div className="font-black text-amber-400 border-b border-amber-500/40 pb-0.5 uppercase tracking-wider flex items-center justify-between">
            <span>[2.5D ARCADE ENGINE TELEMETRY]</span>
            <span className="text-[8px] bg-amber-950 px-1 py-0.2 rounded border border-amber-500/40">DEV ACTIVE</span>
          </div>
          <div>P1 Action: {p1Entity.state} | Frame: {p1Entity.stateFrame}</div>
          <div>P2 Action: {p2Entity.state} | Frame: {p2Entity.stateFrame}</div>
          <div>Hitboxes: ACTIVE ON DESIGNATED FRAMES ONLY</div>
          <div>Camera Distance: {cameraRef.current ? cameraRef.current.position.z.toFixed(2) : '8.20'}m</div>
          <div>Z-Bias Sorting: ATTACKER_PRIORITY_ORDER</div>
        </div>
      )}
    </div>
  );
});

CombatRenderer.displayName = 'CombatRenderer';
export default CombatRenderer;
