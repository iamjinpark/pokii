import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useSession } from '@/hooks/use-session';
import { type Locale, setLocale, t, useLocale } from '@/i18n';
import { radius, space, theme } from '@/theme';
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
      <View style={styles.section}>
        <Text variant="label" style={styles.ink}>{t('settings.language')}</Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {LANGUAGES.map((l) => (
            <Button
              key={l.locale}
              size="S"
              kind={l.locale === locale ? 'primary' : 'secondary'}
              label={l.label}
              onPress={() => setLocale(l.locale)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="label" style={styles.ink}>{t('settings.account')}</Text>
        <View style={styles.card}>
          {provider ? <Text variant="label" style={styles.provider}>{provider}</Text> : null}
          {user?.email ? <Text style={styles.ink}>{user.email}</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <Button kind="secondary" size="M" label={t('settings.signOut')} onPress={onSignOut} style={styles.centered} />
        {failed ? <Text style={styles.error}>{t('settings.signOut.failed')}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.sky, padding: space.xl, gap: space.xxl },
  section: { gap: space.sm },
  ink: { color: theme.ink },
  row: { flexDirection: 'row', gap: space.sm },
  card: { borderRadius: radius.lg, backgroundColor: theme.paper, padding: space.lg, gap: space.xs },
  provider: { color: theme.ink, opacity: 0.6 },
  centered: { alignSelf: 'center' },
  error: { textAlign: 'center', color: theme.amber },
});
