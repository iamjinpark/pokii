export const TITLE_MAX = 60;
export const TAG_MAX = 8;

/**
 * 제목의 첫 단어를 짧은 이름으로 제안한다 (설계 7.3).
 * 짧은 이름을 선택 항목으로 두면 비었을 때 제목을 잘라 써야 하고, 그러면 나무에
 * 긴 제목이 걸리는 원래 문제로 돌아간다. 필수로 두되 제안으로 마찰을 줄인다.
 */
export function suggestTag(title: string): string {
  const first = title.trim().split(/\s+/)[0] ?? '';
  return first.slice(0, TAG_MAX);
}

/** 저장 버튼을 열 수 있는가. 길이를 넘겨도 입력은 막지 않고 버튼만 잠근다 (설계 7.3). */
export function canCreateGoal(title: string, tag: string): boolean {
  const t = title.trim();
  const g = tag.trim();
  return t.length > 0 && t.length <= TITLE_MAX && g.length > 0 && g.length <= TAG_MAX;
}
