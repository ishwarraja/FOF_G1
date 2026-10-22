import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { FightingEntity, FightingProjectile } from '../../types/fighting';
import { ARENA_WIDTH } from '../../utils/fightingEngine';
import { buildIndianStage3D, AnimatedStageItem } from './fofIndianStages3D';
import { getStageVisual } from '../../data/stageBackgrounds';
import { FinisherVisualState } from './FofFinisherOverlay';
import { PostMatchVictoryVisualState } from './FofPostMatchVictoryOverlay';
import { createCheeringCrowd3D, CheeringCrowd3DSystem } from './fofCheeringCrowd3D';
import { characterLoader, Fighter3DRigInstance } from '../../utils/CharacterLoader';
import { resolveStageAsset, buildStageScene, FofStageSceneInstance } from './fofStageAssets';
import { calculateZSeparationAndRenderOrder } from '../../game/CombatRenderer';

export type CameraPreset = 'DYNAMIC' | 'CINEMATIC' | 'TOURNAMENT';

export interface FofStage25DViewProps {
  p1Entity: FightingEntity;
  p2Entity: FightingEntity;
  projectiles: FightingProjectile[];
  hitSparks: { id: string; x: number; y: number; text?: string; isCrit?: boolean; color: string }[];
  hitShockwaves: { id: string; x: number; y: number; isCrit?: boolean }[];
  punchFlash: { id: string; x: number; y: number; color: string; isCrit: boolean; isSuper: boolean } | null;
  superCutIn: { fighterName: string; moveName: string; color: string; cutInUrl?: string; avatarUrl?: string } | null;
  finisherState?: FinisherVisualState | null;
  postMatchState?: PostMatchVictoryVisualState | null;
  screenShake: boolean;
  stageId?: string;
  stageBg?: string;
  stageBgUrl?: string;
  cameraPreset?: CameraPreset;
  p1HitstunActive?: boolean;
  p2HitstunActive?: boolean;
  debugMode?: boolean;
}

export interface FofStage25DViewHandle {
  triggerImpactCameraShake: (intensity?: number) => void;
}

// 2D to 3D coordinate converter
// In SF6 style, fighters have a massive presence (occupying 55-65% screen height)
const WORLD_SCALE = 0.013;
const GROUND_Y = 0; // 3D ground level
const ARENA_HALF_WIDTH_3D = (ARENA_WIDTH / 2) * WORLD_SCALE;

function to3DX(x2d: number): number {
  return (x2d - ARENA_WIDTH / 2) * WORLD_SCALE;
}

function to3DY(y2d: number): number {
  return GROUND_Y + y2d * WORLD_SCALE;
}

// Procedural texture for the weathered ancient stone paver arena floor (Street Fighter 6 aesthetic)
function createStonePaverTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Base stone foundation
    ctx.fillStyle = '#26231f';
    ctx.fillRect(0, 0, 1024, 1024);

    const cols = 8;
    const rows = 16;
    const tileW = 1024 / cols;
    const tileH = 1024 / rows;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 0) ? 0 : tileW * 0.5;
      for (let c = -1; c <= cols; c++) {
        const x = c * tileW + offsetX;
        const y = r * tileH;

        // Varied ancient stone paver slab tones (warm greys and earthy tints)
        const seed = Math.sin(c * 19.3 + r * 41.7);
        const brightness = 44 + Math.floor(seed * 14);
        ctx.fillStyle = `rgb(${brightness + 8}, ${brightness + 4}, ${brightness})`;
        ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);

        // Weathered stone bevel highlights
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + 2, y + 2, tileW - 4, 3);
        ctx.fillRect(x + 2, y + 2, 3, tileH - 4);

        // Weathered edge grit
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 2, y + tileH - 5, tileW - 4, 3);
        ctx.fillRect(x + tileW - 5, y + 2, 3, tileH - 4);

        // Stone texture grain
        for (let i = 0; i < 12; i++) {
          const gx = x + 4 + Math.random() * (tileW - 8);
          const gy = y + 4 + Math.random() * (tileH - 8);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.18)';
          ctx.fillRect(gx, gy, 2, 2);
        }

        // Deep mortar grooves
        ctx.strokeStyle = '#120f0d';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1, y + 1, tileW - 2, tileH - 2);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

// High-fidelity 3D fighter humanoid rig is now generated via buildFighter3DRig in ./fofFighter3DModel

