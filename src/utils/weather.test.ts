import { addDays } from './date';
import { weatherFor } from './weather';

test('같은 날짜는 언제나 같은 날씨다', () => {
  expect(weatherFor('2026-10-20')).toBe(weatherFor('2026-10-20'));
});

test('10년 동안 비·눈 오는 날은 약 10%이고, 눈은 12~2월에만 온다', () => {
  let wet = 0;
  let day = '2026-01-01';
  for (let i = 0; i < 3650; i++) {
    const w = weatherFor(day);
    if (w === 'rain' || w === 'snow') wet++;
    const winter = ['12', '01', '02'].includes(day.slice(5, 7));
    if (w === 'snow') expect(winter).toBe(true);
    if (w === 'rain') expect(winter).toBe(false);
    day = addDays(day, 1);
  }
  expect(wet / 3650).toBeGreaterThan(0.08);
  expect(wet / 3650).toBeLessThan(0.12);
});

test('10년 동안 날씨별 비율이 정한 확률 근처다', () => {
  const count: Record<string, number> = {};
  let day = '2026-01-01';
  for (let i = 0; i < 3650; i++) {
    const w = weatherFor(day);
    count[w] = (count[w] ?? 0) + 1;
    day = addDays(day, 1);
  }
  const rate = (w: string) => (count[w] ?? 0) / 3650;
  expect(rate('cloudy')).toBeGreaterThan(0.08);
  expect(rate('cloudy')).toBeLessThan(0.12);
  expect(rate('fog')).toBeGreaterThan(0.035);
  expect(rate('fog')).toBeLessThan(0.065);
  expect(rate('wind')).toBeGreaterThan(0.035);
  expect(rate('wind')).toBeLessThan(0.065);
  const fair = rate('clear') + rate('petal') + rate('leaf') + rate('firefly');
  expect(fair).toBeGreaterThan(0.66);
  expect(fair).toBeLessThan(0.74);
});

test.each([
  ['04', 'petal'],
  ['07', 'firefly'],
  ['08', 'firefly'],
  ['10', 'leaf'],
  ['11', 'leaf'],
])('%s월의 맑은 날은 %s다', (month, season) => {
  let day = `2026-${month}-01`;
  const seen = new Set<string>();
  for (let i = 0; i < 28; i++) {
    seen.add(weatherFor(day));
    day = addDays(day, 1);
  }
  expect(seen.has(season)).toBe(true);
  expect(seen.has('clear')).toBe(false);
});
