import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

type Props = {
  title: string;
  score: string;
  subtitle?: string;
  isNewBest: boolean;
  bestLabel?: string;
  bestValue?: string;
  retryPath: string;
  difficultyPath: string;
  onRetry?: () => void;
};

export default function GameResult({
  title,
  score,
  subtitle,
  isNewBest,
  bestLabel,
  bestValue,
  retryPath,
  difficultyPath,
  onRetry,
}: Props) {
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (isNewBest) {
      const timer = setTimeout(() => setShowCelebration(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isNewBest]);

  return (
    <div className="min-h-screen bg-game-dark flex flex-col items-center justify-center p-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-300 mb-4">{title}</h1>

        <div className="text-7xl font-bold text-neon-cyan animate-score-pop mb-2">
          {score}
        </div>

        {subtitle && (
          <p className="text-lg text-gray-400 mb-4">{subtitle}</p>
        )}

        {showCelebration && (
          <div className="animate-celebration text-3xl mb-4">
            🎉 自己ベスト更新！
          </div>
        )}

        {bestLabel && bestValue && (
          <div className="text-sm text-gray-500 mb-8">
            このPCの自己ベスト: {bestLabel} {bestValue}
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => { if (onRetry) { onRetry(); } else { navigate(retryPath); } }}
          className="btn-game px-6 py-3 bg-neon-cyan/20 border border-neon-cyan/50 rounded-xl text-neon-cyan font-bold hover:bg-neon-cyan/30"
        >
          もう一度
        </button>
        <button
          onClick={() => navigate(difficultyPath)}
          className="btn-game px-6 py-3 bg-neon-purple/20 border border-neon-purple/50 rounded-xl text-neon-purple font-bold hover:bg-neon-purple/30"
        >
          難易度を変える
        </button>
        <button
          onClick={() => navigate('/')}
          className="btn-game px-6 py-3 bg-gray-700 rounded-xl text-gray-300 font-bold hover:bg-gray-600"
        >
          トップに戻る
        </button>
      </div>
    </div>
  );
}
