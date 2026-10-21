import type { IsoDate } from '@/utils/date';

/** 벚꽃·낙엽·반딧불은 그 계절의 맑은 날이다. 반딧불은 밤에만 보인다. */
export type Weather = 'clear' | 'rain' | 'snow' | 'cloudy' | 'fog' | 'wind' | 'petal' | 'leaf' | 'firefly';

/** 날씨별 누적 확률 (스펙 7.1): 비·눈 10%, 흐림 10%, 안개 5%, 바람 5%, 나머지 맑음. */
const WET_RATE = 0.1;
const CLOUDY_RATE = 0.2;
const FOG_RATE = 0.25;
const WIND_RATE = 0.3;

/** 날짜 문자열을 0~1로 고르게 흩는다. FNV-1a에 murmur3 마무리를 얹어 이웃한 날짜끼리 값이 몰리지 않게 한다. */
function unit(date: IsoDate): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
}

/** 맑은 날의 계절 날씨 (스펙 7.1): 4월 벚꽃, 7~8월 반딧불, 10~11월 낙엽. */
const SEASON: Record<string, Weather> = { '04': 'petal', '07': 'firefly', '08': 'firefly', '10': 'leaf', '11': 'leaf' };

/** 눈이 오는 달 (12~2월). 그 외 달은 비. */
const SNOW_MONTHS = new Set(['12', '01', '02']);

/** 포키 세계의 날씨 (스펙 7.1). 날짜만으로 정해 같은 날은 늘 같고, 모든 사용자가 같은 날씨를 본다. */
export function weatherFor(date: IsoDate): Weather {
  const u = unit(date);
  if (u < WET_RATE) return SNOW_MONTHS.has(date.slice(5, 7)) ? 'snow' : 'rain';
  if (u < CLOUDY_RATE) return 'cloudy';
  if (u < FOG_RATE) return 'fog';
  if (u < WIND_RATE) return 'wind';
  return SEASON[date.slice(5, 7)] ?? 'clear';
}

let devWeather: Weather | null = null;
/** 개발 빌드에서 날씨를 고정한다. 다른 화면도 다음에 그릴 때 이 날씨를 쓴다. null이면 날짜대로. */
export function setDevWeather(weather: Weather | null) {
  devWeather = weather;
}

/** 오늘(또는 개발 빌드에서 고른) 날씨. */
export function weatherNow(today: IsoDate): Weather {
  return devWeather ?? weatherFor(today);
}
