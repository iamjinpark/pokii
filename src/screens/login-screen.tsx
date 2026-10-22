import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { fonts, fontSize, radius, space, theme } from '@/theme';
import { signInWith, type OAuthProvider } from '@/utils/sign-in';

export default function LoginScreen() {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const handle = async (provider: OAuthProvider) => {
    setBusy(provider);
    try {
      await signInWith(provider);
    } catch {
      Alert.alert(t('common.error.network'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.mark}>POKII</Text>
      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, styles.google]}
          disabled={busy !== null}
          onPress={() => handle('google')}
        >
          <Text style={styles.googleLabel}>{t('login.google')}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.kakao]}
          disabled={busy !== null}
          onPress={() => handle('kakao')}
        >
          <Text style={styles.kakaoLabel}>{t('login.kakao')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  mark: { fontSize: fontSize.number, fontFamily: fonts.en.display, color: theme.ink, marginBottom: space.xl + space.md },
  buttons: { alignSelf: 'stretch', gap: space.md },
  button: { height: 52, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  google: { backgroundColor: theme.ink },
  googleLabel: { color: theme.paper, fontSize: fontSize.sm, fontWeight: '700' },
  kakao: { backgroundColor: '#FEE500' },
  kakaoLabel: { color: theme.ink, fontSize: fontSize.sm, fontWeight: '700' },
});
