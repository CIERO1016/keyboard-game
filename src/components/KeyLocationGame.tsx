import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { selectKeysForDifficulty, getHandForKey } from '../data/keyboardLayout';
import { useTimer } from '../hooks/useTimer';
import { getKeyLocationBest, saveKeyLocationScore } from '../lib/localScore';
import DifficultySelect from './DifficultySelect';
import GameResult from './GameResult';
import KeyboardHint from './KeyboardHint';
import { playKeySound, playMissSound } from '../lib/sound';

type GamePhase = 'select-mode' | 'countdown' | 'playing' | 'result';
type GameMode = '10sec' | '10char';

function getRandomKey(keys: string[], lastKey: string | null): string {
  const filtered = keys.filter(k => k !== lastKey);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function GamePlay({ difficulty, onRetry }: { difficulty: string; onRetry: () => void }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>('select-mode');
  const [mode, setMode] = useState<GameMode>('10sec');
  const [countdown, setCountdown] = useState(3);
  const [sessionKeys] = useState(() => selectKeysForDifficulty(difficulty));
  const [currentKey, setCurrentKey] = useState('');
  const [correct, setCorrect] = useState(0);
  const [miss, setMiss] = useState(0);
  const [shaking, setShaking] = useState(false);
  const lastKeyRef = useRef<string | null>(null);

  const timer10sec = useTimer('countdown', 10);
  const timerStopwatch = useTimer('stopwatch');

  const [finalTime, setFinalTime] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const showHint = difficulty === '初級' || difficulty === '中級';

  const nextKey = useCallback(() => {
    const k = getRandomKey(sessionKeys, lastKeyRef.current);
    lastKeyRef.current = k;
    setCurrentKey(k);
  }, [sessionKeys]);

  // Start countdown
  const startGame = useCallback((m: GameMode) => {
    setMode(m);
    setPhase('countdown');
    setCountdown(3);
    setCorrect(0);
    setMiss(0);
  }, []);

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      nextKey();
      if (mode === '10sec') {
        timer10sec.reset();
        timer10sec.start();
      } else {
        timerStopwatch.reset();
        timerStopwatch.start();
      }
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, mode, nextKey, timer10sec, timerStopwatch]);

  // 10sec timer finish
  useEffect(() => {
    if (mode === '10sec' && timer10sec.isFinished && phase === 'playing') {
      const newBest = saveKeyLocationScore(difficulty, '10sec', correct);
      setIsNewBest(newBest);
      setPhase('result');
    }
  }, [timer10sec.isFinished, mode, correct, difficulty, phase]);

  // Key handler
  useEffect(() => {
    if (phase !== 'playing') return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const pressed = e.key.toUpperCase();
      if (pressed === currentKey || pressed === currentKey.toLowerCase()) {
        playKeySound();
        setCorrect(c => c + 1);

        // 10char mode: check if done
        if (mode === '10char') {
          const newCorrect = correct + 1;
          if (newCorrect >= 10) {
            timerStopwatch.stop();
            const elapsed = timerStopwatch.getElapsed();
            setFinalTime(Math.round(elapsed * 10) / 10);
            const newBest = saveKeyLocationScore(difficulty, '10char', Math.round(elapsed * 100) / 100);
            setIsNewBest(newBest);
            setPhase('result');
            return;
          }
        }
        nextKey();
      } else {
        playMissSound();
        setMiss(m => m + 1);
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, currentKey, mode, correct, nextKey, timerStopwatch, difficulty]);

  // Mode select
  if (phase === 'select-mode') {
    return (
      <div className="min-h-screen bg-game-dark flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold text-neon-cyan mb-2">文字の場所ゲーム - {difficulty}</h2>
        <p className="text-gray-400 mb-2">使用キー: {sessionKeys.join(', ')}</p>
        <p className="text-gray-500 mb-8 text-sm">ゲームモードを選んでね</p>

        <div className="flex gap-6">
          <button
            onClick={() => startGame('10sec')}
            className="btn-game bg-game-card border border-neon-green/50 hover:border-neon-green rounded-2xl p-8 text-center"
          >
            <div className="text-4xl mb-3">⏱</div>
            <div className="text-xl font-bold text-neon-green">10秒チャレンジ</div>
            <div className="text-sm text-gray-400 mt-2">10秒で何文字打てるかな？</div>
            {(() => {
              const b = getKeyLocationBest(difficulty, '10sec');
              return b ? <div className="text-xs text-gray-500 mt-2">自己ベスト: {b.score}文字</div> : null;
            })()}
          </button>

          <button
            onClick={() => startGame('10char')}
            className="btn-game bg-game-card border border-neon-yellow/50 hover:border-neon-yellow rounded-2xl p-8 text-center"
          >
            <div className="text-4xl mb-3">🚀</div>
            <div className="text-xl font-bold text-neon-yellow">10文字タイムアタック</div>
            <div className="text-sm text-gray-400 mt-2">10文字を最速で打とう！</div>
            {(() => {
              const b = getKeyLocationBest(difficulty, '10char');
              return b ? <div className="text-xs text-gray-500 mt-2">自己ベスト: {b.score}秒</div> : null;
            })()}
          </button>
        </div>

        <button
          onClick={() => navigate('/keylocation')}
          className="btn-game mt-8 px-6 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600"
        >
          難易度選択に戻る
        </button>
      </div>
    );
  }

  // Countdown
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-game-dark flex flex-col items-center justify-center">
        <div className="text-9xl font-bold text-neon-cyan animate-score-pop">{countdown}</div>
      </div>
    );
  }

  // Result
  if (phase === 'result') {
    const best = getKeyLocationBest(difficulty, mode);
    if (mode === '10sec') {
      return (
        <GameResult
          title="10秒チャレンジ 結果"
          score={`${correct}文字`}
          subtitle={`ミス: ${miss}回`}
          isNewBest={isNewBest}
          bestLabel=""
          bestValue={best ? `${best.score}文字` : undefined}
          retryPath={`/keylocation/${difficulty}`}
          difficultyPath="/keylocation"
          onRetry={onRetry}
        />
      );
    } else {
      return (
        <GameResult
          title="10文字タイムアタック 結果"
          score={`${finalTime}秒`}
          subtitle={`ミス: ${miss}回`}
          isNewBest={isNewBest}
          bestLabel=""
          bestValue={best ? `${best.score}秒` : undefined}
          retryPath={`/keylocation/${difficulty}`}
          difficultyPath="/keylocation"
          onRetry={onRetry}
        />
      );
    }
  }

  // Playing
  const hand = getHandForKey(currentKey);

  return (
    <div className="min-h-screen bg-game-dark flex flex-col items-center justify-center p-8">
      {/* Header bar */}
      <div className="w-full max-w-xl mb-8">
        {mode === '10sec' ? (
          <>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>残り時間</span>
              <span>正解: {correct}文字</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-neon-cyan h-3 rounded-full transition-all"
                style={{ width: `${(timer10sec.time / 10) * 100}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex justify-between text-lg">
            <span className="text-gray-400">経過時間: <span className="text-neon-yellow font-bold">{timerStopwatch.time.toFixed(1)}秒</span></span>
            <span className="text-gray-400">正解: <span className="text-neon-green font-bold">{correct}/10</span></span>
          </div>
        )}
      </div>

      {/* Current key */}
      <div className={`text-[12rem] font-bold text-white leading-none mb-4 ${shaking ? 'animate-shake' : ''}`}>
        {currentKey}
      </div>

      {/* Hand hint */}
      <div className="text-xl text-gray-400">
        この文字は <span className={hand === '左手' ? 'text-neon-green font-bold' : 'text-neon-purple font-bold'}>{hand}</span> で押します
      </div>

      {/* Miss counter */}
      {miss > 0 && (
        <div className="text-sm text-red-400 mt-4">ミス: {miss}回</div>
      )}

      {/* Keyboard hint for beginner/intermediate */}
      <KeyboardHint targetKey={currentKey} show={showHint} highlightDelay={difficulty === '初級' ? 0 : 1000} />
    </div>
  );
}

export default function KeyLocationGame() {
  const { difficulty } = useParams<{ difficulty: string }>();
  const [retryKey, setRetryKey] = useState(0);

  if (!difficulty) {
    return (
      <DifficultySelect
        gameName="🎯 文字の場所ゲーム"
        basePath="/keylocation"
        getBest={(d) => {
          const b = getKeyLocationBest(d, '10sec');
          return b ? `${b.score}文字` : null;
        }}
      />
    );
  }

  return (
    <GamePlay
      difficulty={difficulty}
      key={difficulty + retryKey}
      onRetry={() => setRetryKey(k => k + 1)}
    />
  );
}
