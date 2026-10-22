/**
 * Fate of Fighters (FOF) - Production Character Asset Loader & 3D Model Pipeline
 * 
 * 1. Dedicated Three.js GLTFLoader pipeline importing rigged 3D models (.glb / .gltf)
 *    for Player 1 and Player 2.
 * 2. Automatic PBR material handling on all loaded meshes:
 *    - Applies diffuse/albedo textures (.png / .jpg), roughness maps, and normal maps
 *    - Enables castShadow = true and receiveShadow = true on all character child meshes
 *    - Initializes AnimationMixer with action clipping
 * 3. 2.5D Fallback Sprite Quad:
 *    - If a character slot lacks an external .glb file, provides a clean 2.5D billboard
 *      quad fallback that renders the character's transparent PNG sprite with alphaTest: 0.5
 *      and correct perspective scaling, completely avoiding flat geometric blocks.
 * 4. Ground contact shadows (PCFSoftShadowMap compatible) ensuring models do not appear
 *    detached from the floor.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FightingEntity } from '../types/fighting';
import { normalizeCharacterId } from './characterAssetLoader';
import { CharacterAnimationController } from '../game/CharacterAnimationController';

export interface CharacterAssetPaths {
  dir: string;
  glbCandidates: string[];
  gltfCandidates: string[];
  albedoCandidates: string[];
  normalCandidates: string[];
  roughnessCandidates: string[];
  portraitCandidates: string[];
}

export interface Fighter3DRigInstance {
  characterId: string;
  isPlayer1: boolean;
  group: THREE.Group;
  mainMesh: THREE.Object3D;
  shadowMesh: THREE.Mesh;
  auraMesh: THREE.Mesh;
  pointLight?: THREE.PointLight;
  is3DModel: boolean;
  mixer?: THREE.AnimationMixer;
  animations?: THREE.AnimationClip[];
  actions?: Map<string, THREE.AnimationAction>;
  materials: THREE.Material[];
  updatePose: (entity: FightingEntity, delta: number, isHitstun: boolean) => void;
  dispose: () => void;
}

// Known static files in public to bypass network checks
const KNOWN_STATIC_ASSETS = new Set<string>([
  '/assets/characters/arjun/arjun.glb',
  '/assets/characters/arjun/model.glb',
  '/assets/characters/arjun/portrait.png',
  '/assets/characters/arjun/portrait.jpeg',
  '/assets/characters/arjun/texture_albedo.jpg',
  '/characters/arjun_battle.jpg',
  '/characters/arjun.jpg',

  '/assets/characters/steele/steele.glb',
  '/assets/characters/steele/model.glb',
  '/assets/characters/steele/portrait.png',
  '/assets/characters/steele/portrait.jpeg',
  '/assets/characters/steele/texture_albedo.jpeg',
  '/characters/General_Jonas_Steele_01.jpeg',
  '/characters/General_Jonas_Steele_02.jpeg',

  '/assets/characters/meghananda/meghananda.glb',
  '/assets/characters/meghananda/model.glb',
  '/assets/characters/meghananda/portrait.png',
  '/assets/characters/meghananda/portrait.jpeg',
  '/assets/characters/meghananda/texture_albedo.jpeg',
  '/characters/Meghananda_01.jpeg',
  '/characters/Meghananda_02.jpeg',

  '/assets/characters/valeria/valeria.glb',
  '/assets/characters/valeria/model.glb',
  '/assets/characters/valeria/portrait.png',
  '/assets/characters/valeria/portrait.svg',
  '/assets/characters/valeria/texture_albedo.svg',
  '/characters/valeria_portrait.svg',

  '/assets/characters/elena/portrait.svg',
  '/assets/characters/elena/texture_albedo.svg',
  '/characters/elena_portrait.svg',
  '/characters/elena.svg',

  '/assets/characters/david/portrait.svg',
  '/assets/characters/david/texture_albedo.svg',
  '/characters/david_portrait.svg',
  '/characters/david.svg',

  '/assets/characters/maya/portrait.svg',
  '/assets/characters/maya/texture_albedo.svg',
  '/characters/maya_portrait.svg',
  '/characters/maya.svg',

  '/characters/team_roster.jpg',
  '/characters/icon/Amara.png',
  '/characters/icon/Arjun.png',
  '/characters/icon/David.png',
  '/characters/icon/Elena.png',
  '/characters/icon/Jonas.png',
  '/characters/icon/Kai.png',
  '/characters/icon/Leo.png',
  '/characters/icon/Luna.png',
  '/characters/icon/Maya.png',
  '/characters/icon/Rafe.png',
  '/characters/icon/Victor.png',
]);

const assetAvailabilityCache = new Map<string, boolean>();
const textureCache = new Map<string, THREE.Texture>();

async function fileExists(url: string): Promise<boolean> {
  if (!url) return false;
  if (KNOWN_STATIC_ASSETS.has(url)) return true;
  if (assetAvailabilityCache.has(url)) return assetAvailabilityCache.get(url)!;

  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) {
      assetAvailabilityCache.set(url, false);
      return false;
    }
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      assetAvailabilityCache.set(url, false);
      return false;
    }
    assetAvailabilityCache.set(url, true);
    return true;
  } catch {
    assetAvailabilityCache.set(url, false);
    return false;
  }
}

export function getCharacterAssetPaths(rawId: string): CharacterAssetPaths {
  const id = normalizeCharacterId(rawId);
  const dir = `/assets/characters/${id}`;

  const iconMap: Record<string, string> = {
    alexandra: '/characters/icon/Alexandra.png',
    amara: '/characters/icon/Amara.png',
    arjun: '/characters/icon/Arjun.png',
    david: '/characters/icon/David.png',
    elena: '/characters/icon/Elena.png',
    steele: '/characters/icon/Jonas.png',
    kai: '/characters/icon/Kai.png',
    leo: '/characters/icon/Leo.png',
    luna: '/characters/icon/Luna.png',
    maya: '/characters/icon/Maya.png',
    rafe: '/characters/icon/Rafe.png',
    victor: '/characters/icon/Victor.png',
  };
  const dedicatedIcon = iconMap[id] || '';

  return {
    dir,
    glbCandidates: [
      `${dir}/model.glb`,
      `${dir}/${id}.glb`,
      `/characters/${id}.glb`,
    ],
    gltfCandidates: [
      `${dir}/model.gltf`,
      `${dir}/${id}.gltf`,
      `/characters/${id}.gltf`,
    ],
    albedoCandidates: [
      dedicatedIcon,
      `${dir}/texture_albedo.png`,
      `${dir}/texture_albedo.jpg`,
      `${dir}/texture_albedo.jpeg`,
      `${dir}/texture_albedo.svg`,
      `${dir}/select_slice.png`,
      `${dir}/portrait.png`,
      `${dir}/portrait.jpeg`,
      `${dir}/portrait.jpg`,
      `${dir}/portrait.svg`,
      `/characters/${id}_battle.jpg`,
      `/characters/${id}.jpg`,
      `/characters/${id}.png`,
      `/characters/${id}_portrait.svg`,
      `/characters/${id}.svg`,
      id === 'steele' ? '/characters/General_Jonas_Steele_01.jpeg' : '',
      id === 'meghananda' ? '/characters/Meghananda_01.jpeg' : '',
      id === 'arjun' ? '/characters/arjun_battle.jpg' : '',
    ].filter(Boolean),
    normalCandidates: [
      `${dir}/texture_normal.png`,
      `${dir}/texture_normal.jpg`,
      `${dir}/texture_normal.jpeg`,
    ],
    roughnessCandidates: [
      `${dir}/texture_roughness.png`,
      `${dir}/texture_roughness.jpg`,
      `${dir}/texture_roughness.jpeg`,
    ],
    portraitCandidates: [
      dedicatedIcon,
      `${dir}/select_slice.png`,
      `${dir}/portrait.png`,
      `${dir}/portrait.jpeg`,
      `${dir}/portrait.jpg`,
      `${dir}/portrait.svg`,
      `/characters/${id}_portrait.svg`,
      `/characters/${id}.jpg`,
      `/characters/${id}.png`,
      `/characters/${id}.svg`,
      id === 'steele' ? '/characters/General_Jonas_Steele_01.jpeg' : '',
      id === 'meghananda' ? '/characters/Meghananda_01.jpeg' : '',
      id === 'arjun' ? '/characters/arjun.jpg' : '',
    ].filter(Boolean),
  };
}

export class CharacterLoader {
  private static instance: CharacterLoader;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;

  private constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
  }

  public static getInstance(): CharacterLoader {
    if (!CharacterLoader.instance) {
      CharacterLoader.instance = new CharacterLoader();
    }
    return CharacterLoader.instance;
  }

  /**
   * Helper to load and cache textures with sRGB color space and bilinear filtering.
   * If an SVG is supplied, rasterizes to an offscreen high-res 1024x1024 canvas to prevent 0x0 bugs.
   */
  public async loadTexture(url: string, fallbackColor = '#38bdf8'): Promise<THREE.Texture> {
    if (textureCache.has(url)) {
      return textureCache.get(url)!;
    }
    return new Promise((resolve) => {
      if (url.toLowerCase().endsWith('.svg') || url.includes('.svg?')) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1024;
          canvas.height = 1024;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, 1024, 1024);
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            textureCache.set(url, texture);
            resolve(texture);
            return;
          }
          const tex = new THREE.CanvasTexture(img as any);
          tex.colorSpace = THREE.SRGBColorSpace;
          textureCache.set(url, tex);
          resolve(tex);
        };
        img.onerror = () => {
          const fallback = createProceduralFighterTexture(url, fallbackColor);
          textureCache.set(url, fallback);
          resolve(fallback);
        };
        img.src = url;
        return;
      }

      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          textureCache.set(url, texture);
          resolve(texture);
        },
        undefined,
        () => {
          const fallback = createProceduralFighterTexture(url, fallbackColor);
          textureCache.set(url, fallback);
          resolve(fallback);
        }
      );
    });
  }

  public async resolveFirstExisting(candidates: string[]): Promise<string | null> {
    for (const url of candidates) {
      if (await fileExists(url)) {
        return url;
      }
    }
    return null;
  }

  /**
   * Main entry point: Loads a 3D fighter rig.
   * If a .glb/.gltf exists, imports it via Three.js GLTFLoader with PBR materials.
   * Otherwise, provides the 2.5D Fallback Sprite Quad with alphaTest: 0.5.
   */
  public async loadCharacter(
    characterId: string,
    isPlayer1: boolean,
    options?: { accentColor?: string }
  ): Promise<Fighter3DRigInstance> {
    const paths = getCharacterAssetPaths(characterId);
    const accentColor = options?.accentColor || (isPlayer1 ? '#f59e0b' : '#06b6d4');

    try {
      // 1. Check for 3D GLB/GLTF model
      const modelUrl =
        (await this.resolveFirstExisting(paths.glbCandidates)) ||
        (await this.resolveFirstExisting(paths.gltfCandidates));

      if (modelUrl) {
        try {
          return await this.build3DGlbRig(modelUrl, characterId, isPlayer1, paths, accentColor);
        } catch (err) {
          console.warn(`[CharacterLoader] Failed to load GLTF at ${modelUrl}, using 2.5D quad fallback.`, err);
        }
      }

      // 2. 2.5D Fallback Sprite Quad (alphaTest: 0.5)
      return await this.buildTexturedQuadRig(characterId, isPlayer1, paths, accentColor);
    } catch {
      return this.buildTexturedQuadRig(characterId, isPlayer1, paths, accentColor);
    }
  }

  /**
   * Builds a full 3D GLTF/GLB character rig with animation mixer and PBR material handling.
   */
  private async build3DGlbRig(
    modelUrl: string,
    characterId: string,
    isPlayer1: boolean,
    paths: CharacterAssetPaths,
    accentColor: string
  ): Promise<Fighter3DRigInstance> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        modelUrl,
        async (gltf) => {
          try {
            const group = new THREE.Group();
            group.name = `Fighter3D_${characterId}_${isPlayer1 ? 'P1' : 'P2'}`;

            const model = gltf.scene;
            group.add(model);

            // Resolve textures for material enhancement
            const albedoUrl = await this.resolveFirstExisting(paths.albedoCandidates);
            const normalUrl = await this.resolveFirstExisting(paths.normalCandidates);
            const roughnessUrl = await this.resolveFirstExisting(paths.roughnessCandidates);

            let albedoTex: THREE.Texture | null = null;
            let normalTex: THREE.Texture | null = null;
            let roughnessTex: THREE.Texture | null = null;

            if (albedoUrl) {
              try {
                albedoTex = await this.loadTexture(albedoUrl);
                albedoTex.flipY = false;
              } catch {
                // proceed
              }
            }

            if (normalUrl) {
              try {
                normalTex = await this.loadTexture(normalUrl);
                normalTex.flipY = false;
              } catch {
                // proceed
              }
            }

            if (roughnessUrl) {
              try {
                roughnessTex = await this.loadTexture(roughnessUrl);
                roughnessTex.flipY = false;
              } catch {
                // proceed
              }
            }

            // Normalize model scale to ~2.35m height
            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());
            const targetHeight = 2.35;
            const scaleFactor = size.y > 0.1 ? targetHeight / size.y : 1.0;
            model.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // Re-center horizontally and ground bottom at y = 0
            bbox.setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.z = -center.z;
            model.position.y = -bbox.min.y;

            const materials: THREE.Material[] = [];

            // Automatic PBR material handling on all loaded meshes:
            // - Apply diffuse/albedo textures (.png / .jpg), roughness maps, and normal maps
            // - Enable castShadow = true and receiveShadow = true on all character child meshes
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                if (Array.isArray(mesh.material)) {
                  mesh.material = mesh.material.map((mat) => {
                    const cloned = this.enhancePBRMaterial(mat, albedoTex, normalTex, roughnessTex);
                    materials.push(cloned);
                    return cloned;
                  });
                } else if (mesh.material) {
                  const cloned = this.enhancePBRMaterial(mesh.material, albedoTex, normalTex, roughnessTex);
                  mesh.material = cloned;
                  materials.push(cloned);
                }
              }
            });

            // If GLTF model has no skeletal animation clips, delegate to 2.5D frame-accurate sprite engine
            if (!gltf.animations || gltf.animations.length === 0) {
              reject(new Error(`GLTF model at ${modelUrl} lacks skeletal animation clips; delegating to 2.5D sprite animation engine.`));
              return;
            }

            // Animation Mixer setup with Idle, Walk, Attack state management
            let mixer: THREE.AnimationMixer | undefined;
            const actions = new Map<string, THREE.AnimationAction>();
            let currentAction: THREE.AnimationAction | null = null;
            let currentActionKey = 'idle';

            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
              const action = mixer!.clipAction(clip);
              actions.set(clip.name.toLowerCase(), action);
            });

            // Initial Idle action
            const idleKey = Array.from(actions.keys()).find((k) => k.includes('idle')) || actions.keys().next().value;
            if (idleKey) {
              currentAction = actions.get(idleKey)!;
              currentActionKey = idleKey;
              currentAction.play();
            }

            const playAction = (targetKey: string, crossFadeDuration = 0.15) => {
              if (!mixer || currentActionKey === targetKey) return;
              const matchedKey =
                Array.from(actions.keys()).find((k) => k.includes(targetKey)) ||
                (targetKey === 'walk' ? Array.from(actions.keys()).find((k) => k.includes('run')) : undefined);
              if (!matchedKey) return;
              const nextAction = actions.get(matchedKey);
              if (!nextAction) return;

              if (currentAction && currentAction !== nextAction) {
                nextAction.reset().fadeIn(crossFadeDuration).play();
                currentAction.fadeOut(crossFadeDuration);
              } else {
                nextAction.reset().play();
              }
              currentAction = nextAction;
              currentActionKey = matchedKey;
            };

            // Dynamic Ground Contact Shadow (anchored on stage plane)
            const shadowMesh = createGroundShadow();
            const auraMesh = createAuraMesh(accentColor);
            group.add(shadowMesh);
            group.add(auraMesh);

            let animTimer = 0;

            const updatePose = (entity: FightingEntity, delta: number, isHitstun: boolean) => {
              animTimer += delta;

              // Animation Mixer state management (Idle, Walk, Attack)
              if (mixer) {
                if (entity.state.startsWith('WALK')) {
                  playAction('walk');
                } else if (
                  entity.state.startsWith('ATTACK') ||
                  entity.state.startsWith('SPECIAL') ||
                  entity.state === 'SUPER' ||
                  entity.state === 'CLIMAX'
                ) {
                  playAction('attack');
                } else if (isHitstun || entity.state.startsWith('HIT')) {
                  playAction('hit');
                } else {
                  playAction('idle');
                }
                mixer.update(delta);
              }

              // Facing rotation for 2.5D plane
              const targetRotY = entity.facing === 1 ? 0.28 : Math.PI - 0.28;
              group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetRotY, 0.25);

              // Organic subtle movement if no skeletal animations
              if (!mixer) {
                const breath = Math.sin(animTimer * 3.5) * 0.02;
                model.scale.y = scaleFactor * (1.0 + breath);
              }

              // Hit reaction & Cel-flash
              if (isHitstun || entity.state.startsWith('HIT_')) {
                materials.forEach((mat) => {
                  if ('emissive' in mat) {
                    (mat as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
                    (mat as THREE.MeshStandardMaterial).emissiveIntensity = 0.85;
                  }
                });
                model.rotation.z = entity.facing === 1 ? -0.15 : 0.15;
              } else {
                materials.forEach((mat) => {
                  if ('emissive' in mat) {
                    (mat as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
                    (mat as THREE.MeshStandardMaterial).emissiveIntensity = 0;
                  }
                });
                model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, 0, 0.15);
              }

              // Ground contact shadow: stays on the floor plane at y = 0.015
              const isAirborne = entity.y > 8;
              shadowMesh.position.y = 0.015;
              const shadowScale = isAirborne ? Math.max(0.4, 1.0 - (entity.y / 350) * 0.5) : 1.0;
              shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
              (shadowMesh.material as THREE.MeshBasicMaterial).opacity = isAirborne ? 0.35 : 0.75;

              // Elemental Aura
              auraMesh.rotation.z += delta * 1.5;
              auraMesh.visible = (entity.superMeter ?? 0) >= 100 || entity.state === 'SUPER' || entity.state === 'CLIMAX' || !!entity.isMaxMode;
            };

            const dispose = () => {
              materials.forEach((m) => m.dispose());
              if (albedoTex) albedoTex.dispose();
              if (normalTex) normalTex.dispose();
              if (roughnessTex) roughnessTex.dispose();
              shadowMesh.geometry.dispose();
              (shadowMesh.material as THREE.Material).dispose();
              auraMesh.geometry.dispose();
              (auraMesh.material as THREE.Material).dispose();
            };

            resolve({
              characterId,
              isPlayer1,
              group,
              mainMesh: model,
              shadowMesh,
              auraMesh,
              is3DModel: true,
              mixer,
              animations: gltf.animations,
              actions,
              materials,
              updatePose,
              dispose,
            });
          } catch (innerErr) {
            reject(innerErr instanceof Error ? innerErr : new Error(String(innerErr)));
          }
        },
        undefined,
        (error) => {
          reject(error instanceof Error ? error : new Error(`Failed to load GLTF: ${modelUrl}`));
        }
      );
    });
  }

  /**
   * Builds the 2.5D Fallback Sprite Quad using CharacterAnimationController.
   * Frame-accurate action animations (idle, walk, punches, kicks, specials, hurt, ko)
   * with alphaTest: 0.5 and grounded contact shadows.
   */
  private async buildTexturedQuadRig(
    characterId: string,
    isPlayer1: boolean,
    paths: CharacterAssetPaths,
    accentColor: string
  ): Promise<Fighter3DRigInstance> {
    const group = new THREE.Group();
    group.name = `FighterQuad_${characterId}_${isPlayer1 ? 'P1' : 'P2'}`;

    // Instantiate frame-accurate 2.5D animation controller
    const animCtrl = new CharacterAnimationController(characterId, 'linear', false);
    group.add(animCtrl.mesh);

    const shadowMesh = animCtrl.shadowMesh;
    const auraMesh = createAuraMesh(accentColor);
    group.add(auraMesh);

    const materials: THREE.Material[] = [animCtrl.material];

    const updatePose = (entity: FightingEntity, delta: number, isHitstun: boolean) => {
      // Synchronize controller with 60 FPS combat state
      animCtrl.syncWithEntity(entity, delta, isHitstun, false);

      // Ground contact shadow: anchored on stage plane (y = 0.015)
      const isAirborne = entity.y > 8;
      shadowMesh.position.y = 0.015;
      const shadowScale = isAirborne ? Math.max(0.4, 1.0 - (entity.y / 350) * 0.5) : 1.0;
      shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      (shadowMesh.material as THREE.MeshBasicMaterial).opacity = isAirborne ? 0.35 : 0.8;

      // Aura disc rotation and super state visibility
      auraMesh.position.set(0, 0.04, 0);
      auraMesh.rotation.z += delta * 1.8;
      auraMesh.visible = (entity.superMeter ?? 0) >= 100 || entity.state === 'SUPER' || entity.state === 'CLIMAX' || !!entity.isMaxMode;
    };

    const dispose = () => {
      animCtrl.dispose();
      auraMesh.geometry.dispose();
      (auraMesh.material as THREE.Material).dispose();
    };

    return {
      characterId,
      isPlayer1,
      group,
      mainMesh: animCtrl.mesh,
      shadowMesh,
      auraMesh,
      is3DModel: false,
      materials,
      updatePose,
      dispose,
    };
  }

  /**
   * Automatic PBR material enhancer
   */
  private enhancePBRMaterial(
    baseMat: THREE.Material,
    albedoTex: THREE.Texture | null,
    normalTex: THREE.Texture | null,
    roughnessTex: THREE.Texture | null
  ): THREE.MeshStandardMaterial {
    const standard = (baseMat instanceof THREE.MeshStandardMaterial)
      ? baseMat.clone()
      : new THREE.MeshStandardMaterial();

    if (albedoTex) {
      standard.map = albedoTex;
    }
    if (normalTex) {
      standard.normalMap = normalTex;
    }
    if (roughnessTex) {
      standard.roughnessMap = roughnessTex;
    }

    standard.roughness = THREE.MathUtils.clamp(standard.roughness ?? 0.45, 0.3, 0.7);
    standard.metalness = THREE.MathUtils.clamp(standard.metalness ?? 0.22, 0.1, 0.5);
    standard.side = THREE.DoubleSide;
    standard.shadowSide = THREE.DoubleSide;
    standard.needsUpdate = true;
    return standard;
  }
}

