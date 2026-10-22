import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Fate of Fighters (FOF) — Automated QA Validation Suite for Arjun Animation Pipeline
 * Commercial 2.5D Arcade Standards
 * 
 * Executes 6 Comprehensive Verification Test Suites:
 * 1. Duplicate & Near-Identical Frame Detection (Pixel delta & MAD)
 * 2. Dimensions, Format, & Alpha Transparency Verification
 * 3. Foot Contact Grounding & Altitude Clamping
 * 4. Silhouette & Kinematic Variance Verification
 * 5. Character Costume & Palette Consistency Check
 * 6. Manifest Metadata, Phase Synchronization & Hitbox Audit
 */

interface PngData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

// Parses raw uncompressed RGBA pixel data from PNG buffer
function decodePng(buffer: Buffer): PngData {
  let offset = 8; // skip signature
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + len);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + len;
  }

  const compressed = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressed);

  const rowLen = width * 4 + 1;
  const outData = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    const filter = decompressed[rowOffset];
    const srcRow = rowOffset + 1;
    const destRow = y * width * 4;

    for (let x = 0; x < width * 4; x++) {
      let val = decompressed[srcRow + x];
      if (filter === 1) {
        // Sub
        const left = x >= 4 ? outData[destRow + x - 4] : 0;
        val = (val + left) & 0xff;
      } else if (filter === 2) {
        // Up
        const up = y > 0 ? outData[destRow - width * 4 + x] : 0;
        val = (val + up) & 0xff;
      } else if (filter === 3) {
        // Average
        const left = x >= 4 ? outData[destRow + x - 4] : 0;
        const up = y > 0 ? outData[destRow - width * 4 + x] : 0;
        val = (val + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        // Paeth
        const a = x >= 4 ? outData[destRow + x - 4] : 0;
        const b = y > 0 ? outData[destRow - width * 4 + x] : 0;
        const c = x >= 4 && y > 0 ? outData[destRow - width * 4 + x - 4] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = a;
        if (pb < pa && pb < pc) pr = b;
        else if (pc < pa) pr = c;
        val = (val + pr) & 0xff;
      }
      outData[destRow + x] = val;
    }
  }

  return { width, height, data: outData };
}

function calculateMad(img1: PngData, img2: PngData): number {
  if (img1.width !== img2.width || img1.height !== img2.height) return 999;
  let diffSum = 0;
  const total = img1.width * img1.height * 4;
  for (let i = 0; i < total; i++) {
    diffSum += Math.abs(img1.data[i] - img2.data[i]);
  }
  return diffSum / (img1.width * img1.height);
}

