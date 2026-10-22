/**
 * Gamepad API Engine for FOF Arcade
 * Handles standard USB and Bluetooth gamepads (Xbox, PlayStation DualShock/DualSense,
 * Nintendo Switch Pro, 8BitDo, USB Arcade Sticks, Generic Gamepads).
 */

export interface GamepadSnapshot {
  id: string;
  index: number;
  connected: boolean;
  timestamp: number;
  name: string;
  type: 'xbox' | 'playstation' | 'nintendo' | 'arcade_stick' | 'generic';
  axes: number[];
  buttons: {
    pressed: boolean;
    touched: boolean;
    value: number;
  }[];
  // Normalized High-Level Digital Inputs
  isUp: boolean;
  isDown: boolean;
  isLeft: boolean;
  isRight: boolean;
  // Edge-detected button presses (true only on the exact frame pressed down)
  justPressed: {
    lp: boolean;        // Light Punch (Square / X)
    hp: boolean;        // Heavy Punch (Triangle / Y)
    lk: boolean;        // Light Kick (Cross / A)
    hk: boolean;        // Heavy Kick (Circle / B)
    roll: boolean;      // Evasion Roll (L1 / LB)
    blowback: boolean;  // CD Blowback (R1 / RB)
    spec1: boolean;     // Quick Special 1 (L2 / LT)
    superMove: boolean; // Super Desperation Move (R2 / RT)
    taunt: boolean;     // Taunt (Select / Back / Share)
    pause: boolean;     // Pause Fight (Start / Menu / Options)
    maxMode: boolean;   // MAX Mode Burst (R3 / Right Stick Click)
    spec2: boolean;     // Quick Special 2 (L3 / Left Stick Click)
  };
}

export type ControllerLayoutPreset = 'standard' | 'fightstick' | 'four_button';

export interface GamepadActionCallbacks {
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onJump?: () => void;
  onCrouch?: () => void;
  onLP?: () => void;
  onHP?: () => void;
  onLK?: () => void;
  onHK?: () => void;
  onRoll?: () => void;
  onBlowback?: () => void;
  onSpec1?: () => void;
  onSpec2?: () => void;
  onSuper?: () => void;
  onMaxMode?: () => void;
  onTaunt?: () => void;
  onPause?: () => void;
}

// Previous frame button press memory for edge-detection
const prevButtonStates: Record<number, boolean[]> = {};
let activeLayoutPreset: ControllerLayoutPreset = 'standard';

export function setGamepadLayoutPreset(preset: ControllerLayoutPreset) {
  activeLayoutPreset = preset;
}

export function getGamepadLayoutPreset(): ControllerLayoutPreset {
  return activeLayoutPreset;
}

/**
 * Detect controller vendor/type from gamepad ID string
 */
export function identifyGamepadType(id: string): 'xbox' | 'playstation' | 'nintendo' | 'arcade_stick' | 'generic' {
  const lower = id.toLowerCase();
  if (lower.includes('stick') || lower.includes('arcade') || lower.includes('fightstick') || lower.includes('hitbox') || lower.includes('hori')) {
    return 'arcade_stick';
  }
  if (lower.includes('xbox') || lower.includes('x-box') || lower.includes('microsoft') || lower.includes('045e')) {
    return 'xbox';
  }
  if (lower.includes('playstation') || lower.includes('ps4') || lower.includes('ps5') || lower.includes('dualshock') || lower.includes('dualsense') || lower.includes('sony') || lower.includes('054c')) {
    return 'playstation';
  }
  if (lower.includes('switch') || lower.includes('pro controller') || lower.includes('nintendo') || lower.includes('joy-con') || lower.includes('057e')) {
    return 'nintendo';
  }
  return 'generic';
}

/**
 * Clean up device name for UI display
 */
