import * as THREE from 'three';

export interface CheeringCrowd3DSystem {
  group: THREE.Group;
  update: (delta: number, elapsedTime: number, excitementLevel: number) => void;
  triggerFlash: () => void;
}

interface SpectatorData {
  root: THREE.Group;
  baseY: number;
  baseX: number;
  phase: number;
  speed: number;
  cheerType: 'fist_right' | 'fist_both' | 'flag_wave' | 'clap' | 'jump';
  leftArm?: THREE.Group;
  rightArm?: THREE.Group;
  head?: THREE.Mesh;
  flag?: THREE.Group;
  flashLight?: THREE.PointLight;
}

/**
 * Creates an animated 3D crowd of human spectators cheering in the background
 * along with moving tournament banners and atmospheric drifting mist/clouds.
 */
export function createCheeringCrowd3D(arenaHalfWidth: number = 9.5): CheeringCrowd3DSystem {
  const crowdGroup = new THREE.Group();
  crowdGroup.name = 'CheeringCrowd3D';

  const spectators: SpectatorData[] = [];
  const movingClouds: { mesh: THREE.Mesh; speed: number; resetX: number; startX: number }[] = [];
  const flutteringFlags: { mesh: THREE.Mesh; baseRotZ: number; phase: number }[] = [];

  // =========================================================================
  // 1. Moving Atmospheric Clouds & Sky Mist in Background
  // =========================================================================
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 256;
  cloudCanvas.height = 128;
  const cctx = cloudCanvas.getContext('2d');
  if (cctx) {
    const grad = cctx.createRadialGradient(128, 64, 10, 128, 64, 110);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.5, 'rgba(240, 240, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    cctx.fillStyle = grad;
    cctx.fillRect(0, 0, 256, 128);
  }
  const cloudTexture = new THREE.CanvasTexture(cloudCanvas);

  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  // 6 drifting horizontal cloud bands at Z = -16 to -18
  for (let c = 0; c < 6; c++) {
    const cloudGeom = new THREE.PlaneGeometry(12 + Math.random() * 8, 4 + Math.random() * 3);
    const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
    const startX = -28 + c * 10 + (Math.random() - 0.5) * 4;
    const posY = 7.0 + (c % 3) * 2.2 + Math.random() * 1.5;
    const posZ = -16.5 - (c % 2) * 1.5;
    cloudMesh.position.set(startX, posY, posZ);
    crowdGroup.add(cloudMesh);

    movingClouds.push({
      mesh: cloudMesh,
      speed: 0.4 + Math.random() * 0.35,
      startX: -30,
      resetX: 30,
    });
  }

  // =========================================================================
  // 2. Spectator Grandstand & Railing Barrier
  // =========================================================================
  const railingZ = -3.8;
  const railingY = 1.05;

  // Stone Stadium Step / Pedestal Platform
  const stepGeom = new THREE.BoxGeometry(arenaHalfWidth * 2 + 4, 0.5, 2.2);
  const stepMat = new THREE.MeshStandardMaterial({
    color: 0x22242e,
    roughness: 0.9,
    metalness: 0.1,
  });
  const stepMesh = new THREE.Mesh(stepGeom, stepMat);
  stepMesh.position.set(0, 0.25, railingZ - 0.7);
  stepMesh.receiveShadow = true;
  crowdGroup.add(stepMesh);

  // Upper Step for elevated back-row spectators
  const upperStepGeom = new THREE.BoxGeometry(arenaHalfWidth * 2 + 4, 0.8, 1.8);
  const upperStepMesh = new THREE.Mesh(upperStepGeom, stepMat);
  upperStepMesh.position.set(0, 0.4, railingZ - 1.8);
  upperStepMesh.receiveShadow = true;
  crowdGroup.add(upperStepMesh);

  // Protective Crowd Perimeter Railing (horizontal bars)
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.75,
    roughness: 0.25,
  });

  const railGeom = new THREE.CylinderGeometry(0.04, 0.04, arenaHalfWidth * 2 + 3, 12);
  railGeom.rotateZ(Math.PI / 2);

  // Top handrail
  const topRail = new THREE.Mesh(railGeom, railMat);
  topRail.position.set(0, railingY, railingZ);
  crowdGroup.add(topRail);

  // Middle rail
  const midRail = new THREE.Mesh(railGeom, railMat);
  midRail.position.set(0, railingY * 0.55, railingZ);
  crowdGroup.add(midRail);

  // Railing vertical stanchions every 2.4 units
  const stanchionGeom = new THREE.CylinderGeometry(0.05, 0.05, railingY, 8);
  const stanchionCount = Math.floor((arenaHalfWidth * 2) / 2.2);
  for (let s = 0; s <= stanchionCount; s++) {
    const sx = -arenaHalfWidth + s * 2.2;
    const stanchion = new THREE.Mesh(stanchionGeom, railMat);
    stanchion.position.set(sx, railingY / 2, railingZ);
    crowdGroup.add(stanchion);

    // Add colorful tournament triangular pennants on railing
    if (s % 2 === 0 && s < stanchionCount) {
      const pennantGeom = new THREE.BufferGeometry();
      const pWidth = 1.0;
      const pHeight = 0.55;
      const vertices = new Float32Array([
        sx, railingY, railingZ,
        sx + pWidth, railingY, railingZ,
        sx + pWidth / 2, railingY - pHeight, railingZ + 0.05,
      ]);
      pennantGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      pennantGeom.computeVertexNormals();

      const flagColors = [0xef4444, 0xf59e0b, 0x10b981, 0x06b6d4, 0x8b5cf6, 0xec4899];
      const pennantMat = new THREE.MeshStandardMaterial({
        color: flagColors[s % flagColors.length],
        roughness: 0.6,
        side: THREE.DoubleSide,
      });
      const pennantMesh = new THREE.Mesh(pennantGeom, pennantMat);
      crowdGroup.add(pennantMesh);
    }
  }

  // =========================================================================
  // 3. Human Spectators (Cheering, Fist Pumping, Waving, Clapping)
  // =========================================================================
  // Vibrant attire colors for crowd variety (martial fans, monks, tournament spectators)
  const shirtColors = [
    0xef4444, // Red
    0xf59e0b, // Amber / Saffron
    0x10b981, // Emerald Green
    0x06b6d4, // Cyan / Sky Blue
    0x3b82f6, // Royal Blue
    0x8b5cf6, // Violet / Purple
    0xf43f5e, // Rose
    0xf8fafc, // Pure White
    0xd97706, // Golden Ochre
    0x0284c7, // Marine Teal
    0x4f46e5, // Indigo
  ];

  const skinTones = [
    0xe0ac69, // Warm golden brown
    0xc68642, // Sandalwood
    0x8d5524, // Deep bronze
    0xf1c27d, // Fair wheat
    0xffdbac, // Light peach
  ];

  const hairColors = [
    0x171717, // Jet black
    0x292524, // Dark brown
    0x44403c, // Espresso
    0xffffff, // White / turban
  ];

  // Helper function to create one stylized 3D Human Spectator
  function createSpectator(
    x: number,
    y: number,
    z: number,
    cheerType: 'fist_right' | 'fist_both' | 'flag_wave' | 'clap' | 'jump',
    index: number
  ): SpectatorData {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    crowdGroup.add(root);

    const shirtColor = shirtColors[index % shirtColors.length];
    const skinTone = skinTones[index % skinTones.length];
    const hairColor = hairColors[index % hairColors.length];

    const skinMat = new THREE.MeshStandardMaterial({
      color: skinTone,
      roughness: 0.6,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: shirtColor,
      roughness: 0.7,
      metalness: 0.1,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
    });

    // 1. Legs / Trousers
    const legGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.85, 8);
    const leftLeg = new THREE.Mesh(legGeom, pantsMat);
    leftLeg.position.set(-0.16, 0.42, 0);
    root.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, pantsMat);
    rightLeg.position.set(0.16, 0.42, 0);
    root.add(rightLeg);

    // 2. Torso with Shirt / Vest
    const torsoGeom = new THREE.BoxGeometry(0.55, 0.72, 0.32);
    const torso = new THREE.Mesh(torsoGeom, shirtMat);
    torso.position.set(0, 1.18, 0);
    torso.castShadow = true;
    root.add(torso);

    // 3. Head & Hair / Headband / Turban
    const headGeom = new THREE.SphereGeometry(0.2, 12, 12);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.position.set(0, 1.74, 0);
    root.add(head);

    // Hair or Turban on head
    const hasTurban = index % 3 === 0;
    if (hasTurban) {
      const turbanGeom = new THREE.TorusGeometry(0.21, 0.09, 8, 16);
      turbanGeom.rotateX(Math.PI / 2);
      const turbanMat = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0xf59e0b : 0xef4444,
        roughness: 0.6,
      });
      const turban = new THREE.Mesh(turbanGeom, turbanMat);
      turban.position.set(0, 1.78, 0);
      root.add(turban);
    } else {
      const hairGeom = new THREE.SphereGeometry(0.21, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
      const hair = new THREE.Mesh(hairGeom, hairMat);
      hair.position.set(0, 1.77, 0);
      root.add(hair);
    }

    // 4. Arms with dynamic shoulder pivot points
    const armGeom = new THREE.CylinderGeometry(0.07, 0.06, 0.58, 8);
    armGeom.translate(0, 0.29, 0); // pivot at shoulder

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 1.45, 0);
    const leftArmMesh = new THREE.Mesh(armGeom, shirtMat);
    leftArmGroup.add(leftArmMesh);

    // Hand
    const handGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const leftHand = new THREE.Mesh(handGeom, skinMat);
    leftHand.position.set(0, 0.6, 0);
    leftArmGroup.add(leftHand);
    root.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 1.45, 0);
    const rightArmMesh = new THREE.Mesh(armGeom, shirtMat);
    rightArmGroup.add(rightArmMesh);

    const rightHand = new THREE.Mesh(handGeom, skinMat);
    rightHand.position.set(0, 0.6, 0);
    rightArmGroup.add(rightHand);
    root.add(rightArmGroup);

    // 5. Specialized Props: Flag / Banner or Flashing Camera
    let flagGroup: THREE.Group | undefined;
    let cameraFlash: THREE.PointLight | undefined;

    if (cheerType === 'flag_wave') {
      flagGroup = new THREE.Group();
      flagGroup.position.set(0, 0.6, 0);

      // Flag pole
      const poleGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.set(0, 0.5, 0);
      flagGroup.add(pole);

      // Cloth banner
      const bannerGeom = new THREE.PlaneGeometry(0.8, 0.45);
      const bannerMat = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0xf59e0b : 0x3b82f6,
        roughness: 0.6,
        side: THREE.DoubleSide,
      });
      const banner = new THREE.Mesh(bannerGeom, bannerMat);
      banner.position.set(0.42, 0.95, 0);
      flagGroup.add(banner);

      rightArmGroup.add(flagGroup);
    } else if (index === 4 || index === 14) {
      // Spectator with digital camera that flashes
      cameraFlash = new THREE.PointLight(0xffffff, 0, 8);
      cameraFlash.position.set(0, 1.45, 0.4);
      root.add(cameraFlash);
    }

    return {
      root,
      baseY: y,
      baseX: x,
      phase: index * 0.85,
      speed: 2.8 + (index % 5) * 0.45,
      cheerType,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      head,
      flag: flagGroup,
      flashLight: cameraFlash,
    };
  }

  // Generate 20 human spectators in 2 layered rows along the arena background
  const totalSpectators = 20;
  const cheerTypes: ('fist_right' | 'fist_both' | 'flag_wave' | 'clap' | 'jump')[] = [
    'fist_right',
    'fist_both',
    'flag_wave',
    'jump',
    'clap',
    'fist_right',
    'jump',
    'fist_both',
    'flag_wave',
    'clap',
  ];

  for (let i = 0; i < totalSpectators; i++) {
    const isBackRow = i % 2 === 1;
    const progress = (i / totalSpectators);
    const span = arenaHalfWidth * 1.8;
    const x = -span / 2 + progress * span + (Math.random() - 0.5) * 0.4;
    const y = isBackRow ? 0.4 : 0.0;
    const z = isBackRow ? railingZ - 1.2 : railingZ - 0.45;
    const cheerType = cheerTypes[i % cheerTypes.length];

    spectators.push(createSpectator(x, y, z, cheerType, i));
  }

  // =========================================================================
  // 4. Update Function (Animations on Every Frame)
  // =========================================================================
  let manualFlashTimer = 0;

  function update(delta: number, elapsedTime: number, excitementLevel: number) {
    // A. Animate drifting background clouds
    movingClouds.forEach(cloud => {
      cloud.mesh.position.x += delta * cloud.speed;
      if (cloud.mesh.position.x > cloud.resetX) {
        cloud.mesh.position.x = cloud.startX;
      }
    });

    // B. Handle manual flash timer (e.g. from heavy hits)
    if (manualFlashTimer > 0) {
      manualFlashTimer -= delta;
    }

    // C. Animate each human spectator
    spectators.forEach(spec => {
      const effectiveSpeed = spec.speed * (1.0 + (excitementLevel - 1.0) * 0.6);
      const t = elapsedTime * effectiveSpeed + spec.phase;

      // 1. Bobbing / Jumping up and down
      const jumpIntensity = (spec.cheerType === 'jump' ? 0.35 : 0.12) * excitementLevel;
      const bounce = Math.abs(Math.sin(t)) * jumpIntensity;
      spec.root.position.y = spec.baseY + bounce;

      // 2. Head nodding / looking at fighters
      if (spec.head) {
        spec.head.rotation.x = Math.sin(t * 1.2) * 0.12;
        spec.head.rotation.y = Math.cos(t * 0.8) * 0.18;
      }

      // 3. Arm Cheering Animations
      switch (spec.cheerType) {
        case 'fist_right':
          if (spec.rightArm) {
            // Right arm pumps high into the air
            spec.rightArm.rotation.x = -Math.PI * 0.85 + Math.sin(t) * 0.45 * excitementLevel;
            spec.rightArm.rotation.z = -0.2;
          }
          if (spec.leftArm) {
            // Left arm holds railing or pumps gently
            spec.leftArm.rotation.x = -Math.PI * 0.2 + Math.sin(t * 0.5) * 0.15;
          }
          break;

        case 'fist_both':
        case 'jump':
          if (spec.rightArm) {
            spec.rightArm.rotation.x = -Math.PI * 0.8 + Math.sin(t) * 0.4 * excitementLevel;
            spec.rightArm.rotation.z = -0.3;
          }
          if (spec.leftArm) {
            spec.leftArm.rotation.x = -Math.PI * 0.8 + Math.sin(t + 0.3) * 0.4 * excitementLevel;
            spec.leftArm.rotation.z = 0.3;
          }
          break;

        case 'flag_wave':
          if (spec.rightArm) {
            spec.rightArm.rotation.x = -Math.PI * 0.75;
            spec.rightArm.rotation.z = Math.sin(t * 1.5) * 0.45;
          }
          if (spec.leftArm) {
            spec.leftArm.rotation.x = -Math.PI * 0.25;
          }
          break;

        case 'clap':
          if (spec.rightArm && spec.leftArm) {
            const clapAngle = Math.abs(Math.sin(t * 1.8)) * 0.35;
            spec.rightArm.rotation.x = -Math.PI * 0.45;
            spec.rightArm.rotation.z = -clapAngle;
            spec.leftArm.rotation.x = -Math.PI * 0.45;
            spec.leftArm.rotation.z = clapAngle;
          }
          break;
      }

      // 4. Camera flash effects from spectators
      if (spec.flashLight) {
        const isCameraPopping = (Math.sin(elapsedTime * 2.8 + spec.phase) > 0.94) || manualFlashTimer > 0;
        spec.flashLight.intensity = isCameraPopping ? 6.5 * excitementLevel : 0;
      }
    });
  }

  function triggerFlash() {
    manualFlashTimer = 0.25;
  }

  return {
    group: crowdGroup,
    update,
    triggerFlash,
  };
}
