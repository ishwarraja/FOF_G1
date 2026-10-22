import * as THREE from 'three';

export interface AnimatedStageItem {
  type: 'rotateZ' | 'rotateY' | 'bobY' | 'orbit';
  object: THREE.Object3D;
  speed?: number;
  axis?: 'x' | 'y' | 'z';
  baseY?: number;
  orbitCenter?: THREE.Vector3;
  orbitRadius?: number;
  orbitAngle?: number;
}

export interface StageLightingConfig {
  bgColor: number;
  fogColor: number;
  fogDensity: number;
  ambientIntensity: number;
  ambientColor: number;
  keyLightColor: number;
  keyLightIntensity: number;
  spotLeftColor: number;
  spotRightColor: number;
  particleColor: number;
  particleCount: number;
  boundaryLaserColor: number;
}

export interface IndianStage3DResult {
  group: THREE.Group;
  animatedElements: AnimatedStageItem[];
  lighting: StageLightingConfig;
}

const GROUND_Y = 0;

/**
 * Procedural 3D Konark Sun Chariot Wheel generator (Time Theme)
 */
function createKonarkSunWheel(radius: number = 3.6): THREE.Group {
  const wheelGroup = new THREE.Group();

  const sandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xc88242,
    roughness: 0.85,
    metalness: 0.15,
  });

  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
    metalness: 0.75,
  });

  // 1. Outer rim
  const rimGeom = new THREE.TorusGeometry(radius, 0.26, 12, 48);
  const rim = new THREE.Mesh(rimGeom, sandstoneMat);
  rim.castShadow = true;
  wheelGroup.add(rim);

  // Decorative inner rim ring
  const innerRimGeom = new THREE.TorusGeometry(radius * 0.86, 0.1, 8, 48);
  const innerRim = new THREE.Mesh(innerRimGeom, goldAccentMat);
  wheelGroup.add(innerRim);

  // 2. Central Axle Hub
  const hubGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.65, 24);
  hubGeom.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeom, sandstoneMat);
  hub.castShadow = true;
  wheelGroup.add(hub);

  const hubCapGeom = new THREE.SphereGeometry(0.42, 16, 16);
  const hubCap = new THREE.Mesh(hubCapGeom, goldAccentMat);
  hubCap.position.z = 0.35;
  wheelGroup.add(hubCap);

  // 3. 16 Carved Radiating Spokes (8 Major + 8 Minor)
  const spokeCount = 16;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i * Math.PI * 2) / spokeCount;
    const isMajor = i % 2 === 0;

    const spokeLen = radius - 0.5;
    const spokeGeom = new THREE.CylinderGeometry(
      isMajor ? 0.09 : 0.06,
      isMajor ? 0.14 : 0.08,
      spokeLen,
      8
    );
    const spoke = new THREE.Mesh(spokeGeom, isMajor ? goldAccentMat : sandstoneMat);
    spoke.position.set(
      Math.cos(angle) * (spokeLen / 2 + 0.35),
      Math.sin(angle) * (spokeLen / 2 + 0.35),
      0
    );
    spoke.rotation.z = angle - Math.PI / 2;
    spoke.castShadow = true;
    wheelGroup.add(spoke);

    // Decorative medallion on major spokes
    if (isMajor) {
      const medalGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.18, 12);
      medalGeom.rotateX(Math.PI / 2);
      const medal = new THREE.Mesh(medalGeom, goldAccentMat);
      medal.position.set(
        Math.cos(angle) * (radius * 0.55),
        Math.sin(angle) * (radius * 0.55),
        0.05
      );
      wheelGroup.add(medal);
    }
  }

  return wheelGroup;
}

/**
 * Procedural Jantar Mantar Samrat Yantra Gnomon Ramp & Quadrants (Space/Observatory Theme)
 */
