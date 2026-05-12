import { Fighter, GameState, PlayerInput, Projectile, LightningBolt, FighterStats } from './types';
import * as C from './constants';

function defaultStats(): FighterStats {
  return { damageDealt: 0, damageTaken: 0, longestCombo: 0, totalHits: 0, totalAttacks: 0, perfectRound: true, rageActivations: 0, poiseBreaks: 0, supersLanded: 0 };
}

export function createFighter(x: number, facing: 1 | -1, color: string, glowColor: string, name: string): Fighter {
  return {
    x, y: C.GROUND_Y, vx: 0, vy: 0, width: 40, height: 60,
    health: C.MAX_HEALTH, maxHealth: C.MAX_HEALTH,
    energy: C.MAX_ENERGY, maxEnergy: C.MAX_ENERGY,
    superCharge: 0, maxSuperCharge: C.MAX_SUPER,
    action: 'idle', actionTimer: 0, facing, isGrounded: true,
    combo: 0, comboTimer: 0, wins: 0,
    color, glowColor, name,
    hitCooldown: 0, isBlocking: false, isCrouching: false,
    lastHitBy: '', shakeTimer: 0, flashTimer: 0,
    teleportTrail: [], auraIntensity: 0,
    isChargingSuper: false, superActive: false, superTimer: 0,
    // AAA systems
    poise: C.MAX_POISE, maxPoise: C.MAX_POISE, poiseRegenTimer: 0,
    isPoiseBroken: false, poiseBreakTimer: 0,
    styleMeter: 0, styleRank: 'D', styleDecayTimer: 0, lastAttackType: '', totalStyleBonus: 0,
    regenTimer: 0, isRaging: false, rageTimer: 0,
    stats: defaultStats(),
  };
}

export function createInitialState(): GameState {
  return {
    player1: createFighter(250, 1, '#60a5fa', '#3b82f6', 'Player 1'),
    player2: createFighter(774, -1, '#f87171', '#ef4444', 'Player 2'),
    particles: [], projectiles: [], lightningBolts: [],
    damageTexts: [], announcements: [],
    screenShake: 0, screenFlash: 0, slowMotion: 0,
    roundTimer: C.ROUND_TIME, round: 1, maxRounds: 3,
    gamePhase: 'countdown', countdownTimer: C.COUNTDOWN_TIME,
    roundEndTimer: C.ROUND_END_TIME, winner: null,
    matchStats: { p1DamageDealt: 0, p2DamageDealt: 0, p1LongestCombo: 0, p2LongestCombo: 0, p1Accuracy: 0, p2Accuracy: 0, p1StyleRank: 'D', p2StyleRank: 'D', totalRounds: 0 },
  };
}

export function emptyInput(): PlayerInput {
  return { left: false, right: false, jump: false, crouch: false, punch: false, kick: false, uppercut: false, block: false, fireball: false, lightning: false, teleport: false, special: false, seq: 0 };
}

function resetRound(state: GameState) {
  const resetF = (f: Fighter, x: number, facing: 1 | -1) => {
    Object.assign(f, {
      x, y: C.GROUND_Y, vx: 0, vy: 0,
      health: C.MAX_HEALTH, energy: C.MAX_ENERGY, superCharge: 0,
      action: 'idle', actionTimer: 0, facing, isGrounded: true,
      combo: 0, comboTimer: 0, hitCooldown: 0, isBlocking: false, isCrouching: false,
      shakeTimer: 0, flashTimer: 0, teleportTrail: [], auraIntensity: 0,
      isChargingSuper: false, superActive: false, superTimer: 0,
      poise: C.MAX_POISE, poiseRegenTimer: 0, isPoiseBroken: false, poiseBreakTimer: 0,
      styleMeter: 0, styleRank: 'D', styleDecayTimer: 0, lastAttackType: '', totalStyleBonus: 0,
      regenTimer: 0, isRaging: false, rageTimer: 0,
      stats: defaultStats(),
    });
  };
  resetF(state.player1, 250, 1);
  resetF(state.player2, 774, -1);
  state.particles = []; state.projectiles = []; state.lightningBolts = [];
  state.damageTexts = []; state.announcements = [];
  state.screenShake = 0; state.screenFlash = 0; state.slowMotion = 0;
  state.roundTimer = C.ROUND_TIME; state.countdownTimer = C.COUNTDOWN_TIME;
  state.gamePhase = 'countdown';
}

