import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlayerProfile, Fighter, Equipment, Rune, CampaignStage, BattleState } from '../types/game';
import { INITIAL_ROSTER } from '../data/characters';
import { INITIAL_EQUIPMENT_LIST, INITIAL_RUNES_LIST } from '../data/items';
import { CREST_SHARDS } from '../data/campaign';
import { initializeBattle, executeAction } from '../utils/battleEngine';
import { driveService } from '../services/driveService';
import { soundFX } from '../utils/audio';
import confetti from 'canvas-confetti';

interface GameContextType {
  profile: PlayerProfile;
  activeTab: 'campaign' | 'roster' | 'formation' | 'arena' | 'forge' | 'codex' | 'battle';
  setActiveTab: (tab: 'campaign' | 'roster' | 'formation' | 'arena' | 'forge' | 'codex' | 'battle') => void;
  selectedFighter: Fighter | null;
  setSelectedFighter: (f: Fighter | null) => void;
  battleState: BattleState | null;
  startBattle: (playerFighters: Fighter[], enemyFighters: Fighter[], stageInfo?: CampaignStage) => void;
  performBattleAction: (actorId: string, skill: any, targetId?: string) => void;
  exitBattle: (claimRewards?: boolean) => void;
  toggleAutoBattle: () => void;
  setBattleSpeed: (speed: 1 | 2) => void;
  upgradeFighterLevel: (fighterId: string) => boolean;
  upgradeFighterSkill: (fighterId: string, skillId: string) => boolean;
  equipItem: (fighterId: string, item: Equipment) => void;
  unequipItem: (fighterId: string, slot: 'weapon' | 'armor' | 'accessory') => void;
  equipRune: (fighterId: string, rune: Rune) => void;
  unequipRune: (fighterId: string, runeId: string) => void;
  updateFormation: (newFormation: string[]) => void;
  craftEquipment: (recipe: any) => boolean;
  syncToGoogleDrive: () => Promise<boolean>;
  loadFromGoogleDrive: () => Promise<boolean>;
  isDriveSyncing: boolean;
  driveSyncStatus: { connected: boolean; lastSynced?: string; error?: string };
  isDriveModalOpen: boolean;
  setIsDriveModalOpen: (open: boolean) => void;
  isMuted: boolean;
  toggleMute: () => void;
  resetGameProgress: () => void;
}

const LOCAL_STORAGE_KEY = 'fate_of_fighters_player_profile_v1';

