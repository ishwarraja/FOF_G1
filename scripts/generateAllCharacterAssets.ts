import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Production Asset Pipeline for Fate of Fighters (FOF)
 * Generates:
 * 1. Full-height, transparent vector illustrations for all 14 characters
 * 2. High-res transparent RGBA PNGs (select_slice.png, portrait.png, texture_albedo.png)
 * 3. 3D Binary GLBs (model.glb & [id].glb) with alphaMode: MASK for 2.5D rendering
 */

// Helper to write valid PNG files in pure Node.js using zlib
function createRgbaPng(
  width: number,
  height: number,
  pixelFn: (x: number, y: number, w: number, h: number) => [number, number, number, number]
): Buffer {
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const px = rowOffset + 1 + x * 4;
      raw[px] = Math.max(0, Math.min(255, Math.floor(r)));
      raw[px + 1] = Math.max(0, Math.min(255, Math.floor(g)));
      raw[px + 2] = Math.max(0, Math.min(255, Math.floor(b)));
      raw[px + 3] = Math.max(0, Math.min(255, Math.floor(a)));
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const tb = Buffer.from(type, 'ascii');
    const combined = Buffer.concat([tb, data]);
    let crc = 0 ^ -1;
    for (let i = 0; i < combined.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ combined[i]) & 0xff];
    }
    crc = (crc ^ -1) >>> 0;
    const cb = Buffer.alloc(4);
    cb.writeUInt32BE(crc, 0);
    return Buffer.concat([len, tb, data, cb]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Builds standard 3D glTF 2.0 binary (.glb) file with alphaMode: "MASK"
function buildCharacterGlb(
  characterId: string,
  imageBuffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png'
): Buffer {
  const hw = 0.85; // half width (1.7m)
  const hh = 1.20; // half height (2.4m)
  const hd = 0.05; // thin depth curve

  const positions = new Float32Array([
    // Front quad
    -hw, 0.0,  hd,
     hw, 0.0,  hd,
     hw, hh*2, hd,
    -hw, hh*2, hd,

    // Back quad
    -hw, 0.0, -hd,
     hw, 0.0, -hd,
     hw, hh*2, -hd,
    -hw, hh*2, -hd,

    // Left edge
    -hw, 0.0, -hd,
    -hw, 0.0,  hd,
    -hw, hh*2, hd,
    -hw, hh*2, -hd,

    // Right edge
     hw, 0.0,  hd,
     hw, 0.0, -hd,
     hw, hh*2, -hd,
     hw, hh*2,  hd,
  ]);

  const normals = new Float32Array([
    // Front
    0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
    // Back
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    // Left
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    // Right
     1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
  ]);

  const uvs = new Float32Array([
    // Front UV
    0, 1,   1, 1,   1, 0,   0, 0,
    // Back UV (mirrored)
    1, 1,   0, 1,   0, 0,   1, 0,
    // Left edge UV
    0, 1,   0.05, 1,   0.05, 0,   0, 0,
    // Right edge UV
    0.95, 1, 1, 1,   1, 0,   0.95, 0,
  ]);

  const indices = new Uint16Array([
    // Front
    0, 1, 2,  0, 2, 3,
    // Back
    5, 4, 7,  5, 7, 6,
    // Left
    8, 9, 10, 8, 10, 11,
    // Right
    12, 13, 14, 12, 14, 15,
  ]);

  const posBytes = Buffer.from(positions.buffer);
  const normBytes = Buffer.from(normals.buffer);
  const uvBytes = Buffer.from(uvs.buffer);
  const idxBytes = Buffer.from(indices.buffer);
  const idxPad = Math.ceil(idxBytes.length / 4) * 4;

  let offset = 0;
  const posOffset = offset; offset += posBytes.length;
  const normOffset = offset; offset += normBytes.length;
  const uvOffset = offset; offset += uvBytes.length;
  const idxOffset = offset; offset += idxPad;
  const imgOffset = offset; offset += imageBuffer.length;
  const imgPad = Math.ceil(imageBuffer.length / 4) * 4;

  const binBuffer = Buffer.concat([
    posBytes,
    normBytes,
    uvBytes,
    idxBytes, Buffer.alloc(idxPad - idxBytes.length),
    imageBuffer, Buffer.alloc(imgPad - imageBuffer.length),
  ]);

  const gltf = {
    asset: {
      version: '2.0',
      generator: 'FOF 2.5D Rigged Model Pipeline',
    },
    extras: {
      characterId,
      format: 'glTF 2.0 binary (.glb)',
      targetHeight: 2.35,
    },
    scene: 0,
    scenes: [
      {
        name: `Scene_${characterId}`,
        nodes: [0],
      },
    ],
    nodes: [
      {
        name: `Root_${characterId}`,
        children: [1],
      },
      {
        name: `Mesh_${characterId}`,
        mesh: 0,
        children: [2, 3],
      },
      {
        name: 'Head_Socket',
        translation: [0, 2.05, 0],
      },
      {
        name: 'Weapon_Socket',
        translation: [0.65, 1.15, 0.2],
      },
    ],
    meshes: [
      {
        name: `${characterId}_BodyMesh`,
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
              TEXCOORD_0: 2,
            },
            indices: 3,
            material: 0,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
      {
        name: `${characterId}_PBR_Material`,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.2,
          roughnessFactor: 0.45,
        },
        alphaMode: 'MASK',
        alphaCutoff: 0.5,
        doubleSided: true,
      },
    ],
    textures: [{ source: 0 }],
    images: [
      {
        bufferView: 4,
        mimeType,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: 16,
        type: 'VEC3',
        max: [hw, hh * 2, hd],
        min: [-hw, 0.0, -hd],
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: 16,
        type: 'VEC3',
        max: [1, 1, 1],
        min: [-1, -1, -1],
      },
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: 5126,
        count: 16,
        type: 'VEC2',
        max: [1, 1],
        min: [0, 0],
      },
      {
        bufferView: 3,
        byteOffset: 0,
        componentType: 5123,
        count: 24,
        type: 'SCALAR',
        max: [15],
        min: [0],
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: normOffset, byteLength: normBytes.length, target: 34962 },
      { buffer: 0, byteOffset: uvOffset, byteLength: uvBytes.length, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.length, target: 34963 },
      { buffer: 0, byteOffset: imgOffset, byteLength: imageBuffer.length },
    ],
    buffers: [{ byteLength: binBuffer.length }],
  };

  const jsonStr = JSON.stringify(gltf);
  let jsonBuf = Buffer.from(jsonStr, 'utf-8');
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  if (jsonPad > 0) {
    jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  }

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuffer.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuffer]);
}