// ═══════════════════════════════════════════
// STYLE SYSTEM
// ═══════════════════════════════════════════
function updateStyle(f: Fighter, attackType: string, hit: boolean) {
  if (!hit) {
    f.stats.totalAttacks++;
    return;
  }
  f.stats.totalAttacks++;
  f.stats.totalHits++;

  let gain = C.STYLE_METER_GAIN_HIT;
  if (attackType !== f.lastAttackType) gain += C.STYLE_METER_GAIN_VARIETY;
  f.lastAttackType = attackType;
  f.styleMeter = Math.min(100, f.styleMeter + gain);
  f.styleDecayTimer = 120; // 2 seconds

  // Update rank
  const t = C.STYLE_RANK_THRESHOLDS;
  if (f.styleMeter >= t.S) f.styleRank = 'S';
  else if (f.styleMeter >= t.A) f.styleRank = 'A';
  else if (f.styleMeter >= t.B) f.styleRank = 'B';
  else if (f.styleMeter >= t.C) f.styleRank = 'C';
  else f.styleRank = 'D';
}

function getStyleBonus(f: Fighter): number {
  return C.STYLE_DAMAGE_BONUS[f.styleRank];
}

function decayStyle(f: Fighter) {
  if (f.styleDecayTimer > 0) { f.styleDecayTimer--; return; }
  f.styleMeter = Math.max(0, f.styleMeter - C.STYLE_METER_DECAY);
  const t = C.STYLE_RANK_THRESHOLDS;
  if (f.styleMeter < t.C) f.styleRank = 'D';
  else if (f.styleMeter < t.B) f.styleRank = 'C';
  else if (f.styleMeter < t.A) f.styleRank = 'B';
  else if (f.styleMeter < t.S) f.styleRank = 'A';
}

// ═══════════════════════════════════════════
// COMBO SCALING
// ═══════════════════════════════════════════
function getComboScaling(combo: number): number {
  if (combo <= 1) return 1.0;
  return Math.pow(C.COMBO_SCALING, combo - 1);
}

// ═══════════════════════════════════════════
// RAGE MODE
// ═══════════════════════════════════════════
function updateRage(f: Fighter, state: GameState) {
  const hpRatio = f.health / f.maxHealth;
  if (!f.isRaging && hpRatio <= C.RAGE_THRESHOLD && hpRatio > 0 && !f.isPoiseBroken) {
    f.isRaging = true;
    f.rageTimer = C.RAGE_DURATION;
    f.stats.rageActivations++;
    f.auraIntensity = 2;
    state.announcements.push({ text: '🔥 RAGE MODE!', subText: f.name, life: 90, color: '#ef4444' });
    state.screenFlash = 12;
    // Rage burst particles
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 6;
      state.particles.push({ x: f.x, y: f.y - 25, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30 + Math.random() * 20, maxLife: 50, color: '#ef4444', size: 3 + Math.random() * 4, type: 'rage' });
    }
  }
  if (f.isRaging && f.rageTimer > 0) {
    f.rageTimer--;
    if (f.rageTimer <= 0) f.isRaging = false;
  }
  if (hpRatio > C.RAGE_THRESHOLD) f.isRaging = false;
}

// ═══════════════════════════════════════════
// POISE SYSTEM
// ═══════════════════════════════════════════
function damagePoise(f: Fighter, blocked: boolean, state: GameState) {
  const dmg = blocked ? C.POISE_BLOCK_HIT : C.POISE_HIT;
  f.poise = Math.max(0, f.poise - dmg);
  f.poiseRegenTimer = C.POISE_REGEN_DELAY;

  if (f.poise <= 0 && !f.isPoiseBroken) {
    f.isPoiseBroken = true;
    f.poiseBreakTimer = C.POISE_BREAK_DURATION;
    f.isBlocking = false;
    f.stats.poiseBreaks++;
    state.announcements.push({ text: '💀 GUARD BREAK!', subText: f.name, life: 80, color: '#f59e0b' });
    state.screenShake = 12;
    f.flashTimer = 20;
    f.action = 'poiseBreak';
    f.actionTimer = C.POISE_BREAK_DURATION;
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
      state.particles.push({ x: f.x, y: f.y - 25, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 25, maxLife: 25, color: '#f59e0b', size: 3 + Math.random() * 3, type: 'poise' });
    }
  }
}

function updatePoise(f: Fighter) {
  if (f.poiseRegenTimer > 0) { f.poiseRegenTimer--; return; }
  f.poise = Math.min(f.maxPoise, f.poise + C.POISE_REGEN_RATE);
  if (f.isPoiseBroken && f.poise >= f.maxPoise * 0.5) {
    f.isPoiseBroken = false;
  }
  if (f.poiseBreakTimer > 0) f.poiseBreakTimer--;
}

// ═══════════════════════════════════════════
// HEALTH REGEN
// ═══════════════════════════════════════════
function updateRegen(f: Fighter) {
  f.regenTimer++;
  if (f.regenTimer >= C.REGEN_DELAY && f.health < f.maxHealth && f.health > 0) {
    f.health = Math.min(f.maxHealth, f.health + C.REGEN_RATE);
  }
}

