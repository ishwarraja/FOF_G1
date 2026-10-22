import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Script to generate high-fidelity stage artwork images (.png/.jpeg) and
 * glTF 2.0 binary (.glb) stage environments with embedded textures and named nodes:
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

const OUT_DIR = path.resolve('public/stages');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Helper to write valid PNG files using built-in zlib
function createPng(
  width: number,
  height: number,
  pixelShader: (x: number, y: number, w: number, h: number) => [number, number, number]
): Buffer {
  const rowLength = width * 3 + 1; // 1 filter byte per row
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelShader(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 3;
      rawData[pxOffset] = Math.max(0, Math.min(255, Math.floor(r)));
      rawData[pxOffset + 1] = Math.max(0, Math.min(255, Math.floor(g)));
      rawData[pxOffset + 2] = Math.max(0, Math.min(255, Math.floor(b)));
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 });

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const typeAndData = Buffer.concat([typeBuf, data]);

    const crcBuf = Buffer.alloc(4);
    // Standard CRC32
    let crc = 0 ^ -1;
    for (let i = 0; i < typeAndData.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ typeAndData[i]) & 0xff];
    }
    crc = (crc ^ -1) >>> 0;
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeAndData, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 2; // Color type: Truecolor (RGB)
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: Standard
  ihdr[12] = 0; // Interlace: None

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Precomputed CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  CRC_TABLE[n] = c;
}

// Procedural Stage Image Generators (1280x720 16:9 widescreen HD)
const WIDTH = 1280;
const HEIGHT = 720;

// Stage 1: Metro Rain
function generateMetroRain(): Buffer {
  return createPng(WIDTH, HEIGHT, (x, y, w, h) => {
    const ny = y / h;
    const nx = x / w;

    // Dark cyberpunk night sky with purple-blue gradient
    let r = 8 + (1 - ny) * 22 + Math.sin(nx * 8) * 6;
    let g = 10 + (1 - ny) * 25 + Math.cos(nx * 6) * 5;
    let b = 28 + (1 - ny) * 65 + Math.sin(nx * 12) * 12;

    // Distant skyscraper silhouettes
    const buildingCol = Math.floor(x / 60);
    const buildingHeight = 0.35 + Math.abs(Math.sin(buildingCol * 37.1)) * 0.45;
    if (ny > 1 - buildingHeight) {
      // Skyscraper body
      r = 12 + (buildingCol % 3) * 6;
      g = 14 + (buildingCol % 4) * 5;
      b = 24 + (buildingCol % 5) * 8;

      // Illuminated windows
      const winX = x % 16;
      const winY = y % 24;
      if (winX > 4 && winX < 12 && winY > 6 && winY < 18) {
        const isLit = (Math.sin(buildingCol * 13 + (y / 24) * 7 + (x / 16) * 19) > 0.1);
        if (isLit) {
          const colorType = (buildingCol + Math.floor(y / 24)) % 3;
          if (colorType === 0) { // Cyan
            r += 110; g += 210; b += 255;
          } else if (colorType === 1) { // Neon Pink
            r += 255; g += 60; b += 170;
          } else { // Warm amber
            r += 255; g += 200; b += 90;
          }
        }
      }
    }

    // Wet reflective pavement horizon at bottom
    if (ny > 0.78) {
      const roadGrad = (ny - 0.78) / 0.22;
      r = r * 0.4 + roadGrad * 45;
      g = g * 0.4 + roadGrad * 38;
      b = b * 0.4 + roadGrad * 65;

      // Neon reflections in puddles
      if ((x + y * 2) % 32 < 12) {
        r += 40; g += 30; b += 60;
      }
    }

    // Rain streaks
    const rainSeed = (x * 4 + y * 7) % 97;
    if (rainSeed < 3) {
      r += 70; g += 90; b += 120;
    }

    return [r, g, b];
  });
}

