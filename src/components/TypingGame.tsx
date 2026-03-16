import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTimer } from '../hooks/useTimer';
import { getTypingBest, saveTypingScore } from '../lib/localScore';
import { typingWordsBeginners, typingWordsIntermediate, typingWordsAdvanced, typingWordsExpert } from '../data/wordList';
import DifficultySelect from './DifficultySelect';
import GameResult from './GameResult';
import KeyboardHint from './KeyboardHint';
import { playKeySound, playMissSound, playWordCompleteSound } from '../lib/sound';

function getWordList(difficulty: string): string[] {
  switch (difficulty) {
    case '初級': return typingWordsBeginners;
    case '中級': return typingWordsIntermediate;
    case '上級': return typingWordsAdvanced;
    case '鬼': return typingWordsExpert;
    default: return typingWordsBeginners;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a mapping from hiragana characters to valid romaji input sequences
// This handles the complexity of multiple valid romaji for the same kana
type CharMapping = {
  kana: string; // The hiragana character(s) this maps to
  validInputs: string[][]; // Array of valid romaji sequences
};

function buildCharMappings(word: string): CharMapping[] {
  const mappings: CharMapping[] = [];
  let i = 0;

  while (i < word.length) {
    const char = word[i];
    const nextChar = i + 1 < word.length ? word[i + 1] : null;

    // Handle っ (double consonant)
    if (char === 'っ' && nextChar) {
      // っ is typed by doubling the next consonant
      // We'll handle it as part of the next character
      const nextMappings = getKanaRomaji(nextChar, i + 2 < word.length ? word[i + 2] : null);
      for (const nm of nextMappings) {
        // Double the first consonant
        mappings.push({
          kana: 'っ',
          validInputs: nm.map(r => [r[0]]), // first char of each romaji option
        });
      }
      i++;
      continue;
    }

    // Handle ん
    if (char === 'ん') {
      const afterN = nextChar;
      if (afterN && !isVowel(afterN) && afterN !== 'な' && afterN !== 'に' && afterN !== 'ぬ' && afterN !== 'ね' && afterN !== 'の' && afterN !== 'にゃ' && afterN !== 'にゅ' && afterN !== 'にょ' && afterN !== 'や' && afterN !== 'ゆ' && afterN !== 'よ') {
        // n can be single before consonants (except n, y)
        mappings.push({ kana: 'ん', validInputs: [['n'], ['nn']] });
      } else {
        // Must use nn
        mappings.push({ kana: 'ん', validInputs: [['nn']] });
      }
      i++;
      continue;
    }

    // Check for 2-char kana (拗音)
    if (nextChar) {
      const twoChar = char + nextChar;
      const twoCharRomaji = getTwoCharRomaji(twoChar);
      if (twoCharRomaji.length > 0) {
        mappings.push({ kana: twoChar, validInputs: twoCharRomaji.map(r => [r]) });
        i += 2;
        continue;
      }
    }

    // Single char
    const romaji = getSingleCharRomaji(char);
    mappings.push({ kana: char, validInputs: romaji.map(r => [r]) });
    i++;
  }

  return mappings;
}

function isVowel(char: string): boolean {
  return 'あいうえお'.includes(char);
}

function getSingleCharRomaji(char: string): string[] {
  const map: Record<string, string[]> = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
    'さ': ['sa'], 'し': ['si', 'shi'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['ti', 'chi'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['hu', 'fu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['wo'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['zi', 'ji'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'ー': ['-'],
  };
  return map[char] || [char];
}

function getTwoCharRomaji(chars: string): string[] {
  const map: Record<string, string[]> = {
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sya', 'sha'], 'しゅ': ['syu', 'shu'], 'しょ': ['syo', 'sho'],
    'ちゃ': ['tya', 'cha'], 'ちゅ': ['tyu', 'chu'], 'ちょ': ['tyo', 'cho'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['ja', 'zya'], 'じゅ': ['ju', 'zyu'], 'じょ': ['jo', 'zyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
    'ぢゃ': ['dya'], 'ぢゅ': ['dyu'], 'ぢょ': ['dyo'],
  };
  return map[chars] || [];
}

function getKanaRomaji(char: string, nextChar: string | null): string[][] {
  // Returns possible romaji arrays for a character (used after っ)
  const single = getSingleCharRomaji(char);
  if (nextChar) {
    const two = getTwoCharRomaji(char + nextChar);
    if (two.length > 0) return [two, single];
  }
  return [single];
}

type GamePhase = 'countdown' | 'playing' | 'result';

function TypingPlay({ difficulty, onRetry }: { difficulty: string; onRetry: () => void }) {
  const [phase, setPhase] = useState<GamePhase>('countdown');
  const [countdown, setCountdown] = useState(3);

  const wordList = useRef(shuffle(getWordList(difficulty)));
  const wordIndex = useRef(0);

  const [currentWord, setCurrentWord] = useState('');
  const [charMappings, setCharMappings] = useState<CharMapping[]>([]);
  const [charIndex, setCharIndex] = useState(0); // which kana group we're on
  const [romajiProgress, setRomajiProgress] = useState(''); // romaji typed so far for current kana
  const [completedWords, setCompletedWords] = useState(0); // total words completed
  const [miss, setMiss] = useState(0);
  const [flash, setFlash] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  const showHint = difficulty === '初級' || difficulty === '中級';

  const timer = useTimer('countdown', 30);

  const loadWord = useCallback(() => {
    const words = wordList.current;
    if (wordIndex.current >= words.length) {
      wordIndex.current = 0;
      wordList.current = shuffle(words);
    }
    const w = words[wordIndex.current];
    wordIndex.current++;
    setCurrentWord(w);
    setCharMappings(buildCharMappings(w));
    setCharIndex(0);
    setRomajiProgress('');
  }, []);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      loadWord();
      timer.reset();
      timer.start();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, loadWord, timer]);

  // Timer finish
  useEffect(() => {
    if (timer.isFinished && phase === 'playing') {
      const newBest = saveTypingScore(difficulty, completedWords);
      setIsNewBest(newBest);
      setPhase('result');
    }
  }, [timer.isFinished, phase, difficulty, completedWords]);

  // Key handler
  useEffect(() => {
    if (phase !== 'playing') return;

    const handler = (e: KeyboardEvent) => {
      // Prevent IME
      if (e.isComposing) return;
      e.preventDefault();

      const key = e.key.toLowerCase();
      if (key.length !== 1 || !/[a-z\-]/.test(key)) return;

      const mapping = charMappings[charIndex];
      if (!mapping) return;

      const newProgress = romajiProgress + key;

      // Check if newProgress matches the start of any valid input
      let anyMatch = false;
      let fullMatch = false;

      for (const validSeq of mapping.validInputs) {
        for (const valid of validSeq) {
          if (valid === newProgress) {
            fullMatch = true;
            anyMatch = true;
            break;
          }
          if (valid.startsWith(newProgress)) {
            anyMatch = true;
          }
        }
        if (fullMatch) break;
      }

      if (fullMatch) {
        // Move to next kana
        const nextCharIndex = charIndex + 1;

        if (nextCharIndex >= charMappings.length) {
          // Word complete, load next
          playWordCompleteSound();
          setCompletedWords(c => c + 1);
          loadWord();
        } else {
          playKeySound();
          setCharIndex(nextCharIndex);
          setRomajiProgress('');
        }
      } else if (anyMatch) {
        // Partial match, continue
        playKeySound();
        setRomajiProgress(newProgress);
      } else {
        // Incorrect
        playMissSound();
        setMiss(m => m + 1);
        setFlash(true);
        setTimeout(() => setFlash(false), 200);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, charMappings, charIndex, romajiProgress, loadWord]);

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

  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-game-dark flex flex-col items-center justify-center">
        <div className="text-9xl font-bold text-neon-cyan animate-score-pop">{countdown}</div>
      </div>
    );
  }

  if (phase === 'result') {
    const best = getTypingBest(difficulty);
    return (
      <GameResult
        title="タイピングゲーム 結果"
        score={`${completedWords}単語`}
        subtitle={`ミス: ${miss}回`}
        isNewBest={isNewBest}
        bestLabel=""
        bestValue={best ? `${best.score}単語` : undefined}
        retryPath={`/typing/${difficulty}`}
        difficultyPath="/typing"
        onRetry={onRetry}
      />
    );
  }

  // Build display
  let kanaCompleted = 0;
  for (let ci = 0; ci < charIndex; ci++) {
    kanaCompleted += charMappings[ci]?.kana.length || 0;
  }
  const currentKana = charMappings[charIndex]?.kana || '';
  const kanaAfter = charMappings.slice(charIndex + 1).map(m => m.kana).join('');

  // Get display romaji for current position
  const currentMapping = charMappings[charIndex];
  let displayRomaji = '';
  if (currentMapping) {
    // Show the first valid option minus what's already typed
    const firstValid = currentMapping.validInputs[0]?.[0] || '';
    displayRomaji = firstValid;
  }

  // Get the next key to press for keyboard hint
  const nextHintKey = displayRomaji[romajiProgress.length] || '';

  return (
    <div className={`min-h-screen bg-game-dark flex flex-col items-center justify-center p-8 ${flash ? 'bg-red-900/30' : ''}`}>
      {/* Timer bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>残り {Math.ceil(timer.time)}秒</span>
          <span>入力単語数: {completedWords}単語 / ミス: {miss}回</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className="bg-neon-cyan h-3 rounded-full transition-all"
            style={{ width: `${(timer.time / 30) * 100}%` }}
          />
        </div>
      </div>

      {/* Word display */}
      <div className="text-5xl font-bold mb-4 tracking-wider">
        <span className="text-neon-green">{currentWord.slice(0, kanaCompleted)}</span>
        <span className="text-white">{currentKana}</span>
        <span className="text-gray-600">{kanaAfter}</span>
      </div>

      {/* Romaji hint */}
      <div className="text-2xl text-gray-500 mb-8 font-mono">
        <span className="text-neon-cyan">{romajiProgress}</span>
        <span className="text-gray-600">{displayRomaji.slice(romajiProgress.length)}</span>
      </div>

      {/* Keyboard hint for beginner/intermediate */}
      <KeyboardHint targetKey={nextHintKey} show={showHint} highlightDelay={difficulty === '初級' ? 0 : 1000} />
    </div>
  );
}

export default function TypingGame() {
  const { difficulty } = useParams<{ difficulty: string }>();
  const [retryKey, setRetryKey] = useState(0);

  if (!difficulty) {
    return (
      <DifficultySelect
        gameName="⌨️ タイピングゲーム"
        basePath="/typing"
        getBest={(d) => {
          const b = getTypingBest(d);
          return b ? `${b.score}単語` : null;
        }}
      />
    );
  }

  return (
    <TypingPlay
      difficulty={difficulty}
      key={difficulty + retryKey}
      onRetry={() => setRetryKey(k => k + 1)}
    />
  );
}
