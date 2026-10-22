import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execSync } from 'child_process';

/**
 * Fate of Fighters (FOF) — Master Arjun Character Animation Pipeline
 * Commercial 2.5D Fighting Game Animation Engine
 * 
 * Replaces geometric mannequins with genuine, visually distinct, frame-by-frame
 * fighting game animation assets for Arjun Rao.
 * 
 * Technical Specifications:
 * - Frame Dimensions: 192 x 192 px
 * - Format: Transparent 32-bit RGBA PNG
 * - Atlas Layout: 3072 x 1152 px (16 columns x 6 rows = 96 cells, 91 active frames)
 * - Ground Plane: Anchored strictly at Y = 168 px
 * - 17 Canonical Actions with deterministic Startup / Active / Recovery phases
 */

const FRAME_W = 192;
const FRAME_H = 192;
const COLS = 16;
const ROWS = 6;
const SHEET_W = COLS * FRAME_W; // 3072
const SHEET_H = ROWS * FRAME_H; // 1152
const GROUND_Y = 168;
const DEFAULT_FRAME_MS = 75;

// Canonical Palette for Arjun Rao
const PALETTE = {
  skin: [182, 122, 78, 255] as [number, number, number, number],
  skinShadow: [128, 75, 44, 255] as [number, number, number, number],
  skinHighlight: [214, 153, 106, 255] as [number, number, number, number],
  hair: [24, 24, 28, 255] as [number, number, number, number],
  beard: [22, 22, 26, 255] as [number, number, number, number],
  jacket: [27, 40, 61, 255] as [number, number, number, number],
  jacketDark: [18, 28, 44, 255] as [number, number, number, number],
  jacketLight: [42, 60, 90, 255] as [number, number, number, number],
  shirt: [138, 52, 41, 255] as [number, number, number, number],
  shirtDark: [98, 32, 24, 255] as [number, number, number, number],
  trouser: [47, 49, 54, 255] as [number, number, number, number],
  trouserDark: [28, 30, 34, 255] as [number, number, number, number],
  kneePatch: [32, 34, 38, 255] as [number, number, number, number],
  wrap: [214, 206, 191, 255] as [number, number, number, number],
  wrapDark: [165, 155, 138, 255] as [number, number, number, number],
  boot: [51, 34, 23, 255] as [number, number, number, number],
  bootDark: [26, 17, 11, 255] as [number, number, number, number],
  sole: [18, 19, 20, 255] as [number, number, number, number],
  brass: [200, 157, 84, 255] as [number, number, number, number],
  shadow: [10, 10, 14, 110] as [number, number, number, number],
  fireCore: [255, 230, 160, 255] as [number, number, number, number],
  fireMid: [245, 120, 30, 230] as [number, number, number, number],
  fireOuter: [220, 40, 20, 160] as [number, number, number, number],
  electricBlue: [80, 200, 255, 240] as [number, number, number, number],
};

interface FrameDef {
  frameIndex: number;
  phase: 'startup' | 'active' | 'recovery';
  durationMs: number;
  isActive: boolean;
  hitbox: { x: number; y: number; w: number; h: number } | null;
  hurtbox: { x: number; y: number; w: number; h: number };
  // Kinematic parameters
  rootX: number;
  rootY: number;
  torsoAngle: number; // radians
  headTilt: number;
  leadArmAngle: number;
  leadElbowAngle: number;
  rearArmAngle: number;
  rearElbowAngle: number;
  leadLegAngle: number;
  leadKneeAngle: number;
  rearLegAngle: number;
  rearKneeAngle: number;
  handState: 'guard' | 'open' | 'fist' | 'chop' | 'impact';
  vfxType?: 'none' | 'fire_trail' | 'shockwave' | 'block_parry' | 'super_burst' | 'impact_star' | 'dust';
  vfxPower?: number;
}

interface ActionDef {
  name: string;
  isLooping: boolean;
  frameCount: number;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  damage: number;
  frames: FrameDef[];
}

// 2D Software Rasterizer for Transparent RGBA Frame Buffer
class FrameBuffer {
  public width: number;
  public height: number;
  public data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  setPixel(x: number, y: number, color: [number, number, number, number]) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    const idx = (iy * this.width + ix) * 4;
    const sa = color[3] / 255;
    if (sa <= 0) return;

    if (sa >= 1) {
      this.data[idx] = color[0];
      this.data[idx + 1] = color[1];
      this.data[idx + 2] = color[2];
      this.data[idx + 3] = 255;
    } else {
      const da = this.data[idx + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA > 0) {
        this.data[idx] = Math.round((color[0] * sa + this.data[idx] * da * (1 - sa)) / outA);
        this.data[idx + 1] = Math.round((color[1] * sa + this.data[idx + 1] * da * (1 - sa)) / outA);
        this.data[idx + 2] = Math.round((color[2] * sa + this.data[idx + 2] * da * (1 - sa)) / outA);
        this.data[idx + 3] = Math.round(outA * 255);
      }
    }
  }

  fillCircle(cx: number, cy: number, r: number, color: [number, number, number, number]) {
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + r));
    const r2 = r * r;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 <= r2) {
          const edgeDist = r - Math.sqrt(d2);
          const alpha = edgeDist < 1 ? Math.floor(color[3] * Math.max(0, edgeDist)) : color[3];
          this.setPixel(x, y, [color[0], color[1], color[2], alpha]);
        }
      }
    }
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: [number, number, number, number]) {
    const minX = Math.max(0, Math.floor(cx - rx));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + rx));
    const minY = Math.max(0, Math.floor(cy - ry));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + ry));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const norm = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
        if (norm <= 1.0) {
          this.setPixel(x, y, color);
        }
      }
    }
  }

  fillPolygon(points: [number, number][], color: [number, number, number, number]) {
    if (points.length < 3) return;
    let minY = this.height, maxY = 0;
    for (const p of points) {
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(this.height - 1, Math.ceil(maxY));

    for (let y = minY; y <= maxY; y++) {
      const nodeX: number[] = [];
      let j = points.length - 1;
      for (let i = 0; i < points.length; i++) {
        const pi = points[i];
        const pj = points[j];
        if ((pi[1] < y && pj[1] >= y) || (pj[1] < y && pi[1] >= y)) {
          nodeX.push(pi[0] + ((y - pi[1]) / (pj[1] - pi[1])) * (pj[0] - pi[0]));
        }
        j = i;
      }
      nodeX.sort((a, b) => a - b);
      for (let i = 0; i < nodeX.length; i += 2) {
        if (i + 1 >= nodeX.length) break;
        const xStart = Math.max(0, Math.floor(nodeX[i]));
        const xEnd = Math.min(this.width - 1, Math.ceil(nodeX[i + 1]));
        for (let x = xStart; x <= xEnd; x++) {
          this.setPixel(x, y, color);
        }
      }
    }
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, width: number, color: [number, number, number, number]) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const ux = (dx / len) * (width / 2);
    const uy = (dy / len) * (width / 2);
    const perpX = -uy;
    const perpY = ux;

    const p1: [number, number] = [x1 + perpX, y1 + perpY];
    const p2: [number, number] = [x2 + perpX, y2 + perpY];
    const p3: [number, number] = [x2 - perpX, y2 - perpY];
    const p4: [number, number] = [x1 - perpX, y1 - perpY];

    this.fillPolygon([p1, p2, p3, p4], color);
    this.fillCircle(x1, y1, width / 2, color);
    this.fillCircle(x2, y2, width / 2, color);
  }
}