export function getFriendlyGamepadName(id: string): string {
  const type = identifyGamepadType(id);
  const match = id.match(/^([^(]+)/);
  let baseName = match ? match[1].trim() : id;

  if (baseName.length > 32) {
    baseName = baseName.substring(0, 32) + '...';
  }

  switch (type) {
    case 'xbox':
      return baseName || 'Xbox Controller';
    case 'playstation':
      return baseName || 'PlayStation Controller';
    case 'nintendo':
      return baseName || 'Nintendo Switch Controller';
    case 'arcade_stick':
      return baseName || 'Arcade FightStick';
    default:
      return baseName || 'USB/Bluetooth Gamepad';
  }
}

/**
 * Poll all active gamepads and retrieve normalized state
 */
export function pollPrimaryGamepad(): GamepadSnapshot | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) {
    return null;
  }

  const rawGamepads = navigator.getGamepads();
  if (!rawGamepads) return null;

  // Find the first connected gamepad
  let primaryPad: Gamepad | null = null;
  for (let i = 0; i < rawGamepads.length; i++) {
    const pad = rawGamepads[i];
    if (pad && pad.connected) {
      primaryPad = pad;
      break;
    }
  }

  if (!primaryPad) {
    return null;
  }

  const index = primaryPad.index;
  const prevButtons = prevButtonStates[index] || [];
  const currentButtons = primaryPad.buttons.map(b => b.pressed);

  // Helper to check edge trigger (0 -> 1)
  const isJustPressed = (btnIdx: number): boolean => {
    const curr = primaryPad!.buttons[btnIdx]?.pressed ?? false;
    const prev = prevButtons[btnIdx] ?? false;
    return curr && !prev;
  };

  // Analog stick deadzone processing
  const DEADZONE = 0.32;
  const axisX = primaryPad.axes[0] ?? 0;
  const axisY = primaryPad.axes[1] ?? 0;

  // Standard D-pad buttons: 12=Up, 13=Down, 14=Left, 15=Right
  const dpadUp = primaryPad.buttons[12]?.pressed ?? false;
  const dpadDown = primaryPad.buttons[13]?.pressed ?? false;
  const dpadLeft = primaryPad.buttons[14]?.pressed ?? false;
  const dpadRight = primaryPad.buttons[15]?.pressed ?? false;

  const isLeft = dpadLeft || axisX < -DEADZONE;
  const isRight = dpadRight || axisX > DEADZONE;
  const isUp = dpadUp || axisY < -DEADZONE;
  const isDown = dpadDown || axisY > DEADZONE;

  let justPressed = {
    lp: false,
    hp: false,
    lk: false,
    hk: false,
    roll: false,
    blowback: false,
    spec1: false,
    superMove: false,
    taunt: false,
    pause: false,
    maxMode: false,
    spec2: false,
  };

  if (activeLayoutPreset === 'standard') {
    // Standard Layout (Xbox/PS4/PS5/Switch Pro):
    // Button 0 (A / Cross): LK
    // Button 1 (B / Circle): HK
    // Button 2 (X / Square): LP
    // Button 3 (Y / Triangle): HP
    // Button 4 (L1 / LB): Roll
    // Button 5 (R1 / RB): Blowback (CD)
    // Button 6 (L2 / LT): Special 1
    // Button 7 (R2 / RT): Super Move
    // Button 8 (Select / Back / Share): Taunt
    // Button 9 (Start / Options / Menu): Pause
    // Button 10 (L3 / Left Stick Click): Special 2
    // Button 11 (R3 / Right Stick Click): MAX Mode
    justPressed = {
      lp: isJustPressed(2),
      hp: isJustPressed(3),
      lk: isJustPressed(0),
      hk: isJustPressed(1),
      roll: isJustPressed(4),
      blowback: isJustPressed(5),
      spec1: isJustPressed(6),
      superMove: isJustPressed(7),
      taunt: isJustPressed(8),
      pause: isJustPressed(9),
      spec2: isJustPressed(10),
      maxMode: isJustPressed(11),
    };
  } else if (activeLayoutPreset === 'fightstick') {
    // Arcade 6-Button FightStick Layout:
    // Top Row: LP(2), HP(3), Roll(5)
    // Bottom Row: LK(0), HK(1), Blowback(7)
    // Extra: Spec1(6), Super(4), Select(8), Start(9)
    justPressed = {
      lp: isJustPressed(2),
      hp: isJustPressed(3),
      roll: isJustPressed(5),
      lk: isJustPressed(0),
      hk: isJustPressed(1),
      blowback: isJustPressed(7),
      spec1: isJustPressed(6),
      superMove: isJustPressed(4),
      taunt: isJustPressed(8),
      pause: isJustPressed(9),
      spec2: isJustPressed(10),
      maxMode: isJustPressed(11),
    };
  } else {
    // Classic 4-Button NeoGeo inline layout:
    // A (0)=LP, B (1)=LK, X (2)=HP, Y (3)=HK
    justPressed = {
      lp: isJustPressed(0),
      lk: isJustPressed(1),
      hp: isJustPressed(2),
      hk: isJustPressed(3),
      roll: isJustPressed(4),
      blowback: isJustPressed(5),
      spec1: isJustPressed(6),
      superMove: isJustPressed(7),
      taunt: isJustPressed(8),
      pause: isJustPressed(9),
      spec2: isJustPressed(10),
      maxMode: isJustPressed(11),
    };
  }

  // Update previous button history
  prevButtonStates[index] = currentButtons;

  return {
    id: primaryPad.id,
    index: primaryPad.index,
    connected: primaryPad.connected,
    timestamp: primaryPad.timestamp,
    name: getFriendlyGamepadName(primaryPad.id),
    type: identifyGamepadType(primaryPad.id),
    axes: Array.from(primaryPad.axes),
    buttons: primaryPad.buttons.map(b => ({
      pressed: b.pressed,
      touched: b.touched,
      value: b.value,
    })),
    isUp,
    isDown,
    isLeft,
    isRight,
    justPressed,
  };
}

