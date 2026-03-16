import { useState, useCallback, useRef } from 'react';

const ROMAJI_MAP: Record<string, string> = {
  'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
  'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
  'sa': 'さ', 'si': 'し', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
  'ta': 'た', 'ti': 'ち', 'chi': 'ち', 'tu': 'つ', 'tsu': 'つ', 'te': 'て', 'to': 'と',
  'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
  'ha': 'は', 'hi': 'ひ', 'hu': 'ふ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
  'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
  'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
  'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
  'wa': 'わ', 'wi': 'ゐ', 'we': 'ゑ', 'wo': 'を',
  'nn': 'ん',
  'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
  'za': 'ざ', 'zi': 'じ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
  'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
  'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
  'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
  // 拗音
  'kya': 'きゃ', 'kyi': 'きぃ', 'kyu': 'きゅ', 'kye': 'きぇ', 'kyo': 'きょ',
  'sya': 'しゃ', 'sha': 'しゃ', 'syi': 'しぃ', 'syu': 'しゅ', 'shu': 'しゅ', 'sye': 'しぇ', 'she': 'しぇ', 'syo': 'しょ', 'sho': 'しょ',
  'tya': 'ちゃ', 'cha': 'ちゃ', 'tyi': 'ちぃ', 'tyu': 'ちゅ', 'chu': 'ちゅ', 'tye': 'ちぇ', 'che': 'ちぇ', 'tyo': 'ちょ', 'cho': 'ちょ',
  'nya': 'にゃ', 'nyi': 'にぃ', 'nyu': 'にゅ', 'nye': 'にぇ', 'nyo': 'にょ',
  'hya': 'ひゃ', 'hyi': 'ひぃ', 'hyu': 'ひゅ', 'hye': 'ひぇ', 'hyo': 'ひょ',
  'mya': 'みゃ', 'myi': 'みぃ', 'myu': 'みゅ', 'mye': 'みぇ', 'myo': 'みょ',
  'rya': 'りゃ', 'ryi': 'りぃ', 'ryu': 'りゅ', 'rye': 'りぇ', 'ryo': 'りょ',
  'gya': 'ぎゃ', 'gyi': 'ぎぃ', 'gyu': 'ぎゅ', 'gye': 'ぎぇ', 'gyo': 'ぎょ',
  'ja': 'じゃ', 'zya': 'じゃ', 'jyi': 'じぃ', 'zyi': 'じぃ', 'ju': 'じゅ', 'zyu': 'じゅ', 'jye': 'じぇ', 'zye': 'じぇ', 'jo': 'じょ', 'zyo': 'じょ',
  'dya': 'ぢゃ', 'dyi': 'ぢぃ', 'dyu': 'ぢゅ', 'dye': 'ぢぇ', 'dyo': 'ぢょ',
  'bya': 'びゃ', 'byi': 'びぃ', 'byu': 'びゅ', 'bye': 'びぇ', 'byo': 'びょ',
  'pya': 'ぴゃ', 'pyi': 'ぴぃ', 'pyu': 'ぴゅ', 'pye': 'ぴぇ', 'pyo': 'ぴょ',
  // 小文字
  'xa': 'ぁ', 'xi': 'ぃ', 'xu': 'ぅ', 'xe': 'ぇ', 'xo': 'ぉ',
  'xya': 'ゃ', 'xyu': 'ゅ', 'xyo': 'ょ', 'xtu': 'っ', 'xtsu': 'っ',
  'la': 'ぁ', 'li': 'ぃ', 'lu': 'ぅ', 'le': 'ぇ', 'lo': 'ぉ',
  'lya': 'ゃ', 'lyu': 'ゅ', 'lyo': 'ょ', 'ltu': 'っ', 'ltsu': 'っ',
  // ー
  '-': 'ー',
};

