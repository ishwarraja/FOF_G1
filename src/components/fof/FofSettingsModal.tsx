import React, { useEffect } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Mic,
  MicOff,
  Keyboard,
  Film,
  Gamepad2,
  Bug,
  Box,
  Camera,
  Video,
  Image as ImageIcon,
  Bot,
  User,
  Users,
  Sliders,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { ControlScenario } from '../../types/fighting';

interface FofSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onRestartRound: () => void;
  onRestartMatch?: () => void;
  onTestCombo?: () => void;
  onNavigateToIntro?: () => void;
  controlScenario: ControlScenario;
  onChangeControlScenario: (scenario: ControlScenario) => void;
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  renderMode: '2.5D' | '2D';
  onToggleRenderMode: () => void;
  cameraPreset: 'DYNAMIC' | 'CINEMATIC' | 'TOURNAMENT';
  onCycleCameraPreset: () => void;
  cameraPanningPreset: 'SF6_DYNAMIC' | 'LEAD_FOCUS' | 'CLASSIC_CENTER';
  onCycleCameraPanningPreset: () => void;
  spriteStyle: 'artwork' | 'vector';
  onToggleSpriteStyle: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  onOpenControlsModal: () => void;
  onOpenReplaysModal: () => void;
  onOpenGamepadModal: () => void;
  onOpenLocationModal: () => void;
  onOpenFreezeFrame?: () => void;
  connectedGamepadName?: string | null;
}