// ═══════════════════════════════════════════
// DAMAGE CALCULATION (centralized)
// ═══════════════════════════════════════════
function calcDamage(base: number, attacker: Fighter, defender: Fighter, isBlocked: boolean): number {
  let dmg = base;

  // Combo scaling (diminishing returns)
  dmg *= getComboScaling(attacker.combo);

  // Style bonus
  const styleBonus = getStyleBonus(attacker);
  dmg *= (1 + styleBonus);
  attacker.totalStyleBonus += styleBonus;

  // Rage attack bonus
  if (attacker.isRaging) dmg *= C.RAGE_ATTACK_BONUS;

  // Rage defense bonus for defender
  if (defender.isRaging) dmg *= C.RAGE_DEFENSE_BONUS;

  // Block reduction (or chip damage)
  if (isBlocked) {
    dmg *= C.BLOCK_REDUCTION;
  }

  return Math.max(1, Math.round(dmg));
}

// ═══════════════════════════════════════════
// INPUT & ACTION HANDLING
// ═══════════════════════════════════════════
function isInAction(f: Fighter): boolean {
  return f.actionTimer > 0 && (
    f.action === 'punch' || f.action === 'kick' || f.action === 'uppercut' ||
    f.action === 'fireball' || f.action === 'lightning' || f.action === 'teleport' ||
    f.action === 'super' || f.action === 'poiseBreak'
  );
}

function applyInput(f: Fighter, input: PlayerInput, prev: PlayerInput, opp: Fighter, state: GameState, owner: 'player1' | 'player2') {
  if ((f.action === 'hit' || f.action === 'poiseBreak') && f.actionTimer > 0) return;
  if (f.superActive && f.superTimer > 0) return;
  if (f.isPoiseBroken) return;

  f.isBlocking = !!(input.block && f.isGrounded && !isInAction(f) && !f.isPoiseBroken);
  f.isCrouching = !!(input.crouch && f.isGrounded && !f.isBlocking);

  if (f.isBlocking || isInAction(f)) { f.vx *= 0.8; return; }

  if (input.left) f.vx = -C.MOVE_SPEED * (f.isCrouching ? 0.5 : 1);
  else if (input.right) f.vx = C.MOVE_SPEED * (f.isCrouching ? 0.5 : 1);
  else f.vx *= 0.8;

  if (input.jump && f.isGrounded && !f.isCrouching) { f.vy = C.JUMP_FORCE; f.isGrounded = false; }
  if (f.actionTimer > 0) return;

  const jp = (k: keyof PlayerInput) => !!(input[k] && !prev[k]);

  // Super
  if (jp('special') && f.superCharge >= f.maxSuperCharge) {
    f.action = 'super'; f.actionTimer = C.SUPER_DURATION;
    f.superCharge = 0; f.superActive = true; f.superTimer = C.SUPER_DURATION;
    f.auraIntensity = 3; state.screenShake = 15; state.screenFlash = 20; state.slowMotion = 20;
    state.projectiles.push({ x: f.x + f.facing * 30, y: f.y - 30, vx: f.facing * 12, vy: 0, owner, type: 'super_beam', life: 50, damage: C.SUPER_DAMAGE, radius: 30, color: f.color, trailColor: f.glowColor, frame: 0 });
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 8; state.particles.push({ x: f.x, y: f.y - 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30 + Math.random() * 30, maxLife: 60, color: f.glowColor, size: 3 + Math.random() * 5, type: 'glow' }); }
    return;
  }
  // Teleport
  if (jp('teleport') && f.energy >= C.ENERGY_TELEPORT_COST) {
    f.energy -= C.ENERGY_TELEPORT_COST;
    f.teleportTrail.push({ x: f.x, y: f.y, life: 30 });
    for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4; state.particles.push({ x: f.x, y: f.y - 25, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 20 + Math.random() * 15, maxLife: 35, color: f.glowColor, size: 2 + Math.random() * 4, type: 'trail' }); }
    f.x = Math.max(60, Math.min(C.CANVAS_WIDTH - 60, opp.x + opp.facing * 80));
    f.y = C.GROUND_Y; f.isGrounded = true; f.vx = 0;
    f.action = 'teleport'; f.actionTimer = C.TELEPORT_DURATION;
    for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4; state.particles.push({ x: f.x, y: f.y - 25, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 20 + Math.random() * 15, maxLife: 35, color: '#ffffff', size: 2 + Math.random() * 4, type: 'glow' }); }
    state.screenFlash = 5; updateStyle(f, 'teleport', false); return;
  }
  // Fireball
  if (jp('fireball') && f.energy >= C.ENERGY_FIREBALL_COST) {
    f.action = 'fireball'; f.actionTimer = C.FIREBALL_DURATION;
    f.energy -= C.ENERGY_FIREBALL_COST; f.auraIntensity = Math.max(f.auraIntensity, 1.5); return;
  }
  // Lightning
  if (jp('lightning') && f.energy >= C.ENERGY_LIGHTNING_COST) {
    f.action = 'lightning'; f.actionTimer = C.LIGHTNING_DURATION;
    f.energy -= C.ENERGY_LIGHTNING_COST; f.auraIntensity = Math.max(f.auraIntensity, 2); return;
  }
  // Normal attacks
  if (input.punch && f.energy >= C.ENERGY_PUNCH_COST) { f.action = 'punch'; f.actionTimer = C.PUNCH_DURATION; f.energy -= C.ENERGY_PUNCH_COST; updateStyle(f, 'punch', false); }
  else if (input.kick && f.energy >= C.ENERGY_KICK_COST) { f.action = 'kick'; f.actionTimer = C.KICK_DURATION; f.energy -= C.ENERGY_KICK_COST; updateStyle(f, 'kick', false); }
  else if (jp('uppercut') && f.energy >= C.ENERGY_UPPERCUT_COST) { f.action = 'uppercut'; f.actionTimer = C.UPPERCUT_DURATION; f.energy -= C.ENERGY_UPPERCUT_COST; updateStyle(f, 'uppercut', false); }
}

