import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FightingEntity,
  FightingMove,
  FightingProjectile,
  FofMatchState,
} from '../../types/fighting';
import {
  checkMeleeHit,
  executeMove,
  updateCpuAI,
  ARENA_WIDTH,
  GRAVITY,
  JUMP_VELOCITY,
  createFightingEntity,
  detectMotion,
  resolveSpecialOrNormalMove,
  InputCommandRecord,
  resolvePushboxCollision,
  FIGHTER_PUSHBOX_WIDTH,
  SAME_AXIS_SEPARATION_MIN,
  MAX_ALLOWED_OVERLAP_DURATION_SEC,
} from '../../utils/fightingEngine';
import { FOF_CHARACTERS } from '../../data/fightingMoves';
import { soundFX } from '../../utils/audio';
import {
  pollPrimaryGamepad,
  pollGamepadByIndex,
  triggerGamepadRumble,
  getFriendlyGamepadName,
} from '../../utils/gamepad';
import { FofHumanFighterSprite } from './FofHumanFighterSprite';
import { FofCombatHUD } from './FofCombatHUD';
import { FofSettingsModal } from './FofSettingsModal';
import { FofFreezeFrameModal } from './FofFreezeFrameModal';
import { FofCurrentComboCounter } from './FofCurrentComboCounter';
import { FofHealthBar } from './FofHealthBar';
import { FofGamepadModal } from './FofGamepadModal';
import { FofHitboxOverlay } from './FofHitboxOverlay';
import { FofStage25DView, CameraPreset, FofStage25DViewHandle } from './FofStage25DView';
import { FofLocationModal } from './FofLocationModal';
import { FofFinisherOverlay, FinisherVisualState } from './FofFinisherOverlay';
import { FofPostMatchVictoryOverlay, PostMatchVictoryVisualState } from './FofPostMatchVictoryOverlay';
import { FofCombatComboDisplay } from './FofCombatComboDisplay';
import { FofSuperArtGauge } from './FofSuperArtGauge';
import { FofCheeringCrowd2D } from './FofCheeringCrowd2D';
import { FofControlMappingModal } from './FofControlMappingModal';
import { FofReplayTheaterModal } from './FofReplayTheaterModal';
import { activeReplayRecorder, getLastMatchReplay } from '../../utils/replayManager';
import { MatchReplayData } from '../../types/replay';
import {
  PlayerKeyboardBindings,
  getKeyboardBindings,
  matchesBinding,
} from '../../utils/keyboardControls';
import { voiceClipManager } from '../../utils/voiceClipManager';
import { getStageVisual } from '../../data/stageBackgrounds';
import { getFighterPortrait } from '../../data/characterAvatars';
import {
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Volume2,
  VolumeX,
  Volume1,
  Mic,
  MicOff,
  Swords,
  Zap,
  Flame,
  Gamepad2,
  Keyboard,
  Bug,
  Bot,
  Box,
  Camera,
  Video,
  Eye,
  Image as ImageIcon,
  Film,
} from 'lucide-react';

export type CameraPanningPreset = 'SF6_DYNAMIC' | 'LEAD_FOCUS' | 'CLASSIC_CENTER';

export interface StageCameraState {
  x: number; // Current smoothed camera center in world coordinates [0, ARENA_WIDTH]
  y: number; // Current smoothed camera vertical offset
  zoom: number; // Dynamic scale (e.g. 0.96x - 1.14x)
  leadFighter: 'p1' | 'p2' | 'neutral';
  leadBias: number; // Smoothed lead bias in pixels
  preset: CameraPanningPreset;
}

export const CAMERA_BASE_VIEWPORT_WIDTH = 980; // Viewport width in world units at 1.0 zoom
export const CAMERA_MIN_ZOOM = 0.96; // Max zoom-out when far apart (preserves wide framing)
export const CAMERA_MAX_ZOOM = 1.14; // Max zoom-in when grappling/close combat (intense impact)
export const CAMERA_SCREEN_EDGE_MARGIN = 135; // Guaranteed minimum distance in world px from visible screen edge (anti-offscreen guard)
export const CAMERA_LERP_FACTOR = 0.088; // Exponential smoothing factor for organic, cinematic easing

interface FofStageCanvasProps {
  matchState: FofMatchState;
  onMatchStateUpdate: (updater: (prev: FofMatchState) => FofMatchState) => void;
  onRoundFinish: (winner: 'p1' | 'p2' | 'draw', isPerfect?: boolean) => void;
  onRestartMatch?: () => void;
  onStartMatch?: () => void;
  onNavigateToIntro?: () => void;
  onInputHistoryAdd?: (key: string) => void;
  cpuDifficulty?: number;
  isTrainingMode?: boolean;
  debugMode?: boolean;
  hitboxOverlayEnabled?: boolean;
  isHitboxOverlayEnabled?: boolean;
  onToggleHitboxOverlay?: (active: boolean) => void;
}

interface SpecialMoveFlare {
  id: string;
  x: number;
  y: number;
  facing: number;
  color: string;
  moveName: string;
  command: string;
  motionType: string;
  isSuper: boolean;
  isPlayer1: boolean;
  element: string;
}

interface MotionTrailAfterimage {
  id: string;
  x: number;
  y: number;
  facing: number;
  color: string;
  entity: FightingEntity;
  isPlayer1: boolean;
}

interface SpecialMoveBanner {
  id: string;
  fighterName: string;
  moveName: string;
  command: string;
  color: string;
  motionType: string;
  element: string;
  isSuper: boolean;
  isPlayer1: boolean;
}

