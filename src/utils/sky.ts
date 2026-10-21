import { Platform, type ViewStyle } from 'react-native';
import { theme } from '@/theme';
import type { IsoDate } from '@/utils/date';
import { type Weather, weatherNow } from '@/utils/weather';

export type SkyTime = 'morning' | 'afternoon' | 'night';

/** 기기 로컬 시각으로 해·달·구름을 고른다 (스펙 7.1). 아침 6–12시, 낮 12–19시, 나머지는 밤. */
export function skyTimeFor(hour: number): SkyTime {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  return 'night';
}

type Rgb = [number, number, number];
type Stops = [string, string, string];

/** 하늘 그라데이션 기준점 (스펙 8.6): [시각(시), 위, 가운데, 아래]. 사이는 부드럽게 섞는다. */
const KEYS: [number, ...Stops][] = [
  [0, '#172439', '#1A2840', '#1B2940'],
  [4.5, '#1E2B4F', '#22305A', '#25345D'],
  [5.5, '#635A8D', '#7A6A9E', '#A4849D'],
  [6.5, '#BEE4F7', '#CBEBFA', '#DDE7E6'],
  [9, '#CEEDFC', '#D4F0FD', '#D7F1FE'],
  [12, '#EDF9E7', '#F1FBE6', '#F3FCE5'],
  [16.5, '#F2FADD', '#F5FCE0', '#F6FDE1'],
  [17.7, '#F9E3BA', '#FBE3B8', '#FCDDB2'],
  [18.5, '#C48C9F', '#E9A0A0', '#F1AC97'],
  [19.3, '#4E4378', '#5D4A82', '#835B84'],
  [20.3, '#1C2B40', '#1D2C40', '#203049'],
  [24, '#172439', '#1A2840', '#1B2940'],
];

const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (c: number[]) =>
  '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export type Sky = {
  stops: Stops;
  gradient: string;
  glow: { rgb: Rgb; alpha: number };
  text: string;
  dark: boolean;
};

/**
 * 날씨별로 그 시각 하늘을 얼마나 어느 색 쪽으로 누를지와 해·달빛 번짐을 얼마나 남길지 (스펙 8.6).
 * 비는 시안 main-rainy-*의 회색·남색, 눈은 그보다 밝은 회청색. 바람·계절 날씨는 맑은 하늘 그대로다.
 */
const WEATHER_SKY: Record<Weather, { day: string; night: string; amount: number; glow: number }> = {
  clear: { day: '#FFFFFF', night: '#000000', amount: 0, glow: 1 },
  wind: { day: '#FFFFFF', night: '#000000', amount: 0, glow: 1 },
  petal: { day: '#FFFFFF', night: '#000000', amount: 0, glow: 1 },
  leaf: { day: '#FFFFFF', night: '#000000', amount: 0, glow: 1 },
  firefly: { day: '#FFFFFF', night: '#000000', amount: 0, glow: 1 },
  rain: { day: '#C4C4C4', night: '#26303F', amount: 0.8, glow: 0 },
  snow: { day: '#D6DCE4', night: '#2E3848', amount: 0.8, glow: 0 },
  cloudy: { day: '#D3D8DC', night: '#28323F', amount: 0.45, glow: 0.4 },
  fog: { day: '#ECEEEE', night: '#3A4556', amount: 0.35, glow: 0.5 },
};

/**
 * 하루 중 분(0–1439)의 하늘. 가운데 색이 어두우면 밝은 글자를 쓴다.
 * 흐리거나 비·눈·안개인 날은 그 시각 하늘을 회색·남색 쪽으로 눌러 시각 변화는 은은하게 남기고, 해·달빛 번짐을 줄인다.
 */
export function skyAt(minutes: number, weather: Weather = 'clear'): Sky {
  const h = (((minutes / 60) % 24) + 24) % 24;
  const i = KEYS.findIndex((k) => k[0] > h) - 1;
  const [h0, ...a] = KEYS[i];
  const [h1, ...b] = KEYS[i + 1];
  const t = (h - h0) / (h1 - h0);
  const s = t * t * (3 - 2 * t);
  const clear = a.map((c, j) => mix(c, b[j], s)) as Stops;
  const dark = luminance(clear[1]) < 0.5;
  const stops =
    clear.map((c) => mix(c, dark ? WEATHER_SKY[weather].night : WEATHER_SKY[weather].day, WEATHER_SKY[weather].amount)) as Stops;
  // 오른쪽 위 모서리에서 번지는 빛. 낮엔 해 색(스펙 8.6), 밤엔 달빛.
  const glow = { rgb: rgb(dark ? LIGHT : h < 12 ? '#FFC187' : '#FF9987'), alpha: WEATHER_SKY[weather].glow * (dark ? 0.18 : 0.45) };
  return {
    stops,
    glow,
    gradient: `linear-gradient(180deg, ${stops[0]} 0%, ${stops[1]} 55%, ${stops[2]} 100%)`,
    text: dark ? LIGHT : theme.ink,
    dark,
  };
}

const LIGHT = '#F7FFE3';

let devMinutes: number | null = null;
/** 개발 빌드 하늘 막대가 고른 시각. 다른 화면도 다음에 그릴 때 이 시각 하늘을 쓴다. null이면 지금. */
export function setDevSkyMinutes(minutes: number | null) {
  devMinutes = minutes;
}

/** 지금(또는 개발 막대가 고른 시각)의 하늘. 오늘 날씨를 반영한다. */
export function skyNow(today: IsoDate): Sky {
  const now = new Date();
  return skyAt(devMinutes ?? now.getHours() * 60 + now.getMinutes(), weatherNow(today));
}

/** 하늘을 화면 배경 스타일로. glow(0–1)만큼 오른쪽 위 모서리 빛 번짐을 위에 얹는다. */
export function skyBackground(sky: Sky, glow: number): ViewStyle {
  const [r, g, b] = sky.glow.rgb;
  const a = sky.glow.alpha * glow;
  const image = `radial-gradient(circle at 100% 0%, rgba(${r}, ${g}, ${b}, ${a}) 0%, rgba(${r}, ${g}, ${b}, 0) 65%), ${sky.gradient}`;
  return { backgroundColor: sky.stops[1], ...backgroundImage(image) };
}

/** CSS 그라데이션을 배경으로. */
export function backgroundImage(image: string): ViewStyle {
  // react-native-web은 experimental_backgroundImage를 모르고, CSS backgroundImage는 그대로 넘긴다.
  // RN 타입에 backgroundImage가 없어 캐스트한다.
  return Platform.OS === 'web'
    ? ({ backgroundImage: image } as ViewStyle)
    : { experimental_backgroundImage: image };
}