function createSamratYantra(): THREE.Group {
  const group = new THREE.Group();

  const jaipurPinkStoneMat = new THREE.MeshStandardMaterial({
    color: 0xb55a5a,
    roughness: 0.8,
    metalness: 0.1,
  });

  const whiteMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf3f4f6,
    roughness: 0.3,
    metalness: 0.2,
  });

  // Massive Triangular Gnomon Ramp
  // Shape: Right triangle rising up to 9 units in height
  const gnomonShape = new THREE.Shape();
  gnomonShape.moveTo(0, 0);
  gnomonShape.lineTo(12, 0);
  gnomonShape.lineTo(0, 8.5);
  gnomonShape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: 1.2,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  };

  const gnomonGeom = new THREE.ExtrudeGeometry(gnomonShape, extrudeSettings);
  const gnomon = new THREE.Mesh(gnomonGeom, jaipurPinkStoneMat);
  gnomon.position.set(-6, 0, -11);
  gnomon.castShadow = true;
  gnomon.receiveShadow = true;
  group.add(gnomon);

  // Central Stairway ridge made of white marble
  const ridgeGeom = new THREE.BoxGeometry(0.3, 8.8, 0.3);
  const ridge = new THREE.Mesh(ridgeGeom, whiteMarbleMat);
  ridge.position.set(0, 4.4, -10.4);
  ridge.rotation.z = -Math.atan2(8.5, 12);
  group.add(ridge);

  // Curved Quadrant Measuring Scales (flanking arcs)
  const leftArcGeom = new THREE.TorusGeometry(5.5, 0.35, 10, 32, Math.PI / 2.2);
  const leftArc = new THREE.Mesh(leftArcGeom, whiteMarbleMat);
  leftArc.position.set(-4.5, 3.2, -10.5);
  leftArc.rotation.set(Math.PI / 4, 0, Math.PI / 1.8);
  group.add(leftArc);

  const rightArcGeom = new THREE.TorusGeometry(5.5, 0.35, 10, 32, Math.PI / 2.2);
  const rightArc = new THREE.Mesh(rightArcGeom, whiteMarbleMat);
  rightArc.position.set(4.5, 3.2, -10.5);
  rightArc.rotation.set(Math.PI / 4, 0, -Math.PI / 1.8);
  group.add(rightArc);

  return group;
}

/**
 * Procedural Ancient Banyan Tree with Hanging Aerial Roots (Forest Theme)
 */
function createBanyanTree(height: number = 9, trunkRadius: number = 1.2): THREE.Group {
  const treeGroup = new THREE.Group();

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.95,
    metalness: 0.05,
  });

  const mossyBarkMat = new THREE.MeshStandardMaterial({
    color: 0x224220,
    roughness: 0.9,
    metalness: 0.05,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.85,
    metalness: 0.1,
  });

  // Central Trunk
  const trunkGeom = new THREE.CylinderGeometry(trunkRadius * 0.75, trunkRadius, height, 12);
  const trunk = new THREE.Mesh(trunkGeom, barkMat);
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  treeGroup.add(trunk);

  // 5 Aerial Roots hanging down from branches to soil
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const dist = trunkRadius + 0.6 + (i % 2) * 0.5;
    const rootGeom = new THREE.CylinderGeometry(0.12, 0.22, height * 0.85, 8);
    const root = new THREE.Mesh(rootGeom, mossyBarkMat);
    root.position.set(
      Math.cos(angle) * dist,
      (height * 0.85) / 2,
      Math.sin(angle) * dist
    );
    root.rotation.z = (Math.random() - 0.5) * 0.15;
    root.castShadow = true;
    treeGroup.add(root);
  }

  // Canopy Foliage Clusters
  for (let c = 0; c < 4; c++) {
    const clusterGeom = new THREE.SphereGeometry(2.4 + c * 0.3, 8, 8);
    const cluster = new THREE.Mesh(clusterGeom, foliageMat);
    cluster.position.set(
      (c % 2 === 0 ? 1 : -1) * (1.2 + c * 0.4),
      height + (c % 2) * 0.8,
      (c > 1 ? 1 : -1) * 0.8
    );
    cluster.scale.set(1.4, 0.7, 1.2);
    cluster.castShadow = true;
    treeGroup.add(cluster);
  }

  return treeGroup;
}

/**
 * Procedural Multi-Tier Brass Deepastambha / Lamp Tower (Gathering Theme)
 */
