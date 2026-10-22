/**
 * FOF 3D Character Model Bridge
 * 
 * NOTE: All untextured procedural mannequin geometric primitives (THREE.CylinderGeometry,
 * THREE.BoxGeometry, THREE.CapsuleGeometry) have been removed per arcade production
 * standards. Character models are loaded via Three.js GLTFLoader (.glb / .gltf)
 * or rendered via clean 2.5D billboard sprite quads with alphaTest: 0.5.
 */

import * as THREE from 'three';
import { FightingEntity } from '../../types/fighting';
import { characterLoader, Fighter3DRigInstance } from '../../utils/CharacterLoader';

export type { Fighter3DRigInstance as Fighter3DRig };

/**
 * Loads a 3D fighter rig via the production CharacterLoader pipeline.
 * Completely avoids procedural wooden/plastic mannequins.
 */
export async function buildFighter3DRigAsync(
  characterId: string,
  isPlayer1: boolean,
  accentColorHex?: string
): Promise<Fighter3DRigInstance> {
  return characterLoader.loadCharacter(characterId, isPlayer1, {
    accentColor: accentColorHex,
  });
}

/**
 * Synchronous compatibility wrapper delegating to CharacterLoader instance.
 */
export function buildFighter3DRig(
  characterId: string,
  isPlayer1: boolean,
  accentColorHex?: string
): Fighter3DRigInstance {
  // Return placeholder group while asynchronous model loader mounts
  const group = new THREE.Group();
  group.name = `FighterContainer_${characterId}_${isPlayer1 ? 'P1' : 'P2'}`;

  const shadowGeo = new THREE.PlaneGeometry(1.8, 0.7);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMesh = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false })
  );
  shadowMesh.position.y = 0.015;
  group.add(shadowMesh);

  const auraGeo = new THREE.PlaneGeometry(2.2, 2.2);
  auraGeo.rotateX(-Math.PI / 2);
  const auraMesh = new THREE.Mesh(
    auraGeo,
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColorHex || '#f59e0b'),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  auraMesh.visible = false;
  group.add(auraMesh);

  let activeRig: Fighter3DRigInstance | null = null;

  characterLoader.loadCharacter(characterId, isPlayer1, { accentColor: accentColorHex }).then((rig) => {
    activeRig = rig;
    group.add(rig.group);
  }).catch((err) => {
    console.warn('[fofFighter3DModel] Failed loading model for', characterId, err);
  });

  return {
    characterId,
    isPlayer1,
    group,
    mainMesh: group,
    shadowMesh,
    auraMesh,
    is3DModel: true,
    materials: [],
    updatePose: (entity: FightingEntity, delta: number, isHitstun: boolean) => {
      if (activeRig) {
        activeRig.updatePose(entity, delta, isHitstun);
      }
    },
    dispose: () => {
      if (activeRig) {
        activeRig.dispose();
      }
      shadowGeo.dispose();
      auraGeo.dispose();
    },
  };
}

/**
 * Updates fighter pose delegating to the loaded model rig
 */
export function updateFighter3DPose(
  rig: Fighter3DRigInstance,
  entity: FightingEntity,
  delta: number,
  isHitstun: boolean = false
): void {
  if (rig && typeof rig.updatePose === 'function') {
    rig.updatePose(entity, delta, isHitstun);
  }
}