// Stage 2: Riverfront Sunset
function generateRiverfrontSunset(): Buffer {
  return createPng(WIDTH, HEIGHT, (x, y, w, h) => {
    const ny = y / h;
    const nx = x / w;

    // Glowing golden-crimson sunset sky
    let r = 255 * Math.exp(-Math.pow(ny - 0.45, 2) * 4);
    let g = 140 * Math.exp(-Math.pow(ny - 0.40, 2) * 5) + 30 * (1 - ny);
    let b = 60 * (1 - ny) + 20;

    // Sun disc at center horizon
    const dx = (nx - 0.5) * 2;
    const dy = (ny - 0.42) * 3;
    const distToSun = Math.sqrt(dx * dx + dy * dy);
    if (distToSun < 0.22) {
      const sunIntensity = 1 - (distToSun / 0.22);
      r += sunIntensity * 255;
      g += sunIntensity * 230;
      b += sunIntensity * 120;
    }

    // Sacred temple shikhara & ghat silhouettes along horizon (ny 0.45 - 0.65)
    if (ny >= 0.42 && ny < 0.62) {
      const templeIdx = Math.floor(x / 75);
      const templeApex = 0.44 + Math.abs(Math.sin(templeIdx * 19.3)) * 0.14;
      const localX = (x % 75) - 37.5;
      const shikharaWidth = (ny - templeApex) * 120;
      if (Math.abs(localX) < shikharaWidth) {
        // Deep purple temple silhouette
        r = 38 + (1 - ny) * 25;
        g = 18 + (1 - ny) * 15;
        b = 32 + (1 - ny) * 25;
      }
    }

    // River water in bottom half (ny >= 0.62)
    if (ny >= 0.62) {
      const waterDepth = (ny - 0.62) / 0.38;
      // Sunset reflection streak
      const centerDist = Math.abs(nx - 0.5);
      const reflectGlow = Math.exp(-centerDist * centerDist * 16) * (1 - waterDepth * 0.4);
      r = 35 + reflectGlow * 190;
      g = 20 + reflectGlow * 110;
      b = 40 + reflectGlow * 40;

      // Floating golden diyas (oil lamps)
      const diyaSeed = (x * 13 + y * 29) % 349;
      if (diyaSeed < 4) {
        r += 255; g += 210; b += 80;
      }
    }

    return [r, g, b];
  });
}

// Stage 3: Sky Observatory (Jantar Mantar / Twilight Apex)
function generateSkyObservatory(): Buffer {
  return createPng(WIDTH, HEIGHT, (x, y, w, h) => {
    const ny = y / h;
    const nx = x / w;

    // Deep cosmic twilight indigo-violet gradient
    let r = 24 + (1 - ny) * 60 + Math.sin(nx * 4) * 10;
    let g = 18 + (1 - ny) * 35;
    let b = 58 + (1 - ny) * 95;

    // Glinting celestial stars & constellations in upper sky
    if (ny < 0.60) {
      const starSeed = (x * 71 + y * 97) % 523;
      if (starSeed < 4) {
        const starBright = 160 + (starSeed * 25);
        r += starBright; g += starBright; b += starBright + 40;
      }
    }

    // Samrat Yantra & giant curved astronomical stone staircases
    // Ramp 1: Left to center rising ramp
    const rampY1 = 0.72 - (nx * 0.35);
    if (ny > rampY1 && nx < 0.65) {
      // Red sandstone texture
      r = 138 - ny * 35;
      g = 52 - ny * 15;
      b = 48 - ny * 15;
    }

    // Ramp 2: Right geometric observatory arch
    const rampY2 = 0.50 + Math.pow(nx - 0.75, 2) * 2.5;
    if (ny > rampY2 && nx >= 0.55) {
      r = 145 - ny * 30;
      g = 58 - ny * 15;
      b = 52 - ny * 15;
    }

    // Observatory plaza floor
    if (ny > 0.82) {
      r = 95; g = 42; b = 38;
      // Stone paver lines
      if (x % 36 < 2 || y % 36 < 2) {
        r -= 30; g -= 15; b -= 15;
      }
    }

    return [r, g, b];
  });
}

