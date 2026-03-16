const STORAGE_KEY = 'keyboard-game-scores';
const PLAYER_KEY = 'keyboard-game-player';

export type KeyLocationScore = {
  '10sec': { score: number; date: string } | null;
  '10char': { score: number; date: string } | null;
};

export type TypingScore = {
  score: number;
  date: string;
} | null;

export type ShiritoriScore = {
  turns: number;
  result: 'win' | 'lose';
  date: string;
} | null;

export type KokonTozaiScore = {
  answers: number;
  result: 'win' | 'lose';
  date: string;
} | null;

export type ScoreData = {
  keylocation: Record<string, KeyLocationScore>;
  typing: Record<string, TypingScore>;
  shiritori: Record<string, ShiritoriScore>;
  kokontozai: Record<string, KokonTozaiScore>;
};

function getScores(): ScoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { keylocation: {}, typing: {}, shiritori: {}, kokontozai: {} };
}

function saveScores(data: ScoreData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getPlayerName(): string {
  return localStorage.getItem(PLAYER_KEY) || '';
}

export function setPlayerName(name: string) {
  localStorage.setItem(PLAYER_KEY, name);
}

// Key Location Game
export function getKeyLocationBest(difficulty: string, mode: '10sec' | '10char'): { score: number; date: string } | null {
  const scores = getScores();
  return scores.keylocation[difficulty]?.[mode] ?? null;
}

export function saveKeyLocationScore(difficulty: string, mode: '10sec' | '10char', score: number): boolean {
  const scores = getScores();
  if (!scores.keylocation[difficulty]) {
    scores.keylocation[difficulty] = { '10sec': null, '10char': null };
  }

  const current = scores.keylocation[difficulty][mode];
  let isNewBest = false;

  if (mode === '10sec') {
    // Higher is better
    if (!current || score > current.score) {
      scores.keylocation[difficulty][mode] = { score, date: new Date().toISOString() };
      isNewBest = true;
    }
  } else {
    // Lower is better (time)
    if (!current || score < current.score) {
      scores.keylocation[difficulty][mode] = { score, date: new Date().toISOString() };
      isNewBest = true;
    }
  }

  saveScores(scores);
  return isNewBest;
}

// Typing Game
export function getTypingBest(difficulty: string): { score: number; date: string } | null {
  const scores = getScores();
  return scores.typing[difficulty] ?? null;
}

export function saveTypingScore(difficulty: string, score: number): boolean {
  const scores = getScores();
  const current = scores.typing[difficulty];
  let isNewBest = false;

  if (!current || score > current.score) {
    scores.typing[difficulty] = { score, date: new Date().toISOString() };
    isNewBest = true;
  }

  saveScores(scores);
  return isNewBest;
}

// Shiritori
export function getShiritoriBest(difficulty: string): ShiritoriScore {
  const scores = getScores();
  return scores.shiritori[difficulty] ?? null;
}

export function saveShiritoriScore(difficulty: string, turns: number, result: 'win' | 'lose'): boolean {
  const scores = getScores();
  const current = scores.shiritori[difficulty];
  let isNewBest = false;

  // Best = win with most turns
  if (!current || (result === 'win' && (current.result !== 'win' || turns > current.turns))) {
    scores.shiritori[difficulty] = { turns, result, date: new Date().toISOString() };
    isNewBest = true;
  }

  saveScores(scores);
  return isNewBest;
}

// 古今東西ゲーム
export function getKokonTozaiBest(difficulty: string): KokonTozaiScore {
  const scores = getScores();
  if (!scores.kokontozai) return null;
  return scores.kokontozai[difficulty] ?? null;
}

export function saveKokonTozaiScore(difficulty: string, answers: number, result: 'win' | 'lose'): boolean {
  const scores = getScores();
  if (!scores.kokontozai) scores.kokontozai = {};
  const current = scores.kokontozai[difficulty];
  let isNewBest = false;

  // Best = win with most answers
  if (!current || (result === 'win' && (current.result !== 'win' || answers > current.answers))) {
    scores.kokontozai[difficulty] = { answers, result, date: new Date().toISOString() };
    isNewBest = true;
  }

  saveScores(scores);
  return isNewBest;
}
