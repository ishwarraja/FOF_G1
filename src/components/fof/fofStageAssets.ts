import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getStageVisual } from '../../data/stageBackgrounds';
import { buildIndianStage3D, AnimatedStageItem } from './fofIndianStages3D';

/**
 * Fate of Fighters (FOF) - Production Stage Asset & Parallax Architecture
 *
 * Implements multi-layered physical stage depth with authoritative camera rolling:
 * - Sky: parallax 0.02
 * - Far architecture: parallax 0.08
 * - Mid architecture: parallax 0.18
 * - Crowd / cheering spectators: parallax 0.30
 * - Foreground props: parallax 0.55
 * - Fighting floor: parallax 1.00 (in authoritative 3D combat coordinates)
 *
 * Supports Three.js GLTFLoader for .glb/.gltf stage models with named nodes:
 * - FOF_StageBackdrop
 * - FOF_FightingFloor
 * - FOF_LeftBoundary
 * - FOF_RightBoundary
 * - FOF_Sky
 * - FOF_Far
 * - FOF_Mid
 * - FOF_Crowd
 * - FOF_Foreground
 */

export interface FofStageAsset {
  id: string;
  name: string;
  glbUrl?: string;
  skyUrl?: string;
  farUrl?: string;
  midUrl?: string;
  crowdUrl?: string;
  foregroundUrl?: string;
  floorUrl?: string;
  worldWidth: number;
  bounds: { minX: number; maxX: number };
}

export interface FofStageLayer {
  group: THREE.Group;
  parallaxFactor: number;
  baseZ: number;
  driftSpeed?: number;
}

export interface FofStageSceneInstance {
  stageAsset: FofStageAsset;
  containerGroup: THREE.Group;
  layers: {
    sky: FofStageLayer;
    far: FofStageLayer;
    mid: FofStageLayer;
    crowd: FofStageLayer;
    floor: FofStageLayer;
    foreground: FofStageLayer;
  };
  floorMesh?: THREE.Mesh;
  animatedElements: AnimatedStageItem[];
  lighting: {
    bgColor: number;
    fogColor: number;
    fogDensity: number;
    ambientColor: number;
    ambientIntensity: number;
    keyLightColor: number;
    keyLightIntensity: number;
    spotLeftColor: number;
    spotRightColor: number;
    boundaryLaserColor: number;
  };
  updateParallax: (cameraWorldX: number, delta: number, elapsedTime: number) => void;
  dispose: () => void;
}

// Parallax movement factors per architectural layer specification
export const PARALLAX_FACTORS = {
  SKY: 0.02,
  FAR: 0.08,
  MID: 0.18,
  CROWD: 0.30,
  FOREGROUND: 0.55,
  FLOOR: 1.00,
} as const;

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

/**
 * Creates procedural high-quality stone paver texture for fighting floor
 */
