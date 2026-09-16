export const TITLE_MAX = 60;
export const TAG_MAX = 8;

/**
 * 글자 수는 코드포인트로 센다. JS의 length와 slice는 UTF-16 단위라 이모지 같은
 * 비BMP 문자를 반으로 자르고, Postgres의 char_length는 코드포인트를 세므로 기준도
 * 어긋난다. 양쪽을 코드포인트로 맞춘다.
 */
function chars(text: string): string[] {
  return [...text];
}

export function charCount(text: string): number {
  return chars(text).length;
}

/**
 * 제목의 첫 단어를 짧은 이름으로 제안한다 (설계 7.3).
 * 짧은 이름을 선택 항목으로 두면 비었을 때 제목을 잘라 써야 하고, 그러면 나무에
 * 긴 제목이 걸리는 원래 문제로 돌아간다. 필수로 두되 제안으로 마찰을 줄인다.
 */
export function suggestTag(title: string): string {
  const first = title.trim().split(/\s+/)[0] ?? '';
  return chars(first).slice(0, TAG_MAX).join('');
}

/** 저장 버튼을 열 수 있는가. 길이를 넘겨도 입력은 막지 않고 버튼만 잠근다 (설계 7.3). */
export function canCreateGoal(title: string, tag: string): boolean {
  const t = charCount(title.trim());
  const g = charCount(tag.trim());
  return t > 0 && t <= TITLE_MAX && g > 0 && g <= TAG_MAX;
}
