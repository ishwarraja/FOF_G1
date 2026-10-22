import React, { useState } from 'react';
import { FOF_CHARACTERS, FOF_BOSSES } from '../../data/fightingMoves';
import { soundFX } from '../../utils/audio';
import { FofHumanFighterSprite } from './FofHumanFighterSprite';
import { createFightingEntity } from '../../utils/fightingEngine';
import { getFighterPortrait } from '../../data/characterAvatars';
import { BookOpen, Flame, Shield, Wind, Sparkles, Skull, Mountain, Swords, UserCheck, FileText, Palette, CheckCircle2 } from 'lucide-react';

export const FofCodexRoster: React.FC = () => {
  const characters = [...Object.values(FOF_CHARACTERS), ...Object.values(FOF_BOSSES)];
  const [selectedId, setSelectedId] = useState<string>('arjun');
  const [previewPose, setPreviewPose] = useState<'IDLE' | 'ATTACK_HP' | 'SPECIAL_1' | 'SUPER' | 'GUARD'>('IDLE');

  const char = characters.find(c => c.id === selectedId) || characters[0];
  const dummyEntity = {
    ...createFightingEntity(char, true, 0),
    state: previewPose,
    superMeter: previewPose === 'SUPER' ? 300 : 100,
    isMaxMode: previewPose === 'SUPER',
  };

  const handleSelect = (id: string) => {
    soundFX.playClick();
    setSelectedId(id);
  };

  const renderElemIcon = (elem: string) => {
    switch (elem) {
      case 'Fire': return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Ice': return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'Wind': return <Wind className="w-4 h-4 text-emerald-400" />;
      case 'Light': return <Sparkles className="w-4 h-4 text-yellow-300" />;
      case 'Dark': return <Skull className="w-4 h-4 text-purple-400" />;
      default: return <Mountain className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-mono">
      {/* Header */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            CHAMPION ROSTER & LORE CODEX
          </span>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-tight">
            FATE OF FIGHTERS ARCHIVES
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Complete database of 6 elemental champions and primordial rift bosses from FOF_Character_Roaster_v0.1.md
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Character List */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            // SELECT FIGHTER PROFILE
          </h3>
          <div className="space-y-2">
            {characters.map(c => {
              const isSelected = selectedId === c.id;
              const isBoss = c.id.includes('leviathan');
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-red-500 bg-red-600/20 border-l-4 shadow-lg shadow-red-950/40'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-tr ${c.avatarColor} flex items-center justify-center text-white font-black italic shadow overflow-hidden relative`}>
                      <img
                        src={getFighterPortrait(c)}
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-black italic uppercase text-white">
                        {c.name.split(' ')[0]} {isBoss && <span className="text-red-500">[BOSS]</span>}
                      </h4>
                      <span className="text-[10px] text-gray-400">{c.faction}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {renderElemIcon(c.element)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Character Dossier & Lore */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-black/90 border border-white/10 p-6 rounded-2xl space-y-6">
            {/* Top Dossier */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-4">
                {char.avatarUrl && (
                  <img
                    src={char.avatarUrl}
                    alt={char.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border border-amber-400/60 shadow-lg"
                  />
                )}
                <div>
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest">{char.faction}</span>
                  <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white">
                    {char.name}
                  </h3>
                  <p className="text-xs text-yellow-400 font-bold">{char.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                {renderElemIcon(char.element)}
                <span className="text-xs font-bold text-white uppercase">{char.element} Element</span>
              </div>
            </div>

            {/* Human Fighter Interactive Stance Preview Panel */}
            <div className="p-4 bg-gradient-to-b from-stone-950 via-zinc-900 to-black border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-inner">
              <div className="flex flex-col items-center sm:items-start space-y-2 z-10">
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-red-400" />
                  HUMANOID 2D FIGHTER RIG
                </span>
                <p className="text-xs text-gray-400 max-w-xs">
                  Full animated human sprite with elemental aura, weapons, stance kinematics, and combat frames.
                </p>
                
                {/* Pose Switcher */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {(['IDLE', 'ATTACK_HP', 'SPECIAL_1', 'SUPER', 'GUARD'] as const).map(pose => (
                    <button
                      key={pose}
                      onClick={() => setPreviewPose(pose)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase border transition-all cursor-pointer ${
                        previewPose === pose
                          ? 'border-red-500 bg-red-600 text-white shadow'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {pose.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Human Fighter Sprite Model */}
              <div className="relative w-40 h-44 flex items-center justify-center bg-black/60 border border-white/10 rounded-xl p-2 shadow-2xl">
                <div className="scale-90">
                  <FofHumanFighterSprite entity={dummyEntity} isPlayer1={true} />
                </div>
              </div>
            </div>

            {/* Combat Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">BASE HP</span>
                <span className="text-lg font-black text-white">{char.maxHp}</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">ATTACK</span>
                <span className="text-lg font-black text-red-400">{char.atk}</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">DEFENSE</span>
                <span className="text-lg font-black text-blue-400">{char.def}</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">SPEED / CRIT</span>
                <span className="text-lg font-black text-emerald-400">{char.spd} / {char.critRate}%</span>
              </div>
            </div>

            {/* Signature weapon & backstory */}
            <div className="space-y-3">
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-red-400 uppercase font-bold block">SIGNATURE WEAPON</span>
                  <span className="text-xs font-bold text-white">{char.signatureWeapon}</span>
                </div>
                <Swords className="w-5 h-5 text-red-400" />
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">CHARACTER BIOGRAPHY // LORE</span>
                <p className="text-xs text-gray-200 leading-relaxed italic">
                  "{char.backstory}"
                </p>
              </div>
            </div>

            {/* Voice Lines */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">// BATTLE VOICE LINES</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-black/60 border border-white/10 rounded">
                  <span className="text-[10px] text-blue-400 font-bold block">Intro Line:</span>
                  <p className="text-gray-300 italic text-[11px]">"{char.voiceLines.intro}"</p>
                </div>
                <div className="p-2.5 bg-black/60 border border-white/10 rounded">
                  <span className="text-[10px] text-yellow-400 font-bold block">Victory Line:</span>
                  <p className="text-gray-300 italic text-[11px]">"{char.voiceLines.victory}"</p>
                </div>
                <div className="p-2.5 bg-black/60 border border-white/10 rounded sm:col-span-2">
                  <span className="text-[10px] text-red-400 font-bold block">Super Call:</span>
                  <p className="text-red-300 font-black italic text-[11px]">"{char.voiceLines.superCall}"</p>
                </div>
              </div>
            </div>

            {/* Official 3D Character Design Reference (Protagonist: Arjun) */}
            {char.id === 'arjun' && (
              <div className="mt-6 p-5 bg-gradient-to-b from-stone-900 to-black border-2 border-amber-500/50 rounded-2xl shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" />
                      MASTER CHARACTER DESIGN REFERENCE (3D MODEL BIBLE)
                    </span>
                    <h4 className="text-base font-black italic text-white uppercase mt-0.5">
                      Arjun Rao — Working-Class Martial Artist
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-bold">
                    3/4 Full-Body Guard Reference
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Full-Body Visual Sheet */}
                  <div className="md:col-span-5 bg-zinc-950 p-3 rounded-xl border border-white/15 flex flex-col items-center justify-center relative overflow-hidden group">
                    <img
                      src="/characters/arjun_design_reference.svg"
                      alt="Arjun Character Design Reference"
                      className="w-full max-h-[380px] object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="w-full text-center mt-2">
                      <span className="text-[9px] text-gray-400 block font-mono">
                        Isolated Studio Reference (Plain Neutral Backdrop)
                      </span>
                    </div>
                  </div>

                  {/* Design Specifications & Color Hierarchy */}
                  <div className="md:col-span-7 space-y-3 text-xs">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Character Identity & Proportions
                      </span>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Indian working-class adult male with realistic athletic proportions (182 cm, 82 kg). Strong, grounded combat silhouette with natural separation between arms, torso, and legs. Stance: 3/4 view facing right in a neutral martial arts ready guard.
                      </p>
                    </div>

                    {/* Costume & Palette Matrix */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Costume & Palette Breakdown
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-stone-950/80 border border-white/10 rounded-lg flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[#1b283d] border border-blue-400/50 shrink-0" />
                          <div>
                            <span className="font-bold text-white block">Deep Indigo Vest</span>
                            <span className="text-[9px] text-gray-400">#1b283d · Canvas duck jacket</span>
                          </div>
                        </div>

                        <div className="p-2 bg-stone-950/80 border border-white/10 rounded-lg flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[#8a3429] border border-red-400/50 shrink-0" />
                          <div>
                            <span className="font-bold text-white block">Muted Rust-Red Shirt</span>
                            <span className="text-[9px] text-gray-400">#8a3429 · Slub cotton knit</span>
                          </div>
                        </div>

                        <div className="p-2 bg-stone-950/80 border border-white/10 rounded-lg flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[#2f3136] border border-gray-400/50 shrink-0" />
                          <div>
                            <span className="font-bold text-white block">Charcoal Trousers</span>
                            <span className="text-[9px] text-gray-400">#2f3136 · Ripstop cargo pants</span>
                          </div>
                        </div>

                        <div className="p-2 bg-stone-950/80 border border-white/10 rounded-lg flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[#d6cebf] border border-amber-200/50 shrink-0" />
                          <div>
                            <span className="font-bold text-white block">Cloth Wrist Wraps</span>
                            <span className="text-[9px] text-gray-400">#d6cebf · Unbleached cotton</span>
                          </div>
                        </div>

                        <div className="p-2 bg-stone-950/80 border border-white/10 rounded-lg flex items-center gap-2.5 sm:col-span-2">
                          <div className="w-5 h-5 rounded-md bg-[#332217] border border-amber-700/50 shrink-0" />
                          <div>
                            <span className="font-bold text-white block">Sturdy Combat Boots</span>
                            <span className="text-[9px] text-gray-400">#332217 · Oiled full-grain leather with vulcanized high-traction lug soles</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-lg flex items-start gap-2 text-[11px] text-amber-200">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>3D Asset Consistency Directive:</strong> Maintain identical facial features, body ratios (7.5 heads), costume construction, and color harmonies across all 3D mesh rigs, LOD models, and future skins.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
