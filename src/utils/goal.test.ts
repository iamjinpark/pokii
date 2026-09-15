import { canCreateGoal, suggestTag, TAG_MAX } from './goal';

describe('suggestTag', () => {
  it('첫 단어를 쓴다', () => {
    expect(suggestTag('Build this project and deploy soon')).toBe('Build');
  });

  it('첫 단어가 길면 자른다', () => {
    expect(suggestTag('Refactoring everything')).toBe('Refactor');
    expect(suggestTag('Refactoring everything')).toHaveLength(TAG_MAX);
  });

  it('앞뒤 공백을 무시한다', () => {
    expect(suggestTag('   매일 운동하기  ')).toBe('매일');
  });

  it('공백이 여러 칸이어도 첫 단어만 준다', () => {
    expect(suggestTag('아침    산책')).toBe('아침');
  });

  it('비어 있으면 빈 문자열', () => {
    expect(suggestTag('')).toBe('');
    expect(suggestTag('   ')).toBe('');
  });
});

describe('canCreateGoal', () => {
  it('둘 다 있으면 만들 수 있다', () => {
    expect(canCreateGoal('운동하기', '운동')).toBe(true);
  });

  it('제목이나 태그가 비면 안 된다', () => {
    expect(canCreateGoal('', '운동')).toBe(false);
    expect(canCreateGoal('운동하기', '')).toBe(false);
    expect(canCreateGoal('   ', '운동')).toBe(false);
  });

  it('길이를 넘기면 잠긴다', () => {
    expect(canCreateGoal('a'.repeat(61), 'tag')).toBe(false);
    expect(canCreateGoal('운동', 'a'.repeat(9))).toBe(false);
  });

  it('경계값은 통과한다', () => {
    expect(canCreateGoal('a'.repeat(60), 'a'.repeat(8))).toBe(true);
  });
});
