/**
 * Fate of Fighters (FOF) - Production 2.5D Combat Scene
 * Arcade Production Standards (matching Street Fighter 6 / King of Fighters XV)
 * 
 * Features:
 * 1. 2.5D Rendering Engine & 3D Asset Pipeline using CharacterLoader
 * 2. Automatic PBR material handling on all loaded meshes with cast/receive shadows
 * 3. 2.5D Fallback Sprite Quad (alphaTest: 0.5) when .glb is absent
 * 4. Unified Stage Lighting (Directional sunlight with PCFSoftShadowMap, Ambient & Hemisphere light)
 * 5. ACESFilmicToneMapping (exposure 1.15) to eliminate washed-out plastic shading
 * 6. Dynamic floor contact shadows grounding fighters
 * 7. Decoupled debug layers: Hitbox wireframes, hurtboxes, and telemetry ("HITBOX OVERLAY & FRAME DATA LAB", ADV, DIST, SCALE)
 *    strictly hidden during normal gameplay and only toggleable via developer shortcut (~ / F12)
 */

import React, { forwardRef } from 'react';
import { FofStage25DView, FofStage25DViewHandle, FofStage25DViewProps, CameraPreset } from './FofStage25DView';

export type CombatSceneProps = FofStage25DViewProps & {
  debugMode?: boolean;
};

export type { CameraPreset };
export type CombatSceneHandle = FofStage25DViewHandle;

export const CombatScene = forwardRef<CombatSceneHandle, CombatSceneProps>((props, ref) => {
  return (
    <FofStage25DView
      ref={ref}
      {...props}
    />
  );
});

CombatScene.displayName = 'CombatScene';
export default CombatScene;
