import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SLOTS, useGoals } from '@/hooks/use-goals';
import { t } from '@/i18n';
import { theme } from '@/theme';

export default function TreeScreen() {
  const { data: goals, isLoading, isError, refetch } = useGoals();

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

  const filled = new Set((goals ?? []).map((g) => g.position));
  const allEmpty = filled.size === 0;

  return (
    <View style={styles.root}>
      <View style={styles.canopy}>
        {SLOTS.map((slot) => (
          <View key={slot} style={[styles.slotRow, slot === 1 && styles.slotRowCenter]}>
            {filled.has(slot) ? (
              <View style={styles.taken} />
            ) : (
              <Pressable style={styles.empty} accessibilityLabel={`빈 가지 ${slot}`}>
                <Text style={styles.plus}>+</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.greeting}>{t('tree.greeting')}</Text>
        <Text style={styles.body}>{allEmpty ? t('tree.empty') : t('tree.collect')}</Text>
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
  retry: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.ink },
  retryLabel: { color: '#fff', fontWeight: '700' },
});
