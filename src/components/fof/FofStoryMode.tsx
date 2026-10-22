import React, { useState } from 'react';
import { STORY_CAMPAIGN_ACTS, StoryChapter } from '../../data/storyArcs';
import { soundFX } from '../../utils/audio';
import { BookOpen, Award, Swords, ChevronRight, CheckCircle2 } from 'lucide-react';

interface FofStoryModeProps {
  onStartStoryBattle: (chapter: StoryChapter) => void;
  unlockedActs: string[];
}

export const FofStoryMode: React.FC<FofStoryModeProps> = ({
  onStartStoryBattle,
  unlockedActs = ['act_1'],
}) => {
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter>(STORY_CAMPAIGN_ACTS[0]);
  const [showDialogueModal, setShowDialogueModal] = useState<boolean>(false);
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);

  const handleSelectAct = (chapter: StoryChapter) => {
    soundFX.playClick();
    setSelectedChapter(chapter);
    setDialogueIndex(0);
  };

  const handleLaunchCutscene = () => {
    soundFX.playClick();
    setDialogueIndex(0);
    setShowDialogueModal(true);
  };

  const handleAdvanceDialogue = () => {
    soundFX.playClick();
    if (dialogueIndex < selectedChapter.dialogueBefore.length - 1) {
      setDialogueIndex(prev => prev + 1);
    } else {
      setShowDialogueModal(false);
      onStartStoryBattle(selectedChapter);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-mono">
      {/* Story Banner Header */}
      <div className="bg-gradient-to-r from-black via-red-950/40 to-black border-2 border-red-600/40 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            ARCADE STORY CAMPAIGN // FATE OF FIGHTERS
          </span>
          <h2 className="text-2xl sm:text-4xl font-black italic uppercase text-white tracking-tight">
            THE SHATTERED CONVERGENCE
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
            The <span className="text-yellow-400 font-bold">Crest of Eternity</span> has shattered into 6 Prime Shards across the continent of Aethelgard. Rogue dimensional rifts awaken ancient horrors. Assemble the Vanguard and battle across four acts to defeat the Primordial Void Leviathan!
          </p>
        </div>
      </div>

      {/* Chapters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Act List */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            // CAMPAIGN CHAPTERS (ACTS I - IV)
          </h3>

          <div className="space-y-3">
            {STORY_CAMPAIGN_ACTS.map((act, index) => {
              const isSelected = selectedChapter.id === act.id;
              const isUnlocked = unlockedActs.includes(act.id) || index === 0;

              return (
                <div
                  key={act.id}
                  onClick={() => isUnlocked && handleSelectAct(act)}
                  className={`p-4 border rounded-xl transition-all select-none ${
                    !isUnlocked
                      ? 'opacity-40 border-white/5 bg-black/40 cursor-not-allowed'
                      : isSelected
                      ? 'border-red-500 bg-red-600/20 border-l-4 shadow-lg shadow-red-950/40 cursor-pointer'
                      : 'border-white/10 bg-white/5 hover:border-white/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                      ACT 0{index + 1}
                    </span>
                    {isUnlocked && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> READY
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-black italic uppercase text-white truncate">
                    {act.actTitle}
                  </h4>
                  <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                    {act.actSubtitle}
                  </p>

                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Reward: {act.rewardTitle}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-red-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Chapter Detail & Battle Briefing */}
        <div className="lg:col-span-7">
          <div className="bg-black/90 border border-white/10 p-6 rounded-2xl space-y-5">
            <div className="border-b border-white/10 pb-4">
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
                STAGE BRIEFING
              </span>
              <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white mt-1">
                {selectedChapter.actTitle}
              </h3>
              <p className="text-xs text-yellow-400 mt-0.5 font-bold">
                {selectedChapter.actSubtitle}
              </p>
            </div>

            {/* Lore narrative */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                NARRATIVE SYNOPSIS:
              </span>
              <p className="text-xs text-gray-300 leading-relaxed">
                {selectedChapter.storyIntroText}
              </p>
            </div>

            {/* Matchup Preview */}
            <div className="grid grid-cols-2 gap-4">
              {/* Player Team */}
              <div className="p-3 bg-blue-950/30 border border-blue-800/50 rounded-xl space-y-2">
                <span className="text-[10px] text-blue-400 font-bold uppercase block">
                  RESISTANCE SQUAD (PLAYER)
                </span>
                <div className="space-y-1">
                  {selectedChapter.playerTeam.map(f => (
                    <div key={f.id} className="text-xs text-white font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      {f.name.split(' ')[0]} ({f.element})
                    </div>
                  ))}
                </div>
              </div>

              {/* Enemy Squad */}
              <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl space-y-2">
                <span className="text-[10px] text-red-400 font-bold uppercase block">
                  HEGEMONY / BOSS TARGET
                </span>
                <div className="space-y-1">
                  {selectedChapter.enemyTeam.map(f => (
                    <div key={f.id} className="text-xs text-red-300 font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {f.name.split(' ')[0]} ({f.element})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reward Banner */}
            <div className="p-3 bg-yellow-950/30 border border-yellow-800/50 rounded-xl flex items-center gap-3">
              <Award className="w-8 h-8 text-yellow-400 shrink-0" />
              <div>
                <span className="text-[10px] text-yellow-500 font-bold uppercase">
                  VICTORY UNLOCK:
                </span>
                <h5 className="text-xs font-bold text-yellow-200">
                  {selectedChapter.rewardTitle}
                </h5>
                <p className="text-[10px] text-gray-400">{selectedChapter.rewardDescription}</p>
              </div>
            </div>

            {/* Start Story Duel Button */}
            <button
              onClick={handleLaunchCutscene}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-wider text-sm rounded-xl shadow-xl shadow-red-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Swords className="w-5 h-5" />
              ENTER STORY DUEL // ENGAGE
            </button>
          </div>
        </div>
      </div>

      {/* Story Dialogue Cutscene Modal */}
      {showDialogueModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-black border-2 border-red-600 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                // DIALOGUE CUTSCENE (LINE {dialogueIndex + 1}/{selectedChapter.dialogueBefore.length})
              </span>
              <span className="text-xs text-gray-500">Tap anywhere to advance</span>
            </div>

            {/* Active Dialogue Speaker */}
            {selectedChapter.dialogueBefore[dialogueIndex] && (
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${selectedChapter.dialogueBefore[dialogueIndex].avatarColor} flex items-center justify-center text-white text-2xl font-black italic shadow-lg shrink-0`}>
                  {selectedChapter.dialogueBefore[dialogueIndex].portraitLetter}
                </div>

                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-black italic uppercase text-red-400">
                    {selectedChapter.dialogueBefore[dialogueIndex].speaker}
                  </h4>
                  <p className="text-sm sm:text-base text-gray-200 leading-relaxed">
                    "{selectedChapter.dialogueBefore[dialogueIndex].text}"
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={handleAdvanceDialogue}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs rounded shadow cursor-pointer flex items-center gap-1.5"
              >
                <span>{dialogueIndex < selectedChapter.dialogueBefore.length - 1 ? 'NEXT' : 'COMMENCE BATTLE!'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
