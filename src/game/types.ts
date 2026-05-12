export type Action =
  | 'idle' | 'walk' | 'jump'
  | 'punch' | 'kick' | 'block' | 'hit' | 'uppercut' | 'crouch'
  | 'fireball' | 'lightning' | 'teleport' | 'super' | 'charging'
  | 'rage' | 'poiseBreak';

export type StyleRank = 'D' | 'C' | 'B' | 'A' | 'S';

export interface Fighter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  superCharge: number;
  maxSuperCharge: number;
  action: Action;
  actionTimer: number;
  facing: 1 | -1;
  isGrounded: boolean;
  combo: number;
  comboTimer: number;
  wins: number;
  color: string;
  glowColor: string;
  name: string;
  hitCooldown: number;
  isBlocking: boolean;
  isCrouching: boolean;
  lastHitBy: string;
  shakeTimer: number;
  flashTimer: number;
  teleportTrail: { x: number; y: number; life: number }[];
  auraIntensity: number;
  isChargingSuper: boolean;
  superActive: boolean;
  superTimer: number;

  // --- AAA Gamification ---
  poise: number;
  maxPoise: number;
  poiseRegenTimer: number;
  isPoiseBroken: boolean;
  poiseBreakTimer: number;

  styleMeter: number;        // 0-100, builds with varied attacks
  styleRank: StyleRank;
  styleDecayTimer: number;
  lastAttackType: string;     // track variety for style bonus
  totalStyleBonus: number;    // cumulative damage bonus from style

  regenTimer: number;         // frames since last hit
  isRaging: boolean;          // rage mode active (below 25% HP)
  rageTimer: number;          // visual timer for rage activation

  // --- Stats ---
  stats: FighterStats;
}

export interface FighterStats {
  damageDealt: number;
  damageTaken: number;
  longestCombo: number;
  totalHits: number;
  totalAttacks: number;
  perfectRound: boolean;
  rageActivations: number;
  poiseBreaks: number;
  supersLanded: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type?: 'normal' | 'glow' | 'ring' | 'trail' | 'lightning' | 'fire' | 'rage' | 'style' | 'poise';
  rotation?: number;
  rotationSpeed?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player1' | 'player2';
  type: 'fireball' | 'lightning_orb' | 'super_beam';
  life: number;
  damage: number;
  radius: number;
  color: string;
  trailColor: string;
  frame: number;
}

export interface LightningBolt {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  owner: 'player1' | 'player2';
  life: number;
  maxLife: number;
  damage: number;
  segments: { x: number; y: number }[];
  hasHit: boolean;
}

export interface DamageText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  vy: number;
  scale?: number;
}

export interface Announcement {
  text: string;
  subText: string;
  life: number;
  color: string;
}

export interface GameState {
  player1: Fighter;
  player2: Fighter;
  particles: Particle[];
  projectiles: Projectile[];
  lightningBolts: LightningBolt[];
  damageTexts: DamageText[];
  announcements: Announcement[];
  screenShake: number;
  screenFlash: number;
  slowMotion: number;
  roundTimer: number;
  round: number;
  maxRounds: number;
  gamePhase: 'menu' | 'countdown' | 'fighting' | 'roundEnd' | 'gameOver';
  countdownTimer: number;
  roundEndTimer: number;
  winner: string | null;
  matchStats: MatchStats;
}

export interface MatchStats {
  p1DamageDealt: number;
  p2DamageDealt: number;
  p1LongestCombo: number;
  p2LongestCombo: number;
  p1Accuracy: number;
  p2Accuracy: number;
  p1StyleRank: StyleRank;
  p2StyleRank: StyleRank;
  totalRounds: number;
}

export interface Keys {
  [key: string]: boolean;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  punch: boolean;
  kick: boolean;
  uppercut: boolean;
  block: boolean;
  fireball: boolean;
  lightning: boolean;
  teleport: boolean;
  special: boolean;
  seq: number;
}

export type NetMessage =
  | { type: 'input'; input: PlayerInput }
  | { type: 'state'; state: GameState; seq: number }
  | { type: 'ping'; t: number }
  | { type: 'pong'; t: number }
  | { type: 'ready' }
  | { type: 'start' }
  | { type: 'rematch' }
  | { type: 'name'; name: string };
