import { getLocales } from 'expo-localization';
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

/** 기기 언어를 읽는다. 사용자가 Settings에서 고른 값은 계획 4에서 덮어쓴다. */
export function deviceLocale(): Locale {
  return resolveLocale(getLocales()[0]?.languageCode);
}

export function t(key: TranslationKey, params?: Params): string {
  return translate(deviceLocale(), key, params);
}

export type { TranslationKey };
