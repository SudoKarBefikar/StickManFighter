import { useState, useEffect, useCallback, useRef } from 'react';
import { PlayerInput } from './types';

interface Props {
  visible: boolean;
  onInputChange: (input: Partial<PlayerInput>) => void;
  superReady: boolean;
}

// ─── COD/PUBG-Style Glass Button ────────────────────────
function GlassBtn({
  children, keyName, size = 55, color = 'rgba(255,255,255,0.12)',
  borderColor = 'rgba(255,255,255,0.3)', activeColor = 'rgba(255,255,255,0.35)',
  label, onStart, onEnd, pressed = false, glow = false,
}: {
  children: React.ReactNode; keyName: string; size?: number;
  color?: string; borderColor?: string; activeColor?: string;
  label?: string; pressed?: boolean; glow?: boolean;
  onStart: (key: string) => void; onEnd: (key: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ touchAction: 'none' }}>
      <div
        className="rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-[50ms]"
        style={{
          width: size, height: size,
          background: pressed ? activeColor : color,
          border: `1.5px solid ${pressed ? 'rgba(255,255,255,0.6)' : borderColor}`,
          boxShadow: pressed
            ? `0 0 25px ${borderColor}, inset 0 0 20px rgba(255,255,255,0.15)`
            : glow
            ? `0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.08), 0 0 20px ${borderColor}`
            : `0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.08)`,
          transform: pressed ? 'scale(0.9)' : 'scale(1)',
          WebkitTapHighlightColor: 'transparent',
        }}
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onStart(keyName); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onEnd(keyName); }}
        onTouchCancel={(e) => { e.preventDefault(); e.stopPropagation(); onEnd(keyName); }}
      >
        {children}
      </div>
      {label && (
        <span className="text-[7px] font-semibold tracking-wider uppercase"
          style={{ color: pressed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)' }}>
          {label}
        </span>
      )}
    </div>
  );
}

