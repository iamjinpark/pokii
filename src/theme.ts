export const theme = {
  vine: '#03703D',
  sky: '#DCF4FF',
  ink: '#353364',
  tag: '#F4EBD9',
  tagEdge: '#8B5E3C',
  amber: '#B45309',
  /** 채우지 않은 알. 가장 옅은 기분(sad)보다 확실히 옅어야 한다 (스펙 8.1). */
  empty: '#DEDEDE',
  /** 끝난 송이 후광. */
  glow: '#FFF3A6',
  /** 흰 종이 · 어두운 면 위 글씨. */
  paper: '#FFFFFF',
  /** 입력칸 안내 글씨. */
  hint: '#9AA0A6',
  mood: {
    excited: '#322E64',
    happy: '#4A3678',
    calm: '#634087',
    tired: '#7A5E9E',
    sad: '#9480B5',
  },
} as const;

/** 글자 크기 5단계 + 큰 숫자 (스펙 8.7). */
export const fontSize = { xs: 13, sm: 15, md: 17, lg: 22, xl: 28, number: 48 } as const;

/** 모서리 (스펙 8.7). 원은 지름의 절반 대신 999. */
export const radius = { sm: 6, lg: 14, round: 999 } as const;

/** 간격 8 단위, 아주 좁은 곳만 xs (스펙 8.7). */
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export type Mood = keyof typeof theme.mood;
export const MOODS: readonly Mood[] = ['excited', 'happy', 'calm', 'tired', 'sad'];

/** 언어별 글꼴 이름. 값은 루트 레이아웃의 useFonts 키와 같아야 한다 (스펙 9.2). */
export const fonts = {
  en: { display: 'Anton', body: 'DMSans', bodyBold: 'DMSansBold' },
  ko: { display: 'DoHyeon', body: 'PokiiSansKR', bodyBold: 'PokiiSansKRBold' },
} as const;