// ═══════════════════════════════════════════
// POWER SPAWNING
// ═══════════════════════════════════════════
function spawnFireball(f: Fighter, s: GameState, o: 'player1' | 'player2') {
  const c = o === 'player1' ? { color: '#60a5fa', trail: '#3b82f6' } : { color: '#f87171', trail: '#ef4444' };
  s.projectiles.push({ x: f.x + f.facing * 35, y: f.y - 28, vx: f.facing * C.FIREBALL_SPEED, vy: 0, owner: o, type: 'fireball', life: C.FIREBALL_LIFETIME, damage: C.FIREBALL_DAMAGE, radius: 14, color: c.color, trailColor: c.trail, frame: 0 });
  for (let i = 0; i < 10; i++) { const a = (f.facing === 1 ? 0 : Math.PI) + (Math.random() - 0.5), sp = 2 + Math.random() * 4; s.particles.push({ x: f.x + f.facing * 35, y: f.y - 28, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 10 + Math.random() * 10, maxLife: 20, color: c.color, size: 2 + Math.random() * 3, type: 'fire' }); }
}

function spawnLightning(f: Fighter, opp: Fighter, s: GameState, o: 'player1' | 'player2') {
  const segs: { x: number; y: number }[] = [];
  const sx = f.x + f.facing * 20, sy = f.y - 50, ex = opp.x, ey = opp.y - 30;
  for (let i = 0; i <= 12; i++) { const t = i / 12; segs.push({ x: sx + (ex - sx) * t + (i === 0 || i === 12 ? 0 : (Math.random() - 0.5) * 40), y: sy + (ey - sy) * t + (i === 0 || i === 12 ? 0 : (Math.random() - 0.5) * 30) }); }
  s.lightningBolts.push({ x: sx, y: sy, targetX: ex, targetY: ey, owner: o, life: 25, maxLife: 25, damage: C.LIGHTNING_DAMAGE, segments: segs, hasHit: false });
  for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5; s.particles.push({ x: ex, y: ey, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 15 + Math.random() * 15, maxLife: 30, color: Math.random() > 0.5 ? '#fef08a' : '#a5f3fc', size: 1 + Math.random() * 3, type: 'lightning' }); }
  s.screenShake = 10; s.screenFlash = 8;
}

