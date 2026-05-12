import { Fighter, GameState, Particle, DamageText, Projectile, LightningBolt } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from './constants';

// ─── Helpers ─────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  // Validate hex color format
  if (typeof hex !== 'string' || !hex.startsWith('#') || (hex.length !== 4 && hex.length !== 7)) {
    console.warn(`Invalid hex color: ${hex}, using fallback`);
    return `rgba(255, 255, 255, ${alpha})`; // Fallback to white
  }

  // Handle shorthand (#fff) and full (#ffffff) hex colors
  let r: number, g: number, b: number;
  if (hex.length === 4) {
    // #RGB → #RRGGBB
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  // Fallback for any NaN (shouldn't happen with validation, but safe)
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.warn(`Failed to parse hex color: ${hex}, using fallback`);
    return `rgba(255, 255, 255, ${alpha})`;
  }
  // Clamp values to 0-255
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Background ──────────────────────────────────────────────────
export function drawBackground(ctx: CanvasRenderingContext2D, frame: number) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, '#050520');
  skyGrad.addColorStop(0.4, '#0d0d3a');
  skyGrad.addColorStop(0.8, '#1a0a30');
  skyGrad.addColorStop(1, '#200a28');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

  // Twinkling stars
  const stars = [
    [50,30],[150,80],[300,20],[450,60],[600,40],[700,90],[850,25],[950,70],
    [100,120],[500,100],[200,50],[400,110],[750,55],[900,100],[350,75],
    [80,150],[520,35],[680,120],[180,95],[420,145],[780,130],[620,70],
  ];
  stars.forEach(([x, y], i) => {
    const twinkle = 0.3 + Math.sin(frame * 0.03 + i * 1.7) * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.sin(frame * 0.05 + i) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Moon with glow
  const moonGlow = ctx.createRadialGradient(850, 80, 20, 850, 80, 80);
  moonGlow.addColorStop(0, 'rgba(255,255,200,0.15)');
  moonGlow.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(770, 0, 160, 160);
  ctx.fillStyle = 'rgba(255, 255, 200, 0.85)';
  ctx.beginPath(); ctx.arc(850, 80, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#050520';
  ctx.beginPath(); ctx.arc(840, 72, 28, 0, Math.PI * 2); ctx.fill();

  // Mystical fog
  ctx.fillStyle = `rgba(100, 50, 150, ${0.03 + Math.sin(frame * 0.01) * 0.02})`;
  ctx.fillRect(0, GROUND_Y - 80, CANVAS_WIDTH, 80);

  // Ground
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
  groundGrad.addColorStop(0, '#2a2a35');
  groundGrad.addColorStop(1, '#151520');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

  // Glowing ground line
  const lineGlow = ctx.createLinearGradient(0, GROUND_Y - 3, 0, GROUND_Y + 3);
  lineGlow.addColorStop(0, 'rgba(150, 100, 255, 0)');
  lineGlow.addColorStop(0.5, `rgba(150, 100, 255, ${0.3 + Math.sin(frame * 0.02) * 0.1})`);
  lineGlow.addColorStop(1, 'rgba(150, 100, 255, 0)');
  ctx.fillStyle = lineGlow;
  ctx.fillRect(0, GROUND_Y - 3, CANVAS_WIDTH, 6);

  // Mystical runes on ground
  ctx.strokeStyle = `rgba(150, 100, 255, ${0.08 + Math.sin(frame * 0.015) * 0.04})`;
  ctx.lineWidth = 1;
  const runePositions = [150, 350, 512, 674, 874];
  runePositions.forEach((rx, i) => {
    const rot = frame * 0.01 + i * 1.2;
    ctx.save();
    ctx.translate(rx, GROUND_Y + 40);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      const r = 15;
      if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });

  // Arena boundaries with energy
  ctx.strokeStyle = `rgba(200, 100, 255, ${0.2 + Math.sin(frame * 0.04) * 0.1})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.beginPath(); ctx.moveTo(30, GROUND_Y - 250); ctx.lineTo(30, GROUND_Y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH - 30, GROUND_Y - 250); ctx.lineTo(CANVAS_WIDTH - 30, GROUND_Y); ctx.stroke();
  ctx.setLineDash([]);
}

// ─── Aura ────────────────────────────────────────────────────────
export function drawAura(ctx: CanvasRenderingContext2D, fighter: Fighter, frame: number) {
  if (fighter.auraIntensity <= 0.1 && fighter.superCharge < fighter.maxSuperCharge * 0.5) return;

  ctx.save();
  const intensity = Math.max(fighter.auraIntensity, fighter.superCharge >= fighter.maxSuperCharge ? 1.5 : 0);
  if (intensity <= 0.1) { ctx.restore(); return; }

  const glowSize = 40 + intensity * 25 + Math.sin(frame * 0.1) * 8;
  const auraColor = fighter.superCharge >= fighter.maxSuperCharge ? '#fbbf24' : fighter.glowColor;
  const gradient = ctx.createRadialGradient(
    fighter.x, fighter.y - 20, 5,
    fighter.x, fighter.y - 20, glowSize
  );
  gradient.addColorStop(0, hexToRgba(auraColor, 0.25 * intensity));
  gradient.addColorStop(0.5, hexToRgba(auraColor, 0.1 * intensity));
  gradient.addColorStop(1, hexToRgba(auraColor, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(fighter.x, fighter.y - 20, glowSize, 0, Math.PI * 2);
  ctx.fill();

  // Energy rings for super-ready
  if (fighter.superCharge >= fighter.maxSuperCharge) {
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.3 + Math.sin(frame * 0.12) * 0.2})`;
    ctx.lineWidth = 1.5;
    const ringSize = 35 + Math.sin(frame * 0.08) * 5;
    ctx.beginPath();
    ctx.ellipse(fighter.x, fighter.y + 5, ringSize, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    const ringSize2 = 30 + Math.cos(frame * 0.1) * 5;
    ctx.beginPath();
    ctx.ellipse(fighter.x, fighter.y - 45, ringSize2, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Stickman Drawing ────────────────────────────────────────────
export function drawStickman(ctx: CanvasRenderingContext2D, fighter: Fighter, frameCount: number) {
  const { x, y, facing, action, actionTimer, color, isBlocking, isCrouching, flashTimer } = fighter;

  // Teleport trails (afterimages)
  fighter.teleportTrail.forEach(trail => {
    const alpha = trail.life / 30 * 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(trail.x, trail.y);
    ctx.scale(facing, 1);
    ctx.strokeStyle = fighter.glowColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -47, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(0, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(-10, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(10, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 20); ctx.stroke();
    ctx.restore();
  });

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  const drawColor = flashTimer > 0 && Math.floor(flashTimer / 3) % 2 === 0 ? '#ffffff' : color;

  ctx.strokeStyle = drawColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const headRadius = 12;
  const bodyLen = isCrouching ? 25 : 35;
  const limbLen = 20;
  const breathe = Math.sin(frameCount * 0.05) * 1.5;

  // Head
  ctx.beginPath();
  ctx.arc(0, -bodyLen - headRadius + breathe, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Glowing eyes during power moves
  const isPowerMove = action === 'fireball' || action === 'lightning' || action === 'super';
  if (isPowerMove && actionTimer > 0) {
    ctx.fillStyle = action === 'lightning' ? '#fef08a' : action === 'super' ? '#fbbf24' : '#ff6b35';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(4, -bodyLen - headRadius - 2 + breathe, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-2, -bodyLen - headRadius - 2 + breathe, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = drawColor;
    ctx.beginPath(); ctx.arc(4, -bodyLen - headRadius - 2 + breathe, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Body
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + breathe); ctx.lineTo(0, 0); ctx.stroke();

  // Draw limbs based on action
  if (action === 'fireball' && actionTimer > 0) {
    drawFireballPose(ctx, bodyLen, limbLen, actionTimer, breathe);
  } else if (action === 'lightning' && actionTimer > 0) {
    drawLightningPose(ctx, bodyLen, limbLen, actionTimer, breathe, frameCount);
  } else if (action === 'super' && actionTimer > 0) {
    drawSuperPose(ctx, bodyLen, limbLen, actionTimer, breathe, frameCount);
  } else if (action === 'teleport' && actionTimer > 0) {
    drawTeleportPose(ctx, bodyLen, limbLen, actionTimer);
  } else if (action === 'punch' && actionTimer > 0) {
    drawPunch(ctx, bodyLen, limbLen, actionTimer, breathe);
  } else if (action === 'kick' && actionTimer > 0) {
    drawKick(ctx, bodyLen, limbLen, actionTimer, breathe);
  } else if (action === 'uppercut' && actionTimer > 0) {
    drawUppercut(ctx, bodyLen, limbLen, actionTimer, breathe);
  } else if (action === 'hit') {
    drawHitPose(ctx, bodyLen, limbLen);
  } else if (isBlocking) {
    drawBlock(ctx, bodyLen, limbLen, breathe);
  } else if (isCrouching) {
    drawCrouch(ctx, bodyLen, limbLen, breathe);
  } else if (!fighter.isGrounded) {
    drawJump(ctx, bodyLen, limbLen);
  } else if (Math.abs(fighter.vx) > 0.5) {
    drawWalk(ctx, bodyLen, limbLen, frameCount, breathe);
  } else {
    drawIdle(ctx, bodyLen, limbLen, frameCount, breathe);
  }

  // Block shield
  if (isBlocking) {
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(12, -bodyLen / 2, 28, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ─── Pose Functions ──────────────────────────────────────────────
function drawIdle(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, frame: number, breathe: number) {
  const sway = Math.sin(frame * 0.04) * 3;
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe);
  ctx.lineTo(-limbLen * 0.5 + sway, -bodyLen + 8 + limbLen * 0.7);
  ctx.lineTo(-limbLen * 0.3, -bodyLen + 8 + limbLen * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe);
  ctx.lineTo(limbLen * 0.5 + sway, -bodyLen + 8 + limbLen * 0.7);
  ctx.lineTo(limbLen * 0.3, -bodyLen + 8 + limbLen * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.4, limbLen); ctx.lineTo(-limbLen * 0.5, limbLen + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.4, limbLen); ctx.lineTo(limbLen * 0.5, limbLen + 5); ctx.stroke();
}

function drawWalk(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, frame: number, breathe: number) {
  const w = Math.sin(frame * 0.15);
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(-w * limbLen * 0.5, -bodyLen + 8 + limbLen * 0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(w * limbLen * 0.5, -bodyLen + 8 + limbLen * 0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * limbLen * 0.6, limbLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-w * limbLen * 0.6, limbLen); ctx.stroke();
}

function drawJump(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number) {
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8); ctx.lineTo(-limbLen * 0.7, -bodyLen - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8); ctx.lineTo(limbLen * 0.7, -bodyLen - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.5, limbLen * 0.5); ctx.lineTo(-limbLen * 0.8, limbLen * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.5, limbLen * 0.5); ctx.lineTo(limbLen * 0.8, limbLen * 0.3); ctx.stroke();
}

function drawPunch(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, timer: number, breathe: number) {
  const p = Math.min(1, (15 - timer) / 5);
  const r = timer < 5 ? (5 - timer) / 5 : 0;
  const e = p - r * 0.5;
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(limbLen * 1.8 * e, -bodyLen + 12); ctx.stroke();
  if (e > 0.5) { ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(limbLen * 1.8 * e, -bodyLen + 12, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(-limbLen * 0.3, -bodyLen + 8 + limbLen * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.5, limbLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.3, limbLen); ctx.stroke();
}

function drawKick(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, timer: number, breathe: number) {
  const p = Math.min(1, (20 - timer) / 7);
  const r = timer < 5 ? (5 - timer) / 5 : 0;
  const e = p - r * 0.5;
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(-limbLen * 0.4, -bodyLen + 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(limbLen * 0.2, -bodyLen + 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 2 * e, -limbLen * 0.3 * e); ctx.stroke();
  if (e > 0.5) { ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(limbLen * 2 * e, -limbLen * 0.3 * e, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.3, limbLen); ctx.stroke();
}

function drawUppercut(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, timer: number, breathe: number) {
  const p = Math.min(1, (25 - timer) / 8);
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(limbLen * 0.8 * p, -bodyLen - limbLen * 1.2 * p); ctx.stroke();
  if (p > 0.3) {
    const savedStroke = ctx.strokeStyle;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(limbLen * 0.8 * p, -bodyLen - limbLen * 1.2 * p, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(limbLen * 0.8 * p - 5, -bodyLen - limbLen * 1.2 * p + 10);
    ctx.lineTo(limbLen * 0.8 * p, -bodyLen - limbLen * 1.2 * p);
    ctx.stroke();
    ctx.strokeStyle = savedStroke; ctx.lineWidth = 3;
  }
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(-limbLen * 0.4, -bodyLen + 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.4, limbLen * 0.8); ctx.lineTo(-limbLen * 0.5, limbLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.3, limbLen * 0.8); ctx.lineTo(limbLen * 0.2, limbLen); ctx.stroke();
}

function drawHitPose(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number) {
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8); ctx.lineTo(-limbLen * 0.6, -bodyLen + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8); ctx.lineTo(-limbLen * 0.3, -bodyLen + 25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.6, limbLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.2, limbLen); ctx.stroke();
}

function drawBlock(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, breathe: number) {
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(limbLen * 0.3, -bodyLen + 5); ctx.lineTo(limbLen * 0.1, -bodyLen - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(limbLen * 0.4, -bodyLen + 10); ctx.lineTo(limbLen * 0.2, -bodyLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.5, limbLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.5, limbLen); ctx.stroke();
}

function drawCrouch(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, breathe: number) {
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(limbLen * 0.4, -bodyLen + 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe); ctx.lineTo(-limbLen * 0.3, -bodyLen + 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.8, limbLen * 0.5); ctx.lineTo(-limbLen * 1, limbLen * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.6, limbLen * 0.5); ctx.lineTo(limbLen * 0.8, limbLen * 0.6); ctx.stroke();
}

// ─── SUPERNATURAL POSES ─────────────────────────────────────────
function drawFireballPose(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, timer: number, breathe: number) {
  const chargeProgress = Math.min(1, (25 - timer) / 10);
  const throwProgress = timer < 15 ? (15 - timer) / 8 : 0;

  if (throwProgress > 0) {
    ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe);
    ctx.lineTo(limbLen * 1.5 * throwProgress, -bodyLen + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe);
    ctx.lineTo(limbLen * 1.3 * throwProgress, -bodyLen + 15); ctx.stroke();
  } else {
    const spread = Math.sin(chargeProgress * Math.PI) * 5;
    ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe);
    ctx.lineTo(limbLen * 0.6, -bodyLen + 5 - spread); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8 + breathe);
    ctx.lineTo(limbLen * 0.6, -bodyLen + 15 + spread); ctx.stroke();

    if (chargeProgress > 0.3) {
      const glow = chargeProgress * 8;
      ctx.fillStyle = 'rgba(255, 150, 50, 0.6)';
      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = glow * 2;
      ctx.beginPath();
      ctx.arc(limbLen * 0.7, -bodyLen + 10, glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.4, limbLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.3, limbLen); ctx.stroke();
}

function drawLightningPose(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, timer: number, breathe: number, frame: number) {
  const progress = Math.min(1, (35 - timer) / 15);
  const shake = Math.sin(frame * 0.5) * 2 * progress;
  const savedStroke = ctx.strokeStyle;

  ctx.beginPath(); ctx.moveTo(0 + shake, -bodyLen + 8 + breathe);
  ctx.lineTo(limbLen * 0.2 + shake, -bodyLen - limbLen * 1.5 * progress); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0 + shake, -bodyLen + 8 + breathe);
  ctx.lineTo(limbLen * 1.2 * progress + shake, -bodyLen + 12); ctx.stroke();

  if (progress > 0.5) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 6;
    const hx = limbLen * 0.2 + shake;
    const hy = -bodyLen - limbLen * 1.5 * progress;
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = 5 + Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(angle) * len, hy + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = savedStroke;
    ctx.lineWidth = 3;
  }

  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.5, limbLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.4, limbLen); ctx.stroke();
}

function drawSuperPose(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, timer: number, breathe: number, frame: number) {
  const progress = Math.min(1, (60 - timer) / 20);
  const pulse = Math.sin(frame * 0.3) * 3;
  const shake = Math.sin(frame * 0.8) * 2 * progress;

  const armExtend = Math.min(1, progress * 2);
  ctx.beginPath(); ctx.moveTo(shake, -bodyLen + 8 + breathe);
  ctx.lineTo(limbLen * 2 * armExtend + shake, -bodyLen + 8 + pulse); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(shake, -bodyLen + 8 + breathe);
  ctx.lineTo(limbLen * 1.8 * armExtend + shake, -bodyLen + 18 + pulse); ctx.stroke();

  if (armExtend > 0.5) {
    ctx.fillStyle = ctx.strokeStyle;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(limbLen * 2 * armExtend + shake, -bodyLen + 8 + pulse, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(limbLen * 1.8 * armExtend + shake, -bodyLen + 18 + pulse, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.7, limbLen); ctx.lineTo(-limbLen * 0.9, limbLen + 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.5, limbLen); ctx.lineTo(limbLen * 0.3, limbLen + 3); ctx.stroke();
}

function drawTeleportPose(ctx: CanvasRenderingContext2D, bodyLen: number, limbLen: number, timer: number) {
  const alpha = Math.min(1, (12 - timer) / 8);
  ctx.globalAlpha = Math.max(0.1, alpha);

  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8); ctx.lineTo(-limbLen * 0.6, -bodyLen + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -bodyLen + 8); ctx.lineTo(limbLen * 0.6, -bodyLen + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-limbLen * 0.4, limbLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(limbLen * 0.4, limbLen); ctx.stroke();

  ctx.globalAlpha = 1;
}

// ─── Projectile Drawing ─────────────────────────────────────────
export function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[], frame: number) {
  projectiles.forEach(proj => {
    ctx.save();
    ctx.translate(proj.x, proj.y);

    if (proj.type === 'fireball') {
      // Outer glow
      const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, proj.radius * 2.5);
      outerGlow.addColorStop(0, hexToRgba(proj.color, 0.3));
      outerGlow.addColorStop(1, hexToRgba(proj.color, 0));
      ctx.fillStyle = outerGlow;
      ctx.beginPath(); ctx.arc(0, 0, proj.radius * 2.5, 0, Math.PI * 2); ctx.fill();

      // Core flame
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, proj.radius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#fbbf24');
      coreGrad.addColorStop(0.6, '#ff6b35');
      coreGrad.addColorStop(1, hexToRgba(proj.trailColor, 0.5));
      ctx.fillStyle = coreGrad;

      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const wobble = proj.radius + Math.sin(frame * 0.5 + i * 2) * 3;
        const px = Math.cos(angle) * wobble;
        const py = Math.sin(angle) * wobble;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Inner white hot core
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath(); ctx.arc(0, 0, proj.radius * 0.35, 0, Math.PI * 2); ctx.fill();

    } else if (proj.type === 'super_beam') {
      const beamLen = 50;

      // Outer energy field
      const outerGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, proj.radius * 3);
      outerGlow.addColorStop(0, hexToRgba(proj.color, 0.4));
      outerGlow.addColorStop(0.5, hexToRgba(proj.trailColor, 0.15));
      outerGlow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath(); ctx.arc(0, 0, proj.radius * 3, 0, Math.PI * 2); ctx.fill();

      // Beam body
      const beamGrad = ctx.createLinearGradient(-beamLen / 2, 0, beamLen / 2, 0);
      beamGrad.addColorStop(0, hexToRgba(proj.trailColor, 0.3));
      beamGrad.addColorStop(0.3, proj.color);
      beamGrad.addColorStop(0.5, '#ffffff');
      beamGrad.addColorStop(0.7, proj.color);
      beamGrad.addColorStop(1, hexToRgba(proj.trailColor, 0.3));

      ctx.fillStyle = beamGrad;
      const h = proj.radius * (1 + Math.sin(frame * 0.4) * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, beamLen / 2, h, 0, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(0, 0, beamLen * 0.3, h * 0.4, 0, 0, Math.PI * 2); ctx.fill();

      // Energy rings
      ctx.strokeStyle = hexToRgba(proj.color, 0.5 + Math.sin(frame * 0.3) * 0.3);
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const ringOffset = ((frame * 0.3 + i * 2) % 6) - 3;
        const ringSize = h * (0.5 + Math.abs(ringOffset) * 0.1);
        ctx.beginPath();
        ctx.ellipse(ringOffset * 8, 0, 5, ringSize, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  });
}

// ─── Lightning Drawing ──────────────────────────────────────────
export function drawLightningBolts(ctx: CanvasRenderingContext2D, bolts: LightningBolt[]) {
  bolts.forEach(bolt => {
    const alpha = bolt.life / bolt.maxLife;
    ctx.save();

    // Outer glow
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    bolt.segments.forEach((seg, i) => {
      if (i === 0) ctx.moveTo(seg.x, seg.y);
      else ctx.lineTo(seg.x, seg.y);
    });
    ctx.stroke();

    // Mid glow
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    bolt.segments.forEach((seg, i) => {
      if (i === 0) ctx.moveTo(seg.x, seg.y);
      else ctx.lineTo(seg.x, seg.y);
    });
    ctx.stroke();

    // Core
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    bolt.segments.forEach((seg, i) => {
      if (i === 0) ctx.moveTo(seg.x, seg.y);
      else ctx.lineTo(seg.x, seg.y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Branch bolts
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    bolt.segments.forEach((seg, i) => {
      if (i > 0 && i < bolt.segments.length - 1 && Math.random() > 0.5) {
        ctx.beginPath();
        ctx.moveTo(seg.x, seg.y);
        ctx.lineTo(seg.x + (Math.random() - 0.5) * 30, seg.y + (Math.random() - 0.5) * 20);
        ctx.stroke();
      }
    });

    // Impact flash at target
    if (bolt.life > bolt.maxLife * 0.6) {
      ctx.globalAlpha = alpha;
      const flash = ctx.createRadialGradient(bolt.targetX, bolt.targetY, 0, bolt.targetX, bolt.targetY, 35);
      flash.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
      flash.addColorStop(0.5, 'rgba(254, 240, 138, 0.2)');
      flash.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = flash;
      ctx.beginPath(); ctx.arc(bolt.targetX, bolt.targetY, 35, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  });
}

// ─── Particles ───────────────────────────────────────────────────
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.type === 'glow') {
      const outerR = Math.max(1, p.size * alpha * 2);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
      grad.addColorStop(0, hexToRgba(p.color, 0.8));
      grad.addColorStop(0.5, hexToRgba(p.color, 0.3));
      grad.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'fire') {
      const outerR = Math.max(1, p.size * alpha * 1.5);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, p.color);
      grad.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'lightning') {
      ctx.fillStyle = p.color;
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (p.type === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.translate(p.x, p.y);
      if (p.rotation !== undefined) ctx.rotate(p.rotation);
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * Math.PI * 2;
        const r = p.size * alpha * 2;
        if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (p.type === 'trail') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  });
}

// ─── UI Elements ─────────────────────────────────────────────────
export function drawDamageTexts(ctx: CanvasRenderingContext2D, texts: DamageText[]) {
  texts.forEach(t => {
    const alpha = t.life / 70;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha * 1.5);
    const scale = t.scale || 1;
    const fontSize = (16 + (1 - alpha) * 8) * scale;
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x + 1, t.y + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
}

export function drawHealthBar(
  ctx: CanvasRenderingContext2D, x: number, y: number, width: number,
  health: number, maxHealth: number, color: string, name: string, isFlipped: boolean
) {
  const ratio = health / maxHealth;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, 24, 4); ctx.fill(); ctx.stroke();

  const healthWidth = (width - 4) * ratio;
  const hx = isFlipped ? x + width - 2 - healthWidth : x + 2;
  const hGrad = ctx.createLinearGradient(hx, y, hx, y + 20);
  if (ratio > 0.5) { hGrad.addColorStop(0, '#4ade80'); hGrad.addColorStop(1, '#22c55e'); }
  else if (ratio > 0.25) { hGrad.addColorStop(0, '#fbbf24'); hGrad.addColorStop(1, '#f59e0b'); }
  else { hGrad.addColorStop(0, '#f87171'); hGrad.addColorStop(1, '#ef4444'); }
  ctx.fillStyle = hGrad;
  roundRect(ctx, hx, y + 2, healthWidth, 20, 3); ctx.fill();

  ctx.fillStyle = color; ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = isFlipped ? 'right' : 'left';
  ctx.fillText(name, isFlipped ? x + width : x, y - 6);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(health)}`, x + width / 2, y + 16);
}

export function drawEnergyBar(
  ctx: CanvasRenderingContext2D, x: number, y: number, width: number,
  energy: number, maxEnergy: number, isFlipped: boolean
) {
  const ratio = energy / maxEnergy;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(ctx, x, y, width, 10, 3); ctx.fill();
  const energyWidth = (width - 2) * ratio;
  const ex = isFlipped ? x + width - 1 - energyWidth : x + 1;
  const eGrad = ctx.createLinearGradient(ex, y, ex, y + 8);
  eGrad.addColorStop(0, '#60a5fa'); eGrad.addColorStop(1, '#3b82f6');
  ctx.fillStyle = eGrad;
  roundRect(ctx, ex, y + 1, energyWidth, 8, 2); ctx.fill();
}

export function drawSuperBar(
  ctx: CanvasRenderingContext2D, x: number, y: number, width: number,
  charge: number, maxCharge: number, isFlipped: boolean, color: string, frame: number
) {
  const ratio = charge / maxCharge;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(ctx, x, y, width, 8, 3); ctx.fill();
  const barWidth = (width - 2) * ratio;
  const bx = isFlipped ? x + width - 1 - barWidth : x + 1;

  if (ratio >= 1) {
    const pulse = 0.7 + Math.sin(frame * 0.15) * 0.3;
    const sGrad = ctx.createLinearGradient(bx, y, bx + barWidth, y);
    sGrad.addColorStop(0, `rgba(251,191,36,${pulse})`);
    sGrad.addColorStop(0.5, `rgba(255,255,200,${pulse})`);
    sGrad.addColorStop(1, `rgba(251,191,36,${pulse})`);
    ctx.fillStyle = sGrad;
  } else {
    const sGrad = ctx.createLinearGradient(bx, y, bx, y + 6);
    sGrad.addColorStop(0, color); sGrad.addColorStop(1, hexToRgba(color, 0.6));
    ctx.fillStyle = sGrad;
  }
  roundRect(ctx, bx, y + 1, barWidth, 6, 2); ctx.fill();

  ctx.fillStyle = ratio >= 1 ? '#fbbf24' : '#888888';
  ctx.font = '9px "Segoe UI", sans-serif';
  ctx.textAlign = isFlipped ? 'right' : 'left';
  ctx.fillText(ratio >= 1 ? '⚡ SUPER READY!' : '⚡ SUPER', isFlipped ? x + width : x, y - 2);
}

export function drawTimer(ctx: CanvasRenderingContext2D, timeSeconds: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeStyle = '#666666'; ctx.lineWidth = 2;
  roundRect(ctx, CANVAS_WIDTH / 2 - 30, 10, 60, 40, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = timeSeconds <= 10 ? '#f87171' : '#ffffff';
  ctx.font = 'bold 24px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(timeSeconds)}`, CANVAS_WIDTH / 2, 40);
}

export function drawCombo(ctx: CanvasRenderingContext2D, fighter: Fighter) {
  if (fighter.combo > 1) {
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
    ctx.font = 'bold 18px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${fighter.combo}x COMBO!`, fighter.x, fighter.y - 85);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export function drawRoundInfo(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = '#aaaaaa'; ctx.font = '12px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`Round ${state.round} / ${state.maxRounds}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
  for (let i = 0; i < state.player1.wins; i++) {
    ctx.fillStyle = '#fbbf24'; ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2 - 50 - i * 20, CANVAS_HEIGHT - 15, 6, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < state.player2.wins; i++) {
    ctx.fillStyle = '#fbbf24'; ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2 + 50 + i * 20, CANVAS_HEIGHT - 15, 6, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawAnnouncements(ctx: CanvasRenderingContext2D, announcements: { text: string; subText: string; life: number; color: string }[]) {
  announcements.forEach((a, idx) => {
    const alpha = Math.min(1, a.life / 30);
    const scale = 1 + (1 - alpha) * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60 - idx * 50);
    ctx.scale(scale, scale);
    ctx.shadowColor = a.color; ctx.shadowBlur = 20;
    ctx.fillStyle = a.color;
    ctx.font = 'bold 36px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(a.text, 0, 0);
    if (a.subText) {
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillText(a.subText, 0, 28);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  });
}

export function drawStyleRank(ctx: CanvasRenderingContext2D, f: Fighter) {
  if (f.styleRank === 'D') return;
  const colors: Record<string, string> = { D: '#6b7280', C: '#22c55e', B: '#3b82f6', A: '#a855f7', S: '#fbbf24' };
  const color = colors[f.styleRank];
  const alpha = 0.6 + (f.styleMeter / 100) * 0.4;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color; ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.font = `bold ${f.styleRank === 'S' ? 20 : 16}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(f.styleRank, f.x, f.y - 92);
  // Style bar
  const barW = 30, barH = 3;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(f.x - barW / 2, f.y - 86, barW, barH);
  ctx.fillStyle = color;
  ctx.fillRect(f.x - barW / 2, f.y - 86, barW * (f.styleMeter / 100), barH);
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawPoiseBar(ctx: CanvasRenderingContext2D, f: Fighter) {
  const ratio = f.poise / f.maxPoise;
  const barW = 30, barH = 3, yOff = f.isCrouching ? -22 : -2;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(f.x - barW / 2, f.y + yOff, barW, barH);
  ctx.fillStyle = f.isPoiseBroken ? '#ef4444' : ratio < 0.4 ? '#f59e0b' : '#a78bfa';
  ctx.fillRect(f.x - barW / 2, f.y + yOff, barW * ratio, barH);
}

export function drawRegenIndicator(ctx: CanvasRenderingContext2D, f: Fighter) {
  if (f.regenTimer < 120 || f.health >= f.maxHealth || f.health <= 0) return;
  const alpha = Math.min(1, (f.regenTimer - 120) / 60) * 0.5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#4ade80';
  ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('+', f.x, f.y - 96);
  ctx.restore();
}

export function drawMatchStats(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.gamePhase !== 'roundEnd' && state.gamePhase !== 'gameOver') return;
  const s = state.matchStats;
  const p1 = state.player1, p2 = state.player2;
  
  // Show stats during round end / game over
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, CANVAS_WIDTH / 2 - 180, CANVAS_HEIGHT / 2 + 20, 360, 80, 8);
  ctx.fill();
  
  ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText(`DMG: ${Math.round(s.p1DamageDealt)} | Combo: ${s.p1LongestCombo}x | Acc: ${Math.round(s.p1Accuracy * 100)}%`, CANVAS_WIDTH / 2 - 170, CANVAS_HEIGHT / 2 + 38);
  ctx.fillStyle = p1.styleRank !== 'D' ? (['', '#22c55e', '#3b82f6', '#a855f7', '#fbbf24'][['D','C','B','A','S'].indexOf(p1.styleRank)] || '#888') : '#666';
  ctx.fillText(`Style: ${p1.styleRank}`, CANVAS_WIDTH / 2 - 170, CANVAS_HEIGHT / 2 + 52);
  
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f87171';
  ctx.fillText(`DMG: ${Math.round(s.p2DamageDealt)} | Combo: ${s.p2LongestCombo}x | Acc: ${Math.round(s.p2Accuracy * 100)}%`, CANVAS_WIDTH / 2 + 170, CANVAS_HEIGHT / 2 + 38);
  ctx.fillStyle = p2.styleRank !== 'D' ? (['', '#22c55e', '#3b82f6', '#a855f7', '#fbbf24'][['D','C','B','A','S'].indexOf(p2.styleRank)] || '#888') : '#666';
  ctx.fillText(`Style: ${p2.styleRank}`, CANVAS_WIDTH / 2 + 170, CANVAS_HEIGHT / 2 + 52);

  // Avg style
  ctx.textAlign = 'center';
  ctx.fillStyle = '#888';
  ctx.font = '9px monospace';
  ctx.fillText(`Rounds: ${s.totalRounds}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
}

export function drawCountdown(ctx: CanvasRenderingContext2D, timer: number) {
  const seconds = Math.ceil(timer / 60);
  const text = seconds > 0 ? `${seconds}` : '⚔ FIGHT! ⚔';
  const scale = 1 + (timer % 60) / 60 * 0.5;
  ctx.save(); ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = 'bold 72px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(text, 2, 2);
  ctx.fillStyle = seconds > 0 ? '#ffffff' : '#fbbf24';
  ctx.shadowColor = seconds > 0 ? '#ffffff' : '#fbbf24'; ctx.shadowBlur = 20;
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0; ctx.restore();
}

export function drawGameOver(ctx: CanvasRenderingContext2D, winner: string | null, frame: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  const pulse = 1 + Math.sin(frame * 0.05) * 0.03;
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 52px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(winner ? `🏆 ${winner} WINS! 🏆` : '⚖ DRAW! ⚖', 0, 0);
  ctx.shadowBlur = 0; ctx.restore();

  const alpha = 0.5 + Math.sin(frame * 0.08) * 0.5;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#aaaaaa'; ctx.font = '20px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Press SPACE to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  ctx.globalAlpha = 1;
}

export function drawRoundEnd(ctx: CanvasRenderingContext2D, winner: string | null) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.save();
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 15;
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 42px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(winner ? `${winner} wins the round!` : 'Round Draw!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.shadowBlur = 0; ctx.restore();
}

export function drawScreenFlash(ctx: CanvasRenderingContext2D, flash: number) {
  if (flash <= 0) return;
  ctx.fillStyle = `rgba(255, 255, 255, ${flash / 20 * 0.5})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function drawShadow(ctx: CanvasRenderingContext2D, fighter: Fighter) {
  const shadowScale = Math.max(0.3, 1 - (GROUND_Y - (fighter.y + 20)) / 200);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(fighter.x, GROUND_Y + 20, 20 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Menu Screen ─────────────────────────────────────────────────
export function drawMenu(ctx: CanvasRenderingContext2D, frameCount: number) {
  drawBackground(ctx, frameCount);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const titleY = 100 + Math.sin(frameCount * 0.03) * 5;

  ctx.save();
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 52px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('STICKMAN', CANVAS_WIDTH / 2, titleY);
  ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#ef4444'; ctx.font = 'bold 68px "Segoe UI", sans-serif';
  ctx.fillText('FIGHTER', CANVAS_WIDTH / 2, titleY + 60);
  ctx.shadowBlur = 0; ctx.restore();

  ctx.fillStyle = '#c084fc'; ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.fillText('⚡ SUPERNATURAL POWERS EDITION ⚡', CANVAS_WIDTH / 2, titleY + 92);

  const alpha = 0.5 + Math.sin(frameCount * 0.08) * 0.5;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.fillText('Press SPACE to start', CANVAS_WIDTH / 2, 310);
  ctx.globalAlpha = 1;

  const cy = 350;
  const drawControls = (label: string, clr: string, cx: number, controls: string[][]) => {
    ctx.fillStyle = clr; ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText(label, cx, cy);
    ctx.fillStyle = '#bbbbbb'; ctx.font = '12px "Segoe UI", sans-serif';
    controls.forEach(([text], i) => {
      ctx.fillText(text, cx, cy + 18 + i * 16);
    });
  };

  drawControls('🔵 PLAYER 1', '#60a5fa', CANVAS_WIDTH / 2 - 220, [
    ['Move: W A S D'],
    ['Punch: F | Kick: G | Uppercut: R'],
    ['Block: E | Teleport: C'],
    ['🔥 Fireball: Q | ⚡ Lightning: T'],
    ['💥 Super: V (when charged)'],
  ]);
  drawControls('🔴 PLAYER 2', '#f87171', CANVAS_WIDTH / 2 + 220, [
    ['Move: Arrow Keys'],
    ['Punch: L | Kick: K | Uppercut: O'],
    ['Block: I | Teleport: .'],
    ['🔥 Fireball: P | ⚡ Lightning: J'],
    ['💥 Super: , (when charged)'],
  ]);

  const defaultFighter = (fx: number, f: 1 | -1, c: string, gc: string, n: string): Fighter => ({
    x: fx, y: GROUND_Y, vx: 0, vy: 0, width: 40, height: 60,
    health: 200, maxHealth: 200, energy: 100, maxEnergy: 100,
    superCharge: 100, maxSuperCharge: 100,
    action: 'idle', actionTimer: 0, facing: f,
    isGrounded: true, combo: 0, comboTimer: 0, wins: 0,
    color: c, glowColor: gc, name: n, hitCooldown: 0,
    isBlocking: false, isCrouching: false, lastHitBy: '',
    shakeTimer: 0, flashTimer: 0, teleportTrail: [],
    auraIntensity: 1.2, isChargingSuper: false,
    superActive: false, superTimer: 0,
    poise: 100, maxPoise: 100, poiseRegenTimer: 0,
    isPoiseBroken: false, poiseBreakTimer: 0,
    styleMeter: 0, styleRank: 'D', styleDecayTimer: 0, lastAttackType: '', totalStyleBonus: 0,
    regenTimer: 0, isRaging: false, rageTimer: 0,
    stats: { damageDealt: 0, damageTaken: 0, longestCombo: 0, totalHits: 0, totalAttacks: 0, perfectRound: false, rageActivations: 0, poiseBreaks: 0, supersLanded: 0 },
  });

  const pf1 = defaultFighter(CANVAS_WIDTH / 2 - 220, 1, '#60a5fa', '#3b82f6', 'P1');
  const pf2 = defaultFighter(CANVAS_WIDTH / 2 + 220, -1, '#f87171', '#ef4444', 'P2');
  drawAura(ctx, pf1, frameCount);
  drawAura(ctx, pf2, frameCount);
  drawStickman(ctx, pf1, frameCount);
  drawStickman(ctx, pf2, frameCount);
}
