import { useState, useEffect } from 'react';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

type Props = {
  targetKey: string;
  show: boolean;
  highlightDelay?: number; // ms before highlighting, default 5000
};

export default function KeyboardHint({ targetKey, show, highlightDelay = 5000 }: Props) {
  const [highlighted, setHighlighted] = useState(false);

  // Reset highlight timer when targetKey changes
  useEffect(() => {
    if (!show) return;
    setHighlighted(false);
    const timer = setTimeout(() => setHighlighted(true), highlightDelay);
    return () => clearTimeout(timer);
  }, [targetKey, show, highlightDelay]);

  if (!show) return null;

  const target = targetKey.toUpperCase();

  return (
    <div className="w-full max-w-xl mx-auto mt-6 opacity-40 select-none">
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1 mb-1" style={{ paddingLeft: ri === 1 ? '1.2rem' : ri === 2 ? '2.4rem' : 0 }}>
          {row.map((key) => {
            const isTarget = key === target && highlighted;
            return (
              <div
                key={key}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-md text-sm font-bold
                  transition-all duration-300
                  ${isTarget
                    ? 'bg-neon-cyan text-game-dark shadow-[0_0_15px_rgba(0,255,255,0.7)] scale-110 opacity-100 animate-pulse-glow'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                  }
                `}
              >
                {key}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