const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Champion of Aethelgard',
  level: 1,
  gold: 2500,
  crystals: 300,
  stamina: 100,
  maxStamina: 100,
  roster: INITIAL_ROSTER,
  formation: ['ignis', 'valeria', 'terran', 'zephyr', 'aurelia', 'malakor'], // 3 Front, 3 Back
  inventory: {
    equipment: INITIAL_EQUIPMENT_LIST,
    runes: INITIAL_RUNES_LIST,
    materials: {
      pyros_ember: 5,
      glacial_shard: 5,
      tempest_feather: 8,
      sunstone_crystal: 4,
      void_matter: 3,
      tectonic_slate: 6,
    },
  },
  campaignProgress: {
    completedStageIds: [],
    stageStars: {},
    unlockedActs: ['act_prologue'],
  },
  shards: CREST_SHARDS,
  arenaStats: {
    bossRushHighScore: 0,
    endlessWaveRecord: 0,
    totalVictories: 0,
  },
  lastSavedAt: new Date().toISOString(),
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return DEFAULT_PROFILE;
  });

  const [activeTab, setActiveTab] = useState<'campaign' | 'roster' | 'formation' | 'arena' | 'forge' | 'codex' | 'battle'>('campaign');
  const [selectedFighter, setSelectedFighter] = useState<Fighter | null>(INITIAL_ROSTER[0]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState<{ connected: boolean; lastSynced?: string; error?: string }>({
    connected: driveService.isConnected(),
  });

  // Save to local storage on changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  // Recalculate fighter stats with level, equipment, and runes
  const calculateFighterStats = (fighter: Fighter) => {
    const lvlMultiplier = 1 + (fighter.level - 1) * 0.12;
    const base = fighter.baseStats;

    let atk = Math.round(base.atk * lvlMultiplier);
    let def = Math.round(base.def * lvlMultiplier);
    let maxHp = Math.round(base.maxHp * lvlMultiplier);
    let spd = base.spd;
    let critRate = base.critRate;
    let critDmg = base.critDmg;

    // Add equipment stats
    Object.values(fighter.equipment).forEach(eq => {
      if (!eq) return;
      if (eq.stats.atk) atk += eq.stats.atk;
      if (eq.stats.def) def += eq.stats.def;
      if (eq.stats.hp) maxHp += eq.stats.hp;
      if (eq.stats.spd) spd += eq.stats.spd;
      if (eq.stats.critRate) critRate += eq.stats.critRate;
      if (eq.stats.critDmg) critDmg += eq.stats.critDmg;
    });

    // Add rune stats
    fighter.runes.forEach(r => {
      if (r.bonusStat === 'atk') atk += r.bonusValue;
      if (r.bonusStat === 'def') def += r.bonusValue;
      if (r.bonusStat === 'hp') maxHp += r.bonusValue;
      if (r.bonusStat === 'spd') spd += r.bonusValue;
      if (r.bonusStat === 'critRate') critRate += r.bonusValue;
      if (r.bonusStat === 'critDmg') critDmg += r.bonusValue;
    });

    return {
      hp: maxHp,
      maxHp,
      atk,
      def,
      spd,
      critRate,
      critDmg,
      energy: 0,
      maxEnergy: 100,
    };
  };

  const toggleMute = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  const upgradeFighterLevel = (fighterId: string): boolean => {
    const cost = 200;
    if (profile.gold < cost) return false;

    setProfile(prev => {
      const updatedRoster = prev.roster.map(f => {
        if (f.id !== fighterId) return f;
        const newLevel = f.level + 1;
        const updatedFighter = {
          ...f,
          level: newLevel,
          xp: 0,
          xpToNextLevel: Math.round(100 * Math.pow(1.25, newLevel)),
        };
        updatedFighter.currentStats = calculateFighterStats(updatedFighter);
        return updatedFighter;
      });

      const updatedSelected = updatedRoster.find(f => f.id === fighterId) || null;
      if (selectedFighter?.id === fighterId) {
        setSelectedFighter(updatedSelected);
      }

      return {
        ...prev,
        gold: prev.gold - cost,
        roster: updatedRoster,
      };
    });

    soundFX.playLevelUp();
    return true;
  };

  const upgradeFighterSkill = (fighterId: string, skillId: string): boolean => {
    const cost = 350;
    if (profile.gold < cost) return false;

    setProfile(prev => {
      const updatedRoster = prev.roster.map(f => {
        if (f.id !== fighterId) return f;
        return {
          ...f,
          skills: f.skills.map(s => {
            if (s.id !== skillId || s.level >= s.maxLevel) return s;
            return {
              ...s,
              level: s.level + 1,
              damageMultiplier: s.damageMultiplier ? +(s.damageMultiplier * 1.15).toFixed(2) : undefined,
              healMultiplier: s.healMultiplier ? +(s.healMultiplier * 1.15).toFixed(2) : undefined,
              shieldMultiplier: s.shieldMultiplier ? +(s.shieldMultiplier * 1.15).toFixed(2) : undefined,
            };
          }),
        };
      });

      const updatedSelected = updatedRoster.find(f => f.id === fighterId) || null;
      if (selectedFighter?.id === fighterId) {
        setSelectedFighter(updatedSelected);
      }

      return {
        ...prev,
        gold: prev.gold - cost,
        roster: updatedRoster,
      };
    });

    soundFX.playLevelUp();
    return true;
  };

  const equipItem = (fighterId: string, item: Equipment) => {
    setProfile(prev => {
      const updatedRoster = prev.roster.map(f => {
        if (f.id !== fighterId) return f;
        const currentEquip = f.equipment[item.slot];
        const updatedEquipment = { ...f.equipment, [item.slot]: item };
        const updatedFighter = { ...f, equipment: updatedEquipment };
        updatedFighter.currentStats = calculateFighterStats(updatedFighter);
        return updatedFighter;
      });

      // Remove from inventory
      const updatedInventoryEquip = prev.inventory.equipment.filter(e => e.id !== item.id);
      return {
        ...prev,
        roster: updatedRoster,
        inventory: { ...prev.inventory, equipment: updatedInventoryEquip },
      };
    });
    soundFX.playClick();
  };

  const unequipItem = (fighterId: string, slot: 'weapon' | 'armor' | 'accessory') => {
    setProfile(prev => {
      let unequippedItem: Equipment | undefined;
      const updatedRoster = prev.roster.map(f => {
        if (f.id !== fighterId) return f;
        unequippedItem = f.equipment[slot];
        const updatedEquipment = { ...f.equipment };
        delete updatedEquipment[slot];
        const updatedFighter = { ...f, equipment: updatedEquipment };
        updatedFighter.currentStats = calculateFighterStats(updatedFighter);
        return updatedFighter;
      });

      if (!unequippedItem) return prev;
      return {
        ...prev,
        roster: updatedRoster,
        inventory: {
          ...prev.inventory,
          equipment: [...prev.inventory.equipment, unequippedItem],
        },
      };
    });
    soundFX.playClick();
  };

  const equipRune = (fighterId: string, rune: Rune) => {
    setProfile(prev => {
      const updatedRoster = prev.roster.map(f => {
        if (f.id !== fighterId || f.runes.length >= 3) return f;
        const updatedRunes = [...f.runes, rune];
        const updatedFighter = { ...f, runes: updatedRunes };
        updatedFighter.currentStats = calculateFighterStats(updatedFighter);
        return updatedFighter;
      });

      const updatedInventoryRunes = prev.inventory.runes.filter(r => r.id !== rune.id);
      return {
        ...prev,
        roster: updatedRoster,
        inventory: { ...prev.inventory, runes: updatedInventoryRunes },
      };
    });
    soundFX.playClick();
  };

  const unequipRune = (fighterId: string, runeId: string) => {
    setProfile(prev => {
      let removedRune: Rune | undefined;
      const updatedRoster = prev.roster.map(f => {
        if (f.id !== fighterId) return f;
        removedRune = f.runes.find(r => r.id === runeId);
        const updatedRunes = f.runes.filter(r => r.id !== runeId);
        const updatedFighter = { ...f, runes: updatedRunes };
        updatedFighter.currentStats = calculateFighterStats(updatedFighter);
        return updatedFighter;
      });

      if (!removedRune) return prev;
      return {
        ...prev,
        roster: updatedRoster,
        inventory: {
          ...prev.inventory,
          runes: [...prev.inventory.runes, removedRune],
        },
      };
    });
    soundFX.playClick();
  };

  const updateFormation = (newFormation: string[]) => {
    setProfile(prev => ({
      ...prev,
      formation: newFormation,
    }));
    soundFX.playClick();
  };

  const craftEquipment = (recipe: any): boolean => {
    if (profile.gold < recipe.goldCost) return false;
    for (const mat of recipe.requiredMaterials) {
      if ((profile.inventory.materials[mat.materialId] || 0) < mat.count) {
        return false;
      }
    }

    setProfile(prev => {
      const updatedMats = { ...prev.inventory.materials };
      recipe.requiredMaterials.forEach((mat: any) => {
        updatedMats[mat.materialId] -= mat.count;
      });

      return {
        ...prev,
        gold: prev.gold - recipe.goldCost,
        inventory: {
          ...prev.inventory,
          materials: updatedMats,
          equipment: recipe.type === 'equipment' ? [...prev.inventory.equipment, recipe.resultItem] : prev.inventory.equipment,
          runes: recipe.type === 'rune' ? [...prev.inventory.runes, recipe.resultItem] : prev.inventory.runes,
        },
      };
    });

    soundFX.playLevelUp();
    return true;
  };

  const startBattle = (playerFighters: Fighter[], enemyFighters: Fighter[], stageInfo?: CampaignStage) => {
    // Populate full stats for battle
    const readyPlayerTeam = playerFighters.map(f => ({
      ...f,
      currentStats: calculateFighterStats(f),
    }));

    const newBattle = initializeBattle(readyPlayerTeam, enemyFighters, stageInfo);
    setBattleState(newBattle);
    setActiveTab('battle');
  };

  const performBattleAction = (actorId: string, skill: any, targetId?: string) => {
    if (!battleState || battleState.isBattleOver) return;
    const nextState = executeAction(battleState, actorId, skill, targetId);
    setBattleState(nextState);

    // Auto trigger victory confetti
    if (nextState.isBattleOver && nextState.winner === 'player') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const toggleAutoBattle = () => {
    if (!battleState) return;
    setBattleState(prev => prev ? { ...prev, isAutoBattle: !prev.isAutoBattle } : null);
  };

  const setBattleSpeed = (speed: 1 | 2) => {
    if (!battleState) return;
    setBattleState(prev => prev ? { ...prev, speedMultiplier: speed } : null);
  };

  const exitBattle = (claimRewards: boolean = true) => {
    if (battleState && claimRewards && battleState.winner === 'player' && battleState.stageInfo) {
      const stage = battleState.stageInfo;
      const isFirstClear = !profile.campaignProgress.completedStageIds.includes(stage.id);
      const rewards = isFirstClear ? stage.firstClearRewards : stage.repeatRewards;

      setProfile(prev => {
        const completedIds = Array.from(new Set([...prev.campaignProgress.completedStageIds, stage.id]));
        const starsMap = { ...prev.campaignProgress.stageStars, [stage.id]: 3 };

        // Shard unlock
        let updatedShards = [...prev.shards];
        if (stage.firstClearRewards.shardId) {
          updatedShards = updatedShards.map(s => s.id === stage.firstClearRewards.shardId ? { ...s, isUnlocked: true } : s);
        }

        // Add Exp to all roster members
        const updatedRoster = prev.roster.map(f => {
          const expGain = rewards.exp;
          let newXp = f.xp + expGain;
          let newLvl = f.level;
          let xpNeeded = f.xpToNextLevel;

          while (newXp >= xpNeeded) {
            newXp -= xpNeeded;
            newLvl += 1;
            xpNeeded = Math.round(100 * Math.pow(1.25, newLvl));
          }

          const updatedF = { ...f, level: newLvl, xp: newXp, xpToNextLevel: xpNeeded };
          updatedF.currentStats = calculateFighterStats(updatedF);
          return updatedF;
        });

        // Add materials drop
        const newMats = { ...prev.inventory.materials };
        newMats.pyros_ember = (newMats.pyros_ember || 0) + 2;
        newMats.glacial_shard = (newMats.glacial_shard || 0) + 2;
        newMats.tempest_feather = (newMats.tempest_feather || 0) + 2;

        return {
          ...prev,
          gold: prev.gold + rewards.gold,
          crystals: prev.crystals + (rewards.crystals || 0),
          roster: updatedRoster,
          shards: updatedShards,
          inventory: { ...prev.inventory, materials: newMats },
          campaignProgress: {
            ...prev.campaignProgress,
            completedStageIds: completedIds,
            stageStars: starsMap,
          },
          arenaStats: {
            ...prev.arenaStats,
            totalVictories: prev.arenaStats.totalVictories + 1,
          },
        };
      });
    }

    setBattleState(null);
    setActiveTab('campaign');
  };

  // Google Drive Cloud Synchronization
  const syncToGoogleDrive = async (): Promise<boolean> => {
    setIsDriveSyncing(true);
    setDriveSyncStatus(prev => ({ ...prev, error: undefined }));
    try {
      if (!driveService.isConnected()) {
        await driveService.requestDriveAccess();
      }
      await driveService.saveToDrive(profile);
      const timestamp = new Date().toLocaleTimeString();
      setDriveSyncStatus({ connected: true, lastSynced: timestamp });
      setIsDriveSyncing(false);
      return true;
    } catch (err: any) {
      setDriveSyncStatus({ connected: false, error: err.message });
      setIsDriveSyncing(false);
      return false;
    }
  };

  const loadFromGoogleDrive = async (): Promise<boolean> => {
    setIsDriveSyncing(true);
    setDriveSyncStatus(prev => ({ ...prev, error: undefined }));
    try {
      if (!driveService.isConnected()) {
        await driveService.requestDriveAccess();
      }
      const remoteProfile = await driveService.loadFromDrive();
      setProfile(remoteProfile);
      setSelectedFighter(remoteProfile.roster[0] || null);
      const timestamp = new Date().toLocaleTimeString();
      setDriveSyncStatus({ connected: true, lastSynced: timestamp });
      setIsDriveSyncing(false);
      soundFX.playVictoryFanfare();
      return true;
    } catch (err: any) {
      setDriveSyncStatus({ connected: false, error: err.message });
      setIsDriveSyncing(false);
      return false;
    }
  };

  const resetGameProgress = () => {
    setProfile(DEFAULT_PROFILE);
    setSelectedFighter(DEFAULT_PROFILE.roster[0]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    soundFX.playClick();
  };

  // Auto-battle loop tick
  useEffect(() => {
    if (!battleState || !battleState.isAutoBattle || battleState.isBattleOver) return;

    const timeout = setTimeout(() => {
      const activeFighter = [...battleState.playerTeam, ...battleState.enemyTeam].find(f => f.id === battleState.activeFighterId);
      if (!activeFighter || !activeFighter.isAlive) {
        return;
      }

      // Pick ultimate if ready, otherwise available active skill
      let chosenSkill = activeFighter.skills.find(s => s.type === 'Ultimate' && activeFighter.currentStats.energy >= (s.energyCost || 100));
      if (!chosenSkill) {
        chosenSkill = activeFighter.skills.find(s => s.type === 'Active' && (!s.currentCooldown || s.currentCooldown === 0)) || activeFighter.skills[0];
      }

      performBattleAction(activeFighter.id, chosenSkill);
    }, 1200 / battleState.speedMultiplier);

    return () => clearTimeout(timeout);
  }, [battleState]);

  return (
    <GameContext.Provider
      value={{
        profile,
        activeTab,
        setActiveTab,
        selectedFighter,
        setSelectedFighter,
        battleState,
        startBattle,
        performBattleAction,
        exitBattle,
        toggleAutoBattle,
        setBattleSpeed,
        upgradeFighterLevel,
        upgradeFighterSkill,
        equipItem,
        unequipItem,
        equipRune,
        unequipRune,
        updateFormation,
        craftEquipment,
        syncToGoogleDrive,
        loadFromGoogleDrive,
        isDriveSyncing,
        driveSyncStatus,
        isDriveModalOpen,
        setIsDriveModalOpen,
        isMuted,
        toggleMute,
        resetGameProgress,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