export const FofStage25DView = forwardRef<FofStage25DViewHandle, FofStage25DViewProps>(
  (
    {
      p1Entity,
      p2Entity,
      projectiles,
      hitSparks,
      hitShockwaves,
      punchFlash,
      superCutIn,
      finisherState,
      postMatchState,
      screenShake,
      stageId = 'stage_kala_chakra_time',
      stageBgUrl,
      cameraPreset = 'DYNAMIC',
      p1HitstunActive = false,
      p2HitstunActive = false,
      debugMode = false,
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);

    // Three.js internal references
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const p1RigRef = useRef<Fighter3DRigInstance | null>(null);
    const p2RigRef = useRef<Fighter3DRigInstance | null>(null);
    const p1LoadingRef = useRef<boolean>(false);
    const p2LoadingRef = useRef<boolean>(false);

    // Stage Background Backdrop Ref
    const backdropMeshRef = useRef<THREE.Mesh | null>(null);
    const stageSceneRef = useRef<FofStageSceneInstance | null>(null);

    // Lighting refs
    const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
    const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
    const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
    const stadiumLightLeftRef = useRef<THREE.SpotLight | null>(null);
    const stadiumLightRightRef = useRef<THREE.SpotLight | null>(null);
    const flashPointLightRef = useRef<THREE.PointLight | null>(null);

    // Stage Environment refs
    const stageGroupRef = useRef<THREE.Group | null>(null);
    const animatedStageItemsRef = useRef<AnimatedStageItem[]>([]);
    const crowdSystemRef = useRef<CheeringCrowd3DSystem | null>(null);

    // Particle & Projectile tracking
    const projectileMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; light: THREE.PointLight }>>(new Map());
    const sparkMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
    const shockwaveMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

    // Synchronous state refs ensuring 60 FPS render loop always receives fresh frame data
    const p1EntityRef = useRef(p1Entity);
    p1EntityRef.current = p1Entity;
    const p2EntityRef = useRef(p2Entity);
    p2EntityRef.current = p2Entity;
    const p1HitstunRef = useRef(p1HitstunActive);
    p1HitstunRef.current = p1HitstunActive;
    const p2HitstunRef = useRef(p2HitstunActive);
    p2HitstunRef.current = p2HitstunActive;
    const finisherStateRef = useRef(finisherState);
    finisherStateRef.current = finisherState;
    const punchFlashRef = useRef(punchFlash);
    punchFlashRef.current = punchFlash;
    const postMatchStateRef = useRef(postMatchState);
    postMatchStateRef.current = postMatchState;
    // Overlap watchdog ref preventing 3D fighters from remaining on identical axis > 1.0s
    const renderOverlapTimerRef = useRef<number>(0);

    // Camera animation target values for smooth lerp
    const cameraTargetPos = useRef(new THREE.Vector3(0, 3.2, 10.5));
    const cameraLookAtTarget = useRef(new THREE.Vector3(0, 1.6, 0));
    const shakeOffset = useRef(new THREE.Vector3(0, 0, 0));

    // Expose camera shake via ref
    useImperativeHandle(ref, () => ({
      triggerImpactCameraShake: (intensity = 1) => {
        shakeOffset.current.set(
          (Math.random() - 0.5) * 0.4 * intensity,
          (Math.random() - 0.5) * 0.3 * intensity,
          (Math.random() - 0.5) * 0.25 * intensity
        );
      },
    }));

    // Initialize Three.js Scene, Camera, Lights, and 3D Arena Stage
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 560;

      // 1. Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050508);
      scene.fog = new THREE.FogExp2(0x080914, 0.025);
      sceneRef.current = scene;

      // 2. Perspective Camera (2.5D Viewpoint with SF6 34° lens)
      const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 120);
      camera.position.set(0, 2.4, 8.2);
      camera.lookAt(0, 1.6, 0);
      cameraRef.current = camera;

      // 3. WebGL Renderer with High Precision & Shadows
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. Unified Lighting: Environmental Ambient Light & Hemisphere Light matching stage tones
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      scene.add(ambientLight);
      ambientLightRef.current = ambientLight;

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);
      hemiLightRef.current = hemiLight;

      // Key Sunlight with soft PCFSoftShadowMap
      const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.4);
      keyLight.position.set(5, 14, 8);
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

      // Left Stadium Moving Spotlight (Cyber Blue / Solar Amber)
      const spotLeft = new THREE.SpotLight(0x06b6d4, 3.5, 30, Math.PI / 4.5, 0.4, 1.2);
      spotLeft.position.set(-10, 12, -4);
      spotLeft.target.position.set(-3, 0, 0);
      scene.add(spotLeft);
      scene.add(spotLeft.target);
      stadiumLightLeftRef.current = spotLeft;

      // Right Stadium Moving Spotlight (Fiery Amber / Vermillion)
      const spotRight = new THREE.SpotLight(0xf59e0b, 3.5, 30, Math.PI / 4.5, 0.4, 1.2);
      spotRight.position.set(10, 12, -4);
      spotRight.target.position.set(3, 0, 0);
      scene.add(spotRight);
      scene.add(spotRight.target);
      stadiumLightRightRef.current = spotRight;

      // Dual High-Intensity Rim / Edge Silhouette Lights (Street Fighter 6 3D Depth)
      const rimLightLeft = new THREE.DirectionalLight(0x38bdf8, 2.8);
      rimLightLeft.position.set(-10, 8, -6);
      scene.add(rimLightLeft);

      const rimLightRight = new THREE.DirectionalLight(0xf59e0b, 3.2);
      rimLightRight.position.set(10, 8, -6);
      scene.add(rimLightRight);

      // Dynamic Flash Point Light for Punch Impacts & Super Flashes
      const flashLight = new THREE.PointLight(0xffffff, 0, 15);
      flashLight.position.set(0, 2, 2);
      scene.add(flashLight);
      flashPointLightRef.current = flashLight;

      // 5. Build 3D Arena Environment (Production Multi-Layer Stage Architecture with Parallax)
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

        // Apply initial stage lighting & crystal clear atmosphere
        scene.background = new THREE.Color(stageScene.lighting.bgColor);
        scene.fog = new THREE.Fog(stageScene.lighting.fogColor || 0x050811, 26, 75);
        ambientLight.color.setHex(stageScene.lighting.ambientColor);
        ambientLight.intensity = stageScene.lighting.ambientIntensity;
        hemiLight.color.setHex(stageScene.lighting.ambientColor);
        hemiLight.groundColor.setHex(stageScene.lighting.fogColor || 0x111827);
        hemiLight.intensity = Math.max(0.4, stageScene.lighting.ambientIntensity * 0.9);
        keyLight.color.setHex(stageScene.lighting.keyLightColor);
        keyLight.intensity = stageScene.lighting.keyLightIntensity;
        spotLeft.color.setHex(stageScene.lighting.spotLeftColor);
        spotRight.color.setHex(stageScene.lighting.spotRightColor);
      });

      const stageBuild = buildIndianStage3D(stageId || 'stage_kala_chakra_time');

      // Combat Ring Boundary Glowing Laser Ropes (Left & Right Walls at -ARENA_HALF_WIDTH_3D, +ARENA_HALF_WIDTH_3D)
      const boundaryMat = new THREE.MeshBasicMaterial({ color: stageBuild.lighting.boundaryLaserColor });
      const boundaryGeom = new THREE.CylinderGeometry(0.04, 0.04, 18, 8);
      boundaryGeom.rotateX(Math.PI / 2);

      // Left & Right Ring Corner Posts
      const leftPostGeom = new THREE.CylinderGeometry(0.2, 0.25, 4.5, 12);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8, roughness: 0.2 });
      const leftPost = new THREE.Mesh(leftPostGeom, postMat);
      leftPost.position.set(-ARENA_HALF_WIDTH_3D - 0.25, 2.25, 0);
      leftPost.castShadow = true;
      scene.add(leftPost);

      const rightPost = new THREE.Mesh(leftPostGeom, postMat);
      rightPost.position.set(ARENA_HALF_WIDTH_3D + 0.25, 2.25, 0);
      rightPost.castShadow = true;
      scene.add(rightPost);

      // Boundary Laser Ropes on Left & Right Walls
      [0.8, 1.8, 2.8].forEach(ropeY => {
        const ropeLeft = new THREE.Mesh(boundaryGeom, boundaryMat);
        ropeLeft.position.set(-ARENA_HALF_WIDTH_3D, ropeY, 0);
        scene.add(ropeLeft);

        const ropeRight = new THREE.Mesh(boundaryGeom, boundaryMat);
        ropeRight.position.set(ARENA_HALF_WIDTH_3D, ropeY, 0);
        scene.add(ropeRight);
      });

      // Boundary Warning Strips on Floor
      const leftStripGeom = new THREE.PlaneGeometry(0.35, 18);
      leftStripGeom.rotateX(-Math.PI / 2);
      const warningStripMat = new THREE.MeshBasicMaterial({
        color: stageBuild.lighting.boundaryLaserColor,
        transparent: true,
        opacity: 0.7,
      });
      const leftStrip = new THREE.Mesh(leftStripGeom, warningStripMat);
      leftStrip.position.set(-ARENA_HALF_WIDTH_3D, GROUND_Y + 0.02, 0);
      scene.add(leftStrip);

      const rightStrip = new THREE.Mesh(leftStripGeom, warningStripMat);
      rightStrip.position.set(ARENA_HALF_WIDTH_3D, GROUND_Y + 0.02, 0);
      scene.add(rightStrip);

      // 6. Floating Atmospheric Energy Motes / Cultural Sparks in 3D
      const particleCount = stageBuild.lighting.particleCount || 160;
      const particleGeom = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i += 3) {
        particlePositions[i] = (Math.random() - 0.5) * 28;
        particlePositions[i + 1] = Math.random() * 8 + 0.5;
        particlePositions[i + 2] = (Math.random() - 0.5) * 14;
      }
      particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: stageBuild.lighting.particleColor || 0xfbbf24,
        size: 0.08,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      const particlePoints = new THREE.Points(particleGeom, particleMat);
      scene.add(particlePoints);

      // Procedural Street Fighter 6 Weathered Stone Paver Fighting Arena Ground
      const paverTexture = createStonePaverTexture();
      const arenaFloorGeom = new THREE.PlaneGeometry(42, 18);
      arenaFloorGeom.rotateX(-Math.PI / 2);
      const arenaFloorMat = new THREE.MeshStandardMaterial({
        map: paverTexture,
        roughness: 0.38,
        metalness: 0.32,
      });
      const arenaFloorMesh = new THREE.Mesh(arenaFloorGeom, arenaFloorMat);
      arenaFloorMesh.position.set(0, GROUND_Y + 0.005, 0);
      arenaFloorMesh.receiveShadow = true;
      scene.add(arenaFloorMesh);

      // Note: Procedural low-poly stick spectators removed per user request in favor of clean 2.5D artwork

      // 7. Load 3D Rigged Characters via Character Asset Pipeline (.glb / .gltf with PBR textures, or Textured Card Fallback)
      const p1CharId = (p1Entity.character?.id || 'steele').toLowerCase();
      const p2CharId = (p2Entity.character?.id || 'valeria').toLowerCase();

      characterLoader.loadCharacter(p1CharId, true, { accentColor: p1Entity.character?.accentColor || '#38bdf8' })
        .then(rig => {
          if (!container.isConnected) {
            rig.dispose();
            return;
          }
          const initP1X = to3DX(p1Entity.x);
          const initP1Y = to3DY(p1Entity.y);
          rig.group.position.set(initP1X, initP1Y, 0);
          rig.shadowMesh.position.set(initP1X, GROUND_Y + 0.02, 0);
          rig.auraMesh.position.set(initP1X, GROUND_Y + 0.04, 0);
          scene.add(rig.group);
          scene.add(rig.shadowMesh);
          scene.add(rig.auraMesh);
          p1RigRef.current = rig;
        })
        .catch(err => {
          console.warn('[FofStage25DView] P1 initial character load error handled:', err);
        });

      characterLoader.loadCharacter(p2CharId, false, { accentColor: p2Entity.character?.accentColor || '#06b6d4' })
        .then(rig => {
          if (!container.isConnected) {
            rig.dispose();
            return;
          }
          const initP2X = to3DX(p2Entity.x);
          const initP2Y = to3DY(p2Entity.y);
          rig.group.position.set(initP2X, initP2Y, 0);
          rig.shadowMesh.position.set(initP2X, GROUND_Y + 0.02, 0);
          rig.auraMesh.position.set(initP2X, GROUND_Y + 0.04, 0);
          scene.add(rig.group);
          scene.add(rig.shadowMesh);
          scene.add(rig.auraMesh);
          p2RigRef.current = rig;
        })
        .catch(err => {
          console.warn('[FofStage25DView] P2 initial character load error handled:', err);
        });

      // 8. Animation & Render Loop
      let animId: number;
      let clock = new THREE.Clock();

      const render = () => {
        animId = requestAnimationFrame(render);
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Animate floating dust motes
        const posAttr = particleGeom.attributes.position;
        if (posAttr) {
          const arr = posAttr.array as Float32Array;
          for (let i = 1; i < arr.length; i += 3) {
            arr[i] += delta * 0.35;
            if (arr[i] > 8.5) arr[i] = 0.5;
          }
          posAttr.needsUpdate = true;
        }

        // Animate Procedural Indian Stage 3D Cultural Elements
        animatedStageItemsRef.current.forEach(item => {
          if (item.type === 'rotateZ') {
            item.object.rotation.z += delta * (item.speed ?? 0.1);
          } else if (item.type === 'rotateY') {
            item.object.rotation.y += delta * (item.speed ?? 0.1);
          } else if (item.type === 'bobY') {
            const base = item.baseY ?? item.object.position.y;
            item.object.position.y = base + Math.sin(elapsedTime * 1.6 + (item.object.id % 5)) * 0.25;
          }
        });

        // Animate Moving Background Sky Panorama & Cheering Humans
        if (backdropMeshRef.current && (backdropMeshRef.current.material as THREE.MeshBasicMaterial).map) {
          const map = (backdropMeshRef.current.material as THREE.MeshBasicMaterial).map;
          if (map) {
            map.offset.x = (map.offset.x + delta * 0.0015) % 1;
          }
        }

        // Calculate dynamic fight excitement for cheering crowd reactions
        const isHighCombo = (p1Entity.comboHits > 2) || (p2Entity.comboHits > 2);
        const isFinisher = !!(finisherState && finisherState.active);
        const isLowHp = (p1Entity.hp < 30) || (p2Entity.hp < 30);
        let excitementLevel = 1.0;
        if (isFinisher) excitementLevel = 2.4;
        else if (isHighCombo) excitementLevel = 1.7;
        else if (isLowHp) excitementLevel = 1.35;

        // Animate Cheering Human Spectators, Arms, Waving Flags & Moving Clouds
        if (crowdSystemRef.current) {
          crowdSystemRef.current.update(delta, elapsedTime, excitementLevel);
          if (punchFlash || (finisherState && finisherState.active)) {
            crowdSystemRef.current.triggerFlash();
          }
        }

        // Animate Stadium Spotlights
        if (stadiumLightLeftRef.current) {
          stadiumLightLeftRef.current.position.x = -10 + Math.sin(elapsedTime * 0.8) * 3;
          stadiumLightLeftRef.current.target.position.x = to3DX(p1Entity.x);
        }
        if (stadiumLightRightRef.current) {
          stadiumLightRightRef.current.position.x = 10 + Math.cos(elapsedTime * 0.8) * 3;
          stadiumLightRightRef.current.target.position.x = to3DX(p2Entity.x);
        }

        // Smooth Camera Tracking (2.5D Dynamic Framing)
        const p1Current = p1EntityRef.current;
        const p2Current = p2EntityRef.current;
        const p1X = to3DX(p1Current.x);
        const p2X = to3DX(p2Current.x);
        const p1Y = to3DY(p1Current.y);
        const p2Y = to3DY(p2Current.y);

        const midX = (p1X + p2X) / 2;
        const midY = (p1Y + p2Y) / 2;
        const fighterDist = Math.abs(p1X - p2X);

        // Dynamic Spotlight tracking of fighters
        if (stadiumLightLeftRef.current) {
          stadiumLightLeftRef.current.position.x = -10 + Math.sin(elapsedTime * 0.8) * 3;
          stadiumLightLeftRef.current.target.position.x = p1X;
        }
        if (stadiumLightRightRef.current) {
          stadiumLightRightRef.current.position.x = 10 + Math.cos(elapsedTime * 0.8) * 3;
          stadiumLightRightRef.current.target.position.x = p2X;
        }

        // Mathematical frustum calculation for SF6 cinematic framing:
        const halfFovRad = (34 / 2) * (Math.PI / 180);
        const tanHalfFov = Math.tan(halfFovRad);
        const aspect = Math.max(1.0, camera.aspect || (16 / 9));
        const tanHalfFovAspect = tanHalfFov * aspect;

        // Camera center X tracking based on camera preset:
        let targetX = THREE.MathUtils.clamp(midX, -6.5, 6.5);
        if (cameraPreset === 'CINEMATIC') {
          targetX = THREE.MathUtils.clamp(midX + 0.5, -6.5, 6.5);
        } else if (cameraPreset === 'TOURNAMENT') {
          targetX = THREE.MathUtils.clamp(midX, -6.0, 6.0);
        }

        // Distance from chosen camera targetX to each fighter + horizontal safezone
        const fighterPadding = 2.8; 
        const distToMinFighter = Math.abs(targetX - (Math.min(p1X, p2X) - fighterPadding));
        const distToMaxFighter = Math.abs((Math.max(p1X, p2X) + fighterPadding) - targetX);
        const requiredHalfWidth = Math.max(distToMinFighter, distToMaxFighter);

        // Required Z distance to fit horizontal span
        const requiredZHorizontal = requiredHalfWidth / tanHalfFovAspect;

        // Required Z distance to fit vertical span during high jumps (rig top is ~y + 2.5):
        const highestFighterY = Math.max(p1Y, p2Y);
        const lowestFighterY = Math.min(p1Y, p2Y);
        const jumpElevation = Math.max(0, highestFighterY - GROUND_Y);
        // Include rig height (2.5) + generous top headroom (1.4) + ground clearance (0.8)
        const verticalHeadroom = Math.max(highestFighterY + 2.5 - lowestFighterY + 1.4, 4.8);
        const requiredZVertical = verticalHeadroom / (2 * tanHalfFov);

        const requiredZ = Math.max(requiredZHorizontal, requiredZVertical);

        // Dynamic camera Z scaling to guarantee both fighters stay on screen during jump and dashes:
        let targetZ = THREE.MathUtils.clamp(Math.max(7.4, requiredZ), 7.4, 13.0);
        // Responsive vertical camera tracking: smoothly rises with jumping fighter while keeping ground grounded
        let targetY = 2.15 + midY * 0.45 + jumpElevation * 0.35;
        let lookAtY = 1.6 + midY * 0.35 + jumpElevation * 0.30;
        let targetFOV = 34;

        if (cameraPreset === 'CINEMATIC') {
          targetZ = THREE.MathUtils.clamp(Math.max(7.0, requiredZ * 0.95), 7.0, 12.0);
          targetY = 2.3 + midY * 0.45 + jumpElevation * 0.35;
        } else if (cameraPreset === 'TOURNAMENT') {
          targetZ = THREE.MathUtils.clamp(Math.max(8.0, requiredZ * 1.05), 8.0, 13.5);
          targetY = 2.2 + midY * 0.35 + jumpElevation * 0.30;
          lookAtY = 1.55 + midY * 0.25 + jumpElevation * 0.25;
        }

        // Rolling Parallax multi-layer stage architecture
        if (stageSceneRef.current) {
          stageSceneRef.current.updateParallax(targetX, delta, elapsedTime);
        }

        // POST-MATCH VICTORY POSE: Dramatic Cinematic Camera Dolly & Spotlight
        if (postMatchState && postMatchState.active) {
          const isP1Win = postMatchState.winner === 'p1';
          const winnerEntity = isP1Win ? p1Entity : p2Entity;
          const win3DX = to3DX(winnerEntity.x);
          const win3DY = to3DY(winnerEntity.y);

          targetZ = 6.2; // Dramatic cinematic victory close-up camera zoom
          targetY = Math.max(1.5, win3DY + 1.25);
          targetX = THREE.MathUtils.clamp(win3DX, -ARENA_HALF_WIDTH_3D + 2.5, ARENA_HALF_WIDTH_3D - 2.5);
          lookAtY = Math.max(1.15, win3DY + 0.95);
          targetFOV = 34; // Cinematic portrait compression

          if (flashPointLightRef.current) {
            flashPointLightRef.current.position.set(win3DX, win3DY + 1.4, 2.0);
            flashPointLightRef.current.color.setHex(isP1Win ? 0xf59e0b : 0x38bdf8);
            flashPointLightRef.current.intensity = 18;
          }
        } else if (finisherState && finisherState.active) {
          const impact3DX = to3DX(finisherState.impactX);
          const impact3DY = to3DY(finisherState.impactY);

          // Extreme dynamic finisher camera zoom:
          targetZ = 6.4; // Dramatic close-up zoom focused right on the 35+ hit finisher strike
          targetY = Math.max(1.3, impact3DY + 1.2);
          targetX = THREE.MathUtils.clamp(impact3DX, -ARENA_HALF_WIDTH_3D + 2.5, ARENA_HALF_WIDTH_3D - 2.5);
          lookAtY = Math.max(1.0, impact3DY + 0.8);
          targetFOV = 32; // High-drama cinematic compression

          // High-frequency impact rumble
          shakeOffset.current.set(
            (Math.random() - 0.5) * 0.45,
            (Math.random() - 0.5) * 0.35,
            (Math.random() - 0.5) * 0.25
          );

          // Golden Solar Flare point light centered at the finisher clash
          if (flashPointLightRef.current) {
            flashPointLightRef.current.position.set(impact3DX, impact3DY + 1.0, 1.8);
            flashPointLightRef.current.color.setHex(0xfbbf24);
            flashPointLightRef.current.intensity = 24;
          }
        } else if (superCutIn) {
          targetZ = 8.8; // Dramatic close-up zoom
          targetY = 2.1;
          targetX = (superCutIn.moveName ? (p1Entity.facing === 1 ? p1X + 0.8 : p1X - 0.8) : midX);
          targetFOV = 38; // Telephoto compression
        }

        // Apply shake decay
        shakeOffset.current.multiplyScalar(0.85);

        const camLerp = finisherState && finisherState.active ? 0.24 : 0.12;
        const lookAtLerp = finisherState && finisherState.active ? 0.26 : 0.14;
        const fovLerp = finisherState && finisherState.active ? 0.18 : 0.08;

        // Smooth Lerp Camera Position
        cameraTargetPos.current.set(targetX, targetY, targetZ).add(shakeOffset.current);
        camera.position.lerp(cameraTargetPos.current, camLerp);

        // Smooth Lerp Camera LookAt directly along targetX to eliminate asymmetrical yaw clipping
        cameraLookAtTarget.current.lerp(new THREE.Vector3(targetX, lookAtY, 0), lookAtLerp);
        camera.lookAt(cameraLookAtTarget.current);

        // Smooth Lerp FOV
        if (Math.abs(camera.fov - targetFOV) > 0.1) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, fovLerp);
          camera.updateProjectionMatrix();
        }

        // 60 FPS Continuous Fighter Rig, Kinematics & Pose Synchronization
        if (p1RigRef.current && p2RigRef.current) {
          let r1 = p1RigRef.current;
          let r2 = p2RigRef.current;

          // Check if fighter character ID changed
          const char1Id = (p1Current.character?.id || 'steele').toLowerCase();
          if (r1.characterId !== char1Id && !p1LoadingRef.current) {
            p1LoadingRef.current = true;
            const prevR1 = r1;
            scene.remove(prevR1.group);
            scene.remove(prevR1.shadowMesh);
            scene.remove(prevR1.auraMesh);
            prevR1.dispose();
            characterLoader.loadCharacter(char1Id, true, { accentColor: p1Current.character?.accentColor || '#38bdf8' })
              .then(newR1 => {
                p1RigRef.current = newR1;
                scene.add(newR1.group);
                scene.add(newR1.shadowMesh);
                scene.add(newR1.auraMesh);
                p1LoadingRef.current = false;
              })
              .catch(err => {
                console.warn('[FofStage25DView] P1 dynamic load error handled:', err);
                p1LoadingRef.current = false;
              });
          }

          const char2Id = (p2Current.character?.id || 'valeria').toLowerCase();
          if (r2.characterId !== char2Id && !p2LoadingRef.current) {
            p2LoadingRef.current = true;
            const prevR2 = r2;
            scene.remove(prevR2.group);
            scene.remove(prevR2.shadowMesh);
            scene.remove(prevR2.auraMesh);
            prevR2.dispose();
            characterLoader.loadCharacter(char2Id, false, { accentColor: p2Current.character?.accentColor || '#06b6d4' })
              .then(newR2 => {
                p2RigRef.current = newR2;
                scene.add(newR2.group);
                scene.add(newR2.shadowMesh);
                scene.add(newR2.auraMesh);
                p2LoadingRef.current = false;
              })
              .catch(err => {
                console.warn('[FofStage25DView] P2 dynamic load error handled:', err);
                p2LoadingRef.current = false;
              });
          }

          // Frustum Screen Bounds Clamping for Combatants in 3D (Strict Anti-Offscreen Guard):
          const currentCamZ = camera.position.z || 8.0;
          const currentCamX = camera.position.x || 0.0;
          const currentCamY = camera.position.y || 2.2;
          const visibleHalfWidthAtZ0 = currentCamZ * tanHalfFovAspect;
          const visibleHalfHeightAtZ0 = currentCamZ * tanHalfFov;
          const screenMargin3D = 1.35; // margin from screen edge

          const frustumMinX = currentCamX - visibleHalfWidthAtZ0 + screenMargin3D;
          const frustumMaxX = currentCamX + visibleHalfWidthAtZ0 - screenMargin3D;
          const stageBoundaryMinX = -ARENA_HALF_WIDTH_3D + 0.65;
          const stageBoundaryMaxX = ARENA_HALF_WIDTH_3D - 0.65;

          const effectiveMinX = Math.max(stageBoundaryMinX, frustumMinX);
          const effectiveMaxX = Math.min(stageBoundaryMaxX, frustumMaxX);

          let finalP1X = THREE.MathUtils.clamp(p1X, effectiveMinX, effectiveMaxX);
          let finalP2X = THREE.MathUtils.clamp(p2X, effectiveMinX, effectiveMaxX);

          // 3D Visual Pushbox & Anti-Same-Axis Defense (Commercial 2.5D fighting game standard)
          // Minimum 3D clearance: 1.25 units (~85 world pixels)
          const dist3D = Math.abs(finalP1X - finalP2X);
          const min3DDist = 1.25;
          const isGrounded3D = p1Y < 0.25 && p2Y < 0.25;

          if (isGrounded3D && dist3D < min3DDist) {
            renderOverlapTimerRef.current += delta;
            const p1Dir = finalP1X < finalP2X ? -1 : (finalP1X > finalP2X ? 1 : (p1Current.isPlayer1 ? -1 : 1));
            // Immediate progressive separation + hard guarantee at 1.0s or same-axis alignment (< 0.08 units)
            if (renderOverlapTimerRef.current >= 1.0 || dist3D < 0.08) {
              const mid3D = (finalP1X + finalP2X) / 2;
              let targetP1 = mid3D + p1Dir * (min3DDist / 2);
              let targetP2 = mid3D - p1Dir * (min3DDist / 2);
              if (targetP1 < effectiveMinX) {
                targetP1 = effectiveMinX;
                targetP2 = effectiveMinX + min3DDist;
              } else if (targetP2 > effectiveMaxX) {
                targetP2 = effectiveMaxX;
                targetP1 = effectiveMaxX - min3DDist;
              }
              finalP1X = THREE.MathUtils.clamp(targetP1, effectiveMinX, effectiveMaxX);
              finalP2X = THREE.MathUtils.clamp(targetP2, effectiveMinX, effectiveMaxX);
              if (renderOverlapTimerRef.current >= 1.0) {
                renderOverlapTimerRef.current = 0;
              }
            }
          } else {
            renderOverlapTimerRef.current = 0;
          }

          // Authoritative vertical physics without camera-ceiling clipping:
          const fighterP1Y = p1Y;
          const fighterP2Y = p2Y;

          // Dynamic Z-separation and renderOrder calculation (SF6 / KOF XV arcade standard)
          const zSep = calculateZSeparationAndRenderOrder(
            finalP1X,
            finalP2X,
            !!(p1Current.isAttacking || (p1Current.action && p1Current.action !== 'IDLE' && !p1Current.action.includes('WALK') && !p1Current.action.includes('HURT'))),
            !!(p2Current.isAttacking || (p2Current.action && p2Current.action !== 'IDLE' && !p2Current.action.includes('WALK') && !p2Current.action.includes('HURT')))
          );

          // 1. Position & Dynamic 2.5D Heroic Orientation with distinct Z planes (P1: +0.05, P2: -0.05)
          r1.group.position.set(finalP1X, fighterP1Y, zSep.p1Z);
          r1.group.rotation.y = p1Current.facing === 1 ? 0.25 : Math.PI - 0.25;
          r1.group.scale.set(1.35, 1.35, 1.35);
          r1.group.renderOrder = zSep.p1RenderOrder;

          r2.group.position.set(finalP2X, fighterP2Y, zSep.p2Z);
          r2.group.rotation.y = p2Current.facing === 1 ? 0.25 : Math.PI - 0.25;
          r2.group.scale.set(1.35, 1.35, 1.35);
          r2.group.renderOrder = zSep.p2RenderOrder;

          // Configure depthWrite and polygon offset on materials to eliminate Z-fighting
          r1.materials.forEach(mat => {
            mat.depthWrite = true;
            (mat as any).polygonOffset = true;
            (mat as any).polygonOffsetFactor = zSep.p1PolygonOffsetFactor;
            (mat as any).polygonOffsetUnits = -4.0;
          });
          r2.materials.forEach(mat => {
            mat.depthWrite = true;
            (mat as any).polygonOffset = true;
            (mat as any).polygonOffsetFactor = zSep.p2PolygonOffsetFactor;
            (mat as any).polygonOffsetUnits = 4.0;
          });

          // 2. Ground Contact Shadow Tracking (firmly grounded at floor plane)
          r1.shadowMesh.position.set(finalP1X, GROUND_Y + 0.015, 0);
          const p1Dist = Math.max(0, fighterP1Y - GROUND_Y);
          const p1ShadowRatio = Math.max(0.35, 1.0 - (p1Dist / 3.2) * 0.5);
          r1.shadowMesh.scale.set(p1ShadowRatio, p1ShadowRatio, p1ShadowRatio);
          (r1.shadowMesh.material as THREE.MeshBasicMaterial).opacity = p1Dist > 0.08 ? 0.42 * p1ShadowRatio : 0.82;

          r2.shadowMesh.position.set(finalP2X, GROUND_Y + 0.015, 0);
          const p2Dist = Math.max(0, fighterP2Y - GROUND_Y);
          const p2ShadowRatio = Math.max(0.35, 1.0 - (p2Dist / 3.2) * 0.5);
          r2.shadowMesh.scale.set(p2ShadowRatio, p2ShadowRatio, p2ShadowRatio);
          (r2.shadowMesh.material as THREE.MeshBasicMaterial).opacity = p2Dist > 0.08 ? 0.42 * p2ShadowRatio : 0.82;

          // 3. Dynamic Elemental Aura Tracking
          r1.auraMesh.position.set(finalP1X, GROUND_Y + 0.04, 0);
          (r1.auraMesh.material as THREE.MeshBasicMaterial).opacity = p1Current.isMaxMode ? 0.6 : 0.25;
          r1.auraMesh.visible = !!(p1Current.isMaxMode || p1Current.superMeter >= 100);

          r2.auraMesh.position.set(finalP2X, GROUND_Y + 0.04, 0);
          (r2.auraMesh.material as THREE.MeshBasicMaterial).opacity = p2Current.isMaxMode ? 0.6 : 0.25;
          r2.auraMesh.visible = !!(p2Current.isMaxMode || p2Current.superMeter >= 100);

          // 4. Update kinematic pose, hit flash, and animations
          r1.updatePose(p1Current, delta, p1HitstunRef.current);
          r2.updatePose(p2Current, delta, p2HitstunRef.current);
        }

        renderer.render(scene, camera);
      };

      animId = requestAnimationFrame(render);

      // Handle Container Resize
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          const newHeight = entry.contentRect.height;
          if (newWidth > 0 && newHeight > 0) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
          }
        }
      });
      resizeObserver.observe(container);

      // Cleanup
      return () => {
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();
        if (p1RigRef.current) {
          scene.remove(p1RigRef.current.group);
          scene.remove(p1RigRef.current.shadowMesh);
          scene.remove(p1RigRef.current.auraMesh);
          p1RigRef.current.dispose();
          p1RigRef.current = null;
        }
        if (p2RigRef.current) {
          scene.remove(p2RigRef.current.group);
          scene.remove(p2RigRef.current.shadowMesh);
          scene.remove(p2RigRef.current.auraMesh);
          p2RigRef.current.dispose();
          p2RigRef.current = null;
        }
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    }, [cameraPreset]);

    // Dynamically rebuild 3D Stage Environment when stageId changes
    useEffect(() => {
      if (!sceneRef.current || !stageGroupRef.current) return;
      const scene = sceneRef.current;
      const stageContainer = stageGroupRef.current;

      // Clear existing stage meshes
      if (stageSceneRef.current) {
        stageContainer.remove(stageSceneRef.current.containerGroup);
        stageSceneRef.current.dispose();
        stageSceneRef.current = null;
      }
      while (stageContainer.children.length > 0) {
        const obj = stageContainer.children[0];
        stageContainer.remove(obj);
      }

      const stageAsset = resolveStageAsset(stageId, stageBgUrl);
      buildStageScene(stageAsset).then((stageScene) => {
        stageContainer.add(stageScene.containerGroup);
        stageSceneRef.current = stageScene;

        scene.background = new THREE.Color(stageScene.lighting.bgColor);
        scene.fog = new THREE.Fog(stageScene.lighting.fogColor || 0x050811, 26, 75);
        if (ambientLightRef.current) {
          ambientLightRef.current.color.setHex(stageScene.lighting.ambientColor);
          ambientLightRef.current.intensity = stageScene.lighting.ambientIntensity;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(stageScene.lighting.ambientColor);
          hemiLightRef.current.groundColor.setHex(stageScene.lighting.fogColor || 0x111827);
          hemiLightRef.current.intensity = Math.max(0.4, stageScene.lighting.ambientIntensity * 0.9);
        }
        if (keyLightRef.current) {
          keyLightRef.current.color.setHex(stageScene.lighting.keyLightColor);
          keyLightRef.current.intensity = stageScene.lighting.keyLightIntensity;
        }
        if (stadiumLightLeftRef.current) {
          stadiumLightLeftRef.current.color.setHex(stageScene.lighting.spotLeftColor);
        }
        if (stadiumLightRightRef.current) {
          stadiumLightRightRef.current.color.setHex(stageScene.lighting.spotRightColor);
        }
      });
    }, [stageId, stageBgUrl]);

    // Update 3D Projectiles
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      const currentMap = projectileMeshesRef.current;
      const activeIds = new Set(projectiles.map(p => p.id));

      // Remove expired projectiles
      for (const [id, data] of currentMap.entries()) {
        if (!activeIds.has(id)) {
          scene.remove(data.mesh);
          scene.remove(data.light);
          data.mesh.geometry.dispose();
          (data.mesh.material as THREE.Material).dispose();
          currentMap.delete(id);
        }
      }

      // Add or update active projectiles
      projectiles.forEach(p => {
        const x3d = to3DX(p.x);
        const y3d = to3DY(p.y);
        const color = new THREE.Color(p.color || '#f59e0b');

        let data = currentMap.get(p.id);
        if (!data) {
          // Create 3D Glowing Projectile Sphere
          const geom = new THREE.SphereGeometry(Math.max(0.18, p.radius * WORLD_SCALE * 1.5), 16, 16);
          const mat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 2.5,
            roughness: 0.1,
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.castShadow = true;

          // Attached Dynamic 3D Point Light
          const light = new THREE.PointLight(color, 2.5, 5);
          scene.add(mesh);
          scene.add(light);

          data = { mesh, light };
          currentMap.set(p.id, data);
        }

        data.mesh.position.set(x3d, y3d, 0);
        data.light.position.set(x3d, y3d, 0.2);
      });
    }, [projectiles]);

    // Update Hitsparks and Punch Flash Light
    useEffect(() => {
      if (punchFlash && flashPointLightRef.current) {
        flashPointLightRef.current.position.set(to3DX(punchFlash.x), to3DY(punchFlash.y), 1.2);
        flashPointLightRef.current.color.set(punchFlash.color || '#ffffff');
        flashPointLightRef.current.intensity = punchFlash.isSuper ? 8.0 : punchFlash.isCrit ? 5.5 : 3.5;

        // Trigger camera impact rumble
        shakeOffset.current.set(
          (Math.random() - 0.5) * (punchFlash.isCrit ? 0.35 : 0.2),
          (Math.random() - 0.5) * (punchFlash.isCrit ? 0.25 : 0.15),
          (Math.random() - 0.5) * 0.2
        );

        const timer = setTimeout(() => {
          if (flashPointLightRef.current) {
            flashPointLightRef.current.intensity = 0;
          }
        }, 120);
        return () => clearTimeout(timer);
      }
    }, [punchFlash]);

    // Handle Screen Shake Prop
    useEffect(() => {
      if (screenShake) {
        shakeOffset.current.set(
          (Math.random() - 0.5) * 0.45,
          (Math.random() - 0.5) * 0.35,
          (Math.random() - 0.5) * 0.25
        );
      }
    }, [screenShake]);

    return (
      <div
        ref={mountRef}
        className="relative w-full h-full overflow-hidden select-none pointer-events-none"
        style={{ touchAction: 'none' }}
      />
    );
  }
);

