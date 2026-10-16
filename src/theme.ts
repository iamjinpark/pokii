export const theme = {
  vine: '#03703D',
  sky: '#DCF4FF',
  ink: '#353364',
  tag: '#F4EBD9',
  tagEdge: '#8B5E3C',
  amber: '#B45309',
  /** 채우지 않은 알. 가장 옅은 기분(sad)보다 확실히 옅어야 한다 (스펙 8.1). */
  empty: '#C6B6D8',
  mood: {
    excited: '#322E64',
    happy: '#4A3678',
    calm: '#634087',
    tired: '#7A5E9E',
    sad: '#9480B5',
  },
} as const;

export type Mood = keyof typeof theme.mood;
export const MOODS: readonly Mood[] = ['excited', 'happy', 'calm', 'tired', 'sad'];

/** 언어별 글꼴 이름. 값은 루트 레이아웃의 useFonts 키와 같아야 한다 (스펙 9.2). */
export const fonts = {
  en: { display: 'Anton', body: 'DMSans', bodyBold: 'DMSansBold' },
  ko: { display: 'DoHyeon', body: 'PokiiSansKR', bodyBold: 'PokiiSansKRBold' },
} as const;
