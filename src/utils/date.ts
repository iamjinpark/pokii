export type IsoDate = string;

const pad = (n: number): string => String(n).padStart(2, '0');

export function localToday(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toUtcMillis(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: IsoDate, n: number): IsoDate {
  const shifted = new Date(toUtcMillis(date) + n * 86400000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / 86400000);
}

/**
 * 다음 로컬 자정까지 남은 밀리초. 경계에 정확히 걸려 날짜가 덜 넘어간 상태로 깨지 않도록
 * 1초를 더한다. 로컬 생성자를 쓰므로 서머타임이 있는 지역에서도 어긋나지 않는다.
 */
export function msUntilMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  return next.getTime() - now.getTime();
}
