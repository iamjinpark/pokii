import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { SURFACE, SURFACE_TEXT } from '@/components/surface';
import { Text } from '@/components/text';
import { space } from '@/theme';

/**
 * 되돌릴 수 없는 일을 묻는 확인 (스펙 8.7). 가운데에 떠 있는 면, 뒤 25% 어둡게, 문장 + 버튼 S(보조·위험).
 * 바깥을 누르면 취소다. 부모 화면을 가득 덮도록 부모 맨 끝에 둔다. Alert은 웹에서 동작하지 않아 화면 안에서 묻는다.
 */
export function ConfirmDialog({
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDisabled = false,
  busy = false,
}: {
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  busy?: boolean;
}) {
  return (
    <View style={styles.frame}>
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onCancel} accessibilityLabel={cancelLabel} />
      <View style={[SURFACE, styles.dialog]} accessibilityViewIsModal>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.row}>
          <Button kind="secondary" size="S" label={cancelLabel} onPress={onCancel} />
          <Button kind="danger" size="S" label={confirmLabel} onPress={onConfirm} disabled={confirmDisabled} busy={busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 3, elevation: 3 },
  dim: { backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  dialog: { width: '84%', maxWidth: 320, gap: space.lg },
  message: { color: SURFACE_TEXT },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
});