export const FofStageCanvas: React.FC<FofStageCanvasProps> = ({
  matchState,
  onMatchStateUpdate,
  onRoundFinish,
  onRestartMatch,
  onStartMatch,
  onNavigateToIntro,
  onInputHistoryAdd,
  cpuDifficulty = 3,
  isTrainingMode = false,
  debugMode: initialDebugProp,
  hitboxOverlayEnabled,
  isHitboxOverlayEnabled,
  onToggleHitboxOverlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Starting positions centered for standard combat spacing (ARENA_WIDTH = 1400, center = 700)
  const P1_START_POS = 560;
  const P2_START_POS = 840;

  // Entities state
  const p1Fighter = matchState.p1Team?.[matchState.p1CurrentIndex] || matchState.p1Team?.[0] || FOF_CHARACTERS.arjun;
  const p2Fighter = matchState.p2Team?.[matchState.p2CurrentIndex] || matchState.p2Team?.[0] || FOF_CHARACTERS.david;

  const p1Ref = useRef<FightingEntity>(createFightingEntity(p1Fighter, true, P1_START_POS));
  const p2Ref = useRef<FightingEntity>(createFightingEntity(p2Fighter, false, P2_START_POS));

  const [p1Entity, setP1Entity] = useState<FightingEntity>(() => p1Ref.current);
  const [p2Entity, setP2Entity] = useState<FightingEntity>(() => p2Ref.current);

  // On-Screen Real-Time Value & Frame Advantage HUD Display Toggle
  // Frame-data telemetry values strip (Default: false, broadcast mode)
  const [showCombatValues, setShowCombatValues] = useState<boolean>(false);

  const [projectiles, setProjectiles] = useState<FightingProjectile[]>([]);
  const [announcerText, setAnnouncerText] = useState<string>('READY...');
  const [announcerSub, setAnnouncerSub] = useState<string>('FIGHT!');
  const [announcerVisible, setAnnouncerVisible] = useState<boolean>(true);
  const [superCutIn, setSuperCutIn] = useState<{
    fighterName: string;
    moveName: string;
    color: string;
    cutInUrl?: string;
    avatarUrl?: string;
  } | null>(null);
  const [finisherState, setFinisherState] = useState<FinisherVisualState | null>(null);
  const finisherTimerRef = useRef<number | null>(null);
  const hitstopFramesRef = useRef<number>(0);
  // Pushbox collision overlap watchdog: guarantees characters never overlap or stay on same axis > 1.0 second
  const overlapDurationRef = useRef<number>(0);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [hitSparks, setHitSparks] = useState<{ id: string; x: number; y: number; text?: string; isCrit?: boolean; color: string }[]>([]);

  // Tactical Pause state
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFreezeFrameOpen, setIsFreezeFrameOpen] = useState<boolean>(false);
  const [showMoveListModal, setShowMoveListModal] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFX.isSoundMuted());
  const [isGamepadModalOpen, setIsGamepadModalOpen] = useState<boolean>(false);
  const [isControlModalOpen, setIsControlModalOpen] = useState<boolean>(false);
  const [isReplayTheaterOpen, setIsReplayTheaterOpen] = useState<boolean>(false);
  const [selectedReplayForPlayback, setSelectedReplayForPlayback] = useState<MatchReplayData | null>(null);
  const [p1KeyBindings, setP1KeyBindings] = useState<PlayerKeyboardBindings>(getKeyboardBindings);
  const p1KeyBindingsRef = useRef<PlayerKeyboardBindings>(p1KeyBindings);

  useEffect(() => {
    p1KeyBindingsRef.current = p1KeyBindings;
  }, [p1KeyBindings]);

  useEffect(() => {
    const handleControlsUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<PlayerKeyboardBindings>;
      if (customEvt.detail) {
        setP1KeyBindings(customEvt.detail);
        p1KeyBindingsRef.current = customEvt.detail;
      } else {
        const fresh = getKeyboardBindings();
        setP1KeyBindings(fresh);
        p1KeyBindingsRef.current = fresh;
      }
    };
    window.addEventListener('fof-controls-updated', handleControlsUpdate);
    return () => window.removeEventListener('fof-controls-updated', handleControlsUpdate);
  }, []);
  const [connectedGamepadName, setConnectedGamepadName] = useState<string | null>(null);
  const [gamepadNotice, setGamepadNotice] = useState<string | null>(null);

  // Frame-Perfect Hitbox & Hurtbox Debug Validation Mode (Developer Flag: debugMode = false by default for arcade standards)
  const [debugMode, setDebugMode] = useState<boolean>(false);

  useEffect(() => {
    if (initialDebugProp !== undefined) {
      setDebugMode(initialDebugProp);
    } else if (hitboxOverlayEnabled !== undefined) {
      setDebugMode(hitboxOverlayEnabled);
    } else if (isHitboxOverlayEnabled !== undefined) {
      setDebugMode(isHitboxOverlayEnabled);
    }
  }, [initialDebugProp, hitboxOverlayEnabled, isHitboxOverlayEnabled]);

  // 2D Fighter Sprite Style: 'artwork' (Character Battle Artwork Picture) vs 'vector' (Articulated Skeletal Rig)
  const [spriteStyle, setSpriteStyle] = useState<'artwork' | 'vector'>(() => {
    try {
      return (localStorage.getItem('fof_sprite_style') as 'artwork' | 'vector') || 'artwork';
    } catch {
      return 'artwork';
    }
  });

  const toggleSpriteStyle = useCallback(() => {
    setSpriteStyle(prev => {
      const next = prev === 'artwork' ? 'vector' : 'artwork';
      try {
        localStorage.setItem('fof_sprite_style', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (typeof e.detail === 'boolean') {
        setDebugMode(e.detail);
      } else {
        setDebugMode(prev => !prev);
      }
    };
    window.addEventListener('fof-toggle-hitbox-overlay', handler as EventListener);
    return () => window.removeEventListener('fof-toggle-hitbox-overlay', handler as EventListener);
  }, []);

  // 2.5D WebGL Arena Rendering Mode (Path A 3D Perspective + 2D Gameplay)
  const [renderMode, setRenderMode] = useState<'2.5D' | '2D'>(() => {
    try {
      return (localStorage.getItem('fof_render_mode') as '2.5D' | '2D') || '2.5D';
    } catch {
      return '2.5D';
    }
  });

  // 2.5D Camera Preset: DYNAMIC (Auto Tracking & Super Zoom), CINEMATIC (Angled Depth), TOURNAMENT (Locked)
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(() => {
    try {
      return (localStorage.getItem('fof_camera_preset') as CameraPreset) || 'DYNAMIC';
    } catch {
      return 'DYNAMIC';
    }
  });

  // Dynamic Street Fighter 6 Camera Panning System (Follows lead fighter with smooth easing, dynamic zoom, and edge protection)
  const [cameraPanningPreset, setCameraPanningPreset] = useState<CameraPanningPreset>(() => {
    try {
      return (localStorage.getItem('fof_camera_panning_preset') as CameraPanningPreset) || 'SF6_DYNAMIC';
    } catch {
      return 'SF6_DYNAMIC';
    }
  });

  const cameraRef = useRef<StageCameraState>({
    x: ARENA_WIDTH / 2,
    y: 0,
    zoom: 1.05,
    leadFighter: 'neutral',
    leadBias: 0,
    preset: 'SF6_DYNAMIC',
  });

  const [cameraState, setCameraState] = useState<StageCameraState>(() => cameraRef.current);

  const cycleCameraPanningPreset = useCallback(() => {
    setCameraPanningPreset(prev => {
      const next: CameraPanningPreset =
        prev === 'SF6_DYNAMIC' ? 'LEAD_FOCUS' : prev === 'LEAD_FOCUS' ? 'CLASSIC_CENTER' : 'SF6_DYNAMIC';
      try {
        localStorage.setItem('fof_camera_panning_preset', next);
      } catch {}
      cameraRef.current.preset = next;
      return next;
    });
  }, []);

  useEffect(() => {
    cameraRef.current.preset = cameraPanningPreset;
  }, [cameraPanningPreset]);

  // World to Screen Coordinate Transformation (Maps world arena coordinate X to visible screen percentage)
  const worldToScreenPercent = useCallback(
    (worldX: number) => {
      const currentEffWidth = CAMERA_BASE_VIEWPORT_WIDTH / cameraState.zoom;
      const cameraLeft = cameraState.x - currentEffWidth / 2;
      return ((worldX - cameraLeft) / currentEffWidth) * 100;
    },
    [cameraState.x, cameraState.zoom]
  );

  // Attached Location Background Management & Custom Location Art
  const [customBgUrl, setCustomBgUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('fof_custom_stage_bg') || '';
    } catch {
      return '';
    }
  });
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  const currentStageVisual = getStageVisual(matchState.stageId, customBgUrl);

  const handleSelectLocation = useCallback(
    (newStageId: string, newBgUrl?: string) => {
      if (newBgUrl) {
        setCustomBgUrl(newBgUrl);
        try {
          localStorage.setItem('fof_custom_stage_bg', newBgUrl);
        } catch {}
      } else {
        setCustomBgUrl('');
        try {
          localStorage.removeItem('fof_custom_stage_bg');
        } catch {}
      }
      onMatchStateUpdate(prev => ({
        ...prev,
        stageId: newStageId,
      }));
    },
    [onMatchStateUpdate]
  );

  const stage25DRef = useRef<FofStage25DViewHandle>(null);

  const toggleRenderMode = useCallback(() => {
    soundFX.playClick();
    setRenderMode(prev => {
      const next = prev === '2.5D' ? '2D' : '2.5D';
      try {
        localStorage.setItem('fof_render_mode', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const cycleCameraPreset = useCallback(() => {
    soundFX.playClick();
    setCameraPreset(prev => {
      const next = prev === 'DYNAMIC' ? 'CINEMATIC' : prev === 'CINEMATIC' ? 'TOURNAMENT' : 'DYNAMIC';
      try {
        localStorage.setItem('fof_camera_preset', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleDebugMode = useCallback(() => {
    soundFX.playClick();
    setDebugMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('fof_debug_hitbox_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (onToggleHitboxOverlay) {
      onToggleHitboxOverlay(!debugMode);
    }
  }, [onToggleHitboxOverlay, debugMode]);

  // Damage & PERFECT Round Tracking
  const p1TookDamageRef = useRef<boolean>(false);
  const p2TookDamageRef = useRef<boolean>(false);
  const roundEndedRef = useRef<boolean>(false);

  // PERFECT Round Flare State
  const [perfectFlare, setPerfectFlare] = useState<{
    winner: 'p1' | 'p2';
    fighterName: string;
    accentColor: string;
    bonusScore: number;
    bonusMeter: number;
    isPlayer1: boolean;
  } | null>(null);

  // Post-Match Victory Pose State & Transitions
  const [postMatchState, setPostMatchState] = useState<PostMatchVictoryVisualState | null>(null);
  const postMatchActiveRef = useRef<boolean>(false);
  const storedWinnerRef = useRef<{ winner: 'p1' | 'p2' | 'draw'; isPerfect: boolean } | null>(null);

  // Combo decay tracking
  const COMBO_WINDOW_FRAMES = 70; // ~1.16 seconds to link consecutive hit
  const p1ComboTimerRef = useRef<number>(0);
  const p2ComboTimerRef = useRef<number>(0);
  const [p1ComboProgress, setP1ComboProgress] = useState<number>(0);
  const [p2ComboProgress, setP2ComboProgress] = useState<number>(0);

  // Hitstun Monochromatic Strobe & Flash tracking
  const p1HitstunFlashRef = useRef<number>(0);
  const p2HitstunFlashRef = useRef<number>(0);
  const [p1HitstunActive, setP1HitstunActive] = useState<boolean>(false);
  const [p2HitstunActive, setP2HitstunActive] = useState<boolean>(false);
  const [hitShockwaves, setHitShockwaves] = useState<{ id: string; x: number; y: number; isCrit?: boolean }[]>([]);

  // High-Intensity Punch Flash & Impact Burst state
  const [punchFlash, setPunchFlash] = useState<{
    id: string;
    x: number;
    y: number;
    color: string;
    isCrit: boolean;
    isSuper: boolean;
    moveType?: string;
    damage?: number;
  } | null>(null);

  // Spawn visual monochromatic hit shockwave
  const triggerHitShockwave = useCallback((x: number, y: number, isCrit = false) => {
    const id = `sw_${Date.now()}_${Math.random()}`;
    setHitShockwaves(prev => [...prev.slice(-4), { id, x, y, isCrit }]);
    setTimeout(() => {
      setHitShockwaves(prev => prev.filter(s => s.id !== id));
    }, 350);
  }, []);

  // Trigger high-intensity punch flash overlay & contact starburst
  const triggerPunchFlash = useCallback(
    (x: number, y: number, color: string, isCrit = false, isSuper = false, moveType?: string, damage?: number) => {
      const id = `pf_${Date.now()}_${Math.random()}`;
      setPunchFlash({ id, x, y, color, isCrit, isSuper, moveType, damage });
      triggerHitShockwave(x, y, isCrit || isSuper);
      setTimeout(() => {
        setPunchFlash(prev => (prev?.id === id ? null : prev));
      }, isSuper ? 160 : isCrit ? 130 : 100);
    },
    [triggerHitShockwave]
  );

  // Screen-wide Combo Spark Overlay and Particle Burst (activates when combo > 5 hits, scales to 25 hits)
  interface ComboSparkParticle {
    id: string;
    x: number;
    y: number;
    tx: number;
    ty: number;
    size: number;
    color: string;
    shape: 'spark' | 'star' | 'circle';
    rot: number;
  }

  const [screenSparkOverlay, setScreenSparkOverlay] = useState<{
    id: string;
    intensity: number;
    hits: number;
    color: string;
    x: number;
    y: number;
  } | null>(null);

  const [comboSparkParticles, setComboSparkParticles] = useState<ComboSparkParticle[]>([]);

  const triggerComboOverdriveSparkBurst = useCallback(
    (impactX: number, impactY: number, hitNumber: number, color: string) => {
      const id = `combo_spark_${Date.now()}_${Math.random()}`;
      const clampedHit = Math.min(25, hitNumber);
      const intensity = Math.min(1, 0.4 + ((clampedHit - 5) / 20) * 0.6);
      const sparkColor = clampedHit >= 25 ? '#fbbf24' : clampedHit >= 16 ? '#f43f5e' : clampedHit >= 10 ? '#f59e0b' : color;

      setScreenSparkOverlay({
        id,
        intensity,
        hits: hitNumber,
        color: sparkColor,
        x: impactX,
        y: impactY,
      });

      // Spawn 12 to 24 sparkling particles bursting outward from the contact point
      const particleCount = Math.min(24, 10 + Math.floor((clampedHit - 5) * 0.7));
      const sparkColors = ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', sparkColor];
      const newParticles: ComboSparkParticle[] = Array.from({ length: particleCount }, (_, idx) => {
        const angle = (idx / particleCount) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
        const dist = 35 + Math.random() * (50 + clampedHit * 2.5);
        return {
          id: `spk_p_${Date.now()}_${idx}_${Math.random()}`,
          x: impactX,
          y: impactY,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist,
          size: Math.floor(3 + Math.random() * 5),
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
          shape: Math.random() > 0.6 ? 'star' : Math.random() > 0.3 ? 'spark' : 'circle',
          rot: Math.floor(Math.random() * 360),
        };
      });

      setComboSparkParticles(prev => [...prev.slice(-30), ...newParticles]);

      // Tactile sound feedback
      soundFX.playOverdriveSpark(hitNumber);

      // Tactile gamepad haptic rumble
      triggerGamepadRumble(0.45 + (clampedHit / 25) * 0.35, 0.65 + (clampedHit / 25) * 0.35, 120);

      setTimeout(() => {
        setScreenSparkOverlay(prev => (prev?.id === id ? null : prev));
      }, 260);

      setTimeout(() => {
        setComboSparkParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
      }, 450);
    },
    []
  );

  // Key tracking
  const keysPressed = useRef<Set<string>>(new Set());

  // Slide-out Battle Pause & Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Toggle Pause function
  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const next = !prev;
      if (next) {
        soundFX.playPause();
        setIsSettingsModalOpen(true);
      } else {
        soundFX.playUnpause();
        setShowMoveListModal(false);
        setIsSettingsModalOpen(false);
        setIsFreezeFrameOpen(false);
      }
      return next;
    });
  }, []);

  // Capture / Freeze Frame inspector launcher
  const handleCaptureFreezeFrame = useCallback(() => {
    setIsPaused(true);
    setIsSettingsModalOpen(false);
    setIsFreezeFrameOpen(true);
    soundFX.playPause();
  }, []);

  // Single frame step function for Freeze Frame inspection
  const handleSingleFrameStep = useCallback(() => {
    setP1Entity(prev => ({ ...prev }));
    setP2Entity(prev => ({ ...prev }));
    soundFX.playClick();
  }, []);

  // Restart Current Round function
  const handleRestartRound = useCallback(() => {
    p1Ref.current = createFightingEntity(p1Fighter, true, P1_START_POS);
    p2Ref.current = createFightingEntity(p2Fighter, false, P2_START_POS);
    setP1Entity({ ...p1Ref.current });
    setP2Entity({ ...p2Ref.current });

    p1ComboTimerRef.current = 0;
    p2ComboTimerRef.current = 0;
    setP1ComboProgress(0);
    setP2ComboProgress(0);
    p1HitstunFlashRef.current = 0;
    p2HitstunFlashRef.current = 0;
    setP1HitstunActive(false);
    setP2HitstunActive(false);
    setHitShockwaves([]);
    setProjectiles([]);
    p1TookDamageRef.current = false;
    p2TookDamageRef.current = false;
    roundEndedRef.current = false;
    setPerfectFlare(null);
    setIsPaused(false);
    setShowMoveListModal(false);

    // Start fresh match replay recording for this round
    activeReplayRecorder.start({
      stageId: matchState.stageId || 'neon_hangar',
      customBgUrl: customBgUrl || matchState.stageBg,
      p1: p1Ref.current,
      p2: p2Ref.current,
      controlScenario: matchState.controlScenario,
      mode: matchState.mode,
    });

    onMatchStateUpdate(prev => ({
      ...prev,
      roundTimer: 60,
    }));

    setAnnouncerText(`ROUND ${matchState.currentRound}`);
    setAnnouncerSub('READY...');
    setAnnouncerVisible(true);
    soundFX.playReadyFight();

    setTimeout(() => {
      setAnnouncerText('FIGHT!');
      setAnnouncerSub('');
    }, 1000);

    setTimeout(() => {
      setAnnouncerVisible(false);
    }, 1800);
  }, [matchState.currentRound, onMatchStateUpdate, p1Fighter, p2Fighter]);

  // Restart Full Match / Game function
  const handleFullMatchRestart = useCallback(() => {
    if (onRestartMatch) {
      onRestartMatch();
    } else {
      handleRestartRound();
    }
  }, [handleRestartRound, onRestartMatch]);

  // Toggle sound in pause menu
  const handleToggleSound = useCallback(() => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  }, []);

  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(soundFX.isVoiceEnabled());
  const handleToggleVoice = useCallback(() => {
    const enabled = soundFX.toggleVoice();
    setIsVoiceEnabled(enabled);
  }, []);

  // Trigger sound & banner on round start
  useEffect(() => {
    p1Ref.current = createFightingEntity(p1Fighter, true, P1_START_POS);
    p2Ref.current = createFightingEntity(p2Fighter, false, P2_START_POS);
    cameraRef.current.x = ARENA_WIDTH / 2;
    cameraRef.current.y = 0;
    cameraRef.current.zoom = 1.05;
    cameraRef.current.leadFighter = 'neutral';
    cameraRef.current.leadBias = 0;
    setCameraState({ ...cameraRef.current });
    setP1Entity({ ...p1Ref.current });
    setP2Entity({ ...p2Ref.current });

    p1ComboTimerRef.current = 0;
    p2ComboTimerRef.current = 0;
    setP1ComboProgress(0);
    setP2ComboProgress(0);
    p1HitstunFlashRef.current = 0;
    p2HitstunFlashRef.current = 0;
    setP1HitstunActive(false);
    setP2HitstunActive(false);
    setHitShockwaves([]);
    setProjectiles([]);
    p1TookDamageRef.current = false;
    p2TookDamageRef.current = false;
    roundEndedRef.current = false;
    setPerfectFlare(null);
    setIsPaused(false);
    setShowMoveListModal(false);

    // Initialize replay recorder for initial match round
    activeReplayRecorder.start({
      stageId: matchState.stageId || 'neon_hangar',
      customBgUrl: customBgUrl || matchState.stageBg,
      p1: p1Ref.current,
      p2: p2Ref.current,
      controlScenario: matchState.controlScenario,
      mode: matchState.mode,
    });

    setAnnouncerText(`ROUND ${matchState.currentRound}`);
    setAnnouncerSub('READY...');
    setAnnouncerVisible(true);
    soundFX.playReadyFight();
    soundFX.playRoundStartVoice(matchState.currentRound, p1Fighter?.id || 'arjun', p2Fighter?.id || 'david');

    const t1 = setTimeout(() => {
      setAnnouncerText('FIGHT!');
      setAnnouncerSub('');
    }, 1000);

    const t2 = setTimeout(() => {
      setAnnouncerVisible(false);
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [matchState.currentRound, matchState.p1CurrentIndex, matchState.p2CurrentIndex, p1Fighter, p2Fighter]);

  // Handle Projectile Spawning
  const handleProjectileSpawn = useCallback((proj: FightingProjectile) => {
    setProjectiles(prev => [...prev, proj]);
  }, []);

  // Specialized 40+ Hit Combo Finisher Trigger (Visuals, Audio, Camera Zoom, Hitstop)
  const triggerFinisherEffect = useCallback(
    (
      attacker: FightingEntity,
      defender: FightingEntity,
      comboHits: number,
      damage: number,
      impactX: number,
      impactY: number,
      isP1Attacker: boolean
    ) => {
      // Triggered ONLY when combo strictly exceeds 40 hits!
      if (comboHits <= 40) return;

      const color = attacker.character?.accentColor || '#fbbf24';
      const attackerName = attacker.character?.name || (isP1Attacker ? 'Player 1' : 'Player 2');
      const defenderName = defender.character?.name || (!isP1Attacker ? 'Player 1' : 'Player 2');

      setFinisherState({
        active: true,
        attackerName,
        defenderName,
        comboHits,
        damage,
        impactX,
        impactY,
        color,
        isP1Attacker,
        timestamp: Date.now(),
      });

      // Visceral Finisher Sound FX (sub-bass drop, electrical surge, gold cadence)
      soundFX.playFinisherImpact();

      // Announcer proclamation
      voiceClipManager.triggerAnnouncerCall(`${comboHits} HIT APEX FINISHER! MAXIMUM OVERDRIVE!`, true);

      // Hitstop delay on entering the finisher threshold (freezes motion briefly for visceral impact)
      if (comboHits === 41) {
        hitstopFramesRef.current = 14;
      }

      // Intense screen shake
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 550);

      // Trigger 2.5D Arena Camera Shake if ref is ready
      if (stage25DRef.current?.triggerImpactCameraShake) {
        stage25DRef.current.triggerImpactCameraShake(1.6);
      }

      // Trigger massive golden shockwave ring and particle blast
      triggerHitShockwave(impactX, impactY, true);
      triggerComboOverdriveSparkBurst(impactX, impactY, comboHits, '#fbbf24');

      // Haptic controller rumble
      triggerGamepadRumble(0.9, 1.0, 300);

      // Camera zoom & finisher overlay duration timer (2.2s window)
      if (finisherTimerRef.current) {
        clearTimeout(finisherTimerRef.current);
      }
      finisherTimerRef.current = window.setTimeout(() => {
        setFinisherState(prev => (prev ? { ...prev, active: false } : null));
        setTimeout(() => setFinisherState(null), 400);
      }, 2200);
    },
    [triggerHitShockwave, triggerComboOverdriveSparkBurst]
  );

  // Immediate 40-Hit Overdrive Combo Demonstration (tactile test for particle bursts, real-time counter, finisher overlay & camera zoom)
  const handleTest40HitCombo = useCallback(() => {
    setIsPaused(false);
    soundFX.playReadyFight();
    let currentHit = 0;
    const interval = setInterval(() => {
      currentHit += 1;
      if (currentHit > 43) {
        clearInterval(interval);
        return;
      }

      // Update P1 entity combo stats
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      p1.comboHits = currentHit;
      const hitBonusMult = currentHit > 5 ? Number((1.15 + (Math.min(40, currentHit) - 5) * 0.05).toFixed(2)) : 1.0;
      const hitDmg = Math.round(40 * hitBonusMult);
      p1.comboDamage += hitDmg;
      p1.superMeter = Math.min(p1.maxMeter, p1.superMeter + 8);
      p2.hp = Math.max(15, p2.hp - hitDmg);
      p2.state = 'HIT_LIGHT';
      p2.stateFrame = 0;

      setP1Entity({ ...p1 });
      setP2Entity({ ...p2 });

      p1ComboTimerRef.current = COMBO_WINDOW_FRAMES;
      setP1ComboProgress(1);

      const impactX = (p1.x + p2.x) / 2 + (Math.random() * 30 - 15);
      const impactY = p2.y + 110 + (Math.random() * 40 - 20);

      // Hit spark text
      setHitSparks(prev => [
        ...prev.slice(-6),
        {
          id: `spk_test_${Date.now()}_${currentHit}`,
          x: p2.x,
          y: p2.y + 110,
          text: currentHit > 40
            ? `★ 40+ HIT FINISHER (${currentHit}H) ★`
            : currentHit >= 25
            ? `★ OVERDRIVE ${currentHit}H ★`
            : currentHit > 5
            ? `${hitDmg} (x${hitBonusMult.toFixed(2)} BONUS!)`
            : `${hitDmg} (${currentHit}H)`,
          isCrit: currentHit > 5,
          color: currentHit > 40 ? '#f59e0b' : currentHit >= 25 ? '#ec4899' : currentHit >= 20 ? '#fbbf24' : '#ef4444',
        },
      ]);

      triggerPunchFlash(
        impactX,
        impactY,
        p1Fighter?.accentColor || '#ef4444',
        currentHit > 5,
        currentHit >= 20,
        currentHit > 40 ? 'CLIMAX' : currentHit >= 20 ? 'SPECIAL' : 'NORMAL',
        hitDmg
      );

      // Trigger Specialized Finisher when hits strictly exceed 40!
      if (currentHit > 40) {
        triggerFinisherEffect(
          p1,
          p2,
          currentHit,
          p1.comboDamage,
          impactX,
          impactY,
          true
        );
      } else if (currentHit > 5) {
        triggerComboOverdriveSparkBurst(
          impactX,
          impactY,
          currentHit,
          p1Fighter?.accentColor || '#ef4444'
        );
      } else {
        soundFX.playComboHit(currentHit);
      }
    }, 85);
  }, [p1Fighter?.accentColor, triggerPunchFlash, triggerComboOverdriveSparkBurst, triggerFinisherEffect, COMBO_WINDOW_FRAMES]);

  // Motion input buffer tracking
  const p1MotionHistoryRef = useRef<InputCommandRecord[]>([]);
  const p2MotionHistoryRef = useRef<InputCommandRecord[]>([]);

  // Special Move visual effects: Dynamic Auras, Afterimage Trails, and Command Callout Banners
  const [specialFlares, setSpecialFlares] = useState<SpecialMoveFlare[]>([]);
  const [motionTrails, setMotionTrails] = useState<MotionTrailAfterimage[]>([]);
  const [specialMoveBanner, setSpecialMoveBanner] = useState<SpecialMoveBanner | null>(null);

  // Direction conversion helper from key states
  const getDirectionFromKeys = (up: boolean, down: boolean, left: boolean, right: boolean): InputCommandRecord['dir'] => {
    if (up && right) return 'UP_RIGHT';
    if (up && left) return 'UP_LEFT';
    if (down && right) return 'DOWN_RIGHT';
    if (down && left) return 'DOWN_LEFT';
    if (up) return 'UP';
    if (down) return 'DOWN';
    if (right) return 'RIGHT';
    if (left) return 'LEFT';
    return 'NEUTRAL';
  };

  // Trigger Special Move Visual Feedback (Colored Aura, Motion Trail Afterimages, Shockwaves & Command Banner)
  const triggerSpecialVisualEffects = useCallback(
    (entity: FightingEntity, move: FightingMove, motionType = 'SPECIAL') => {
      const isSuper = move.type === 'SUPER' || move.type === 'CLIMAX';
      const color = entity.character?.accentColor || (entity.isPlayer1 ? '#f59e0b' : '#3b82f6');
      const element = entity.character?.element || 'Energy';
      const moveId = `spec_${Date.now()}_${Math.random()}`;

      // 1. Expanding Special Aura Flare & Ground Shockwave
      const flare: SpecialMoveFlare = {
        id: moveId,
        x: entity.x,
        y: entity.y,
        facing: entity.facing,
        color,
        moveName: move.name,
        command: move.command || motionType,
        motionType,
        isSuper,
        isPlayer1: entity.isPlayer1,
        element,
      };
      setSpecialFlares(prev => [...prev.slice(-3), flare]);
      setTimeout(() => {
        setSpecialFlares(prev => prev.filter(f => f.id !== moveId));
      }, 550);

      // 2. Spawn Rapid Motion Ghost Afterimages trailing the fighter
      const trails: MotionTrailAfterimage[] = [
        {
          id: `trail_1_${moveId}`,
          x: entity.x - entity.facing * 35,
          y: entity.y,
          facing: entity.facing,
          color,
          entity: { ...entity },
          isPlayer1: entity.isPlayer1,
        },
        {
          id: `trail_2_${moveId}`,
          x: entity.x - entity.facing * 70,
          y: entity.y,
          facing: entity.facing,
          color,
          entity: { ...entity },
          isPlayer1: entity.isPlayer1,
        },
      ];
      setMotionTrails(prev => [...prev.slice(-6), ...trails]);
      setTimeout(() => {
        setMotionTrails(prev => prev.filter(t => !t.id.includes(moveId)));
      }, 420);

      // 3. Fighting Game Style Special Move Command Callout Tag
      let displayCommand = move.command;
      if (!displayCommand) {
        if (motionType === 'QCF') displayCommand = '↓ ↘ → + ' + move.button;
        else if (motionType === 'QCB') displayCommand = '↓ ↙ ← + ' + move.button;
        else if (motionType === 'DP') displayCommand = '→ ↓ ↘ + ' + move.button;
        else if (motionType === 'DOUBLE_QCF') displayCommand = '↓ ↘ → ↓ ↘ → + ' + move.button;
        else if (motionType === 'HCF') displayCommand = '← ↙ ↓ ↘ → + ' + move.button;
        else displayCommand = 'SPECIAL MOVE';
      }

      setSpecialMoveBanner({
        id: moveId,
        fighterName: entity.character?.name || (entity.isPlayer1 ? 'Player 1' : 'Player 2'),
        moveName: move.name,
        command: displayCommand,
        color,
        motionType,
        element,
        isSuper,
        isPlayer1: entity.isPlayer1,
      });
      setTimeout(() => {
        setSpecialMoveBanner(prev => (prev?.id === moveId ? null : prev));
      }, 1200);

      // 4. Audio & Haptics
      if (isSuper) {
        soundFX.playSuperFlash();
        triggerGamepadRumble(0.7, 0.9, 250);
      } else {
        soundFX.playFireballLaunch();
        triggerGamepadRumble(0.4, 0.6, 120);
      }
    },
    []
  );

  // Player 1 Move Execution Trigger
  const triggerP1Move = useCallback(
    (move: FightingMove, motionType = 'SPECIAL') => {
      if (isPaused || roundEndedRef.current) return;
      const p1 = p1Ref.current;
      const ok = executeMove(p1, move, handleProjectileSpawn);
      if (ok) {
        if (move.type === 'SPECIAL' || move.type === 'SUPER' || move.type === 'CLIMAX') {
          triggerSpecialVisualEffects(p1, move, motionType);
        }

        if (move.type === 'SUPER' || move.type === 'CLIMAX') {
          setSuperCutIn({
            fighterName: p1.character.name,
            moveName: move.name,
            color: p1.character.accentColor,
            cutInUrl: move.cutInUrl || '/moves/super_move.jpg',
            avatarUrl: p1.character.avatarUrl,
          });
          setScreenShake(true);
          setTimeout(() => setSuperCutIn(null), 1200);
          setTimeout(() => setScreenShake(false), 400);
        }
        setP1Entity({ ...p1 });
      }
      if (onInputHistoryAdd) {
        onInputHistoryAdd(move.command);
      }
    },
    [handleProjectileSpawn, isPaused, onInputHistoryAdd, triggerSpecialVisualEffects]
  );

  // Player 1 Smart Button Attack (with Motion Detection)
  const triggerP1ButtonAttack = useCallback(
    (button: 'LP' | 'HP' | 'LK' | 'HK' | 'CD', currentDir?: InputCommandRecord['dir']) => {
      if (isPaused || roundEndedRef.current) return;
      const p1 = p1Ref.current;

      // Determine current direction if not provided
      const dir = currentDir || getDirectionFromKeys(
        keysPressed.current.has('w'),
        keysPressed.current.has('s'),
        keysPressed.current.has('a'),
        keysPressed.current.has('d')
      );

      // Record input entry
      const now = Date.now();
      p1MotionHistoryRef.current.push({ dir, button, timestamp: now });
      if (p1MotionHistoryRef.current.length > 25) {
        p1MotionHistoryRef.current.shift();
      }

      // Check for motion inputs (QCF, QCB, DP, HCF, DOUBLE_QCF, etc.)
      const motion = detectMotion(p1MotionHistoryRef.current, p1.facing);
      const resolvedMove = resolveSpecialOrNormalMove(p1, motion, button);

      if (resolvedMove) {
        triggerP1Move(resolvedMove, motion);
      }
    },
    [isPaused, triggerP1Move]
  );

  // Player 1 Roll Evasion Trigger
  const triggerP1Roll = useCallback(() => {
    if (isPaused || roundEndedRef.current) return;
    const p1 = p1Ref.current;
    if (p1.isGrounded && p1.state !== 'ROLL_FWD' && !p1.currentMove) {
      soundFX.playRoll();
      if (onInputHistoryAdd) {
        onInputHistoryAdd('ROLL');
      }
      p1.state = 'ROLL_FWD';
      p1.stateFrame = 0;
      p1.isInvincible = true;
      p1.vx = p1.facing * 9;
      setP1Entity({ ...p1 });
    }
  }, [isPaused, onInputHistoryAdd]);

  // Player 1 MAX Mode Activation Trigger
  const triggerP1MaxMode = useCallback(() => {
    if (isPaused || roundEndedRef.current) return;
    const p1 = p1Ref.current;
    if (p1.superMeter >= 100 && !p1.isMaxMode) {
      soundFX.playSuperFlash();
      soundFX.playMaxModeVoice(p1.character?.id || 'arjun');
      triggerGamepadRumble(0.6, 0.9, 200);
      if (onInputHistoryAdd) {
        onInputHistoryAdd('MAX MODE');
      }
      p1.superMeter = p1.superMeter - 100;
      p1.isMaxMode = true;
      p1.maxModeTimer = 300;
      setP1Entity({ ...p1 });
    }
  }, [isPaused, onInputHistoryAdd]);

  // Player 1 Taunt Trigger
  const triggerP1Taunt = useCallback(() => {
    if (isPaused || roundEndedRef.current) return;
    const p1 = p1Ref.current;
    if (p1.state === 'IDLE' || p1.state === 'WALK_FWD' || p1.state === 'WALK_BACK') {
      soundFX.playCharacterTaunt(p1.character?.id || 'arjun');
      soundFX.playTauntVoice(p1.character?.id || 'arjun');
      if (onInputHistoryAdd) {
        onInputHistoryAdd('P1: TAUNT');
      }
      p1.state = 'TAUNT';
      p1.vx = 0;
      p1.stateFrame = 0;
      p1.superMeter = Math.min(p1.maxMeter, p1.superMeter + 15);
      setP1Entity({ ...p1 });
    }
  }, [isPaused, onInputHistoryAdd]);

  // Player 2 Move Execution Trigger
  const triggerP2Move = useCallback(
    (move: FightingMove, motionType = 'SPECIAL') => {
      if (isPaused || roundEndedRef.current) return;
      const p2 = p2Ref.current;
      const ok = executeMove(p2, move, handleProjectileSpawn);
      if (ok) {
        if (move.type === 'SPECIAL' || move.type === 'SUPER' || move.type === 'CLIMAX') {
          triggerSpecialVisualEffects(p2, move, motionType);
        }

        if (move.type === 'SUPER' || move.type === 'CLIMAX') {
          setSuperCutIn({
            fighterName: p2.character?.name || 'Player 2',
            moveName: move.name,
            color: p2.character?.accentColor || '#3b82f6',
            cutInUrl: move.cutInUrl || '/moves/super_move.jpg',
            avatarUrl: p2.character?.avatarUrl,
          });
          setScreenShake(true);
          setTimeout(() => setSuperCutIn(null), 1200);
          setTimeout(() => setScreenShake(false), 400);
        }
        setP2Entity({ ...p2 });
      }
      if (onInputHistoryAdd) {
        onInputHistoryAdd(`P2: ${move.command}`);
      }
    },
    [handleProjectileSpawn, isPaused, onInputHistoryAdd, triggerSpecialVisualEffects]
  );

  // Player 2 Smart Button Attack (with Motion Detection)
  const triggerP2ButtonAttack = useCallback(
    (button: 'LP' | 'HP' | 'LK' | 'HK' | 'CD', currentDir?: InputCommandRecord['dir']) => {
      if (isPaused || roundEndedRef.current) return;
      const p2 = p2Ref.current;

      // Determine current direction if not provided
      const dir = currentDir || getDirectionFromKeys(
        keysPressed.current.has('arrowup'),
        keysPressed.current.has('arrowdown'),
        keysPressed.current.has('arrowleft'),
        keysPressed.current.has('arrowright')
      );

      // Record input entry
      const now = Date.now();
      p2MotionHistoryRef.current.push({ dir, button, timestamp: now });
      if (p2MotionHistoryRef.current.length > 25) {
        p2MotionHistoryRef.current.shift();
      }

      // Check for motion inputs (QCF, QCB, DP, HCF, DOUBLE_QCF, etc.)
      const motion = detectMotion(p2MotionHistoryRef.current, p2.facing);
      const resolvedMove = resolveSpecialOrNormalMove(p2, motion, button);

      if (resolvedMove) {
        triggerP2Move(resolvedMove, motion);
      }
    },
    [isPaused, triggerP2Move]
  );

  // Player 2 Roll Evasion Trigger
  const triggerP2Roll = useCallback(() => {
    if (isPaused || roundEndedRef.current) return;
    const p2 = p2Ref.current;
    if (p2.isGrounded && p2.state !== 'ROLL_FWD' && !p2.currentMove) {
      soundFX.playRoll();
      if (onInputHistoryAdd) {
        onInputHistoryAdd('P2: ROLL');
      }
      p2.state = 'ROLL_FWD';
      p2.stateFrame = 0;
      p2.isInvincible = true;
      p2.vx = p2.facing * 9;
      setP2Entity({ ...p2 });
    }
  }, [isPaused, onInputHistoryAdd]);

  // Player 2 MAX Mode Activation Trigger
  const triggerP2MaxMode = useCallback(() => {
    if (isPaused || roundEndedRef.current) return;
    const p2 = p2Ref.current;
    if (p2.superMeter >= 100 && !p2.isMaxMode) {
      soundFX.playSuperFlash();
      soundFX.playMaxModeVoice(p2.character?.id || 'david');
      triggerGamepadRumble(0.6, 0.9, 200);
      if (onInputHistoryAdd) {
        onInputHistoryAdd('P2: MAX MODE');
      }
      p2.superMeter = p2.superMeter - 100;
      p2.isMaxMode = true;
      p2.maxModeTimer = 300;
      setP2Entity({ ...p2 });
    }
  }, [isPaused, onInputHistoryAdd]);

  // Player 2 Taunt Trigger
  const triggerP2Taunt = useCallback(() => {
    if (isPaused || roundEndedRef.current) return;
    const p2 = p2Ref.current;
    if (p2.state === 'IDLE' || p2.state === 'WALK_FWD' || p2.state === 'WALK_BACK') {
      soundFX.playCharacterTaunt(p2.character?.id || 'david');
      soundFX.playTauntVoice(p2.character?.id || 'david');
      if (onInputHistoryAdd) {
        onInputHistoryAdd('P2: TAUNT');
      }
      p2.state = 'TAUNT';
      p2.vx = 0;
      p2.stateFrame = 0;
      p2.superMeter = Math.min(p2.maxMeter, p2.superMeter + 15);
      setP2Entity({ ...p2 });
    }
  }, [isPaused, onInputHistoryAdd]);

  // Gamepad Connection Event Listeners
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      const name = getFriendlyGamepadName(e.gamepad.id);
      setConnectedGamepadName(name);
      setGamepadNotice(`🎮 ${name.toUpperCase()} DETECTED`);
      soundFX.playClick();
      setTimeout(() => setGamepadNotice(null), 3500);
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      setConnectedGamepadName(null);
      setGamepadNotice(`🎮 CONTROLLER DISCONNECTED`);
      setTimeout(() => setGamepadNotice(null), 2500);
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, []);

  // Keyboard Shortcuts (including ESC / Pause button)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      // Developer Hotkey: Toggle Hitbox & Frame Data Lab (`~` or `F12`)
      if (e.key === '`' || e.key === '~' || e.code === 'Backquote' || e.key === 'F12' || e.code === 'F12') {
        e.preventDefault();
        toggleDebugMode();
        return;
      }

      // Pause toggle: 'Escape' key
      if (e.key === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }

      if (isPaused || roundEndedRef.current) return;

      keysPressed.current.add(e.key.toLowerCase());
      keysPressed.current.add(e.code.toLowerCase());

      const scenario = matchState.controlScenario || 'USER_VS_CPU';
      const isScenario1 = scenario === 'CPU_VS_CPU';
      const isScenario3 = scenario === 'USER_VS_USER';

      // Directional inputs recording for Motion Detection
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        const d = getDirectionFromKeys(
          keysPressed.current.has('w') || e.key.toLowerCase() === 'w',
          keysPressed.current.has('s') || e.key.toLowerCase() === 's',
          keysPressed.current.has('a') || e.key.toLowerCase() === 'a',
          keysPressed.current.has('d') || e.key.toLowerCase() === 'd'
        );
        p1MotionHistoryRef.current.push({ dir: d, timestamp: Date.now() });
        if (p1MotionHistoryRef.current.length > 25) p1MotionHistoryRef.current.shift();
      }

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        const d = getDirectionFromKeys(
          keysPressed.current.has('arrowup') || e.key.toLowerCase() === 'arrowup',
          keysPressed.current.has('arrowdown') || e.key.toLowerCase() === 'arrowdown',
          keysPressed.current.has('arrowleft') || e.key.toLowerCase() === 'arrowleft',
          keysPressed.current.has('arrowright') || e.key.toLowerCase() === 'arrowright'
        );
        p2MotionHistoryRef.current.push({ dir: d, timestamp: Date.now() });
        if (p2MotionHistoryRef.current.length > 25) p2MotionHistoryRef.current.shift();
      }

      // 1. Player 1 Keyboard Controls (Scenario 2 User vs PC, Scenario 3 PvP, or Default)
      if (!isScenario1) {
        const moves = p1Entity.character.moves;
        const keys = p1KeyBindingsRef.current;

        // Taunt
        if (matchesBinding(e, keys.taunt)) {
          triggerP1Taunt();
        }
        // Light Punch (Smart Motion Trigger)
        else if (matchesBinding(e, keys.lightPunch)) {
          triggerP1ButtonAttack('LP');
        }
        // Heavy Punch (Smart Motion Trigger)
        else if (matchesBinding(e, keys.heavyPunch) && !isScenario3) {
          triggerP1ButtonAttack('HP');
        }
        // Light Kick (Smart Motion Trigger)
        else if (matchesBinding(e, keys.lightKick) && !isScenario3) {
          triggerP1ButtonAttack('LK');
        }
        // Heavy Kick (Smart Motion Trigger)
        else if (matchesBinding(e, keys.heavyKick) && !isScenario3) {
          triggerP1ButtonAttack('HK');
        }
        // Blowback Attack (Smart Motion Trigger)
        else if (matchesBinding(e, keys.blowback)) {
          triggerP1ButtonAttack('CD');
        }
        // Roll: configured roll key or Space / R fallback
        else if (matchesBinding(e, keys.roll) || (!isScenario3 && (e.code === 'Space' || e.key.toLowerCase() === 'r'))) {
          triggerP1Roll();
        }
        // Special Move 1
        else if (matchesBinding(e, keys.special1)) {
          const s1 = moves.filter(m => m.type === 'SPECIAL')[0];
          if (s1) triggerP1Move(s1, 'SPECIAL 1');
        }
        // Special Move 2
        else if (matchesBinding(e, keys.special2)) {
          const s2 = moves.filter(m => m.type === 'SPECIAL')[1];
          if (s2) triggerP1Move(s2, 'SPECIAL 2');
        }
        // Special Move 3
        else if (matchesBinding(e, keys.special3)) {
          const s3 = moves.filter(m => m.type === 'SPECIAL')[2];
          if (s3) triggerP1Move(s3, 'SPECIAL 3');
        }
        // Super Move
        else if (matchesBinding(e, keys.superMove) || e.key === '4') {
          const sup = moves.find(m => m.type === 'SUPER');
          if (sup && p1Entity.superMeter >= sup.meterCost) {
            triggerP1Move(sup, 'SUPER MOVE');
          }
        }
        // MAX Mode
        else if (matchesBinding(e, keys.maxMode)) {
          triggerP1MaxMode();
        }
      }

      // 2. Player 2 Keyboard Controls (Scenario 3: Local PvP / 2 Opponents)
      if (isScenario3) {
        const p2Moves = p2Entity.character.moves;
        const key = e.key.toLowerCase();
        const code = e.code.toLowerCase();

        // P2 Taunt: 'Y' or NumpadDecimal
        if (key === 'y' || code === 'numpaddecimal') {
          triggerP2Taunt();
        }
        // P2 Light Punch: '7' or Numpad4 or 'u'
        else if (key === '7' || code === 'numpad4' || key === 'u') {
          triggerP2ButtonAttack('LP');
        }
        // P2 Heavy Punch: '8' or Numpad8 or 'i'
        else if (key === '8' || code === 'numpad8' || key === 'i') {
          triggerP2ButtonAttack('HP');
        }
        // P2 Light Kick: '9' or Numpad5 or 'o'
        else if (key === '9' || code === 'numpad5' || key === 'o') {
          triggerP2ButtonAttack('LK');
        }
        // P2 Heavy Kick: '0' or Numpad6 or 'p'
        else if (key === '0' || code === 'numpad6' || key === 'p') {
          triggerP2ButtonAttack('HK');
        }
        // P2 Blowback: '-' or Numpad9
        else if (key === '-' || code === 'numpad9') {
          triggerP2ButtonAttack('CD');
        }
        // P2 Roll: Enter or Numpad0 or ShiftRight
        else if (code === 'enter' || code === 'numpad0' || code === 'shiftright') {
          triggerP2Roll();
        }
        // P2 Special 1: '[' or Numpad1
        else if (key === '[' || code === 'numpad1') {
          const s1 = p2Moves.filter(m => m.type === 'SPECIAL')[0];
          if (s1) triggerP2Move(s1, 'SPECIAL 1');
        }
        // P2 Special 2: ']' or Numpad2
        else if (key === ']' || code === 'numpad2') {
          const s2 = p2Moves.filter(m => m.type === 'SPECIAL')[1];
          if (s2) triggerP2Move(s2, 'SPECIAL 2');
        }
        // P2 Special 3: '\' or Numpad3
        else if (key === '\\' || code === 'numpad3') {
          const s3 = p2Moves.filter(m => m.type === 'SPECIAL')[2];
          if (s3) triggerP2Move(s3, 'SPECIAL 3');
        }
        // P2 Super Move: '=' or NumpadEnter or Delete
        else if (key === '=' || code === 'numpadenter' || key === 'delete') {
          const sup = p2Moves.find(m => m.type === 'SUPER');
          if (sup && p2Entity.superMeter >= sup.meterCost) {
            triggerP2Move(sup, 'SUPER MOVE');
          }
        }
        // P2 MAX Mode: '+' or NumpadAdd or ControlRight
        else if (key === '+' || code === 'numpadadd' || code === 'controlright') {
          triggerP2MaxMode();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
      keysPressed.current.delete(e.code.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isPaused,
    matchState.controlScenario,
    p1Entity.character.moves,
    p1Entity.superMeter,
    p1Entity.isMaxMode,
    p2Entity.character.moves,
    p2Entity.superMeter,
    p2Entity.isMaxMode,
    togglePause,
    triggerP1Move,
    triggerP1Taunt,
    triggerP1Roll,
    triggerP1MaxMode,
    triggerP2Move,
    triggerP2Taunt,
    triggerP2Roll,
    triggerP2MaxMode,
  ]);

  // Handle custom events from Virtual Web Console
  useEffect(() => {
    const handleCustomMove = (e: Event) => {
      if (isPaused || roundEndedRef.current) return;
      const customEvt = e as CustomEvent<FightingMove>;
      if (customEvt.detail) {
        triggerP1Move(customEvt.detail);
      }
    };

    const handleCustomTaunt = () => {
      if (isPaused || roundEndedRef.current) return;
      triggerP1Taunt();
    };

    window.addEventListener('fof-player-move', handleCustomMove);
    window.addEventListener('kof-player-move', handleCustomMove);
    window.addEventListener('fof-player-taunt', handleCustomTaunt);
    window.addEventListener('kof-player-taunt', handleCustomTaunt);
    return () => {
      window.removeEventListener('fof-player-move', handleCustomMove);
      window.removeEventListener('kof-player-move', handleCustomMove);
      window.removeEventListener('fof-player-taunt', handleCustomTaunt);
      window.removeEventListener('kof-player-taunt', handleCustomTaunt);
    };
  }, [isPaused, triggerP1Move, triggerP1Taunt]);

  // Handle Round Finish Resolution (KO or Time Over) with Post-Match Victory Pose
  const finishRoundWithBonus = useCallback((winner: 'p1' | 'p2' | 'draw') => {
    if (roundEndedRef.current) return;
    roundEndedRef.current = true;

    const p1 = p1Ref.current;
    const p2 = p2Ref.current;

    if (winner === 'draw') {
      soundFX.playRoundEndVoice('draw', false);
      setAnnouncerText('DRAW GAME');
      setAnnouncerSub('DOUBLE K.O.');
      setAnnouncerVisible(true);
      setTimeout(() => {
        onRoundFinish('draw', false);
      }, 1800);
      return;
    }

    const isP1Winner = winner === 'p1';
    const isP2Winner = winner === 'p2';

    postMatchActiveRef.current = true;

    const isMatchDeciding =
      matchState.mode === '1v1_SINGLE' ||
      (isP1Winner && matchState.p2CurrentIndex + 1 >= matchState.p2Team.length) ||
      (isP2Winner && matchState.p1CurrentIndex + 1 >= matchState.p1Team.length);

    const winningFighter = isP1Winner ? p1Fighter : p2Fighter;
    const losingFighter = isP1Winner ? p2Fighter : p1Fighter;
    const winnerEntity = isP1Winner ? p1 : p2;

    const isPerfect = isP1Winner
      ? (p1.hp === p1.maxHp && !p1TookDamageRef.current)
      : (p2.hp === p2.maxHp && !p2TookDamageRef.current);

    storedWinnerRef.current = { winner, isPerfect };

    // Finalize Replay Recording for this match
    activeReplayRecorder.finish(winner, isPerfect);

    // Set immediate fighter states for victory and defeat animations
    if (isP1Winner) {
      p1.state = 'VICTORY';
      p1.vx = 0;
      p1.vy = 0;
      p1.stateFrame = 0;
      p2.state = 'DEFEAT';
      p2.vx = 0;
      p2.vy = 0;
      p2.stateFrame = 0;
      setP1Entity({ ...p1, state: 'VICTORY', vx: 0, vy: 0, stateFrame: 0 });
      setP2Entity({ ...p2, state: 'DEFEAT', vx: 0, vy: 0, stateFrame: 0 });
    } else {
      p2.state = 'VICTORY';
      p2.vx = 0;
      p2.vy = 0;
      p2.stateFrame = 0;
      p1.state = 'DEFEAT';
      p1.vx = 0;
      p1.vy = 0;
      p1.stateFrame = 0;
      setP2Entity({ ...p2, state: 'VICTORY', vx: 0, vy: 0, stateFrame: 0 });
      setP1Entity({ ...p1, state: 'DEFEAT', vx: 0, vy: 0, stateFrame: 0 });
    }

    // Play initial sound effects
    if (isPerfect) {
      setPerfectFlare({
        winner,
        fighterName: winningFighter?.name || (isP1Winner ? 'Player 1' : 'Player 2'),
        accentColor: winningFighter?.accentColor || (isP1Winner ? '#ef4444' : '#3b82f6'),
        bonusScore: 5000,
        bonusMeter: 100,
        isPlayer1: isP1Winner,
      });
      soundFX.playPerfectVictory();
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);

      if (isP1Winner) {
        setP1Entity(prev => ({
          ...prev,
          superMeter: Math.min(prev.maxMeter, prev.superMeter + 100),
        }));
      }
    } else {
      soundFX.playKO();
      setAnnouncerText('K.O.!');
      setAnnouncerSub('');
      setAnnouncerVisible(true);
    }

    // Trigger round end voice
    soundFX.playRoundEndVoice(winner, isPerfect, winningFighter?.id, losingFighter?.id);

    // After 750ms, transition into Post-Match Victory Pose presentation before score screen
    setTimeout(() => {
      setAnnouncerVisible(false);
      setPostMatchState({
        active: true,
        winner,
        winningFighter: (winningFighter || {
          id: isP1Winner ? 'arjun' : 'david',
          name: isP1Winner ? 'Arjun Rao' : 'David Steele',
          accentColor: isP1Winner ? '#f59e0b' : '#38bdf8',
        }) as any,
        losingFighter: (losingFighter || {
          id: isP1Winner ? 'david' : 'arjun',
          name: isP1Winner ? 'David Steele' : 'Arjun Rao',
          accentColor: isP1Winner ? '#38bdf8' : '#f59e0b',
        }) as any,
        isPerfect,
        maxCombo: isP1Winner ? p1Entity.comboHits || 0 : p2Entity.comboHits || 0,
        damageDealt: isP1Winner ? Math.max(0, Math.round(p2.maxHp - p2.hp)) : Math.max(0, Math.round(p1.maxHp - p1.hp)),
        winnerHpPercent: Math.max(1, Math.round((winnerEntity.hp / winnerEntity.maxHp) * 100)),
        isMatchDeciding,
        subStep: 1,
      });
      soundFX.playVictoryFanfare();
    }, 750);
  }, [matchState.mode, matchState.p1CurrentIndex, matchState.p2CurrentIndex, matchState.p1Team.length, matchState.p2Team.length, onRoundFinish, p1Entity.comboHits, p2Entity.comboHits, p1Fighter, p2Fighter]);

  // Proceed from Victory Pose to Match Score Screen
  const handleProceedToScoreScreen = useCallback(() => {
    postMatchActiveRef.current = false;
    setPostMatchState(null);
    setPerfectFlare(null);
    setAnnouncerVisible(false);
    if (storedWinnerRef.current) {
      const { winner, isPerfect } = storedWinnerRef.current;
      storedWinnerRef.current = null;
      onRoundFinish(winner, isPerfect);
    }
  }, [onRoundFinish]);

  // Round Timer Countdown Loop (decrements every 1 second when active & not paused)
  useEffect(() => {
    if (isPaused || isTrainingMode || roundEndedRef.current || announcerVisible) return;

    if (matchState.roundTimer <= 0) {
      if (!roundEndedRef.current) {
        const p1 = p1Ref.current;
        const p2 = p2Ref.current;
        if (p1.hp > p2.hp) {
          finishRoundWithBonus('p1');
        } else if (p2.hp > p1.hp) {
          finishRoundWithBonus('p2');
        } else {
          finishRoundWithBonus('draw');
        }
      }
      return;
    }

    const timerInterval = setInterval(() => {
      onMatchStateUpdate(prev => ({
        ...prev,
        roundTimer: Math.max(0, prev.roundTimer - 1),
      }));
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [announcerVisible, finishRoundWithBonus, isPaused, isTrainingMode, matchState.roundTimer, onMatchStateUpdate]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      // Hitstop delay during finisher impact: freeze motion briefly for visceral kinetic impact
      if (hitstopFramesRef.current > 0) {
        hitstopFramesRef.current -= 1;
        animFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // Poll connected Gamepad states at 60 FPS
      const pad1 = pollGamepadByIndex(0) || pollPrimaryGamepad();
      const pad2 = pollGamepadByIndex(1);

      const scenario = matchState.controlScenario || 'USER_VS_CPU';
      const isScenario1 = scenario === 'CPU_VS_CPU';
      const isScenario2 = scenario === 'USER_VS_CPU';
      const isScenario3 = scenario === 'USER_VS_USER';

      // Gamepad tactical pause toggle
      if (pad1?.justPressed.pause || pad2?.justPressed.pause) {
        togglePause();
      }

      // Gamepad 1 actions for Player 1 (Scenario 2 or Scenario 3)
      if (pad1 && !isScenario1 && !isPaused && !roundEndedRef.current) {
        const moves = p1Entity.character.moves;
        const pad1Dir = getDirectionFromKeys(pad1.isUp, pad1.isDown, pad1.isLeft, pad1.isRight);

        if (pad1.justPressed.taunt) {
          triggerP1Taunt();
        } else if (pad1.justPressed.lp) {
          triggerP1ButtonAttack('LP', pad1Dir);
        } else if (pad1.justPressed.hp) {
          triggerP1ButtonAttack('HP', pad1Dir);
        } else if (pad1.justPressed.lk) {
          triggerP1ButtonAttack('LK', pad1Dir);
        } else if (pad1.justPressed.hk) {
          triggerP1ButtonAttack('HK', pad1Dir);
        } else if (pad1.justPressed.blowback) {
          triggerP1ButtonAttack('CD', pad1Dir);
        } else if (pad1.justPressed.roll) {
          triggerP1Roll();
        } else if (pad1.justPressed.spec1) {
          const s1 = moves.filter(m => m.type === 'SPECIAL')[0];
          if (s1) triggerP1Move(s1, 'SPECIAL 1');
        } else if (pad1.justPressed.spec2) {
          const s2 = moves.filter(m => m.type === 'SPECIAL')[1];
          if (s2) triggerP1Move(s2, 'SPECIAL 2');
        } else if (pad1.justPressed.superMove) {
          const sup = moves.find(m => m.type === 'SUPER');
          if (sup && p1Entity.superMeter >= sup.meterCost) {
            triggerP1Move(sup, 'SUPER MOVE');
          }
        } else if (pad1.justPressed.maxMode) {
          triggerP1MaxMode();
        }
      }

      // Gamepad 2 actions for Player 2 (Scenario 3: Local PvP)
      if (pad2 && isScenario3 && !isPaused && !roundEndedRef.current) {
        const p2Moves = p2Entity.character.moves;
        const pad2Dir = getDirectionFromKeys(pad2.isUp, pad2.isDown, pad2.isLeft, pad2.isRight);

        if (pad2.justPressed.taunt) {
          triggerP2Taunt();
        } else if (pad2.justPressed.lp) {
          triggerP2ButtonAttack('LP', pad2Dir);
        } else if (pad2.justPressed.hp) {
          triggerP2ButtonAttack('HP', pad2Dir);
        } else if (pad2.justPressed.lk) {
          triggerP2ButtonAttack('LK', pad2Dir);
        } else if (pad2.justPressed.hk) {
          triggerP2ButtonAttack('HK', pad2Dir);
        } else if (pad2.justPressed.blowback) {
          triggerP2ButtonAttack('CD', pad2Dir);
        } else if (pad2.justPressed.roll) {
          triggerP2Roll();
        } else if (pad2.justPressed.spec1) {
          const s1 = p2Moves.filter(m => m.type === 'SPECIAL')[0];
          if (s1) triggerP2Move(s1, 'SPECIAL 1');
        } else if (pad2.justPressed.spec2) {
          const s2 = p2Moves.filter(m => m.type === 'SPECIAL')[1];
          if (s2) triggerP2Move(s2, 'SPECIAL 2');
        } else if (pad2.justPressed.superMove) {
          const sup = p2Moves.find(m => m.type === 'SUPER');
          if (sup && p2Entity.superMeter >= sup.meterCost) {
            triggerP2Move(sup, 'SUPER MOVE');
          }
        } else if (pad2.justPressed.maxMode) {
          triggerP2MaxMode();
        }
      }

      if (isPaused) {
        animFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // If round ended, advance post-match victory poses and freeze combat physics
      if (roundEndedRef.current) {
        if (postMatchActiveRef.current) {
          const p1 = p1Ref.current;
          const p2 = p2Ref.current;
          p1.vx = 0;
          p1.vy = 0;
          p2.vx = 0;
          p2.vy = 0;
          p1.stateFrame = (p1.stateFrame || 0) + 1;
          p2.stateFrame = (p2.stateFrame || 0) + 1;
          setP1Entity({ ...p1 });
          setP2Entity({ ...p2 });
        }
        animFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      const p1 = p1Ref.current;
      const p2 = p2Ref.current;

      // Facing directions (with anti-jitter when on or near identical axis)
      if (Math.abs(p1.x - p2.x) >= 2) {
        p1.facing = p1.x < p2.x ? 1 : -1;
        p2.facing = p2.x > p1.x ? -1 : 1;
      }

      // 1. Process P1 Movement
      if (isScenario1) {
        // Scenario 1: CPU AI controls Player 1
        updateCpuAI(p1, p2, cpuDifficulty, (move) => {
          executeMove(p1, move, handleProjectileSpawn);
        });
      } else {
        // Scenario 2 & 3: Human User controls Player 1
        const keys = p1KeyBindingsRef.current;
        const leftTarget = keys.moveLeft.toLowerCase();
        const rightTarget = keys.moveRight.toLowerCase();
        const upTarget = keys.jump.toLowerCase();
        const downTarget = keys.crouch.toLowerCase();

        const isP1Left = keysPressed.current.has(leftTarget) || (leftTarget === ' ' && keysPressed.current.has('space')) || (pad1?.isLeft ?? false);
        const isP1Right = keysPressed.current.has(rightTarget) || (rightTarget === ' ' && keysPressed.current.has('space')) || (pad1?.isRight ?? false);
        const isP1Up = keysPressed.current.has(upTarget) || (upTarget === ' ' && keysPressed.current.has('space')) || (pad1?.isUp ?? false);
        const isP1Down = keysPressed.current.has(downTarget) || (downTarget === ' ' && keysPressed.current.has('space')) || (pad1?.isDown ?? false);

        if (p1.isGrounded && p1.state !== 'HIT_LIGHT' && p1.state !== 'HIT_HEAVY' && p1.state !== 'KNOCKDOWN' && p1.state !== 'TAUNT') {
          if (!p1.currentMove && p1.state !== 'ROLL_FWD') {
            if (isP1Down) {
              p1.state = 'CROUCH';
              p1.vx = 0;
            } else if (isP1Left) {
              p1.state = p1.facing === 1 ? 'WALK_BACK' : 'WALK_FWD';
              p1.vx = -4.5;
              p1.isBlocking = p1.facing === 1;
            } else if (isP1Right) {
              p1.state = p1.facing === 1 ? 'WALK_FWD' : 'WALK_BACK';
              p1.vx = 4.5;
              p1.isBlocking = p1.facing === -1;
            } else {
              p1.state = 'IDLE';
              p1.vx = 0;
              p1.isBlocking = false;
            }

            // Jump
            if (isP1Up) {
              p1.vy = JUMP_VELOCITY;
              p1.isGrounded = false;
              p1.state = 'JUMP_NEUTRAL';
            }
          }
        }
      }

      // 2. Process P2 Movement
      if (isScenario3) {
        // Scenario 3: Human User 2 controls Player 2
        const isP2Left = keysPressed.current.has('arrowleft') || (pad2?.isLeft ?? false);
        const isP2Right = keysPressed.current.has('arrowright') || (pad2?.isRight ?? false);
        const isP2Up = keysPressed.current.has('arrowup') || (pad2?.isUp ?? false);
        const isP2Down = keysPressed.current.has('arrowdown') || (pad2?.isDown ?? false);

        if (p2.isGrounded && p2.state !== 'HIT_LIGHT' && p2.state !== 'HIT_HEAVY' && p2.state !== 'KNOCKDOWN' && p2.state !== 'TAUNT') {
          if (!p2.currentMove && p2.state !== 'ROLL_FWD') {
            if (isP2Down) {
              p2.state = 'CROUCH';
              p2.vx = 0;
            } else if (isP2Left) {
              p2.state = p2.facing === 1 ? 'WALK_BACK' : 'WALK_FWD';
              p2.vx = -4.5;
              p2.isBlocking = p2.facing === 1;
            } else if (isP2Right) {
              p2.state = p2.facing === 1 ? 'WALK_FWD' : 'WALK_BACK';
              p2.vx = 4.5;
              p2.isBlocking = p2.facing === -1;
            } else {
              p2.state = 'IDLE';
              p2.vx = 0;
              p2.isBlocking = false;
            }

            // Jump
            if (isP2Up) {
              p2.vy = JUMP_VELOCITY;
              p2.isGrounded = false;
              p2.state = 'JUMP_NEUTRAL';
            }
          }
        }
      } else {
        // Scenario 1 & Scenario 2: CPU AI controls Player 2 (unless training mode dummy)
        if (!isTrainingMode) {
          updateCpuAI(p2, p1, cpuDifficulty, (move) => {
            executeMove(p2, move, handleProjectileSpawn);
          });
        }
      }

      // Update authoritative physics, normalized 60 FPS delta, state frames, boundaries
      const frameScale = Math.max(0.5, Math.min(2.0, dt * 60));
      [p1, p2].forEach(ent => {
        // Defensive recovery against NaN or corrupt out-of-bounds positions
        if (!Number.isFinite(ent.y) || ent.y < -50 || ent.y > 450) {
          ent.y = 0;
          ent.vy = 0;
          ent.isGrounded = true;
          if (ent.state.startsWith('JUMP')) {
            ent.state = 'IDLE';
          }
        }

        // Apply authoritative gravity and vertical jump velocity scaled by delta
        if (!ent.isGrounded) {
          ent.vy -= GRAVITY * frameScale;
          ent.y += ent.vy * frameScale;

          // Reliable landing detection
          if (ent.y <= 0) {
            ent.y = 0;
            ent.vy = 0;
            ent.isGrounded = true;
            if (
              ent.state === 'JUMP_NEUTRAL' ||
              ent.state === 'JUMP_FWD' ||
              ent.state === 'JUMP_BACK' ||
              ent.state === 'JUMP'
            ) {
              ent.state = 'IDLE';
            }
          }
        }

        // Move horizontal with frame scaling
        ent.x += ent.vx * frameScale;

        // Decelerate roll
        if (ent.state === 'ROLL_FWD') {
          ent.stateFrame += 1;
          if (ent.stateFrame > 20) {
            ent.state = 'IDLE';
            ent.stateFrame = 0;
            ent.isInvincible = false;
            ent.vx = 0;
          }
        }

        // Taunt duration progression (~38 frames duration)
        if (ent.state === 'TAUNT') {
          ent.vx = 0;
          ent.stateFrame += 1;
          if (ent.stateFrame >= 38) {
            ent.state = 'IDLE';
            ent.stateFrame = 0;
          }
        }

        // Broad arena boundary clamp
        ent.x = Math.max(CAMERA_SCREEN_EDGE_MARGIN, Math.min(ARENA_WIDTH - CAMERA_SCREEN_EDGE_MARGIN, ent.x));

        // Move frame progression
        if (ent.currentMove) {
          ent.stateFrame += 1;
          const totalFrames =
            ent.currentMove.startupFrames +
            ent.currentMove.activeFrames +
            ent.currentMove.recoveryFrames;

          if (ent.stateFrame >= totalFrames) {
            ent.currentMove = null;
            ent.state = 'IDLE';
            ent.stateFrame = 0;
            ent.isInvincible = false;
            ent.hasHitThisAttack = false;
          }
        }

        // Hit stun recovery
        if (ent.state === 'HIT_LIGHT' || ent.state === 'HIT_HEAVY') {
          ent.stateFrame += 1;
          if (ent.stateFrame > (ent.state === 'HIT_HEAVY' ? 24 : 14)) {
            ent.state = 'IDLE';
            ent.stateFrame = 0;
          }
        }

        // MAX Mode timer
        if (ent.isMaxMode) {
          ent.maxModeTimer = Math.max(0, ent.maxModeTimer - 1);
          if (ent.maxModeTimer === 0) ent.isMaxMode = false;
        }
      });

      // =========================================================================
      // DYNAMIC STREET FIGHTER 6 CAMERA PANNING & SCREEN EDGE PROTECTION
      // =========================================================================
      // 1. Calculate Combat Lead Dominance to determine which fighter leads framing
      let p1LeadScore = 0;
      let p2LeadScore = 0;

      // Aggressive move priority (Super / Climax has highest camera focus)
      if (p1.currentMove?.type === 'SUPER' || p1.currentMove?.type === 'CLIMAX') p1LeadScore += 6;
      if (p2.currentMove?.type === 'SUPER' || p2.currentMove?.type === 'CLIMAX') p2LeadScore += 6;

      // Active standard/special attacks
      if (p1.currentMove) p1LeadScore += 3;
      if (p2.currentMove) p2LeadScore += 3;

      // Combo pressure dominance
      if (p1.comboHits > 0) p1LeadScore += Math.min(5, p1.comboHits * 1.5);
      if (p2.comboHits > 0) p2LeadScore += Math.min(5, p2.comboHits * 1.5);

      // Forward velocity towards opponent
      if (p1.vx * p1.facing > 0) p1LeadScore += 1.5;
      if (p2.vx * p2.facing > 0) p2LeadScore += 1.5;

      // Defending / hitstun / knockdown penalty
      if (p1.state === 'HIT_LIGHT' || p1.state === 'HIT_HEAVY' || p1.state === 'KNOCKDOWN') p1LeadScore -= 3;
      if (p2.state === 'HIT_LIGHT' || p2.state === 'HIT_HEAVY' || p2.state === 'KNOCKDOWN') p2LeadScore -= 3;

      const leadScoreDiff = p1LeadScore - p2LeadScore;
      const detectedLeadFighter: 'p1' | 'p2' | 'neutral' =
        leadScoreDiff > 0.8 ? 'p1' : leadScoreDiff < -0.8 ? 'p2' : 'neutral';

      // 2. Compute Camera Viewport Framing (Midpoint + Lead Aggressor Offset)
      const midX = (p1.x + p2.x) / 2;
      const fighterDistance = Math.abs(p1.x - p2.x);
      const midY = Math.max(0, (p1.y + p2.y) / 2);

      // Lead Bias in world pixels (Street Fighter 6 frames slightly ahead of the aggressor)
      const maxLeadOffset =
        cameraRef.current.preset === 'LEAD_FOCUS'
          ? 110
          : cameraRef.current.preset === 'CLASSIC_CENTER'
          ? 0
          : 80;
      const normalizedLead = Math.max(-1, Math.min(1, leadScoreDiff / 4));
      const targetLeadBias = normalizedLead * maxLeadOffset;

      let targetCamX = midX + targetLeadBias;

      // 3. Dynamic Frustum Zoom (Street Fighter 6 Dynamic Spacing)
      // Close combat (< 240px dist) -> dramatic zoom in (1.14x)
      // Mid range (240 - 760px) -> standard framing (1.05x)
      // Long range zoning / corner play (> 760px) -> zoom out to 0.96x
      const distT = Math.min(1, Math.max(0, (fighterDistance - 240) / 520));
      const targetZoom = CAMERA_MAX_ZOOM - distT * (CAMERA_MAX_ZOOM - CAMERA_MIN_ZOOM);

      // 4. Frustum boundary clamping
      // The camera viewport must never show outside the stage walls
      const currentEffViewportWidth = CAMERA_BASE_VIEWPORT_WIDTH / targetZoom;
      const currentHalfV = currentEffViewportWidth / 2;

      targetCamX = Math.max(currentHalfV, Math.min(ARENA_WIDTH - currentHalfV, targetCamX));
      const targetCamY = Math.min(55, midY * 0.32); // Responsive vertical jump tracking keeping both fighters framed

      // 5. Smooth Easing (Exponential Dampening / SF6 Inertial Lerp)
      const cam = cameraRef.current;
      cam.x += (targetCamX - cam.x) * CAMERA_LERP_FACTOR;
      cam.y += (targetCamY - cam.y) * (CAMERA_LERP_FACTOR * 0.7);
      cam.zoom += (targetZoom - cam.zoom) * (CAMERA_LERP_FACTOR * 0.5);
      cam.leadFighter = detectedLeadFighter;
      cam.leadBias += (targetLeadBias - cam.leadBias) * CAMERA_LERP_FACTOR;

      // Re-clamp cameraX with smoothed zoom
      const activeEffWidth = CAMERA_BASE_VIEWPORT_WIDTH / cam.zoom;
      const activeHalfV = activeEffWidth / 2;
      cam.x = Math.max(activeHalfV, Math.min(ARENA_WIDTH - activeHalfV, cam.x));

      // 6. SCREEN EDGE PROTECTION: Prevent characters from partially disappearing at screen edges
      // In Street Fighter 6, the screen edge functions as a barrier that stops fighters
      // from ever clipping out of the visible camera frame.
      const visibleScreenLeft = cam.x - activeHalfV;
      const visibleScreenRight = cam.x + activeHalfV;

      const minAllowedX = Math.max(CAMERA_SCREEN_EDGE_MARGIN, visibleScreenLeft + CAMERA_SCREEN_EDGE_MARGIN);
      const maxAllowedX = Math.min(ARENA_WIDTH - CAMERA_SCREEN_EDGE_MARGIN, visibleScreenRight - CAMERA_SCREEN_EDGE_MARGIN);

      // Enforce strict screen-edge and stage boundary clamping on both combatants
      p1.x = Math.max(minAllowedX, Math.min(maxAllowedX, p1.x));
      p2.x = Math.max(minAllowedX, Math.min(maxAllowedX, p2.x));

      // 7. BODY PUSHBOX COLLISION & ANTI-SAME-AXIS ENFORCEMENT
      // - Resolves body overlap with progressive Street Fighter 6 pushback.
      // - Breaks same-axis alignment immediately (never lingers on same axis).
      // - Enforces a strict HARD CEILING: fighters CANNOT overlap or be on the same axis for >1.0 second.
      const pushboxRes = resolvePushboxCollision(
        p1,
        p2,
        minAllowedX,
        maxAllowedX,
        overlapDurationRef.current,
        dt
      );
      overlapDurationRef.current = pushboxRes.overlapDurationSec;

      // Re-verify facing after pushbox displacement
      if (Math.abs(p1.x - p2.x) >= 2) {
        p1.facing = p1.x < p2.x ? 1 : -1;
        p2.facing = p2.x > p1.x ? -1 : 1;
      }

      // Combo Decay Processing
      if (p1ComboTimerRef.current > 0) {
        p1ComboTimerRef.current -= 1;
        setP1ComboProgress(p1ComboTimerRef.current / COMBO_WINDOW_FRAMES);
        if (p1ComboTimerRef.current <= 0) {
          p1.comboHits = 0;
          p1.comboDamage = 0;
          setP1ComboProgress(0);
          setFinisherState(prev => (prev?.isP1Attacker ? { ...prev, active: false } : prev));
        }
      }

      if (p2ComboTimerRef.current > 0) {
        p2ComboTimerRef.current -= 1;
        setP2ComboProgress(p2ComboTimerRef.current / COMBO_WINDOW_FRAMES);
        if (p2ComboTimerRef.current <= 0) {
          p2.comboHits = 0;
          p2.comboDamage = 0;
          setP2ComboProgress(0);
          setFinisherState(prev => (!prev?.isP1Attacker ? { ...prev, active: false } : prev));
        }
      }

      // Hitstun Strobe Flash Decay Processing
      if (p1HitstunFlashRef.current > 0) {
        p1HitstunFlashRef.current -= 1;
        if (p1HitstunFlashRef.current <= 0) {
          setP1HitstunActive(false);
        }
      }

      if (p2HitstunFlashRef.current > 0) {
        p2HitstunFlashRef.current -= 1;
        if (p2HitstunFlashRef.current <= 0) {
          setP2HitstunActive(false);
        }
      }

      // 3. Melee Collision Checks
      // P1 hitting P2
      const p1Hit = checkMeleeHit(p1, p2);
      if (p1Hit) {
        p2TookDamageRef.current = true; // Mark P2 as damaged
        // Fighting Game Combo Damage Proration (scales from 100% down to 35% minimum floor)
        // Multiplier bonus is rewarded when consecutive hit combo exceeds 5 hits, scaling to 40 hits
        const comboMultiplier = p1.comboHits >= 5 ? Number((1.15 + (Math.min(40, p1.comboHits) - 5) * 0.05).toFixed(2)) : 1.0;
        const comboProration = Math.max(0.35, Math.pow(0.88, Math.max(0, p1.comboHits)));
        const maxModeMult = p1.isMaxMode ? 1.15 : 1.0;
        // Durability calibrated to 40-hit match standard
        const durabilityFactor = 0.65;
        // Calibrated hit damage to 40
        const scaledDamage = p1Hit.blocked
          ? Math.max(4, Math.round(p1Hit.damage * 0.15))
          : Math.max(40, Math.round(p1Hit.damage * durabilityFactor * comboProration * maxModeMult * comboMultiplier));

        p2.hp = Math.max(0, p2.hp - scaledDamage);
        p2.state = p1Hit.blocked ? 'GUARD' : (p1.currentMove?.knockdown ? 'KNOCKDOWN' : 'HIT_HEAVY');
        p2.stateFrame = 0;
        p2.vx = p1.facing * (p1Hit.blocked ? 3 : 8);

        // Trigger Gamepad Haptic Rumble
        triggerGamepadRumble(p1Hit.isCrit ? 0.5 : 0.35, p1Hit.isCrit ? 0.9 : 0.65, 140);

        // Trigger character voice reaction
        if (p1.currentMove?.knockdown && !p1Hit.blocked) {
          soundFX.playKnockdownVoice(p2.character?.id || 'david');
        } else if (!p1Hit.blocked) {
          soundFX.playHitVoice(p2.character?.id || 'david', p1Hit.isCrit || p1.currentMove?.type === 'SUPER' || p1.currentMove?.type === 'CLIMAX');
        }

        // Trigger Hitstun Monochromatic Strobe on P2
        const p2FlashDuration = p1Hit.blocked
          ? 5
          : (p1Hit.isCrit || p1.currentMove?.type === 'SUPER' || p1.currentMove?.type === 'CLIMAX' ? 18 : 14);
        p2HitstunFlashRef.current = p2FlashDuration;
        setP2HitstunActive(true);
        triggerHitShockwave(p2.x, p2.y + 65, p1Hit.isCrit);

        // Meter gains
        p1.superMeter = Math.min(p1.maxMeter, p1.superMeter + (p1.currentMove?.meterGain || 15));
        p2.superMeter = Math.min(p2.maxMeter, p2.superMeter + 10);

        // Combo count & tracking
        const hitNumber = p1.comboHits + 1;
        p1.comboHits += 1;
        p1.comboDamage += scaledDamage;
        p1ComboTimerRef.current = COMBO_WINDOW_FRAMES;
        setP1ComboProgress(1);

        // Hit Spark FX
        setHitSparks(prev => [
          ...prev,
          {
            id: `spark_${Date.now()}_${Math.random()}`,
            x: p2.x,
            y: p2.y + 110,
            text: hitNumber > 5
              ? `${scaledDamage} (x${comboMultiplier.toFixed(2)} BONUS!)`
              : `${scaledDamage}${hitNumber > 1 ? ` (${hitNumber}H)` : ''}`,
            isCrit: p1Hit.isCrit || hitNumber > 5,
            color: hitNumber > 5 ? '#f59e0b' : p1.character?.accentColor || '#ef4444',
          },
        ]);

        // Trigger Punch Flash & Intense Starburst
        const impactX = (p1.x + p2.x) / 2;
        const impactY = p2.y + (p1.currentMove?.button === 'LK' ? 60 : p1.currentMove?.button === 'HP' ? 220 : 150);
        triggerPunchFlash(
          impactX,
          impactY,
          p1.character?.accentColor || '#ef4444',
          p1Hit.isCrit,
          p1.currentMove?.type === 'SUPER' || p1.currentMove?.type === 'CLIMAX',
          p1.currentMove?.type,
          scaledDamage
        );

        // Trigger Specialized Finisher when combo strictly exceeds 40 hits!
        if (hitNumber > 40) {
          triggerFinisherEffect(
            p1,
            p2,
            hitNumber,
            p1.comboDamage,
            impactX,
            impactY,
            true
          );
        } else if (hitNumber > 5) {
          triggerComboOverdriveSparkBurst(
            impactX,
            impactY,
            hitNumber,
            p1.character?.accentColor || '#ef4444'
          );
        }

        setScreenShake(true);
        setTimeout(() => setScreenShake(false), p1Hit.isCrit || p1.currentMove?.type === 'SUPER' ? 220 : 140);
      }

      // P2 hitting P1
      const p2Hit = checkMeleeHit(p2, p1);
      if (p2Hit) {
        p1TookDamageRef.current = true; // Mark P1 as damaged
        // Fighting Game Combo Damage Proration (scales from 100% down to 35% minimum floor)
        // Multiplier bonus is rewarded when consecutive hit combo exceeds 5 hits, scaling to 40 hits
        const comboMultiplier = p2.comboHits >= 5 ? Number((1.15 + (Math.min(40, p2.comboHits) - 5) * 0.05).toFixed(2)) : 1.0;
        const comboProration = Math.max(0.35, Math.pow(0.88, Math.max(0, p2.comboHits)));
        const maxModeMult = p2.isMaxMode ? 1.15 : 1.0;
        // Durability calibrated to 40-hit match standard
        const durabilityFactor = 0.65;
        // Calibrated hit damage to 40
        const scaledDamage = p2Hit.blocked
          ? Math.max(4, Math.round(p2Hit.damage * 0.15))
          : Math.max(40, Math.round(p2Hit.damage * durabilityFactor * comboProration * maxModeMult * comboMultiplier));

        p1.hp = Math.max(0, p1.hp - scaledDamage);
        p1.state = p2Hit.blocked ? 'GUARD' : (p2.currentMove?.knockdown ? 'KNOCKDOWN' : 'HIT_HEAVY');
        p1.stateFrame = 0;
        p1.vx = p2.facing * (p2Hit.blocked ? 3 : 8);

        // Trigger Gamepad Haptic Rumble on damage taken
        triggerGamepadRumble(p2Hit.isCrit ? 0.65 : 0.45, p2Hit.isCrit ? 1.0 : 0.8, 180);

        // Trigger character voice reaction
        if (p2.currentMove?.knockdown && !p2Hit.blocked) {
          soundFX.playKnockdownVoice(p1.character?.id || 'arjun');
        } else if (!p2Hit.blocked) {
          soundFX.playHitVoice(p1.character?.id || 'arjun', p2Hit.isCrit || p2.currentMove?.type === 'SUPER' || p2.currentMove?.type === 'CLIMAX');
        }

        // Trigger Hitstun Monochromatic Strobe on P1
        const p1FlashDuration = p2Hit.blocked
          ? 5
          : (p2Hit.isCrit || p2.currentMove?.type === 'SUPER' || p2.currentMove?.type === 'CLIMAX' ? 18 : 14);
        p1HitstunFlashRef.current = p1FlashDuration;
        setP1HitstunActive(true);
        triggerHitShockwave(p1.x, p1.y + 85, p2Hit.isCrit);

        p2.superMeter = Math.min(p2.maxMeter, p2.superMeter + (p2.currentMove?.meterGain || 15));
        p1.superMeter = Math.min(p1.maxMeter, p1.superMeter + 10);

        const hitNumber = p2.comboHits + 1;
        p2.comboHits += 1;
        p2.comboDamage += scaledDamage;
        p2ComboTimerRef.current = COMBO_WINDOW_FRAMES;
        setP2ComboProgress(1);

        setHitSparks(prev => [
          ...prev,
          {
            id: `spark_${Date.now()}_${Math.random()}`,
            x: p1.x,
            y: p1.y + 110,
            text: hitNumber > 5
              ? `${scaledDamage} (x${comboMultiplier.toFixed(2)} BONUS!)`
              : `${scaledDamage}${hitNumber > 1 ? ` (${hitNumber}H)` : ''}`,
            isCrit: p2Hit.isCrit || hitNumber > 5,
            color: hitNumber > 5 ? '#f59e0b' : p2.character?.accentColor || '#3b82f6',
          },
        ]);

        // Trigger Punch Flash & Intense Starburst
        const impactX = (p1.x + p2.x) / 2;
        const impactY = p1.y + (p2.currentMove?.button === 'LK' ? 60 : p2.currentMove?.button === 'HP' ? 220 : 150);
        triggerPunchFlash(
          impactX,
          impactY,
          p2.character?.accentColor || '#3b82f6',
          p2Hit.isCrit,
          p2.currentMove?.type === 'SUPER' || p2.currentMove?.type === 'CLIMAX',
          p2.currentMove?.type,
          scaledDamage
        );

        // Trigger Specialized Finisher when combo strictly exceeds 40 hits!
        if (hitNumber > 40) {
          triggerFinisherEffect(
            p2,
            p1,
            hitNumber,
            p2.comboDamage,
            impactX,
            impactY,
            false
          );
        } else if (hitNumber > 5) {
          triggerComboOverdriveSparkBurst(
            impactX,
            impactY,
            hitNumber,
            p2.character?.accentColor || '#3b82f6'
          );
        }

        setScreenShake(true);
        setTimeout(() => setScreenShake(false), p2Hit.isCrit || p2.currentMove?.type === 'SUPER' ? 220 : 140);
      }

      // 4. Update Projectiles
      setProjectiles(prevProj => {
        const nextProj: FightingProjectile[] = [];
        prevProj.forEach(proj => {
          proj.x += proj.vx;
          proj.lifeTime -= 1;

          const target = proj.isPlayer1 ? p2 : p1;
          const attacker = proj.isPlayer1 ? p1 : p2;
          const dist = Math.abs(proj.x - target.x);
          if (dist < 50 && proj.hitsLeft > 0 && !target.isInvincible) {
            if (proj.isPlayer1) {
              p2TookDamageRef.current = true;
            } else {
              p1TookDamageRef.current = true;
            }

            // Calibrated projectile durability scaling (40-hit standard, minimum 40 hit damage)
            const comboMultiplier = attacker.comboHits >= 5 ? Number((1.15 + (Math.min(40, attacker.comboHits) - 5) * 0.05).toFixed(2)) : 1.0;
            const projBase = Math.max(40, Math.round(proj.damage * 0.5));
            const comboProration = Math.max(0.35, Math.pow(0.88, Math.max(0, attacker.comboHits)));
            const maxModeMult = attacker.isMaxMode ? 1.15 : 1.0;
            const scaledDamage = Math.max(40, Math.round(projBase * comboProration * maxModeMult * comboMultiplier));

            target.hp = Math.max(0, target.hp - scaledDamage);
            target.state = 'HIT_LIGHT';
            target.stateFrame = 0;
            proj.hitsLeft -= 1;
            soundFX.playHitHeavy();
            soundFX.playHitVoice(target.character?.id || 'arjun', false);

            const hitNumber = attacker.comboHits + 1;
            attacker.comboHits += 1;
            attacker.comboDamage += scaledDamage;
            if (proj.isPlayer1) {
              p1ComboTimerRef.current = COMBO_WINDOW_FRAMES;
              setP1ComboProgress(1);
            } else {
              p2ComboTimerRef.current = COMBO_WINDOW_FRAMES;
              setP2ComboProgress(1);
            }

            // Trigger Hitstun Monochromatic Strobe & Punch Flash on projectile target
            if (proj.isPlayer1) {
              p2HitstunFlashRef.current = 14;
              setP2HitstunActive(true);
              triggerPunchFlash(p2.x, p2.y + 110, attacker.character?.accentColor || '#ef4444', false, false, 'PROJECTILE', scaledDamage);
            } else {
              p1HitstunFlashRef.current = 14;
              setP1HitstunActive(true);
              triggerPunchFlash(p1.x, p1.y + 110, attacker.character?.accentColor || '#3b82f6', false, false, 'PROJECTILE', scaledDamage);
            }

            // Trigger Specialized Finisher when combo strictly exceeds 40 hits!
            if (hitNumber > 40) {
              triggerFinisherEffect(
                attacker,
                target,
                hitNumber,
                attacker.comboDamage,
                target.x,
                target.y + 110,
                proj.isPlayer1
              );
            } else if (hitNumber > 5) {
              triggerComboOverdriveSparkBurst(
                target.x,
                target.y + 110,
                hitNumber,
                attacker.character?.accentColor || proj.color
              );
            }

            setHitSparks(s => [
              ...s,
              {
                id: `spark_${Date.now()}_${Math.random()}`,
                x: target.x,
                y: target.y + 90,
                text: hitNumber > 5
                  ? `${scaledDamage} (x${comboMultiplier.toFixed(2)} BONUS!)`
                  : `${scaledDamage}${hitNumber > 1 ? ` (${hitNumber}H)` : ''}`,
                color: hitNumber > 5 ? '#f59e0b' : proj.color,
              },
            ]);
          }

          if (proj.lifeTime > 0 && proj.x > 0 && proj.x < ARENA_WIDTH && proj.hitsLeft > 0) {
            nextProj.push(proj);
          }
        });
        return nextProj;
      });

      // 5. Round KO Check
      if (p1.hp <= 0 && p2.hp > 0 && !roundEndedRef.current) {
        finishRoundWithBonus('p2');
      } else if (p2.hp <= 0 && p1.hp > 0 && !roundEndedRef.current) {
        finishRoundWithBonus('p1');
      } else if (p1.hp <= 0 && p2.hp <= 0 && !roundEndedRef.current) {
        finishRoundWithBonus('draw');
      }

      // 6. Record Replay Frame Tick
      if (activeReplayRecorder.isCurrentlyRecording() && !isPaused && !roundEndedRef.current) {
        const p1Inputs: string[] = [];
        const keys = p1KeyBindingsRef.current;
        if (keysPressed.current.has(keys.moveLeft.toLowerCase())) p1Inputs.push('←');
        if (keysPressed.current.has(keys.moveRight.toLowerCase())) p1Inputs.push('→');
        if (keysPressed.current.has(keys.jump.toLowerCase())) p1Inputs.push('↑');
        if (keysPressed.current.has(keys.crouch.toLowerCase())) p1Inputs.push('↓');
        if (keysPressed.current.has(keys.lightPunch.toLowerCase())) p1Inputs.push('LP');
        if (keysPressed.current.has(keys.heavyPunch.toLowerCase())) p1Inputs.push('HP');
        if (keysPressed.current.has(keys.lightKick.toLowerCase())) p1Inputs.push('LK');
        if (keysPressed.current.has(keys.heavyKick.toLowerCase())) p1Inputs.push('HK');
        if (keysPressed.current.has(keys.superMove.toLowerCase())) p1Inputs.push('SUPER');

        const p2Inputs: string[] = [];
        if (keysPressed.current.has('arrowleft')) p2Inputs.push('←');
        if (keysPressed.current.has('arrowright')) p2Inputs.push('→');
        if (keysPressed.current.has('arrowup')) p2Inputs.push('↑');
        if (keysPressed.current.has('arrowdown')) p2Inputs.push('↓');
        if (keysPressed.current.has('4')) p2Inputs.push('LP');
        if (keysPressed.current.has('5')) p2Inputs.push('HP');
        if (keysPressed.current.has('1')) p2Inputs.push('LK');
        if (keysPressed.current.has('2')) p2Inputs.push('HK');

        activeReplayRecorder.recordTick(p1, p2, matchState.roundTimer, p1Inputs, p2Inputs);
      }

      // Sync updated state to React
      setP1Entity({ ...p1 });
      setP2Entity({ ...p2 });
      setCameraState({ ...cameraRef.current });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [cpuDifficulty, finishRoundWithBonus, isPaused, isTrainingMode]);

  const p1MeterStocks = Math.floor(p1Entity.superMeter / 100);
  const p2MeterStocks = Math.floor(p2Entity.superMeter / 100);

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-[1360px] mx-auto h-[580px] sm:h-[640px] md:h-[720px] lg:h-[760px] rounded-2xl overflow-hidden border-2 border-red-600/40 shadow-2xl bg-black select-none ${
        screenShake ? 'animate-intense-shake' : ''
      }`}
    >
      {/* 2.5D WebGL 3D Arena or Classic 2D Stage */}
      {renderMode === '2.5D' ? (
        <FofStage25DView
          ref={stage25DRef}
          p1Entity={p1Entity}
          p2Entity={p2Entity}
          projectiles={projectiles}
          hitSparks={hitSparks}
          hitShockwaves={hitShockwaves}
          punchFlash={punchFlash}
          superCutIn={superCutIn}
          finisherState={finisherState}
          postMatchState={postMatchState}
          screenShake={screenShake}
          stageId={matchState.stageId}
          stageBg={matchState.stageBg}
          stageBgUrl={currentStageVisual.imageUrl}
          cameraPreset={cameraPreset}
          p1HitstunActive={p1HitstunActive}
          p2HitstunActive={p2HitstunActive}
          debugMode={debugMode}
        />
      ) : (
        <div
          className={`absolute inset-0 transition-transform duration-500 ease-out ${
            postMatchState?.active ? 'scale-125' : finisherState?.active ? 'scale-125' : 'scale-100'
          }`}
          style={{
            transformOrigin: postMatchState?.active
              ? `${Math.max(20, Math.min(80, ((postMatchState.winner === 'p1' ? p1Entity.x : p2Entity.x) / ARENA_WIDTH) * 100))}% 60%`
              : finisherState
              ? `${Math.max(15, Math.min(85, (finisherState.impactX / ARENA_WIDTH) * 100))}% 55%`
              : '50% 50%',
          }}
        >
          {/* Dynamic Authentic Location Stage Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src={currentStageVisual.imageUrl}
              alt={currentStageVisual.altText}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-full h-full object-cover object-center transform scale-105 transition-all duration-700 filter brightness-90 contrast-110"
            />
            {/* Subtle atmospheric gradient overlay matching cultural stage lighting */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/60"
              style={{
                boxShadow: `inset 0 0 120px ${currentStageVisual.lightingAura}`,
              }}
            />

            {/* Spotlight Beams */}
            <div className="absolute -top-10 left-1/4 w-32 h-[500px] bg-gradient-to-b from-amber-400/20 via-amber-500/5 to-transparent rotate-12 blur-sm pointer-events-none" />
            <div className="absolute -top-10 right-1/4 w-32 h-[500px] bg-gradient-to-b from-blue-400/20 via-blue-500/5 to-transparent -rotate-12 blur-sm pointer-events-none" />

            {/* Drifting Sky Clouds Overlay */}
            <div className="absolute top-0 inset-x-0 h-32 pointer-events-none overflow-hidden opacity-30">
              <div className="flex w-[200%] h-full animate-clouds-move">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent blur-xl" />
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent blur-xl" />
              </div>
            </div>
          </div>

          {/* Animated Cheering Human Crowd in Background */}
          <FofCheeringCrowd2D
            isExcited={Boolean(finisherState?.active)}
            comboHits={Math.max(p1Entity.comboHits, p2Entity.comboHits)}
          />

          {/* Stage Floor Grid & Parallax Lighting */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-stone-950 via-stone-900/90 to-transparent border-t-2 border-amber-500/40 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
            {/* Floor stone tiles */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-black/60 flex justify-around">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-[1px] h-full bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modern Street Fighter 6 / King of Fighters XV Cinematic Top Combat HUD */}
      <FofCombatHUD
        roundTimer={matchState.roundTimer}
        currentRound={matchState.currentRound}
        p1RoundsWon={matchState.p1RoundsWon ?? 0}
        p2RoundsWon={matchState.p2RoundsWon ?? 0}
        isPaused={isPaused}
        onTogglePause={togglePause}
        onCaptureFreezeFrame={handleCaptureFreezeFrame}
        onOpenSettings={() => {
          setIsPaused(true);
          setIsSettingsModalOpen(true);
          soundFX.playPause();
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleSound}
        showCombatValues={showCombatValues}
        onToggleCombatValues={() => setShowCombatValues(prev => !prev)}
        debugMode={debugMode}
        combatValues={{
          frameAdvantage: p1Entity.isAttacking && !p2Entity.isAttacking ? 4 : (p2Entity.isAttacking && !p1Entity.isAttacking ? -4 : 0),
          distance: Math.round(Math.abs(p1Entity.x - p2Entity.x)),
          p1ActionState: p1Entity.action,
          p2ActionState: p2Entity.action,
          damageScaling: Math.max(0.4, 1.0 - (p1Entity.comboHits * 0.08)),
        }}
        p1Name={p1Entity.character?.name || p1Fighter?.name || 'Player 1'}
        p1Hp={p1Entity.hp}
        p1MaxHp={p1Entity.maxHp}
        p1SuperMeter={p1Entity.superMeter}
        p1MaxMeter={p1Entity.maxMeter}
        p1MeterStocks={p1MeterStocks}
        p1AvatarUrl={getFighterPortrait(p1Entity.character || p1Fighter)}
        p1ControllerBadge={(matchState.controlScenario || 'USER_VS_CPU') === 'CPU_VS_CPU' ? 'C' : 'D'}
        p1SubLabel={(matchState.controlScenario || 'USER_VS_CPU') === 'CPU_VS_CPU' ? 'CPU' : 'YOU'}
        p1AccentColor={p1Entity.character?.accentColor || p1Fighter?.accentColor || '#ec4899'}
        p2Name={p2Entity.character?.name || p2Fighter?.name || 'Player 2'}
        p2Hp={p2Entity.hp}
        p2MaxHp={p2Entity.maxHp}
        p2SuperMeter={p2Entity.superMeter}
        p2MaxMeter={p2Entity.maxMeter}
        p2MeterStocks={p2MeterStocks}
        p2AvatarUrl={getFighterPortrait(p2Entity.character || p2Fighter)}
        p2ControllerBadge={'C'}
        p2SubLabel={'CPU Level 8'}
        p2AccentColor={p2Entity.character?.accentColor || p2Fighter?.accentColor || '#06b6d4'}
        p1ComboHits={p1Entity.comboHits}
        p1ComboDamage={p1Entity.comboDamage}
        p2ComboHits={p2Entity.comboHits}
        p2ComboDamage={p2Entity.comboDamage}
        recentPunishCounter={p2HitstunActive && p1Entity.comboHits >= 2}
        recentCrossUp={Math.abs(p1Entity.x - p2Entity.x) < 45 && (p1Entity.y > 15 || p2Entity.y > 15)}
        recentFirstAttack={matchState.roundTimer >= 97 && (p1Entity.comboHits > 0 || p2Entity.comboHits > 0)}
      />

      {/* Dramatic Super Flash Cut-In Banner */}
      {superCutIn && (
        <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center animate-fade-in overflow-hidden">
          {/* Background Move Cut-In Image */}
          {superCutIn.cutInUrl && (
            <img
              src={superCutIn.cutInUrl}
              alt="Super Move"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="absolute inset-0 w-full h-full object-cover opacity-60 filter contrast-125 saturate-150 scale-105 animate-pulse"
            />
          )}

          {/* Dynamic Speedlines Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'repeating-linear-gradient(-35deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 10px)',
            }}
          />

          {/* Diagonal Cut-In Banner */}
          <div className="relative w-full py-6 sm:py-8 bg-gradient-to-r from-red-700/95 via-amber-500/95 to-red-700/95 transform -skew-y-3 flex items-center justify-center gap-6 shadow-2xl border-y-4 border-amber-300 backdrop-blur-md">
            {superCutIn.avatarUrl && (
              <img
                src={superCutIn.avatarUrl}
                alt={superCutIn.fighterName}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 border-amber-300 shadow-2xl object-cover transform skew-y-3 ring-4 ring-red-950/60"
              />
            )}
            <div className="flex flex-col items-start transform skew-y-3">
              <span className="text-xs sm:text-sm font-mono font-black uppercase text-black tracking-widest animate-pulse flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-amber-300 text-black" />
                ★ SUPER DESPERATION MOVE ★
              </span>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase text-white tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                {superCutIn.moveName}
              </h2>
              <span className="text-xs sm:text-sm font-black text-amber-950 uppercase font-mono tracking-widest bg-amber-300/80 px-2 py-0.5 rounded">
                {superCutIn.fighterName}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* UNIQUE VISUAL FLARE & SCREEN NOTIFICATION: 'PERFECT' ROUND BONUS */}
      {perfectFlare && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center animate-fade-in overflow-hidden">
          {/* Rotating Golden Starburst Rays */}
          <div className="absolute w-[600px] h-[600px] rounded-full bg-[conic-gradient(from_0deg,_#fbbf24_0deg,_transparent_30deg,_#f59e0b_60deg,_transparent_90deg,_#fbbf24_120deg,_transparent_150deg,_#f59e0b_180deg,_transparent_210deg,_#fbbf24_240deg,_transparent_270deg,_#f59e0b_300deg,_transparent_330deg,_#fbbf24_360deg)] opacity-30 animate-spin-slow blur-sm pointer-events-none" />

          {/* Golden Expanding Shockwave Aura */}
          <div className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-yellow-400/30 via-amber-500/20 to-transparent blur-2xl animate-pulse pointer-events-none" />

          {/* Floating Sparkling Stars */}
          <div className="absolute inset-0 flex items-center justify-around pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <Sparkles
                key={i}
                className="w-8 h-8 text-yellow-300 drop-shadow-[0_0_12px_#fde047] animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>

          {/* 3D Skewed Golden Marquee Header */}
          <div className="relative z-10 w-full py-6 bg-gradient-to-r from-yellow-600/90 via-amber-500/95 to-yellow-600/90 transform -skew-y-2 flex flex-col items-center shadow-[0_0_50px_rgba(234,179,8,0.7)] border-y-4 border-yellow-200">
            <div className="flex items-center gap-2 px-3 py-0.5 bg-black/70 rounded-full border border-yellow-300 text-yellow-300 text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest mb-1 shadow">
              <Award className="w-3.5 h-3.5 text-yellow-300" />
              ★ FLAWLESS ROUND COMPLETE ★
            </div>

            <h1 className="text-5xl sm:text-7xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-100 to-amber-300 drop-shadow-[0_4px_25px_rgba(245,158,11,1)] animate-pulse">
              ★ PERFECT ★
            </h1>

            <div className="flex flex-col items-center gap-1 mt-1 font-mono">
              <span className="text-sm sm:text-lg font-black uppercase tracking-wider text-black drop-shadow">
                NO DAMAGE TAKEN • {perfectFlare.fighterName.toUpperCase()} DOMINATION
              </span>

              {/* Bonus calculation pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <span className="px-3 py-1 bg-black text-yellow-300 text-xs sm:text-sm font-black italic rounded-lg border border-yellow-400 shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  +{perfectFlare.bonusScore.toLocaleString()} PERFECT BONUS PTS
                </span>
                <span className="px-3 py-1 bg-black text-amber-300 text-xs sm:text-sm font-black italic rounded-lg border border-amber-400 shadow-md flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  +100 SUPER METER (1 STOCK)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcer Banner (READY... FIGHT! / K.O.!) */}
      {announcerVisible && !perfectFlare && (
        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center animate-fade-in">
          <h1 className="text-4xl sm:text-6xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_10px_20px_rgba(239,68,68,0.8)] animate-bounce">
            {announcerText}
          </h1>
          {announcerSub && (
            <span className="text-2xl sm:text-3xl font-black italic text-yellow-400 tracking-wider font-mono">
              {announcerSub}
            </span>
          )}
        </div>
      )}

      {/* Dynamic Hit Sparks */}
      {hitSparks.map(spark => (
        <div
          key={spark.id}
          className="absolute pointer-events-none z-30 font-mono text-sm sm:text-lg font-black animate-damage-float"
          style={{
            left: `${worldToScreenPercent(spark.x)}%`,
            bottom: `${spark.y - cameraState.y}px`,
            color: spark.color,
          }}
        >
          {spark.isCrit ? `CRIT! -${spark.text}` : `-${spark.text}`}
        </div>
      ))}

      {/* 2D Fighter Sprites Container */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Special Move Ghost Motion Trails (Afterimages) */}
        {motionTrails.map(trail => (
          <div
            key={trail.id}
            className="absolute pointer-events-none z-15 animate-motion-trail"
            style={{
              left: `${worldToScreenPercent(trail.x)}%`,
              bottom: `${trail.y - cameraState.y + 16}px`,
              transform: `translateX(-50%) scaleX(${trail.facing}) scale(${cameraState.zoom})`,
              transformOrigin: '50% 100%',
              filter: `drop-shadow(0 0 16px ${trail.color}) hue-rotate(15deg)`,
            }}
          >
            <FofHumanFighterSprite entity={trail.entity} isPlayer1={trail.isPlayer1} isHitstunFlash={false} />
          </div>
        ))}

        {/* Special Move Expanding Aura & Ground Shockwave Flare */}
        {specialFlares.map(flare => (
          <div
            key={flare.id}
            className="absolute pointer-events-none z-20"
            style={{
              left: `${worldToScreenPercent(flare.x)}%`,
              bottom: `${flare.y - cameraState.y}px`,
              transform: `translateX(-50%) scale(${cameraState.zoom})`,
              transformOrigin: '50% 100%',
            }}
          >
            {/* Ground expanding shockwave ring */}
            <div
              className="absolute -bottom-2 -left-20 w-40 h-10 rounded-full border-2 animate-special-spark-ring"
              style={{
                borderColor: flare.color,
                boxShadow: `0 0 25px ${flare.color}`,
              }}
            />

            {/* Pillar Aura Flare */}
            <div
              className="absolute -bottom-4 -left-16 w-32 h-64 rounded-full animate-special-aura blur-[2px]"
              style={{
                background: `radial-gradient(ellipse at bottom, ${flare.color} 0%, rgba(255,255,255,0.7) 30%, transparent 75%)`,
              }}
            />
          </div>
        ))}

        {/* Special Move Floating Command Callout Tag */}
        {specialMoveBanner && (
          <div
            key={specialMoveBanner.id}
            className="absolute pointer-events-none z-45 animate-special-command-tag font-mono flex flex-col items-center"
            style={{
              left: `${specialMoveBanner.isPlayer1 ? '25%' : '75%'}`,
              top: '28%',
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="px-3 py-1 bg-black/90 border-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-sm"
              style={{
                borderColor: specialMoveBanner.color,
                boxShadow: `0 0 30px ${specialMoveBanner.color}`,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full animate-ping"
                style={{ backgroundColor: specialMoveBanner.color }}
              />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-gray-300">
                    {specialMoveBanner.fighterName}
                  </span>
                  <span
                    className="text-[9px] px-1 py-0.2 rounded font-bold uppercase"
                    style={{ backgroundColor: `${specialMoveBanner.color}33`, color: specialMoveBanner.color }}
                  >
                    {specialMoveBanner.element}
                  </span>
                </div>
                <span className="text-sm font-black italic uppercase text-white tracking-wide">
                  {specialMoveBanner.moveName}
                </span>
                <span
                  className="text-[10px] font-bold font-mono tracking-widest"
                  style={{ color: specialMoveBanner.color }}
                >
                  {specialMoveBanner.command}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Monochromatic Hit Shockwaves */}
        {hitShockwaves.map(sw => (
          <div
            key={sw.id}
            className="absolute pointer-events-none z-25 w-28 h-28 -ml-14 -mb-14 rounded-full border-2 border-white animate-hitstun-ring"
            style={{
              left: `${worldToScreenPercent(sw.x)}%`,
              bottom: `${sw.y - cameraState.y}px`,
              transform: `scale(${cameraState.zoom})`,
              background: sw.isCrit
                ? 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 60%)',
            }}
          />
        ))}

        {/* 2D Fighter Sprites Container (Rendered in 2D Mode; in 2.5D Mode, Three.js 3D Cel Rigs are active) */}
        {renderMode === '2D' && (
          <>
            {/* Player 1 Fighter Avatar (Human Form) */}
            <div
              className={`absolute ${
                p1HitstunActive ? 'animate-hitstun-vibrate' : ''
              }`}
              style={{
                left: `${worldToScreenPercent(p1Entity.x)}%`,
                bottom: `${p1Entity.y - cameraState.y + 16}px`,
                transform: `translateX(-50%) scaleX(${p1Entity.facing}) scale(${cameraState.zoom})`,
                transformOrigin: '50% 100%',
              }}
            >
              <div className="relative flex flex-col items-center">
                {/* Status indicator */}
                {p1Entity.state === 'GUARD' && (
                  <span className="absolute -top-4 text-[10px] font-mono font-bold text-blue-400 bg-black/80 px-1 border border-blue-500 z-20">
                    GUARD
                  </span>
                )}

                {/* Hitstun Monochromatic Flare Aura */}
                {p1HitstunActive && (
                  <div className="absolute inset-0 -m-4 rounded-full bg-white/30 blur-md pointer-events-none animate-pulse" />
                )}

                {/* Humanoid Fighter Sprite Rig (Supports Picture Artwork & Articulated Vector Rig) */}
                <FofHumanFighterSprite
                  entity={p1Entity}
                  isPlayer1={true}
                  isHitstunFlash={p1HitstunActive}
                  renderModeStyle={spriteStyle}
                />
              </div>
            </div>

            {/* Player 2 / CPU Fighter Avatar (Human Form) */}
            <div
              className={`absolute ${
                p2HitstunActive ? 'animate-hitstun-vibrate' : ''
              }`}
              style={{
                left: `${worldToScreenPercent(p2Entity.x)}%`,
                bottom: `${p2Entity.y - cameraState.y + 16}px`,
                transform: `translateX(-50%) scaleX(${p2Entity.facing}) scale(${cameraState.zoom})`,
                transformOrigin: '50% 100%',
              }}
            >
              <div className="relative flex flex-col items-center">
                {p2Entity.state === 'GUARD' && (
                  <span className="absolute -top-4 text-[10px] font-mono font-bold text-blue-400 bg-black/80 px-1 border border-blue-500 z-20">
                    GUARD
                  </span>
                )}

                {/* Hitstun Monochromatic Flare Aura */}
                {p2HitstunActive && (
                  <div className="absolute inset-0 -m-4 rounded-full bg-white/30 blur-md pointer-events-none animate-pulse" />
                )}

                {/* Humanoid Fighter Sprite Rig (Supports Picture Artwork & Articulated Vector Rig) */}
                <FofHumanFighterSprite
                  entity={p2Entity}
                  isPlayer1={false}
                  isHitstunFlash={p2HitstunActive}
                  renderModeStyle={spriteStyle}
                />
              </div>
            </div>

            {/* Active Projectiles 2D Rendering */}
            {projectiles.map(proj => (
              <div
                key={proj.id}
                className="absolute rounded-full animate-spin shadow-lg"
                style={{
                  left: `${worldToScreenPercent(proj.x)}%`,
                  bottom: `${proj.y - cameraState.y}px`,
                  width: `${proj.radius * 2}px`,
                  height: `${proj.radius * 2}px`,
                  backgroundColor: proj.color,
                  boxShadow: `0 0 20px ${proj.color}`,
                  transform: `translate(-50%, 50%) scale(${cameraState.zoom})`,
                }}
              />
            ))}
          </>
        )}

        {/* Frame-Perfect Hitbox & Hurtbox Collision Debug Overlay rendered directly over fighters (Developer Mode: ~ / F12) */}
        {debugMode && (
          <FofHitboxOverlay
            p1Entity={p1Entity}
            p2Entity={p2Entity}
            projectiles={projectiles}
            isTrainingMode={isTrainingMode}
            worldToScreenPercent={worldToScreenPercent}
            cameraZoom={cameraState.zoom}
            debugMode={debugMode}
            showDebugDetails={debugMode}
          />
        )}

        {/* High-Intensity Monochromatic Punch Flash Screen Overlay */}
        {punchFlash && (
          <div
            key={`flash_screen_${punchFlash.id}`}
            className="absolute inset-0 z-35 pointer-events-none animate-punch-flash mix-blend-screen"
            style={{
              background: punchFlash.isSuper
                ? `radial-gradient(circle at ${worldToScreenPercent(punchFlash.x)}% ${100 - ((punchFlash.y - cameraState.y) / 620) * 100}%, rgba(255,255,255,0.98) 0%, ${punchFlash.color} 35%, rgba(0,0,0,0.6) 80%)`
                : punchFlash.isCrit
                ? `radial-gradient(circle at ${worldToScreenPercent(punchFlash.x)}% ${100 - ((punchFlash.y - cameraState.y) / 620) * 100}%, rgba(255,255,255,0.95) 0%, ${punchFlash.color} 30%, transparent 65%)`
                : `radial-gradient(circle at ${worldToScreenPercent(punchFlash.x)}% ${100 - ((punchFlash.y - cameraState.y) / 620) * 100}%, rgba(255,255,255,0.9) 0%, rgba(251,191,36,0.6) 20%, transparent 60%)`,
            }}
          />
        )}

        {/* High-Intensity Punch Flash Point, Starburst, and Blade Streaks */}
        {punchFlash && (
          <div
            key={`flash_burst_${punchFlash.id}`}
            className="absolute z-40 pointer-events-none"
            style={{
              left: `${worldToScreenPercent(punchFlash.x)}%`,
              bottom: `${punchFlash.y - cameraState.y}px`,
              transform: `translate(-50%, 50%) scale(${cameraState.zoom})`,
            }}
          >
            {/* Concentric Energy Starburst */}
            <div className="absolute -inset-16 w-32 h-32 rounded-full animate-punch-starburst flex items-center justify-center pointer-events-none">
              <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,_#ffffff_0deg,_transparent_30deg,_#fef08a_60deg,_transparent_90deg,_#ffffff_120deg,_transparent_150deg,_#f59e0b_180deg,_transparent_210deg,_#ffffff_240deg,_transparent_270deg,_#fef08a_300deg,_transparent_330deg,_#ffffff_360deg)]" />
            </div>

            {/* Dynamic Slash Blade (Directional Light streak) */}
            <div className="absolute -left-24 -top-1 w-48 h-3.5 bg-gradient-to-r from-transparent via-white to-transparent blur-[1px] animate-punch-slash pointer-events-none shadow-[0_0_25px_#ffffff]" />
            <div className="absolute -left-24 -top-1 w-48 h-3.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent blur-[2px] animate-punch-slash pointer-events-none rotate-45" />
            <div className="absolute -left-24 -top-1 w-48 h-3.5 bg-gradient-to-r from-transparent via-yellow-200 to-transparent blur-[1px] animate-punch-slash pointer-events-none -rotate-45" />

            {/* Blinding Core Flash Point */}
            <div className="w-16 h-16 rounded-full bg-white blur-[2px] shadow-[0_0_40px_#ffffff] animate-ping opacity-95" />
          </div>
        )}

        {/* Screen-Wide Combo Spark Overlay (Activates when combo > 5 hits, scales to 25 hits) */}
        {screenSparkOverlay && (
          <div
            key={screenSparkOverlay.id}
            className="absolute inset-0 z-45 pointer-events-none animate-screen-spark-flash flex items-center justify-center overflow-hidden"
            style={{
              opacity: screenSparkOverlay.intensity,
            }}
          >
            {/* Screen Perimeter Electric Surge Frame */}
            <div
              className="absolute inset-0 border-4 pointer-events-none"
              style={{
                borderColor: screenSparkOverlay.color,
                boxShadow: `inset 0 0 45px ${screenSparkOverlay.color}, 0 0 30px ${screenSparkOverlay.color}`,
              }}
            />

            {/* Rotating Starburst Shockwave Rays */}
            <div
              className="absolute w-[800px] h-[800px] rounded-full animate-spark-starburst pointer-events-none blur-[1px]"
              style={{
                background: `conic-gradient(from 0deg, ${screenSparkOverlay.color} 0deg, transparent 20deg, #ffffff 40deg, transparent 60deg, ${screenSparkOverlay.color} 90deg, transparent 110deg, #ffffff 135deg, transparent 160deg, ${screenSparkOverlay.color} 180deg, transparent 200deg, #ffffff 225deg, transparent 250deg, ${screenSparkOverlay.color} 270deg, transparent 290deg, #ffffff 315deg, transparent 340deg, ${screenSparkOverlay.color} 360deg)`,
                opacity: 0.45,
              }}
            />

            {/* Radial Impact Shockwave Ring */}
            <div
              className="absolute rounded-full animate-ping pointer-events-none"
              style={{
                left: `${worldToScreenPercent(screenSparkOverlay.x)}%`,
                bottom: `${screenSparkOverlay.y - cameraState.y}px`,
                width: '120px',
                height: '120px',
                transform: `translate(-50%, 50%) scale(${cameraState.zoom})`,
                border: `3px solid ${screenSparkOverlay.color}`,
                boxShadow: `0 0 25px ${screenSparkOverlay.color}`,
              }}
            />
          </div>
        )}

        {/* Dynamic Combo Spark Particles Overlay */}
        {comboSparkParticles.map(part => (
          <div
            key={part.id}
            className="absolute z-45 pointer-events-none animate-combo-spark flex items-center justify-center"
            style={{
              left: `${worldToScreenPercent(part.x)}%`,
              bottom: `${part.y - cameraState.y}px`,
              width: `${part.size * 2}px`,
              height: `${part.size * 2}px`,
              ['--tw-translate-x' as any]: `${part.tx}px`,
              ['--tw-translate-y' as any]: `${part.ty}px`,
              ['--tw-rotate' as any]: `${part.rot}deg`,
              filter: `drop-shadow(0 0 8px ${part.color})`,
            }}
          >
            {part.shape === 'star' ? (
              <span className="text-xs font-black leading-none" style={{ color: part.color }}>
                ★
              </span>
            ) : part.shape === 'spark' ? (
              <div
                className="w-full h-full rounded-sm"
                style={{
                  backgroundColor: part.color,
                  transform: 'rotate(45deg)',
                }}
              />
            ) : (
              <div
                className="w-full h-full rounded-full"
                style={{
                  backgroundColor: part.color,
                  boxShadow: `0 0 6px ${part.color}`,
                }}
              />
            )}
          </div>
        ))}

        {/* Real-time Floating Combat Arena Combo Counter (Street Fighter style on-screen visual) */}
        <FofCombatComboDisplay
          p1Hits={p1Entity.comboHits}
          p1Damage={p1Entity.comboDamage}
          p1Progress={p1ComboProgress}
          p1Name={p1Fighter?.name || 'Player 1'}
          p1Color={p1Fighter?.accentColor || '#ef4444'}
          p2Hits={p2Entity.comboHits}
          p2Damage={p2Entity.comboDamage}
          p2Progress={p2ComboProgress}
          p2Name={p2Fighter?.name || 'Player 2'}
          p2Color={p2Fighter?.accentColor || '#3b82f6'}
        />

        {/* Specialized 40+ Hit Combo Finisher Cinematic Overlay */}
        <FofFinisherOverlay
          finisherState={finisherState}
          arenaWidth={ARENA_WIDTH}
        />

        {/* Dynamic Post-Match Victory Pose & Win Screen Overlay */}
        <FofPostMatchVictoryOverlay
          postMatchState={postMatchState}
          onProceedToScoreScreen={handleProceedToScoreScreen}
          onWatchReplay={() => {
            const lastReplay = getLastMatchReplay();
            if (lastReplay) {
              setSelectedReplayForPlayback(lastReplay);
            }
            setIsReplayTheaterOpen(true);
          }}
        />
      </div>

      {/* Centralized Tactical Settings & Match Pause Modal */}
      <FofSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setIsPaused(false);
          soundFX.playUnpause();
        }}
        isPaused={isPaused}
        onTogglePause={togglePause}
        onRestartRound={handleRestartRound}
        onRestartMatch={handleFullMatchRestart}
        onTestCombo={handleTest40HitCombo}
        onNavigateToIntro={onNavigateToIntro}
        controlScenario={matchState.controlScenario || 'USER_VS_CPU'}
        onChangeControlScenario={(scenario) => {
          soundFX.playClick();
          onMatchStateUpdate(prev => ({
            ...prev,
            controlScenario: scenario,
          }));
        }}
        isVoiceEnabled={isVoiceEnabled}
        onToggleVoice={handleToggleVoice}
        renderMode={renderMode}
        onToggleRenderMode={toggleRenderMode}
        cameraPreset={cameraPreset}
        onCycleCameraPreset={cycleCameraPreset}
        cameraPanningPreset={cameraPanningPreset}
        onCycleCameraPanningPreset={cycleCameraPanningPreset}
        spriteStyle={spriteStyle}
        onToggleSpriteStyle={toggleSpriteStyle}
        isDebugMode={debugMode}
        onToggleDebugMode={toggleDebugMode}
        onOpenControlsModal={() => {
          soundFX.playClick();
          setIsControlModalOpen(true);
        }}
        onOpenReplaysModal={() => {
          soundFX.playClick();
          setSelectedReplayForPlayback(null);
          setIsReplayTheaterOpen(true);
        }}
        onOpenGamepadModal={() => {
          soundFX.playClick();
          setIsGamepadModalOpen(true);
        }}
        onOpenLocationModal={() => {
          soundFX.playClick();
          setShowLocationModal(true);
        }}
        onOpenFreezeFrame={handleCaptureFreezeFrame}
        connectedGamepadName={connectedGamepadName}
      />

      {/* Street Fighter 6 High-Definition Freeze Frame & Combat Telemetry Modal */}
      <FofFreezeFrameModal
        isOpen={isFreezeFrameOpen}
        onClose={() => {
          setIsFreezeFrameOpen(false);
          setIsPaused(false);
          soundFX.playUnpause();
        }}
        onResume={() => {
          setIsFreezeFrameOpen(false);
          setIsPaused(false);
          soundFX.playUnpause();
        }}
        onStepFrame={() => {
          // Advance single simulation frame for frame-by-frame analysis
          handleSingleFrameStep();
        }}
        p1Entity={p1Entity}
        p2Entity={p2Entity}
        stageName={currentStageVisual.keyVisualMotif || currentStageVisual.stageId}
        isDebugMode={debugMode}
        onToggleDebugMode={toggleDebugMode}
        onTakeScreenshot={() => {
          const canvas = containerRef.current?.querySelector('canvas') || document.querySelector('canvas');
          if (canvas) {
            try {
              const dataUrl = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = `fight_capture_${Date.now()}.png`;
              link.href = dataUrl;
              link.click();
            } catch {
              // fallback
            }
          }
        }}
      />

      {/* Gamepad Calibration, Mapping & Diagnostics Modal */}
      <FofGamepadModal
        isOpen={isGamepadModalOpen}
        onClose={() => setIsGamepadModalOpen(false)}
      />

      {/* Keyboard Control Mapping & Key Rebinding Modal */}
      <FofControlMappingModal
        isOpen={isControlModalOpen}
        onClose={() => setIsControlModalOpen(false)}
      />

      {/* Match Replay Theater & Playback Modal */}
      <FofReplayTheaterModal
        isOpen={isReplayTheaterOpen}
        onClose={() => {
          setIsReplayTheaterOpen(false);
          setSelectedReplayForPlayback(null);
        }}
        initialReplay={selectedReplayForPlayback}
      />

      {/* Stage Location & Custom Background Modal */}
      <FofLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentStageId={matchState.stageId}
        customBgUrl={customBgUrl}
        onSelectLocation={handleSelectLocation}
      />

      {/* Gamepad Connection Notification Toast */}
      {gamepadNotice && (
        <div
          id="fof-gamepad-toast"
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/95 border-2 border-red-500 text-white px-4 py-2 rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center gap-2.5 font-mono text-xs animate-bounce pointer-events-none"
        >
          <Gamepad2 className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="font-bold tracking-wider">{gamepadNotice}</span>
        </div>
      )}
    </div>
  );
};
