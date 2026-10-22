import { MatchReplayData, ReplayFrame, ReplayEvent, ReplayFighterFrame } from '../types/replay';
import { FightingEntity, CombatControlScenario } from '../types/fighting';

const STORAGE_SAVED_REPLAYS = 'fof_saved_replays_v1';
const STORAGE_LAST_REPLAY = 'fof_last_match_replay_v1';

export class MatchReplayRecorder {
  private active = false;
  private frames: ReplayFrame[] = [];
  private events: ReplayEvent[] = [];
  private meta: Partial<MatchReplayData> = {};
  private startTime = 0;
  private frameCounter = 0;
  private sampleRate = 2; // Capture every 2 game ticks (~30 FPS recording)
  private maxFrames = 1800; // 60 seconds max replay buffer
  private maxComboP1 = 0;
  private maxComboP2 = 0;
  private totalDamageP1 = 0;
  private totalDamageP2 = 0;

  public start(params: {
    stageId: string;
    customBgUrl?: string;
    p1: FightingEntity;
    p2: FightingEntity;
    controlScenario?: CombatControlScenario;
    mode?: string;
  }) {
    this.active = true;
    this.frames = [];
    this.events = [];
    this.frameCounter = 0;
    this.startTime = Date.now();
    this.maxComboP1 = 0;
    this.maxComboP2 = 0;
    this.totalDamageP1 = 0;
    this.totalDamageP2 = 0;

    this.meta = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `${params.p1.character.name} vs ${params.p2.character.name}`,
      createdAt: Date.now(),
      stageId: params.stageId,
      customBgUrl: params.customBgUrl,
      p1Character: {
        id: params.p1.character.id,
        name: params.p1.character.name,
        avatarUrl: params.p1.character.avatarUrl || params.p1.character.customImageUrl,
        avatarColor: params.p1.character.avatarColor,
        signatureWeapon: params.p1.character.signatureWeapon,
      },
      p2Character: {
        id: params.p2.character.id,
        name: params.p2.character.name,
        avatarUrl: params.p2.character.avatarUrl || params.p2.character.customImageUrl,
        avatarColor: params.p2.character.avatarColor,
        signatureWeapon: params.p2.character.signatureWeapon,
      },
      maxHp: params.p1.maxHp,
      controlScenario: params.controlScenario || 'USER_VS_CPU',
      mode: params.mode || 'ARCADE_3V3',
      fps: 30,
    };
  }

  public recordTick(
    p1: FightingEntity,
    p2: FightingEntity,
    roundTimer: number,
    p1Inputs: string[] = [],
    p2Inputs: string[] = []
  ) {
    if (!this.active) return;
    this.frameCounter++;

    // Track combo peaks
    if (p1.comboHits > this.maxComboP1) this.maxComboP1 = p1.comboHits;
    if (p2.comboHits > this.maxComboP2) this.maxComboP2 = p2.comboHits;

    // Only sample at desired rate to ensure low memory footprint
    if (this.frameCounter % this.sampleRate !== 0) return;
    if (this.frames.length >= this.maxFrames) return;

    // Pending events for this frame
    const frameEvents = this.events.splice(0, this.events.length);

    const f1: ReplayFighterFrame = {
      x: Math.round(p1.x),
      y: Math.round(p1.y),
      hp: Math.max(0, Math.round(p1.hp)),
      superMeter: Math.round(p1.superMeter),
      state: p1.state,
      facing: p1.facing,
      isBlocking: p1.isBlocking,
      isMaxMode: p1.isMaxMode,
      moveName: p1.currentMove?.name,
      inputs: [...p1Inputs],
    };

    const f2: ReplayFighterFrame = {
      x: Math.round(p2.x),
      y: Math.round(p2.y),
      hp: Math.max(0, Math.round(p2.hp)),
      superMeter: Math.round(p2.superMeter),
      state: p2.state,
      facing: p2.facing,
      isBlocking: p2.isBlocking,
      isMaxMode: p2.isMaxMode,
      moveName: p2.currentMove?.name,
      inputs: [...p2Inputs],
    };

    this.frames.push({
      frameIndex: this.frames.length,
      roundTimer,
      p1: f1,
      p2: f2,
      events: frameEvents.length > 0 ? frameEvents : undefined,
    });
  }

  public logEvent(event: Omit<ReplayEvent, 'frame'>) {
    if (!this.active) return;
    const fullEvent: ReplayEvent = {
      ...event,
      frame: this.frames.length,
    };
    this.events.push(fullEvent);

    if (event.damage) {
      if (event.attacker === 'p1') {
        this.totalDamageP1 += event.damage;
      } else {
        this.totalDamageP2 += event.damage;
      }
    }
  }

  public finish(winner: 'p1' | 'p2' | 'draw', isPerfect = false): MatchReplayData | null {
    if (!this.active || this.frames.length < 5) {
      this.active = false;
      return null;
    }

    const lastFrame = this.frames[this.frames.length - 1];
    const duration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    const replay: MatchReplayData = {
      id: this.meta.id || `rep_${Date.now()}`,
      title: this.meta.title || 'FOF Battle Match',
      createdAt: this.meta.createdAt || Date.now(),
      stageId: this.meta.stageId || 'neon_hangar',
      customBgUrl: this.meta.customBgUrl,
      p1Character: this.meta.p1Character!,
      p2Character: this.meta.p2Character!,
      winner,
      p1FinalHp: lastFrame?.p1.hp ?? 0,
      p2FinalHp: lastFrame?.p2.hp ?? 0,
      maxHp: this.meta.maxHp || 1000,
      isPerfect,
      durationSeconds: duration,
      totalFrames: this.frames.length,
      fps: 30,
      maxComboP1: this.maxComboP1,
      maxComboP2: this.maxComboP2,
      totalDamageP1: this.totalDamageP1,
      totalDamageP2: this.totalDamageP2,
      controlScenario: this.meta.controlScenario || 'USER_VS_CPU',
      mode: this.meta.mode || 'ARCADE_3V3',
      frames: this.frames,
    };

    this.active = false;

    // Cache automatically as the last played match
    setLastMatchReplay(replay);

    return replay;
  }

  public isRecording(): boolean {
    return this.active;
  }

  public isCurrentlyRecording(): boolean {
    return this.active;
  }

  public abort() {
    this.active = false;
    this.frames = [];
    this.events = [];
  }
}

