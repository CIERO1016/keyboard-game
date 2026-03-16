export const LEFT_HAND_KEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'] as const;
export const RIGHT_HAND_KEYS = ['Y', 'U', 'I', 'O', 'P', 'H', 'J', 'K', 'L', 'N', 'M'] as const;
export const ALL_ALPHA_KEYS = [...LEFT_HAND_KEYS, ...RIGHT_HAND_KEYS] as const;
export const DIGIT_KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export function getHandForKey(key: string): '左手' | '右手' | null {
  const upper = key.toUpperCase();
  if ((LEFT_HAND_KEYS as readonly string[]).includes(upper)) return '左手';
  if ((RIGHT_HAND_KEYS as readonly string[]).includes(upper)) return '右手';
  return null;
}

export function selectKeysForDifficulty(difficulty: string): string[] {
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const left = shuffle([...LEFT_HAND_KEYS]);
  const right = shuffle([...RIGHT_HAND_KEYS]);

  switch (difficulty) {
    case '初級':
      return [...left.slice(0, 3), ...right.slice(0, 3)];
    case '中級':
      return [...left.slice(0, 5), ...right.slice(0, 5)];
    case '上級':
      return [...left.slice(0, 9), ...right.slice(0, 9)];
    case '鬼':
      return [...ALL_ALPHA_KEYS, ...DIGIT_KEYS];
    default:
      return [...left.slice(0, 3), ...right.slice(0, 3)];
  }
}
