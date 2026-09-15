import { localToday, addDays, diffDays, msUntilMidnight } from './date';

describe('localToday', () => {
  test('기기 로컬 날짜를 YYYY-MM-DD로 준다', () => {
    expect(localToday(new Date(2026, 8, 8, 13, 30))).toBe('2026-09-08');
  });

  test('자정 직전은 아직 그날이다', () => {
    expect(localToday(new Date(2026, 8, 8, 23, 59, 59))).toBe('2026-09-08');
  });

  test('자정을 넘기면 다음 날이다', () => {
    expect(localToday(new Date(2026, 8, 9, 0, 0, 0))).toBe('2026-09-09');
  });
});

describe('addDays', () => {
  test('며칠 뒤를 준다', () => {
    expect(addDays('2026-09-08', 9)).toBe('2026-09-17');
  });

  test('음수면 며칠 전을 준다', () => {
    expect(addDays('2026-09-08', -1)).toBe('2026-09-07');
  });

  test('월을 넘긴다', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  test('윤년 2월을 넘긴다', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('diffDays', () => {
  test('같은 날은 0이다', () => {
    expect(diffDays('2026-09-08', '2026-09-08')).toBe(0);
  });

  test('뒤로 갈수록 양수다', () => {
    expect(diffDays('2026-09-08', '2026-09-17')).toBe(9);
  });

  test('앞으로 가면 음수다', () => {
    expect(diffDays('2026-09-08', '2026-09-07')).toBe(-1);
  });
});

describe('msUntilMidnight', () => {
  // ISO 문자열은 UTC로 해석되므로 로컬 생성자로 만든다. 그래야 시간대와 무관하다.
  const at = (h: number, m: number, s: number) => new Date(2026, 8, 15, h, m, s);

  it('자정 직전이면 1초 남짓 남는다', () => {
    expect(msUntilMidnight(at(23, 59, 59))).toBe(2000);
  });

  it('자정 직후면 거의 하루가 남는다', () => {
    expect(msUntilMidnight(at(0, 0, 0))).toBe(24 * 3600 * 1000 + 1000);
  });

  it('정오면 반나절이 남는다', () => {
    expect(msUntilMidnight(at(12, 0, 0))).toBe(12 * 3600 * 1000 + 1000);
  });

  it('항상 양수다', () => {
    for (const h of [0, 6, 12, 18, 23]) {
      expect(msUntilMidnight(at(h, 30, 30))).toBeGreaterThan(0);
    }
  });
});
