/** Tree 무대 = Figma 시안에서 헤더와 하단 탭 사이 (393×853 중 77~776). */
export const STAGE_W = 393;
export const STAGE_H = 699;

/** 가로를 꽉 채우되, 세로가 모자라면 위쪽 송이가 잘리지 않게 세로에 맞춘다. */
export function stageScale(width: number, height: number): number {
  return Math.min(width / STAGE_W, height / STAGE_H);
}
