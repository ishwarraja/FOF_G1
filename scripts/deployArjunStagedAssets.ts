import fs from 'fs';
import path from 'path';

/**
 * Fate of Fighters (FOF) — Asset Deployment & Rollback Controller
 * Safely deploys validated staged animation assets to production,
 * or rolls back to the preserved original backup.
 * 
 * Usage:
 *   bun run scripts/deployArjunStagedAssets.ts deploy
 *   bun run scripts/deployArjunStagedAssets.ts rollback
 */

const mode = process.argv[2] || 'deploy';

const baseDir = path.resolve('public/assets/characters/arjun');
const prodDir = path.join(baseDir, 'actions');
const stagedDir = path.join(baseDir, 'actions_staged');
const backupDir = path.join(baseDir, 'actions_backup');

if (mode === 'rollback') {
  console.log('Initiating rollback to preserved original assets...');
  if (!fs.existsSync(backupDir)) {
    console.error('ERROR: Backup directory not found at', backupDir);
    process.exit(1);
  }
  // Copy all files from backupDir to prodDir
  const backupFiles = fs.readdirSync(backupDir);
  for (const f of backupFiles) {
    fs.copyFileSync(path.join(backupDir, f), path.join(prodDir, f));
  }
  console.log(`✓ Successfully restored ${backupFiles.length} original assets from backup.`);
  console.log('Production directory restored.');
} else {
  console.log('Deploying validated staged assets to production...');
  if (!fs.existsSync(stagedDir)) {
    console.error('ERROR: Staging directory not found at', stagedDir);
    process.exit(1);
  }

  // Ensure backup exists before deploying
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    const prodFiles = fs.readdirSync(prodDir);
    for (const f of prodFiles) {
      const src = path.join(prodDir, f);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(backupDir, f));
      }
    }
    console.log(`✓ Preserved ${prodFiles.length} original assets in ${backupDir}`);
  }

  // Deploy staged assets (spritesheet.png, actions.json, all 17 GIFs)
  const stagedFiles = fs.readdirSync(stagedDir).filter(f => !fs.statSync(path.join(stagedDir, f)).isDirectory());
  for (const f of stagedFiles) {
    fs.copyFileSync(path.join(stagedDir, f), path.join(prodDir, f));
  }

  // Also deploy frames directory
  const stagedFramesDir = path.join(stagedDir, 'frames');
  if (fs.existsSync(stagedFramesDir)) {
    const prodFramesDir = path.join(prodDir, 'frames');
    fs.mkdirSync(prodFramesDir, { recursive: true });
    const frames = fs.readdirSync(stagedFramesDir);
    for (const frame of frames) {
      fs.copyFileSync(path.join(stagedFramesDir, frame), path.join(prodFramesDir, frame));
    }
  }

  console.log(`✓ Successfully deployed ${stagedFiles.length} production assets to ${prodDir}.`);
  console.log('Deployment complete and active in game engine.');
}