// ═══════════════════════════════════════════
// HIT DETECTION
// ═══════════════════════════════════════════
function checkMelee(atk: Fighter, def: Fighter, state: GameState): boolean {
  if (atk.actionTimer <= 0 || def.hitCooldown > 0) return false;
  let range = 0, baseDmg = 0, hf = 0, name = '';
  switch (atk.action) {
    case 'punch': range = C.PUNCH_RANGE; baseDmg = C.PUNCH_DAMAGE; hf = 8; name = '👊'; break;
    case 'kick': range = C.KICK_RANGE; baseDmg = C.KICK_DAMAGE; hf = 10; name = '🦵'; break;
    case 'uppercut': range = C.UPPERCUT_RANGE; baseDmg = C.UPPERCUT_DAMAGE; hf = 12; name = '⬆'; break;
    default: return false;
  }
  const td = atk.action === 'punch' ? C.PUNCH_DURATION : atk.action === 'kick' ? C.KICK_DURATION : C.UPPERCUT_DURATION;
  if (td - atk.actionTimer !== hf) return false;
  const dx = def.x - atk.x, dist = Math.abs(dx), dir = Math.sign(dx);
  if (dist > range || dir !== atk.facing) return false;
  if (def.isCrouching && atk.action === 'punch') return false;

  const blocked = def.isBlocking && !def.isPoiseBroken;
  const finalDmg = calcDamage(baseDmg, atk, def, blocked);
  const attackName = name;

  // Track stats
  atk.stats.damageDealt += finalDmg;
  def.stats.damageTaken += finalDmg;
  def.regenTimer = 0; // Reset regen timer

  if (blocked) {
    // Chip damage through block
    const chipDmg = Math.max(1, Math.round(baseDmg * C.CHIP_DAMAGE));
    def.health = Math.max(0, def.health - chipDmg);
    def.stats.damageTaken += chipDmg;
    atk.stats.damageDealt += chipDmg;
    damagePoise(def, true, state);
    spawnBlock(def, state);
    state.damageTexts.push({ x: def.x, y: def.y - 60, text: `🛡 ${attackName} -${chipDmg}`, life: 50, color: '#60a5fa', vy: -2 });
  } else {
    def.action = 'hit'; def.actionTimer = C.HIT_DURATION;
    def.vx = atk.facing * 5;
    if (atk.action === 'uppercut') { def.vy = -8; def.isGrounded = false; }
    def.flashTimer = 12; state.screenShake = 8;
    damagePoise(def, false, state);
    spawnHit(def, atk, state);
    state.damageTexts.push({ x: def.x, y: def.y - 60, text: `${attackName} -${finalDmg}`, life: 55, color: atk.combo > 2 ? '#fbbf24' : '#f87171', vy: -2, scale: atk.combo > 3 ? 1.2 : 1 });
  }

  if (!blocked) def.health = Math.max(0, def.health - finalDmg);
  def.hitCooldown = C.HIT_COOLDOWN;
  atk.combo++; atk.comboTimer = C.COMBO_WINDOW;
  if (atk.combo > atk.stats.longestCombo) atk.stats.longestCombo = atk.combo;
  atk.superCharge = Math.min(atk.maxSuperCharge, atk.superCharge + C.SUPER_CHARGE_ON_HIT);
  def.superCharge = Math.min(def.maxSuperCharge, def.superCharge + C.SUPER_CHARGE_ON_TAKE_HIT);

  updateStyle(atk, atk.action, true);

  // Combo announcements
  if (atk.combo === 3) state.announcements.push({ text: '3x COMBO!', subText: '', life: 50, color: '#22c55e' });
  else if (atk.combo === 5) state.announcements.push({ text: '5x BRUTAL!', subText: '', life: 60, color: '#a855f7' });
  else if (atk.combo === 8) state.announcements.push({ text: '8x INSANE!', subText: '', life: 70, color: '#f59e0b' });
  else if (atk.combo >= 12) state.announcements.push({ text: `${atk.combo}x GODLIKE!!`, subText: '', life: 80, color: '#ef4444' });

  return true;
}

function projHit(p: Projectile, def: Fighter, state: GameState, atk: Fighter): boolean {
  if (def.hitCooldown > 0) return false;
  const dx = def.x - p.x, dy = (def.y - 30) - p.y;
  if (Math.sqrt(dx * dx + dy * dy) > p.radius + 25) return false;

  const blocked = def.isBlocking && !def.isPoiseBroken;
  const finalDmg = calcDamage(p.damage, atk, def, blocked);
  const name = p.type === 'fireball' ? '🔥' : p.type === 'super_beam' ? '💥' : '💥';

  atk.stats.damageDealt += finalDmg; def.stats.damageTaken += finalDmg; def.regenTimer = 0;

  if (blocked) {
    const chipDmg = Math.max(1, Math.round(p.damage * C.CHIP_DAMAGE));
    def.health = Math.max(0, def.health - chipDmg);
    def.stats.damageTaken += chipDmg; atk.stats.damageDealt += chipDmg;
    damagePoise(def, true, state); spawnBlock(def, state);
    state.damageTexts.push({ x: def.x, y: def.y - 70, text: `🛡 ${name} -${chipDmg}`, life: 60, color: '#60a5fa', vy: -2.5 });
  } else {
    def.action = 'hit'; def.actionTimer = p.type === 'super_beam' ? 25 : C.HIT_DURATION;
    def.vx = Math.sign(p.vx) * (p.type === 'super_beam' ? 10 : 6);
    def.vy = p.type === 'super_beam' ? -6 : -3; def.isGrounded = false;
    def.flashTimer = 15;
    state.screenShake = p.type === 'super_beam' ? 18 : 10;
    if (p.type === 'super_beam') { state.screenFlash = 15; state.slowMotion = 10; atk.stats.supersLanded++; }
    damagePoise(def, false, state);
    const cnt = p.type === 'super_beam' ? 35 : 18;
    for (let i = 0; i < cnt; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 7; state.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 20 + Math.random() * 25, maxLife: 45, color: p.type === 'super_beam' ? (Math.random() > 0.3 ? '#ffffff' : p.color) : (Math.random() > 0.5 ? '#ff6b35' : '#fbbf24'), size: 2 + Math.random() * (p.type === 'super_beam' ? 6 : 4), type: p.type === 'fireball' ? 'fire' : 'glow' }); }
    state.damageTexts.push({ x: def.x, y: def.y - 70, text: `${name} -${finalDmg}`, life: 70, color: p.type === 'super_beam' ? '#fbbf24' : '#ff6b35', vy: -2.5, scale: p.type === 'super_beam' ? 1.5 : 1 });
  }
  if (!blocked) def.health = Math.max(0, def.health - finalDmg);
  def.hitCooldown = C.HIT_COOLDOWN;
  def.superCharge = Math.min(def.maxSuperCharge, def.superCharge + C.SUPER_CHARGE_ON_TAKE_HIT);
  atk.superCharge = Math.min(atk.maxSuperCharge, atk.superCharge + C.SUPER_CHARGE_ON_HIT);
  updateStyle(atk, p.type, true);
  return true;
}

