export const theme = {
  vine: '#0B7A3B',
  sky: '#D6EEFA',
  ink: '#2E2A6B',
  tag: '#F4EBD9',
  tagEdge: '#8B5E3C',
  amber: '#B45309',
  /** 채우지 않은 알. 기분이 없으면 색도 없다. */
  empty: '#DDE1E6',
  mood: {
    excited: '#33265E',
    happy: '#4E3480',
    calm: '#6D4CA0',
    tired: '#9377BE',
    sad: '#B7A2D6',
  },
} as const;

export type Mood = keyof typeof theme.mood;
export const MOODS: readonly Mood[] = ['excited', 'happy', 'calm', 'tired', 'sad'];