/**
 * Poll state of a gamepad by specific index (e.g. 0 for P1, 1 for P2)
 */
export function pollGamepadByIndex(targetIndex: number): GamepadSnapshot | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;

  const gamepads = navigator.getGamepads();
  if (!gamepads) return null;

  const targetPad = gamepads[targetIndex];
  if (!targetPad || !targetPad.connected) return null;

  const index = targetPad.index;
  const currentButtons = targetPad.buttons.map(b => b.pressed);
  const prevButtons = prevButtonStates[index] || [];

  const isJustPressed = (btnIdx: number) => {
    return !!currentButtons[btnIdx] && !prevButtons[btnIdx];
  };

  const axisX = targetPad.axes[0] || 0;
  const axisY = targetPad.axes[1] || 0;
  const dpadUp = targetPad.buttons[12]?.pressed || false;
  const dpadDown = targetPad.buttons[13]?.pressed || false;
  const dpadLeft = targetPad.buttons[14]?.pressed || false;
  const dpadRight = targetPad.buttons[15]?.pressed || false;

  const isLeft = dpadLeft || axisX < -0.45;
  const isRight = dpadRight || axisX > 0.45;
  const isUp = dpadUp || axisY < -0.45;
  const isDown = dpadDown || axisY > 0.45;

  let justPressed: GamepadSnapshot['justPressed'];

  if (activeLayoutPreset === 'standard') {
    justPressed = {
      lp: isJustPressed(2),
      hp: isJustPressed(3),
      lk: isJustPressed(0),
      hk: isJustPressed(1),
      roll: isJustPressed(4),
      blowback: isJustPressed(5),
      spec1: isJustPressed(6),
      superMove: isJustPressed(7),
      taunt: isJustPressed(8),
      pause: isJustPressed(9),
      spec2: isJustPressed(10),
      maxMode: isJustPressed(11),
    };
  } else if (activeLayoutPreset === 'fightstick') {
    justPressed = {
      lp: isJustPressed(2),
      hp: isJustPressed(3),
      roll: isJustPressed(5),
      lk: isJustPressed(0),
      hk: isJustPressed(1),
      blowback: isJustPressed(7),
      spec1: isJustPressed(6),
      superMove: isJustPressed(4),
      taunt: isJustPressed(8),
      pause: isJustPressed(9),
      spec2: isJustPressed(10),
      maxMode: isJustPressed(11),
    };
  } else {
    justPressed = {
      lp: isJustPressed(0),
      lk: isJustPressed(1),
      hp: isJustPressed(2),
      hk: isJustPressed(3),
      roll: isJustPressed(4),
      blowback: isJustPressed(5),
      spec1: isJustPressed(6),
      superMove: isJustPressed(7),
      taunt: isJustPressed(8),
      pause: isJustPressed(9),
      spec2: isJustPressed(10),
      maxMode: isJustPressed(11),
    };
  }

  prevButtonStates[index] = currentButtons;

  return {
    id: targetPad.id,
    index: targetPad.index,
    connected: targetPad.connected,
    timestamp: targetPad.timestamp,
    name: getFriendlyGamepadName(targetPad.id),
    type: identifyGamepadType(targetPad.id),
    axes: Array.from(targetPad.axes),
    buttons: targetPad.buttons.map(b => ({
      pressed: b.pressed,
      touched: b.touched,
      value: b.value,
    })),
    isUp,
    isDown,
    isLeft,
    isRight,
    justPressed,
  };
}

/**
 * Trigger rumble / haptic feedback on connected controller
 */
export function triggerGamepadRumble(
  weakMagnitude = 0.4,
  strongMagnitude = 0.7,
  durationMs = 120
) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

  const gamepads = navigator.getGamepads();
  if (!gamepads) return;

  for (let i = 0; i < gamepads.length; i++) {
    const pad = gamepads[i];
    if (pad && pad.connected && (pad as any).vibrationActuator) {
      try {
        (pad as any).vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1, Math.max(0, weakMagnitude)),
          strongMagnitude: Math.min(1, Math.max(0, strongMagnitude)),
        }).catch(() => {
          // Ignore vibration promise rejection if unsupported
        });
      } catch {
        // Safe fallback
      }
    }
  }
}

/**
 * Returns whether any gamepad is currently connected
 */
export function hasConnectedGamepad(): boolean {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
  const gamepads = navigator.getGamepads();
  if (!gamepads) return false;
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]?.connected) return true;
  }
  return false;
}