function createDeepastambha(height: number = 7.2): THREE.Group {
  const tower = new THREE.Group();

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.85,
  });

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
  });

  // Base Pedestal
  const baseGeom = new THREE.CylinderGeometry(0.75, 1.0, 1.0, 12);
  const base = new THREE.Mesh(baseGeom, brassMat);
  base.position.y = 0.5;
  base.castShadow = true;
  tower.add(base);

  // Central Pillar Shaft
  const shaftGeom = new THREE.CylinderGeometry(0.2, 0.3, height - 1.0, 12);
  const shaft = new THREE.Mesh(shaftGeom, brassMat);
  shaft.position.y = height / 2;
  shaft.castShadow = true;
  tower.add(shaft);

  // 5 Circular Lamp Trays with Diyas
  const tiers = 5;
  for (let t = 1; t <= tiers; t++) {
    const tierY = 1.2 + (t * (height - 2.0)) / tiers;
    const trayRadius = 0.9 - t * 0.08;

    const trayGeom = new THREE.CylinderGeometry(trayRadius, trayRadius * 0.8, 0.12, 16);
    const tray = new THREE.Mesh(trayGeom, brassMat);
    tray.position.y = tierY;
    tray.castShadow = true;
    tower.add(tray);

    // 6 glowing diyas per tier
    const diyaCount = 6;
    for (let d = 0; d < diyaCount; d++) {
      const angle = (d * Math.PI * 2) / diyaCount;
      const flameGeom = new THREE.SphereGeometry(0.06, 6, 6);
      const flame = new THREE.Mesh(flameGeom, flameMat);
      flame.position.set(
        Math.cos(angle) * (trayRadius - 0.08),
        tierY + 0.12,
        Math.sin(angle) * (trayRadius - 0.08)
      );
      tower.add(flame);
    }
  }

  // Pinnacle Kalash top
  const kalashGeom = new THREE.SphereGeometry(0.35, 12, 12);
  const kalash = new THREE.Mesh(kalashGeom, brassMat);
  kalash.position.y = height + 0.35;
  kalash.scale.set(0.8, 1.4, 0.8);
  tower.add(kalash);

  return tower;
}

/**
 * Main builder for the 5 Indian Cultural Stages in 3D WebGL
 */
