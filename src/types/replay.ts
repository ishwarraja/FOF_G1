import { FighterActionState, CombatControlScenario } from './fighting';

export interface ReplayFighterFrame {
  x: number;
  y: number;
  hp: number;
  superMeter: number;
  state: FighterActionState;
  facing: 1 | -1;
  isBlocking: boolean;
  isMaxMode: boolean;
  moveName?: string;
  inputs: string[];
}

export interface ReplayEvent {
  frame: number;
  type: 'HIT' | 'SUPER' | 'BLOCK' | 'KNOCKDOWN' | 'SPECIAL' | 'TAUNT' | 'CLIMAX' | 'KO';
  x: number;
  y: number;
  damage?: number;
  text?: string;
  isCrit?: boolean;
  attacker: 'p1' | 'p2';
}

export interface ReplayFrame {
  frameIndex: number;
  roundTimer: number;
  p1: ReplayFighterFrame;
  p2: ReplayFighterFrame;
  events?: ReplayEvent[];
}

export interface MatchReplayData {
  id: string;
  title: string;
  createdAt: number;
  stageId: string;
  customBgUrl?: string;
  p1Character: {
    id: string;
    name: string;
    avatarUrl?: string;
    avatarColor: string;
    signatureWeapon?: string;
  };
  p2Character: {
    id: string;
    name: string;
    avatarUrl?: string;
    avatarColor: string;
    signatureWeapon?: string;
  };
  winner: 'p1' | 'p2' | 'draw';
  p1FinalHp: number;
  p2FinalHp: number;
  maxHp: number;
  isPerfect: boolean;
  durationSeconds: number;
  totalFrames: number;
  fps: number; // typically 30 (recorded every 2 ticks)
  maxComboP1: number;
  maxComboP2: number;
  totalDamageP1: number;
  totalDamageP2: number;
  controlScenario: CombatControlScenario;
  mode: string;
  frames: ReplayFrame[];
  isPreset?: boolean;
}
