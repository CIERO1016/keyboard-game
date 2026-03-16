import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getPlayerName, setPlayerName, getKeyLocationBest, getTypingBest, getKokonTozaiBest } from '../lib/localScore';

const difficulties = ['初級', '中級', '上級', '鬼'];

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState('');

  useEffect(() => {
    setName(getPlayerName());
  }, []);

  const handleNameChange = (v: string) => {
    setName(v);
    setPlayerName(v);
  };

  // Build per-difficulty scores for each game
  const getKLScores = () => {
    return difficulties.map(d => {
      const b = getKeyLocationBest(d, '10sec');
      return b ? `${d}: ${b.score}文字` : null;
    }).filter(Boolean);
  };

  const getTypingScores = () => {
    return difficulties.map(d => {
      const b = getTypingBest(d);
      return b ? `${d}: ${b.score}単語` : null;
    }).filter(Boolean);
  };

  const getKokonTozaiScores = () => {
    return difficulties.map(d => {
      const b = getKokonTozaiBest(d);
      return b && b.result === 'win' ? `${d}: ${b.answers}回正解` : null;
    }).filter(Boolean);
  };

  const games = [
    {
      emoji: '🎯',
      title: '文字の場所ゲーム',
      desc: 'キーボードのどこにあるか覚えよう！',
      path: '/keylocation',
      color: 'border-neon-green/50 hover:border-neon-green',
      scores: getKLScores(),
    },
    {
      emoji: '⌨️',
      title: 'タイピングゲーム',
      desc: 'ローマ字で日本語を入力しよう！',
      path: '/typing',
      color: 'border-neon-cyan/50 hover:border-neon-cyan',
      scores: getTypingScores(),
    },
    {
      emoji: '🌏',
      title: '古今東西ゲーム',
      desc: 'お題に合う答えをCPUと交互に！',
      path: '/kokontozai',
      color: 'border-neon-purple/50 hover:border-neon-purple',
      scores: getKokonTozaiScores(),
    },
  ];

  return (
    <div className="min-h-screen bg-game-dark flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-neon-cyan mb-2 tracking-tight">
        キーボード練習ゲーム
      </h1>
      <p className="text-gray-400 mb-8">楽しくタイピングを覚えよう！</p>

      <div className="mb-8">
        <label className="text-sm text-gray-500 block mb-1">プレイヤー名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="なまえを入力"
          className="bg-game-card border border-game-border rounded-lg px-4 py-2 text-center text-white focus:outline-none focus:border-neon-cyan/50 w-48"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        {games.map((g) => (
          <button
            key={g.path}
            onClick={() => navigate(g.path)}
            className={`btn-game bg-game-card border ${g.color} rounded-2xl p-8 text-center transition-all`}
          >
            <div className="text-5xl mb-4">{g.emoji}</div>
            <div className="text-xl font-bold text-white mb-2">{g.title}</div>
            <div className="text-sm text-gray-400">{g.desc}</div>
            {g.scores.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-gray-500 font-bold">自己ベスト:</div>
                {g.scores.map((s, i) => (
                  <div key={i} className="text-xs text-gray-500">{s}</div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