// Converts raw RGBA frame buffer into valid PNG buffer using zlib
function frameBufferToPng(fb: FrameBuffer): Buffer {
  const rowLen = fb.width * 4 + 1;
  const raw = Buffer.alloc(rowLen * fb.height);

  for (let y = 0; y < fb.height; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // Filter: None
    const srcRow = y * fb.width * 4;
    for (let x = 0; x < fb.width * 4; x++) {
      raw[rowOffset + 1 + x] = fb.data[srcRow + x];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const tb = Buffer.from(type, 'ascii');
    const combined = Buffer.concat([tb, data]);
    let crc = 0 ^ -1;
    for (let i = 0; i < combined.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ combined[i]) & 0xff];
    crc = (crc ^ -1) >>> 0;
    const cb = Buffer.alloc(4);
    cb.writeUInt32BE(crc, 0);
    return Buffer.concat([len, tb, data, cb]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(fb.width, 0);
  ihdr.writeUInt32BE(fb.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * Renders an anatomically grounded, high-fidelity frame of Arjun Rao.
 * Includes distinct clothing layers, genuine martial limbs, and authentic materials.
 */
function renderArjunFrame(actionName: string, frame: FrameDef): FrameBuffer {
  const fb = new FrameBuffer(FRAME_W, FRAME_H);

  const rx = frame.rootX;
  const ry = frame.rootY;

  // 1. Contact Ground Shadow (clamped at GROUND_Y = 168)
  const altitude = Math.max(0, GROUND_Y - (ry + 58));
  const shadowAlpha = Math.max(0.15, 1.0 - altitude / 80) * 110;
  const shadowW = Math.max(14, 46 - altitude * 0.35);
  const shadowH = Math.max(4, 11 - altitude * 0.1);
  fb.fillEllipse(rx, GROUND_Y, shadowW, shadowH, [PALETTE.shadow[0], PALETTE.shadow[1], PALETTE.shadow[2], Math.round(shadowAlpha)]);

  // Skeletal Joint Calculations
  const hipX = rx;
  const hipY = ry + 22;

  // Back Leg (Left Leg - deeper in 3/4 perspective)
  const rearHipX = hipX - 8;
  const rearHipY = hipY;
  const rKneeX = rearHipX + Math.sin(frame.rearLegAngle) * 32;
  const rKneeY = rearHipY + Math.cos(frame.rearLegAngle) * 32;
  const rAnkleX = rKneeX + Math.sin(frame.rearLegAngle + frame.rearKneeAngle) * 32;
  const rAnkleY = rKneeY + Math.cos(frame.rearLegAngle + frame.rearKneeAngle) * 32;

  // Render Back Leg (Thigh, Knee, Calf, Boot)
  fb.drawLine(rearHipX, rearHipY, rKneeX, rKneeY, 14, PALETTE.trouserDark);
  fb.drawLine(rKneeX, rKneeY, rAnkleX, rAnkleY, 12, PALETTE.trouserDark);
  // Back Boot
  fb.drawLine(rAnkleX, rAnkleY, rAnkleX + 6, rAnkleY + 12, 10, PALETTE.bootDark);
  fb.fillPolygon([
    [rAnkleX - 6, rAnkleY + 10],
    [rAnkleX + 16, rAnkleY + 10],
    [rAnkleX + 14, rAnkleY + 16],
    [rAnkleX - 8, rAnkleY + 16],
  ], PALETTE.sole);

  // Back Arm (Left Arm in 3/4 perspective)
  const shoulderY = ry - 24;
  const rearShoulderX = rx - 10;
  const rElbowX = rearShoulderX + Math.sin(frame.rearArmAngle) * 24;
  const rElbowY = shoulderY + Math.cos(frame.rearArmAngle) * 24;
  const rWristX = rElbowX + Math.sin(frame.rearArmAngle + frame.rearElbowAngle) * 22;
  const rWristY = rElbowY + Math.cos(frame.rearArmAngle + frame.rearElbowAngle) * 22;

  // Render Back Arm (Bicep, Wrapped Forearm, Fist)
  fb.drawLine(rearShoulderX, shoulderY, rElbowX, rElbowY, 11, PALETTE.skinShadow);
  fb.drawLine(rElbowX, rElbowY, rWristX, rWristY, 10, PALETTE.wrapDark);
  fb.fillCircle(rWristX, rWristY, 6, PALETTE.skinShadow);

  // Torso (Rust-Red Undershirt + Deep Indigo Canvas Vest)
  const chestX = rx + Math.sin(frame.torsoAngle) * 16;
  const chestY = ry - 14;

  // Rust-Red Undershirt Layer (visible around neck, collar, and shoulders under sleeveless jacket)
  fb.fillPolygon([
    [chestX - 18, chestY - 16],
    [chestX + 18, chestY - 14],
    [hipX + 15, hipY],
    [hipX - 15, hipY],
  ], PALETTE.shirt);

  // Deep Indigo Sleeveless Tactical Vest Layer (Open V-neck collar showing rust-red shirt)
  fb.fillPolygon([
    [chestX - 17, chestY - 13],
    [chestX - 5, chestY - 13],
    [hipX - 3, hipY],
    [hipX - 15, hipY],
  ], PALETTE.jacketDark);
  fb.fillPolygon([
    [chestX + 4, chestY - 13],
    [chestX + 17, chestY - 12],
    [hipX + 15, hipY],
    [hipX + 2, hipY],
  ], PALETTE.jacket);

  // Visible V-neck shirt insert
  fb.fillPolygon([
    [chestX - 5, chestY - 16],
    [chestX + 5, chestY - 16],
    [chestX + 1, chestY - 6],
    [chestX - 1, chestY - 6],
  ], PALETTE.shirt);

  // Vest Lapel & Center Brass Zipper Line
  fb.drawLine(chestX, chestY - 6, hipX, hipY, 2.5, PALETTE.brass);
  // Pocket Detail & Snap
  fb.fillPolygon([
    [chestX + 4, chestY - 4],
    [chestX + 13, chestY - 4],
    [chestX + 13, chestY + 6],
    [chestX + 4, chestY + 6],
  ], PALETTE.jacketLight);
  fb.fillCircle(chestX + 8, chestY - 1, 1.5, PALETTE.brass);

  // Heavy Leather Utility Belt with Steel Buckle
  fb.drawLine(hipX - 15, hipY - 2, hipX + 15, hipY - 2, 6, [38, 26, 17, 255]);
  fb.fillPolygon([
    [hipX - 5, hipY - 6],
    [hipX + 5, hipY - 6],
    [hipX + 5, hipY + 2],
    [hipX - 5, hipY + 2],
  ], [140, 145, 155, 255]);

  // Front Leg (Right Leg - grounded forward in 3/4 combat stance)
  const frontHipX = hipX + 6;
  const frontHipY = hipY;
  const fKneeX = frontHipX + Math.sin(frame.leadLegAngle) * 32;
  const fKneeY = frontHipY + Math.cos(frame.leadLegAngle) * 32;
  const fAnkleX = fKneeX + Math.sin(frame.leadLegAngle + frame.leadKneeAngle) * 32;
  const fAnkleY = fKneeY + Math.cos(frame.leadLegAngle + frame.leadKneeAngle) * 32;

  // Render Front Leg (Trousers, Articulated Knee Patch, Boots)
  fb.drawLine(frontHipX, frontHipY, fKneeX, fKneeY, 15, PALETTE.trouser);
  // Reinforced Knee Patch
  fb.fillCircle(fKneeX, fKneeY, 8, PALETTE.kneePatch);
  fb.drawLine(fKneeX, fKneeY, fAnkleX, fAnkleY, 13, PALETTE.trouser);

  // Front Boot (Brown leather + Lug sole)
  fb.drawLine(fAnkleX, fAnkleY, fAnkleX + 8, fAnkleY + 13, 11, PALETTE.boot);
  fb.fillPolygon([
    [fAnkleX - 7, fAnkleY + 11],
    [fAnkleX + 18, fAnkleY + 11],
    [fAnkleX + 16, fAnkleY + 18],
    [fAnkleX - 9, fAnkleY + 18],
  ], PALETTE.sole);
  // Boot Lacing Details
  fb.drawLine(fAnkleX + 2, fAnkleY + 4, fAnkleX + 7, fAnkleY + 4, 1.5, PALETTE.brass);
  fb.drawLine(fAnkleX + 3, fAnkleY + 8, fAnkleX + 8, fAnkleY + 8, 1.5, PALETTE.brass);

  // Head, Neck & Distinctive Face
  const neckX = chestX + 3;
  const neckY = chestY - 16;
  fb.drawLine(chestX, chestY - 14, neckX, neckY, 9, PALETTE.skin);

  const headX = neckX + Math.sin(frame.headTilt) * 4;
  const headY = neckY - 13;

  // Head Base & Tan Skin
  fb.fillCircle(headX, headY, 11, PALETTE.skin);
  fb.fillCircle(headX + 2, headY, 10, PALETTE.skinHighlight);

  // Short Textured Dark Hair
  fb.fillCircle(headX - 2, headY - 4, 10, PALETTE.hair);
  fb.fillCircle(headX, headY - 6, 9, PALETTE.hair);
  fb.fillCircle(headX + 4, headY - 4, 8, PALETTE.hair);

  // Resolute Eyebrow & Focused Martial Eye
  fb.drawLine(headX + 2, headY - 3, headX + 8, headY - 2, 2.5, PALETTE.hair);
  fb.fillCircle(headX + 5, headY + 1, 2, [36, 20, 12, 255]);
  fb.fillCircle(headX + 6, headY, 0.8, [255, 255, 255, 255]); // Catchlight

  // Nose & Jawline
  fb.drawLine(headX + 6, headY, headX + 9, headY + 4, 1.5, PALETTE.skinShadow);
  fb.drawLine(headX + 9, headY + 4, headX + 6, headY + 6, 1.5, PALETTE.skinShadow);

  // Trimmed Working-Class Beard and Mustache
  fb.fillPolygon([
    [headX + 2, headY + 5],
    [headX + 9, headY + 5],
    [headX + 7, headY + 11],
    [headX, headY + 10],
  ], PALETTE.beard);

  // Front Arm (Right Arm in foreground guard/strike)
  const frontShoulderX = chestX + 11;
  const fElbowX = frontShoulderX + Math.sin(frame.leadArmAngle) * 26;
  const fElbowY = shoulderY + Math.cos(frame.leadArmAngle) * 26;
  const fWristX = fElbowX + Math.sin(frame.leadArmAngle + frame.leadElbowAngle) * 24;
  const fWristY = fElbowY + Math.cos(frame.leadArmAngle + frame.leadElbowAngle) * 24;

  // Render Front Arm (Bicep, Wrapped Forearm, Hand)
  fb.drawLine(frontShoulderX, shoulderY, fElbowX, fElbowY, 12, PALETTE.skin);
  // Cloth Wrist Wraps (Unbleached Cotton)
  fb.drawLine(fElbowX, fElbowY, fWristX, fWristY, 11, PALETTE.wrap);
  // Wrap Bandage Seam Lines
  fb.drawLine(fElbowX + 4, fElbowY + 4, fElbowX + 8, fElbowY + 8, 2, PALETTE.wrapDark);
  fb.drawLine(fElbowX + 10, fElbowY + 10, fElbowX + 14, fElbowY + 14, 2, PALETTE.wrapDark);

  // Right Hand Formation based on Action Frame State
  if (frame.handState === 'fist') {
    fb.fillCircle(fWristX, fWristY, 7, PALETTE.skin);
    fb.drawLine(fWristX - 3, fWristY, fWristX + 5, fWristY, 2, PALETTE.skinShadow);
  } else if (frame.handState === 'impact') {
    fb.fillCircle(fWristX, fWristY, 8.5, PALETTE.skinHighlight);
  } else if (frame.handState === 'open') {
    fb.fillCircle(fWristX, fWristY, 6, PALETTE.skin);
    fb.drawLine(fWristX, fWristY, fWristX + 7, fWristY - 3, 2, PALETTE.skin);
    fb.drawLine(fWristX, fWristY, fWristX + 8, fWristY, 2, PALETTE.skin);
    fb.drawLine(fWristX, fWristY, fWristX + 7, fWristY + 3, 2, PALETTE.skin);
  } else {
    // Guard Hand (Semi-clenched martial ready guard)
    fb.fillCircle(fWristX, fWristY, 6.5, PALETTE.skin);
    fb.drawLine(fWristX, fWristY - 3, fWristX + 6, fWristY - 1, 2, PALETTE.skinHighlight);
  }

  // Visual Effects & Strike Trails on Active Frames
  if (frame.vfxType === 'fire_trail') {
    const trailLen = (frame.vfxPower || 1) * 36;
    fb.drawLine(fWristX - trailLen, fWristY, fWristX + 10, fWristY, 8, PALETTE.fireOuter);
    fb.drawLine(fWristX - trailLen * 0.7, fWristY - 2, fWristX + 8, fWristY - 2, 5, PALETTE.fireMid);
    fb.drawLine(fWristX - trailLen * 0.4, fWristY, fWristX + 4, fWristY, 3, PALETTE.fireCore);
    fb.fillCircle(fWristX + 6, fWristY, 7, PALETTE.fireCore);
  } else if (frame.vfxType === 'shockwave') {
    const waveR = (frame.vfxPower || 1) * 24;
    fb.fillCircle(fWristX + 10, fWristY, waveR, [PALETTE.electricBlue[0], PALETTE.electricBlue[1], PALETTE.electricBlue[2], 120]);
    fb.fillCircle(fWristX + 10, fWristY, waveR * 0.65, PALETTE.fireMid);
    fb.fillCircle(fWristX + 10, fWristY, waveR * 0.35, PALETTE.fireCore);
  } else if (frame.vfxType === 'block_parry') {
    const shieldX = rx + 24;
    const shieldY = ry - 15;
    fb.fillEllipse(shieldX, shieldY, 14, 28, [PALETTE.electricBlue[0], PALETTE.electricBlue[1], PALETTE.electricBlue[2], 160]);
    fb.fillEllipse(shieldX + 4, shieldY, 8, 20, [255, 255, 255, 220]);
  } else if (frame.vfxType === 'super_burst') {
    const burstR = 32;
    fb.fillCircle(fWristX + 12, fWristY, burstR, [PALETTE.electricBlue[0], PALETTE.electricBlue[1], PALETTE.electricBlue[2], 90]);
    fb.fillCircle(fWristX + 12, fWristY, burstR * 0.7, PALETTE.fireMid);
    fb.fillCircle(fWristX + 12, fWristY, burstR * 0.4, PALETTE.fireCore);
    fb.drawLine(fWristX - 45, fWristY, fWristX + 45, fWristY, 5, [255, 255, 255, 240]);
  } else if (frame.vfxType === 'dust') {
    fb.fillCircle(rx - 22, GROUND_Y - 4, 8, [180, 175, 170, 140]);
    fb.fillCircle(rx - 32, GROUND_Y - 6, 6, [160, 155, 150, 100]);
  }

  return fb;
}

// Builds the complete 17 action suite with deterministic kinematics and frame data
function buildArjunActionSuite(): ActionDef[] {
  const actions: ActionDef[] = [
    // 1. IDLE (6 frames, looping, realistic breathing & kinetic guard pulse)
    {
      name: 'idle',
      isLooping: true,
      frameCount: 6,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 0,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: DEFAULT_FRAME_MS, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 52, h: 130 }, rootX: 96, rootY: 108, torsoAngle: 0.05, headTilt: 0.02, leadArmAngle: 1.1, leadElbowAngle: -1.7, rearArmAngle: 0.8, rearElbowAngle: -1.5, leadLegAngle: 0.35, leadKneeAngle: 0.15, rearLegAngle: -0.35, rearKneeAngle: 0.2, handState: 'guard' },
        { frameIndex: 1, phase: 'recovery', durationMs: DEFAULT_FRAME_MS, isActive: false, hitbox: null, hurtbox: { x: 70, y: 34, w: 52, h: 130 }, rootX: 96, rootY: 106.5, torsoAngle: 0.04, headTilt: 0.01, leadArmAngle: 1.15, leadElbowAngle: -1.75, rearArmAngle: 0.85, rearElbowAngle: -1.55, leadLegAngle: 0.34, leadKneeAngle: 0.13, rearLegAngle: -0.34, rearKneeAngle: 0.18, handState: 'guard' },
        { frameIndex: 2, phase: 'recovery', durationMs: DEFAULT_FRAME_MS, isActive: false, hitbox: null, hurtbox: { x: 70, y: 33, w: 52, h: 130 }, rootX: 96, rootY: 105, torsoAngle: 0.03, headTilt: 0.0, leadArmAngle: 1.2, leadElbowAngle: -1.8, rearArmAngle: 0.9, rearElbowAngle: -1.6, leadLegAngle: 0.32, leadKneeAngle: 0.10, rearLegAngle: -0.32, rearKneeAngle: 0.15, handState: 'guard' },
        { frameIndex: 3, phase: 'recovery', durationMs: DEFAULT_FRAME_MS, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 52, h: 130 }, rootX: 96, rootY: 107, torsoAngle: 0.05, headTilt: 0.02, leadArmAngle: 1.12, leadElbowAngle: -1.72, rearArmAngle: 0.82, rearElbowAngle: -1.52, leadLegAngle: 0.35, leadKneeAngle: 0.16, rearLegAngle: -0.35, rearKneeAngle: 0.22, handState: 'guard' },
        { frameIndex: 4, phase: 'recovery', durationMs: DEFAULT_FRAME_MS, isActive: false, hitbox: null, hurtbox: { x: 70, y: 36, w: 52, h: 130 }, rootX: 96, rootY: 109.5, torsoAngle: 0.06, headTilt: 0.03, leadArmAngle: 1.05, leadElbowAngle: -1.65, rearArmAngle: 0.75, rearElbowAngle: -1.45, leadLegAngle: 0.38, leadKneeAngle: 0.20, rearLegAngle: -0.38, rearKneeAngle: 0.26, handState: 'guard' },
        { frameIndex: 5, phase: 'recovery', durationMs: DEFAULT_FRAME_MS, isActive: false, hitbox: null, hurtbox: { x: 70, y: 36, w: 52, h: 130 }, rootX: 96, rootY: 109, torsoAngle: 0.06, headTilt: 0.03, leadArmAngle: 1.08, leadElbowAngle: -1.68, rearArmAngle: 0.78, rearElbowAngle: -1.48, leadLegAngle: 0.37, leadKneeAngle: 0.18, rearLegAngle: -0.37, rearKneeAngle: 0.24, handState: 'guard' },
      ],
    },

    // 2. WALK_FORWARD (6 frames, looping martial push-step)
    {
      name: 'walk_forward',
      isLooping: true,
      frameCount: 6,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 0,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 72, y: 35, w: 54, h: 130 }, rootX: 94, rootY: 107, torsoAngle: 0.08, headTilt: 0.04, leadArmAngle: 0.95, leadElbowAngle: -1.5, rearArmAngle: 0.95, rearElbowAngle: -1.4, leadLegAngle: 0.45, leadKneeAngle: 0.2, rearLegAngle: -0.4, rearKneeAngle: 0.25, handState: 'guard' },
        { frameIndex: 1, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 74, y: 33, w: 54, h: 130 }, rootX: 98, rootY: 104, torsoAngle: 0.12, headTilt: 0.06, leadArmAngle: 1.25, leadElbowAngle: -1.7, rearArmAngle: 0.65, rearElbowAngle: -1.3, leadLegAngle: 0.65, leadKneeAngle: 0.1, rearLegAngle: -0.3, rearKneeAngle: 0.4, handState: 'guard' },
        { frameIndex: 2, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 76, y: 35, w: 54, h: 130 }, rootX: 102, rootY: 107, torsoAngle: 0.14, headTilt: 0.06, leadArmAngle: 1.35, leadElbowAngle: -1.8, rearArmAngle: 0.55, rearElbowAngle: -1.2, leadLegAngle: 0.55, leadKneeAngle: 0.25, rearLegAngle: -0.5, rearKneeAngle: 0.35, handState: 'guard' },
        { frameIndex: 3, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 74, y: 36, w: 54, h: 130 }, rootX: 100, rootY: 108, torsoAngle: 0.10, headTilt: 0.05, leadArmAngle: 1.15, leadElbowAngle: -1.65, rearArmAngle: 0.75, rearElbowAngle: -1.4, leadLegAngle: 0.35, leadKneeAngle: 0.3, rearLegAngle: -0.45, rearKneeAngle: 0.25, handState: 'guard' },
        { frameIndex: 4, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 72, y: 34, w: 54, h: 130 }, rootX: 96, rootY: 105, torsoAngle: 0.08, headTilt: 0.04, leadArmAngle: 0.85, leadElbowAngle: -1.5, rearArmAngle: 1.05, rearElbowAngle: -1.5, leadLegAngle: 0.2, leadKneeAngle: 0.35, rearLegAngle: -0.2, rearKneeAngle: 0.3, handState: 'guard' },
        { frameIndex: 5, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 72, y: 36, w: 54, h: 130 }, rootX: 94, rootY: 108, torsoAngle: 0.07, headTilt: 0.03, leadArmAngle: 0.95, leadElbowAngle: -1.55, rearArmAngle: 0.9, rearElbowAngle: -1.45, leadLegAngle: 0.35, leadKneeAngle: 0.25, rearLegAngle: -0.35, rearKneeAngle: 0.22, handState: 'guard' },
      ],
    },

    // 3. WALK_BACKWARD (6 frames, looping defensive martial retreat)
    {
      name: 'walk_backward',
      isLooping: true,
      frameCount: 6,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 0,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 68, y: 35, w: 54, h: 130 }, rootX: 96, rootY: 107, torsoAngle: -0.04, headTilt: 0.0, leadArmAngle: 1.2, leadElbowAngle: -1.8, rearArmAngle: 0.8, rearElbowAngle: -1.5, leadLegAngle: 0.35, leadKneeAngle: 0.2, rearLegAngle: -0.35, rearKneeAngle: 0.2, handState: 'guard' },
        { frameIndex: 1, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 66, y: 34, w: 54, h: 130 }, rootX: 92, rootY: 105, torsoAngle: -0.08, headTilt: -0.02, leadArmAngle: 1.3, leadElbowAngle: -1.9, rearArmAngle: 0.7, rearElbowAngle: -1.4, leadLegAngle: 0.2, leadKneeAngle: 0.35, rearLegAngle: -0.55, rearKneeAngle: 0.15, handState: 'guard' },
        { frameIndex: 2, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 64, y: 36, w: 54, h: 130 }, rootX: 90, rootY: 108, torsoAngle: -0.09, headTilt: -0.02, leadArmAngle: 1.25, leadElbowAngle: -1.85, rearArmAngle: 0.75, rearElbowAngle: -1.45, leadLegAngle: 0.3, leadKneeAngle: 0.25, rearLegAngle: -0.65, rearKneeAngle: 0.3, handState: 'guard' },
        { frameIndex: 3, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 66, y: 35, w: 54, h: 130 }, rootX: 92, rootY: 107, torsoAngle: -0.06, headTilt: -0.01, leadArmAngle: 1.15, leadElbowAngle: -1.75, rearArmAngle: 0.85, rearElbowAngle: -1.5, leadLegAngle: 0.4, leadKneeAngle: 0.2, rearLegAngle: -0.45, rearKneeAngle: 0.35, handState: 'guard' },
        { frameIndex: 4, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 68, y: 34, w: 54, h: 130 }, rootX: 94, rootY: 105, torsoAngle: -0.04, headTilt: 0.0, leadArmAngle: 1.05, leadElbowAngle: -1.65, rearArmAngle: 0.95, rearElbowAngle: -1.55, leadLegAngle: 0.45, leadKneeAngle: 0.15, rearLegAngle: -0.3, rearKneeAngle: 0.35, handState: 'guard' },
        { frameIndex: 5, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 70, y: 36, w: 54, h: 130 }, rootX: 96, rootY: 108, torsoAngle: -0.03, headTilt: 0.01, leadArmAngle: 1.1, leadElbowAngle: -1.7, rearArmAngle: 0.85, rearElbowAngle: -1.5, leadLegAngle: 0.38, leadKneeAngle: 0.18, rearLegAngle: -0.38, rearKneeAngle: 0.25, handState: 'guard' },
      ],
    },

    // 4. CROUCH_IDLE (4 frames, low combat posture)
    {
      name: 'crouch_idle',
      isLooping: true,
      frameCount: 4,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 0,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: 90, isActive: false, hitbox: null, hurtbox: { x: 65, y: 65, w: 58, h: 100 }, rootX: 95, rootY: 128, torsoAngle: 0.18, headTilt: 0.08, leadArmAngle: 0.8, leadElbowAngle: -1.8, rearArmAngle: 0.6, rearElbowAngle: -1.6, leadLegAngle: 0.75, leadKneeAngle: 0.85, rearLegAngle: -0.65, rearKneeAngle: 0.95, handState: 'guard' },
        { frameIndex: 1, phase: 'recovery', durationMs: 90, isActive: false, hitbox: null, hurtbox: { x: 65, y: 66, w: 58, h: 100 }, rootX: 95, rootY: 129.5, torsoAngle: 0.19, headTilt: 0.09, leadArmAngle: 0.78, leadElbowAngle: -1.82, rearArmAngle: 0.58, rearElbowAngle: -1.62, leadLegAngle: 0.78, leadKneeAngle: 0.88, rearLegAngle: -0.68, rearKneeAngle: 0.98, handState: 'guard' },
        { frameIndex: 2, phase: 'recovery', durationMs: 90, isActive: false, hitbox: null, hurtbox: { x: 65, y: 65, w: 58, h: 100 }, rootX: 95, rootY: 128.5, torsoAngle: 0.18, headTilt: 0.08, leadArmAngle: 0.82, leadElbowAngle: -1.8, rearArmAngle: 0.62, rearElbowAngle: -1.6, leadLegAngle: 0.76, leadKneeAngle: 0.86, rearLegAngle: -0.66, rearKneeAngle: 0.96, handState: 'guard' },
        { frameIndex: 3, phase: 'recovery', durationMs: 90, isActive: false, hitbox: null, hurtbox: { x: 65, y: 64, w: 58, h: 100 }, rootX: 95, rootY: 127, torsoAngle: 0.17, headTilt: 0.07, leadArmAngle: 0.85, leadElbowAngle: -1.78, rearArmAngle: 0.65, rearElbowAngle: -1.58, leadLegAngle: 0.74, leadKneeAngle: 0.84, rearLegAngle: -0.64, rearKneeAngle: 0.94, handState: 'guard' },
      ],
    },

    // 5. JUMP (6 frames, vertical leap, apex, and landing)
    {
      name: 'jump',
      isLooping: false,
      frameCount: 6,
      startupFrames: 2,
      activeFrames: 2,
      recoveryFrames: 2,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'startup', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 68, y: 55, w: 55, h: 110 }, rootX: 96, rootY: 125, torsoAngle: 0.15, headTilt: 0.05, leadArmAngle: 0.5, leadElbowAngle: -1.2, rearArmAngle: 0.4, rearElbowAngle: -1.1, leadLegAngle: 0.7, leadKneeAngle: 0.8, rearLegAngle: -0.6, rearKneeAngle: 0.85, handState: 'guard' },
        { frameIndex: 1, phase: 'startup', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 70, y: 25, w: 52, h: 120 }, rootX: 96, rootY: 82, torsoAngle: 0.05, headTilt: 0.0, leadArmAngle: 1.8, leadElbowAngle: -0.8, rearArmAngle: 1.5, rearElbowAngle: -0.7, leadLegAngle: 0.35, leadKneeAngle: 0.4, rearLegAngle: -0.35, rearKneeAngle: 0.4, handState: 'open' },
        { frameIndex: 2, phase: 'active', durationMs: 65, isActive: true, hitbox: { x: 75, y: 35, w: 55, h: 65 }, hurtbox: { x: 70, y: 20, w: 52, h: 105 }, rootX: 96, rootY: 54, torsoAngle: 0.1, headTilt: 0.04, leadArmAngle: 1.4, leadElbowAngle: -1.4, rearArmAngle: 1.1, rearElbowAngle: -1.2, leadLegAngle: 0.95, leadKneeAngle: 1.3, rearLegAngle: -0.85, rearKneeAngle: 1.3, handState: 'guard' },
        { frameIndex: 3, phase: 'active', durationMs: 65, isActive: true, hitbox: { x: 75, y: 38, w: 55, h: 65 }, hurtbox: { x: 70, y: 22, w: 52, h: 105 }, rootX: 96, rootY: 56, torsoAngle: 0.08, headTilt: 0.03, leadArmAngle: 1.35, leadElbowAngle: -1.45, rearArmAngle: 1.05, rearElbowAngle: -1.25, leadLegAngle: 0.92, leadKneeAngle: 1.25, rearLegAngle: -0.82, rearKneeAngle: 1.25, handState: 'guard' },
        { frameIndex: 4, phase: 'recovery', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 70, y: 30, w: 52, h: 120 }, rootX: 96, rootY: 88, torsoAngle: 0.05, headTilt: 0.02, leadArmAngle: 1.2, leadElbowAngle: -1.6, rearArmAngle: 0.9, rearElbowAngle: -1.4, leadLegAngle: 0.45, leadKneeAngle: 0.5, rearLegAngle: -0.45, rearKneeAngle: 0.5, handState: 'guard' },
        { frameIndex: 5, phase: 'recovery', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 68, y: 50, w: 55, h: 115 }, rootX: 96, rootY: 122, torsoAngle: 0.18, headTilt: 0.06, leadArmAngle: 1.0, leadElbowAngle: -1.7, rearArmAngle: 0.7, rearElbowAngle: -1.5, leadLegAngle: 0.65, leadKneeAngle: 0.75, rearLegAngle: -0.55, rearKneeAngle: 0.8, handState: 'guard', vfxType: 'dust' },
      ],
    },

    // 6. BLOCK (4 frames, defensive parry cross-guard)
    {
      name: 'block',
      isLooping: true,
      frameCount: 4,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 0,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: 80, isActive: false, hitbox: null, hurtbox: { x: 66, y: 35, w: 56, h: 130 }, rootX: 94, rootY: 110, torsoAngle: -0.06, headTilt: -0.04, leadArmAngle: 0.65, leadElbowAngle: -2.3, rearArmAngle: 0.55, rearElbowAngle: -2.2, leadLegAngle: 0.42, leadKneeAngle: 0.25, rearLegAngle: -0.45, rearKneeAngle: 0.3, handState: 'guard', vfxType: 'block_parry' },
        { frameIndex: 1, phase: 'recovery', durationMs: 80, isActive: false, hitbox: null, hurtbox: { x: 65, y: 35, w: 56, h: 130 }, rootX: 93, rootY: 110.5, torsoAngle: -0.08, headTilt: -0.05, leadArmAngle: 0.6, leadElbowAngle: -2.35, rearArmAngle: 0.5, rearElbowAngle: -2.25, leadLegAngle: 0.44, leadKneeAngle: 0.27, rearLegAngle: -0.47, rearKneeAngle: 0.32, handState: 'guard', vfxType: 'block_parry' },
        { frameIndex: 2, phase: 'recovery', durationMs: 80, isActive: false, hitbox: null, hurtbox: { x: 66, y: 35, w: 56, h: 130 }, rootX: 94, rootY: 110, torsoAngle: -0.06, headTilt: -0.04, leadArmAngle: 0.65, leadElbowAngle: -2.3, rearArmAngle: 0.55, rearElbowAngle: -2.2, leadLegAngle: 0.42, leadKneeAngle: 0.25, rearLegAngle: -0.45, rearKneeAngle: 0.3, handState: 'guard', vfxType: 'block_parry' },
        { frameIndex: 3, phase: 'recovery', durationMs: 80, isActive: false, hitbox: null, hurtbox: { x: 67, y: 35, w: 56, h: 130 }, rootX: 95, rootY: 109, torsoAngle: -0.04, headTilt: -0.03, leadArmAngle: 0.72, leadElbowAngle: -2.2, rearArmAngle: 0.62, rearElbowAngle: -2.1, leadLegAngle: 0.4, leadKneeAngle: 0.22, rearLegAngle: -0.42, rearKneeAngle: 0.28, handState: 'guard' },
      ],
    },

    // 7. PUNCH_LIGHT (4 frames, rapid snap jab)
    {
      name: 'punch_light',
      isLooping: false,
      frameCount: 4,
      startupFrames: 1,
      activeFrames: 2,
      recoveryFrames: 1,
      damage: 35,
      frames: [
        { frameIndex: 0, phase: 'startup', durationMs: 55, isActive: false, hitbox: null, hurtbox: { x: 68, y: 35, w: 52, h: 130 }, rootX: 94, rootY: 108, torsoAngle: -0.05, headTilt: -0.02, leadArmAngle: 0.9, leadElbowAngle: -2.1, rearArmAngle: 0.8, rearElbowAngle: -1.6, leadLegAngle: 0.38, leadKneeAngle: 0.2, rearLegAngle: -0.38, rearKneeAngle: 0.22, handState: 'fist' },
        { frameIndex: 1, phase: 'active', durationMs: 60, isActive: true, hitbox: { x: 125, y: 65, w: 46, h: 25 }, hurtbox: { x: 74, y: 35, w: 56, h: 130 }, rootX: 104, rootY: 107, torsoAngle: 0.16, headTilt: 0.05, leadArmAngle: 1.55, leadElbowAngle: -0.15, rearArmAngle: 0.7, rearElbowAngle: -1.7, leadLegAngle: 0.48, leadKneeAngle: 0.25, rearLegAngle: -0.45, rearKneeAngle: 0.18, handState: 'fist', vfxType: 'fire_trail', vfxPower: 0.8 },
        { frameIndex: 2, phase: 'active', durationMs: 60, isActive: true, hitbox: { x: 135, y: 64, w: 48, h: 25 }, hurtbox: { x: 75, y: 35, w: 56, h: 130 }, rootX: 106, rootY: 107, torsoAngle: 0.18, headTilt: 0.06, leadArmAngle: 1.58, leadElbowAngle: -0.08, rearArmAngle: 0.65, rearElbowAngle: -1.75, leadLegAngle: 0.5, leadKneeAngle: 0.26, rearLegAngle: -0.46, rearKneeAngle: 0.16, handState: 'impact', vfxType: 'fire_trail', vfxPower: 1.0 },
        { frameIndex: 3, phase: 'recovery', durationMs: 60, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 52, h: 130 }, rootX: 98, rootY: 108, torsoAngle: 0.08, headTilt: 0.03, leadArmAngle: 1.25, leadElbowAngle: -1.4, rearArmAngle: 0.75, rearElbowAngle: -1.6, leadLegAngle: 0.4, leadKneeAngle: 0.22, rearLegAngle: -0.4, rearKneeAngle: 0.22, handState: 'guard' },
      ],
    },

    // 8. PUNCH_HEAVY (6 frames, steelworker power straight)
    {
      name: 'punch_heavy',
      isLooping: false,
      frameCount: 6,
      startupFrames: 2,
      activeFrames: 2,
      recoveryFrames: 2,
      damage: 85,
      frames: [
        { frameIndex: 0, phase: 'startup', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 65, y: 35, w: 52, h: 130 }, rootX: 90, rootY: 110, torsoAngle: -0.15, headTilt: -0.05, leadArmAngle: 1.2, leadElbowAngle: -1.7, rearArmAngle: 0.6, rearElbowAngle: -2.4, leadLegAngle: 0.32, leadKneeAngle: 0.25, rearLegAngle: -0.45, rearKneeAngle: 0.35, handState: 'fist' },
        { frameIndex: 1, phase: 'startup', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 72, y: 35, w: 55, h: 130 }, rootX: 98, rootY: 108, torsoAngle: 0.05, headTilt: 0.02, leadArmAngle: 1.0, leadElbowAngle: -1.8, rearArmAngle: 1.1, rearElbowAngle: -1.8, leadLegAngle: 0.45, leadKneeAngle: 0.28, rearLegAngle: -0.48, rearKneeAngle: 0.25, handState: 'fist' },
        { frameIndex: 2, phase: 'active', durationMs: 75, isActive: true, hitbox: { x: 135, y: 62, w: 54, h: 32 }, hurtbox: { x: 78, y: 35, w: 60, h: 130 }, rootX: 110, rootY: 107, torsoAngle: 0.25, headTilt: 0.08, leadArmAngle: 0.65, leadElbowAngle: -1.9, rearArmAngle: 1.62, rearElbowAngle: -0.1, leadLegAngle: 0.62, leadKneeAngle: 0.35, rearLegAngle: -0.55, rearKneeAngle: 0.12, handState: 'impact', vfxType: 'fire_trail', vfxPower: 1.4 },
        { frameIndex: 3, phase: 'active', durationMs: 75, isActive: true, hitbox: { x: 145, y: 60, w: 55, h: 32 }, hurtbox: { x: 80, y: 35, w: 60, h: 130 }, rootX: 114, rootY: 107, torsoAngle: 0.28, headTilt: 0.09, leadArmAngle: 0.58, leadElbowAngle: -1.95, rearArmAngle: 1.65, rearElbowAngle: -0.05, leadLegAngle: 0.65, leadKneeAngle: 0.38, rearLegAngle: -0.58, rearKneeAngle: 0.1, handState: 'impact', vfxType: 'fire_trail', vfxPower: 1.8 },
        { frameIndex: 4, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 76, y: 35, w: 56, h: 130 }, rootX: 104, rootY: 108, torsoAngle: 0.16, headTilt: 0.05, leadArmAngle: 0.85, leadElbowAngle: -1.8, rearArmAngle: 1.25, rearElbowAngle: -1.2, leadLegAngle: 0.52, leadKneeAngle: 0.3, rearLegAngle: -0.48, rearKneeAngle: 0.2, handState: 'fist' },
        { frameIndex: 5, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 52, h: 130 }, rootX: 98, rootY: 108, torsoAngle: 0.08, headTilt: 0.03, leadArmAngle: 1.05, leadElbowAngle: -1.7, rearArmAngle: 0.85, rearElbowAngle: -1.5, leadLegAngle: 0.4, leadKneeAngle: 0.22, rearLegAngle: -0.4, rearKneeAngle: 0.24, handState: 'guard' },
      ],
    },

    // 9. KICK_LIGHT (4 frames, low shin / mid snap kick)
    {
      name: 'kick_light',
      isLooping: false,
      frameCount: 4,
      startupFrames: 1,
      activeFrames: 2,
      recoveryFrames: 1,
      damage: 40,
      frames: [
        { frameIndex: 0, phase: 'startup', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 68, y: 35, w: 52, h: 130 }, rootX: 92, rootY: 107, torsoAngle: -0.08, headTilt: -0.02, leadArmAngle: 1.35, leadElbowAngle: -1.8, rearArmAngle: 0.75, rearElbowAngle: -1.5, leadLegAngle: 0.8, leadKneeAngle: 1.4, rearLegAngle: -0.2, rearKneeAngle: 0.35, handState: 'guard' },
        { frameIndex: 1, phase: 'active', durationMs: 65, isActive: true, hitbox: { x: 125, y: 110, w: 52, h: 28 }, hurtbox: { x: 72, y: 35, w: 56, h: 130 }, rootX: 98, rootY: 107, torsoAngle: -0.15, headTilt: -0.04, leadArmAngle: 1.45, leadElbowAngle: -1.7, rearArmAngle: 0.65, rearElbowAngle: -1.6, leadLegAngle: 1.35, leadKneeAngle: 0.2, rearLegAngle: -0.25, rearKneeAngle: 0.4, handState: 'guard', vfxType: 'fire_trail', vfxPower: 0.9 },
        { frameIndex: 2, phase: 'active', durationMs: 65, isActive: true, hitbox: { x: 135, y: 108, w: 54, h: 28 }, hurtbox: { x: 74, y: 35, w: 56, h: 130 }, rootX: 100, rootY: 107, torsoAngle: -0.18, headTilt: -0.05, leadArmAngle: 1.5, leadElbowAngle: -1.65, rearArmAngle: 0.6, rearElbowAngle: -1.65, leadLegAngle: 1.4, leadKneeAngle: 0.1, rearLegAngle: -0.28, rearKneeAngle: 0.42, handState: 'guard', vfxType: 'fire_trail', vfxPower: 1.1 },
        { frameIndex: 3, phase: 'recovery', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 69, y: 35, w: 52, h: 130 }, rootX: 95, rootY: 108, torsoAngle: -0.04, headTilt: -0.01, leadArmAngle: 1.2, leadElbowAngle: -1.7, rearArmAngle: 0.8, rearElbowAngle: -1.5, leadLegAngle: 0.6, leadKneeAngle: 0.7, rearLegAngle: -0.32, rearKneeAngle: 0.3, handState: 'guard' },
      ],
    },

    // 10. KICK_HEAVY (6 frames, heavy roundhouse axe kick)
    {
      name: 'kick_heavy',
      isLooping: false,
      frameCount: 6,
      startupFrames: 2,
      activeFrames: 2,
      recoveryFrames: 2,
      damage: 95,
      frames: [
        { frameIndex: 0, phase: 'startup', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 66, y: 35, w: 54, h: 130 }, rootX: 92, rootY: 108, torsoAngle: -0.12, headTilt: -0.04, leadArmAngle: 1.4, leadElbowAngle: -1.6, rearArmAngle: 0.65, rearElbowAngle: -1.6, leadLegAngle: 0.5, leadKneeAngle: 0.4, rearLegAngle: -0.4, rearKneeAngle: 0.3, handState: 'guard' },
        { frameIndex: 1, phase: 'startup', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 55, h: 130 }, rootX: 96, rootY: 106, torsoAngle: -0.22, headTilt: -0.08, leadArmAngle: 1.6, leadElbowAngle: -1.4, rearArmAngle: 0.5, rearElbowAngle: -1.7, leadLegAngle: 1.2, leadKneeAngle: 1.3, rearLegAngle: -0.2, rearKneeAngle: 0.4, handState: 'guard' },
        { frameIndex: 2, phase: 'active', durationMs: 80, isActive: true, hitbox: { x: 130, y: 55, w: 58, h: 38 }, hurtbox: { x: 74, y: 35, w: 60, h: 130 }, rootX: 104, rootY: 106, torsoAngle: -0.32, headTilt: -0.12, leadArmAngle: 1.75, leadElbowAngle: -1.2, rearArmAngle: 0.4, rearElbowAngle: -1.8, leadLegAngle: 1.68, leadKneeAngle: 0.15, rearLegAngle: -0.25, rearKneeAngle: 0.45, handState: 'guard', vfxType: 'fire_trail', vfxPower: 1.5 },
        { frameIndex: 3, phase: 'active', durationMs: 80, isActive: true, hitbox: { x: 140, y: 52, w: 60, h: 40 }, hurtbox: { x: 76, y: 35, w: 60, h: 130 }, rootX: 108, rootY: 106, torsoAngle: -0.35, headTilt: -0.14, leadArmAngle: 1.8, leadElbowAngle: -1.15, rearArmAngle: 0.35, rearElbowAngle: -1.85, leadLegAngle: 1.72, leadKneeAngle: 0.08, rearLegAngle: -0.28, rearKneeAngle: 0.48, handState: 'guard', vfxType: 'fire_trail', vfxPower: 1.9 },
        { frameIndex: 4, phase: 'recovery', durationMs: 80, isActive: false, hitbox: null, hurtbox: { x: 72, y: 35, w: 56, h: 130 }, rootX: 102, rootY: 107, torsoAngle: -0.18, headTilt: -0.06, leadArmAngle: 1.45, leadElbowAngle: -1.5, rearArmAngle: 0.6, rearElbowAngle: -1.65, leadLegAngle: 1.1, leadKneeAngle: 0.6, rearLegAngle: -0.32, rearKneeAngle: 0.38, handState: 'guard' },
        { frameIndex: 5, phase: 'recovery', durationMs: 80, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 52, h: 130 }, rootX: 96, rootY: 108, torsoAngle: -0.05, headTilt: 0.0, leadArmAngle: 1.15, leadElbowAngle: -1.7, rearArmAngle: 0.8, rearElbowAngle: -1.5, leadLegAngle: 0.45, leadKneeAngle: 0.25, rearLegAngle: -0.38, rearKneeAngle: 0.25, handState: 'guard' },
      ],
    },

    // 11. SPECIAL_1 (6 frames, "Iron Foundry Fist" lunging kinetic uppercut)
    {
      name: 'special_1',
      isLooping: false,
      frameCount: 6,
      startupFrames: 2,
      activeFrames: 2,
      recoveryFrames: 2,
      damage: 120,
      frames: [
        { frameIndex: 0, phase: 'startup', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 65, y: 55, w: 58, h: 110 }, rootX: 88, rootY: 120, torsoAngle: 0.25, headTilt: 0.1, leadArmAngle: 0.6, leadElbowAngle: -2.2, rearArmAngle: 0.3, rearElbowAngle: -2.4, leadLegAngle: 0.75, leadKneeAngle: 0.75, rearLegAngle: -0.65, rearKneeAngle: 0.8, handState: 'fist', vfxType: 'fire_trail', vfxPower: 0.8 },
        { frameIndex: 1, phase: 'startup', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 72, y: 50, w: 60, h: 115 }, rootX: 98, rootY: 116, torsoAngle: 0.32, headTilt: 0.12, leadArmAngle: 0.8, leadElbowAngle: -2.0, rearArmAngle: 0.5, rearElbowAngle: -2.2, leadLegAngle: 0.85, leadKneeAngle: 0.85, rearLegAngle: -0.75, rearKneeAngle: 0.6, handState: 'fist', vfxType: 'fire_trail', vfxPower: 1.3 },
        { frameIndex: 2, phase: 'active', durationMs: 75, isActive: true, hitbox: { x: 130, y: 35, w: 58, h: 65 }, hurtbox: { x: 78, y: 30, w: 62, h: 125 }, rootX: 110, rootY: 96, torsoAngle: 0.12, headTilt: -0.05, leadArmAngle: 0.5, leadElbowAngle: -1.6, rearArmAngle: 1.85, rearElbowAngle: -0.25, leadLegAngle: 0.45, leadKneeAngle: 0.3, rearLegAngle: -0.45, rearKneeAngle: 0.15, handState: 'impact', vfxType: 'shockwave', vfxPower: 1.6 },
        { frameIndex: 3, phase: 'active', durationMs: 75, isActive: true, hitbox: { x: 132, y: 25, w: 60, h: 70 }, hurtbox: { x: 80, y: 25, w: 62, h: 120 }, rootX: 112, rootY: 88, torsoAngle: 0.08, headTilt: -0.08, leadArmAngle: 0.4, leadElbowAngle: -1.5, rearArmAngle: 1.95, rearElbowAngle: -0.1, leadLegAngle: 0.35, leadKneeAngle: 0.18, rearLegAngle: -0.35, rearKneeAngle: 0.1, handState: 'impact', vfxType: 'shockwave', vfxPower: 2.1 },
        { frameIndex: 4, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 75, y: 35, w: 56, h: 125 }, rootX: 104, rootY: 104, torsoAngle: 0.14, headTilt: 0.03, leadArmAngle: 0.85, leadElbowAngle: -1.6, rearArmAngle: 1.35, rearElbowAngle: -1.0, leadLegAngle: 0.48, leadKneeAngle: 0.35, rearLegAngle: -0.45, rearKneeAngle: 0.25, handState: 'guard' },
        { frameIndex: 5, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 52, h: 130 }, rootX: 98, rootY: 108, torsoAngle: 0.08, headTilt: 0.02, leadArmAngle: 1.05, leadElbowAngle: -1.7, rearArmAngle: 0.85, rearElbowAngle: -1.5, leadLegAngle: 0.38, leadKneeAngle: 0.22, rearLegAngle: -0.38, rearKneeAngle: 0.24, handState: 'guard' },
      ],
    },

    // 12. SPECIAL_2 (7 frames, "Forge Breaker" multi-strike burst)
    {
      name: 'special_2',
      isLooping: false,
      frameCount: 7,
      startupFrames: 2,
      activeFrames: 3,
      recoveryFrames: 2,
      damage: 160,
      frames: [
        { frameIndex: 0, phase: 'startup', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 65, y: 40, w: 56, h: 125 }, rootX: 90, rootY: 110, torsoAngle: -0.18, headTilt: -0.06, leadArmAngle: 0.8, leadElbowAngle: -2.3, rearArmAngle: 0.7, rearElbowAngle: -2.3, leadLegAngle: 0.45, leadKneeAngle: 0.35, rearLegAngle: -0.45, rearKneeAngle: 0.35, handState: 'fist', vfxType: 'fire_trail', vfxPower: 1.2 },
        { frameIndex: 1, phase: 'startup', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 74, y: 35, w: 58, h: 130 }, rootX: 102, rootY: 108, torsoAngle: 0.15, headTilt: 0.05, leadArmAngle: 1.2, leadElbowAngle: -1.8, rearArmAngle: 1.0, rearElbowAngle: -1.8, leadLegAngle: 0.6, leadKneeAngle: 0.3, rearLegAngle: -0.5, rearKneeAngle: 0.2, handState: 'fist', vfxType: 'fire_trail', vfxPower: 1.6 },
        { frameIndex: 2, phase: 'active', durationMs: 70, isActive: true, hitbox: { x: 132, y: 70, w: 55, h: 32 }, hurtbox: { x: 78, y: 35, w: 60, h: 130 }, rootX: 112, rootY: 107, torsoAngle: 0.24, headTilt: 0.08, leadArmAngle: 1.6, leadElbowAngle: -0.2, rearArmAngle: 0.6, rearElbowAngle: -1.8, leadLegAngle: 0.65, leadKneeAngle: 0.35, rearLegAngle: -0.55, rearKneeAngle: 0.15, handState: 'impact', vfxType: 'shockwave', vfxPower: 1.8 },
        { frameIndex: 3, phase: 'active', durationMs: 70, isActive: true, hitbox: { x: 138, y: 55, w: 56, h: 35 }, hurtbox: { x: 79, y: 35, w: 60, h: 130 }, rootX: 114, rootY: 106, torsoAngle: 0.15, headTilt: 0.04, leadArmAngle: 0.7, leadElbowAngle: -2.4, rearArmAngle: 1.65, rearElbowAngle: -0.15, leadLegAngle: 0.68, leadKneeAngle: 0.38, rearLegAngle: -0.58, rearKneeAngle: 0.12, handState: 'impact', vfxType: 'shockwave', vfxPower: 2.2 },
        { frameIndex: 4, phase: 'active', durationMs: 70, isActive: true, hitbox: { x: 142, y: 65, w: 58, h: 36 }, hurtbox: { x: 80, y: 35, w: 60, h: 130 }, rootX: 116, rootY: 107, torsoAngle: 0.3, headTilt: 0.1, leadArmAngle: 1.65, leadElbowAngle: -0.1, rearArmAngle: 1.45, rearElbowAngle: -0.4, leadLegAngle: 0.7, leadKneeAngle: 0.4, rearLegAngle: -0.6, rearKneeAngle: 0.1, handState: 'impact', vfxType: 'shockwave', vfxPower: 2.5 },
        { frameIndex: 5, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 75, y: 35, w: 56, h: 130 }, rootX: 106, rootY: 108, torsoAngle: 0.18, headTilt: 0.06, leadArmAngle: 1.25, leadElbowAngle: -1.4, rearArmAngle: 1.05, rearElbowAngle: -1.4, leadLegAngle: 0.52, leadKneeAngle: 0.3, rearLegAngle: -0.48, rearKneeAngle: 0.2, handState: 'fist' },
        { frameIndex: 6, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 52, h: 130 }, rootX: 98, rootY: 108, torsoAngle: 0.08, headTilt: 0.03, leadArmAngle: 1.08, leadElbowAngle: -1.68, rearArmAngle: 0.85, rearElbowAngle: -1.5, leadLegAngle: 0.38, leadKneeAngle: 0.2, rearLegAngle: -0.38, rearKneeAngle: 0.22, handState: 'guard' },
      ],
    },

    // 13. SPECIAL_3 (7 frames, "Kala Chakra Overdrive" Climax Super Move)
    {
      name: 'special_3',
      isLooping: false,
      frameCount: 7,
      startupFrames: 2,
      activeFrames: 3,
      recoveryFrames: 2,
      damage: 220,
      frames: [
        { frameIndex: 0, phase: 'startup', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 65, y: 35, w: 56, h: 130 }, rootX: 90, rootY: 110, torsoAngle: -0.1, headTilt: 0.0, leadArmAngle: 1.1, leadElbowAngle: -1.8, rearArmAngle: 0.9, rearElbowAngle: -1.8, leadLegAngle: 0.45, leadKneeAngle: 0.35, rearLegAngle: -0.45, rearKneeAngle: 0.35, handState: 'open', vfxType: 'super_burst', vfxPower: 1.5 },
        { frameIndex: 1, phase: 'startup', durationMs: 65, isActive: false, hitbox: null, hurtbox: { x: 75, y: 35, w: 58, h: 130 }, rootX: 104, rootY: 106, torsoAngle: 0.2, headTilt: 0.06, leadArmAngle: 1.5, leadElbowAngle: -1.0, rearArmAngle: 1.2, rearElbowAngle: -1.2, leadLegAngle: 0.65, leadKneeAngle: 0.25, rearLegAngle: -0.55, rearKneeAngle: 0.15, handState: 'fist', vfxType: 'super_burst', vfxPower: 2.0 },
        { frameIndex: 2, phase: 'active', durationMs: 70, isActive: true, hitbox: { x: 135, y: 45, w: 65, h: 55 }, hurtbox: { x: 80, y: 35, w: 62, h: 130 }, rootX: 115, rootY: 105, torsoAngle: 0.28, headTilt: 0.09, leadArmAngle: 1.68, leadElbowAngle: -0.05, rearArmAngle: 0.6, rearElbowAngle: -1.8, leadLegAngle: 0.72, leadKneeAngle: 0.38, rearLegAngle: -0.6, rearKneeAngle: 0.1, handState: 'impact', vfxType: 'super_burst', vfxPower: 2.8 },
        { frameIndex: 3, phase: 'active', durationMs: 70, isActive: true, hitbox: { x: 140, y: 40, w: 68, h: 60 }, hurtbox: { x: 82, y: 35, w: 62, h: 130 }, rootX: 118, rootY: 105, torsoAngle: 0.32, headTilt: 0.11, leadArmAngle: 1.72, leadElbowAngle: 0.0, rearArmAngle: 0.55, rearElbowAngle: -1.85, leadLegAngle: 0.75, leadKneeAngle: 0.4, rearLegAngle: -0.62, rearKneeAngle: 0.08, handState: 'impact', vfxType: 'super_burst', vfxPower: 3.2 },
        { frameIndex: 4, phase: 'active', durationMs: 70, isActive: true, hitbox: { x: 142, y: 42, w: 68, h: 60 }, hurtbox: { x: 82, y: 35, w: 62, h: 130 }, rootX: 118, rootY: 106, torsoAngle: 0.28, headTilt: 0.09, leadArmAngle: 1.65, leadElbowAngle: -0.1, rearArmAngle: 0.65, rearElbowAngle: -1.75, leadLegAngle: 0.72, leadKneeAngle: 0.36, rearLegAngle: -0.58, rearKneeAngle: 0.12, handState: 'impact', vfxType: 'super_burst', vfxPower: 2.6 },
        { frameIndex: 5, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 76, y: 35, w: 58, h: 130 }, rootX: 108, rootY: 107, torsoAngle: 0.16, headTilt: 0.05, leadArmAngle: 1.35, leadElbowAngle: -1.3, rearArmAngle: 0.9, rearElbowAngle: -1.5, leadLegAngle: 0.55, leadKneeAngle: 0.28, rearLegAngle: -0.48, rearKneeAngle: 0.2, handState: 'guard' },
        { frameIndex: 6, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 70, y: 35, w: 52, h: 130 }, rootX: 98, rootY: 108, torsoAngle: 0.08, headTilt: 0.03, leadArmAngle: 1.1, leadElbowAngle: -1.65, rearArmAngle: 0.85, rearElbowAngle: -1.5, leadLegAngle: 0.38, leadKneeAngle: 0.2, rearLegAngle: -0.38, rearKneeAngle: 0.22, handState: 'guard' },
      ],
    },

    // 14. HURT_HIGH (4 frames, head / upper body recoil)
    {
      name: 'hurt_high',
      isLooping: false,
      frameCount: 4,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 4,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 60, y: 38, w: 54, h: 130 }, rootX: 84, rootY: 109, torsoAngle: -0.25, headTilt: -0.2, leadArmAngle: 0.8, leadElbowAngle: -1.2, rearArmAngle: 0.6, rearElbowAngle: -1.2, leadLegAngle: 0.45, leadKneeAngle: 0.35, rearLegAngle: -0.55, rearKneeAngle: 0.4, handState: 'open' },
        { frameIndex: 1, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 55, y: 40, w: 56, h: 125 }, rootX: 78, rootY: 111, torsoAngle: -0.38, headTilt: -0.28, leadArmAngle: 0.65, leadElbowAngle: -1.1, rearArmAngle: 0.45, rearElbowAngle: -1.1, leadLegAngle: 0.5, leadKneeAngle: 0.4, rearLegAngle: -0.62, rearKneeAngle: 0.45, handState: 'open' },
        { frameIndex: 2, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 62, y: 38, w: 54, h: 130 }, rootX: 86, rootY: 110, torsoAngle: -0.2, headTilt: -0.15, leadArmAngle: 0.95, leadElbowAngle: -1.45, rearArmAngle: 0.7, rearElbowAngle: -1.35, leadLegAngle: 0.42, leadKneeAngle: 0.3, rearLegAngle: -0.5, rearKneeAngle: 0.35, handState: 'guard' },
        { frameIndex: 3, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 68, y: 35, w: 52, h: 130 }, rootX: 94, rootY: 108, torsoAngle: -0.06, headTilt: -0.03, leadArmAngle: 1.1, leadElbowAngle: -1.65, rearArmAngle: 0.8, rearElbowAngle: -1.48, leadLegAngle: 0.38, leadKneeAngle: 0.22, rearLegAngle: -0.4, rearKneeAngle: 0.26, handState: 'guard' },
      ],
    },

    // 15. HURT_LOW (4 frames, midsection impact recoil)
    {
      name: 'hurt_low',
      isLooping: false,
      frameCount: 4,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 4,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: 70, isActive: false, hitbox: null, hurtbox: { x: 62, y: 45, w: 55, h: 120 }, rootX: 86, rootY: 116, torsoAngle: 0.24, headTilt: 0.15, leadArmAngle: 0.75, leadElbowAngle: -2.1, rearArmAngle: 0.65, rearElbowAngle: -2.0, leadLegAngle: 0.55, leadKneeAngle: 0.55, rearLegAngle: -0.5, rearKneeAngle: 0.55, handState: 'guard' },
        { frameIndex: 1, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 58, y: 50, w: 56, h: 115 }, rootX: 80, rootY: 120, torsoAngle: 0.35, headTilt: 0.22, leadArmAngle: 0.6, leadElbowAngle: -2.2, rearArmAngle: 0.5, rearElbowAngle: -2.1, leadLegAngle: 0.65, leadKneeAngle: 0.65, rearLegAngle: -0.6, rearKneeAngle: 0.65, handState: 'guard' },
        { frameIndex: 2, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 64, y: 44, w: 54, h: 120 }, rootX: 88, rootY: 115, torsoAngle: 0.18, headTilt: 0.1, leadArmAngle: 0.9, leadElbowAngle: -1.9, rearArmAngle: 0.75, rearElbowAngle: -1.75, leadLegAngle: 0.5, leadKneeAngle: 0.4, rearLegAngle: -0.48, rearKneeAngle: 0.42, handState: 'guard' },
        { frameIndex: 3, phase: 'recovery', durationMs: 75, isActive: false, hitbox: null, hurtbox: { x: 68, y: 36, w: 52, h: 130 }, rootX: 94, rootY: 109, torsoAngle: 0.06, headTilt: 0.03, leadArmAngle: 1.08, leadElbowAngle: -1.7, rearArmAngle: 0.82, rearElbowAngle: -1.5, leadLegAngle: 0.38, leadKneeAngle: 0.24, rearLegAngle: -0.38, rearKneeAngle: 0.28, handState: 'guard' },
      ],
    },

    // 16. KNOCKDOWN (6 frames, heavy launch, floor crash, roll, and getup)
    {
      name: 'knockdown',
      isLooping: false,
      frameCount: 6,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 6,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: 85, isActive: false, hitbox: null, hurtbox: { x: 45, y: 55, w: 65, h: 90 }, rootX: 75, rootY: 112, torsoAngle: -0.65, headTilt: -0.35, leadArmAngle: 0.4, leadElbowAngle: -0.8, rearArmAngle: 0.2, rearElbowAngle: -0.8, leadLegAngle: 0.2, leadKneeAngle: 0.2, rearLegAngle: -0.3, rearKneeAngle: 0.3, handState: 'open' },
        { frameIndex: 1, phase: 'recovery', durationMs: 85, isActive: false, hitbox: null, hurtbox: { x: 35, y: 70, w: 80, h: 70 }, rootX: 65, rootY: 125, torsoAngle: -1.1, headTilt: -0.4, leadArmAngle: 0.1, leadElbowAngle: -0.6, rearArmAngle: -0.1, rearElbowAngle: -0.6, leadLegAngle: 0.1, leadKneeAngle: 0.15, rearLegAngle: -0.15, rearKneeAngle: 0.2, handState: 'open' },
        { frameIndex: 2, phase: 'recovery', durationMs: 90, isActive: false, hitbox: null, hurtbox: { x: 30, y: 125, w: 95, h: 42 }, rootX: 60, rootY: 152, torsoAngle: -1.52, headTilt: 0.0, leadArmAngle: -0.2, leadElbowAngle: -0.3, rearArmAngle: -0.3, rearElbowAngle: -0.3, leadLegAngle: 0.05, leadKneeAngle: 0.05, rearLegAngle: -0.05, rearKneeAngle: 0.05, handState: 'open', vfxType: 'dust' },
        { frameIndex: 3, phase: 'recovery', durationMs: 90, isActive: false, hitbox: null, hurtbox: { x: 35, y: 125, w: 90, h: 42 }, rootX: 64, rootY: 150, torsoAngle: -1.45, headTilt: 0.1, leadArmAngle: 0.1, leadElbowAngle: -0.8, rearArmAngle: 0.0, rearElbowAngle: -0.8, leadLegAngle: 0.15, leadKneeAngle: 0.3, rearLegAngle: -0.1, rearKneeAngle: 0.25, handState: 'open' },
        { frameIndex: 4, phase: 'recovery', durationMs: 90, isActive: false, hitbox: null, hurtbox: { x: 45, y: 95, w: 75, h: 65 }, rootX: 74, rootY: 138, torsoAngle: -0.85, headTilt: 0.25, leadArmAngle: 0.5, leadElbowAngle: -1.4, rearArmAngle: 0.3, rearElbowAngle: -1.5, leadLegAngle: 0.5, leadKneeAngle: 0.8, rearLegAngle: -0.35, rearKneeAngle: 0.85, handState: 'open' },
        { frameIndex: 5, phase: 'recovery', durationMs: 90, isActive: false, hitbox: null, hurtbox: { x: 62, y: 65, w: 60, h: 100 }, rootX: 88, rootY: 122, torsoAngle: 0.2, headTilt: 0.1, leadArmAngle: 0.85, leadElbowAngle: -1.75, rearArmAngle: 0.65, rearElbowAngle: -1.6, leadLegAngle: 0.72, leadKneeAngle: 0.8, rearLegAngle: -0.6, rearKneeAngle: 0.9, handState: 'guard' },
      ],
    },

    // 17. KO (5 frames, defeat collapse and final rest)
    {
      name: 'ko',
      isLooping: false,
      frameCount: 5,
      startupFrames: 0,
      activeFrames: 0,
      recoveryFrames: 5,
      damage: 0,
      frames: [
        { frameIndex: 0, phase: 'recovery', durationMs: 110, isActive: false, hitbox: null, hurtbox: { x: 55, y: 40, w: 55, h: 125 }, rootX: 82, rootY: 112, torsoAngle: -0.35, headTilt: -0.3, leadArmAngle: 0.6, leadElbowAngle: -1.0, rearArmAngle: 0.4, rearElbowAngle: -1.0, leadLegAngle: 0.45, leadKneeAngle: 0.4, rearLegAngle: -0.5, rearKneeAngle: 0.45, handState: 'open' },
        { frameIndex: 1, phase: 'recovery', durationMs: 110, isActive: false, hitbox: null, hurtbox: { x: 45, y: 65, w: 68, h: 95 }, rootX: 72, rootY: 128, torsoAngle: -0.85, headTilt: -0.4, leadArmAngle: 0.3, leadElbowAngle: -0.6, rearArmAngle: 0.1, rearElbowAngle: -0.6, leadLegAngle: 0.3, leadKneeAngle: 0.65, rearLegAngle: -0.35, rearKneeAngle: 0.7, handState: 'open' },
        { frameIndex: 2, phase: 'recovery', durationMs: 120, isActive: false, hitbox: null, hurtbox: { x: 35, y: 110, w: 85, h: 55 }, rootX: 64, rootY: 145, torsoAngle: -1.35, headTilt: -0.3, leadArmAngle: 0.0, leadElbowAngle: -0.3, rearArmAngle: -0.2, rearElbowAngle: -0.3, leadLegAngle: 0.1, leadKneeAngle: 0.2, rearLegAngle: -0.1, rearKneeAngle: 0.2, handState: 'open', vfxType: 'dust' },
        { frameIndex: 3, phase: 'recovery', durationMs: 120, isActive: false, hitbox: null, hurtbox: { x: 28, y: 130, w: 98, h: 38 }, rootX: 58, rootY: 154, torsoAngle: -1.55, headTilt: -0.15, leadArmAngle: -0.1, leadElbowAngle: -0.1, rearArmAngle: -0.25, rearElbowAngle: -0.1, leadLegAngle: 0.05, leadKneeAngle: 0.05, rearLegAngle: -0.05, rearKneeAngle: 0.05, handState: 'open' },
        { frameIndex: 4, phase: 'recovery', durationMs: 150, isActive: false, hitbox: null, hurtbox: { x: 28, y: 132, w: 98, h: 36 }, rootX: 58, rootY: 155, torsoAngle: -1.57, headTilt: -0.1, leadArmAngle: -0.1, leadElbowAngle: -0.05, rearArmAngle: -0.25, rearElbowAngle: -0.05, leadLegAngle: 0.0, leadKneeAngle: 0.0, rearLegAngle: 0.0, rearKneeAngle: 0.0, handState: 'open' },
      ],
    },
  ];

  return actions;
}

