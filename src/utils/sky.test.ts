import { GLASS_ALPHA, glassColor, skyAt, skyTimeFor } from './sky';

test.each([
  [5, 'night'],
  [6, 'morning'],
  [11, 'morning'],
  [12, 'afternoon'],
  [17, 'afternoon'],
  [18, 'afternoon'],
  [19, 'night'],
  [0, 'night'],
])('%i시는 %s', (hour, expected) => {
  expect(skyTimeFor(hour)).toBe(expected);
});

test('기준점 시각에서는 기준점 색 그대로다', () => {
  expect(skyAt(9 * 60).stops).toEqual(['#CEEDFC', '#D4F0FD', '#D7F1FE']);
  expect(skyAt(0).stops).toEqual(skyAt(24 * 60).stops);
});

test('기준점 사이는 양쪽 색 사이 값이다', () => {
  const [top] = skyAt(18 * 60).stops;
  const r = parseInt(top.slice(1, 3), 16);
  expect(r).toBeLessThan(0xf2);
  expect(r).toBeGreaterThan(0x4f);
});

test.each([
  [3 * 60, '#F7FFE3'],
  [9 * 60, '#353364'],
  [18 * 60 + 30, '#353364'],
  [19 * 60 + 30, '#F7FFE3'],
])('%i분의 글자색은 %s', (minutes, text) => {
  expect(skyAt(minutes).text).toBe(text);
});


test('비 오는 날 하늘은 낮엔 회색, 밤엔 어두운 남색 쪽이고 빛 번짐이 없다', () => {
  const day = skyAt(14 * 60, 'rain');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(day.stops[1].slice(i, i + 2), 16));
  expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(12);
  expect(day.glow.alpha).toBe(0);
  expect(day.text).toBe('#353364');
  expect(skyAt(22 * 60, 'rain').text).toBe('#F7FFE3');
});

test('떠 있는 면 위 크림 글씨는 하루 내내, 덤불·하늘 어디서든 4.5:1 넘게 읽힌다', () => {
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a: number[], b: number[]) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  for (let m = 0; m < 1440; m += 30) {
    for (const weather of ['clear', 'rain', 'snow', 'cloudy'] as const) {
      const sky = skyAt(m, weather);
      const glass = hex(glassColor(sky));
      for (const under of [hex('#03703D'), ...sky.stops.map(hex)]) {
        const comp = glass.map((v, i) => v * GLASS_ALPHA + under[i] * (1 - GLASS_ALPHA));
        expect(ratio(hex('#F7FFE3'), comp)).toBeGreaterThan(4.5);
      }
    }
  }
});
