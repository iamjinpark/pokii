import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '@/i18n';
import { theme } from '@/theme';
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
  root: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  mark: { fontSize: 40, fontWeight: '800', color: theme.ink, letterSpacing: 2, marginBottom: 48 },
  buttons: { alignSelf: 'stretch', gap: 12 },
  button: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  google: { backgroundColor: theme.ink },
  googleLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  kakao: { backgroundColor: '#FEE500' },
  kakaoLabel: { color: theme.ink, fontSize: 15, fontWeight: '700' },
});
