import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRomaji } from '../hooks/useRomaji';
import { getKokonTozaiBest, saveKokonTozaiScore } from '../lib/localScore';
import { getRandomCategory, type Category } from '../data/categoryData';
import DifficultySelect from './DifficultySelect';
import GameResult from './GameResult';
import { playKeySound, playMissSound } from '../lib/sound';

type DifficultyConfig = {
  timePerAnswer: number; // seconds per answer
  cpuMistakeRate: number; // probability of CPU "giving up" per turn (higher = easier for player)
};

function getDifficultyConfig(d: string): DifficultyConfig {
  switch (d) {
    case '初級': return { timePerAnswer: 15, cpuMistakeRate: 0.08 };
    case '中級': return { timePerAnswer: 12, cpuMistakeRate: 0.05 };
    case '上級': return { timePerAnswer: 10, cpuMistakeRate: 0.03 };
    case '鬼':   return { timePerAnswer: 8,  cpuMistakeRate: 0.01 };
    default:     return { timePerAnswer: 15, cpuMistakeRate: 0.08 };
  }
}

type HistoryEntry = {
  answer: string;
  player: 'player' | 'cpu';
};

type GamePhase = 'playing' | 'result';

function KokonTozaiPlay({ difficulty, onRetry }: { difficulty: string; onRetry: () => void }) {
  const navigate = useNavigate();
  const config = getDifficultyConfig(difficulty);
  const { buffer, convertedText, processKey, reset: resetRomaji, confirmN } = useRomaji();

  const [phase, setPhase] = useState<GamePhase>('playing');
  const [category] = useState<Category>(() => getRandomCategory(difficulty));
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [usedAnswers, setUsedAnswers] = useState<Set<string>>(new Set());
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [turn, setTurn] = useState(1);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(config.timePerAnswer);
  const [isNewBest, setIsNewBest] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [inputError, setInputError] = useState('');

  const timerRef = useRef<number | null>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const usedRef = useRef<Set<string>>(new Set());
  const turnRef = useRef(1);

  // Auto-scroll history
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Player timer
  useEffect(() => {
    if (!isPlayerTurn || phase !== 'playing') return;
    setTimeLeft(config.timePerAnswer);

    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          endGame('cpu', '時間切れ！答えられなかった...');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, phase, turn]);

  const endGame = useCallback((winner: 'player' | 'cpu', msg: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const result = winner === 'player' ? 'win' as const : 'lose' as const;
    const answeredCount = historyRef.current.filter(h => h.player === 'player').length;
    const newBest = saveKokonTozaiScore(difficulty, answeredCount, result);
    setIsNewBest(newBest);
    setResultMsg(msg);
    setPhase('result');
  }, [difficulty]);

  const cpuTurn = useCallback(() => {
    if (phase !== 'playing') return;

    const currentUsed = usedRef.current;

    // Check CPU mistake (give up)
    if (Math.random() < config.cpuMistakeRate) {
      endGame('player', 'CPUが答えられなかった！あなたの勝ち！');
      return;
    }

    // Find available answers
    const candidates = category.answers.filter(a => !currentUsed.has(a));

    if (candidates.length === 0) {
      endGame('player', 'CPUが答えられなかった！あなたの勝ち！');
      return;
    }

    // Pick random
    const cpuAnswer = candidates[Math.floor(Math.random() * candidates.length)];
    const entry: HistoryEntry = { answer: cpuAnswer, player: 'cpu' };

    const newHistory = [...historyRef.current, entry];
    historyRef.current = newHistory;
    setHistory(newHistory);

    const newUsed = new Set(currentUsed);
    newUsed.add(cpuAnswer);
    usedRef.current = newUsed;
    setUsedAnswers(newUsed);

    setMessage(`CPUの回答: ${cpuAnswer}`);

    const nextTurn = turnRef.current + 1;
    turnRef.current = nextTurn;
    setTurn(nextTurn);

    setIsPlayerTurn(true);
  }, [phase, category, config.cpuMistakeRate, endGame]);

  const submitAnswer = useCallback(() => {
    const answer = confirmN();
    resetRomaji();

    if (!answer || answer.length === 0) return;

    setInputError('');

    // Check if already used
    if (usedRef.current.has(answer)) {
      playMissSound();
      setInputError('その答えはもう出ています！');
      return;
    }

    // Check if answer is in the category
    if (!category.answers.includes(answer)) {
      playMissSound();
      setInputError('お題に合わない答えです');
      return;
    }

    // Valid answer!
    if (timerRef.current) clearInterval(timerRef.current);
    playKeySound();

    const entry: HistoryEntry = { answer, player: 'player' };
    const newHistory = [...historyRef.current, entry];
    historyRef.current = newHistory;
    setHistory(newHistory);

    const newUsed = new Set(usedRef.current);
    newUsed.add(answer);
    usedRef.current = newUsed;
    setUsedAnswers(newUsed);

    setMessage('');
    setIsPlayerTurn(false);

    // CPU turn after delay
    setTimeout(() => cpuTurn(), 800 + Math.random() * 1200);
  }, [confirmN, resetRomaji, category, cpuTurn]);

  // Key handler
  useEffect(() => {
    if (phase !== 'playing' || !isPlayerTurn) return;

    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        resetRomaji();
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z\-]/.test(e.key)) {
        e.preventDefault();
        playKeySound();
        processKey(e.key);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, isPlayerTurn, processKey, submitAnswer, resetRomaji]);

  // Suppress IME
  useEffect(() => {
    const handleComposition = (e: CompositionEvent) => {
      e.preventDefault();
    };
    window.addEventListener('compositionstart', handleComposition);
    window.addEventListener('compositionupdate', handleComposition);
    window.addEventListener('compositionend', handleComposition);
    return () => {
      window.removeEventListener('compositionstart', handleComposition);
      window.removeEventListener('compositionupdate', handleComposition);
      window.removeEventListener('compositionend', handleComposition);
    };
  }, []);

  if (phase === 'result') {
    const winner = resultMsg.includes('あなたの勝ち') ? 'player' : 'cpu';
    const playerAnswers = history.filter(h => h.player === 'player').length;
    const best = getKokonTozaiBest(difficulty);
    return (
      <GameResult
        title={winner === 'player' ? '🎉 勝利！' : '😢 負け...'}
        score={`${playerAnswers}回 正解`}
        subtitle={resultMsg}
        isNewBest={isNewBest}
        bestLabel=""
        bestValue={best && best.result === 'win' ? `${best.answers}回正解で勝利` : undefined}
        retryPath={`/kokontozai/${difficulty}`}
        difficultyPath="/kokontozai"
        onRetry={onRetry}
      />
    );
  }

  const playerAnswerCount = history.filter(h => h.player === 'player').length;
  const cpuAnswerCount = history.filter(h => h.player === 'cpu').length;
  const remainingAnswers = category.answers.length - usedAnswers.size;

  return (
    <div className="min-h-screen bg-game-dark flex flex-col items-center p-8">
      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-2">
        <div className="text-sm text-gray-400">ターン: {turn}</div>
        <div className="flex gap-6 text-sm">
          <span className="text-blue-400">🙋 あなた {playerAnswerCount}回</span>
          <span className="text-red-400">🤖 CPU {cpuAnswerCount}回</span>
        </div>
      </div>

      {/* Category / Theme */}
      <div className="w-full max-w-2xl text-center mb-4">
        <div className="text-sm text-gray-500 mb-1">お題</div>
        <div className="text-3xl font-bold text-neon-purple mb-1">
          「{category.name}」
        </div>
        <div className="text-sm text-gray-500">{category.description}</div>
        <div className="text-xs text-gray-600 mt-1">残り {remainingAnswers} / {category.answers.length}</div>
      </div>

      {/* Timer bar (player turn only) */}
      {isPlayerTurn && (
        <div className="w-full max-w-2xl mb-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timeLeft <= 5 ? 'bg-red-500' : 'bg-neon-cyan'}`}
              style={{ width: `${(timeLeft / config.timePerAnswer) * 100}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">残り {timeLeft}秒</div>
        </div>
      )}

      {/* History */}
      <div className="w-full max-w-2xl bg-game-card border border-game-border rounded-xl p-4 mb-4 h-[220px] overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            古今東西！「{category.name}」！
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 content-start">
            {history.map((h, i) => (
              <span
                key={i}
                className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${
                  h.player === 'player'
                    ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                    : 'bg-red-900/50 text-red-300 border border-red-700'
                }`}
              >
                {h.answer}
              </span>
            ))}
            <div ref={historyEndRef} />
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="text-yellow-400 mb-2 text-sm">{message}</div>
      )}

      {/* Input area */}
      {isPlayerTurn ? (
        <div className="w-full max-w-2xl">
          {/* Current input display */}
          <div className="bg-game-card border border-game-border rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-white min-h-[3rem] mb-2">
              {convertedText}
              {buffer && <span className="text-neon-cyan">{buffer}</span>}
              {!convertedText && !buffer && <span className="text-gray-600">入力してね...</span>}
            </div>
            <div className="text-sm text-gray-500">Enterで確定 / Backspaceでリセット</div>
          </div>

          {inputError && (
            <div className="text-red-400 text-center mt-2">{inputError}</div>
          )}
        </div>
      ) : (
        <div className="text-2xl text-gray-400 animate-pulse">CPUが考えています...</div>
      )}

      <button
        onClick={() => navigate('/kokontozai')}
        className="btn-game mt-8 px-6 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600"
      >
        やめる
      </button>
    </div>
  );
}

export default function KokonTozaiGame() {
  const { difficulty } = useParams<{ difficulty: string }>();
  const [retryKey, setRetryKey] = useState(0);

  if (!difficulty) {
    return (
      <DifficultySelect
        gameName="🌏 古今東西ゲーム"
        basePath="/kokontozai"
        getBest={(d) => {
          const b = getKokonTozaiBest(d);
          return b && b.result === 'win' ? `${b.answers}回正解で勝利` : null;
        }}
      />
    );
  }

  return (
    <KokonTozaiPlay
      difficulty={difficulty}
      key={difficulty + retryKey}
      onRetry={() => setRetryKey(k => k + 1)}
    />
  );
}