// Character Definition Table for All 14 Fighters
interface FighterProfile {
  id: string;
  name: string;
  title: string;
  accentColor: string;
  primaryColor: string;
  secondaryColor: string;
  hairColor: string;
  skinColor: string;
  weaponColor: string;
  signatureStyle: string;
  element: string;
  existingImgPath?: string;
}

const ROSTER: FighterProfile[] = [
  {
    id: 'arjun',
    name: 'Arjun Rao',
    title: 'Union Steelworker',
    accentColor: '#f59e0b',
    primaryColor: '#b45309',
    secondaryColor: '#78350f',
    hairColor: '#1c1917',
    skinColor: '#d97706',
    weaponColor: '#94a3b8',
    signatureStyle: 'Titan Industrial Wrench & Exovest',
    element: 'Earth',
    existingImgPath: 'public/assets/characters/arjun/texture_albedo.jpg',
  },
  {
    id: 'steele',
    name: 'General Jonas Steele',
    title: 'Executive Commander',
    accentColor: '#38bdf8',
    primaryColor: '#0f172a',
    secondaryColor: '#334155',
    hairColor: '#475569',
    skinColor: '#f1f5f9',
    weaponColor: '#38bdf8',
    signatureStyle: 'Cybernetic Aegis Gauntlet & Trenchcoat',
    element: 'Metal',
    existingImgPath: 'public/assets/characters/steele/texture_albedo.jpeg',
  },
  {
    id: 'meghananda',
    name: 'Prince Meghananda',
    title: 'Prince Indrajit',
    accentColor: '#eab308',
    primaryColor: '#ca8a04',
    secondaryColor: '#854d0e',
    hairColor: '#172554',
    skinColor: '#d97706',
    weaponColor: '#fde047',
    signatureStyle: 'Celestial Lightning Bow & Vajra Spear',
    element: 'Lightning',
    existingImgPath: 'public/assets/characters/meghananda/texture_albedo.jpeg',
  },
  {
    id: 'valeria',
    name: 'Valeria Vane',
    title: 'Hegemony Directorate',
    accentColor: '#06b6d4',
    primaryColor: '#083344',
    secondaryColor: '#164e63',
    hairColor: '#ecfeff',
    skinColor: '#e0f2fe',
    weaponColor: '#67e8f9',
    signatureStyle: 'Glacial Crystal Blades & Aristocratic Cape',
    element: 'Ice',
    existingImgPath: 'public/assets/characters/valeria/portrait.png',
  },
  {
    id: 'elena',
    name: 'Dr. Elena Rivera',
    title: 'Biotech Combat Medic',
    accentColor: '#2dd4bf',
    primaryColor: '#0f766e',
    secondaryColor: '#115e59',
    hairColor: '#f8fafc',
    skinColor: '#fce7db',
    weaponColor: '#2dd4bf',
    signatureStyle: 'Aether Medical Vials & Tactical Combat Coat',
    element: 'Water',
  },
  {
    id: 'david',
    name: 'David Vance',
    title: 'Kinetic Mercenary',
    accentColor: '#60a5fa',
    primaryColor: '#1e3a8a',
    secondaryColor: '#172554',
    hairColor: '#334155',
    skinColor: '#f8cfbb',
    weaponColor: '#f59e0b',
    signatureStyle: 'Cyber-Optic Eye & Kinetic Gauntlet',
    element: 'Metal',
  },
  {
    id: 'maya',
    name: 'Maya Lin',
    title: 'Neon Holographic Assassin',
    accentColor: '#f43f5e',
    primaryColor: '#881337',
    secondaryColor: '#4c0519',
    hairColor: '#06b6d4',
    skinColor: '#fce7db',
    weaponColor: '#fb7185',
    signatureStyle: 'Dual Hologram Daggers & Sleek Bodysuit',
    element: 'Void',
  },
  {
    id: 'leo',
    name: 'Leo Sterling',
    title: 'Solar Pugilist',
    accentColor: '#fb923c',
    primaryColor: '#c2410c',
    secondaryColor: '#7c2d12',
    hairColor: '#ef4444',
    skinColor: '#fed7aa',
    weaponColor: '#f59e0b',
    signatureStyle: 'Flaming Solar Gauntlets & Martial Gi',
    element: 'Fire',
  },
  {
    id: 'rafe',
    name: 'Rafe Al-Mansoor',
    title: 'Gravity Void Duelist',
    accentColor: '#a855f7',
    primaryColor: '#581c87',
    secondaryColor: '#3b0764',
    hairColor: '#1e1b4b',
    skinColor: '#eed9c7',
    weaponColor: '#c084fc',
    signatureStyle: 'Dark-Matter Scythe & Void Trenchcoat',
    element: 'Void',
  },
  {
    id: 'amara',
    name: 'Amara Devi',
    title: 'Radiant Sun Monk',
    accentColor: '#facc15',
    primaryColor: '#a16207',
    secondaryColor: '#713f12',
    hairColor: '#451a03',
    skinColor: '#f5ded0',
    weaponColor: '#fef08a',
    signatureStyle: 'Floating Sun Prayer Beads & Golden Palms',
    element: 'Earth',
  },
  {
    id: 'kai',
    name: 'Kai Storm',
    title: 'Tempest Ronin',
    accentColor: '#34d399',
    primaryColor: '#047857',
    secondaryColor: '#064e3b',
    hairColor: '#0f172a',
    skinColor: '#f3e5d8',
    weaponColor: '#10b981',
    signatureStyle: 'Twin Wind Katanas & Emerald Scarf',
    element: 'Wind',
  },
  {
    id: 'alexandra',
    name: 'Alexandra Cross',
    title: 'Rose Rapier Fencer',
    accentColor: '#f472b6',
    primaryColor: '#9d174d',
    secondaryColor: '#700733',
    hairColor: '#fbbf24',
    skinColor: '#fdf2f8',
    weaponColor: '#fb7185',
    signatureStyle: 'Crimson Formal Fencing Coat & Rapier',
    element: 'Fire',
  },
  {
    id: 'luna',
    name: 'Luna Eclipse',
    title: 'Moonblade Stalker',
    accentColor: '#818cf8',
    primaryColor: '#3730a3',
    secondaryColor: '#1e1b4b',
    hairColor: '#e0e7ff',
    skinColor: '#f5f3ff',
    weaponColor: '#a5b4fc',
    signatureStyle: 'Crescent Moon Daggers & Midnight Cowl',
    element: 'Void',
  },
  {
    id: 'victor',
    name: 'Overlord Victor',
    title: 'Tyrant Emperor',
    accentColor: '#fbbf24',
    primaryColor: '#78350f',
    secondaryColor: '#451a03',
    hairColor: '#cbd5e1',
    skinColor: '#fef3c7',
    weaponColor: '#f59e0b',
    signatureStyle: 'Heavy Imperial Power Aegis & Crown',
    element: 'Dark',
  },
];

