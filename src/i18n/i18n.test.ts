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
