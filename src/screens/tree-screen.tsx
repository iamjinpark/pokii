import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SLOTS, useGoals } from '@/hooks/use-goals';
import { isBunchEnded } from '@/utils/bunch';
import { useToday } from '@/hooks/use-today';
import { t } from '@/i18n';
import { theme } from '@/theme';
import { signOut } from '@/utils/sign-in';

export default function TreeScreen() {
  const { data: goals, isLoading, isError, refetch } = useGoals();
  const router = useRouter();
  const today = useToday();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{t('common.error.network')}</Text>
        <Pressable onPress={() => refetch()} style={styles.retry}>
          <Text style={styles.retryLabel}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const byPosition = new Map((goals ?? []).map((g) => [g.position as number, g]));
  const allEmpty = byPosition.size === 0;

  return (
    <View style={styles.root}>
      <View style={styles.canopy}>
        {SLOTS.map((slot) => {
          const goal = byPosition.get(slot);
          return (
            <View key={slot} style={[styles.slotRow, slot === 1 && styles.slotRowCenter]}>
              {goal ? (
                <Pressable
                  style={styles.taken}
                  accessibilityLabel={`${goal.tag} 송이${isBunchEnded({ ...goal.bunch, today }) ? ' 끝남' : ''}`}
                  onPress={() =>
                    // 끝난 송이는 결과 화면으로 간다. 거기서만 끝내기·한 송이 더를 고를 수
                    // 있고, 그러지 않으면 그 가지가 영영 막힌다 (설계 7.1).
                    router.push(
                      isBunchEnded({ ...goal.bunch, today })
                        ? { pathname: '/goal/[id]/done', params: { id: goal.id } }
                        : { pathname: '/goal/[id]', params: { id: goal.id } },
                    )
                  }
                />
              ) : (
                <Pressable
                  style={styles.empty}
                  accessibilityLabel={`빈 가지 ${slot}`}
                  onPress={() => router.push('/goal/new')}
                >
                  <Text style={styles.plus}>+</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.greeting}>{t('tree.greeting')}</Text>
        <Text style={styles.body}>{allEmpty ? t('tree.empty') : t('tree.collect')}</Text>
        {/* 설정 화면(계획 2)이 나오기 전까지 provider를 바꿔가며 테스트하기 위한 임시 버튼. */}
        <Pressable onPress={() => signOut()} style={styles.devSignOut}>
          <Text style={styles.devSignOutLabel}>로그아웃 (임시)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.sky, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.sky, gap: 12 },
  canopy: { flex: 1, justifyContent: 'center', gap: 26 },
  slotRow: { alignItems: 'flex-start' },
  slotRowCenter: { alignItems: 'center' },
  empty: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderStyle: 'dashed', borderColor: theme.vine,
    alignItems: 'center', justifyContent: 'center',
  },
  taken: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.empty },
  plus: { fontSize: 28, fontWeight: '800', color: theme.vine },
  footer: { paddingBottom: 20, gap: 4 },
  greeting: { fontSize: 20, fontWeight: '800', color: theme.ink },
  body: { fontSize: 15, fontWeight: '600', color: theme.ink },
  devSignOut: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6 },
  devSignOutLabel: { fontSize: 13, fontWeight: '600', color: theme.vine, textDecorationLine: 'underline' },
  retry: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.ink },
  retryLabel: { color: '#fff', fontWeight: '700' },
});