/**
 * Creates soft ground contact shadow disc with radial transparency falloff.
 * Placed on the floor plane so fighters never appear detached.
 */
function createGroundShadow(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 6, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
    gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.65)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(1.9, 0.75);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.015;
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * Creates elemental aura circle at ground level for Super/Max Mode
 */
function createAuraMesh(accentColor: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 30, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.65, `${accentColor}88`);
    gradient.addColorStop(0.9, `${accentColor}44`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(2.4, 2.4);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.renderOrder = 3;
  return mesh;
}

function createProceduralFighterTexture(characterId: string, accentColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Transparent background for crisp alphaTest: 0.5
    ctx.clearRect(0, 0, 1024, 1024);

    // Stylized Cel-Shaded Martial Arts Fighter Silhouette
    ctx.save();
    ctx.translate(512, 100);

    // Dynamic Combat Rim Glow
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 40;

    // Head / Helmet
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 110, 75, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Torso / Battle Armor
    ctx.beginPath();
    ctx.moveTo(-110, 220);
    ctx.lineTo(110, 220);
    ctx.lineTo(85, 470);
    ctx.lineTo(-85, 470);
    ctx.closePath();
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.stroke();

    // Chest Emblem / Accent
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 310, 38, 0, Math.PI * 2);
    ctx.fill();

    // Lead Arm (Combat Guard)
    ctx.beginPath();
    ctx.moveTo(110, 240);
    ctx.lineTo(210, 330);
    ctx.lineTo(160, 420);
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = accentColor;
    ctx.stroke();

    // Back Arm (Ready Strike)
    ctx.beginPath();
    ctx.moveTo(-110, 240);
    ctx.lineTo(-200, 310);
    ctx.lineTo(-170, 220);
    ctx.lineWidth = 30;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = accentColor;
    ctx.stroke();

    // Combat Stance Legs
    ctx.beginPath();
    ctx.moveTo(-60, 470);
    ctx.lineTo(-120, 640);
    ctx.lineTo(-135, 820);
    ctx.moveTo(60, 470);
    ctx.lineTo(125, 630);
    ctx.lineTo(145, 820);
    ctx.lineWidth = 36;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#090d16';
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = accentColor;
    ctx.stroke();

    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export const characterLoader = CharacterLoader.getInstance();