export function createStonePaverTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#23201d';
    ctx.fillRect(0, 0, 1024, 1024);

    const cols = 8;
    const rows = 16;
    const tileW = 1024 / cols;
    const tileH = 1024 / rows;

    for (let r = 0; r < rows; r++) {
      const offsetX = r % 2 === 0 ? 0 : tileW * 0.5;
      for (let c = -1; c <= cols; c++) {
        const x = c * tileW + offsetX;
        const y = r * tileH;

        const seed = Math.sin(c * 19.3 + r * 41.7);
        const brightness = 44 + Math.floor(seed * 14);
        ctx.fillStyle = `rgb(${brightness + 8}, ${brightness + 4}, ${brightness})`;
        ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);

        // Weathered stone bevel highlights
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(x + 2, y + 2, tileW - 4, 3);
        ctx.fillRect(x + 2, y + 2, 3, tileH - 4);

        // Shadow edges
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(x + 2, y + tileH - 5, tileW - 4, 3);
        ctx.fillRect(x + tileW - 5, y + 2, 3, tileH - 4);

        // Stone texture grain
        for (let i = 0; i < 12; i++) {
          const gx = x + 4 + Math.random() * (tileW - 8);
          const gy = y + 4 + Math.random() * (tileH - 8);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.2)';
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

/**
 * Registry of Stage Assets
 */
export const STAGE_ASSET_REGISTRY: Record<string, FofStageAsset> = {
  stage_kala_chakra_time: {
    id: 'stage_kala_chakra_time',
    name: 'Kala Chakra: Sun Temple of Time',
    glbUrl: '/stages/stage_kala_chakra_time.glb',
    skyUrl: '/stages/stage_kala_chakra_time.jpeg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_jantar_mantar_space: {
    id: 'stage_jantar_mantar_space',
    name: 'Jantar Mantar: Celestial Geometry',
    glbUrl: '/stages/stage_jantar_mantar_space.glb',
    skyUrl: '/stages/stage_jantar_mantar_space.jpeg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_antariksha_space: {
    id: 'stage_antariksha_space',
    name: 'Antariksha: Cosmic Brahmanda',
    glbUrl: '/stages/stage_antariksha_space.glb',
    skyUrl: '/stages/stage_antariksha_space.jpeg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_dandakaranya_forest: {
    id: 'stage_dandakaranya_forest',
    name: 'Dandakaranya: Sacred Tapovan Forest',
    glbUrl: '/stages/stage_dandakaranya_forest.glb',
    skyUrl: '/stages/stage_dandakaranya_forest.jpeg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_kumbh_sangam_gathering: {
    id: 'stage_kumbh_sangam_gathering',
    name: 'Maha Kumbh: Twilight Ghats',
    glbUrl: '/stages/stage_kumbh_sangam_gathering.glb',
    skyUrl: '/stages/stage_kumbh_sangam_gathering.jpeg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_hegemony_arena: {
    id: 'stage_hegemony_arena',
    name: 'Street Fighter 6 Grand Championship Arena',
    glbUrl: '/stages/stage_hegemony_arena.glb',
    skyUrl: '/stages/stage_street_fighter_arena.jpg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_street_fighter_arena: {
    id: 'stage_street_fighter_arena',
    name: 'Street Fighter 6 Arena (Championship)',
    glbUrl: '/stages/stage_street_fighter_arena.glb',
    skyUrl: '/stages/stage_street_fighter_arena.jpg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_metro_rain: {
    id: 'stage_metro_rain',
    name: 'Metro City Rain (Cyber Neon)',
    glbUrl: '/stages/stage_metro_rain.glb',
    skyUrl: '/stages/stage_metro_rain.png',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_riverfront_sunset: {
    id: 'stage_riverfront_sunset',
    name: 'Riverfront Twilight Ghats',
    glbUrl: '/stages/stage_riverfront_sunset.glb',
    skyUrl: '/stages/stage_riverfront_sunset.png',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_sky_observatory: {
    id: 'stage_sky_observatory',
    name: 'Sky Observatory (Samrat Yantra)',
    glbUrl: '/stages/stage_sky_observatory.glb',
    skyUrl: '/stages/stage_sky_observatory.png',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_bioluminescent_ruins: {
    id: 'stage_bioluminescent_ruins',
    name: 'Bioluminescent Ancient Ruins',
    glbUrl: '/stages/stage_bioluminescent_ruins.glb',
    skyUrl: '/stages/stage_bioluminescent_ruins.png',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_cheering_crowd_animated: {
    id: 'stage_cheering_crowd_animated',
    name: 'Animated Cheering Crowd Stadium',
    skyUrl: '/stages/stage_cheering_crowd_animated.gif',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_sun_temple_arena: {
    id: 'stage_sun_temple_arena',
    name: 'Sun Temple Sandstone Arena',
    skyUrl: '/stages/stage_sun_temple_arena.png',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_ancient_battleground: {
    id: 'stage_ancient_battleground',
    name: 'Ancient Tournament Colosseum',
    skyUrl: '/stages/stage_ancient_battleground.png',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_spire_apex: {
    id: 'stage_spire_apex',
    name: 'Metro City Rooftop Skyline',
    skyUrl: '/stages/stage_metro_city_rooftop.png',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_sector7_quarantine: {
    id: 'stage_sector7_quarantine',
    name: 'Sector 7 Quarantine Outskirts',
    skyUrl: '/stages/stage_sector7_quarantine.jpeg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_aether_server_vault: {
    id: 'stage_aether_server_vault',
    name: 'Aether Core Server Vault',
    skyUrl: '/stages/stage_aether_server_vault.jpeg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
  stage_subway_slums: {
    id: 'stage_subway_slums',
    name: 'Underground Metro District',
    skyUrl: '/stages/stage_subway_slums.jpeg',
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  },
};

/**
 * Resolves or builds a FofStageAsset for a given stage ID / URL
 */
export function resolveStageAsset(stageId?: string, customBgUrl?: string): FofStageAsset {
  const normId = stageId || 'stage_kala_chakra_time';
  if (STAGE_ASSET_REGISTRY[normId]) {
    const asset = { ...STAGE_ASSET_REGISTRY[normId] };
    if (customBgUrl) asset.skyUrl = customBgUrl;
    return asset;
  }
  const visual = getStageVisual(normId, customBgUrl);
  return {
    id: normId,
    name: visual.altText || 'Fighting Arena',
    skyUrl: visual.imageUrl,
    worldWidth: 36,
    bounds: { minX: -16, maxX: 16 },
  };
}

/**
 * Builds a production-grade multi-layer stage scene for Three.js
 */
export async function buildStageScene(
  stageAsset: FofStageAsset
): Promise<FofStageSceneInstance> {
  const containerGroup = new THREE.Group();
  containerGroup.name = `Stage_${stageAsset.id}`;

  const visual = getStageVisual(stageAsset.id, stageAsset.skyUrl);
  const stageBuild = buildIndianStage3D(stageAsset.id);

  // Initialize Layer Groups with exact parallax specifications
  const skyLayer: FofStageLayer = {
    group: new THREE.Group(),
    parallaxFactor: PARALLAX_FACTORS.SKY,
    baseZ: -12.0,
    driftSpeed: 0.0012,
  };
  skyLayer.group.name = 'FOF_Sky_Layer';
  skyLayer.group.position.z = skyLayer.baseZ;

  const farLayer: FofStageLayer = {
    group: new THREE.Group(),
    parallaxFactor: PARALLAX_FACTORS.FAR,
    baseZ: -8.5,
  };
  farLayer.group.name = 'FOF_Far_Layer';
  farLayer.group.position.z = farLayer.baseZ;

  const midLayer: FofStageLayer = {
    group: new THREE.Group(),
    parallaxFactor: PARALLAX_FACTORS.MID,
    baseZ: -5.0,
  };
  midLayer.group.name = 'FOF_Mid_Layer';
  midLayer.group.position.z = midLayer.baseZ;

  const crowdLayer: FofStageLayer = {
    group: new THREE.Group(),
    parallaxFactor: PARALLAX_FACTORS.CROWD,
    baseZ: -3.0,
  };
  crowdLayer.group.name = 'FOF_Crowd_Layer';
  crowdLayer.group.position.z = crowdLayer.baseZ;

  const floorLayer: FofStageLayer = {
    group: new THREE.Group(),
    parallaxFactor: PARALLAX_FACTORS.FLOOR,
    baseZ: 0.0,
  };
  floorLayer.group.name = 'FOF_Floor_Layer';
  floorLayer.group.position.z = floorLayer.baseZ;

  const foregroundLayer: FofStageLayer = {
    group: new THREE.Group(),
    parallaxFactor: PARALLAX_FACTORS.FOREGROUND,
    baseZ: 2.2,
  };
  foregroundLayer.group.name = 'FOF_Foreground_Layer';
  foregroundLayer.group.position.z = foregroundLayer.baseZ;

  containerGroup.add(skyLayer.group);
  containerGroup.add(farLayer.group);
  containerGroup.add(midLayer.group);
  containerGroup.add(crowdLayer.group);
  containerGroup.add(floorLayer.group);
  containerGroup.add(foregroundLayer.group);

  // Check if a GLB exists for this stage and attempt to load named nodes
  let glbLoaded = false;
  let backdropMesh: THREE.Mesh | undefined;
  let floorMesh: THREE.Mesh | undefined;

  if (stageAsset.glbUrl) {
    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        gltfLoader.load(stageAsset.glbUrl!, resolve, undefined, reject);
      });

      if (gltf && gltf.scene) {
        glbLoaded = true;
        const root = gltf.scene;

        const nodesToAdd: { node: THREE.Object3D; target: THREE.Group }[] = [];
        root.traverse((node: THREE.Object3D) => {
          const name = node.name;
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            if (mesh.material) {
              const mat = mesh.material as any;
              mat.side = THREE.DoubleSide;
              if (name.includes('Backdrop')) {
                mat.depthWrite = false;
                backdropMesh = mesh;
              }
            }
          }
          if (name.includes('FOF_Sky')) {
            node.position.z = 0;
            nodesToAdd.push({ node, target: skyLayer.group });
          } else if (name.includes('FOF_Far') || name.includes('FOF_StageBackdrop')) {
            node.position.z = 0;
            nodesToAdd.push({ node, target: farLayer.group });
          } else if (name.includes('FOF_Mid')) {
            node.position.z = 0;
            nodesToAdd.push({ node, target: midLayer.group });
          } else if (name.includes('FOF_Crowd')) {
            node.position.z = 0;
            nodesToAdd.push({ node, target: crowdLayer.group });
          } else if (name.includes('FOF_Foreground')) {
            node.position.z = 0;
            nodesToAdd.push({ node, target: foregroundLayer.group });
          } else if (name.includes('FOF_FightingFloor') || name.includes('FOF_Floor')) {
            node.position.z = 0;
            floorMesh = node as THREE.Mesh;
            nodesToAdd.push({ node, target: floorLayer.group });
          } else if (name.includes('FOF_LeftBoundary') || name.includes('FOF_RightBoundary')) {
            nodesToAdd.push({ node, target: floorLayer.group });
          }
        });

        if (nodesToAdd.length > 0) {
          nodesToAdd.forEach(({ node, target }) => target.add(node));
        } else {
          farLayer.group.add(root);
        }
      }
    } catch {
      // Graceful fallback to multi-layer planar stage
      glbLoaded = false;
    }
  }

  // If GLB backdrop was not loaded, construct high-fidelity textured plane
  if (!backdropMesh) {
    // 1. Sky & Far Backdrop (Generous 60m wide x 30m high to eliminate any black edges during camera pan & zoom)
    const skyGeom = new THREE.PlaneGeometry(60, 30);
    const skyTex = textureLoader.load(visual.imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
    });
    skyTex.colorSpace = THREE.SRGBColorSpace;
    skyTex.wrapS = THREE.ClampToEdgeWrapping;
    skyTex.wrapT = THREE.ClampToEdgeWrapping;

    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      depthWrite: false,
    });
    backdropMesh = new THREE.Mesh(skyGeom, skyMat);
    // Align floor horizon with Y = 6.2 at depth Z = 0 inside farLayer
    backdropMesh.position.set(0, 6.2, 0);
    farLayer.group.add(backdropMesh);
  }

  // Cultural Architectural Props in Mid Layer (e.g. Konark Sun Chariot Wheels / Samrat Yantra)
  if (stageBuild.animatedElements.length > 0 && midLayer.group.children.length === 0) {
    stageBuild.animatedElements.forEach(item => {
      midLayer.group.add(item.object);
    });
  }

  // 3. Fighting Floor (if not provided by GLB)
  if (!floorMesh) {
    const floorTexture = createStonePaverTexture();
    const arenaFloorGeom = new THREE.PlaneGeometry(48, 20);
    arenaFloorGeom.rotateX(-Math.PI / 2);
    const arenaFloorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.40,
      metalness: 0.28,
    });
    floorMesh = new THREE.Mesh(arenaFloorGeom, arenaFloorMat);
    floorMesh.position.set(0, 0.005, 0);
    floorMesh.receiveShadow = true;
    floorLayer.group.add(floorMesh);
  }

  // 4. Parallax Update Loop Function
  // Each layer rolls with its exact physical parallax factor:
  // layer.position.x = -cameraWorldX * layer.parallaxFactor
  const updateParallax = (cameraWorldX: number, delta: number, elapsedTime: number) => {
    skyLayer.group.position.x = -cameraWorldX * skyLayer.parallaxFactor;
    farLayer.group.position.x = -cameraWorldX * farLayer.parallaxFactor;
    midLayer.group.position.x = -cameraWorldX * midLayer.parallaxFactor;
    crowdLayer.group.position.x = -cameraWorldX * crowdLayer.parallaxFactor;
    foregroundLayer.group.position.x = -cameraWorldX * foregroundLayer.parallaxFactor;
    floorLayer.group.position.x = 0; // Floor stays anchored to authoritative 3D combat world

    // Ambient cloud / sky drift
    if (backdropMesh && (backdropMesh.material as THREE.MeshBasicMaterial).map) {
      const map = (backdropMesh.material as THREE.MeshBasicMaterial).map;
      if (map) {
        map.offset.x = (map.offset.x + delta * 0.001) % 1;
      }
    }

    // Animate stage elements
    stageBuild.animatedElements.forEach(item => {
      if (item.type === 'rotateZ') {
        item.object.rotation.z += delta * (item.speed ?? 0.1);
      } else if (item.type === 'rotateY') {
        item.object.rotation.y += delta * (item.speed ?? 0.1);
      } else if (item.type === 'bobY') {
        const base = item.baseY ?? item.object.position.y;
        item.object.position.y = base + Math.sin(elapsedTime * 1.6 + (item.object.id % 5)) * 0.25;
      }
    });
  };

  const dispose = () => {
    containerGroup.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach(mat => mat.dispose());
        } else if (m.material) {
          m.material.dispose();
        }
      }
    });
  };

  return {
    stageAsset,
    containerGroup,
    layers: {
      sky: skyLayer,
      far: farLayer,
      mid: midLayer,
      crowd: crowdLayer,
      floor: floorLayer,
      foreground: foregroundLayer,
    },
    floorMesh,
    animatedElements: stageBuild.animatedElements,
    lighting: {
      bgColor: stageBuild.lighting.bgColor,
      fogColor: stageBuild.lighting.fogColor || 0x050811,
      fogDensity: 0.025,
      ambientColor: stageBuild.lighting.ambientColor,
      ambientIntensity: stageBuild.lighting.ambientIntensity,
      keyLightColor: stageBuild.lighting.keyLightColor,
      keyLightIntensity: stageBuild.lighting.keyLightIntensity,
      spotLeftColor: stageBuild.lighting.spotLeftColor,
      spotRightColor: stageBuild.lighting.spotRightColor,
      boundaryLaserColor: stageBuild.lighting.boundaryLaserColor,
    },
    updateParallax,
    dispose,
  };
}
