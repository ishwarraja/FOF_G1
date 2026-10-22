// Voice Clip & Sound Effect Manager for Fate of Fighters
// Triggers character-specific voice clips for move execution, hit grunts, and round start/end callouts.

import { FightingMove } from '../types/fighting';

export interface CharacterVoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'robot';
  pitch: number; // 0.5 - 1.8
  rate: number; // 0.8 - 1.5
  baseFreq: number; // For procedural vocal formant synth
  accentColor: string;
  lightAttacks: string[];
  heavyAttacks: string[];
  blowback: string[];
  specials: string[];
  superMove: string;
  climaxMove: string;
  taunts: string[];
  intros: string[];
  victories: string[];
  defeats: string[];
  hitLight: string[];
  hitHeavy: string[];
  knockdown: string[];
  maxMode: string[];
}

export const CHARACTER_VOICE_PROFILES: Record<string, CharacterVoiceProfile> = {
  arjun: {
    id: 'arjun',
    name: 'Arjun Rao',
    gender: 'male',
    pitch: 0.82,
    rate: 1.15,
    baseFreq: 115,
    accentColor: '#f59e0b',
    lightAttacks: ['Hah!', 'Take this!', 'Eat steel!', 'Break!'],
    heavyAttacks: ['SLEDGEHAMMER!', 'HAMMER DOWN!', 'FEEL THE WEIGHT!'],
    blowback: ['MAKE WAY FOR THE UNION!'],
    specials: ['PISTON IMPACT SLAM!', 'UNION COUNTER GRIP!', 'FOUNDRY QUAKE!'],
    superMove: 'OVERCLOCKED FOUNDRY STRIKE! WORKERS STAND TALL!',
    climaxMove: 'GENERAL STRIKE: CORE BREAKER! NEVER AGAIN!',
    taunts: ['The factory floor taught me how to take a hit. Let’s see what you’ve got!'],
    intros: ['Our labor built this world. Our hands will take it back!'],
    victories: ['Solid as reinforced rebar. The union stands tall!'],
    defeats: ['The line... must hold...'],
    hitLight: ['Ugh!', 'Ngh!', 'Tch!'],
    hitHeavy: ['Guaaagh!', 'Heavy hit!', 'Argh!'],
    knockdown: ['Damn corporate tech...!'],
    maxMode: ['OVERCLOCKING HYDRAULICS! FULL POWER!'],
  },

  steele: {
    id: 'steele',
    name: 'General Jonas Steele',
    gender: 'male',
    pitch: 0.75,
    rate: 1.1,
    baseFreq: 100,
    accentColor: '#64748b',
    lightAttacks: ['Hoo-ah!', 'Strike!', 'Down!', 'Engage!'],
    heavyAttacks: ['TACTICAL BREACH!', 'CARBON SABER!', 'STAND DOWN!'],
    blowback: ['TACTICAL DISPERSAL! OUT OF MY SIGHT!'],
    specials: ['VOLT KNUCKLE IMPACT!', 'THUNDER BLITZ!', 'TACTICAL CALL-IN!'],
    superMove: 'MAXIMUM VOLTAGE DISCHARGE! TARGET LOCKED!',
    climaxMove: 'ORBITAL SOVEREIGN CANNON! FIRE AT WILL!',
    taunts: ['An army protects its citizens. It does not subjugate them.'],
    intros: ['Mission parameters set. Engaging hostile force!'],
    victories: ['Discipline always triumphs over chaos.'],
    defeats: ['Falling back... tactical retreat...'],
    hitLight: ['Kuh!', 'Ngh!'],
    hitHeavy: ['Armor breached!', 'Gaaah!'],
    knockdown: ['Heavy kinetic impact...!'],
    maxMode: ['TACTICAL ARMOR OVERCHARGE! ENGAGING!'],
  },

  elena: {
    id: 'elena',
    name: 'Dr. Elena Vance',
    gender: 'female',
    pitch: 1.25,
    rate: 1.2,
    baseFreq: 230,
    accentColor: '#06b6d4',
    lightAttacks: ['Freeze!', 'Calculated!', 'Chill!', 'Stay!'],
    heavyAttacks: ['CRYOGENIC SHATTER!', 'SUB-ZERO IMPACT!', 'NULLIFY!'],
    blowback: ['GLACIAL DISPERSION! STEP BACK!'],
    specials: ['FROST DART!', 'GLACIAL SPIKE PRISM!', 'ABSOLUTE REFLECTION!'],
    superMove: 'ABSOLUTE ZERO MATRIX! FREEZE!',
    climaxMove: 'PERMAFROST EXTINCTION! THERMAL COLLAPSE!',
    taunts: ['All variables calculated. Commencing cryogenic test.'],
    intros: ['Probability of your victory is under four percent.'],
    victories: ['Experiment concluded. Thermal levels normalized.'],
    defeats: ['Anomalous energy output... calculation error...'],
    hitLight: ['Ah!', 'Tch!'],
    hitHeavy: ['Aaaaah!', 'Thermal breach!'],
    knockdown: ['Impact exceeds tolerance...!'],
    maxMode: ['CRYOGENIC STABILIZERS DISENGAGED!'],
  },

  valeria: {
    id: 'valeria',
    name: 'Valeria Unit-0',
    gender: 'robot',
    pitch: 1.05,
    rate: 1.28,
    baseFreq: 190,
    accentColor: '#ec4899',
    lightAttacks: ['Execute.', 'Pulse.', 'Target.', 'Zap.'],
    heavyAttacks: ['RAILGUN DISCHARGE!', 'PHOTON PURGE!', 'DISINTEGRATE.'],
    blowback: ['FORCEFIELD EJECT PROTOCOL.'],
    specials: ['ION BEAM CHARGE!', 'MATRIX BARRIER!', 'SURGE WAVE!'],
    superMove: 'SYSTEM OVERLOAD: OMEGA BEAM CANNON!',
    climaxMove: 'ZERO ERADICATION PROTOCOL! MAXIMUM OUTPUT!',
    taunts: ['Target acquired. Evaluating threat level: negligible.'],
    intros: ['Unit-Zero online. Commencing combat neutralization sequence.'],
    victories: ['Threat neutralized. Returning to active standby mode.'],
    defeats: ['Core temperature critical... emergency shutdown...'],
    hitLight: ['Chirp!', 'Warning.'],
    hitHeavy: ['Damage registered!', 'Chassis integrity 40%.'],
    knockdown: ['Critical destabilization!'],
    maxMode: ['LIMITER REMOVED. OVERCLOCK MAXIMUM.'],
  },

  victor: {
    id: 'victor',
    name: 'Victor Vance',
    gender: 'male',
    pitch: 0.65,
    rate: 0.95,
    baseFreq: 85,
    accentColor: '#9333ea',
    lightAttacks: ['Crush!', 'Weakling!', 'Die!', 'Fall!'],
    heavyAttacks: ['SHADOW REND!', 'EXTINCTION!', 'BOW BEFORE ME!'],
    blowback: ['DISAPPEAR FROM MY SIGHT!'],
    specials: ['DARK VOID IMPACT!', 'SHADOW DRIFT!', 'GRAVITY COLLAPSE!'],
    superMove: 'DARK ABYSS APOCALYPSE! DROWN IN SHADOWS!',
    climaxMove: 'EVENT HORIZON SINGULARITY! TOTAL ANNIHILATION!',
    taunts: ['You are nothing but an insect before true power.'],
    intros: ['Tremble before the shadow that engulfs this world!'],
    victories: ['As expected. Darkness consumes all in the end.'],
    defeats: ['Impossible... this power... cannot fail me...!'],
    hitLight: ['Hmph!', 'Insolent!'],
    hitHeavy: ['Curse you...!', 'Gaaaagh!'],
    knockdown: ['You dare strike me down...?!'],
    maxMode: ['ABYSSAL SURGE! BEHOLD TRUE DARKNESS!'],
  },

  maya: {
    id: 'maya',
    name: 'Maya Lin',
    gender: 'female',
    pitch: 1.35,
    rate: 1.25,
    baseFreq: 260,
    accentColor: '#10b981',
    lightAttacks: ['Ha!', 'Glitch!', 'Gotcha!', 'Fast!'],
    heavyAttacks: ['CYBER OVERDRIVE!', 'DATA SMASH!', 'VIRUS BURST!'],
    blowback: ['FIREWALL KNOCKOUT!'],
    specials: ['NANITE SURGE!', 'HOLOGRAM STRIKE!', 'GRID SHOCK!'],
    superMove: 'CYBERPUNK MATRIX OVERDRIVE!',
    climaxMove: 'ZERO-DAY ROOTKIT EXPLOIT! SYSTEM CRASH!',
    taunts: ['I hacked your defense stats five seconds before the round began.'],
    intros: ['Let’s crash their mainframe in record time!'],
    victories: ['Access granted. Clean execution!'],
    defeats: ['Connection lost... firewall down...'],
    hitLight: ['Ouch!', 'Hey!'],
    hitHeavy: ['No way!', 'System lag!'],
    knockdown: ['Rebooting system...!'],
    maxMode: ['OVERCLOCKING NEON RIG! SPEED BURST!'],
  },

  leo: {
    id: 'leo',
    name: 'Leo Chen',
    gender: 'male',
    pitch: 1.15,
    rate: 1.22,
    baseFreq: 155,
    accentColor: '#3b82f6',
    lightAttacks: ['Sei!', 'Hah!', 'Too slow!', 'Zip!'],
    heavyAttacks: ['TEMPEST KICK!', 'LIGHTNING FLASH!', 'HURRICANE!'],
    blowback: ['WIND BURST EJECT!'],
    specials: ['GALE FORCE STRIKE!', 'SONIC UPPERCUT!', 'AERO SLICER!'],
    superMove: 'TEMPEST DRAGON HURRICANE!',
    climaxMove: 'CELESTIAL WIND ASCENSION: GODSPEED!',
    taunts: ['You can’t hit what you can’t catch!'],
    intros: ['Catch the wind if you think you’re fast enough!'],
    victories: ['Smooth like a breeze, sharp like a hurricane!'],
    defeats: ['My rhythm... got broken...'],
    hitLight: ['Tch!', 'Fast!'],
    hitHeavy: ['Gah!', 'Heavy boot!'],
    knockdown: ['Lost my footing...!'],
    maxMode: ['HURRICANE VELOCITY UNLOCKED!'],
  },

  kai: {
    id: 'kai',
    name: 'Kai Shadowbane',
    gender: 'male',
    pitch: 0.88,
    rate: 1.1,
    baseFreq: 130,
    accentColor: '#a855f7',
    lightAttacks: ['Vanish.', 'Shadow.', 'Strike.', 'Silence.'],
    heavyAttacks: ['PHANTOM CLEAVE!', 'VOID SLASH!', 'DISSOLVE!'],
    blowback: ['SHADOW BURST!'],
    specials: ['PHANTOM STEP!', 'VOID DAGGER!', 'ECLIPSE REVERSAL!'],
    superMove: 'PHANTOM NIGHTMARE ASSAULT!',
    climaxMove: 'ECLIPSE OF THE VOID: ETERNAL NIGHTFALL!',
    taunts: ['You fight an illusion. The shadow has already struck.'],
    intros: ['Step into the dark. If you dare.'],
    victories: ['Silence claims another soul.'],
    defeats: ['The light... burns...'],
    hitLight: ['Ugh...', 'Ngh...'],
    hitHeavy: ['Aaargh!', 'Shadow dispersed!'],
    knockdown: ['Fading into mist...!'],
    maxMode: ['ECLIPSE MANIFESTATION!'],
  },

  alexandra: {
    id: 'alexandra',
    name: 'Judge Alexandra Cross',
    gender: 'female',
    pitch: 1.1,
    rate: 1.12,
    baseFreq: 210,
    accentColor: '#eab308',
    lightAttacks: ['Guilty!', 'Order!', 'Silence!', 'Strike!'],
    heavyAttacks: ['JUDICIAL GAVEL!', 'VERDICT SLAM!', 'ORDER IN COURT!'],
    blowback: ['CONTEMPT OF COURT! BEGONE!'],
    specials: ['GAVEL IMPACT!', 'SHIELD OF JUSTICE!', 'SANCTION BEAM!'],
    superMove: 'SUPREME COURT VERDICT: GUILTY!',
    climaxMove: 'ABSOLUTE JURISDICTION: MAXIMUM PENALTY!',
    taunts: ['The law is absolute, and I am its executioner.'],
    intros: ['Court is now in session. Plead your case!'],
    victories: ['Justice has been served without compromise.'],
    defeats: ['An appeal... will be filed...'],
    hitLight: ['Objection!', 'Tch!'],
    hitHeavy: ['Disorderly!', 'Aaargh!'],
    knockdown: ['Contempt...!'],
    maxMode: ['SUPREME AUTHORITY INVOKED!'],
  },

  amara: {
    id: 'amara',
    name: 'Dr. Amara Thorne',
    gender: 'female',
    pitch: 1.18,
    rate: 1.18,
    baseFreq: 220,
    accentColor: '#14b8a6',
    lightAttacks: ['Pulse!', 'Scalpel!', 'Vital!', 'Clear!'],
    heavyAttacks: ['DEFIBRILLATOR SURGE!', 'VITAL SURGE!', 'TRIAGE!'],
    blowback: ['EMERGENCY DISCHARGE!'],
    specials: ['BIOTIC SHIELD!', 'DEFIB STRIKE!', 'NANO BURST!'],
    superMove: 'EMERGENCY OVERDRIVE RESUSCITATION!',
    climaxMove: 'MIRACLE CURE: CELLULAR RECONSTRUCTION!',
    taunts: ['I can heal any wound, and inflict far worse.'],
    intros: ['Medical license suspended. Let’s do some field surgery!'],
    victories: ['Patient neutralized. Prognosis: defeat.'],
    defeats: ['Cardiac failure... flatline...'],
    hitLight: ['Ah!', 'Ngh!'],
    hitHeavy: ['Vital signs dropping!', 'Aaargh!'],
    knockdown: ['Severe trauma...!'],
    maxMode: ['ADRENALINE OVERDRIVE ACTIVATED!'],
  },
};

