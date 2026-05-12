import { useState, useEffect, useCallback, useRef } from 'react';
import { PlayerInput } from './types';

interface Props {
  visible: boolean;
  onInputChange: (input: Partial<PlayerInput>) => void;
}

// ─── COD/PUBG-Style Glass Button ────────────────────────
function GlassBtn({
  children, keyName, size = 60, color = 'rgba(255,255,255,0.15)',
  borderColor = 'rgba(255,255,255,0.25)', activeColor = 'rgba(255,255,255,0.4)',
  label, onStart, onEnd, pressed = false,
}: {
  children: React.ReactNode; keyName: string; size?: number;
  color?: string; borderColor?: string; activeColor?: string;
  label?: string; pressed?: boolean;
  onStart: (key: string) => void; onEnd: (key: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ touchAction: 'none' }}>
      <div
        className="rounded-full flex items-center justify-center backdrop-blur-sm transition-transform duration-[50ms]"
        style={{
          width: size, height: size,
          background: pressed ? activeColor : color,
          border: `2px solid ${pressed ? 'rgba(255,255,255,0.5)' : borderColor}`,
          boxShadow: pressed
            ? `0 0 20px ${borderColor}, inset 0 0 15px rgba(255,255,255,0.1)`
            : `0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.05)`,
          transform: pressed ? 'scale(0.88)' : 'scale(1)',
          WebkitTapHighlightColor: 'transparent',
        }}
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onStart(keyName); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onEnd(keyName); }}
        onTouchCancel={(e) => { e.preventDefault(); e.stopPropagation(); onEnd(keyName); }}
      >
        {children}
      </div>
      {label && (
        <span className="text-[8px] font-bold tracking-widest uppercase"
          style={{ color: pressed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
          {label}
        </span>
      )}
    </div>
  );
}

export default function TouchControls({ visible, onInputChange }: Props) {
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
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 20%)' }}>

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
        <div className="relative" style={{ width: 180, height: 180 }}>
          {/* PUNCH — Large primary button (like CoD fire button) */}
          <div className="absolute" style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}>
            <GlassBtn keyName="punch" size={72}
              color="rgba(239,68,68,0.2)" borderColor="rgba(239,68,68,0.45)" activeColor="rgba(239,68,68,0.5)"
              label="PUNCH" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.punch}>
              <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8 drop-shadow">
                <path d="M18.5 11c.83 0 1.5-.67 1.5-1.5V6c0-2.21-1.79-4-4-4h-2c-.77 0-1.47.3-2 .78-.53-.48-1.23-.78-2-.78H8C5.79 2 4 3.79 4 6v3.5C4 10.33 4.67 11 5.5 11c.55 0 1.04-.29 1.31-.73l.5.73h.19v1.25c0 .41.34.75.75.75s.75-.34.75-.75V11h4v1.25c0 .41.34.75.75.75s.75-.34.75-.75V11h.19l.5-.73c.27.44.76.73 1.31.73zM8 9V6c0-1.1.9-2 2-2h2v5H8zm8 0h-4V4h2c1.1 0 2 .9 2 2v3zM5 14v4c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-4H5zm8 6h-2v-4h2v4z"/>
              </svg>
            </GlassBtn>
          </div>

          {/* KICK — Bottom */}
          <div className="absolute" style={{ left: '50%', bottom: 0, transform: 'translateX(-50%)' }}>
            <GlassBtn keyName="kick" size={58}
              color="rgba(239,68,68,0.15)" borderColor="rgba(239,68,68,0.35)" activeColor="rgba(239,68,68,0.4)"
              label="KICK" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.kick}>
              <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 drop-shadow">
                <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM17.5 10.78c-1.23-.37-2.22-1.17-2.8-2.18l-1-1.6c-.41-.65-1.11-1-1.84-1-.78 0-1.59.5-1.78 1.44S7 13 7 13H4v7h3v-4l2.05-1.03L10.5 21H13l-1.4-6.03L13.7 13l1.8 1.62V20h2.5v-6.5l-2.5-2.72z"/>
              </svg>
            </GlassBtn>
          </div>

          {/* UPPERCUT — Top */}
          <div className="absolute" style={{ left: '50%', top: 0, transform: 'translateX(-50%)' }}>
            <GlassBtn keyName="uppercut" size={54}
              color="rgba(251,146,60,0.18)" borderColor="rgba(251,146,60,0.4)" activeColor="rgba(251,146,60,0.45)"
              label="UPPER" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.uppercut}>
              <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 drop-shadow">
                <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
              </svg>
            </GlassBtn>
          </div>

          {/* BLOCK — Left */}
          <div className="absolute" style={{ left: 0, top: '50%', transform: 'translateY(-50%)' }}>
            <GlassBtn keyName="block" size={54}
              color="rgba(34,197,94,0.15)" borderColor="rgba(34,197,94,0.4)" activeColor="rgba(34,197,94,0.4)"
              label="BLOCK" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.block}>
              <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 drop-shadow">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </GlassBtn>
          </div>
        </div>
      </div>

      {/* ═══════ CENTER-RIGHT: SPECIAL POWERS (like CoD skill buttons) ═══════ */}
      <div className="absolute right-[200px] bottom-6 pointer-events-auto flex flex-col gap-2 items-center"
        style={{ touchAction: 'none' }}>
        <div className="flex gap-2">
          <GlassBtn keyName="fireball" size={46}
            color="rgba(249,115,22,0.2)" borderColor="rgba(249,115,22,0.45)" activeColor="rgba(249,115,22,0.5)"
            label="FIRE" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.fireball}>
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 drop-shadow">
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
            </svg>
          </GlassBtn>
          <GlassBtn keyName="lightning" size={46}
            color="rgba(234,179,8,0.2)" borderColor="rgba(234,179,8,0.45)" activeColor="rgba(234,179,8,0.5)"
            label="BOLT" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.lightning}>
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 drop-shadow">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
          </GlassBtn>
        </div>
        <div className="flex gap-2">
          <GlassBtn keyName="teleport" size={46}
            color="rgba(139,92,246,0.2)" borderColor="rgba(139,92,246,0.45)" activeColor="rgba(139,92,246,0.5)"
            label="WARP" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.teleport}>
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 drop-shadow opacity-90">
              <circle cx="12" cy="12" r="3.5"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" opacity="0.5"/>
            </svg>
          </GlassBtn>
          {/* SUPER — Larger, more prominent */}
          <GlassBtn keyName="special" size={54}
            color="rgba(236,72,153,0.2)" borderColor="rgba(236,72,153,0.5)" activeColor="rgba(236,72,153,0.55)"
            label="SUPER" onStart={handleBtnStart} onEnd={handleBtnEnd} pressed={pressed.special}>
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 drop-shadow">
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
            </svg>
          </GlassBtn>
        </div>
      </div>

      {/* JUMP and DUCK buttons removed - joystick handles these actions */}
    </div>
  );
}