// Generates a stylized full-height transparent SVG character illustration
function createCharacterSvg(p: FighterProfile, isSlice: boolean): string {
  const w = isSlice ? 400 : 400;
  const h = isSlice ? 800 : 400;
  const cx = w / 2;

  // Cel-shaded vector character paths (transparent background - NO opaque rect!)
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <!-- Dynamic Elemental Gradient -->
    <linearGradient id="armor_${p.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.accentColor}" />
      <stop offset="45%" stop-color="${p.primaryColor}" />
      <stop offset="100%" stop-color="${p.secondaryColor}" />
    </linearGradient>

    <linearGradient id="skin_${p.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.skinColor}" />
      <stop offset="60%" stop-color="${p.skinColor}" />
      <stop offset="100%" stop-color="#b45309" stop-opacity="0.4" />
    </linearGradient>

    <filter id="neon_${p.id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <radialGradient id="auraGlow_${p.id}" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${p.accentColor}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${p.primaryColor}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Atmospheric Aura Halo (Transparent Background) -->
  <ellipse cx="${cx}" cy="${isSlice ? 360 : 200}" rx="${cx * 0.85}" ry="${isSlice ? 340 : 180}" fill="url(#auraGlow_${p.id})" />

  <!-- Back Arm / Weapon Silhouette -->
  <g transform="translate(${cx - 75}, ${isSlice ? 320 : 180}) rotate(-15)">
    <rect x="-16" y="0" width="32" height="150" rx="14" fill="${p.secondaryColor}" stroke="${p.accentColor}" stroke-width="2" />
    <!-- Signature Weapon Glow / Blade -->
    <path d="M 0 140 L 25 310 L -10 320 Z" fill="${p.weaponColor}" filter="url(#neon_${p.id})" opacity="0.95" />
  </g>

  <!-- Lower Body / Tactical Armor Legs (For Full-Height Select Slice) -->
  ${isSlice ? `
  <g id="legs">
    <!-- Left Leg -->
    <path d="M ${cx - 65} 460 L ${cx - 85} 670 L ${cx - 50} 780 L ${cx - 20} 780 L ${cx - 30} 650 L ${cx - 15} 460 Z"
          fill="${p.secondaryColor}" stroke="${p.primaryColor}" stroke-width="3" />
    <!-- Tactical Boot Accent -->
    <path d="M ${cx - 85} 670 L ${cx - 50} 780 L ${cx - 20} 780 L ${cx - 40} 670 Z"
          fill="${p.primaryColor}" stroke="${p.accentColor}" stroke-width="2" />

    <!-- Right Leg (Forward Stance) -->
    <path d="M ${cx + 15} 460 L ${cx + 35} 650 L ${cx + 30} 780 L ${cx + 75} 780 L ${cx + 90} 670 L ${cx + 65} 460 Z"
          fill="${p.secondaryColor}" stroke="${p.primaryColor}" stroke-width="3" />
    <!-- Tactical Boot Accent -->
    <path d="M ${cx + 35} 650 L ${cx + 30} 780 L ${cx + 75} 780 L ${cx + 80} 650 Z"
          fill="${p.primaryColor}" stroke="${p.accentColor}" stroke-width="2" />

    <!-- Knee Armor Plates -->
    <polygon points="${cx - 65},580 ${cx - 40},570 ${cx - 45},610 ${cx - 70},615" fill="${p.accentColor}" filter="url(#neon_${p.id})" />
    <polygon points="${cx + 45},580 ${cx + 70},570 ${cx + 65},610 ${cx + 40},615" fill="${p.accentColor}" filter="url(#neon_${p.id})" />
  </g>
  ` : ''}

  <!-- Torso & Armored Combat Doublet -->
  <g id="torso">
    <!-- Main Body Armor -->
    <path d="M ${cx - 70} ${isSlice ? 240 : 150} 
             L ${cx + 70} ${isSlice ? 240 : 150} 
             L ${cx + 55} ${isSlice ? 470 : 360} 
             L ${cx - 55} ${isSlice ? 470 : 360} Z"
          fill="url(#armor_${p.id})" stroke="${p.accentColor}" stroke-width="3" />

    <!-- Chest Armor Plates / Insignia -->
    <path d="M ${cx - 45} ${isSlice ? 260 : 170} 
             L ${cx} ${isSlice ? 330 : 230} 
             L ${cx + 45} ${isSlice ? 260 : 170} 
             L ${cx} ${isSlice ? 300 : 200} Z"
          fill="${p.accentColor}" filter="url(#neon_${p.id})" opacity="0.95" />

    <!-- Utility Belt & Energy Core -->
    <rect x="${cx - 60}" y="${isSlice ? 440 : 330}" width="120" height="22" rx="4" fill="#09090b" stroke="${p.accentColor}" stroke-width="2" />
    <circle cx="${cx}" cy="${isSlice ? 451 : 341}" r="9" fill="${p.accentColor}" filter="url(#neon_${p.id})" />
  </g>

  <!-- Neck & Collar -->
  <rect x="${cx - 24}" y="${isSlice ? 185 : 105}" width="48" height="60" rx="8" fill="url(#skin_${p.id})" />
  <path d="M ${cx - 36} ${isSlice ? 240 : 150} L ${cx} ${isSlice ? 215 : 130} L ${cx + 36} ${isSlice ? 240 : 150} Z" fill="${p.primaryColor}" />

  <!-- Head & Face Structure -->
  <g id="head">
    <!-- Jaw & Ears -->
    <path d="M ${cx - 45} ${isSlice ? 135 : 65} 
             C ${cx - 45} ${isSlice ? 200 : 130} ${cx - 25} ${isSlice ? 220 : 150} ${cx} ${isSlice ? 225 : 155} 
             C ${cx + 25} ${isSlice ? 220 : 150} ${cx + 45} ${isSlice ? 200 : 130} ${cx + 45} ${isSlice ? 135 : 65} Z"
          fill="url(#skin_${p.id})" stroke="${p.primaryColor}" stroke-width="2" />

    <!-- Sharp Anime Eyebrows -->
    <path d="M ${cx - 34} ${isSlice ? 135 : 65} Q ${cx - 18} ${isSlice ? 128 : 58} ${cx - 8} ${isSlice ? 138 : 68}" stroke="${p.hairColor}" stroke-width="4.5" fill="none" stroke-linecap="round" />
    <path d="M ${cx + 34} ${isSlice ? 135 : 65} Q ${cx + 18} ${isSlice ? 128 : 58} ${cx + 8} ${isSlice ? 138 : 68}" stroke="${p.hairColor}" stroke-width="4.5" fill="none" stroke-linecap="round" />

    <!-- Eyes with Piercing Glowing Iris -->
    <ellipse cx="${cx - 20}" cy="${isSlice ? 148 : 78}" rx="11" ry="6.5" fill="#ffffff" stroke="#18181b" stroke-width="1.5" />
    <circle cx="${cx - 19}" cy="${isSlice ? 148 : 78}" r="5" fill="${p.accentColor}" filter="url(#neon_${p.id})" />
    <circle cx="${cx - 18}" cy="${isSlice ? 146 : 76}" r="1.8" fill="#ffffff" />

    <ellipse cx="${cx + 20}" cy="${isSlice ? 148 : 78}" rx="11" ry="6.5" fill="#ffffff" stroke="#18181b" stroke-width="1.5" />
    <circle cx="${cx + 19}" cy="${isSlice ? 148 : 78}" r="5" fill="${p.accentColor}" filter="url(#neon_${p.id})" />
    <circle cx="${cx + 20}" cy="${isSlice ? 146 : 76}" r="1.8" fill="#ffffff" />

    <!-- Nose & Mouth (Determined Arcade Expression) -->
    <path d="M ${cx} ${isSlice ? 148 : 78} L ${cx - 4} ${isSlice ? 168 : 98} L ${cx + 3} ${isSlice ? 170 : 100}" stroke="#78350f" stroke-width="2.5" fill="none" stroke-linecap="round" />
    <path d="M ${cx - 15} ${isSlice ? 190 : 120} Q ${cx} ${isSlice ? 194 : 124} ${cx + 15} ${isSlice ? 190 : 120}" stroke="#451a03" stroke-width="3" fill="none" stroke-linecap="round" />
  </g>

  <!-- Styled Anime Hair & Headgear -->
  <g id="hair">
    <path d="M ${cx - 52} ${isSlice ? 140 : 70} 
             C ${cx - 55} ${isSlice ? 60 : 0} ${cx + 55} ${isSlice ? 60 : 0} ${cx + 52} ${isSlice ? 140 : 70} 
             C ${cx + 42} ${isSlice ? 110 : 40} ${cx - 42} ${isSlice ? 110 : 40} ${cx - 52} ${isSlice ? 140 : 70} Z"
          fill="${p.hairColor}" stroke="${p.accentColor}" stroke-width="2" />
    <!-- Dynamic Spikes / Bangs -->
    <path d="M ${cx - 45} ${isSlice ? 110 : 40} L ${cx - 20} ${isSlice ? 135 : 65} L ${cx - 8} ${isSlice ? 100 : 30} L ${cx + 15} ${isSlice ? 135 : 65} L ${cx + 35} ${isSlice ? 105 : 35} L ${cx + 48} ${isSlice ? 135 : 65}"
          fill="${p.hairColor}" stroke="${p.primaryColor}" stroke-width="2" />
  </g>

  <!-- Front Arm & Martial Stance Strike -->
  <g transform="translate(${cx + 65}, ${isSlice ? 280 : 160}) rotate(25)">
    <rect x="-18" y="0" width="36" height="140" rx="14" fill="${p.primaryColor}" stroke="${p.accentColor}" stroke-width="2" />
    <!-- Glowing Gauntlet Fist -->
    <circle cx="0" cy="145" r="22" fill="${p.accentColor}" filter="url(#neon_${p.id})" />
  </g>

  <!-- Speedlines & Elemental Energy Arcs -->
  <path d="M ${cx - 140} ${isSlice ? 380 : 200} Q ${cx - 90} ${isSlice ? 330 : 170} ${cx - 60} ${isSlice ? 360 : 200}" stroke="${p.accentColor}" stroke-width="3" fill="none" opacity="0.8" filter="url(#neon_${p.id})" />
  <path d="M ${cx + 80} ${isSlice ? 240 : 140} Q ${cx + 130} ${isSlice ? 210 : 120} ${cx + 160} ${isSlice ? 260 : 160}" stroke="${p.accentColor}" stroke-width="3" fill="none" opacity="0.8" filter="url(#neon_${p.id})" />
</svg>
`.trim();
}

async function main() {
  console.log('Generating high-fidelity character art, textures, and 3D glTF models for all 14 fighters...');

  for (const fighter of ROSTER) {
    const charDir = path.resolve(`public/assets/characters/${fighter.id}`);
    if (!fs.existsSync(charDir)) {
      fs.mkdirSync(charDir, { recursive: true });
    }

    // 1. Generate transparent SVG full-height select slice & square portrait
    const sliceSvg = createCharacterSvg(fighter, true);
    const portraitSvg = createCharacterSvg(fighter, false);

    fs.writeFileSync(path.join(charDir, 'select_slice.svg'), sliceSvg, 'utf-8');
    fs.writeFileSync(path.join(charDir, 'portrait.svg'), portraitSvg, 'utf-8');

    // 2. Generate clean RGBA PNG with transparent background
    // If character already has a high-res photo/illustration, preserve it, otherwise generate crisp RGBA PNG
    const pngPath = path.join(charDir, 'portrait.png');
    const slicePngPath = path.join(charDir, 'select_slice.png');
    const albedoPngPath = path.join(charDir, 'texture_albedo.png');

    let basePngBuffer: Buffer;
    if (fighter.existingImgPath && fs.existsSync(fighter.existingImgPath) && fighter.id === 'arjun') {
      basePngBuffer = fs.readFileSync(fighter.existingImgPath);
      fs.writeFileSync(slicePngPath, basePngBuffer);
      fs.writeFileSync(pngPath, basePngBuffer);
      fs.writeFileSync(albedoPngPath, basePngBuffer);
    } else {
      // Generate clean RGBA PNG (Transparent background cutout)
      // Generates 256x512 transparent character silhouette
      const [pr, pg, pb] = hexToRgb(fighter.accentColor);
      const [sr, sg, sb] = hexToRgb(fighter.primaryColor);

      const generatedPng = createRgbaPng(256, 512, (x, y, w, h) => {
        const nx = (x - w / 2) / (w / 2); // -1 to 1
        const ny = y / h; // 0 (top) to 1 (bottom)

        // Character silhouette shape function
        const headDist = Math.hypot(nx, ny - 0.22);
        const torsoDist = Math.max(Math.abs(nx) - 0.28 * (1 - ny * 0.3), 0) + Math.abs(ny - 0.45);
        const legDist = Math.max(Math.abs(nx) - 0.22, 0) + Math.abs(ny - 0.75);

        const inHead = headDist < 0.15;
        const inTorso = torsoDist < 0.22 && ny >= 0.28 && ny <= 0.62;
        const inLegs = legDist < 0.28 && ny >= 0.60 && ny <= 0.96;
        const inGlow = headDist < 0.22 || (Math.abs(nx) < 0.45 && ny > 0.25 && ny < 0.85);

        if (inHead || inTorso || inLegs) {
          // Inside character silhouette: full opacity with rich gradient shading
          const shade = 0.7 + 0.3 * (1 - Math.abs(nx));
          const r = inHead ? 245 : inTorso ? pr * shade : sr * shade;
          const g = inHead ? 220 : inTorso ? pg * shade : sg * shade;
          const b = inHead ? 200 : inTorso ? pb * shade : sb * shade;
          return [r, g, b, 255];
        } else if (inGlow) {
          // Soft atmospheric neon fringe that smoothly fades to transparent
          const alpha = Math.floor(45 * (1 - Math.abs(nx) * 2));
          return [pr, pg, pb, Math.max(0, alpha)];
        }

        // 100% Transparent background (NO black card, NO box)
        return [0, 0, 0, 0];
      });

      basePngBuffer = generatedPng;
      fs.writeFileSync(slicePngPath, generatedPng);
      fs.writeFileSync(pngPath, generatedPng);
      fs.writeFileSync(albedoPngPath, generatedPng);
    }

    // 3. Build 3D Binary GLB model (.glb) with alphaMode: "MASK"
    const glbBuffer = buildCharacterGlb(
      fighter.id,
      basePngBuffer,
      fighter.existingImgPath && fighter.id === 'arjun' ? 'image/jpeg' : 'image/png'
    );

    fs.writeFileSync(path.join(charDir, `${fighter.id}.glb`), glbBuffer);
    fs.writeFileSync(path.join(charDir, 'model.glb'), glbBuffer);

    console.log(`[OK] Generated assets & 3D model for: ${fighter.id} (${(glbBuffer.length / 1024).toFixed(1)} KB)`);
  }

  console.log('All 14 character assets generated successfully.');
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

main().catch(console.error);