function boltHit(b: LightningBolt, def: Fighter, state: GameState, atk: Fighter) {
  if (b.hasHit || def.hitCooldown > 0) return;
  const dx = def.x - b.targetX, dy = (def.y - 30) - b.targetY;
  if (Math.sqrt(dx * dx + dy * dy) > 40) return;
  b.hasHit = true;

  const blocked = def.isBlocking && !def.isPoiseBroken;
  const finalDmg = calcDamage(b.damage, atk, def, blocked);

  atk.stats.damageDealt += finalDmg; def.stats.damageTaken += finalDmg; def.regenTimer = 0;

  if (blocked) {
    const chipDmg = Math.max(1, Math.round(b.damage * C.CHIP_DAMAGE));
    def.health = Math.max(0, def.health - chipDmg);
    def.stats.damageTaken += chipDmg; atk.stats.damageDealt += chipDmg;
    damagePoise(def, true, state); spawnBlock(def, state);
    state.damageTexts.push({ x: def.x, y: def.y - 70, text: `🛡 ⚡ -${chipDmg}`, life: 60, color: '#60a5fa', vy: -2.5 });
  } else {
    def.action = 'hit'; def.actionTimer = 20; def.vy = -6; def.isGrounded = false;
    def.flashTimer = 20; state.screenShake = 12; state.screenFlash = 10;
    damagePoise(def, false, state);
    state.damageTexts.push({ x: def.x, y: def.y - 70, text: `⚡ -${finalDmg}`, life: 70, color: '#fef08a', vy: -2.5, scale: 1.3 });
  }
  if (!blocked) def.health = Math.max(0, def.health - finalDmg);
  def.hitCooldown = C.HIT_COOLDOWN + 5;
  def.superCharge = Math.min(def.maxSuperCharge, def.superCharge + C.SUPER_CHARGE_ON_TAKE_HIT);
  atk.superCharge = Math.min(atk.maxSuperCharge, atk.superCharge + C.SUPER_CHARGE_ON_HIT);
  updateStyle(atk, 'lightning', true);
}

// ═══════════════════════════════════════════
// PARTICLES & EFFECTS
// ═══════════════════════════════════════════
function spawnHit(d: Fighter, a: Fighter, s: GameState) {
  const hx = (d.x + a.x) / 2, hy = d.y - 30;
  for (let i = 0; i < 12; i++) { const an = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5; s.particles.push({ x: hx, y: hy, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 2, life: 20 + Math.random() * 20, maxLife: 40, color: Math.random() > 0.5 ? '#fbbf24' : '#ffffff', size: 2 + Math.random() * 3 }); }
  s.particles.push({ x: hx, y: hy, vx: 0, vy: 0, life: 8, maxLife: 8, color: '#ffffff', size: 20, type: 'glow' });
}
function spawnBlock(d: Fighter, s: GameState) {
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 4 + Math.random() * Math.PI / 2, sp = 2 + Math.random() * 3; s.particles.push({ x: d.x + d.facing * 15, y: d.y - 25, vx: Math.cos(a) * sp * d.facing, vy: Math.sin(a) * sp, life: 15 + Math.random() * 10, maxLife: 25, color: '#60a5fa', size: 2 + Math.random() * 2, type: 'glow' }); }
}
function spawnAura(f: Fighter, s: GameState) {
  if (f.auraIntensity < 0.3 && f.superCharge < f.maxSuperCharge * 0.5 && !f.isRaging) return;
  const int = Math.max(f.auraIntensity, f.isRaging ? 1.5 : f.superCharge >= f.maxSuperCharge ? 0.8 : 0.3);
  for (let i = 0; i < Math.floor(int); i++) {
    if (Math.random() > 0.3) continue;
    s.particles.push({ x: f.x + (Math.random() - 0.5) * 30, y: f.y + 10, vx: (Math.random() - 0.5), vy: -1 - Math.random() * 3 * int, life: 15 + Math.random() * 20, maxLife: 35, color: f.isRaging ? '#ef4444' : f.glowColor, size: 2 + Math.random() * 3 * int, type: 'glow' });
  }
}