export const FofSettingsModal: React.FC<FofSettingsModalProps> = ({
  isOpen,
  onClose,
  isPaused,
  onTogglePause,
  onRestartRound,
  onRestartMatch,
  onTestCombo,
  onNavigateToIntro,
  controlScenario,
  onChangeControlScenario,
  isVoiceEnabled,
  onToggleVoice,
  renderMode,
  onToggleRenderMode,
  cameraPreset,
  onCycleCameraPreset,
  cameraPanningPreset,
  onCycleCameraPanningPreset,
  spriteStyle,
  onToggleSpriteStyle,
  isDebugMode,
  onToggleDebugMode,
  onOpenControlsModal,
  onOpenReplaysModal,
  onOpenGamepadModal,
  onOpenLocationModal,
  onOpenFreezeFrame,
  connectedGamepadName,
}) => {
  // ESC listener is handled globally, but keep a safety hook here
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="fof-pause-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-gradient-to-r from-stone-900 via-zinc-950 to-stone-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-950 border border-red-500/50 text-red-400">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-wider text-white">
                BATTLE PAUSE // SETTINGS
              </h2>
              <p className="text-xs text-stone-400 font-mono">
                Operational controls, audio, graphics & camera options
              </p>
            </div>
          </div>

          <button
            id="btn-close-settings-modal"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 transition-all cursor-pointer"
            title="Resume Fight (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
          {/* Quick Match Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              id="btn-modal-resume-fight"
              onClick={() => {
                if (isPaused) onTogglePause();
                onClose();
              }}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>RESUME</span>
            </button>

            {onOpenFreezeFrame && (
              <button
                id="btn-modal-open-freeze-frame"
                onClick={() => {
                  onClose();
                  onOpenFreezeFrame();
                }}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white font-black text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all cursor-pointer active:scale-98"
              >
                <Camera className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>FREEZE FRAME</span>
              </button>
            )}

            <button
              id="btn-modal-restart-round"
              onClick={() => {
                onRestartRound();
                onClose();
              }}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-400 text-stone-200 hover:text-white font-black text-xs uppercase tracking-wider shadow transition-all cursor-pointer active:scale-98"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>RESTART</span>
            </button>

            {onRestartMatch && (
              <button
                id="btn-modal-restart-match"
                onClick={() => {
                  onRestartMatch();
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-red-950/70 hover:bg-red-900/90 border border-red-700/80 hover:border-red-500 text-red-200 hover:text-white font-black text-xs uppercase tracking-wider shadow transition-all cursor-pointer active:scale-98"
              >
                <RotateCcw className="w-4 h-4 text-red-400" />
                <span>RESET ALL</span>
              </button>
            )}

            {onNavigateToIntro && (
              <button
                id="btn-modal-roster-intro"
                onClick={() => {
                  onClose();
                  onNavigateToIntro();
                }}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow transition-all cursor-pointer active:scale-98"
              >
                <Users className="w-4 h-4 text-white" />
                <span>ROSTER</span>
              </button>
            )}
          </div>

          {onTestCombo && (
            <button
              id="btn-modal-test-combo"
              onClick={onTestCombo}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-950/80 via-orange-950/80 to-amber-950/80 hover:from-amber-900 hover:to-orange-900 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
            >
              <span className="text-amber-400 font-bold">★</span>
              <span>TEST 43-HIT APEX COMBO (TRIGGERS FINISHER & HIT COUNTER)</span>
            </button>
          )}

          {/* Section 1: Combat Control Scenario */}
          <div className="space-y-2 p-4 rounded-xl bg-stone-900/50 border border-stone-800">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              CONTROL SCENARIO
            </span>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => onChangeControlScenario('USER_VS_CPU')}
                className={`py-2 px-3 rounded-lg border font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  controlScenario === 'USER_VS_CPU'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>USER VS CPU</span>
              </button>

              <button
                onClick={() => onChangeControlScenario('CPU_VS_CPU')}
                className={`py-2 px-3 rounded-lg border font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  controlScenario === 'CPU_VS_CPU'
                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI VS AI (DEMO)</span>
              </button>

              <button
                onClick={() => onChangeControlScenario('USER_VS_USER')}
                className={`py-2 px-3 rounded-lg border font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  controlScenario === 'USER_VS_USER'
                    ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-900/40'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>USER VS USER (2P)</span>
              </button>
            </div>
          </div>

          {/* Section 2: Engine & Camera Settings */}
          <div className="space-y-3 p-4 rounded-xl bg-stone-900/50 border border-stone-800">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              RENDER ENGINE & CAMERA
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 2.5D vs 2D Render Mode */}
              <button
                onClick={onToggleRenderMode}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  renderMode === '2.5D'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-stone-500 uppercase">ENGINE</span>
                  <Box className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="font-bold text-xs mt-1">
                  {renderMode === '2.5D' ? '2.5D ARENA' : '2D RETRO'}
                </span>
              </button>

              {/* Camera Preset */}
              <button
                onClick={onCycleCameraPreset}
                className="p-2.5 rounded-lg border border-stone-800 bg-stone-950 text-stone-300 hover:text-white hover:border-cyan-500/60 text-left flex flex-col justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-stone-500 uppercase">3D PRESET</span>
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="font-bold text-xs mt-1">{cameraPreset}</span>
              </button>

              {/* SF6 Camera Panning */}
              <button
                onClick={onCycleCameraPanningPreset}
                className="p-2.5 rounded-lg border border-stone-800 bg-stone-950 text-stone-300 hover:text-white hover:border-indigo-500/60 text-left flex flex-col justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-stone-500 uppercase">PANNING</span>
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="font-bold text-xs mt-1">
                  {cameraPanningPreset === 'SF6_DYNAMIC' ? 'SF6 CAM' : cameraPanningPreset === 'LEAD_FOCUS' ? 'LEAD CAM' : 'CENTER'}
                </span>
              </button>

              {/* Sprite Style */}
              <button
                onClick={onToggleSpriteStyle}
                className="p-2.5 rounded-lg border border-stone-800 bg-stone-950 text-stone-300 hover:text-white hover:border-emerald-500/60 text-left flex flex-col justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-stone-500 uppercase">SPRITE STYLE</span>
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="font-bold text-xs mt-1">
                  {spriteStyle === 'artwork' ? 'PICTURE' : 'VECTOR RIG'}
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Modals, Hardware & Audio */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Voice Audio Toggle */}
            <button
              onClick={onToggleVoice}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                isVoiceEnabled
                  ? 'bg-amber-950/60 border-amber-500/80 text-amber-200 shadow'
                  : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              {isVoiceEnabled ? <Mic className="w-4 h-4 text-amber-400" /> : <MicOff className="w-4 h-4 text-stone-500" />}
              <span className="font-bold text-[11px] uppercase">
                {isVoiceEnabled ? 'VOICE ON' : 'VOICE MUTED'}
              </span>
            </button>

            {/* Controls Rebinding Modal */}
            <button
              onClick={() => {
                onClose();
                onOpenControlsModal();
              }}
              className="p-3 rounded-xl border border-stone-800 bg-stone-900/60 hover:bg-stone-800 hover:border-amber-500/60 text-stone-300 hover:text-white flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer"
            >
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-[11px] uppercase">KEY BINDINGS</span>
            </button>

            {/* Gamepad Setup Modal */}
            <button
              onClick={() => {
                onClose();
                onOpenGamepadModal();
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                connectedGamepadName
                  ? 'bg-red-950/60 border-red-500/80 text-red-200'
                  : 'border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-red-400" />
              <span className="font-bold text-[11px] uppercase">
                {connectedGamepadName ? 'PAD CONNECTED' : 'GAMEPAD SETUP'}
              </span>
            </button>

            {/* Replay Theater Modal */}
            <button
              onClick={() => {
                onClose();
                onOpenReplaysModal();
              }}
              className="p-3 rounded-xl border border-stone-800 bg-stone-900/60 hover:bg-stone-800 hover:border-red-500/60 text-stone-300 hover:text-white flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer"
            >
              <Film className="w-4 h-4 text-red-400" />
              <span className="font-bold text-[11px] uppercase">MATCH REPLAYS</span>
            </button>
          </div>

          {/* Location & Stage Background Selection */}
          <button
            onClick={() => {
              onClose();
              onOpenLocationModal();
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-800 bg-stone-900/60 hover:bg-stone-800 hover:border-amber-500/60 text-stone-300 hover:text-white flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span className="font-bold uppercase text-xs">STAGE LOCATION & BACKGROUND ART</span>
            </div>
            <span className="text-[10px] text-stone-400">SELECT / UPLOAD &rarr;</span>
          </button>

          {/* Developer / Frame Data Diagnostic Section */}
          <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-500">
              <ShieldAlert className="w-4 h-4" />
              <div>
                <span className="font-bold uppercase text-[10px] block text-stone-400">
                  DEVELOPER / DOJO HITBOX OVERLAY
                </span>
                <span className="text-[9px] text-stone-500">
                  Collision boxes & frame advantage telemetry
                </span>
              </div>
            </div>

            <button
              id="btn-modal-toggle-debug-hitbox"
              onClick={onToggleDebugMode}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                isDebugMode
                  ? 'bg-purple-950 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>{isDebugMode ? 'HITBOXES: ON' : 'HITBOXES: OFF'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-[11px] text-stone-400 font-mono">
          <span>Shortcuts: [ESC] Resume/Pause • [R] Restart Round</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-bold uppercase transition-all cursor-pointer"
          >
            BACK TO COMBAT
          </button>
        </div>
      </div>
    </div>
  );
};
