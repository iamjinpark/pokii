import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';
import { en, type TranslationKey } from './en';
import { ko } from './ko';

export type Locale = 'en' | 'ko';

const tables = { en, ko } as const;

export function resolveLocale(languageCode: string | null | undefined): Locale {
  if (!languageCode) return 'en';
  return languageCode.startsWith('ko') ? 'ko' : 'en';
}

export type Params = Record<string, string | number>;

/** 문구에 값을 끼운다. `{name}` 자리를 params의 같은 이름으로 바꾼다. */
function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function translate(locale: Locale, key: TranslationKey, params?: Params): string {
  return fill(tables[locale][key], params);
}

/** 기기 언어를 읽는다. */
export function deviceLocale(): Locale {
  return resolveLocale(getLocales()[0]?.languageCode);
}

const LOCALE_KEY = 'pokii.locale';
let chosen: Locale | null = null;
const listeners = new Set<() => void>();

/** Settings에서 고른 언어가 있으면 그것, 없으면 기기 언어 (스펙 9). */
export function appLocale(): Locale {
  return chosen ?? deviceLocale();
}

/** 앱을 그리기 전에 한 번 부른다. 저장된 값을 못 읽으면 기기 언어로 간다. */
export async function loadLocale(): Promise<void> {
  const saved = await AsyncStorage.getItem(LOCALE_KEY).catch(() => null);
  if (saved === 'en' || saved === 'ko') chosen = saved;
}

export function setLocale(locale: Locale): void {
  chosen = locale;
  listeners.forEach((notify) => notify());
  AsyncStorage.setItem(LOCALE_KEY, locale).catch(() => {});
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** 언어가 바뀌면 다시 렌더된다. t()는 렌더 시점 값을 읽으므로 이 훅을 쓰는 쪽이 화면을 다시 그려야 한다. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, appLocale);
}

export function t(key: TranslationKey, params?: Params): string {
  return translate(appLocale(), key, params);
}

export type { TranslationKey };
