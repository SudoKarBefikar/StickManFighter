import { useState, useCallback, useEffect, useRef } from 'react';
import Lobby from './game/Lobby';
import GameCanvas from './game/GameCanvas';
import TouchControls from './game/TouchControls';
import AnimatedTutorial from './game/AnimatedTutorial';
import { NetworkManager } from './game/network';
import { PlayerInput } from './game/types';

type Screen = 'lobby' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [network, setNetwork] = useState<NetworkManager | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mountedRef = useRef(true);

  // Detect touch device & orientation
  useEffect(() => {
    mountedRef.current = true;
    const check = () => {
      if (!mountedRef.current) return;
      // Use touch capability as the primary check — NOT screen width
      // This ensures tablets, iPads, and large phones all get touch controls
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      // Only exclude actual desktops (no touch at all)
      const isDesktop = !hasTouchScreen;
      const landscape = window.innerWidth >= window.innerHeight;
      setIsMobile(!isDesktop);
      setIsLandscape(landscape);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 150));
    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', check);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Auto fullscreen + landscape lock when game starts on mobile
  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
      // Lock to landscape
      const orient = (window.screen as any).orientation;
      if (orient?.lock) {
        try { await orient.lock('landscape'); } catch { /* not supported */ }
      }
    } catch { /* fullscreen denied */ }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      const orient = (window.screen as any).orientation;
      if (orient?.unlock) orient.unlock();
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* ignore */ }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) exitFullscreen();
    else enterFullscreen();
  }, [enterFullscreen, exitFullscreen]);

  // Start game
  const handleGameStart = useCallback((net: NetworkManager, name: string) => {
    setNetwork(net);
    setPlayerName(name);
    setScreen('game');
    // Auto fullscreen on mobile
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setTimeout(() => enterFullscreen(), 300);
    }
  }, [enterFullscreen]);

  // Leave game — properly disconnect everything
  const handleDisconnect = useCallback(() => {
    try {
      if (network) {
        network.disconnect();
      }
    } catch { /* ignore */ }
    setNetwork(null);
    setScreen('lobby');
    // Exit fullscreen if active
    try {
      if (document.fullscreenElement) document.exitFullscreen();
    } catch { /* ignore */ }
  }, [network]);

  // Touch input relay
  const handleTouchInput = useCallback((partial: Partial<PlayerInput>) => {
    if ((window as any).__touchInput) {
      (window as any).__touchInput(partial);
    }
  }, []);

  const showControls = isMobile && isLandscape && screen === 'game';
  const showRotatePrompt = isMobile && !isLandscape && screen === 'game';

  return (
    <>
      {/* ─── PORTRAIT ROTATE PROMPT ─── */}
      {showRotatePrompt && (
        <div className="fixed inset-0 bg-gray-950 z-[300] flex flex-col items-center justify-center p-8">
          <div className="animate-bounce mb-6">
            <svg className="w-28 h-28 text-amber-400 drop-shadow-lg" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
              <rect x="25" y="5" width="50" height="90" rx="8" />
              <circle cx="50" cy="82" r="4" fill="currentColor" />
              <path d="M50 30 L50 55 M38 43 L50 30 L62 43" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Rotate Your Device</h2>
          <p className="text-gray-400 text-center text-sm mb-6">
            Play in <span className="text-amber-400 font-bold">landscape mode</span> for the best experience
          </p>
          <button
            onClick={enterFullscreen}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors"
          >
            Go Fullscreen
          </button>
        </div>
      )}

      {/* ─── TUTORIAL OVERLAY ─── */}
      {showTutorial && <AnimatedTutorial onClose={() => setShowTutorial(false)} />}

      {/* ─── LOBBY ─── */}
      {screen === 'lobby' && (
        <Lobby onGameStart={handleGameStart} onShowTutorial={() => setShowTutorial(true)} />
      )}

      {/* ─── GAME ─── */}
      {screen === 'game' && network && (
        <div className="fixed inset-0 bg-gray-950 flex flex-col select-none overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 flex-shrink-0 z-40">
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-lg bg-red-900/40 border border-red-800/50 text-red-400 text-xs font-semibold hover:bg-red-800/50 hover:text-red-300 transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              Leave
            </button>

            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-xs font-mono">
                Room <span className="text-amber-400 font-bold tracking-wider">{network.roomCode}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTutorial(true)}
                className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-xs hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center"
                title="Tutorial"
              >
                ?
              </button>
              <button
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06L5.44 6.5H2.75a.75.75 0 000 1.5h4.5a.75.75 0 00.75-.75v-4.5a.75.75 0 00-1.5 0v2.69L3.28 2.22zm13.44 0a.75.75 0 010 1.06L13.56 6.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v2.69l3.22-3.22a.75.75 0 011.06 0zM3.28 17.78a.75.75 0 001.06 0L7.5 14.56v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 000 1.06zm13.44 0a.75.75 0 01-1.06 0L12.5 14.56v2.69a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-2.69l3.22 3.22a.75.75 0 010 1.06z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2a.75.75 0 001.5 0v-2a.75.75 0 01.75-.75h2a.75.75 0 000-1.5h-2zM13.75 2a.75.75 0 000 1.5h2a.75.75 0 01.75.75v2a.75.75 0 001.5 0v-2A2.25 2.25 0 0015.75 2h-2zM3.5 13.75a.75.75 0 00-1.5 0v2A2.25 2.25 0 004.25 18h2a.75.75 0 000-1.5h-2a.75.75 0 01-.75-.75v-2zM18 13.75a.75.75 0 00-1.5 0v2a.75.75 0 01-.75.75h-2a.75.75 0 000 1.5h2A2.25 2.25 0 0018 15.75v-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Game canvas */}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-1">
            <GameCanvas
              network={network}
              playerName={playerName}
              onDisconnect={handleDisconnect}
            />
          </div>

          {/* Desktop controls hint */}
          {!isMobile && (
            <div className="flex-shrink-0 py-1.5 px-4 bg-gray-900/30 border-t border-gray-800">
              <p className="text-gray-500 text-[10px] text-center tracking-wide">
                <b className="text-gray-400">MOVE</b> WASD
                <span className="mx-2 text-gray-700">│</span>
                <b className="text-gray-400">ATTACK</b> J K U
                <span className="mx-2 text-gray-700">│</span>
                <b className="text-gray-400">BLOCK</b> L
                <span className="mx-2 text-gray-700">│</span>
                <b className="text-gray-400">POWERS</b> I O Shift Space
                <span className="mx-2 text-gray-700">│</span>
                <b className="text-gray-400">REMATCH</b> Enter
              </p>
            </div>
          )}

          {/* Touch controls */}
          <TouchControls visible={showControls} onInputChange={handleTouchInput} />
        </div>
      )}
    </>
  );
}
