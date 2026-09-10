import { localToday, addDays, diffDays } from './date';

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
