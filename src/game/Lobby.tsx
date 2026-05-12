import { useState, useRef } from 'react';
import { NetworkManager, ConnectionStatus } from './network';

interface Props {
  onGameStart: (network: NetworkManager, playerName: string) => void;
  onShowTutorial: () => void;
}

export default function Lobby({ onGameStart, onShowTutorial }: Props) {
  const [screen, setScreen] = useState<'home' | 'create' | 'join'>('home');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const networkRef = useRef<NetworkManager | null>(null);

  const getNetwork = () => {
    if (!networkRef.current) networkRef.current = new NetworkManager();
    return networkRef.current;
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    setError('');
    const net = getNetwork();
    net.setHandlers(
      (msg) => { if (msg.type === 'ready') onGameStart(net, name.trim()); },
      (s) => setStatus(s),
      () => {}
    );
    try {
      const code = await net.createRoom();
      setCreatedCode(code);
    } catch { setError('Failed to create room. Try again.'); }
  };

  const handleJoin = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    if (roomCode.length < 5) { setError('Enter a valid room code'); return; }
    setError('');
    const net = getNetwork();
    net.setHandlers(() => {}, (s) => setStatus(s), () => {});
    try {
      await net.joinRoom(roomCode);
      net.send({ type: 'ready' });
      onGameStart(net, name.trim());
    } catch { setError('Could not connect. Check the code and try again.'); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const goBack = () => {
    try { networkRef.current?.disconnect(); } catch { /* ignore */ }
    setScreen('home');
    setStatus('idle');
    setCreatedCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-amber-400 tracking-tight">STICKMAN</h1>
          <h2 className="text-5xl sm:text-6xl font-black text-red-500 -mt-1">FIGHTER</h2>
          <p className="text-purple-400 text-sm mt-2 font-medium">⚡ Supernatural Powers Edition ⚡</p>
          <p className="text-gray-500 text-xs mt-1">Online P2P Multiplayer</p>
        </div>

        {screen === 'home' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter Your Name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 15))}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-lg"
              maxLength={15}
            />
            <button
              onClick={() => { if (!name.trim()) { setError('Enter your name'); return; } setError(''); setScreen('create'); handleCreate(); }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg hover:from-blue-500 hover:to-purple-500 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20"
            >
              🏟 Create Room
            </button>
            <button
              onClick={() => { if (!name.trim()) { setError('Enter your name'); return; } setError(''); setScreen('join'); }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
            >
              🎮 Join Room
            </button>
            <button
              onClick={onShowTutorial}
              className="w-full py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 font-medium hover:bg-gray-700 hover:border-gray-600 transition-all"
            >
              📖 How to Play
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <div className="mt-4 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs font-semibold">⌨️ DESKTOP CONTROLS</p>
                <button onClick={onShowTutorial} className="text-amber-400 text-xs hover:text-amber-300">See all →</button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>Move: <b className="text-gray-300">WASD</b></span>
                <span>Punch/Kick: <b className="text-gray-300">J / K</b></span>
                <span>Powers: <b className="text-gray-300">I O</b></span>
                <span>Super: <b className="text-gray-300">Space</b></span>
              </div>
              <p className="text-gray-600 text-[10px] mt-3 text-center">📱 Touch controls shown in landscape mode</p>
            </div>
          </div>
        )}

        {screen === 'create' && (
          <div className="space-y-4 text-center">
            {status === 'waiting' && createdCode ? (
              <>
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                  <p className="text-gray-400 text-sm mb-2">Room Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-mono font-bold text-amber-400 tracking-[0.3em]">{createdCode}</span>
                    <button onClick={copyCode} className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition-colors">
                      {copied ? '✓ Copied' : '📋'}
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm mt-3">Share this code with your opponent</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-gray-400 text-sm">Waiting for opponent...</span>
                </div>
              </>
            ) : status === 'connecting' ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400">Setting up room...</span>
              </div>
            ) : (
              <p className="text-red-400">{error || 'Connection failed'}</p>
            )}
            <button onClick={goBack} className="px-6 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">← Back</button>
          </div>
        )}

        {screen === 'join' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
              className="w-full px-4 py-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-center text-2xl font-mono tracking-[0.3em] uppercase"
              maxLength={5}
              autoFocus
            />
            <button
              onClick={handleJoin}
              disabled={status === 'connecting'}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-lg hover:from-orange-500 hover:to-red-500 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
            >
              {status === 'connecting' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </span>
              ) : 'Connect & Fight!'}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button onClick={goBack} className="w-full px-6 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
