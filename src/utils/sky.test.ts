import { skyTimeFor } from './sky';

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
