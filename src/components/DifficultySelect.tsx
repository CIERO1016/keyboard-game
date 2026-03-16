import { useNavigate } from 'react-router-dom';

type Props = {
  gameName: string;
  basePath: string;
  getBest?: (difficulty: string) => string | null;
};

const difficulties = [
  { key: '初級', label: '初級', desc: '基本のキーだけ！まずはここから', color: 'text-neon-green' },
  { key: '中級', label: '中級', desc: 'もう少しキーが増えるよ', color: 'text-neon-cyan' },
  { key: '上級', label: '上級', desc: 'たくさんのキーにチャレンジ！', color: 'text-neon-yellow' },
  { key: '鬼', label: '鬼', desc: '全部のキーを使いこなせ！', color: 'text-neon-pink' },
];

export default function DifficultySelect({ gameName, basePath, getBest }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-game-dark flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-neon-cyan mb-2">{gameName}</h1>
      <p className="text-gray-400 mb-8">難易度を選んでね</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full">
        {difficulties.map((d) => {
          const best = getBest?.(d.key);
          return (
            <button
              key={d.key}
              onClick={() => navigate(`${basePath}/${d.key}`)}
              className="btn-game bg-game-card border border-game-border rounded-xl p-6 text-left hover:border-neon-cyan/50"
            >
              <div className={`text-2xl font-bold ${d.color}`}>{d.label}</div>
              <div className="text-sm text-gray-400 mt-1">{d.desc}</div>
              {best && (
                <div className="text-xs text-gray-500 mt-2">自己ベスト: {best}</div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/')}
        className="btn-game mt-8 px-6 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600"
      >
        トップに戻る
      </button>
    </div>
  );
}