const CONSONANTS = new Set(['k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'g', 'z', 'd', 'b', 'p', 'f', 'j', 'c', 'v', 'l', 'x']);

function canStartRomaji(buffer: string): boolean {
  for (const key of Object.keys(ROMAJI_MAP)) {
    if (key.startsWith(buffer)) return true;
  }
  // Check for double consonant (っ)
  if (buffer.length === 2 && buffer[0] === buffer[1] && CONSONANTS.has(buffer[0]) && buffer[0] !== 'n') {
    return true;
  }
  if (buffer.length === 1 && CONSONANTS.has(buffer[0])) return true;
  return false;
}

export type RomajiResult = {
  hiragana: string;
  buffer: string;
};

export function useRomaji() {
  const [buffer, setBuffer] = useState('');
  const [convertedText, setConvertedText] = useState('');
  const bufferRef = useRef('');
  const convertedRef = useRef('');

  const processKey = useCallback((key: string): RomajiResult => {
    if (key.length !== 1) return { hiragana: convertedRef.current, buffer: bufferRef.current };

    const k = key.toLowerCase();
    let currentBuffer = bufferRef.current + k;
    let result = convertedRef.current;

    // Handle 'n' -> 'ん' when followed by a consonant (not n, y, or vowel)
    if (bufferRef.current === 'n' && k !== 'n' && k !== 'y' && k !== 'a' && k !== 'i' && k !== 'u' && k !== 'e' && k !== 'o') {
      // Check if 'n' + key can form a valid romaji
      if (!ROMAJI_MAP['n' + k] && !canStartRomaji('n' + k)) {
        result += 'ん';
        currentBuffer = k;
      }
    }

    // Check for double consonant (っ)
    if (currentBuffer.length >= 2) {
      const last2 = currentBuffer.slice(-2);
      if (last2[0] === last2[1] && CONSONANTS.has(last2[0]) && last2[0] !== 'n') {
        result += 'っ';
        currentBuffer = currentBuffer.slice(-1);
      }
    }

    // Try to match romaji
    const matched = ROMAJI_MAP[currentBuffer];
    if (matched) {
      result += matched;
      currentBuffer = '';
    } else if (!canStartRomaji(currentBuffer)) {
      // Invalid sequence - reset buffer
      currentBuffer = canStartRomaji(k) ? k : '';
    }

    bufferRef.current = currentBuffer;
    convertedRef.current = result;
    setBuffer(currentBuffer);
    setConvertedText(result);

    return { hiragana: result, buffer: currentBuffer };
  }, []);

  const finalizeN = useCallback((): string => {
    let result = convertedRef.current;
    if (bufferRef.current === 'n') {
      // At end of word, single 'n' does NOT become 'ん' - require 'nn'
      // But for shiritori confirm, we flush it
    }
    bufferRef.current = '';
    convertedRef.current = result;
    setBuffer('');
    setConvertedText(result);
    return result;
  }, []);

  const confirmN = useCallback((): string => {
    let result = convertedRef.current;
    if (bufferRef.current === 'n') {
      result += 'ん';
    }
    bufferRef.current = '';
    convertedRef.current = result;
    setBuffer('');
    setConvertedText(result);
    return result;
  }, []);

  const reset = useCallback(() => {
    bufferRef.current = '';
    convertedRef.current = '';
    setBuffer('');
    setConvertedText('');
  }, []);

  return { buffer, convertedText, processKey, reset, finalizeN, confirmN };
}

// Utility: generate all valid romaji sequences for a hiragana string
export function hiraganaToRomajiOptions(hiragana: string): string[][] {
  const REVERSE_MAP: Record<string, string[]> = {};

  for (const [romaji, kana] of Object.entries(ROMAJI_MAP)) {
    if (!REVERSE_MAP[kana]) REVERSE_MAP[kana] = [];
    REVERSE_MAP[kana].push(romaji);
  }

  const result: string[][] = [];
  let i = 0;

  while (i < hiragana.length) {
    // Try 2-char match first (拗音)
    if (i + 1 < hiragana.length) {
      const twoChar = hiragana.slice(i, i + 2);
      if (REVERSE_MAP[twoChar]) {
        result.push(REVERSE_MAP[twoChar]);
        i += 2;
        continue;
      }
    }

    // Single char match
    const oneChar = hiragana[i];
    if (oneChar === 'っ') {
      // っ is handled by double consonant - we'll mark it specially
      result.push(['っ']); // placeholder
      i++;
      continue;
    }

    if (REVERSE_MAP[oneChar]) {
      result.push(REVERSE_MAP[oneChar]);
    } else {
      result.push([oneChar]); // pass through unknown chars
    }
    i++;
  }

  return result;
}
