import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { fonts, fontSize, space, theme } from '@/theme';
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
        <Button label={t('login.google')} onPress={() => handle('google')} disabled={busy !== null} busy={busy === 'google'} />
        {/* 카카오 로그인 버튼은 카카오 브랜드 노랑을 쓴다 (디자인 시스템 예외). */}
        <Button
          kind="secondary"
          label={t('login.kakao')}
          onPress={() => handle('kakao')}
          disabled={busy !== null}
          busy={busy === 'kakao'}
          style={styles.kakao}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  mark: { fontSize: fontSize.number, lineHeight: 56, fontFamily: fonts.brand, color: theme.ink, marginBottom: space.xxl + space.lg },
  buttons: { alignSelf: 'stretch', gap: space.sm },
  kakao: { backgroundColor: '#FEE500' },
});
