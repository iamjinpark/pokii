import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLocale, loadLocale, resolveLocale, setLocale, translate } from './index';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'ko' }] }));

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

// 모듈 안의 선택 값이 테스트 사이에 이어지므로 순서대로 읽는다.
describe('고른 언어', () => {
  test('고르기 전에는 기기 언어를 따른다', () => {
    expect(appLocale()).toBe('ko');
  });

  test('저장된 값이 지원 언어가 아니면 무시한다', async () => {
    await AsyncStorage.setItem('pokii.locale', 'ja');
    await loadLocale();
    expect(appLocale()).toBe('ko');
  });

  test('시작할 때 저장된 언어를 읽어온다', async () => {
    await AsyncStorage.setItem('pokii.locale', 'en');
    await loadLocale();
    expect(appLocale()).toBe('en');
  });

  test('고르면 바로 바뀌고 저장된다', async () => {
    setLocale('ko');
    expect(appLocale()).toBe('ko');
    expect(await AsyncStorage.getItem('pokii.locale')).toBe('ko');
  });
});