// Stage 4: Bioluminescent Ruins (Tapovan Sacred Grove)
function generateBioluminescentRuins(): Buffer {
  return createPng(WIDTH, HEIGHT, (x, y, w, h) => {
    const ny = y / h;
    const nx = x / w;

    // Nocturnal deep forest canopy (emerald & midnight teal)
    let r = 8 + (1 - ny) * 15;
    let g = 22 + (1 - ny) * 35 + Math.sin(nx * 6) * 8;
    let b = 28 + (1 - ny) * 45;

    // Massive ancient Banyan tree trunks and arching roots
    const root1 = Math.abs(x - (320 + Math.sin(y * 0.02) * 50));
    const root2 = Math.abs(x - (960 + Math.cos(y * 0.02) * 60));
    if (root1 < 55 || root2 < 65) {
      // Dark ancient bark
      r = 18; g = 26; b = 22;
      // Bioluminescent glowing moss veins on roots
      if ((x + y * 3) % 28 < 4) {
        r += 20; g += 210; b += 160;
      }
    }

    // Glowing cyan/emerald fungus clusters on ancient carved stone ruins
    if (ny > 0.55 && ny < 0.80) {
      const stoneBlock = Math.sin(x * 0.05) * Math.cos(y * 0.05);
      if (stoneBlock > 0.4) {
        r = 15; g = 85; b = 75;
      }
    }

    // Drifting glowing fireflies (floating light orbs)
    const fireflySeed = (x * 43 + y * 67) % 617;
    if (fireflySeed < 5) {
      r += 60; g += 255; b += 190;
    }

    // Forest floor with bioluminescent flora
    if (ny > 0.80) {
      r = 12; g = 45; b = 35;
      if ((x * 7 + y * 11) % 47 < 8) {
        r += 10; g += 150; b += 110;
      }
    }

    return [r, g, b];
  });
}

// Stage 5: Kala Chakra (Konark Surya Time Temple)
function generateKalaChakra(): Buffer {
  return createPng(WIDTH, HEIGHT, (x, y, w, h) => {
    const ny = y / h;
    const nx = x / w;

    // Warm Vedic solar sunrise (amber, golden bronze, terracotta)
    let r = 210 * (1 - ny * 0.5);
    let g = 125 * (1 - ny * 0.6);
    let b = 45 * (1 - ny * 0.7);

    // Giant 24-spoke Konark Surya Chariot Wheel centered at horizon
    const cx = w * 0.5;
    const cy = h * 0.52;
    const dist = Math.hypot(x - cx, y - cy);
    const radius = 220;

    if (Math.abs(dist - radius) < 16 || Math.abs(dist - (radius * 0.6)) < 12 || dist < 35) {
      // Outer and inner rim
      r = 195; g = 135; b = 60;
    } else if (dist < radius) {
      // 24 Spokes of the Surya time wheel
      const angle = Math.atan2(y - cy, x - cx);
      const spokeAngle = (Math.PI * 2) / 24;
      const spokeOffset = Math.abs((angle % spokeAngle) - (spokeAngle * 0.5));
      if (spokeOffset < 0.04) {
        r = 185; g = 125; b = 55;
      }
    }

    // Carved sandstone temple platform at floor
    if (ny > 0.75) {
      r = 145; g = 95; b = 48;
      if (x % 32 < 2 || y % 32 < 2) {
        r -= 40; g -= 25; b -= 15;
      }
    }

    // Solar golden motes
    const moteSeed = (x * 37 + y * 59) % 433;
    if (moteSeed < 4) {
      r += 240; g += 210; b += 110;
    }

    return [r, g, b];
  });
}

// Stage 6: Antariksha (Cosmic Brahmanda Galaxy)
function generateAntarikshaSpace(): Buffer {
  return createPng(WIDTH, HEIGHT, (x, y, w, h) => {
    const ny = y / h;
    const nx = x / w;

    // Deep cosmic violet/magenta nebula void
    const dx = (nx - 0.5) * 2;
    const dy = (ny - 0.5) * 2;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // Spiral galaxy arm intensity
    const spiral = Math.sin(angle * 3 + dist * 8);
    let r = 25 + Math.max(0, spiral) * 110 * (1 - dist * 0.5);
    let g = 15 + Math.max(0, spiral) * 45 * (1 - dist * 0.5);
    let b = 55 + Math.max(0, spiral) * 160 * (1 - dist * 0.5);

    // Glowing galaxy core at center
    if (dist < 0.25) {
      const core = 1 - (dist / 0.25);
      r += core * 220;
      g += core * 180;
      b += core * 255;
    }

    // Starfield
    const starSeed = (x * 89 + y * 113) % 487;
    if (starSeed < 4) {
      const bright = 170 + starSeed * 20;
      r += bright; g += bright; b += bright + 40;
    }

    return [r, g, b];
  });
}

/**
 * GLB 2.0 Binary Builder
 * Builds a portable Three.js .glb with embedded image texture,
 * fighting floor, boundaries, and standard named FOF stage nodes.
 */