// ═══════════════════════════════════════════
// PHYSICS & UPDATES
// ═══════════════════════════════════════════
function updatePhysics(f: Fighter) {
  if (!f.isGrounded) f.vy += C.GRAVITY;
  f.x += f.vx; f.y += f.vy;
  if (f.y >= C.GROUND_Y) { f.y = C.GROUND_Y; f.vy = 0; f.isGrounded = true; }
  f.x = Math.max(50, Math.min(C.CANVAS_WIDTH - 50, f.x));
  if (f.actionTimer > 0) { f.actionTimer--; if (f.actionTimer <= 0) { f.action = 'idle'; f.superActive = false; } }
  if (f.superTimer > 0) f.superTimer--;
  if (f.hitCooldown > 0) f.hitCooldown--;
  if (f.comboTimer > 0) { f.comboTimer--; if (f.comboTimer <= 0) f.combo = 0; }
  if (f.shakeTimer > 0) f.shakeTimer--;
  if (f.flashTimer > 0) f.flashTimer--;
  const eRegen = f.isRaging ? C.ENERGY_REGEN + C.RAGE_ENERGY_REGEN : C.ENERGY_REGEN;
  f.energy = Math.min(f.maxEnergy, f.energy + eRegen);
  f.auraIntensity = Math.max(0, f.auraIntensity - 0.02);
  if (f.superCharge >= f.maxSuperCharge * 0.8) f.auraIntensity = Math.max(f.auraIntensity, 0.8);
  f.teleportTrail = f.teleportTrail.filter(t => { t.life--; return t.life > 0; });
  if (Math.abs(f.vx) < 0.5) f.vx = 0;
}

function checkPowers(s: GameState) {
  const check = (f: Fighter, o: Fighter, k: 'player1' | 'player2') => {
    if (f.action === 'fireball' && C.FIREBALL_DURATION - f.actionTimer === 10) spawnFireball(f, s, k);
    if (f.action === 'lightning' && C.LIGHTNING_DURATION - f.actionTimer === 15) spawnLightning(f, o, s, k);
  };
  check(s.player1, s.player2, 'player1');
  check(s.player2, s.player1, 'player2');
}

function updateProjs(s: GameState) {
  const p1 = s.player1, p2 = s.player2;
  s.projectiles = s.projectiles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life--; p.frame++;
    if (p.frame % 2 === 0) { const c = p.type === 'super_beam' ? 4 : 2; for (let i = 0; i < c; i++) s.particles.push({ x: p.x + (Math.random() - 0.5) * p.radius, y: p.y + (Math.random() - 0.5) * p.radius, vx: -p.vx * 0.1 + (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 10 + Math.random() * 15, maxLife: 25, color: p.type === 'fireball' ? (Math.random() > 0.5 ? '#ff6b35' : '#fbbf24') : p.trailColor, size: p.type === 'super_beam' ? 3 + Math.random() * 4 : 2 + Math.random() * 3, type: p.type === 'fireball' ? 'fire' : 'glow' }); }
    const def = p.owner === 'player1' ? p2 : p1;
    const atk = p.owner === 'player1' ? p1 : p2;
    if (projHit(p, def, s, atk)) return false;
    return p.x > -50 && p.x < C.CANVAS_WIDTH + 50 && p.life > 0;
  });
}

function updateBolts(s: GameState) {
  const p1 = s.player1, p2 = s.player2;
  s.lightningBolts = s.lightningBolts.filter(b => {
    b.life--;
    if (b.life % 3 === 0) { for (let i = 1; i < b.segments.length - 1; i++) { const t = i / (b.segments.length - 1); b.segments[i].x = b.x + (b.targetX - b.x) * t + (Math.random() - 0.5) * 40; b.segments[i].y = b.y + (b.targetY - b.y) * t + (Math.random() - 0.5) * 30; } }
    if (!b.hasHit && b.life > 15) { const def = b.owner === 'player1' ? p2 : p1; const atk = b.owner === 'player1' ? p1 : p2; boltHit(b, def, s, atk); }
    if (b.life % 4 === 0) { const rs = b.segments[Math.floor(Math.random() * b.segments.length)]; s.particles.push({ x: rs.x, y: rs.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 8 + Math.random() * 8, maxLife: 16, color: Math.random() > 0.5 ? '#fef08a' : '#ffffff', size: 1 + Math.random() * 2, type: 'lightning' }); }
    return b.life > 0;
  });
}

function updateParticles(s: GameState) {
  s.particles = s.particles.filter(p => { p.x += p.vx; p.y += p.vy; if (p.type !== 'glow' && p.type !== 'ring' && p.type !== 'rage') p.vy += 0.1; else if (p.type === 'glow' || p.type === 'rage') p.vy -= 0.02; if (p.rotation !== undefined && p.rotationSpeed !== undefined) p.rotation += p.rotationSpeed; p.life--; return p.life > 0; });
}

function updateTexts(s: GameState) {
  s.damageTexts = s.damageTexts.filter(t => { t.y += t.vy; t.life--; return t.life > 0; });
  s.announcements = s.announcements.filter(a => { a.life--; return a.life > 0; });
}

