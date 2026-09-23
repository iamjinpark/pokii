import { resolveLocale, translate } from './index';

describe('resolveLocale', () => {
  test('한국어 기기는 ko다', () => {
    expect(resolveLocale('ko-KR')).toBe('ko');
  });

  test('영어 기기는 en이다', () => {
    expect(resolveLocale('en-US')).toBe('en');
  });

  test('지원하지 않는 언어는 en으로 떨어진다', () => {
    expect(resolveLocale('ja-JP')).toBe('en');
  });

  test('언어를 모르면 en으로 떨어진다', () => {
    expect(resolveLocale(null)).toBe('en');
  });
});

describe('translate', () => {
  test('언어에 맞는 문구를 준다', () => {
    expect(translate('en', 'tree.empty')).toBe('your tree is waiting');
    expect(translate('ko', 'tree.empty')).toBe('나무가 기다리고 있어요');
  });
});

describe('값 끼우기', () => {
  test('{이름} 자리를 값으로 바꾼다', () => {
    expect(translate('ko', 'goal.delete.confirm', { bunches: 1, grapes: 4 })).toContain('1');
    expect(translate('ko', 'goal.delete.confirm', { bunches: 1, grapes: 4 })).toContain('4');
  });

  test('값을 안 주면 자리표시자가 그대로 남는다', () => {
    expect(translate('ko', 'goal.delete.confirm')).toContain('{bunches}');
  });

  test('없는 이름은 건드리지 않는다', () => {
    expect(translate('en', 'goal.delete.confirm', { bunches: 2 })).toContain('{grapes}');
  });
});
