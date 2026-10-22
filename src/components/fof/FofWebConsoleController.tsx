import React, { useState, useEffect, useCallback } from 'react';
import { FofFighterStats, FightingMove } from '../../types/fighting';
import { Zap, RefreshCw, Swords, Award, MessageSquareQuote, Sparkles } from 'lucide-react';
import { soundFX } from '../../utils/audio';

interface FofWebConsoleControllerProps {
  currentFighter: FofFighterStats;
  onExecuteMove: (move: FightingMove) => void;
  onDirectionInput?: (dir: string) => void;
  onTaunt?: () => void;
}

const TAUNT_COOLDOWN_MS = 3500; // 3.5s recharge cooldown period to prevent spamming

export const FofWebConsoleController: React.FC<FofWebConsoleControllerProps> = ({
  currentFighter,
  onExecuteMove,
  onTaunt,
}) => {
  const moves = currentFighter?.moves || [];
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const [justTaunted, setJustTaunted] = useState<boolean>(false);

  const lp = moves.find(m => m?.button === 'LP');
  const hp = moves.find(m => m?.button === 'HP');
  const lk = moves.find(m => m?.button === 'LK');
  const hk = moves.find(m => m?.button === 'HK');
  const blowback = moves.find(m => m?.type === 'COMMAND_NORMAL');
  const spec1 = moves.find(m => m?.id?.includes('spec_1'));
  const spec2 = moves.find(m => m?.id?.includes('spec_2'));
  const spec3 = moves.find(m => m?.id?.includes('spec_3'));
  const superMove = moves.find(m => m?.type === 'SUPER');
  const climaxMove = moves.find(m => m?.type === 'CLIMAX');

  const triggerKey = (key: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key }));
    }, 100);
  };

  const getTauntQuote = useCallback(() => {
    if (currentFighter?.voiceLines?.taunt) return currentFighter.voiceLines.taunt;
    switch ((currentFighter?.id || 'arjun').toLowerCase()) {
      case 'arjun': return 'Is that all your corporation’s got?!';
      case 'steele': return 'At ease, recruit. You’re outmatched.';
      case 'elena': return 'Combat data: utterly predictable.';
      case 'maya': return 'You’re lagging in 4K, sweetie! ✨';
      case 'leo': return 'Too slow! Can’t keep up? ⚡';
      case 'david': return 'Smile for tomorrow’s front page! 📸';
      case 'kai': return 'You’re striking at shadows.';
      case 'alexandra': return 'Guilty of extreme incompetence.';
      case 'amara': return 'Don’t worry, I’ll patch you up after.';
      default: return 'Come on, bring it!';
    }
  }, [currentFighter]);

  // Handle taunt execution with cooldown
  const handleTriggerTaunt = useCallback(() => {
    if (cooldownLeft > 0) return; // Prevent spamming during cooldown

    // Play character-specific synthesized taunt sound
    soundFX.playCharacterTaunt(currentFighter?.id || 'arjun');

    // Trigger taunt in stage canvas
    if (onTaunt) {
      onTaunt();
    }
    window.dispatchEvent(new CustomEvent('fof-player-taunt'));
    window.dispatchEvent(new CustomEvent('kof-player-taunt'));

    // Start recharge cooldown timer
    setCooldownLeft(TAUNT_COOLDOWN_MS);
    setJustTaunted(true);
    setTimeout(() => setJustTaunted(false), 1200);
  }, [cooldownLeft, currentFighter.id, onTaunt]);

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setInterval(() => {
      setCooldownLeft(prev => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  // Sync physical keyboard 'T' press with controller cooldown display
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key.toLowerCase() === 't' && cooldownLeft === 0) {
        handleTriggerTaunt();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cooldownLeft, handleTriggerTaunt]);

  const cooldownPercentage = Math.round((cooldownLeft / TAUNT_COOLDOWN_MS) * 100);

  return (
    <div className="w-full max-w-5xl mx-auto bg-black/90 border-2 border-red-600/50 p-4 sm:p-5 rounded-2xl shadow-2xl space-y-4 font-mono">
      {/* Arcade Web Console Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <h3 className="text-sm sm:text-base font-black italic uppercase text-white tracking-widest flex items-center gap-2">
            <Swords className="w-4 h-4 text-red-500" />
            FOF ARCADE WEB CONSOLE // CONTROLLER
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="bg-red-950/60 px-2 py-0.5 border border-red-800 text-red-400 font-bold">
            FIGHTER: {currentFighter.name.toUpperCase()}
          </span>
          <span className="hidden sm:inline-block">KEYBOARD / TOUCH ENABLED</span>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Virtual D-Pad / Movement */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-[10px] text-gray-400 uppercase font-bold mb-2 tracking-wider">
            // MOVEMENT / GUARD
          </span>

          <div className="grid grid-cols-3 gap-1.5 w-40 h-40">
            <div />
            <button
              onMouseDown={() => triggerKey('w')}
              className="bg-black border border-white/20 hover:border-red-500 text-white font-bold rounded flex items-center justify-center active:bg-red-600 cursor-pointer shadow"
              title="Jump (W / Up)"
            >
              ▲ JUMP
            </button>
            <div />

            <button
              onMouseDown={() => triggerKey('a')}
              className="bg-black border border-white/20 hover:border-red-500 text-white font-bold rounded flex items-center justify-center active:bg-red-600 cursor-pointer shadow"
              title="Walk Left / Guard (A / Left)"
            >
              ◄ BACK
            </button>
            <button
              onMouseDown={() => triggerKey('r')}
              className="bg-red-950/80 border border-red-700 hover:bg-red-600 text-red-300 hover:text-white font-bold rounded flex flex-col items-center justify-center active:scale-95 cursor-pointer shadow text-[10px]"
              title="Evasion Roll (Space / R)"
            >
              <RefreshCw className="w-3.5 h-3.5 mb-0.5" />
              ROLL
            </button>
            <button
              onMouseDown={() => triggerKey('d')}
              className="bg-black border border-white/20 hover:border-red-500 text-white font-bold rounded flex items-center justify-center active:bg-red-600 cursor-pointer shadow"
              title="Walk Right / Forward (D / Right)"
            >
              FWD ►
            </button>

            <div />
            <button
              onMouseDown={() => triggerKey('s')}
              className="bg-black border border-white/20 hover:border-red-500 text-white font-bold rounded flex items-center justify-center active:bg-red-600 cursor-pointer shadow"
              title="Crouch (S / Down)"
            >
              ▼ CROUCH
            </button>
            <div />
          </div>
        </div>

        {/* Center: Classic 4-Button Layout (LP, HP, LK, HK) + CD / MAX / TAUNT */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-[10px] text-gray-400 uppercase font-bold mb-2 tracking-wider">
            // 4-BUTTON ARCADE PUNCH & KICK
          </span>

          <div className="grid grid-cols-2 gap-2.5 w-full max-w-[240px]">
            {/* Light Punch */}
            <button
              onClick={() => lp && onExecuteMove(lp)}
              className="p-3 bg-red-900/60 hover:bg-red-600 border border-red-500 text-white font-black italic rounded active:scale-95 transition-all cursor-pointer shadow flex flex-col items-center"
            >
              <span className="text-sm">LP (J)</span>
              <span className="text-[9px] text-gray-300 font-normal">Light Punch</span>
            </button>

            {/* Heavy Punch */}
            <button
              onClick={() => hp && onExecuteMove(hp)}
              className="p-3 bg-red-600 hover:bg-red-700 border border-red-400 text-white font-black italic rounded active:scale-95 transition-all cursor-pointer shadow flex flex-col items-center"
            >
              <span className="text-sm">HP (I)</span>
              <span className="text-[9px] text-yellow-200 font-normal">Heavy Punch</span>
            </button>

            {/* Light Kick */}
            <button
              onClick={() => lk && onExecuteMove(lk)}
              className="p-3 bg-blue-900/60 hover:bg-blue-600 border border-blue-500 text-white font-black italic rounded active:scale-95 transition-all cursor-pointer shadow flex flex-col items-center"
            >
              <span className="text-sm">LK (L)</span>
              <span className="text-[9px] text-gray-300 font-normal">Light Kick</span>
            </button>

            {/* Heavy Kick */}
            <button
              onClick={() => hk && onExecuteMove(hk)}
              className="p-3 bg-blue-600 hover:bg-blue-700 border border-blue-400 text-white font-black italic rounded active:scale-95 transition-all cursor-pointer shadow flex flex-col items-center"
            >
              <span className="text-sm">HK (;)</span>
              <span className="text-[9px] text-yellow-200 font-normal">Heavy Kick</span>
            </button>
          </div>

          {/* Special Mechanics: Blowback, Max Mode, and Arcade Taunt */}
          <div className="grid grid-cols-3 gap-1.5 w-full max-w-[250px] mt-2.5">
            <button
              onClick={() => blowback && onExecuteMove(blowback)}
              className="py-1.5 px-1 bg-yellow-600/30 hover:bg-yellow-600 border border-yellow-500 text-yellow-300 hover:text-white text-[11px] font-bold rounded cursor-pointer text-center truncate transition-colors"
              title="Blowback attack (E)"
            >
              CD (E)
            </button>
            <button
              onClick={() => triggerKey('q')}
              className="py-1.5 px-1 bg-purple-600/30 hover:bg-purple-600 border border-purple-500 text-purple-300 hover:text-white text-[11px] font-bold rounded cursor-pointer text-center truncate transition-colors"
              title="MAX Mode Burst (Q)"
            >
              MAX (Q)
            </button>

            {/* Character-Specific Taunt Button with Recharge Cooldown */}
            <button
              onClick={handleTriggerTaunt}
              disabled={cooldownLeft > 0}
              className={`relative overflow-hidden py-1.5 px-1 text-[11px] font-black italic rounded flex items-center justify-center gap-1 transition-all cursor-pointer select-none ${
                cooldownLeft > 0
                  ? 'bg-amber-950/40 border border-amber-800/40 text-amber-500/70 cursor-not-allowed opacity-80'
                  : 'bg-amber-500/20 hover:bg-amber-500 border border-amber-400 text-amber-300 hover:text-black shadow-[0_0_10px_rgba(245,158,11,0.3)] active:scale-95'
              }`}
              title={
                cooldownLeft > 0
                  ? `Taunt Recharging (${(cooldownLeft / 1000).toFixed(1)}s)`
                  : `Taunt Opponent (T) - "${getTauntQuote()}" (+15 Meter)`
              }
            >
              {/* Cooldown Recharge Bar Fill */}
              {cooldownLeft > 0 && (
                <div
                  className="absolute bottom-0 left-0 top-0 bg-amber-500/20 transition-all duration-100 ease-linear pointer-events-none"
                  style={{ width: `${100 - cooldownPercentage}%` }}
                />
              )}

              <MessageSquareQuote className={`w-3 h-3 ${cooldownLeft === 0 ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className="relative z-10 truncate">
                {cooldownLeft > 0 ? `${(cooldownLeft / 1000).toFixed(1)}s` : 'TAUNT (T)'}
              </span>
            </button>
          </div>

          {/* Taunt Feedback Toast / Hint */}
          {justTaunted && (
            <div className="mt-1.5 text-[10px] text-amber-300 font-mono font-bold animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>"{getTauntQuote()}" (+15 METER)</span>
            </div>
          )}
        </div>

        {/* Right: Quick Special Moves & Supers */}
        <div className="md:col-span-4 flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            // SPECIAL & SUPER COMMANDS
          </span>

          {spec1 && (
            <button
              onClick={() => onExecuteMove(spec1)}
              className="w-full py-1.5 px-3 bg-black/80 hover:bg-white/10 border border-white/20 hover:border-red-500 text-left rounded flex items-center justify-between text-xs cursor-pointer transition-colors"
            >
              <span className="font-bold text-white truncate">[1] {spec1.name}</span>
              <span className="text-[10px] text-gray-400 font-mono shrink-0">↓↘→ + P</span>
            </button>
          )}

          {spec2 && (
            <button
              onClick={() => onExecuteMove(spec2)}
              className="w-full py-1.5 px-3 bg-black/80 hover:bg-white/10 border border-white/20 hover:border-red-500 text-left rounded flex items-center justify-between text-xs cursor-pointer transition-colors"
            >
              <span className="font-bold text-white truncate">[2] {spec2.name}</span>
              <span className="text-[10px] text-gray-400 font-mono shrink-0">→↓↘ + P</span>
            </button>
          )}

          {spec3 && (
            <button
              onClick={() => onExecuteMove(spec3)}
              className="w-full py-1.5 px-3 bg-black/80 hover:bg-white/10 border border-white/20 hover:border-red-500 text-left rounded flex items-center justify-between text-xs cursor-pointer transition-colors"
            >
              <span className="font-bold text-white truncate">[3] {spec3.name}</span>
              <span className="text-[10px] text-gray-400 font-mono shrink-0">↓↙← + K</span>
            </button>
          )}

          {superMove && (
            <button
              onClick={() => onExecuteMove(superMove)}
              className="w-full py-2 px-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black italic rounded flex items-center justify-between text-xs cursor-pointer shadow-lg shadow-red-600/30 active:scale-95"
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                [4 / F] {superMove.name}
              </span>
              <span className="text-[10px] text-yellow-200 font-mono shrink-0">1-BAR</span>
            </button>
          )}

          {climaxMove && (
            <button
              onClick={() => onExecuteMove(climaxMove)}
              className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white font-black italic rounded flex items-center justify-between text-xs cursor-pointer shadow-lg shadow-purple-600/30 active:scale-95"
            >
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-yellow-300" />
                CLIMAX: {climaxMove.name.replace('CLIMAX: ', '')}
              </span>
              <span className="text-[10px] text-yellow-200 font-mono shrink-0">3-BAR MAX</span>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard Notation Reference Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-gray-400 font-mono">
        <div>
          <span className="text-red-400 font-bold">KEYBOARD: </span>
          WASD (Move/Jump/Guard) | J/U (LP) | I/K (HP) | L/O (LK) | ;/P (HK) | Space/R (Roll) | E (CD) | T (Taunt) | 1,2,3 (Specials) | 4/F (Super)
        </div>
        <div className="text-gray-500">
          PRO COMMANDS: ↓↘→ + P (QCF) | →↓↘ + P (DP) | ↓↙← + K (QCB) | 2x QCF + P (SUPER)
        </div>
      </div>
    </div>
  );
};
