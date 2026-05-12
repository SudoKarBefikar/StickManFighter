import { useState, useRef, useEffect } from 'react';

interface Props {
  onClose: () => void;
}

// Each step has an animation loop function
const STEPS = [
  {
    title: 'Welcome, Fighter!',
    desc: 'Learn how to battle with supernatural powers',
    anim: 'wave',
  },
  {
    title: 'Move Around',
    desc: 'Use WASD (keyboard) or joystick (mobile) to move and jump',
    anim: 'move',
    keys: ['W', 'A', 'S', 'D'],
  },
  {
    title: 'Basic Attacks',
    desc: 'Punch is fast, Kick has range, Uppercut launches!',
    anim: 'attack',
    keys: ['J', 'K', 'U'],
  },
  {
    title: 'Block & Counter',
    desc: 'Block reduces damage by 75% and builds energy',
    anim: 'block',
    keys: ['L'],
  },
  {
    title: 'Special Powers',
    desc: 'Fireball, Lightning, Teleport — use energy wisely!',
    anim: 'special',
    keys: ['I', 'O', 'Shift'],
  },
  {
    title: 'Super Attack',
    desc: 'When the SUPER bar is full, unleash devastation!',
    anim: 'super',
    keys: ['Space'],
  },
  {
    title: 'Ready to Fight!',
    desc: 'Best of 3 rounds. Show no mercy!',
    anim: 'ready',
    keys: [],
  },
];

function drawStickman(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, pose: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  const breathe = Math.sin(frame * 0.08) * 2;

  // Head
  ctx.beginPath();
  ctx.arc(0, -40 + breathe, 10, 0, Math.PI * 2);
  ctx.stroke();
  // Body
  ctx.beginPath();
  ctx.moveTo(0, -30 + breathe);
  ctx.lineTo(0, 0);
  ctx.stroke();

  if (pose === 'wave') {
    // Waving arm
    ctx.beginPath();
    ctx.moveTo(0, -25 + breathe);
    ctx.lineTo(15 + Math.sin(frame * 0.1) * 5, -40);
    ctx.stroke();
    // Other arm down
    ctx.beginPath();
    ctx.moveTo(0, -25 + breathe);
    ctx.lineTo(-12, -15);
    ctx.stroke();
  } else if (pose === 'move') {
    const walk = Math.sin(frame * 0.12);
    // Arms sway
    ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(-10 * walk, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(10 * walk, -12); ctx.stroke();
    // Legs walk
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8 * walk, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8 * walk, 18); ctx.stroke();
  } else if (pose === 'attack') {
    const phase = (frame % 60) / 60;
    if (phase < 0.33) {
      // Punch
      const ext = Math.min(1, phase * 4);
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(25 * ext, -22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(-10, -12); ctx.stroke();
    } else if (phase < 0.66) {
      // Kick
      const ext = Math.min(1, (phase - 0.33) * 4);
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(-10, -15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(8, -15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28 * ext, -5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, 18); ctx.stroke();
    } else {
      // Uppercut
      const ext = Math.min(1, (phase - 0.66) * 4);
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(12, -25 - 20 * ext); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(-10, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 18); ctx.stroke();
    }
  } else if (pose === 'block') {
    // Shield effect
    ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(12, -20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(-12, -20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 18); ctx.stroke();
    // Shield glow
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(15, -20, 18, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  } else if (pose === 'special') {
    const phase = (frame % 90) / 90;
    if (phase < 0.33) {
      // Fireball
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(20, -22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(-10, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 18); ctx.stroke();
      // Fireball
      const fb = Math.min(1, phase * 5);
      ctx.fillStyle = `rgba(255, 165, 0, ${0.8 * fb})`;
      ctx.beginPath();
      ctx.arc(35 + phase * 50, -22, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (phase < 0.66) {
      // Lightning
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(8, -45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(-10, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 18); ctx.stroke();
      // Lightning bolt
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -45);
      ctx.lineTo(20, -25);
      ctx.lineTo(10, -20);
      ctx.lineTo(25, 0);
      ctx.stroke();
    } else {
      // Teleport
      const alpha = Math.abs(Math.sin(frame * 0.2));
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(15, -18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(-12, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 18); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (pose === 'super') {
    const phase = (frame % 60) / 60;
    const charge = Math.min(1, phase * 2);
    // Power up pose
    ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(20 * charge, -22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -25 + breathe); ctx.lineTo(-20 * charge, -22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, 18); ctx.stroke();
    // Aura
    const auraSize = 30 + charge * 15;
    ctx.strokeStyle = `rgba(244, 114, 182, ${0.3 + charge * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -15, auraSize, 0, Math.PI * 2);
    ctx.stroke();
  } else if (pose === 'ready') {
    const bob = Math.sin(frame * 0.1) * 3;
    ctx.beginPath(); ctx.moveTo(0, -25 + bob); ctx.lineTo(15, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -25 + bob); ctx.lineTo(-15, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 18); ctx.stroke();
    // Exclamation mark
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('!', 0, -55 + bob);
  }

  ctx.restore();
}

export default function AnimatedTutorial({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef(0);

  const current = STEPS[step];

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      frameRef.current++;
      const f = frameRef.current;

      ctx.clearRect(0, 0, 240, 180);

      // Dark background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 240, 180);

      // Ground line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.lineTo(240, 140);
      ctx.stroke();

      // Draw main stickman
      drawStickman(ctx, 80, 140, f, current.anim);

      // Draw target dummy for attack animations
      if (current.anim === 'attack' || current.anim === 'special' || current.anim === 'super') {
        ctx.save();
        ctx.translate(170, 140);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        const hitShake = current.anim === 'attack' && (f % 60) > 15 && (f % 60) < 25 ? 3 : 0;
        ctx.translate(hitShake, 0);
        // Head
        ctx.beginPath(); ctx.arc(0, -40, 8, 0, Math.PI * 2); ctx.stroke();
        // Body
        ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, 0); ctx.stroke();
        // Arms
        ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(-10, -15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(10, -15); ctx.stroke();
        // Legs
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, 18); ctx.stroke();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [current.anim]);

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-xs font-mono">STEP {step + 1} / {STEPS.length}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>

          {/* Animation canvas */}
          <div className="flex justify-center mb-4">
            <div className="rounded-xl overflow-hidden border border-gray-700" style={{ background: '#0f172a' }}>
              <canvas
                ref={canvasRef}
                width={240}
                height={180}
                className="block"
              />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-1">{current.title}</h2>
          <p className="text-gray-400 text-sm text-center mb-4">{current.desc}</p>

          {/* Key indicators */}
          {current.keys && current.keys.length > 0 && (
            <div className="flex justify-center gap-2 mb-4">
              {current.keys.map((key) => (
                <div
                  key={key}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 text-sm font-mono font-bold"
                >
                  {key}
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-semibold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold hover:from-amber-400 hover:to-orange-400 transition-all active:scale-95"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold hover:from-green-400 hover:to-emerald-400 transition-all active:scale-95"
              >
                🎮 Start Fighting!
              </button>
            )}
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'bg-amber-400 w-4' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
