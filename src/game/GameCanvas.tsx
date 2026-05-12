import { useEffect, useRef, useCallback } from 'react';
import { PlayerInput, GameState, NetMessage } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, KEYBOARD_CONTROLS, MAX_SUPER } from './constants';
import { createInitialState, updateGame, emptyInput } from './engine';
import { NetworkManager } from './network';
import TouchControls from './TouchControls';
import {
  drawBackground, drawStickman, drawAura, drawHealthBar, drawEnergyBar,
  drawSuperBar, drawParticles, drawProjectiles, drawLightningBolts,
  drawDamageTexts, drawTimer, drawCombo, drawRoundInfo, drawCountdown,
  drawGameOver, drawRoundEnd, drawScreenFlash, drawShadow,
  drawAnnouncements, drawStyleRank, drawPoiseBar, drawRegenIndicator, drawMatchStats,
} from './renderer';

interface Props {
  network: NetworkManager;
  playerName: string;
  onDisconnect: () => void;
}

export default function GameCanvas({ network, playerName, onDisconnect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const localInputRef = useRef<PlayerInput>(emptyInput());
  const prevLocalInputRef = useRef<PlayerInput>(emptyInput());
  const remoteInputRef = useRef<PlayerInput>(emptyInput());
  const prevRemoteInputRef = useRef<PlayerInput>(emptyInput());
  const frameRef = useRef(0);
  const animRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const latencyRef = useRef(0);
  const remoteReadyRef = useRef(false);
  const rematchRequestedRef = useRef(false);
  const seqRef = useRef(0);
  const lastSendRef = useRef(0);

  const isHost = network.isHost;
  const myRole = isHost ? 'player1' : 'player2';

  // Set player names
  useEffect(() => {
    const st = stateRef.current;
    if (isHost) {
      st.player1.name = playerName;
      network.send({ type: 'name', name: playerName });
    } else {
      st.player2.name = playerName;
      network.send({ type: 'name', name: playerName });
    }
  }, [playerName, isHost, network]);

  // Handle incoming network messages
  const handleNetMessage = useCallback((msg: NetMessage) => {
    if (msg.type === 'input') {
      prevRemoteInputRef.current = { ...remoteInputRef.current };
      remoteInputRef.current = msg.input;
    } else if (msg.type === 'state') {
      // Guest receives authoritative state from host
      if (!isHost) {
        // Preserve particles/effects locally for smooth visuals
        const prev = stateRef.current;
        stateRef.current = {
          ...msg.state,
          particles: prev.particles,
          damageTexts: prev.damageTexts,
        };
      }
    } else if (msg.type === 'ready') {
      remoteReadyRef.current = true;
    } else if (msg.type === 'name') {
      if (isHost) {
        stateRef.current.player2.name = msg.name;
      } else {
        stateRef.current.player1.name = msg.name;
      }
    } else if (msg.type === 'rematch') {
      stateRef.current = createInitialState();
      const st = stateRef.current;
      if (isHost) { st.player1.name = playerName; st.player2.name = ''; }
      else { st.player2.name = playerName; st.player1.name = ''; }
      network.send({ type: 'name', name: playerName });
      rematchRequestedRef.current = false;
    }
  }, [isHost, network, playerName]);

  useEffect(() => {
    network.setHandlers(
      handleNetMessage,
      (status) => { if (status === 'idle' || status === 'error') onDisconnect(); },
      (ms) => { latencyRef.current = ms; }
    );
    network.send({ type: 'ready' });
    network.send({ type: 'name', name: playerName });
  }, [network, handleNetMessage, onDisconnect, playerName]);

  // Keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.key.toLowerCase()] = true;
    // Rematch with Enter
    if (e.key === 'Enter' && stateRef.current.gamePhase === 'gameOver' && !rematchRequestedRef.current) {
      rematchRequestedRef.current = true;
      network.send({ type: 'rematch' });
      stateRef.current = createInitialState();
      const st = stateRef.current;
      if (isHost) st.player1.name = playerName;
      else st.player2.name = playerName;
      network.send({ type: 'name', name: playerName });
    }
  }, [network, isHost, playerName]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.key.toLowerCase()] = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [handleKeyDown, handleKeyUp]);

  // Touch input handler
  const handleTouchInput = useCallback((partial: Partial<PlayerInput>) => {
    Object.assign(localInputRef.current, partial);
  }, []);

  // Expose touch handler to parent
  useEffect(() => {
    (window as any).__touchInput = handleTouchInput;
    return () => { delete (window as any).__touchInput; };
  }, [handleTouchInput]);

  // Build input from keyboard
  const buildInput = useCallback((): PlayerInput => {
    const k = keysRef.current;
    const kc = KEYBOARD_CONTROLS;
    const touch = localInputRef.current;
    return {
      left: !!(k[kc.left] || k['arrowleft']) || touch.left,
      right: !!(k[kc.right] || k['arrowright']) || touch.right,
      jump: !!(k[kc.jump] || k['arrowup']) || touch.jump,
      crouch: !!(k[kc.crouch] || k['arrowdown']) || touch.crouch,
      punch: !!(k[kc.punch]) || touch.punch,
      kick: !!(k[kc.kick]) || touch.kick,
      uppercut: !!(k[kc.uppercut]) || touch.uppercut,
      block: !!(k[kc.block]) || touch.block,
      fireball: !!(k[kc.fireball]) || touch.fireball,
      lightning: !!(k[kc.lightning]) || touch.lightning,
      teleport: !!(k[kc.teleport]) || touch.teleport,
      special: !!(k[kc.special]) || touch.special,
      seq: seqRef.current++,
    };
  }, []);

  // Canvas scaling - responsive to container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const cw = container.clientWidth - 8;
      const ch = container.clientHeight - 8;
      // On mobile landscape, fill more of the screen
      const isMobileLandscape = window.innerWidth < 1024 && window.innerWidth > window.innerHeight;
      const maxScale = isMobileLandscape ? 1.5 : (window.innerWidth >= 1024 ? 1.3 : 1);
      const scale = Math.min(cw / CANVAS_WIDTH, ch / CANVAS_HEIGHT, maxScale);
      canvas.style.width = `${Math.floor(CANVAS_WIDTH * scale)}px`;
      canvas.style.height = `${Math.floor(CANVAS_HEIGHT * scale)}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 50));
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      frameRef.current++;
      const frame = frameRef.current;
      const state = stateRef.current;

      // Build current input
      const currentInput = buildInput();

      // Send input to peer (throttle to every 2 frames = ~30Hz for bandwidth)
      const now = Date.now();
      if (now - lastSendRef.current >= 16) {
        network.send({ type: 'input', input: currentInput });
        lastSendRef.current = now;
      }

      // Determine which input goes to which player
      const p1Input = isHost ? currentInput : remoteInputRef.current;
      const p1Prev = isHost ? prevLocalInputRef.current : prevRemoteInputRef.current;
      const p2Input = isHost ? remoteInputRef.current : currentInput;
      const p2Prev = isHost ? prevRemoteInputRef.current : prevLocalInputRef.current;

      // Update game (both host and guest run simulation)
      stateRef.current = updateGame(state, p1Input, p1Prev, p2Input, p2Prev);

      // Host sends authoritative state every 3 frames
      if (isHost && frame % 3 === 0) {
        // Send state without particles (too much data)
        const toSend: GameState = {
          ...stateRef.current,
          particles: [],
          damageTexts: [],
          lightningBolts: stateRef.current.lightningBolts.map(b => ({...b, segments: b.segments?.slice(0, 3) || []})),
        };
        network.send({ type: 'state', state: toSend, seq: frame });
      }

      // Save prev input
      prevLocalInputRef.current = { ...currentInput };

      // ── Render ──
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.save();
      if (state.screenShake > 0.5) {
        ctx.translate(
          (Math.random()-0.5)*state.screenShake*2,
          (Math.random()-0.5)*state.screenShake*2
        );
      }
      drawBackground(ctx, frame);
      drawShadow(ctx, state.player1); drawShadow(ctx, state.player2);
      drawAura(ctx, state.player1, frame); drawAura(ctx, state.player2, frame);
      drawStickman(ctx, state.player1, frame); drawStickman(ctx, state.player2, frame);
      drawProjectiles(ctx, state.projectiles, frame);
      drawLightningBolts(ctx, state.lightningBolts);
      drawParticles(ctx, state.particles);
      drawDamageTexts(ctx, state.damageTexts);
       drawCombo(ctx, state.player1); drawCombo(ctx, state.player2);
       drawStyleRank(ctx, state.player1); drawStyleRank(ctx, state.player2);
       // drawPoiseBar(ctx, state.player1); drawPoiseBar(ctx, state.player2); // Commented out to hide poise bar
       drawRegenIndicator(ctx, state.player1); drawRegenIndicator(ctx, state.player2);
      ctx.restore();
      drawScreenFlash(ctx, state.screenFlash);
 
      // Announcements (no shake)
      drawAnnouncements(ctx, state.announcements);
 
      // UI
      drawHealthBar(ctx, 20, 30, 350, state.player1.health, state.player1.maxHealth, state.player1.color, state.player1.name, false);
      drawHealthBar(ctx, CANVAS_WIDTH-370, 30, 350, state.player2.health, state.player2.maxHealth, state.player2.color, state.player2.name, true);
      drawEnergyBar(ctx, 20, 58, 350, state.player1.energy, state.player1.maxEnergy, false);
      drawEnergyBar(ctx, CANVAS_WIDTH-370, 58, 350, state.player2.energy, state.player2.maxEnergy, true);
      drawSuperBar(ctx, 20, 72, 350, state.player1.superCharge, state.player1.maxSuperCharge, false, state.player1.glowColor, frame);
      drawSuperBar(ctx, CANVAS_WIDTH-370, 72, 350, state.player2.superCharge, state.player2.maxSuperCharge, true, state.player2.glowColor, frame);
      drawTimer(ctx, Math.max(0, state.roundTimer/60));
      drawRoundInfo(ctx, state);

      if (state.gamePhase === 'countdown') drawCountdown(ctx, state.countdownTimer);
      else if (state.gamePhase === 'roundEnd') { drawRoundEnd(ctx, state.winner); drawMatchStats(ctx, state); }
      else if (state.gamePhase === 'gameOver') { drawGameOver(ctx, state.winner, frame); drawMatchStats(ctx, state); }

      // Latency indicator
      ctx.fillStyle = latencyRef.current < 50 ? '#4ade80' : latencyRef.current < 100 ? '#fbbf24' : '#f87171';
      ctx.font = '11px monospace'; ctx.textAlign = 'right';
      ctx.fillText(`${latencyRef.current}ms`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 5);

      // You are indicator
      ctx.fillStyle = myRole === 'player1' ? '#60a5fa' : '#f87171';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`You: ${myRole === 'player1' ? '🔵 P1 (Left)' : '🔴 P2 (Right)'}`, 10, CANVAS_HEIGHT - 5);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [network, isHost, buildInput, myRole]);

  const localPlayer = isHost ? stateRef.current.player1 : stateRef.current.player2;
  const superReady = localPlayer.superCharge >= MAX_SUPER;

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block rounded-lg"
      />
      <TouchControls visible={true} onInputChange={handleTouchInput} superReady={superReady} />
    </div>
  );
}