export const activeReplayRecorder = new MatchReplayRecorder();

// Persistence Helpers
export function getSavedReplays(): MatchReplayData[] {
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_REPLAYS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load saved replays:', err);
    return [];
  }
}

export function saveReplay(replay: MatchReplayData): boolean {
  try {
    const replays = getSavedReplays();
    // Prepend new replay, avoid duplicates
    const filtered = replays.filter(r => r.id !== replay.id);
    // Keep max 20 saved replays to preserve storage
    const updated = [replay, ...filtered].slice(0, 20);
    localStorage.setItem(STORAGE_SAVED_REPLAYS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('fof-replays-updated'));
    return true;
  } catch (err) {
    console.error('Failed to save replay to storage:', err);
    return false;
  }
}

export function deleteReplay(id: string): void {
  try {
    const replays = getSavedReplays();
    const updated = replays.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_SAVED_REPLAYS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('fof-replays-updated'));
  } catch (err) {
    console.error('Failed to delete replay:', err);
  }
}

export function getLastMatchReplay(): MatchReplayData | null {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_REPLAY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to get last match replay:', err);
    return null;
  }
}

export function setLastMatchReplay(replay: MatchReplayData): void {
  try {
    localStorage.setItem(STORAGE_LAST_REPLAY, JSON.stringify(replay));
    window.dispatchEvent(new CustomEvent('fof-replays-updated'));
  } catch (err) {
    console.error('Failed to set last match replay:', err);
  }
}

