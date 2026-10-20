export type SkyTime = 'morning' | 'afternoon' | 'night';

/** 기기 로컬 시각으로 하늘을 고른다 (스펙 7.1). 아침 6–12시, 낮 12–19시, 나머지는 밤. */
export function skyTimeFor(hour: number): SkyTime {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  return 'night';
}