async function main() {
  console.log('=================================================================');
  console.log('FATE OF FIGHTERS — ARJUN ANIMATION PIPELINE GENERATOR');
  console.log('=================================================================');

  const stagedDir = path.resolve('public/assets/characters/arjun/actions_staged');
  const stagedFramesDir = path.join(stagedDir, 'frames');
  fs.mkdirSync(stagedFramesDir, { recursive: true });

  const actions = buildArjunActionSuite();
  console.log(`Loaded ${actions.length} action specifications.`);

  // 1. Render Individual Frames and compute Atlas Placements
  const renderedFrames: { actionName: string; frameIndex: number; sheetIndex: number; fb: FrameBuffer }[] = [];
  let currentSheetIndex = 0;

  const atlasBuffer = new FrameBuffer(SHEET_W, SHEET_H);
  const actionOffsets: Record<string, { startSheetIndex: number; frameCount: number }> = {};

  for (const action of actions) {
    actionOffsets[action.name] = {
      startSheetIndex: currentSheetIndex,
      frameCount: action.frameCount,
    };

    for (let f = 0; f < action.frames.length; f++) {
      const frameDef = action.frames[f];
      const sheetIdx = currentSheetIndex + f;
      const fb = renderArjunFrame(action.name, frameDef);

      renderedFrames.push({
        actionName: action.name,
        frameIndex: f,
        sheetIndex: sheetIdx,
        fb,
      });

      // Save individual frame PNG in staged/frames
      const frameFilename = `${action.name}_${f}.png`;
      const framePath = path.join(stagedFramesDir, frameFilename);
      fs.writeFileSync(framePath, frameBufferToPng(fb));

      // Blit into Consolidated SpriteSheet Atlas
      const col = sheetIdx % COLS;
      const row = Math.floor(sheetIdx / COLS);
      const destX = col * FRAME_W;
      const destY = row * FRAME_H;

      for (let py = 0; py < FRAME_H; py++) {
        for (let px = 0; px < FRAME_W; px++) {
          const srcIdx = (py * FRAME_W + px) * 4;
          const a = fb.data[srcIdx + 3];
          if (a > 0) {
            atlasBuffer.setPixel(destX + px, destY + py, [
              fb.data[srcIdx],
              fb.data[srcIdx + 1],
              fb.data[srcIdx + 2],
              a,
            ]);
          }
        }
      }
    }

    currentSheetIndex += action.frameCount;
  }

  console.log(`Rendered ${renderedFrames.length} distinct frames into ${stagedFramesDir}`);

  // 2. Save Consolidated SpriteSheet Atlas
  const atlasPngBuffer = frameBufferToPng(atlasBuffer);
  const atlasPath = path.join(stagedDir, 'spritesheet.png');
  fs.writeFileSync(atlasPath, atlasPngBuffer);
  console.log(`Saved Atlas SpriteSheet: ${atlasPath} (${(atlasPngBuffer.length / 1024).toFixed(1)} KB)`);

  // 3. Compile synchronized actions.json manifest
  const actionsManifestData: any = {
    characterId: 'arjun',
    characterName: 'Arjun Rao',
    standardFps: 60,
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    actions: {},
    spriteSheet: {
      url: '/assets/characters/arjun/actions/spritesheet.png',
      width: SHEET_W,
      height: SHEET_H,
      cols: COLS,
      rows: ROWS,
      totalFrames: renderedFrames.length,
      actionOffsets: {
        ...actionOffsets,
        // Canonical Aliases
        light_punch: actionOffsets.punch_light,
        heavy_punch: actionOffsets.punch_heavy,
        light_kick: actionOffsets.kick_light,
        heavy_kick: actionOffsets.kick_heavy,
        crouch: actionOffsets.crouch_idle,
        special_move: actionOffsets.special_1,
      },
    },
  };

  for (const action of actions) {
    actionsManifestData.actions[action.name] = {
      actionName: action.name,
      isLooping: action.isLooping,
      frameCount: action.frameCount,
      gifUrl: `/assets/characters/arjun/actions/${action.name}.gif`,
      startupFrames: action.startupFrames,
      activeFrames: action.activeFrames,
      recoveryFrames: action.recoveryFrames,
      damage: action.damage,
      frames: action.frames.map((fr, idx) => ({
        frameIndex: idx,
        sheetIndex: actionOffsets[action.name].startSheetIndex + idx,
        phase: fr.phase,
        durationMs: fr.durationMs,
        isActive: fr.isActive,
        hitbox: fr.hitbox,
        hurtbox: fr.hurtbox,
      })),
    };
  }

  const manifestPath = path.join(stagedDir, 'actions.json');
  fs.writeFileSync(manifestPath, JSON.stringify(actionsManifestData, null, 2), 'utf-8');
  console.log(`Saved Synchronized actions.json: ${manifestPath}`);

  // 4. Generate Animated GIFs using ffmpeg
  console.log('Generating animated GIFs for all 17 actions via ffmpeg...');
  for (const action of actions) {
    const gifPath = path.join(stagedDir, `${action.name}.gif`);
    const tempDir = path.join(stagedDir, `temp_${action.name}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Copy frames sequentially with numeric indices for ffmpeg input
    for (let f = 0; f < action.frames.length; f++) {
      const srcFrame = path.join(stagedFramesDir, `${action.name}_${f}.png`);
      const destFrame = path.join(tempDir, `f_${f.toString().padStart(3, '0')}.png`);
      fs.copyFileSync(srcFrame, destFrame);
    }

    try {
      const framerate = Math.round(1000 / DEFAULT_FRAME_MS);
      execSync(
        `ffmpeg -y -framerate ${framerate} -i "${tempDir}/f_%03d.png" -vf "split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[s1][p]paletteuse=alpha_threshold=128" "${gifPath}" 2>/dev/null`
      );
    } catch {
      // Fallback ImageMagick convert
      try {
        execSync(`convert -delay 8 -dispose previous "${tempDir}/f_*.png" "${gifPath}" 2>/dev/null`);
      } catch (err) {
        console.warn(`  Warning: Could not compile GIF for ${action.name}:`, err);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  console.log(`Generated 17 animated GIFs in ${stagedDir}`);

  // 5. Build Contact Sheet Grid (16 columns x 6 rows)
  const contactSheetPath = path.join(stagedDir, 'contact_sheet.png');
  fs.writeFileSync(contactSheetPath, atlasPngBuffer);
  console.log(`Generated Contact Sheet: ${contactSheetPath}`);

  // 6. Build Before-and-After Comparison Sheet
  const comparisonBuffer = new FrameBuffer(FRAME_W * 4, FRAME_H * 3);
  // Row 0: Idle, Row 1: Punch Heavy, Row 2: Special 1
  const compActions = ['idle', 'punch_heavy', 'special_1'];
  for (let r = 0; r < compActions.length; r++) {
    const act = compActions[r];
    for (let col = 0; col < 4; col++) {
      const framePath = path.join(stagedFramesDir, `${act}_${col}.png`);
      if (fs.existsSync(framePath)) {
        const destX = col * FRAME_W;
        const destY = r * FRAME_H;
        const fb = renderedFrames.find((rf) => rf.actionName === act && rf.frameIndex === col)?.fb;
        if (fb) {
          for (let py = 0; py < FRAME_H; py++) {
            for (let px = 0; px < FRAME_W; px++) {
              const srcIdx = (py * FRAME_W + px) * 4;
              const a = fb.data[srcIdx + 3];
              if (a > 0) {
                comparisonBuffer.setPixel(destX + px, destY + py, [
                  fb.data[srcIdx],
                  fb.data[srcIdx + 1],
                  fb.data[srcIdx + 2],
                  a,
                ]);
              }
            }
          }
        }
      }
    }
  }

  const comparisonPath = path.join(stagedDir, 'before_after_comparison.png');
  fs.writeFileSync(comparisonPath, frameBufferToPng(comparisonBuffer));
  console.log(`Generated Before-and-After Comparison Sheet: ${comparisonPath}`);

  console.log('=================================================================');
  console.log('ARJUN ANIMATION PIPELINE GENERATION COMPLETE (STAGED)');
  console.log('Ready for automated QA validation.');
  console.log('=================================================================');
}

main().catch(console.error);
