import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRomaji } from '../hooks/useRomaji';
import { getShiritoriBest, saveShiritoriScore } from '../lib/localScore';
import { shiritoriWords } from '../data/wordList';
import DifficultySelect from './DifficultySelect';
import GameResult from './GameResult';
import { playKeySound, playMissSound } from '../lib/sound';

type DifficultyConfig = {
  cpuMinLen: number;
  maxNG: number;
  maxTurns: number;
  timeLimit: number;
};

function getDifficultyConfig(d: string): DifficultyConfig {
  switch (d) {
    case '初級': return { cpuMinLen: 7, maxNG: 5, maxTurns: 30, timeLimit: 90 };
    case '中級': return { cpuMinLen: 5, maxNG: 5, maxTurns: 30, timeLimit: 60 };
    case '上級': return { cpuMinLen: 3, maxNG: 3, maxTurns: 30, timeLimit: 60 };
    case '鬼': return { cpuMinLen: 2, maxNG: 1, maxTurns: 50, timeLimit: 30 };
    default: return { cpuMinLen: 7, maxNG: 5, maxTurns: 30, timeLimit: 90 };
  }
}

function getLastChar(word: string): string {
  // Handle ー: skip it and use the char before
  let i = word.length - 1;
  while (i >= 0 && word[i] === 'ー') i--;
  return i >= 0 ? word[i] : word[0];
}

type HistoryEntry = {
  word: string;
  player: 'player' | 'cpu';
};

type GamePhase = 'playing' | 'result';

