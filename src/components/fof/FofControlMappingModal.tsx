import React, { useState, useEffect, useRef } from 'react';
import {
  PlayerKeyboardBindings,
  ActionBindingKey,
  ACTION_METADATA_LIST,
  PRESET_LAYOUTS,
  getKeyboardBindings,
  saveKeyboardBindings,
  resetKeyboardBindings,
  formatKeyLabel,
} from '../../utils/keyboardControls';
import { soundFX } from '../../utils/audio';
import {
  Keyboard,
  X,
  RotateCcw,
  Check,
  Sparkles,
  Zap,
  Flame,
  Shield,
  Sliders,
  AlertTriangle,
  Move,
  Sword,
  Target,
} from 'lucide-react';

interface FofControlMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBindingsChange?: (bindings: PlayerKeyboardBindings) => void;
}

export const FofControlMappingModal: React.FC<FofControlMappingModalProps> = ({
  isOpen,
  onClose,
  onBindingsChange,
}) => {
  const [bindings, setBindings] = useState<PlayerKeyboardBindings>(getKeyboardBindings);
  const [listeningAction, setListeningAction] = useState<ActionBindingKey | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'normals' | 'specials' | 'movement'>('all');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [lastTestedAction, setLastTestedAction] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync bindings on modal open
  useEffect(() => {
    if (isOpen) {
      setBindings(getKeyboardBindings());
      setListeningAction(null);
      setConflictWarning(null);
      setSaveToast(false);
    }
  }, [isOpen]);

  // Global key listener for rebinding and live input testing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If currently rebinding an action slot:
      if (listeningAction) {
        e.preventDefault();
        e.stopPropagation();

        // ESC cancels rebinding
        if (e.key === 'Escape') {
          soundFX.playClick();
          setListeningAction(null);
          return;
        }

        const newKey = e.key.toLowerCase();

        // Check if another action is currently bound to this key
        const conflictAction = (Object.keys(bindings) as ActionBindingKey[]).find(
          k => k !== listeningAction && bindings[k].toLowerCase() === newKey
        );

        const updated = { ...bindings, [listeningAction]: newKey };

        if (conflictAction) {
          const actionMeta = ACTION_METADATA_LIST.find(a => a.key === conflictAction);
          setConflictWarning(
            `Key "${formatKeyLabel(newKey)}" was previously bound to "${actionMeta?.label || conflictAction}". It has been re-assigned.`
          );
        } else {
          setConflictWarning(null);
        }

        setBindings(updated);
        saveKeyboardBindings(updated);
        if (onBindingsChange) onBindingsChange(updated);

        soundFX.playReadyFight();
        setListeningAction(null);
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2000);
        return;
      }

      // 2. If not rebinding, run the Live Input Tester
      const pressedKey = e.key.toLowerCase();
      const matched = (Object.keys(bindings) as ActionBindingKey[]).find(k => {
        const boundKey = bindings[k].toLowerCase();
        if (boundKey === ' ' && (pressedKey === ' ' || e.code === 'Space')) return true;
        return boundKey === pressedKey || boundKey === e.code.toLowerCase();
      });

      if (matched) {
        const meta = ACTION_METADATA_LIST.find(a => a.key === matched);
        setLastTestedAction(meta?.label || matched);
        soundFX.playClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, listeningAction, bindings, onBindingsChange]);

  if (!isOpen) return null;

  const handleStartRebind = (actionKey: ActionBindingKey) => {
    soundFX.playClick();
    setConflictWarning(null);
    setListeningAction(actionKey);
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = PRESET_LAYOUTS[presetKey];
    if (!preset) return;
    soundFX.playReadyFight();
    const updated = { ...preset.bindings };
    setBindings(updated);
    saveKeyboardBindings(updated);
    if (onBindingsChange) onBindingsChange(updated);
    setConflictWarning(null);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleResetDefaults = () => {
    soundFX.playReadyFight();
    const defaults = resetKeyboardBindings();
    setBindings(defaults);
    if (onBindingsChange) onBindingsChange(defaults);
    setConflictWarning(null);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const filteredActions = ACTION_METADATA_LIST.filter(action => {
    if (activeCategory === 'all') return true;
    return action.category === activeCategory;
  });

  return (
    <div
      id="modal-control-mapping"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-stone-950 border-2 border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-black to-stone-900 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Keyboard className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                DOJO LAB // INPUT SETTINGS
              </div>
              <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tight">
                KEYBOARD CONTROL MAPPING
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-control-mapping"
              onClick={() => {
                soundFX.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Close Settings (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conflict / Rebind Notification Banner */}
        {listeningAction && (
          <div className="px-5 py-3 bg-amber-500/20 border-b border-amber-500/40 text-amber-200 flex items-center justify-between gap-3 text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                REBINDING <strong className="text-white uppercase">{ACTION_METADATA_LIST.find(a => a.key === listeningAction)?.label}</strong>:
                Press any key on your keyboard now (or press <kbd className="px-1.5 py-0.5 bg-black rounded text-[10px] text-white">ESC</kbd> to cancel).
              </span>
            </div>
            <button
              onClick={() => setListeningAction(null)}
              className="text-[10px] uppercase font-bold text-amber-300 hover:text-white underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {conflictWarning && !listeningAction && (
          <div className="px-5 py-2.5 bg-yellow-950/60 border-b border-yellow-500/40 text-yellow-300 flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400" />
            <span>{conflictWarning}</span>
          </div>
        )}

        {saveToast && (
          <div className="px-5 py-2 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Controls successfully saved and applied to Dojo Lab & Stage Canvas!</span>
          </div>
        )}

        {/* Scrollable Configuration Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-white/5">
          {/* 1. Quick Presets Section */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              LOAD HARDWARE PRESET LAYOUT:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {Object.entries(PRESET_LAYOUTS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handleApplyPreset(key)}
                  className="p-3 bg-stone-900/80 hover:bg-stone-800 border border-white/10 hover:border-amber-400/60 rounded-xl text-left transition-all cursor-pointer group active:scale-98 shadow"
                >
                  <div className="text-xs font-black uppercase text-amber-300 group-hover:text-white flex items-center justify-between">
                    <span>{preset.name.split(' ')[0]}</span>
                    <span className="text-[9px] text-gray-500 font-mono">PRESET</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Category Filter Tabs */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Controls', icon: Sliders },
                { id: 'normals', label: 'Normal Attacks', icon: Sword },
                { id: 'specials', label: 'Specials & Supers', icon: Flame },
                { id: 'movement', label: 'Movement & Defense', icon: Move },
              ].map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      soundFX.playClick();
                      setActiveCategory(cat.id as any);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeCategory === cat.id
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 hover:text-white rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow"
              title="Reset all bindings back to default classic arcade setup"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET DEFAULTS</span>
            </button>
          </div>

          {/* 3. Action Rebinding Grid */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredActions.map(action => {
              const currentKey = bindings[action.key] || action.defaultKey;
              const isListening = listeningAction === action.key;

              return (
                <div
                  key={action.key}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isListening
                      ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-black/60 hover:bg-stone-900/80 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-stone-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                      {action.notation}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase text-white truncate flex items-center gap-1.5">
                        <span>{action.label}</span>
                        {action.category === 'specials' && (
                          <span className="text-[9px] px-1 bg-red-950 text-red-300 rounded border border-red-500/40">
                            SPECIAL
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {action.description}
                      </div>
                    </div>
                  </div>

                  {/* Rebind Key Button */}
                  <button
                    onClick={() => handleStartRebind(action.key)}
                    className={`px-3 py-2 rounded-lg font-mono font-black text-xs min-w-[90px] text-center border transition-all cursor-pointer active:scale-95 ${
                      isListening
                        ? 'bg-amber-500 text-black border-amber-300 animate-pulse font-bold'
                        : 'bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-white border-white/20 hover:border-amber-400 shadow'
                    }`}
                    title={`Click to rebind ${action.label}`}
                  >
                    {isListening ? 'PRESS KEY' : formatKeyLabel(currentKey)}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 4. Live Input Tester */}
          <div className="pt-4">
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-gray-300 uppercase">
                  LIVE INPUT TESTER:
                </span>
                <span className="text-[11px] text-gray-400">
                  Press any configured key right now to verify response:
                </span>
              </div>
              <div className="flex items-center gap-2">
                {lastTestedAction ? (
                  <span className="px-3 py-1 bg-emerald-950 border border-emerald-400 text-emerald-300 rounded-lg text-xs font-black uppercase tracking-wider animate-bounce">
                    DETECTED: {lastTestedAction}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-black/60 border border-white/10 text-gray-500 rounded-lg text-xs font-bold">
                    WAITING FOR INPUT...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Keybinds are automatically saved to your browser and sync into Dojo Practice & Arcade Battles.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-save-control-mapping"
              onClick={() => {
                soundFX.playReadyFight();
                onClose();
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black italic uppercase text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>APPLY & CLOSE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
