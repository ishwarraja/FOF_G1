import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { CAMPAIGN_ACTS } from '../../data/campaign';
import { CampaignStage, DialogueLine } from '../../types/game';
import { 
  Swords, 
  Star, 
  Sparkles, 
  Flame, 
  ChevronRight, 
  Lock, 
  Coins, 
  Gem, 
  PlayCircle,
  MessageSquare,
  Shield,
  Wind,
  Skull,
  Mountain,
  Crosshair
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const CampaignView: React.FC = () => {
  const { profile, startBattle } = useGame();
  const [selectedActId, setSelectedActId] = useState<string>('act_prologue');
  const [activeDialogue, setActiveDialogue] = useState<{
    lines: DialogueLine[];
    currentIndex: number;
    stage: CampaignStage;
  } | null>(null);

  const selectedAct = CAMPAIGN_ACTS.find(a => a.id === selectedActId) || CAMPAIGN_ACTS[0];

  // Helper to calculate total player team CP
  const teamCP = profile.roster.reduce((sum, f) => sum + f.currentStats.atk * 2 + f.currentStats.def + Math.round(f.currentStats.maxHp / 10), 0);

  const handleStageSelect = (stage: CampaignStage) => {
    soundFX.playClick();
    if (stage.dialogueIntro && stage.dialogueIntro.length > 0 && !profile.campaignProgress.completedStageIds.includes(stage.id)) {
      setActiveDialogue({
        lines: stage.dialogueIntro,
        currentIndex: 0,
        stage,
      });
    } else {
      // Direct start battle with formation fighters
      const deployTeam = profile.formation
        .map(id => profile.roster.find(r => r.id === id))
        .filter((f): f is typeof profile.roster[0] => !!f);

      startBattle(deployTeam.length > 0 ? deployTeam : profile.roster, stage.enemyTeam, stage);
    }
  };

  const advanceDialogue = () => {
    if (!activeDialogue) return;
    soundFX.playClick();
    if (activeDialogue.currentIndex < activeDialogue.lines.length - 1) {
      setActiveDialogue({
        ...activeDialogue,
        currentIndex: activeDialogue.currentIndex + 1,
      });
    } else {
      // Dialogue finished, launch battle!
      const stage = activeDialogue.stage;
      setActiveDialogue(null);
      const deployTeam = profile.formation
        .map(id => profile.roster.find(r => r.id === id))
        .filter((f): f is typeof profile.roster[0] => !!f);

      startBattle(deployTeam.length > 0 ? deployTeam : profile.roster, stage.enemyTeam, stage);
    }
  };

  const skipDialogue = () => {
    if (!activeDialogue) return;
    soundFX.playClick();
    const stage = activeDialogue.stage;
    setActiveDialogue(null);
    const deployTeam = profile.formation
      .map(id => profile.roster.find(r => r.id === id))
      .filter((f): f is typeof profile.roster[0] => !!f);

    startBattle(deployTeam.length > 0 ? deployTeam : profile.roster, stage.enemyTeam, stage);
  };

  const getSpeakerAvatarIcon = (avatarName: string) => {
    switch (avatarName) {
      case 'Flame': return <Flame className="w-8 h-8 text-red-500" />;
      case 'Shield': return <Shield className="w-8 h-8 text-cyan-400" />;
      case 'Wind': return <Wind className="w-8 h-8 text-emerald-400" />;
      case 'Sparkles': return <Sparkles className="w-8 h-8 text-yellow-300" />;
      case 'Skull': return <Skull className="w-8 h-8 text-purple-400" />;
      case 'Mountain': return <Mountain className="w-8 h-8 text-amber-500" />;
      default: return <Swords className="w-8 h-8 text-gray-300" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Campaign Act Header Banner - Artistic Flair */}
      <div className="relative border-l-4 border-red-600 bg-white/5 border border-white/10 p-6 sm:p-8 backdrop-blur-sm overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none font-black italic text-7xl text-white">
          ACT 0{selectedAct.actNumber}
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-red-500 uppercase bg-red-600/10 px-2.5 py-1 border border-red-600/30 inline-block">
              // SCENARIO MODE
            </span>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              [ CHAPTER 0{selectedAct.actNumber} ]
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter text-white uppercase mb-2">
            {selectedAct.title}
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4 max-w-2xl">
            {selectedAct.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-500" />
              <span>Target Shard: <strong className="text-white">{selectedAct.shardReward}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-red-400" />
              <span>Team Combat Power: <strong className="text-red-400 font-bold">{teamCP.toLocaleString()} CP</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Act Chapter Selector Tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {CAMPAIGN_ACTS.map((act) => {
          const isSelected = act.id === selectedActId;
          const completedCount = act.stages.filter(s => profile.campaignProgress.completedStageIds.includes(s.id)).length;
          const isActDone = completedCount === act.stages.length;

          return (
            <button
              key={act.id}
              onClick={() => {
                soundFX.playClick();
                setSelectedActId(act.id);
              }}
              className={`flex items-center gap-3 px-4 py-3 border text-left shrink-0 transition-all duration-200 ${
                isSelected
                  ? 'bg-red-600/20 border-red-600 text-white border-l-4 shadow-lg shadow-red-950/40'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center font-black italic text-sm ${
                isSelected ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {act.actNumber === 0 ? 'P' : `0${act.actNumber}`}
              </div>
              <div>
                <div className="text-xs font-black italic uppercase tracking-wider truncate max-w-[140px] sm:max-w-none text-white">
                  {act.title.split(':')[0]}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {completedCount}/{act.stages.length} Stages {isActDone && '✓'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stages Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black italic uppercase tracking-wider text-base text-white flex items-center gap-2">
            <Swords className="w-4 h-4 text-red-600" />
            <span>Combat Encounters & Shard Trials</span>
          </h3>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">[ Selection Grid ]</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedAct.stages.map((stage, idx) => {
            const isCompleted = profile.campaignProgress.completedStageIds.includes(stage.id);
            const prevStage = idx > 0 ? selectedAct.stages[idx - 1] : null;
            const isUnlocked = idx === 0 || (prevStage && profile.campaignProgress.completedStageIds.includes(prevStage.id)) || isCompleted;

            return (
              <div
                key={stage.id}
                className={`border p-5 flex flex-col justify-between transition-all duration-200 ${
                  !isUnlocked
                    ? 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed'
                    : isCompleted
                    ? 'bg-white/5 border-white/10 hover:border-red-600/60'
                    : 'bg-white/5 border-red-600/80 border-l-4 shadow-xl shadow-red-950/20'
                }`}
              >
                <div>
                  {/* Header: Stage Number & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 bg-red-600/10 px-2 py-0.5 border border-red-600/30">
                      STAGE 0{stage.stageNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            isCompleted ? 'text-red-500 fill-red-500' : 'text-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stage Title */}
                  <h4 className="font-black italic uppercase tracking-tight text-base text-white mb-1">
                    {stage.title}
                  </h4>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                    {stage.description}
                  </p>

                  {/* Recommended CP */}
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-3 bg-black/50 px-3 py-1.5 border border-white/5">
                    <span>Rec. CP:</span>
                    <span className={teamCP >= stage.recommendedCP ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                      {stage.recommendedCP.toLocaleString()} CP
                    </span>
                  </div>

                  {/* Enemy Preview */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Threat Roster:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {stage.enemyTeam.map((enemy, eIdx) => (
                        <span
                          key={eIdx}
                          className="text-[10px] font-mono uppercase px-2 py-0.5 bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1"
                        >
                          {enemy.name.split(' ')[0]} <span className="text-red-400">[{enemy.element}]</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* First Clear Rewards */}
                  <div className="pt-2 border-t border-white/10 mb-4">
                    <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Clear Spoils:</span>
                    <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+{stage.firstClearRewards.gold}</span>
                      </div>
                      <div className="flex items-center gap-1 text-cyan-400 font-bold">
                        <Gem className="w-3.5 h-3.5" />
                        <span>+{stage.firstClearRewards.crystals}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-300">
                        <span>+{stage.firstClearRewards.exp} EXP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Launch / Locked Button */}
                {isUnlocked ? (
                  <button
                    onClick={() => handleStageSelect(stage)}
                    className="w-full py-2.5 px-4 font-black italic uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>{isCompleted ? 'Replay Stage' : 'Engage Battle'}</span>
                  </button>
                ) : (
                  <div className="w-full py-2.5 px-4 font-mono text-xs flex items-center justify-center gap-2 bg-black/40 border border-white/5 text-gray-600">
                    <Lock className="w-3.5 h-3.5" />
                    <span>LOCKED // CLEAR PREVIOUS</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Story Cutscene Dialogue Modal - Artistic Flair */}
      {activeDialogue && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-end p-4 sm:p-8">
          <div className="max-w-4xl mx-auto w-full bg-[#0A0A0B] border-2 border-red-600 p-6 sm:p-8 shadow-2xl space-y-4">
            {/* Top Stage Bar & Skip */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-mono text-red-500 uppercase tracking-widest font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>Story Plot Cutscene: {activeDialogue.stage.title}</span>
              </div>
              <button
                onClick={skipDialogue}
                className="text-xs font-mono uppercase tracking-wider text-gray-400 hover:text-white px-3 py-1 bg-white/5 border border-white/10 hover:border-red-600 transition-colors"
              >
                Skip Cutscene ⏭
              </button>
            </div>

            {/* Speaker Portrait & Dialogue Content */}
            <div className="flex items-start gap-4 sm:gap-6 py-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 border border-red-600/80 p-1 shrink-0 flex items-center justify-center">
                {getSpeakerAvatarIcon(activeDialogue.lines[activeDialogue.currentIndex].avatar)}
              </div>

              <div className="space-y-1.5 flex-1">
                <h4 className="font-black italic uppercase text-lg sm:text-xl text-white">
                  {activeDialogue.lines[activeDialogue.currentIndex].speaker}
                </h4>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-sans">
                  "{activeDialogue.lines[activeDialogue.currentIndex].text}"
                </p>
              </div>
            </div>

            {/* Bottom Progress & Advance Button */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono text-gray-400">
              <span>SEQUENCE: {activeDialogue.currentIndex + 1} / {activeDialogue.lines.length}</span>
              <button
                onClick={advanceDialogue}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-wider shadow-lg shadow-red-600/40 transition-all cursor-pointer"
              >
                <span>{activeDialogue.currentIndex === activeDialogue.lines.length - 1 ? 'Engage Battle' : 'Continue'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

