import React, { useState, useEffect, useRef } from 'react';
import {
  GamepadSnapshot,
  pollPrimaryGamepad,
  triggerGamepadRumble,
  setGamepadLayoutPreset,
  getGamepadLayoutPreset,
  ControllerLayoutPreset,
  getFriendlyGamepadName,
} from '../../utils/gamepad';
import {
  Gamepad2,
  X,
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Vibrate,
  HelpCircle,
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

interface FofGamepadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FofGamepadModal: React.FC<FofGamepadModalProps> = ({ isOpen, onClose }) => {
  const [activePad, setActivePad] = useState<GamepadSnapshot | null>(null);
  const [connectedPads, setConnectedPads] = useState<{ id: string; index: number; name: string }[]>([]);
  const [layoutPreset, setLayoutPreset] = useState<ControllerLayoutPreset>(getGamepadLayoutPreset);
  const [rumbleTriggered, setRumbleTriggered] = useState<boolean>(false);
  const animRef = useRef<number | null>(null);

  // Poll gamepad state at 60fps when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const checkGamepads = () => {
      const snap = pollPrimaryGamepad();
      setActivePad(snap);

      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const raw = navigator.getGamepads();
        const list: { id: string; index: number; name: string }[] = [];
        for (let i = 0; i < raw.length; i++) {
          const p = raw[i];
          if (p && p.connected) {
            list.push({
              id: p.id,
              index: p.index,
              name: getFriendlyGamepadName(p.id),
            });
          }
        }
        setConnectedPads(list);
      }

      animRef.current = requestAnimationFrame(checkGamepads);
    };

    animRef.current = requestAnimationFrame(checkGamepads);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: ControllerLayoutPreset) => {
    soundFX.playClick();
    setGamepadLayoutPreset(preset);
    setLayoutPreset(preset);
  };

  const handleTestRumble = (weak = 0.5, strong = 0.9, duration = 250) => {
    soundFX.playHitHeavy();
    triggerGamepadRumble(weak, strong, duration);
    setRumbleTriggered(true);
    setTimeout(() => setRumbleTriggered(false), 300);
  };

  // Helper for button press detection in visual pad
  const isBtnPressed = (btnIdx: number) => {
    return activePad?.buttons[btnIdx]?.pressed ?? false;
  };

  const getAxisOffset = (axisXIdx: number, axisYIdx: number) => {
    if (!activePad) return { x: 0, y: 0 };
    const x = (activePad.axes[axisXIdx] || 0) * 12;
    const y = (activePad.axes[axisYIdx] || 0) * 12;
    return { x, y };
  };

  const leftStickOffset = getAxisOffset(0, 1);
  const rightStickOffset = getAxisOffset(2, 3);

  return (
    <div
      id="fof-gamepad-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in font-mono select-none"
    >
      <div className="w-full max-w-2xl bg-stone-950 border-2 border-red-600/80 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(220,38,38,0.4)] space-y-5 text-gray-200 relative my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600/20 border border-red-500 rounded-xl text-red-400 shadow">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                GAMEPAD & CONTROLLER HUB
                {activePad && (
                  <span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-bold">
                    CONNECTED
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                Plug in any standard USB or Bluetooth gamepad (Xbox, PlayStation, Switch Pro, FightStick)
              </p>
            </div>
          </div>

          <button
            id="btn-close-gamepad-modal"
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controller Status Banner */}
        <div className="p-3 bg-black/80 border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {connectedPads.length > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            )}
            <div>
              <span className="font-bold text-white">
                {connectedPads.length > 0
                  ? connectedPads[0].name
                  : 'No Controller Detected'}
              </span>
              <span className="text-[10px] text-gray-400 block font-sans">
                {connectedPads.length > 0
                  ? `Index: ${connectedPads[0].index} • Standard Gamepad Mapping Active`
                  : 'Connect a USB/Bluetooth controller and press any button to wake the browser interface.'}
              </span>
            </div>
          </div>

          {connectedPads.length > 0 && (
            <button
              id="btn-test-rumble"
              onClick={() => handleTestRumble(0.6, 1.0, 300)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                rumbleTriggered
                  ? 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_#ef4444]'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-200'
              }`}
            >
              <Vibrate className="w-3.5 h-3.5" />
              TEST RUMBLE
            </button>
          )}
        </div>

        {/* Live Interactive Gamepad Visualizer */}
        <div className="bg-stone-900/90 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            // REAL-TIME INPUT TESTER (PRESS CONTROLLER BUTTONS TO TEST)
          </span>

          {/* Graphical Controller Representation */}
          <div className="relative w-full max-w-sm h-48 bg-stone-950 border-2 border-stone-800 rounded-3xl p-3 shadow-inner flex items-center justify-between">
            {/* Left Wing: D-Pad & Left Stick */}
            <div className="flex flex-col items-center gap-2 pl-2">
              {/* Left Bumper & Trigger indicators */}
              <div className="flex items-center gap-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                    isBtnPressed(6)
                      ? 'bg-yellow-500 text-black border-yellow-300 shadow'
                      : 'bg-black/60 text-gray-500 border-stone-800'
                  }`}
                >
                  LT (Spec 1)
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                    isBtnPressed(4)
                      ? 'bg-blue-500 text-white border-blue-300 shadow'
                      : 'bg-black/60 text-gray-500 border-stone-800'
                  }`}
                >
                  LB (Roll)
                </span>
              </div>

              {/* D-Pad */}
              <div className="relative w-16 h-16 bg-stone-900 rounded-lg p-1 grid grid-cols-3 gap-0.5 border border-stone-800">
                <div />
                <div
                  className={`rounded text-[8px] font-bold flex items-center justify-center ${
                    isBtnPressed(12) || (activePad?.axes[1] ?? 0) < -0.32
                      ? 'bg-red-500 text-white shadow'
                      : 'bg-black/70 text-gray-500'
                  }`}
                >
                  ▲
                </div>
                <div />
                <div
                  className={`rounded text-[8px] font-bold flex items-center justify-center ${
                    isBtnPressed(14) || (activePad?.axes[0] ?? 0) < -0.32
                      ? 'bg-red-500 text-white shadow'
                      : 'bg-black/70 text-gray-500'
                  }`}
                >
                  ◄
                </div>
                <div className="bg-stone-950 rounded flex items-center justify-center text-[7px] text-gray-600 font-bold">
                  D
                </div>
                <div
                  className={`rounded text-[8px] font-bold flex items-center justify-center ${
                    isBtnPressed(15) || (activePad?.axes[0] ?? 0) > 0.32
                      ? 'bg-red-500 text-white shadow'
                      : 'bg-black/70 text-gray-500'
                  }`}
                >
                  ►
                </div>
                <div />
                <div
                  className={`rounded text-[8px] font-bold flex items-center justify-center ${
                    isBtnPressed(13) || (activePad?.axes[1] ?? 0) > 0.32
                      ? 'bg-red-500 text-white shadow'
                      : 'bg-black/70 text-gray-500'
                  }`}
                >
                  ▼
                </div>
                <div />
              </div>

              {/* Left Analog Stick */}
              <div className="relative w-10 h-10 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center">
                <div
                  className={`w-6 h-6 rounded-full border text-[7px] font-bold flex items-center justify-center transition-transform ${
                    isBtnPressed(10)
                      ? 'bg-yellow-500 text-black border-yellow-300'
                      : 'bg-stone-800 text-gray-400 border-stone-600'
                  }`}
                  style={{
                    transform: `translate(${leftStickOffset.x}px, ${leftStickOffset.y}px)`,
                  }}
                >
                  LS
                </div>
              </div>
            </div>

            {/* Center Section: Share/Select, Home/Logo, Start/Options */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                {/* Back / Select */}
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                    isBtnPressed(8)
                      ? 'bg-amber-500 text-black border-amber-300 shadow'
                      : 'bg-black/60 text-gray-500 border-stone-800'
                  }`}
                >
                  BACK (Taunt)
                </span>
                {/* Start / Menu */}
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                    isBtnPressed(9)
                      ? 'bg-emerald-500 text-black border-emerald-300 shadow'
                      : 'bg-black/60 text-gray-500 border-stone-800'
                  }`}
                >
                  START (Pause)
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-black border border-stone-700 flex items-center justify-center shadow">
                <Gamepad2 className="w-4 h-4 text-red-500" />
              </div>

              <span className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">
                {activePad ? activePad.type.toUpperCase() : 'USB / BT'}
              </span>
            </div>

            {/* Right Wing: Face Action Buttons & Right Stick */}
            <div className="flex flex-col items-center gap-2 pr-2">
              {/* Right Bumper & Trigger indicators */}
              <div className="flex items-center gap-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                    isBtnPressed(5)
                      ? 'bg-purple-500 text-white border-purple-300 shadow'
                      : 'bg-black/60 text-gray-500 border-stone-800'
                  }`}
                >
                  RB (CD)
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                    isBtnPressed(7)
                      ? 'bg-red-600 text-white border-red-300 shadow animate-pulse'
                      : 'bg-black/60 text-gray-500 border-stone-800'
                  }`}
                >
                  RT (Super)
                </span>
              </div>

              {/* 4 Face Action Buttons (Diamond Grid) */}
              <div className="relative w-16 h-16 bg-stone-900 rounded-lg p-1 grid grid-cols-3 gap-0.5 border border-stone-800">
                <div />
                {/* Top Button: Y / Triangle / HP */}
                <div
                  className={`rounded text-[8px] font-bold flex items-center justify-center ${
                    isBtnPressed(3)
                      ? 'bg-yellow-500 text-black shadow font-black'
                      : 'bg-black/70 text-gray-400'
                  }`}
                  title="Heavy Punch (Y / Triangle)"
                >
                  Y / HP
                </div>
                <div />
                {/* Left Button: X / Square / LP */}
                <div
                  className={`rounded text-[8px] font-bold flex items-center justify-center ${
                    isBtnPressed(2)
                      ? 'bg-blue-500 text-white shadow font-black'
                      : 'bg-black/70 text-gray-400'
                  }`}
                  title="Light Punch (X / Square)"
                >
                  X / LP
                </div>
                <div className="bg-stone-950 rounded flex items-center justify-center text-[7px] text-gray-600 font-bold">
                  FOF
                </div>
                {/* Right Button: B / Circle / HK */}
                <div
                  className={`rounded text-[8px] font-bold flex items-center justify-center ${
                    isBtnPressed(1)
                      ? 'bg-red-500 text-white shadow font-black'
                      : 'bg-black/70 text-gray-400'
                  }`}
                  title="Heavy Kick (B / Circle)"
                >
                  B / HK
                </div>
                <div />
                {/* Bottom Button: A / Cross / LK */}
                <div
                  className={`rounded text-[8px] font-bold flex items-center justify-center ${
                    isBtnPressed(0)
                      ? 'bg-emerald-500 text-black shadow font-black'
                      : 'bg-black/70 text-gray-400'
                  }`}
                  title="Light Kick (A / Cross)"
                >
                  A / LK
                </div>
                <div />
              </div>

              {/* Right Analog Stick */}
              <div className="relative w-10 h-10 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center">
                <div
                  className={`w-6 h-6 rounded-full border text-[7px] font-bold flex items-center justify-center transition-transform ${
                    isBtnPressed(11)
                      ? 'bg-purple-500 text-white border-purple-300'
                      : 'bg-stone-800 text-gray-400 border-stone-600'
                  }`}
                  style={{
                    transform: `translate(${rightStickOffset.x}px, ${rightStickOffset.y}px)`,
                  }}
                >
                  RS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Preset Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-red-500" />
            CONTROLLER BUTTON PRESETS
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              id="preset-standard"
              onClick={() => handleSelectPreset('standard')}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                layoutPreset === 'standard'
                  ? 'bg-red-950/80 border-red-500 text-white shadow'
                  : 'bg-black/60 border-white/10 hover:border-white/20 text-gray-400'
              }`}
            >
              <span className="block font-bold text-xs">Standard Modern Pad</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Xbox / PS4 / PS5 / Switch Pro layout. X=LP, Y=HP, A=LK, B=HK, LB=Roll, RB=CD, RT=Super.
              </span>
            </button>

            <button
              id="preset-fightstick"
              onClick={() => handleSelectPreset('fightstick')}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                layoutPreset === 'fightstick'
                  ? 'bg-red-950/80 border-red-500 text-white shadow'
                  : 'bg-black/60 border-white/10 hover:border-white/20 text-gray-400'
              }`}
            >
              <span className="block font-bold text-xs">6-Button FightStick</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Top row: LP, HP, Roll. Bottom row: LK, HK, Blowback. Ideal for arcade sticks.
              </span>
            </button>

            <button
              id="preset-four_button"
              onClick={() => handleSelectPreset('four_button')}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                layoutPreset === 'four_button'
                  ? 'bg-red-950/80 border-red-500 text-white shadow'
                  : 'bg-black/60 border-white/10 hover:border-white/20 text-gray-400'
              }`}
            >
              <span className="block font-bold text-xs">Classic Neo Geo ABCD</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                A=LP, B=LK, X=HP, Y=HK. Classic inline 4-button arcade cabinet mapping.
              </span>
            </button>
          </div>
        </div>

        {/* Quick Reference Table for Combat */}
        <div className="p-3 bg-black/60 border border-white/10 rounded-xl text-xs space-y-1.5 font-mono">
          <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 uppercase">
            <HelpCircle className="w-3.5 h-3.5" />
            Active Controller Combat Commands:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-gray-300">
            <div>• <strong className="text-white">D-Pad / Left Stick:</strong> Move & Jump</div>
            <div>• <strong className="text-white">X / Square:</strong> Light Punch (LP)</div>
            <div>• <strong className="text-white">Y / Triangle:</strong> Heavy Punch (HP)</div>
            <div>• <strong className="text-white">A / Cross:</strong> Light Kick (LK)</div>
            <div>• <strong className="text-white">B / Circle:</strong> Heavy Kick (HK)</div>
            <div>• <strong className="text-white">LB / L1:</strong> Evasion Roll</div>
            <div>• <strong className="text-white">RB / R1:</strong> Blowback CD</div>
            <div>• <strong className="text-white">LT / L2:</strong> Special Move 1</div>
            <div>• <strong className="text-white">RT / R2:</strong> Super Move</div>
            <div>• <strong className="text-white">Select / Share:</strong> Taunt (+15 Meter)</div>
            <div>• <strong className="text-white">Start / Menu:</strong> Tactical Pause</div>
            <div>• <strong className="text-white">R3 / Right Click:</strong> MAX Mode</div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            id="btn-done-gamepad-modal"
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black italic uppercase text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
          >
            DONE // BACK TO ARENA
          </button>
        </div>
      </div>
    </div>
  );
};