/**
 * Sound Effect & Voice Clip Manager Engine
 */
class SoundEffectManager {
  private isVoiceEnabled: boolean = true;
  private voiceVolume: number = 0.85;
  private synthAvailable: boolean = typeof window !== 'undefined' && 'speechSynthesis' in window;
  private lastVoiceTimestamp: number = 0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Warm up SpeechSynthesis
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.onvoiceschanged = () => {
            // Voices ready
          };
        }
      } catch {}
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.isVoiceEnabled = enabled;
    if (!enabled && this.synthAvailable) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public getVoiceEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  public toggleVoice(): boolean {
    this.setVoiceEnabled(!this.isVoiceEnabled);
    return this.isVoiceEnabled;
  }

  public setVoiceVolume(vol: number) {
    this.voiceVolume = Math.max(0, Math.min(1, vol));
  }

  public getVoiceVolume(): number {
    return this.voiceVolume;
  }

  /**
   * Procedural Web Audio Formant Synthesizer
   * Creates instantaneous fighting-game vowel formant vocalization bursts
   */
  public playProceduralFormantVoice(
    basePitch: number,
    vowelType: 'A' | 'O' | 'E' | 'I' | 'U',
    duration: number = 0.25,
    energy: number = 0.35
  ) {
    const ctx = this.getAudioContext();
    if (!ctx || !this.isVoiceEnabled) return;

    try {
      const now = ctx.currentTime;

      // Vowel Formant frequencies [F1, F2, F3] in Hz
      const formants: Record<'A' | 'O' | 'E' | 'I' | 'U', [number, number, number]> = {
        A: [800, 1200, 2500],
        O: [500, 900, 2400],
        E: [500, 1800, 2600],
        I: [300, 2200, 3000],
        U: [350, 800, 2200],
      };

      const [f1, f2, f3] = formants[vowelType];

      // Vocal cords fundamental oscillator (sawtooth/pulse for rich vocal harmonics)
      const vocalOsc = ctx.createOscillator();
      vocalOsc.type = 'sawtooth';
      vocalOsc.frequency.setValueAtTime(basePitch, now);
      // Natural speech pitch dip
      vocalOsc.frequency.exponentialRampToValueAtTime(basePitch * 0.85, now + duration);

      // 3 Bandpass formant resonant filters modeling vocal tract
      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(f1, now);
      filter1.Q.setValueAtTime(5, now);

      const filter2 = ctx.createBiquadFilter();
      filter2.type = 'bandpass';
      filter2.frequency.setValueAtTime(f2, now);
      filter2.Q.setValueAtTime(6, now);

      const filter3 = ctx.createBiquadFilter();
      filter3.type = 'bandpass';
      filter3.frequency.setValueAtTime(f3, now);
      filter3.Q.setValueAtTime(7, now);

      const masterGain = ctx.createGain();
      const vol = energy * this.voiceVolume;
      masterGain.gain.setValueAtTime(0.01, now);
      masterGain.gain.linearRampToValueAtTime(vol, now + 0.03);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      vocalOsc.connect(filter1);
      vocalOsc.connect(filter2);
      vocalOsc.connect(filter3);

      filter1.connect(masterGain);
      filter2.connect(masterGain);
      filter3.connect(masterGain);

      masterGain.connect(ctx.destination);

      vocalOsc.start(now);
      vocalOsc.stop(now + duration);
    } catch {}
  }

  /**
   * Speak a voice line with tailored pitch, rate, and vocal tone
   */
  public speakVoiceClip(
    text: string,
    profile?: CharacterVoiceProfile,
    priority: boolean = false,
    vowelFallback: 'A' | 'O' | 'E' | 'I' | 'U' = 'A'
  ) {
    if (!this.isVoiceEnabled || !text) return;

    // Trigger instant procedural formant synth layer for crisp zero-latency arcade punch
    const baseFreq = profile?.baseFreq || 140;
    this.playProceduralFormantVoice(baseFreq, vowelFallback, 0.22, 0.28);

    // If SpeechSynthesis is available, dispatch voice utterance
    if (this.synthAvailable && typeof window !== 'undefined') {
      try {
        const now = Date.now();
        // Prevent speech stacking unless high priority (Super/Climax/KO)
        if (!priority && now - this.lastVoiceTimestamp < 400) {
          return;
        }
        this.lastVoiceTimestamp = now;

        if (priority) {
          window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = this.voiceVolume;
        utterance.rate = profile ? profile.rate : 1.15;
        utterance.pitch = profile ? profile.pitch : 1.0;

        // Try to pick suitable matching voice if available
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          if (profile?.gender === 'female') {
            const femaleVoice = voices.find(v =>
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('samantha') ||
              v.name.toLowerCase().includes('zira') ||
              v.name.toLowerCase().includes('karen') ||
              v.name.toLowerCase().includes('victoria')
            );
            if (femaleVoice) utterance.voice = femaleVoice;
          } else if (profile?.gender === 'male') {
            const maleVoice = voices.find(v =>
              v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('david') ||
              v.name.toLowerCase().includes('george') ||
              v.name.toLowerCase().includes('alex') ||
              v.name.toLowerCase().includes('daniel')
            );
            if (maleVoice) utterance.voice = maleVoice;
          }
        }

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  }

  /**
   * Character Move Execution Voice Clip Trigger
   */
  public triggerMoveVoice(charId?: string, move?: FightingMove) {
    if (!move) return;
    const safeId = (charId || 'arjun').toLowerCase();
    const profile = CHARACTER_VOICE_PROFILES[safeId] || CHARACTER_VOICE_PROFILES.arjun;
    if (!profile) return;

    if (move.type === 'CLIMAX') {
      this.speakVoiceClip(profile.climaxMove, profile, true, 'O');
    } else if (move.type === 'SUPER') {
      this.speakVoiceClip(profile.superMove, profile, true, 'A');
    } else if (move.type === 'COMMAND_NORMAL' || (move.button as string) === 'CD') {
      const line = profile.blowback[Math.floor(Math.random() * profile.blowback.length)] || 'BLOW AWAY!';
      this.speakVoiceClip(line, profile, false, 'O');
    } else if (move.type === 'SPECIAL') {
      const idx = move.id?.includes('spec_2') ? 1 : move.id?.includes('spec_3') ? 2 : 0;
      const line = profile.specials[idx] || profile.specials[0] || move.name;
      this.speakVoiceClip(line, profile, true, 'A');
    } else if (move.type === 'NORMAL') {
      if (move.button === 'HP' || move.button === 'HK') {
        const line = profile.heavyAttacks[Math.floor(Math.random() * profile.heavyAttacks.length)];
        this.speakVoiceClip(line, profile, false, 'A');
      } else {
        const line = profile.lightAttacks[Math.floor(Math.random() * profile.lightAttacks.length)];
        this.speakVoiceClip(line, profile, false, 'E');
      }
    }
  }

  /**
   * Hit Grunt / Reaction Voice Clip Trigger
   */
  public triggerHitVoice(charId?: string, isHeavy?: boolean) {
    const safeId = (charId || 'arjun').toLowerCase();
    const profile = CHARACTER_VOICE_PROFILES[safeId] || CHARACTER_VOICE_PROFILES.arjun;
    if (!profile) return;

    if (isHeavy) {
      const line = profile.hitHeavy[Math.floor(Math.random() * profile.hitHeavy.length)];
      this.speakVoiceClip(line, profile, false, 'O');
    } else {
      const line = profile.hitLight[Math.floor(Math.random() * profile.hitLight.length)];
      this.speakVoiceClip(line, profile, false, 'E');
    }
  }

  /**
   * Knockdown Scream / Cry Voice Clip Trigger
   */
  public triggerKnockdownVoice(charId?: string) {
    const safeId = (charId || 'arjun').toLowerCase();
    const profile = CHARACTER_VOICE_PROFILES[safeId] || CHARACTER_VOICE_PROFILES.arjun;
    if (!profile) return;
    const line = profile.knockdown[Math.floor(Math.random() * profile.knockdown.length)];
    this.speakVoiceClip(line, profile, true, 'U');
  }

  /**
   * Character Taunt Voice Clip Trigger
   */
  public triggerTauntVoice(charId?: string) {
    const safeId = (charId || 'arjun').toLowerCase();
    const profile = CHARACTER_VOICE_PROFILES[safeId] || CHARACTER_VOICE_PROFILES.arjun;
    if (!profile) return;
    const line = profile.taunts[Math.floor(Math.random() * profile.taunts.length)];
    this.speakVoiceClip(line, profile, true, 'A');
  }

  /**
   * MAX Mode Activation Voice Clip Trigger
   */
  public triggerMaxModeVoice(charId?: string) {
    const safeId = (charId || 'arjun').toLowerCase();
    const profile = CHARACTER_VOICE_PROFILES[safeId] || CHARACTER_VOICE_PROFILES.arjun;
    if (!profile) return;
    const line = profile.maxMode[Math.floor(Math.random() * profile.maxMode.length)] || 'MAX MODE ACTIVATED!';
    this.speakVoiceClip(line, profile, true, 'A');
  }

  /**
   * Announcer Callout Trigger (Round Start, Finish, Combo, etc.)
   */
  public triggerAnnouncerCall(callText: string, priority: boolean = true) {
    if (!this.isVoiceEnabled) return;

    // Announcer voice profile: Authoritative, energetic arcade host
    const announcerProfile: CharacterVoiceProfile = {
      id: 'announcer',
      name: 'Arcade Announcer',
      gender: 'male',
      pitch: 0.9,
      rate: 1.15,
      baseFreq: 110,
      accentColor: '#ef4444',
      lightAttacks: [],
      heavyAttacks: [],
      blowback: [],
      specials: [],
      superMove: '',
      climaxMove: '',
      taunts: [],
      intros: [],
      victories: [],
      defeats: [],
      hitLight: [],
      hitHeavy: [],
      knockdown: [],
      maxMode: [],
    };

    this.speakVoiceClip(callText, announcerProfile, priority, 'O');
  }

  /**
   * Round Start Sequence Voice Clip Dispatcher
   */
  public triggerRoundStartVoice(roundNumber: number, p1CharId?: string, p2CharId?: string) {
    const roundStr = roundNumber >= 3 ? 'FINAL ROUND!' : `ROUND ${roundNumber}!`;
    
    // Announcer Call
    this.triggerAnnouncerCall(`${roundStr} READY... FIGHT!`, true);

    // Follow with brief character intro voice line after 1.1s
    if (p1CharId) {
      setTimeout(() => {
        const safeP1 = (p1CharId || 'arjun').toLowerCase();
        const p1Profile = CHARACTER_VOICE_PROFILES[safeP1];
        if (p1Profile && p1Profile.intros.length > 0) {
          const intro = p1Profile.intros[0];
          this.speakVoiceClip(intro, p1Profile, false, 'A');
        }
      }, 1200);
    }
  }

  /**
   * Round End Sequence Voice Clip Dispatcher (KO, PERFECT, Victory Quotes)
   */
  public triggerRoundEndVoice(
    winner: 'p1' | 'p2' | 'draw',
    isPerfect: boolean,
    winningCharId?: string,
    losingCharId?: string
  ) {
    if (winner === 'draw') {
      this.triggerAnnouncerCall('DRAW GAME! DOUBLE K.O.!', true);
      return;
    }

    if (isPerfect) {
      this.triggerAnnouncerCall('PERFECT! WINNER!', true);
    } else {
      this.triggerAnnouncerCall('K.O.! WINNER!', true);
    }

    // Losing character defeat moan/groan
    if (losingCharId) {
      setTimeout(() => {
        const safeLose = (losingCharId || '').toLowerCase();
        const loseProfile = CHARACTER_VOICE_PROFILES[safeLose];
        if (loseProfile && loseProfile.defeats.length > 0) {
          this.speakVoiceClip(loseProfile.defeats[0], loseProfile, false, 'U');
        }
      }, 700);
    }

    // Winning character victory quote
    if (winningCharId) {
      setTimeout(() => {
        const safeWin = (winningCharId || 'arjun').toLowerCase();
        const winProfile = CHARACTER_VOICE_PROFILES[safeWin];
        if (winProfile && winProfile.victories.length > 0) {
          this.speakVoiceClip(winProfile.victories[0], winProfile, true, 'A');
        }
      }, 1800);
    }
  }
}

export const soundEffectManager = new SoundEffectManager();
export const voiceClipManager = soundEffectManager;