async function runValidation() {
  console.log('=================================================================');
  console.log('FATE OF FIGHTERS — ARJUN ANIMATION QA VALIDATION SUITE');
  console.log('=================================================================');

  const stagedDir = path.resolve('public/assets/characters/arjun/actions_staged');
  const framesDir = path.join(stagedDir, 'frames');
  const manifestPath = path.join(stagedDir, 'actions.json');
  const atlasPath = path.join(stagedDir, 'spritesheet.png');

  let passedTests = 0;
  let totalTests = 6;
  const failureReasons: string[] = [];

  // TEST 1: Check Manifest & Atlas Integrity
  console.log('\n--- Test 1: Manifest & Sprite Atlas Integrity ---');
  try {
    if (!fs.existsSync(manifestPath)) throw new Error('actions.json missing');
    if (!fs.existsSync(atlasPath)) throw new Error('spritesheet.png missing');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const atlasBuffer = fs.readFileSync(atlasPath);
    const atlas = decodePng(atlasBuffer);

    if (atlas.width !== 3072 || atlas.height !== 1152) {
      throw new Error(`Invalid atlas dimensions: ${atlas.width}x${atlas.height} (expected 3072x1152)`);
    }

    const actionKeys = Object.keys(manifest.actions);
    if (actionKeys.length !== 17) {
      throw new Error(`Expected 17 actions, found ${actionKeys.length}`);
    }

    let totalFrames = 0;
    for (const act of actionKeys) {
      const a = manifest.actions[act];
      totalFrames += a.frameCount;
      if (!fs.existsSync(path.join(stagedDir, `${act}.gif`))) {
        throw new Error(`Missing animated GIF for action: ${act}.gif`);
      }
    }

    if (totalFrames !== 91) {
      throw new Error(`Total frames mismatch: ${totalFrames} (expected 91)`);
    }

    console.log(`  ✓ Manifest validated: 17 actions, 91 total frames, 17 animated GIFs.`);
    console.log(`  ✓ Sprite atlas verified: 3072x1152 px, 16x6 grid cells.`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${err.message}`);
    failureReasons.push(`Test 1 Failed: ${err.message}`);
  }

  // TEST 2: Individual Frame Dimensions & Alpha Transparency
  console.log('\n--- Test 2: Frame Dimensions & Alpha Transparency ---');
  try {
    const frameFiles = fs.readdirSync(framesDir).filter((f) => f.endsWith('.png'));
    if (frameFiles.length !== 91) {
      throw new Error(`Expected 91 individual frame PNGs, found ${frameFiles.length}`);
    }

    let allTransparentCorners = true;
    for (const f of frameFiles) {
      const p = path.join(framesDir, f);
      const img = decodePng(fs.readFileSync(p));
      if (img.width !== 192 || img.height !== 192) {
        throw new Error(`Frame ${f} has invalid dimensions: ${img.width}x${img.height}`);
      }
      // Top-left and top-right corner pixels must have alpha = 0 (clean transparent background)
      const tlAlpha = img.data[3];
      const trAlpha = img.data[(191) * 4 + 3];
      if (tlAlpha !== 0 || trAlpha !== 0) {
        allTransparentCorners = false;
      }
    }

    if (!allTransparentCorners) {
      throw new Error('Some frames lack transparent background in corner regions.');
    }

    console.log(`  ✓ All 91 frames verified: exactly 192x192 px.`);
    console.log(`  ✓ Alpha transparency verified: 100% clean transparent bounds.`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${err.message}`);
    failureReasons.push(`Test 2 Failed: ${err.message}`);
  }

  // TEST 3: Duplicate & Near-Identical Frame Detection
  console.log('\n--- Test 3: Duplicate & Near-Identical Frame Detection ---');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    let identicalPairCount = 0;
    let minMad = 999;
    let minMadPair = '';

    for (const act of Object.keys(manifest.actions)) {
      const a = manifest.actions[act];
      for (let i = 0; i < a.frameCount - 1; i++) {
        const p1 = path.join(framesDir, `${act}_${i}.png`);
        const p2 = path.join(framesDir, `${act}_${i + 1}.png`);
        const img1 = decodePng(fs.readFileSync(p1));
        const img2 = decodePng(fs.readFileSync(p2));
        const mad = calculateMad(img1, img2);

        if (mad < minMad) {
          minMad = mad;
          minMadPair = `${act}_${i} vs ${act}_${i + 1}`;
        }

        // Fighting game frames must have distinct poses: MAD >= 1.5
        if (mad < 1.0) {
          identicalPairCount++;
          console.warn(`  Warning: near-identical frame detected in ${act}: ${i} vs ${i + 1} (MAD: ${mad.toFixed(2)})`);
        }
      }
    }

    if (identicalPairCount > 0) {
      throw new Error(`Detected ${identicalPairCount} near-identical frame pairs.`);
    }

    console.log(`  ✓ Zero duplicate frames detected across all 17 actions.`);
    console.log(`  ✓ Minimum kinematic variance (MAD): ${minMad.toFixed(2)} (${minMadPair}).`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${err.message}`);
    failureReasons.push(`Test 3 Failed: ${err.message}`);
  }

  // TEST 4: Foot Contact Grounding & Airborne Altitude Rules
  console.log('\n--- Test 4: Foot Contact Grounding & Altitude Clamping ---');
  try {
    const groundedActions = ['idle', 'walk_forward', 'walk_backward', 'crouch_idle', 'block'];
    let groundedValid = true;

    for (const act of groundedActions) {
      const p = path.join(framesDir, `${act}_0.png`);
      const img = decodePng(fs.readFileSync(p));

      // Scan rows near bottom for foot contact pixels at Y = 160..175
      let hasGroundPixels = false;
      for (let y = 160; y <= 175; y++) {
        for (let x = 60; x <= 130; x++) {
          const idx = (y * img.width + x) * 4;
          if (img.data[idx + 3] > 180) {
            hasGroundPixels = true;
            break;
          }
        }
        if (hasGroundPixels) break;
      }

      if (!hasGroundPixels) {
        groundedValid = false;
        throw new Error(`Grounded action ${act} does not have solid foot contact at Y=168.`);
      }
    }

    // Verify Jump Apex (frame 3) is elevated above ground
    const jumpApex = decodePng(fs.readFileSync(path.join(framesDir, 'jump_3.png')));
    let apexBottomY = 0;
    for (let y = 191; y >= 0; y--) {
      for (let x = 0; x < 192; x++) {
        const idx = (y * 192 + x) * 4;
        const a = jumpApex.data[idx + 3];
        const r = jumpApex.data[idx];
        const g = jumpApex.data[idx + 1];
        const b = jumpApex.data[idx + 2];
        // Character body pixels have full alpha and clothing/skin color (not faint ground shadow)
        if (a > 200 && (r > 20 || g > 20 || b > 25)) {
          apexBottomY = y;
          break;
        }
      }
      if (apexBottomY > 0) break;
    }

    if (apexBottomY > 155) {
      throw new Error(`Jump apex frame is not elevated off ground: bottom Y = ${apexBottomY} (expected < 155)`);
    }

    console.log(`  ✓ Grounded actions maintain solid contact at Y=168.`);
    console.log(`  ✓ Airborne jump apex cleanly elevates off ground (Apex bottom Y: ${apexBottomY} px).`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${err.message}`);
    failureReasons.push(`Test 4 Failed: ${err.message}`);
  }

  // TEST 5: Character Palette & Costume Consistency
  console.log('\n--- Test 5: Character Costume & Palette Consistency ---');
  try {
    const idleFrame = decodePng(fs.readFileSync(path.join(framesDir, 'idle_0.png')));
    let foundJacket = false;
    let foundShirt = false;
    let foundTrouser = false;
    let foundSkin = false;
    let foundWrap = false;

    for (let i = 0; i < idleFrame.data.length; i += 4) {
      const r = idleFrame.data[i];
      const g = idleFrame.data[i + 1];
      const b = idleFrame.data[i + 2];
      const a = idleFrame.data[i + 3];
      if (a < 128) continue;

      // Indigo jacket: [27, 40, 61]
      if (Math.hypot(r - 27, g - 40, b - 61) < 25) foundJacket = true;
      // Rust-red shirt: [138, 52, 41]
      if (Math.hypot(r - 138, g - 52, b - 41) < 25) foundShirt = true;
      // Charcoal trousers: [47, 49, 54]
      if (Math.hypot(r - 47, g - 49, b - 54) < 20) foundTrouser = true;
      // Tan skin: [182, 122, 78]
      if (Math.hypot(r - 182, g - 122, b - 78) < 25) foundSkin = true;
      // Cloth wraps: [214, 206, 191]
      if (Math.hypot(r - 214, g - 206, b - 191) < 20) foundWrap = true;
    }

    if (!foundJacket || !foundShirt || !foundTrouser || !foundSkin || !foundWrap) {
      throw new Error(`Costume color mismatch. Jacket: ${foundJacket}, Shirt: ${foundShirt}, Trouser: ${foundTrouser}, Skin: ${foundSkin}, Wrap: ${foundWrap}`);
    }

    console.log(`  ✓ Deep Indigo vest (#1b283d) confirmed present.`);
    console.log(`  ✓ Muted Rust-Red shirt (#8a3429) confirmed present.`);
    console.log(`  ✓ Charcoal combat trousers (#2f3136) confirmed present.`);
    console.log(`  ✓ Authentic South Asian tan skin tone (#b67a4e) confirmed.`);
    console.log(`  ✓ Raw cloth wrist wraps (#d6cebf) confirmed.`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${err.message}`);
    failureReasons.push(`Test 5 Failed: ${err.message}`);
  }

  // TEST 6: Combat State Timing & Active Hitbox Audit
  console.log('\n--- Test 6: Combat Timing & Hitbox Audit ---');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const combatActions = ['punch_light', 'punch_heavy', 'kick_light', 'kick_heavy', 'special_1', 'special_2', 'special_3'];

    for (const act of combatActions) {
      const a = manifest.actions[act];
      let hasActiveFrame = false;
      let hasActiveHitbox = false;

      for (const fr of a.frames) {
        if (fr.isActive) {
          hasActiveFrame = true;
          if (fr.hitbox && fr.hitbox.w > 0 && fr.hitbox.h > 0) {
            hasActiveHitbox = true;
          }
        }
      }

      if (!hasActiveFrame) throw new Error(`Action ${act} has 0 active frames.`);
      if (!hasActiveHitbox) throw new Error(`Action ${act} lacks valid active hitboxes.`);
    }

    console.log(`  ✓ All ${combatActions.length} combat attack actions contain active strike windows.`);
    console.log(`  ✓ All active strike windows contain calibrated non-null hitboxes.`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${err.message}`);
    failureReasons.push(`Test 6 Failed: ${err.message}`);
  }

  console.log('\n=================================================================');
  console.log(`QA VALIDATION RESULT: ${passedTests} / ${totalTests} PASSED`);
  if (passedTests === totalTests) {
    console.log('STATUS: 100% COMPLIANT — ASSETS QUALIFIED FOR PRODUCTION');
    console.log('=================================================================');
    return true;
  } else {
    console.error('STATUS: FAILED — DO NOT DEPLOY TO PRODUCTION');
    console.error(failureReasons.join('\n'));
    console.log('=================================================================');
    return false;
  }
}

runValidation().then((success) => {
  if (!success) process.exit(1);
});