function ShiritoriPlay({ difficulty, onRetry }: { difficulty: string; onRetry: () => void }) {
  const navigate = useNavigate();
  const config = getDifficultyConfig(difficulty);
  const { buffer, convertedText, processKey, reset: resetRomaji, confirmN } = useRomaji();

  const [phase, setPhase] = useState<GamePhase>('playing');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [requiredChar, setRequiredChar] = useState(''); // empty = first turn
  const [playerNG, setPlayerNG] = useState(0);
  const [cpuNG] = useState(0);
  const [turn, setTurn] = useState(1);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [isNewBest, setIsNewBest] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [inputError, setInputError] = useState('');

  const timerRef = useRef<number | null>(null);
  const availableWords = useRef([...shiritoriWords]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll history to bottom
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Player timer
  useEffect(() => {
    if (!isPlayerTurn || phase !== 'playing') return;
    setTimeLeft(config.timeLimit);

    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time's up
          if (timerRef.current) clearInterval(timerRef.current);
          handlePlayerNG('時間切れ！');
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
    const newBest = saveShiritoriScore(difficulty, turn, result);
    setIsNewBest(newBest);
    setResultMsg(msg);
    setPhase('result');
  }, [difficulty, turn]);

  const handlePlayerNG = useCallback((reason: string) => {
    // Check if "ん" ending - instant loss
    setMessage(reason);

    const newNG = playerNG + 1;
    setPlayerNG(newNG);

    if (newNG >= config.maxNG) {
      endGame('cpu', `${reason} NGが${config.maxNG}回に達しました...`);
      return;
    }

    // Continue - CPU's turn
    setIsPlayerTurn(false);
    setTimeout(() => cpuTurn(), 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerNG, config.maxNG, endGame]);

  const cpuTurn = useCallback(() => {
    if (phase !== 'playing') return;

    const currentHistory = historyRef.current;
    const currentUsed = new Set(currentHistory.map(h => h.word));

    // Find a word starting with requiredChar
    const reqChar = currentHistory.length > 0
      ? getLastChar(currentHistory[currentHistory.length - 1].word)
      : '';

    let candidates = availableWords.current.filter(w => {
      if (currentUsed.has(w)) return false;
      if (reqChar && w[0] !== reqChar) return false;
      if (w.endsWith('ん')) return false;
      if (w.length >= config.cpuMinLen) return true;
      return false;
    });

    // If no long words, try any length
    if (candidates.length === 0) {
      candidates = availableWords.current.filter(w => {
        if (currentUsed.has(w)) return false;
        if (reqChar && w[0] !== reqChar) return false;
        if (w.endsWith('ん')) return false;
        return true;
      });
    }

    if (candidates.length === 0) {
      // CPU can't find a word - CPU forfeits (instant loss)
      endGame('player', 'CPUが言葉を見つけられなかった！あなたの勝ち！');
      return;
    }

    // Pick random word
    const cpuWord = candidates[Math.floor(Math.random() * candidates.length)];
    const newEntry: HistoryEntry = { word: cpuWord, player: 'cpu' };

    const newHistory = [...currentHistory, newEntry];
    historyRef.current = newHistory;
    setHistory(newHistory);
    setUsedWords(prev => new Set([...prev, cpuWord]));
    setRequiredChar(getLastChar(cpuWord));
    setMessage(`CPUの回答: ${cpuWord}`);

    const nextTurn = turn + 1;
    setTurn(nextTurn);

    // Check max turns
    if (nextTurn > config.maxTurns) {
      endGame('player', `${config.maxTurns}ターン到達！あなたの勝ち！`);
      return;
    }

    setIsPlayerTurn(true);
  }, [phase, cpuNG, config, endGame, turn]);

  const submitWord = useCallback(() => {
    const word = confirmN();
    resetRomaji();

    if (!word || word.length === 0) return;

    setInputError('');

    // Check if word ends with ん - instant loss
    if (word.endsWith('ん')) {
      playMissSound();
      const entry: HistoryEntry = { word, player: 'player' };
      const newHistory = [...historyRef.current, entry];
      historyRef.current = newHistory;
      setHistory(newHistory);
      endGame('cpu', '「ん」で終わる言葉を言ってしまった！');
      return;
    }

    // Check if starts with required char
    if (requiredChar && word[0] !== requiredChar) {
      playMissSound();
      setInputError(`「${requiredChar}」から始まる言葉を入力してね`);
      return;
    }

    // Check if already used
    if (usedWords.has(word)) {
      playMissSound();
      const entry: HistoryEntry = { word, player: 'player' };
      const newHistory = [...historyRef.current, entry];
      historyRef.current = newHistory;
      setHistory(newHistory);
      setInputError('その言葉はもう使われています');
      handlePlayerNG('使用済みの言葉！');
      return;
    }

    // Check if word exists in dictionary - reject without passing turn
    if (!shiritoriWords.includes(word)) {
      playMissSound();
      setInputError('存在しない言葉です');
      const newNG = playerNG + 1;
      setPlayerNG(newNG);
      setMessage('存在しない言葉！');
      if (newNG >= config.maxNG) {
        endGame('cpu', `NGが${config.maxNG}回に達しました...`);
      }
      return;
    }

    // Valid word!
    if (timerRef.current) clearInterval(timerRef.current);
    const entry: HistoryEntry = { word, player: 'player' };
    const newHistory = [...historyRef.current, entry];
    historyRef.current = newHistory;
    setHistory(newHistory);
    setUsedWords(prev => new Set([...prev, word]));
    setRequiredChar(getLastChar(word));
    setMessage('');
    setIsPlayerTurn(false);

    // CPU turn after delay
    setTimeout(() => cpuTurn(), 1000 + Math.random() * 1000);
  }, [confirmN, resetRomaji, requiredChar, usedWords, handlePlayerNG, endGame, cpuTurn, playerNG, config]);

  // Key handler
  useEffect(() => {
    if (phase !== 'playing' || !isPlayerTurn) return;

    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        submitWord();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        // Simple reset
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
  }, [phase, isPlayerTurn, processKey, submitWord, resetRomaji]);

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
    const best = getShiritoriBest(difficulty);
    return (
      <GameResult
        title={winner === 'player' ? '🎉 勝利！' : '😢 負け...'}
        score={`${turn}ターン`}
        subtitle={resultMsg}
        isNewBest={isNewBest}
        bestLabel=""
        bestValue={best && best.result === 'win' ? `${best.turns}ターンで勝利` : undefined}
        retryPath={`/shiritori/${difficulty}`}
        difficultyPath="/shiritori"
        onRetry={onRetry}
      />
    );
  }

  const displayHistory = history.slice(-7);

  return (
    <div className="min-h-screen bg-game-dark flex flex-col items-center p-8">
      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">ターン: {turn}</div>
        <div className="flex gap-6 text-sm">
          <span className="text-blue-400">🙅 あなた {playerNG}/{config.maxNG}</span>
          <span className="text-red-400">🙅 CPU {cpuNG}/{config.maxNG}</span>
        </div>
      </div>

      {/* Timer bar (player turn only) */}
      {isPlayerTurn && (
        <div className="w-full max-w-2xl mb-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timeLeft <= 10 ? 'bg-red-500' : 'bg-neon-cyan'}`}
              style={{ width: `${(timeLeft / config.timeLimit) * 100}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">残り {timeLeft}秒</div>
        </div>
      )}

      {/* History */}
      <div className="w-full max-w-2xl bg-game-card border border-game-border rounded-xl p-4 mb-4 h-[220px] overflow-y-auto">
        {displayHistory.length === 0 ? (
          <div className="text-gray-500 text-center py-8">しりとりスタート！好きな言葉を入力してね</div>
        ) : (
          <div className="space-y-2">
            {displayHistory.map((h, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 ${h.player === 'player' ? 'justify-start' : 'justify-end'}`}
              >
                <span
                  className={`inline-block px-4 py-2 rounded-xl text-lg font-bold ${
                    h.player === 'player'
                      ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                      : 'bg-red-900/50 text-red-300 border border-red-700'
                  }`}
                >
                  {h.word}
                </span>
              </div>
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
          {requiredChar && (
            <div className="text-center text-2xl mb-4">
              「<span className="text-neon-cyan font-bold text-3xl">{requiredChar}</span>」から始まる言葉を入力！
            </div>
          )}

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
        onClick={() => navigate('/shiritori')}
        className="btn-game mt-8 px-6 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600"
      >
        やめる
      </button>
    </div>
  );
}

export default function ShiritoriGame() {
  const { difficulty } = useParams<{ difficulty: string }>();
  const [retryKey, setRetryKey] = useState(0);

  if (!difficulty) {
    return (
      <DifficultySelect
        gameName="🔄 しりとり"
        basePath="/shiritori"
        getBest={(d) => {
          const b = getShiritoriBest(d);
          return b && b.result === 'win' ? `${b.turns}ターンで勝利` : null;
        }}
      />
    );
  }

  return (
    <ShiritoriPlay
      difficulty={difficulty}
      key={difficulty + retryKey}
      onRetry={() => setRetryKey(k => k + 1)}
    />
  );
}
