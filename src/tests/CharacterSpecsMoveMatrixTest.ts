import fs from 'fs';
import path from 'path';

/**
 * Fate of Fighters (FOF) — Automated Verification Test
 * Cross-checks every character in FOF_character_specs.json and every required action
 * in FOF_special_move_matrix.csv against public/assets/characters/**\/actions/ and actions.json manifests.
 */

export interface MatrixValidationResult {
  passed: boolean;
  totalCharacters: number;
  totalMatrixMoves: number;
  missingGifsCount: number;
  missingActionsCount: number;
  zeroActiveAttacksCount: number;
  nullHitboxAttacksCount: number;
  errors: string[];
}

export function testCharacterSpecsAndMoveMatrix(): MatrixValidationResult {
  const baseDir = process.cwd();
  const specsPath = path.join(baseDir, 'FOF_character_specs.json');
  const matrixPath = path.join(baseDir, 'FOF_special_move_matrix.csv');
  const charsDir = path.join(baseDir, 'public', 'assets', 'characters');

  const errors: string[] = [];

  if (!fs.existsSync(specsPath)) {
    return {
      passed: false,
      totalCharacters: 0,
      totalMatrixMoves: 0,
      missingGifsCount: 0,
      missingActionsCount: 0,
      zeroActiveAttacksCount: 0,
      nullHitboxAttacksCount: 0,
      errors: [`FOF_character_specs.json not found`],
    };
  }

  if (!fs.existsSync(matrixPath)) {
    return {
      passed: false,
      totalCharacters: 0,
      totalMatrixMoves: 0,
      missingGifsCount: 0,
      missingActionsCount: 0,
      zeroActiveAttacksCount: 0,
      nullHitboxAttacksCount: 0,
      errors: [`FOF_special_move_matrix.csv not found`],
    };
  }

  const specs = JSON.parse(fs.readFileSync(specsPath, 'utf-8')).characters || [];
  const matrixLines = fs.readFileSync(matrixPath, 'utf-8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const matrixHeader = matrixLines[0].split(',').map(h => h.trim());

  const moveMatrix = new Map<string, Record<string, string>>();
  for (let i = 1; i < matrixLines.length; i++) {
    const cols = matrixLines[i].split(',').map(c => c.trim());
    if (cols.length < matrixHeader.length) continue;
    const row: Record<string, string> = {};
    matrixHeader.forEach((h, idx) => { row[h] = cols[idx]; });
    moveMatrix.set(`${row.character_id}:${row.action_state}`, row);
  }

  let missingGifsCount = 0;
  let missingActionsCount = 0;
  let zeroActiveAttacksCount = 0;
  let nullHitboxAttacksCount = 0;

  const standardActions = [
    'idle', 'walk_forward', 'walk_backward', 'crouch_idle', 'jump', 'block',
    'punch_light', 'punch_heavy', 'kick_light', 'kick_heavy',
    'special_1', 'special_2', 'special_3',
    'hurt_high', 'hurt_low', 'knockdown', 'ko'
  ];

  for (const char of specs) {
    const cid = char.id;
    const actionDir = path.join(charsDir, cid, 'actions');
    const manifestPath = path.join(actionDir, 'actions.json');

    if (!fs.existsSync(actionDir)) {
      errors.push(`Missing action directory for character ${cid}: ${actionDir}`);
      continue;
    }

    if (!fs.existsSync(manifestPath)) {
      errors.push(`Missing actions.json manifest for character ${cid}: ${manifestPath}`);
      continue;
    }

    let manifest: any;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      errors.push(`Corrupt actions.json for character ${cid}`);
      continue;
    }

    for (const act of standardActions) {
      const gifPath = path.join(actionDir, `${act}.gif`);
      if (!fs.existsSync(gifPath)) {
        missingGifsCount++;
        errors.push(`Character ${cid} missing GIF: ${act}.gif`);
      }

      const actData = manifest.actions?.[act];
      if (!actData) {
        missingActionsCount++;
        errors.push(`Character ${cid} manifest missing action: ${act}`);
      } else {
        const matrixKey = `${cid}:${act}`;
        if (moveMatrix.has(matrixKey)) {
          const matRow = moveMatrix.get(matrixKey)!;
          const frames = actData.frames || [];
          const activeFrames = frames.filter((f: any) => f.isActive);
          if (activeFrames.length === 0) {
            zeroActiveAttacksCount++;
            errors.push(`Character ${cid} attack ${act} has 0 active frames in manifest`);
          }

          const hasValidHitbox = activeFrames.some((f: any) => f.hitbox && f.hitbox.w > 0 && f.hitbox.h > 0);
          if (!hasValidHitbox) {
            nullHitboxAttacksCount++;
            errors.push(`Character ${cid} attack ${act} has null or zero-dimension hitbox`);
          }
        }
      }
    }
  }

  const passed = errors.length === 0 && specs.length >= 8 && moveMatrix.size >= 56;

  console.log(`\n=================================================================`);
  console.log(`[TEST] CHARACTER SPECS & MOVE MATRIX ASSET INTEGRITY`);
  console.log(`=================================================================`);
  console.log(`Total Characters: ${specs.length}`);
  console.log(`Total Matrix Moves: ${moveMatrix.size}`);
  console.log(`Missing GIFs: ${missingGifsCount}`);
  console.log(`Missing Manifest Actions: ${missingActionsCount}`);
  console.log(`Attacks with Zero Active Frames: ${zeroActiveAttacksCount}`);
  console.log(`Attacks with Null Hitboxes: ${nullHitboxAttacksCount}`);
  console.log(`Errors Detected: ${errors.length}`);
  console.log(`Status: ${passed ? 'PASSED (100% COMPLIANT)' : 'FAILED'}`);
  console.log(`=================================================================\n`);

  return {
    passed,
    totalCharacters: specs.length,
    totalMatrixMoves: moveMatrix.size,
    missingGifsCount,
    missingActionsCount,
    zeroActiveAttacksCount,
    nullHitboxAttacksCount,
    errors,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = testCharacterSpecsAndMoveMatrix();
  process.exit(result.passed ? 0 : 1);
}
