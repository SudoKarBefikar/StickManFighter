import { useState } from 'react';

interface Props {
  onClose: () => void;
}

const MOVES = [
  { name: 'Movement', keys: 'WASD / Arrows', icon: '🏃', desc: 'Move left/right, jump up, crouch down', color: '#60a5fa' },
  { name: 'Punch', keys: 'J', icon: '👊', desc: 'Quick jab attack. Fast but short range.', color: '#f87171' },
  { name: 'Kick', keys: 'K', icon: '🦵', desc: 'Powerful kick. More damage, longer range.', color: '#f87171' },
  { name: 'Uppercut', keys: 'U', icon: '⬆', desc: 'Launches enemy into the air! Great combo starter.', color: '#fb923c' },
  { name: 'Block', keys: 'L', icon: '🛡', desc: 'Blocks 75% damage. Builds energy while blocking!', color: '#34d399' },
  { name: 'Fireball', keys: 'I', icon: '🔥', desc: 'Ranged projectile attack. Costs 25 energy.', color: '#f97316' },
  { name: 'Lightning', keys: 'O', icon: '⚡', desc: 'Instant strike! Hits anywhere. Costs 35 energy.', color: '#facc15' },
  { name: 'Teleport', keys: 'Shift', icon: '💨', desc: 'Dash behind your opponent! Costs 20 energy.', color: '#a78bfa' },
  { name: 'Super Move', keys: 'Space', icon: '💥', desc: 'Ultimate attack! Requires full super meter.', color: '#ec4899' },
];

const TIPS = [
  '🎯 Chain attacks together for COMBO damage multiplier!',
  '⚡ Your SUPER meter charges when you hit or get hit',
  '🛡 Blocking at the right moment builds energy faster',
  '💨 Teleport behind your opponent for surprise attacks',
  '⬆ Uppercut launches enemies - follow up with air attacks!',
  '🔥 Fireballs are great for keeping distance',
  '⚡ Lightning is instant but costs more energy',
];

export default function Tutorial({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const totalSteps = 3;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-amber-400">📖 How to Play</h2>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">{step + 1}/{totalSteps}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">🎮 Basic Controls</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOVES.slice(0, 5).map((move) => (
                  <div
                    key={move.name}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `linear-gradient(135deg, ${move.color}33, ${move.color}11)`, borderColor: `${move.color}66`, borderWidth: 1 }}
                    >
                      {move.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{move.name}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs font-mono">{move.keys}</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{move.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">⚡ Special Powers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOVES.slice(5).map((move) => (
                  <div
                    key={move.name}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `linear-gradient(135deg, ${move.color}33, ${move.color}11)`, borderColor: `${move.color}66`, borderWidth: 1 }}
                    >
                      {move.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{move.name}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs font-mono">{move.keys}</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{move.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Energy & Super meters explanation */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50">
                <h4 className="font-semibold text-blue-400 text-sm mb-2">📊 Understanding Meters</h4>
                <div className="space-y-2 text-xs text-gray-300">
                  <p><span className="text-blue-400 font-semibold">ENERGY (Blue Bar):</span> Used for special moves. Regenerates over time.</p>
                  <p><span className="text-amber-400 font-semibold">SUPER (Yellow Bar):</span> Charges when you hit or get hit. Use for ultimate attack!</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">💡 Pro Tips</h3>
              <div className="space-y-2">
                {TIPS.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700">
                    <span className="text-lg">{tip.slice(0, 2)}</span>
                    <p className="text-gray-300 text-sm">{tip.slice(2)}</p>
                  </div>
                ))}
              </div>

              {/* Mobile controls note */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-800/50">
                <h4 className="font-semibold text-purple-400 text-sm mb-2">📱 Mobile Controls</h4>
                <p className="text-xs text-gray-300">
                  On mobile, use the on-screen joystick and buttons. Rotate your phone to <b>landscape mode</b> for the best experience!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-amber-400' : 'bg-gray-700 hover:bg-gray-600'}`}
              />
            ))}
          </div>
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-green-500 text-black font-semibold hover:bg-green-400 transition-colors"
            >
              Start Playing! 🎮
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