// ═══════════════════════════════════════════
// MAIN GAME LOOP
// ═══════════════════════════════════════════
export function updateGame(
  state: GameState,
  p1In: PlayerInput, p1Prev: PlayerInput,
  p2In: PlayerInput, p2Prev: PlayerInput
): GameState {
  switch (state.gamePhase) {
    case 'countdown':
      state.countdownTimer--;
      if (state.countdownTimer <= -30) state.gamePhase = 'fighting';
      break;

    case 'fighting': {
      const isSlow = state.slowMotion > 0;
      if (isSlow) state.slowMotion--;

      applyInput(state.player1, p1In, p1Prev, state.player2, state, 'player1');
      applyInput(state.player2, p2In, p2Prev, state.player1, state, 'player2');

      if (!isSlow || state.slowMotion % 2 === 0) {
        updatePhysics(state.player1); updatePhysics(state.player2);
        if (state.player1.x < state.player2.x) { state.player1.facing = 1; state.player2.facing = -1; } else { state.player1.facing = -1; state.player2.facing = 1; }
        const dx = state.player2.x - state.player1.x, dist = Math.abs(dx);
        if (dist < 35) { const push = (35 - dist) / 2, dir = dx === 0 ? 1 : Math.sign(dx); state.player1.x -= dir * push; state.player2.x += dir * push; }
        checkMelee(state.player1, state.player2, state);
        checkMelee(state.player2, state.player1, state);
        checkPowers(state); updateProjs(state); updateBolts(state);
      }

      // Per-frame updates
      updateParticles(state); updateTexts(state);
      spawnAura(state.player1, state); spawnAura(state.player2, state);

      // AAA systems
      updateRage(state.player1, state); updateRage(state.player2, state);
      updatePoise(state.player1); updatePoise(state.player2);
      updateRegen(state.player1); updateRegen(state.player2);
      decayStyle(state.player1); decayStyle(state.player2);

      if (state.screenShake > 0) state.screenShake *= 0.85;
      if (state.screenFlash > 0) state.screenFlash--;
      state.roundTimer--;

      // Round end
      if (state.player1.health <= 0 || state.player2.health <= 0 || state.roundTimer <= 0) {
        // Check perfect round
        if (state.player1.health === state.player1.maxHealth && state.player1.health > state.player2.health) {
          state.player1.stats.perfectRound = true;
          state.announcements.push({ text: '⭐ PERFECT!', subText: state.player1.name, life: 120, color: '#fbbf24' });
        }
        if (state.player2.health === state.player2.maxHealth && state.player2.health > state.player1.health) {
          state.player2.stats.perfectRound = true;
          state.announcements.push({ text: '⭐ PERFECT!', subText: state.player2.name, life: 120, color: '#fbbf24' });
        }

        // Determine winner
        if (state.player1.health > state.player2.health) { state.player1.wins++; state.winner = state.player1.name; }
        else if (state.player2.health > state.player1.health) { state.player2.wins++; state.winner = state.player2.name; }
        else state.winner = null;

        // Update match stats
        state.matchStats.totalRounds++;
        state.matchStats.p1DamageDealt += state.player1.stats.damageDealt;
        state.matchStats.p2DamageDealt += state.player2.stats.damageDealt;
        state.matchStats.p1LongestCombo = Math.max(state.matchStats.p1LongestCombo, state.player1.stats.longestCombo);
        state.matchStats.p2LongestCombo = Math.max(state.matchStats.p2LongestCombo, state.player2.stats.longestCombo);
        if (state.player1.stats.totalAttacks > 0) state.matchStats.p1Accuracy = state.player1.stats.totalHits / state.player1.stats.totalAttacks;
        if (state.player2.stats.totalAttacks > 0) state.matchStats.p2Accuracy = state.player2.stats.totalHits / state.player2.stats.totalAttacks;
        state.matchStats.p1StyleRank = state.player1.styleRank;
        state.matchStats.p2StyleRank = state.player2.styleRank;

        const wn = Math.ceil(state.maxRounds / 2);
        if (state.player1.wins >= wn || state.player2.wins >= wn || state.round >= state.maxRounds) {
          state.gamePhase = 'gameOver';
          if (state.player1.wins > state.player2.wins) state.winner = state.player1.name;
          else if (state.player2.wins > state.player1.wins) state.winner = state.player2.name;
          else state.winner = null;
        } else {
          state.gamePhase = 'roundEnd'; state.roundEndTimer = C.ROUND_END_TIME;
        }
      }
      break;
    }

    case 'roundEnd':
      state.roundEndTimer--;
      updateParticles(state); updateTexts(state);
      if (state.roundEndTimer <= 0) { state.round++; resetRound(state); }
      break;

    case 'gameOver':
      updateParticles(state);
      break;
  }
  return state;
}
