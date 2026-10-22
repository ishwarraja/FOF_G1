import { FOF_CHARACTERS, FOF_BOSSES } from './fightingMoves';
import { FofFighterStats } from '../types/fighting';

export interface StoryDialogue {
  speaker: string;
  avatarColor: string;
  portraitLetter: string;
  text: string;
  side: 'left' | 'right';
}

export interface StoryChapter {
  id: string;
  actTitle: string;
  actSubtitle: string;
  stageId: string;
  storyIntroText: string;
  dialogueBefore: StoryDialogue[];
  playerTeam: FofFighterStats[];
  enemyTeam: FofFighterStats[];
  dialogueVictory: StoryDialogue[];
  biometricSyncCost: number; // builds Cassian's AI adaptation
  rewardTitle: string;
  rewardDescription: string;
}

export const STORY_CAMPAIGN_ACTS: StoryChapter[] = [
  {
    id: 'act_1',
    actTitle: 'Act I: The Manufactured Collapse',
    actSubtitle: 'Sector 7 Quarantine Outskirts: The Chemical Leash',
    stageId: 'stage_sector7_quarantine',
    storyIntroText: 'Over ten years, economic warfare and manufactured scarcity tore nations apart. A lethal bio-infection known as Aether-Phage eliminated two-thirds of humanity. The Global Hegemony established total monopoly through the mandatory weekly V-Cure. In the rainy outskirts of Sector 7, Arjun Rao intercepts a Hegemony enforcement squad led by Magistrate Alexandra Vance.',
    dialogueBefore: [
      {
        speaker: 'Arjun Rao',
        avatarColor: 'from-amber-600 to-stone-900',
        portraitLetter: 'A',
        text: 'Stand down, Vance! The refugees in Sector 7 are dying because your corporate masters cut their V-Cure rations!',
        side: 'left',
      },
      {
        speaker: 'Alexandra Vance',
        avatarColor: 'from-blue-700 to-slate-950',
        portraitLetter: 'V',
        text: 'Quotas are established by the High Council. Unsanctioned protests in quarantine zones are classified as treason.',
        side: 'right',
      },
      {
        speaker: 'Dr. Elena Rostova',
        avatarColor: 'from-cyan-600 to-indigo-900',
        portraitLetter: 'E',
        text: 'Listen to me, Alexandra! The infection was engineered in Cassian’s private lab eight years ago. The V-Cure isn’t a remedy—it’s a synthetic leash!',
        side: 'left',
      },
      {
        speaker: 'Alexandra Vance',
        avatarColor: 'from-blue-700 to-slate-950',
        portraitLetter: 'V',
        text: 'A dangerous conspiracy theory. Drones, suppress these dissidents immediately!',
        side: 'right',
      },
    ],
    playerTeam: [FOF_CHARACTERS.arjun, FOF_CHARACTERS.elena],
    enemyTeam: [FOF_CHARACTERS.alexandra],
    dialogueVictory: [
      {
        speaker: 'Alexandra Vance',
        avatarColor: 'from-blue-700 to-slate-950',
        portraitLetter: 'V',
        text: 'My tactical drone... disabled?! What did you inject into my telemetry feed?',
        side: 'right',
      },
      {
        speaker: 'David Vance',
        avatarColor: 'from-amber-500 to-slate-900',
        portraitLetter: 'D',
        text: 'Elena’s decrypted Aether Core lab schematics, Alexandra. Read them yourself. Our government was hijacked from within.',
        side: 'left',
      },
      {
        speaker: 'Arjun Rao',
        avatarColor: 'from-amber-600 to-stone-900',
        portraitLetter: 'A',
        text: 'We must enter the FOF Championship in the Central Arena. It’s our only path inside the Spire.',
        side: 'left',
      },
    ],
    biometricSyncCost: 15,
    rewardTitle: 'Encrypted Lab Schematics',
    rewardDescription: 'Proof of engineered Aether-Phage synthesis acquired.',
  },
  {
    id: 'act_2',
    actTitle: 'Act II: The Tournament of Suppression',
    actSubtitle: 'Hegemony Central Arena: The Biometric Harvest',
    stageId: 'stage_hegemony_arena',
    storyIntroText: 'To suppress mounting civil uprisings, Supreme Leader Victor announces the televised FOF Championship, promising permanent cure treatments to the winning faction. While millions watch, CEO Cassian covertly harvests organic combat biometrics to train Aether Core’s next-generation android army.',
    dialogueBefore: [
      {
        speaker: 'Victor (Holo-Feed)',
        avatarColor: 'from-amber-400 to-purple-950',
        portraitLetter: 'V',
        text: 'Welcome, citizens! Through trial in the arena, order is tested. May the most compliant survive.',
        side: 'right',
      },
      {
        speaker: 'General Jonas Steele',
        avatarColor: 'from-zinc-700 to-stone-900',
        portraitLetter: 'S',
        text: 'Keep Victor’s attention on the center ring, Rao. My squad has already breached the lower server relays.',
        side: 'left',
      },
      {
        speaker: 'Leo Silva',
        avatarColor: 'from-emerald-600 to-slate-900',
        portraitLetter: 'L',
        text: 'The crowd is cheering for real fighters, not corporate puppets! Let’s give them a real match!',
        side: 'left',
      },
    ],
    playerTeam: [FOF_CHARACTERS.arjun, FOF_CHARACTERS.steele, FOF_CHARACTERS.david],
    enemyTeam: [FOF_CHARACTERS.leo, FOF_CHARACTERS.rafe, FOF_CHARACTERS.kai],
    dialogueVictory: [
      {
        speaker: 'David Vance',
        avatarColor: 'from-amber-500 to-slate-900',
        portraitLetter: 'D',
        text: 'Signal established! The bio-weapon proof is broadcasting across all 12 satellite sectors right now!',
        side: 'left',
      },
      {
        speaker: 'Cassian (Comms)',
        avatarColor: 'from-purple-600 to-black',
        portraitLetter: 'C',
        text: 'Insolent vermin. Valeria... activate Executive Protocol Delta. Purge the arena command center.',
        side: 'right',
      },
    ],
    biometricSyncCost: 35,
    rewardTitle: 'Global Broadcast Key',
    rewardDescription: 'Global satellite uplink established for Elena’s open-source vaccine upload.',
  },
  {
    id: 'act_3',
    actTitle: 'Act III: Assault on Spire Apex — Valeria Unleashed',
    actSubtitle: 'Aether Core Server Vault: Protocol Delta Activated',
    stageId: 'stage_aether_server_vault',
    storyIntroText: 'Executive assistant Valeria tears away her tailored business attire, revealing a titanium military chassis armed with dual plasma energy blades. Moving with superhuman speed, Unit-0 intercepts the resistance squad to eliminate them before they reach the main console.',
    dialogueBefore: [
      {
        speaker: 'Valeria (Unit-0)',
        avatarColor: 'from-cyan-400 to-black',
        portraitLetter: 'U',
        text: 'Executive Protocol Delta engaged. Organic dissidents identified: Arjun Rao, Jonas Steele, Elena Rostova. Commencing termination.',
        side: 'right',
      },
      {
        speaker: 'Arjun Rao',
        avatarColor: 'from-amber-600 to-stone-900',
        portraitLetter: 'A',
        text: 'She’s not human... she’s an Aether Core combat android!',
        side: 'left',
      },
      {
        speaker: 'General Jonas Steele',
        avatarColor: 'from-zinc-700 to-stone-900',
        portraitLetter: 'S',
        text: 'Hold her in place, Rao! I’m priming the tactical EMP charge directly for her central processing core!',
        side: 'left',
      },
    ],
    playerTeam: [FOF_CHARACTERS.arjun, FOF_CHARACTERS.steele, FOF_CHARACTERS.elena],
    enemyTeam: [FOF_BOSSES.valeria],
    dialogueVictory: [
      {
        speaker: 'General Jonas Steele',
        avatarColor: 'from-zinc-700 to-stone-900',
        portraitLetter: 'S',
        text: 'EMP detonated! Her core is locked down! Move to the Apex Sanctum before Victor overrides the elevator locks!',
        side: 'left',
      },
      {
        speaker: 'Valeria (Unit-0)',
        avatarColor: 'from-cyan-400 to-black',
        portraitLetter: 'U',
        text: 'Core disruption... 87%... warning... Supreme Leader... Victor... waiting above...',
        side: 'right',
      },
    ],
    biometricSyncCost: 50,
    rewardTitle: 'Valeria’s EMP Core Key',
    rewardDescription: 'Aether Core high-level executive security clearance unlocked.',
  },
  {
    id: 'act_4',
    actTitle: 'Act IV: Shattering the Monopoly',
    actSubtitle: 'Spire Apex: Victor — The Supreme Leader',
    stageId: 'stage_spire_apex',
    storyIntroText: 'At the top of the Hegemony Spire, Supreme Leader Victor stands alone in his golden sanctum. Activating his quantum gravity-manipulation gauntlets, he prepares to crush the rebel alliance and reassert his absolute monopoly over reality.',
    dialogueBefore: [
      {
        speaker: 'Victor',
        avatarColor: 'from-amber-400 to-purple-950',
        portraitLetter: 'V',
        text: 'You fight for freedom. But freedom is an anomaly. Out of chaos, I forged order. Sovereign nations failed you, and now you stand before reality’s true architect.',
        side: 'right',
      },
      {
        speaker: 'Arjun Rao',
        avatarColor: 'from-amber-600 to-stone-900',
        portraitLetter: 'A',
        text: 'You killed two-thirds of the world just to sell the remaining survivors their own breath. Your empire ends today!',
        side: 'left',
      },
      {
        speaker: 'Dr. Elena Rostova',
        avatarColor: 'from-cyan-600 to-indigo-900',
        portraitLetter: 'E',
        text: 'The universal vaccine formula is linked to the transmitter! Victor, your monopoly is over!',
        side: 'left',
      },
      {
        speaker: 'Victor',
        avatarColor: 'from-amber-400 to-purple-950',
        portraitLetter: 'V',
        text: 'A formula means nothing if no one survives to synthesize it. BEHOLD THE MONOPOLY BEAM!',
        side: 'right',
      },
    ],
    playerTeam: [FOF_CHARACTERS.arjun, FOF_CHARACTERS.steele, FOF_CHARACTERS.elena],
    enemyTeam: [FOF_BOSSES.victor],
    dialogueVictory: [
      {
        speaker: 'Arjun Rao',
        avatarColor: 'from-amber-600 to-stone-900',
        portraitLetter: 'A',
        text: 'I jammed the steel wrench directly into his gauntlet power core! The gravity matrix is collapsing!',
        side: 'left',
      },
      {
        speaker: 'Victor',
        avatarColor: 'from-amber-400 to-purple-950',
        portraitLetter: 'V',
        text: 'No... NO! The global balance... without me... the world will devolve into chaos...',
        side: 'right',
      },
      {
        speaker: 'Dr. Elena Rostova',
        avatarColor: 'from-cyan-600 to-indigo-900',
        portraitLetter: 'E',
        text: 'Universal open-source vaccine upload: 100% COMPLETE! Automated fabricators worldwide are producing the permanent cure!',
        side: 'left',
      },
      {
        speaker: 'David Vance',
        avatarColor: 'from-amber-500 to-slate-900',
        portraitLetter: 'D',
        text: 'Look outside the spire... millions are tearing down the surveillance screens. The sun is rising over Sector 7.',
        side: 'left',
      },
    ],
    biometricSyncCost: 0,
    rewardTitle: 'The True Universal Vaccine',
    rewardDescription: 'Global liberation achieved. The Hegemony Monopoly is shattered forever.',
  },
];
