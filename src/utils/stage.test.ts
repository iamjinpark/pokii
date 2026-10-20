import { STAGE_H, STAGE_W, stageScale } from './stage';

test('시안과 같은 크기면 1배', () => {
  expect(stageScale(STAGE_W, STAGE_H)).toBe(1);
});

test('길쭉한 화면은 가로에 맞춘다', () => {
  expect(stageScale(412, 900)).toBeCloseTo(412 / STAGE_W);
});

test('넓적한 화면은 세로에 맞춰 송이가 잘리지 않는다', () => {
  expect(stageScale(800, 600)).toBeCloseTo(600 / STAGE_H);
});