function buildStageGlb(
  stageId: string,
  imageBuffer: Buffer,
  mimeType: 'image/png' | 'image/jpeg' = 'image/png'
): Buffer {
  // 1. Backdrop Plane Geometry (60m wide, 30m tall)
  const hw = 30; // half width
  const hh = 15; // half height
  const backdropPositions = new Float32Array([
    -hw, -hh, 0,
     hw, -hh, 0,
     hw,  hh, 0,
    -hw,  hh, 0,
  ]);
  const backdropUvs = new Float32Array([
    0, 1,
    1, 1,
    1, 0,
    0, 0,
  ]);
  const backdropIndices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
  ]);

  // 2. Floor Plane Geometry (48m wide, 20m deep, horizontal)
  const fhw = 24;
  const fhd = 10;
  const floorPositions = new Float32Array([
    -fhw, 0,  fhd,
     fhw, 0,  fhd,
     fhw, 0, -fhd,
    -fhw, 0, -fhd,
  ]);
  const floorUvs = new Float32Array([
    0, 6,
    6, 6,
    6, 0,
    0, 0,
  ]);
  const floorIndices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
  ]);

  // 3. Boundary Post Geometry (0.4m wide, 5m tall, 0.4m deep)
  const leftBoundaryPositions = new Float32Array([
    -0.2, 0, 0.2,
     0.2, 0, 0.2,
     0.2, 5, 0.2,
    -0.2, 5, 0.2,
  ]);
  const leftBoundaryIndices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
  ]);

  // Pack binary buffers with 4-byte padding
  const posBytes = Buffer.from(backdropPositions.buffer);
  const uvBytes = Buffer.from(backdropUvs.buffer);
  const idxBytes = Buffer.from(backdropIndices.buffer);
  const idxPad = Math.ceil(idxBytes.length / 4) * 4;

  const floorPosBytes = Buffer.from(floorPositions.buffer);
  const floorUvBytes = Buffer.from(floorUvs.buffer);
  const floorIdxBytes = Buffer.from(floorIndices.buffer);
  const floorIdxPad = Math.ceil(floorIdxBytes.length / 4) * 4;

  const boundPosBytes = Buffer.from(leftBoundaryPositions.buffer);
  const boundIdxBytes = Buffer.from(leftBoundaryIndices.buffer);
  const boundIdxPad = Math.ceil(boundIdxBytes.length / 4) * 4;

  // Buffer offsets
  let offset = 0;
  const posOffset = offset; offset += posBytes.length;
  const uvOffset = offset; offset += uvBytes.length;
  const idxOffset = offset; offset += idxPad;

  const floorPosOffset = offset; offset += floorPosBytes.length;
  const floorUvOffset = offset; offset += floorUvBytes.length;
  const floorIdxOffset = offset; offset += floorIdxPad;

  const boundPosOffset = offset; offset += boundPosBytes.length;
  const boundIdxOffset = offset; offset += boundIdxPad;

  const imgOffset = offset; offset += imageBuffer.length;
  const imgPad = Math.ceil(imageBuffer.length / 4) * 4;

  const binBuffer = Buffer.concat([
    posBytes,
    uvBytes,
    idxBytes, Buffer.alloc(idxPad - idxBytes.length),
    floorPosBytes,
    floorUvBytes,
    floorIdxBytes, Buffer.alloc(floorIdxPad - floorIdxBytes.length),
    boundPosBytes,
    boundIdxBytes, Buffer.alloc(boundIdxPad - boundIdxBytes.length),
    imageBuffer, Buffer.alloc(imgPad - imageBuffer.length),
  ]);

  // Build glTF JSON Structure
  const gltf = {
    asset: {
      version: '2.0',
      generator: 'FOF Production Stage Pipeline',
    },
    extras: {
      name: stageId,
      format: 'glTF 2.0 binary (.glb)',
      fofStageVersion: '0.1',
      usage: 'Three.js / WebGL 2.5D stage prototype',
      parallaxBackdrop: 0.18,
      stageWidthWorld: 32.0,
    },
    scene: 0,
    scenes: [
      {
        name: `StageScene_${stageId}`,
        nodes: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      },
    ],
    nodes: [
      // 0: Backdrop
      {
        name: 'FOF_StageBackdrop',
        mesh: 0,
        translation: [0, 6.2, -10.0],
      },
      // 1: Fighting Floor
      {
        name: 'FOF_FightingFloor',
        mesh: 1,
        translation: [0, 0, 0],
      },
      // 2: Left Boundary
      {
        name: 'FOF_LeftBoundary',
        mesh: 2,
        translation: [-16, 0, 0],
      },
      // 3: Right Boundary
      {
        name: 'FOF_RightBoundary',
        mesh: 2,
        translation: [16, 0, 0],
      },
      // 4: Sky Node
      {
        name: 'FOF_Sky',
        translation: [0, 10, -12.0],
      },
      // 5: Far Node
      {
        name: 'FOF_Far',
        translation: [0, 6, -8.5],
      },
      // 6: Mid Node
      {
        name: 'FOF_Mid',
        translation: [0, 4, -5.0],
      },
      // 7: Crowd Node
      {
        name: 'FOF_Crowd',
        translation: [0, 1.5, -3.0],
      },
      // 8: Foreground Node
      {
        name: 'FOF_Foreground',
        translation: [0, 1, 2.2],
      },
    ],
    meshes: [
      // Mesh 0: Backdrop Plane
      {
        name: 'BackdropMesh',
        primitives: [
          {
            attributes: { POSITION: 0, TEXCOORD_0: 1 },
            indices: 2,
            material: 0,
            mode: 4,
          },
        ],
      },
      // Mesh 1: Fighting Floor
      {
        name: 'FightingFloorMesh',
        primitives: [
          {
            attributes: { POSITION: 3, TEXCOORD_0: 4 },
            indices: 5,
            material: 1,
            mode: 4,
          },
        ],
      },
      // Mesh 2: Boundary Post
      {
        name: 'BoundaryPostMesh',
        primitives: [
          {
            attributes: { POSITION: 6 },
            indices: 7,
            material: 2,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
      // Material 0: Backdrop
      {
        name: 'BackdropMaterial',
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.05,
          roughnessFactor: 0.90,
        },
      },
      // Material 1: Floor
      {
        name: 'FloorMaterial',
        pbrMetallicRoughness: {
          baseColorFactor: [0.18, 0.16, 0.15, 1.0],
          metallicFactor: 0.25,
          roughnessFactor: 0.45,
        },
      },
      // Material 2: Boundary Laser
      {
        name: 'BoundaryMaterial',
        pbrMetallicRoughness: {
          baseColorFactor: [0.95, 0.65, 0.10, 1.0],
          metallicFactor: 0.8,
          roughnessFactor: 0.2,
        },
        emissiveFactor: [0.95, 0.60, 0.10],
      },
    ],
    textures: [{ source: 0 }],
    images: [
      {
        bufferView: 8,
        mimeType: mimeType,
      },
    ],
    accessors: [
      // 0: Backdrop Pos
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: 'VEC3',
        max: [hw, hh, 0],
        min: [-hw, -hh, 0],
      },
      // 1: Backdrop UV
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: 'VEC2',
        max: [1, 1],
        min: [0, 0],
      },
      // 2: Backdrop Idx
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: 5123,
        count: 6,
        type: 'SCALAR',
        max: [3],
        min: [0],
      },
      // 3: Floor Pos
      {
        bufferView: 3,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: 'VEC3',
        max: [fhw, 0, fhd],
        min: [-fhw, 0, -fhd],
      },
      // 4: Floor UV
      {
        bufferView: 4,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: 'VEC2',
        max: [6, 6],
        min: [0, 0],
      },
      // 5: Floor Idx
      {
        bufferView: 5,
        byteOffset: 0,
        componentType: 5123,
        count: 6,
        type: 'SCALAR',
        max: [3],
        min: [0],
      },
      // 6: Boundary Pos
      {
        bufferView: 6,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: 'VEC3',
        max: [0.2, 5, 0.2],
        min: [-0.2, 0, 0.2],
      },
      // 7: Boundary Idx
      {
        bufferView: 7,
        byteOffset: 0,
        componentType: 5123,
        count: 6,
        type: 'SCALAR',
        max: [3],
        min: [0],
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: uvOffset, byteLength: uvBytes.length, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.length, target: 34963 },

      { buffer: 0, byteOffset: floorPosOffset, byteLength: floorPosBytes.length, target: 34962 },
      { buffer: 0, byteOffset: floorUvOffset, byteLength: floorUvBytes.length, target: 34962 },
      { buffer: 0, byteOffset: floorIdxOffset, byteLength: floorIdxBytes.length, target: 34963 },

      { buffer: 0, byteOffset: boundPosOffset, byteLength: boundPosBytes.length, target: 34962 },
      { buffer: 0, byteOffset: boundIdxOffset, byteLength: boundIdxBytes.length, target: 34963 },

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
  header.writeUInt32LE(0x46546c67, 0); // glTF magic
  header.writeUInt32LE(2, 4);          // version 2
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // JSON

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuffer.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // BIN\0

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuffer]);
}

