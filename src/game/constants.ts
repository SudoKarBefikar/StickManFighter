export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 576;
export const GROUND_Y = 460;
export const GRAVITY = 0.6;
export const MOVE_SPEED = 4;
export const JUMP_FORCE = -13;

// ═══════════════════════════════════════════
// REBALANCED DAMAGE — Fights last 60-90 sec
// ═══════════════════════════════════════════
export const MAX_HEALTH = 200;       // Was 100, doubled for longer fights
export const MAX_ENERGY = 100;
export const MAX_SUPER = 100;
export const MAX_POISE = 100;

export const PUNCH_DAMAGE = 5;       // Was 8
export const KICK_DAMAGE = 7;        // Was 12
export const UPPERCUT_DAMAGE = 10;   // Was 18
export const FIREBALL_DAMAGE = 8;    // Was 15
export const LIGHTNING_DAMAGE = 12;  // Was 22
export const SUPER_DAMAGE = 20;      // Was 35
export const BLOCK_REDUCTION = 0.2;  // Was 0.25, blocking is stronger
export const CHIP_DAMAGE = 0.1;      // 10% damage leaks through block

export const PUNCH_RANGE = 60;
export const KICK_RANGE = 75;
export const UPPERCUT_RANGE = 65;

export const PUNCH_DURATION = 15;
export const KICK_DURATION = 20;
export const UPPERCUT_DURATION = 25;
export const FIREBALL_DURATION = 25;
export const LIGHTNING_DURATION = 35;
export const TELEPORT_DURATION = 12;
export const SUPER_DURATION = 60;
export const HIT_DURATION = 15;
export const HIT_COOLDOWN = 20;

export const ENERGY_PUNCH_COST = 3;       // Reduced
export const ENERGY_KICK_COST = 5;        // Reduced
export const ENERGY_UPPERCUT_COST = 10;   // Reduced
export const ENERGY_FIREBALL_COST = 18;   // Reduced
export const ENERGY_LIGHTNING_COST = 25;  // Reduced
export const ENERGY_TELEPORT_COST = 15;   // Reduced
export const ENERGY_REGEN = 0.25;         // Faster regen
export const ENERGY_BLOCK_GAIN = 4;
export const SUPER_CHARGE_ON_HIT = 12;    // Faster super build
export const SUPER_CHARGE_ON_TAKE_HIT = 15;

// ═══════════════════════════════════════════
// AAA GAMIFICATION CONSTANTS
// ═══════════════════════════════════════════

// Health Regen
export const REGEN_DELAY = 120;           // 2 seconds without being hit
export const REGEN_RATE = 0.08;           // Slow regen per frame

// Combo Scaling
export const COMBO_WINDOW = 50;
export const COMBO_MULTIPLIER = 0.10;     // Was 0.15
export const COMBO_SCALING = 0.85;        // Each hit in combo does 85% of previous

// Style System
export const STYLE_METER_GAIN_HIT = 8;
export const STYLE_METER_GAIN_VARIETY = 12; // Bonus for using different attacks
export const STYLE_METER_DECAY = 0.3;
export const STYLE_RANK_THRESHOLDS = { D: 0, C: 20, B: 40, A: 65, S: 85 };
export const STYLE_DAMAGE_BONUS = { D: 0, C: 0.05, B: 0.12, A: 0.20, S: 0.30 };
export const STYLE_RANK_COLORS: Record<string, string> = {
  D: '#6b7280', C: '#22c55e', B: '#3b82f6', A: '#a855f7', S: '#fbbf24'
};

// Rage Mode (below 25% HP)
export const RAGE_THRESHOLD = 0.25;
export const RAGE_ATTACK_BONUS = 1.3;     // 30% more damage
export const RAGE_DEFENSE_BONUS = 0.7;    // Take 30% less damage
export const RAGE_ENERGY_REGEN = 0.5;     // Double energy regen in rage
export const RAGE_DURATION = 300;         // 5 seconds of rage visuals

// Poise System
export const POISE_HIT = 18;
export const POISE_BLOCK_HIT = 8;
export const POISE_REGEN_DELAY = 60;      // 1 second
export const POISE_REGEN_RATE = 0.8;
export const POISE_BREAK_DURATION = 60;   // 1 second stun

export const ROUND_TIME = 90 * 60;
export const COUNTDOWN_TIME = 180;
export const ROUND_END_TIME = 180;        // 3 seconds for stats

export const FIREBALL_SPEED = 7;          // Slightly slower
export const FIREBALL_LIFETIME = 90;

export const KEYBOARD_CONTROLS = {
  left: 'a', right: 'd', jump: 'w', crouch: 's',
  punch: 'j', kick: 'k', uppercut: 'u', block: 'l',
  fireball: 'i', lightning: 'o', teleport: 'shift', special: ' ',
};
