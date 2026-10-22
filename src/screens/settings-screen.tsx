import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { useSession } from '@/hooks/use-session';
import { type Locale, setLocale, t, useLocale } from '@/i18n';
import { fontSize, radius, space, theme } from '@/theme';
import { signOut } from '@/utils/sign-in';

/** 언어 이름은 그 언어로 적는다. 잘못 고른 사용자도 돌아갈 곳을 읽을 수 있어야 한다. */
const LANGUAGES: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'English' },
  { locale: 'ko', label: '한국어' },
];

const PROVIDERS: Record<string, string> = { google: 'Google', kakao: 'Kakao' };

export default function SettingsScreen() {
  const locale = useLocale();
  const { session } = useSession();
  const [failed, setFailed] = useState(false);
  const user = session?.user;
  const provider = PROVIDERS[String(user?.app_metadata.provider)];

  const onSignOut = () => {
    setFailed(false);
    // 성공하면 세션이 사라져 루트 레이아웃이 로그인 화면으로 보낸다.
    signOut().catch(() => setFailed(true));
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{t('settings.language')}</Text>
      <View style={styles.row}>
        {LANGUAGES.map((l) => {
          const on = l.locale === locale;
          return (
            <Pressable
              key={l.locale}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setLocale(l.locale)}
              style={[styles.option, on && styles.optionOn]}
            >
              <Text style={[styles.optionLabel, on && styles.optionLabelOn]}>{l.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{t('settings.account')}</Text>
      <View style={styles.card}>
        {provider ? <Text style={styles.provider}>{provider}</Text> : null}
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
      </View>

      <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.signOut}>
        <Text style={styles.signOutLabel}>{t('settings.signOut')}</Text>
      </Pressable>
      {failed ? <Text style={styles.error}>{t('settings.signOut.failed')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.sky, padding: space.xl },
  label: { marginTop: space.xl, fontSize: fontSize.xs, fontWeight: '700', color: theme.ink },
  row: { marginTop: space.sm, flexDirection: 'row', gap: space.sm },
  option: {
    minWidth: 96,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    backgroundColor: theme.paper,
    alignItems: 'center',
  },
  optionOn: { backgroundColor: theme.ink },
  optionLabel: { fontSize: fontSize.sm, fontWeight: '600', color: theme.ink },
  optionLabelOn: { color: theme.paper },
  card: { marginTop: space.sm, borderRadius: radius.lg, backgroundColor: theme.paper, padding: space.lg, gap: space.xs },
  provider: { fontSize: fontSize.xs, color: theme.ink, opacity: 0.6 },
  email: { fontSize: fontSize.sm, fontWeight: '600', color: theme.ink },
  signOut: {
    marginTop: space.xxl,
    alignSelf: 'center',
    minWidth: 140,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.round,
    borderWidth: 1.5,
    borderColor: theme.ink,
    alignItems: 'center',
  },
  signOutLabel: { fontSize: fontSize.sm, fontWeight: '700', color: theme.ink },
  error: { marginTop: space.sm, textAlign: 'center', fontSize: fontSize.xs, color: theme.amber },
});