export function buildIndianStage3D(stageId: string = 'stage_kala_chakra_time'): IndianStage3DResult {
  const group = new THREE.Group();
  const animatedElements: AnimatedStageItem[] = [];

  // Normalize ID (defaulting to Kala Chakra if empty)
  const activeId = stageId || 'stage_kala_chakra_time';

  // -------------------------------------------------------------
  // THEME 1: TIME - KALA CHAKRA (Konark Sun Temple of Cosmic Time)
  // -------------------------------------------------------------
  if (activeId === 'stage_kala_chakra_time') {
    const lighting: StageLightingConfig = {
      bgColor: 0x140a04,
      fogColor: 0x221006,
      fogDensity: 0.022,
      ambientIntensity: 0.7,
      ambientColor: 0xffedd5,
      keyLightColor: 0xffd275,
      keyLightIntensity: 1.55,
      spotLeftColor: 0xf59e0b, // Solar Amber
      spotRightColor: 0xef4444, // Vermillion Surya
      particleColor: 0xfbbf24,
      particleCount: 160,
      boundaryLaserColor: 0xf59e0b,
    };

    // 1. Carved Sandstone Combat Floor with Central Sunburst Mandala
    const floorGeom = new THREE.PlaneGeometry(38, 26, 32, 24);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3d2112,
      roughness: 0.8,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = GROUND_Y;
    floor.receiveShadow = true;
    group.add(floor);

    // Central Sun Mandala Disc
    const mandalaGeom = new THREE.RingGeometry(0.2, 5.2, 32);
    mandalaGeom.rotateX(-Math.PI / 2);
    const mandalaMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const mandala = new THREE.Mesh(mandalaGeom, mandalaMat);
    mandala.position.y = GROUND_Y + 0.02;
    group.add(mandala);

    // 2. Two Monumental Konark Sun Wheels (Left and Right)
    const leftWheel = createKonarkSunWheel(4.2);
    leftWheel.position.set(-11.5, 4.4, -6.5);
    group.add(leftWheel);
    animatedElements.push({
      type: 'rotateZ',
      object: leftWheel,
      speed: 0.08, // rotates slowly clockwise symbolizing eternal time flow
    });

    const rightWheel = createKonarkSunWheel(4.2);
    rightWheel.position.set(11.5, 4.4, -6.5);
    group.add(rightWheel);
    animatedElements.push({
      type: 'rotateZ',
      object: rightWheel,
      speed: -0.08, // rotates slowly counter-clockwise
    });

    // 3. Sandstone Temple Shikhara Pillars in Background
    const pillarGeom = new THREE.BoxGeometry(1.2, 9.5, 1.2);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c18,
      roughness: 0.9,
      metalness: 0.1,
    });

    for (let i = -4; i <= 4; i++) {
      if (Math.abs(i) === 0) continue; // Leave center open for action
      const p = new THREE.Mesh(pillarGeom, pillarMat);
      p.position.set(i * 3.4, 4.75, -9.5);
      p.castShadow = true;
      p.receiveShadow = true;
      group.add(p);

      // Top cornice
      const corniceGeom = new THREE.BoxGeometry(1.6, 0.45, 1.6);
      const cornice = new THREE.Mesh(corniceGeom, pillarMat);
      cornice.position.set(i * 3.4, 9.6, -9.5);
      group.add(cornice);
    }

    return { group, animatedElements, lighting };
  }

  // -----------------------------------------------------------------
  // THEME 2: SPACE - ANTARIKSHA (Vedic Cosmic Astral Void & Navagrahas)
  // -----------------------------------------------------------------
  if (activeId === 'stage_antariksha_space') {
    const lighting: StageLightingConfig = {
      bgColor: 0x03020c,
      fogColor: 0x08041a,
      fogDensity: 0.018,
      ambientIntensity: 0.55,
      ambientColor: 0xc7d2fe,
      keyLightColor: 0xa5b4fc,
      keyLightIntensity: 1.35,
      spotLeftColor: 0x8b5cf6, // Deep Violet Astral
      spotRightColor: 0x06b6d4, // Cyan Celestial Ray
      particleColor: 0x818cf8,
      particleCount: 260,
      boundaryLaserColor: 0x8b5cf6,
    };

    // 1. Polished Obsidian Floor with Glowing Celestial Orbit Rings
    const floorGeom = new THREE.PlaneGeometry(38, 26, 24, 24);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090a14,
      roughness: 0.25,
      metalness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = GROUND_Y;
    floor.receiveShadow = true;
    group.add(floor);

    // Glowing Concentric Celestial Coordinate Rings
    const ringRadii = [3.5, 6.5, 9.5];
    ringRadii.forEach((r, idx) => {
      const ringGeom = new THREE.RingGeometry(r, r + 0.06, 48);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x818cf8 : 0x06b6d4,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.y = GROUND_Y + 0.02;
      group.add(ring);
    });

    // 2. 4 3D Floating Planetary Orbs (Navagrahas) in Deep Space
    // Surya/Sun Orb (Golden Orange Glowing)
    const suryaGeom = new THREE.SphereGeometry(1.8, 24, 24);
    const suryaMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const surya = new THREE.Mesh(suryaGeom, suryaMat);
    surya.position.set(-8, 8.5, -16);
    group.add(surya);
    animatedElements.push({ type: 'bobY', object: surya, baseY: 8.5 });

    // Chandra Orb (Silver-Pearl Moon)
    const chandraGeom = new THREE.SphereGeometry(1.1, 20, 20);
    const chandraMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.4,
      metalness: 0.5,
    });
    const chandra = new THREE.Mesh(chandraGeom, chandraMat);
    chandra.position.set(7.5, 9.2, -15);
    group.add(chandra);
    animatedElements.push({ type: 'bobY', object: chandra, baseY: 9.2 });

    // Brihaspati (Jupiter) with Golden Tilt Ring
    const brihaspatiGeom = new THREE.SphereGeometry(1.4, 20, 20);
    const brihaspatiMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.6,
      metalness: 0.2,
    });
    const brihaspati = new THREE.Mesh(brihaspatiGeom, brihaspatiMat);
    brihaspati.position.set(-3, 6.8, -19);
    const ringJupGeom = new THREE.TorusGeometry(2.2, 0.08, 8, 32);
    ringJupGeom.rotateX(Math.PI / 3);
    const ringJup = new THREE.Mesh(ringJupGeom, new THREE.MeshBasicMaterial({ color: 0xfde047 }));
    brihaspati.add(ringJup);
    group.add(brihaspati);
    animatedElements.push({ type: 'rotateY', object: brihaspati, speed: 0.15 });

    // 3. Grand Vedic Nakshatra Astrolabe Ring in deep background
    const nakshatraRingGeom = new THREE.TorusGeometry(8.5, 0.12, 12, 64);
    const nakshatraRing = new THREE.Mesh(
      nakshatraRingGeom,
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.5 })
    );
    nakshatraRing.position.set(0, 6.5, -18);
    group.add(nakshatraRing);
    animatedElements.push({ type: 'rotateZ', object: nakshatraRing, speed: 0.05 });

    return { group, animatedElements, lighting };
  }

  // ---------------------------------------------------------------------------------
  // THEME 3: SPACE / OBSERVATORY - JANTAR MANTAR (Astronomical Celestial Geometry)
  // ---------------------------------------------------------------------------------
  if (activeId === 'stage_jantar_mantar_space') {
    const lighting: StageLightingConfig = {
      bgColor: 0x07111c,
      fogColor: 0x0c1e2e,
      fogDensity: 0.02,
      ambientIntensity: 0.72,
      ambientColor: 0xe0f2fe,
      keyLightColor: 0xffffff,
      keyLightIntensity: 1.5,
      spotLeftColor: 0xf43f5e, // Jaipur Terracotta Rose
      spotRightColor: 0x06b6d4, // Astrolabe Cyan
      particleColor: 0x38bdf8,
      particleCount: 170,
      boundaryLaserColor: 0x06b6d4,
    };

    // 1. Jaipur Pink Stone Floor with Inlaid White Marble Meridian Lines
    const floorGeom = new THREE.PlaneGeometry(38, 26, 24, 24);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3b1c24,
      roughness: 0.75,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = GROUND_Y;
    floor.receiveShadow = true;
    group.add(floor);

    // Marble Meridian Center Line
    const meridianGeom = new THREE.PlaneGeometry(0.4, 26);
    meridianGeom.rotateX(-Math.PI / 2);
    const meridianMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    const meridian = new THREE.Mesh(meridianGeom, meridianMat);
    meridian.position.set(0, GROUND_Y + 0.02, 0);
    group.add(meridian);

    // 2. Monumental Samrat Yantra Gnomon Ramp placed far in background flank to preserve open fighting arena
    const samratYantra = createSamratYantra();
    samratYantra.scale.set(0.45, 0.45, 0.45);
    samratYantra.position.set(-18, 0, -17);
    group.add(samratYantra);

    // 3. Jai Prakash Yantra Hemispherical Bowl Silhouettes on Left & Right
    const bowlMat = new THREE.MeshStandardMaterial({
      color: 0x5a2d36,
      roughness: 0.7,
      metalness: 0.2,
    });

    const leftBowlGeom = new THREE.SphereGeometry(3.0, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    leftBowlGeom.rotateX(Math.PI);
    const leftBowl = new THREE.Mesh(leftBowlGeom, bowlMat);
    leftBowl.position.set(-14, 2.5, -9);
    group.add(leftBowl);

    const rightBowlGeom = new THREE.SphereGeometry(3.0, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    rightBowlGeom.rotateX(Math.PI);
    const rightBowl = new THREE.Mesh(rightBowlGeom, bowlMat);
    rightBowl.position.set(14, 2.5, -9);
    group.add(rightBowl);

    return { group, animatedElements, lighting };
  }

  // ---------------------------------------------------------------------------------
  // THEME 4: FOREST - DANDAKARANYA (Sacred Vedic Forest & Ancient Banyan Grove)
  // ---------------------------------------------------------------------------------
  if (activeId === 'stage_dandakaranya_forest') {
    const lighting: StageLightingConfig = {
      bgColor: 0x02120b,
      fogColor: 0x051f13,
      fogDensity: 0.028,
      ambientIntensity: 0.65,
      ambientColor: 0xdcfce7,
      keyLightColor: 0xa7f3d0, // Filtered Moonlight
      keyLightIntensity: 1.4,
      spotLeftColor: 0x10b981, // Emerald Bioluminescence
      spotRightColor: 0xf59e0b, // Warm Hermit Fire
      particleColor: 0x34d399,
      particleCount: 190,
      boundaryLaserColor: 0x10b981,
    };

    // 1. Mossy Ancient Stone Flagstone Floor
    const floorGeom = new THREE.PlaneGeometry(38, 26, 24, 24);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f2016,
      roughness: 0.9,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = GROUND_Y;
    floor.receiveShadow = true;
    group.add(floor);

    // Encroaching Moss Ring Overlays
    const mossGrid = new THREE.GridHelper(26, 18, 0x10b981, 0x064e3b);
    mossGrid.position.y = GROUND_Y + 0.01;
    group.add(mossGrid);

    // 2. Colossal Banyan Trees Flanking Background Left, Right, & Off-Center
    const banyanLeft = createBanyanTree(10, 1.4);
    banyanLeft.position.set(-10, 0, -8);
    group.add(banyanLeft);

    const banyanRight = createBanyanTree(9.5, 1.3);
    banyanRight.position.set(10, 0, -8.5);
    group.add(banyanRight);

    // 3. Ancient Mossy Stone Shrine / Lingam Pedestal in Background
    const shrineMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.95,
      metalness: 0.1,
    });

    const shrineBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.0, 1.2, 12),
      shrineMat
    );
    shrineBase.position.set(0, 0.6, -9.5);
    shrineBase.castShadow = true;
    group.add(shrineBase);

    const lingam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 2.2, 16),
      shrineMat
    );
    lingam.position.set(0, 2.0, -9.5);
    lingam.castShadow = true;
    group.add(lingam);

    return { group, animatedElements, lighting };
  }

  // ---------------------------------------------------------------------------------
  // THEME 5: GATHERING - MAHA KUMBH (Twilight Ghats Festival of Lights & Sacred Sangam)
  // ---------------------------------------------------------------------------------
  if (activeId === 'stage_kumbh_sangam_gathering') {
    const lighting: StageLightingConfig = {
      bgColor: 0x1c0904,
      fogColor: 0x270f07,
      fogDensity: 0.024,
      ambientIntensity: 0.75,
      ambientColor: 0xffedd5,
      keyLightColor: 0xfde047, // Golden Twilight Sunset
      keyLightIntensity: 1.6,
      spotLeftColor: 0xf97316, // Saffron Sacred Light
      spotRightColor: 0xdc2626, // Crimson Aarti Fire
      particleColor: 0xf97316,
      particleCount: 200,
      boundaryLaserColor: 0xf97316,
    };

    // 1. Wet Riverbank Stone Pavement Floor Reflecting Lanterns
    const floorGeom = new THREE.PlaneGeometry(38, 26, 24, 24);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x29150d,
      roughness: 0.35,
      metalness: 0.55,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = GROUND_Y;
    floor.receiveShadow = true;
    group.add(floor);

    // Warm Lantern Water Reflection Strip on boundary edge
    const waterGeom = new THREE.PlaneGeometry(38, 4);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x150905,
      roughness: 0.15,
      metalness: 0.85,
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.set(0, GROUND_Y + 0.01, -11.5);
    group.add(water);

    // 2. Terraced Sandstone Ghat Steps Descending across Background
    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x422013,
      roughness: 0.85,
      metalness: 0.1,
    });

    for (let s = 0; s < 5; s++) {
      const stepGeom = new THREE.BoxGeometry(38, 0.65, 1.8);
      const step = new THREE.Mesh(stepGeom, stepMat);
      step.position.set(0, s * 0.65 + 0.32, -8 - s * 1.5);
      step.receiveShadow = true;
      group.add(step);
    }

    // 3. 4 Towering Brass Deepastambhas (Ceremonial Lamp Towers with glowing diyas)
    const towerPositions = [-9.5, -4.0, 4.0, 9.5];
    towerPositions.forEach(x => {
      const lampTower = createDeepastambha(6.8);
      lampTower.position.set(x, 0, -7.5);
      group.add(lampTower);
    });

    // 4. Temple Mandir Shikhara Spire Silhouettes in the Evening Horizon
    const shikharaMat = new THREE.MeshStandardMaterial({
      color: 0x200d07,
      roughness: 0.9,
    });
    for (let k = -2; k <= 2; k++) {
      const spireGeom = new THREE.ConeGeometry(2.0, 8.5, 4);
      const spire = new THREE.Mesh(spireGeom, shikharaMat);
      spire.position.set(k * 7.5, 7.5, -16);
      group.add(spire);
    }

    return { group, animatedElements, lighting };
  }

  // -------------------------------------------------------------
  // Default / Legacy Arena Fallback
  // -------------------------------------------------------------
  const lighting: StageLightingConfig = {
    bgColor: 0x050508,
    fogColor: 0x080914,
    fogDensity: 0.025,
    ambientIntensity: 0.65,
    ambientColor: 0xffffff,
    keyLightColor: 0xfff3d6,
    keyLightIntensity: 1.4,
    spotLeftColor: 0x06b6d4,
    spotRightColor: 0xf59e0b,
    particleColor: 0xfbbf24,
    particleCount: 140,
    boundaryLaserColor: 0xef4444,
  };

  const floorGeom = new THREE.PlaneGeometry(36, 24, 36, 24);
  floorGeom.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x12141c,
    roughness: 0.35,
    metalness: 0.7,
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.position.y = GROUND_Y;
  floor.receiveShadow = true;
  group.add(floor);

  const gridHelper = new THREE.GridHelper(26, 26, 0xf59e0b, 0x334155);
  gridHelper.position.y = GROUND_Y + 0.01;
  group.add(gridHelper);

  return { group, animatedElements, lighting };
}