export default function TouchControls({ visible, onInputChange, superReady }: Props) {
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [joyActive, setJoyActive] = useState(false);
  const joyTouchIdRef = useRef<number | null>(null);
  const [pressed, setPressed] = useState<Record<string, boolean>>({});


  // ─── JOYSTICK ─────────────────────────
  const updateJoystick = useCallback((cx: number, cy: number) => {
    const pad = joyRef.current; const knob = knobRef.current;
    if (!pad || !knob) return;
    const r = pad.getBoundingClientRect();
    const mx = r.left + r.width / 2, my = r.top + r.height / 2;
    const maxR = r.width / 2 - 24;
    let dx = cx - mx, dy = cy - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const t = maxR * 0.32;
    onInputChange({ left: dx < -t, right: dx > t, jump: dy < -t, crouch: dy > t });
  }, [onInputChange]);

  const resetJoystick = useCallback(() => {
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px,0px)';
    setJoyActive(false); joyTouchIdRef.current = null;
    onInputChange({ left: false, right: false, jump: false, crouch: false });
  }, [onInputChange]);

  const onJoyStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    const t = e.changedTouches[0];
    joyTouchIdRef.current = t.identifier; setJoyActive(true);
    updateJoystick(t.clientX, t.clientY);
  }, [updateJoystick]);

  const onJoyMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchIdRef.current) {
        updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        return;
      }
    }
  }, [updateJoystick]);

  const onJoyEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchIdRef.current) { resetJoystick(); return; }
    }
  }, [resetJoystick]);

  // ─── BUTTON HANDLERS ─────────────────
  const handleBtnStart = useCallback((key: string) => {
    setPressed(p => ({ ...p, [key]: true }));
    onInputChange({ [key]: true } as Partial<PlayerInput>);
  }, [onInputChange]);

  const handleBtnEnd = useCallback((key: string) => {
    setPressed(p => ({ ...p, [key]: false }));
    onInputChange({ [key]: false } as Partial<PlayerInput>);
  }, [onInputChange]);

  // Prevent page scroll
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest('.hud-controls')) e.preventDefault();
    };
    document.addEventListener('touchstart', block, { passive: false });
    document.addEventListener('touchmove', block, { passive: false });
    return () => {
      document.removeEventListener('touchstart', block);
      document.removeEventListener('touchmove', block);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="hud-controls fixed inset-0 z-50 pointer-events-none"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.08) 0%, transparent 30%)' }}>

      {/* ═══════ LEFT: JOYSTICK ═══════ */}
      <div className="absolute left-3 bottom-5 pointer-events-auto" style={{ touchAction: 'none' }}>
        <div
          ref={joyRef}
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 140, height: 140,
            background: 'radial-gradient(circle, rgba(30,30,50,0.7) 0%, rgba(15,15,25,0.8) 100%)',
            border: '2px solid rgba(100,100,150,0.3)',
            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.6), 0 0 30px rgba(60,60,120,0.1)',
            backdropFilter: 'blur(4px)',
          }}
          onTouchStart={onJoyStart}
          onTouchMove={onJoyMove}
          onTouchEnd={onJoyEnd}
          onTouchCancel={onJoyEnd}
        >
          {/* Crosshair lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[1px] h-12 bg-white/10 absolute" />
            <div className="h-[1px] w-12 bg-white/10 absolute" />
          </div>
          {/* Outer ring */}
          <div className="absolute inset-4 rounded-full border border-white/5" />
          {/* Knob */}
          <div
            ref={knobRef}
            className="rounded-full transition-transform duration-[40ms] ease-out"
            style={{
              width: 56, height: 56,
              background: joyActive
                ? 'radial-gradient(circle at 35% 30%, rgba(120,160,255,0.9), rgba(50,80,200,0.7) 80%)'
                : 'radial-gradient(circle at 35% 30%, rgba(120,120,140,0.6), rgba(60,60,80,0.5) 80%)',
              border: `2px solid ${joyActive ? 'rgba(150,180,255,0.7)' : 'rgba(100,100,120,0.4)'}`,
              boxShadow: joyActive
                ? '0 0 20px rgba(80,120,255,0.4), inset 0 2px 6px rgba(255,255,255,0.2)'
                : '0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.08)',
            }}
          />
        </div>
      </div>

      {/* ═══════ RIGHT: MAIN ATTACKS (CoD-style diamond) ═══════ */}
      <div className="absolute right-3 bottom-5 pointer-events-auto" style={{ touchAction: 'none' }}>
        <div className="relative" style={{ width: 160, height: 160 }}>
          {/* PUNCH — Large primary button (like CoD fire button) */}
          <div className="absolute" style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}>
            <GlassBtn keyName="punch" size={68}
              color="rgba(239,68,68,0.2)" borderColor="rgba(239,68,68,0.45)" activeColor="rgba(239,68,68,0.5)"
              label="PUNCH" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.punch}>
              <img src="/punch.png" className="w-8 h-8 drop-shadow" alt="Punch" />
            </GlassBtn>
          </div>

          {/* KICK — Bottom */}
          <div className="absolute" style={{ left: '50%', bottom: 0, transform: 'translateX(-50%)' }}>
            <GlassBtn keyName="kick" size={54}
              color="rgba(239,68,68,0.15)" borderColor="rgba(239,68,68,0.35)" activeColor="rgba(239,68,68,0.4)"
              label="KICK" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.kick}>
              <img src="/kick.png" className="w-7 h-7 drop-shadow" alt="Kick" />
            </GlassBtn>
          </div>

          {/* UPPERCUT — Top */}
          <div className="absolute" style={{ left: '50%', top: 0, transform: 'translateX(-50%)' }}>
            <GlassBtn keyName="uppercut" size={50}
              color="rgba(251,146,60,0.18)" borderColor="rgba(251,146,60,0.4)" activeColor="rgba(251,146,60,0.45)"
              label="UPPER" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.uppercut}>
              <img src="/uppercut.png" className="w-6 h-6 drop-shadow" alt="Uppercut" />
            </GlassBtn>
          </div>

          {/* BLOCK — Left */}
          <div className="absolute" style={{ left: 0, top: '50%', transform: 'translateY(-50%)' }}>
            <GlassBtn keyName="block" size={50}
              color="rgba(34,197,94,0.15)" borderColor="rgba(34,197,94,0.4)" activeColor="rgba(34,197,94,0.4)"
              label="BLOCK" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.block}>
              <img src="/block.png" className="w-6 h-6 drop-shadow" alt="Block" />
            </GlassBtn>
          </div>
        </div>
      </div>

      {/* ═══════ CENTER-RIGHT: SPECIAL POWERS (like CoD skill buttons) ═══════ */}
      <div className="absolute right-[200px] bottom-6 pointer-events-auto flex flex-col gap-2 items-center"
        style={{ touchAction: 'none' }}>
        <div className="flex gap-2">
          <GlassBtn keyName="fireball" size={42}
            color="rgba(249,115,22,0.2)" borderColor="rgba(249,115,22,0.45)" activeColor="rgba(249,115,22,0.5)"
            label="FIRE" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.fireball}>
            <img src="/fire.png" className="w-5 h-5 drop-shadow" alt="Fireball" />
          </GlassBtn>
          <GlassBtn keyName="lightning" size={42}
            color="rgba(234,179,8,0.2)" borderColor="rgba(234,179,8,0.45)" activeColor="rgba(234,179,8,0.5)"
            label="BOLT" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.lightning}>
            <img src="/lighting.png" className="w-5 h-5 drop-shadow" alt="Lightning" />
          </GlassBtn>
        </div>
        <div className="flex gap-2">
          <GlassBtn keyName="teleport" size={42}
            color="rgba(139,92,246,0.2)" borderColor="rgba(139,92,246,0.45)" activeColor="rgba(139,92,246,0.5)"
            label="WARP" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.teleport}>
            <img src="/teleport.png" className="w-5 h-5 drop-shadow opacity-90" alt="Teleport" />
          </GlassBtn>
          {/* SUPER — Larger, more prominent */}
          <GlassBtn keyName="special" size={50}
            color="rgba(236,72,153,0.2)" borderColor="rgba(236,72,153,0.5)" activeColor="rgba(236,72,153,0.55)"
            label="SUPER" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.special} glow={superReady}>
            <img src="/super-attack.png" className="w-6 h-6 drop-shadow" alt="Super Attack" />
          </GlassBtn>
        </div>
      </div>

      {/* JUMP and DUCK buttons removed - joystick handles these actions */}
    </div>
  );
}
