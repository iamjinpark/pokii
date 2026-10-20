import type { IsoDate } from '@/utils/date';

export type Weather = 'clear' | 'rain';

/** 열흘에 하루꼴로 비 (스펙 7.1). */
const RAIN_RATE = 0.1;

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

/** 포키 세계의 날씨 (스펙 7.1). 날짜만으로 정해 같은 날은 늘 같고, 모든 사용자가 같은 날씨를 본다. */
export function weatherFor(date: IsoDate): Weather {
  return unit(date) < RAIN_RATE ? 'rain' : 'clear';
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