// Master Stage Pipeline
async function main() {
  console.log('Generating Stage Artwork and Binary GLB Environments...');

  // 1. Generate PNG image assets
  const stageGenerators: Record<string, () => Buffer> = {
    'stage_metro_rain.png': generateMetroRain,
    'stage_riverfront_sunset.png': generateRiverfrontSunset,
    'stage_sky_observatory.png': generateSkyObservatory,
    'stage_bioluminescent_ruins.png': generateBioluminescentRuins,
    'stage_kala_chakra_time.jpeg': generateKalaChakra,
    'stage_jantar_mantar_space.jpeg': generateSkyObservatory,
    'stage_antariksha_space.jpeg': generateAntarikshaSpace,
    'stage_dandakaranya_forest.jpeg': generateBioluminescentRuins,
    'stage_sun_temple_arena.png': generateKalaChakra,
    'stage_ancient_battleground.png': generateRiverfrontSunset,
    'stage_metro_city_rooftop.png': generateSkyObservatory,
    'stage_sector7_quarantine.jpeg': generateMetroRain,
    'stage_aether_server_vault.jpeg': generateAntarikshaSpace,
    'stage_subway_slums.jpeg': generateMetroRain,
  };

  for (const [filename, generator] of Object.entries(stageGenerators)) {
    const filePath = path.join(OUT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`Generating artwork: ${filename}`);
      const buf = generator();
      fs.writeFileSync(filePath, buf);
    }
  }

  // Also create stage_cheering_crowd_animated.gif fallback if missing
  const crowdGifPath = path.join(OUT_DIR, 'stage_cheering_crowd_animated.gif');
  if (!fs.existsSync(crowdGifPath)) {
    // Copy street fighter arena or write image as fallback
    const src = path.join(OUT_DIR, 'stage_street_fighter_arena.jpg');
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, crowdGifPath);
    }
  }

  // 2. Generate portable binary GLBs for all stages in /public/stages/
  const stagesToGlb: { id: string; imgName: string; mime: 'image/png' | 'image/jpeg' }[] = [
    { id: 'stage_metro_rain', imgName: 'stage_metro_rain.png', mime: 'image/png' },
    { id: 'stage_riverfront_sunset', imgName: 'stage_riverfront_sunset.png', mime: 'image/png' },
    { id: 'stage_sky_observatory', imgName: 'stage_sky_observatory.png', mime: 'image/png' },
    { id: 'stage_bioluminescent_ruins', imgName: 'stage_bioluminescent_ruins.png', mime: 'image/png' },
    { id: 'stage_street_fighter_arena', imgName: 'stage_street_fighter_arena.jpg', mime: 'image/jpeg' },
    { id: 'stage_hegemony_arena', imgName: 'stage_hegemony_arena.jpeg', mime: 'image/jpeg' },
    { id: 'stage_kumbh_sangam_gathering', imgName: 'stage_kumbh_sangam_gathering.jpeg', mime: 'image/jpeg' },
    { id: 'stage_kala_chakra_time', imgName: 'stage_kala_chakra_time.jpeg', mime: 'image/png' },
    { id: 'stage_jantar_mantar_space', imgName: 'stage_jantar_mantar_space.jpeg', mime: 'image/png' },
    { id: 'stage_antariksha_space', imgName: 'stage_antariksha_space.jpeg', mime: 'image/png' },
    { id: 'stage_dandakaranya_forest', imgName: 'stage_dandakaranya_forest.jpeg', mime: 'image/png' },
  ];

  for (const item of stagesToGlb) {
    const glbFilename = `${item.id}.glb`;
    const glbPath = path.join(OUT_DIR, glbFilename);
    const imgPath = path.join(OUT_DIR, item.imgName);

    if (fs.existsSync(imgPath)) {
      console.log(`Building GLB stage: ${glbFilename}`);
      const imgBuf = fs.readFileSync(imgPath);
      const glbBuf = buildStageGlb(item.id, imgBuf, item.mime);
      fs.writeFileSync(glbPath, glbBuf);
      console.log(` -> Created ${glbFilename} (${(glbBuf.length / 1024).toFixed(1)} KB)`);
    } else {
      console.warn(`Image missing for ${glbFilename}: ${imgPath}`);
    }
  }

  console.log('Stage Asset Generation Complete! All .glb and .png/.jpeg files placed in /public/stages/');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
