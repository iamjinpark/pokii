import { getLocales } from 'expo-localization';
import { en, type TranslationKey } from './en';
import { ko } from './ko';

export type Locale = 'en' | 'ko';

const tables = { en, ko } as const;

export function resolveLocale(languageCode: string | null | undefined): Locale {
  if (!languageCode) return 'en';
  return languageCode.startsWith('ko') ? 'ko' : 'en';
}

export function translate(locale: Locale, key: TranslationKey): string {
  return tables[locale][key];
}

/** 기기 언어를 읽는다. 사용자가 Settings에서 고른 값은 계획 4에서 덮어쓴다. */
export function deviceLocale(): Locale {
  return resolveLocale(getLocales()[0]?.languageCode);
}

export function t(key: TranslationKey): string {
  return translate(deviceLocale(), key);
}

export type { TranslationKey };
