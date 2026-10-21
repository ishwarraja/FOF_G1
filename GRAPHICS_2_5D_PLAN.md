# Fate of Fighters (FOF) — 2.5D Sprite & Animation Engine Architecture Plan
**Specification Release: FOFv0.4_26Sep**
**Engineering Standards: Commercial 2.5D Arcade Standards (Guilty Gear -Strive-, The King of Fighters XV, Street Fighter 6)**

---

## 1. System Overview
"Fate of Fighters" combines 2D frame-accurate combat physics (startup/active/recovery windows, hitboxes, hurtboxes) with a 3D WebGL Three.js perspective camera, unified stage lighting, and ground contact shadows.

## 2. Identified Legacy Bugs in FOFv0.4
1. **Single-Texture Billboard Quads & Primitive Mannequins:**
   - Previous implementations rendered fighters on a single static `PlaneGeometry` without dynamic texture swapping or animated sprite atlases.
   - Fallback rigs relied on static head/torso meshes rather than frame-driven multi-pose animations.
2. **Combat State Disconnect:**
   - The state loop updated logical entity flags (`ATTACK_LP`, `SPECIAL_1`, `HIT_LIGHT`) but lacked an animation controller dispatching frame indices and active hitbox windows.
3. **Viewport Clutter:**
   - Coordinate boxes, hurtbox outlines, and developer telemetry were not properly encapsulated behind an explicit `debugMode` gate.

## 3. High-Performance 2.5D Sprite Engine Architecture
- **Primary Pipeline:** Multi-frame PNG Sprite Sheets + JSON Metadata (`actions.json`).
  - UV-mapped frame sequence driven by 60 FPS tick counter.
  - Linear or Nearest texture filtering with `alphaTest: 0.5` for crisp alpha cutouts.
- **Fallback Pipeline:** Frame-accurate animated GIF / Canvas frame sequence decoder.
- **Layering & Depth Sorting:**
  - `depthWrite: false` on sprite materials combined with dynamic `renderOrder` based on fighter Z-depth and attacker priority.
  - Facing orientation flip using `scale.x = -1` with `THREE.DoubleSide` to preserve geometry normals.
- **Visual Grounding:**
  - Vertices translated such that feet rest precisely on the stage floor ($Y = 0$).
  - Dynamic contact shadow discs on the arena plane scale and fade based on airborne height ($Y > 0$).

## 4. Animation Controller & Hitbox Synchronization
- State Machine Actions:
  - **Looping:** `idle`, `walk_forward`, `walk_backward`, `crouch_idle`.
  - **One-Shot:** `punch_light`, `punch_heavy`, `kick_light`, `kick_heavy`, `special_1`, `special_2`, `special_3`, `jump`, `block`, `hurt_high`, `hurt_low`, `knockdown`, `ko`.
- Frame Lifecycle:
  - **Startup:** Wind-up frames, no active hitbox.
  - **Active:** Active strike window where combat hitboxes spawn, extend reach, and check collision.
  - **Recovery:** Wind-down cooldown frames, hitbox disabled.
  - **Auto-Recovery:** One-shot animations transition back to `idle` upon completion.