export function exportReplayAsJson(replay: MatchReplayData): void {
  const jsonStr = JSON.stringify(replay, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = replay.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `FOF_Replay_${safeTitle}_${replay.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importReplayFromJson(jsonStr: string): MatchReplayData | null {
  try {
    const parsed = JSON.parse(jsonStr) as MatchReplayData;
    if (!parsed.id || !parsed.p1Character || !parsed.p2Character || !Array.isArray(parsed.frames)) {
      throw new Error('Invalid replay structure');
    }
    saveReplay(parsed);
    return parsed;
  } catch (err) {
    console.error('Failed to import replay:', err);
    return null;
  }
}

// Built-in high-quality preset showcases
export function getPresetShowcaseReplays(): MatchReplayData[] {
  const now = Date.now();

  // Helper to generate animated replay frames
  const buildFrames = (
    p1Name: string,
    p2Name: string,
    winner: 'p1' | 'p2',
    durationSeconds = 12
  ): ReplayFrame[] => {
    const totalFrames = durationSeconds * 30;
    const frames: ReplayFrame[] = [];
    let p1Hp = 1000;
    let p2Hp = 1000;
    let p1Meter = 0;
    let p2Meter = 0;

    let p1X = 250;
    let p2X = 750;

    for (let i = 0; i < totalFrames; i++) {
      const progress = i / totalFrames;
      const roundTimer = Math.max(1, Math.round(60 - progress * durationSeconds));

      // Natural fighter approach & dance
      if (progress < 0.2) {
        p1X = 250 + Math.sin(i * 0.1) * 30 + progress * 800;
        p2X = 750 - Math.cos(i * 0.1) * 30 - progress * 800;
      } else if (progress < 0.8) {
        p1X = 420 + Math.sin(i * 0.15) * 50;
        p2X = 580 - Math.sin(i * 0.15) * 40;
      } else {
        p1X = winner === 'p1' ? 460 : 400;
        p2X = winner === 'p1' ? 620 : 540;
      }

      // Meter buildup
      p1Meter = Math.min(300, Math.round(progress * 280));
      p2Meter = Math.min(300, Math.round(progress * 240));

      // Health decrease
      if (winner === 'p1') {
        p2Hp = Math.max(0, Math.round(1000 - Math.pow(progress, 1.2) * 1000));
        p1Hp = Math.max(340, Math.round(1000 - Math.pow(progress, 1.4) * 660));
      } else {
        p1Hp = Math.max(0, Math.round(1000 - Math.pow(progress, 1.2) * 1000));
        p2Hp = Math.max(280, Math.round(1000 - Math.pow(progress, 1.4) * 720));
      }

      // States and attacks
      let p1State: any = 'IDLE';
      let p2State: any = 'IDLE';
      let p1Inputs: string[] = [];
      let p2Inputs: string[] = [];
      const events: ReplayEvent[] = [];

      const cycle = i % 45;
      if (cycle < 10) {
        p1State = 'WALK_FWD';
        p1Inputs = ['→'];
      } else if (cycle < 16) {
        p1State = 'ATTACK_LP';
        p1Inputs = ['→', 'LP'];
        if (cycle === 12 && progress < 0.9) {
          events.push({
            frame: i,
            type: 'HIT',
            x: (p1X + p2X) / 2,
            y: 70,
            damage: 45,
            text: '45 DMG',
            attacker: 'p1',
          });
        }
      } else if (cycle < 25) {
        p2State = 'ATTACK_HK';
        p2Inputs = ['←', 'HK'];
        if (cycle === 20 && progress < 0.8) {
          events.push({
            frame: i,
            type: 'HIT',
            x: (p1X + p2X) / 2,
            y: 80,
            damage: 85,
            text: 'COUNTER 85',
            isCrit: true,
            attacker: 'p2',
          });
        }
      } else if (cycle < 35 && progress > 0.4 && progress < 0.75) {
        p1State = 'SUPER';
        p1Inputs = ['↓', '↘', '→', 'SUPER'];
        if (cycle === 30) {
          events.push({
            frame: i,
            type: 'SUPER',
            x: p1X,
            y: 110,
            damage: 220,
            text: 'SUPER ART 220 DMG',
            attacker: 'p1',
          });
        }
      } else {
        p1State = 'IDLE';
        p2State = 'IDLE';
      }

      // Knockdown at end
      if (progress > 0.92) {
        if (winner === 'p1') {
          p2State = 'KNOCKDOWN';
          p1State = 'VICTORY';
        } else {
          p1State = 'KNOCKDOWN';
          p2State = 'VICTORY';
        }
      }

      frames.push({
        frameIndex: i,
        roundTimer,
        p1: {
          x: Math.round(p1X),
          y: cycle > 28 && cycle < 34 ? 75 : 0,
          hp: p1Hp,
          superMeter: p1Meter,
          state: p1State,
          facing: p1X <= p2X ? 1 : -1,
          isBlocking: cycle >= 20 && cycle <= 24,
          isMaxMode: progress > 0.65 && progress < 0.85,
          moveName: p1State === 'SUPER' ? 'REBAR METEOR CRUSH' : undefined,
          inputs: p1Inputs,
        },
        p2: {
          x: Math.round(p2X),
          y: 0,
          hp: p2Hp,
          superMeter: p2Meter,
          state: p2State,
          facing: p2X >= p1X ? -1 : 1,
          isBlocking: cycle >= 12 && cycle <= 15,
          isMaxMode: false,
          moveName: p2State === 'ATTACK_HK' ? 'CYBER TACTICAL KICK' : undefined,
          inputs: p2Inputs,
        },
        events: events.length > 0 ? events : undefined,
      });
    }

    return frames;
  };

  const showcase1: MatchReplayData = {
    id: 'preset_showcase_arjun_steele',
    title: 'EVO SHOWCASE: Arjun vs Steele [Rebar Climax Comeback]',
    createdAt: now - 3600000 * 2,
    stageId: 'industrial_foundry',
    p1Character: {
      id: 'arjun',
      name: 'Arjun',
      avatarColor: '#f59e0b',
      signatureWeapon: 'Forged Industrial Heavy Wrench',
    },
    p2Character: {
      id: 'steele',
      name: 'Steele',
      avatarColor: '#38bdf8',
      signatureWeapon: 'Tactical Cyber Sidearm',
    },
    winner: 'p1',
    p1FinalHp: 340,
    p2FinalHp: 0,
    maxHp: 1000,
    isPerfect: false,
    durationSeconds: 14,
    totalFrames: 14 * 30,
    fps: 30,
    maxComboP1: 18,
    maxComboP2: 9,
    totalDamageP1: 1000,
    totalDamageP2: 660,
    controlScenario: 'USER_VS_CPU',
    mode: '1v1_SINGLE',
    isPreset: true,
    frames: buildFrames('Arjun', 'Steele', 'p1', 14),
  };

  const showcase2: MatchReplayData = {
    id: 'preset_showcase_elena_david',
    title: 'MASTER DUEL: Elena vs David [Sub-Zero Ice Lotus Perfect]',
    createdAt: now - 3600000 * 12,
    stageId: 'shrine_gates',
    p1Character: {
      id: 'elena',
      name: 'Elena',
      avatarColor: '#06b6d4',
      signatureWeapon: 'Crystalline Ice Katars',
    },
    p2Character: {
      id: 'david',
      name: 'David',
      avatarColor: '#38bdf8',
      signatureWeapon: 'Police Baton & Shield',
    },
    winner: 'p1',
    p1FinalHp: 1000,
    p2FinalHp: 0,
    maxHp: 1000,
    isPerfect: true,
    durationSeconds: 12,
    totalFrames: 12 * 30,
    fps: 30,
    maxComboP1: 24,
    maxComboP2: 2,
    totalDamageP1: 1000,
    totalDamageP2: 0,
    controlScenario: 'USER_VS_CPU',
    mode: 'ARCADE_3V3',
    isPreset: true,
    frames: buildFrames('Elena', 'David', 'p1', 12),
  };

  return [showcase1, showcase2];
}
