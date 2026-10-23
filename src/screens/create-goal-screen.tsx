import { useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput as RNTextInput, View } from 'react-native';
import { ScreenFrame } from '@/components/screen-frame';
import { Text, TextInput } from '@/components/text';
import { useCreateGoal } from '@/hooks/use-create-goal';
import { useToday } from '@/hooks/use-today';
import { t } from '@/i18n';
import { fontSize, radius, space, theme } from '@/theme';
import { canCreateGoal, charCount, suggestTag, TAG_MAX, TITLE_MAX } from '@/utils/goal';

/**
 * 나무의 빈 가지를 탭해 들어온다 (설계 7.3). 빈 가지가 있을 때만 진입할 수 있으므로
 * 목표 3개 제한은 진입 단계에서 지켜진다.
 */
export default function CreateGoalScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const today = useToday();
  const create = useCreateGoal();

  const [title, setTitle] = useState('');
  const [typedTag, setTypedTag] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // disabled는 렌더 뒤에야 적용된다. 같은 프레임에 두 번 누르면 두 클릭 모두 이전 렌더의
  // 값을 보고 통과해 목표가 둘 생기고 3개 제한이 뚫린다(설계 7.3). 동기적으로 막는다.
  const submitting = useRef(false);
  // 생성에 성공해서 나가는 길은 막지 않는다. ref라 같은 틱에서도 값이 보인다.
  const created = useRef(false);
  const tagInput = useRef<RNTextInput>(null);
  const pending = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);

  // 제목의 첫 단어를 제안하되, 직접 고친 뒤에는 덮어쓰지 않는다.
  const tag = typedTag ?? suggestTag(title);
  const dirty = title.trim().length > 0 || typedTag !== null;
  const saving = create.isPending;
  const ready = canCreateGoal(title, tag) && !saving;

  // 주소로 직접 들어오거나 새로고침하면 돌아갈 히스토리가 없다. 그때는 부모 화면으로 간다.
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // ✕뿐 아니라 하드웨어 뒤로가기·스택 제스처로도 이 화면을 뜰 수 있다. 확인을 버튼이
  // 아니라 네비게이션 층에 걸어야 입력이 조용히 사라지지 않는다.
  //
  // 웹의 브라우저 뒤로가기는 popstate로 처리돼 네비게이터 액션을 거치지 않으므로 걸리지
  // 않는다. v1 출시 대상은 Android라 그대로 둔다.
  usePreventRemove(dirty && !saving, ({ data }) => {
    if (created.current) {
      navigation.dispatch(data.action);
      return;
    }
    pending.current = data.action;
    setConfirming(true);
  });

  const discard = () => {
    setConfirming(false);
    const action = pending.current;
    pending.current = null;
    if (action) navigation.dispatch(action);
    else back();
  };

  const submit = () => {
    if (!ready || submitting.current) return;
    submitting.current = true;
    create.mutate(
      { title: title.trim(), tag: tag.trim(), startedOn: today },
      {
        // 성공했을 때만 나간다. 실패하면 입력을 들고 그대로 머문다 (설계 7.3).
        onSuccess: () => {
          created.current = true;
          back();
        },
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };

  const count = { title: charCount(title.trim()), tag: charCount(tag.trim()) };
  const over = { title: count.title > TITLE_MAX, tag: count.tag > TAG_MAX };

  return (
    <ScreenFrame
      title={t('goal.new.title')}
      // 저장 중에는 닫기를 감춘다 (설계 7.3).
      onClose={saving ? undefined : back}
      footer={
        <>
          {confirming ? (
            // Alert은 웹에서 동작하지 않는다. 확인을 화면 안에서 묻는다.
            <View style={styles.confirm}>
              <Text style={styles.confirmText}>{t('goal.new.discard')}</Text>
              <View style={styles.confirmRow}>
                <Pressable onPress={() => setConfirming(false)} style={styles.keep}>
                  <Text label style={styles.keepLabel}>{t('goal.new.keep')}</Text>
                </Pressable>
                <Pressable
                  onPress={discard}
                  style={styles.leave}
                  accessibilityLabel={t('goal.new.leave')}
                >
                  <Text label style={styles.leaveLabel}>{t('goal.new.leave')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!ready}
            accessibilityLabel={t('goal.new.create')}
            accessibilityState={{ disabled: !ready, busy: saving }}
            style={[styles.create, !ready && styles.createOff]}
          >
            <Text label style={styles.createLabel}>{t('goal.new.create')}</Text>
          </Pressable>
        </>
      }
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('goal.new.titlePlaceholder')}
        placeholderTextColor={theme.hint}
        style={styles.title}
        editable={!saving}
        multiline
        // 여러 줄 칸이지만 완료 키는 줄을 바꾸지 않고 짧은 이름 칸으로 넘어간다.
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => tagInput.current?.focus()}
        accessibilityLabel={t('goal.new.titlePlaceholder')}
      />
      <Text style={[styles.counter, over.title && styles.counterOver]}>
        {`${count.title}/${TITLE_MAX}`}
      </Text>

      <Text label style={styles.label}>{t('goal.new.tagLabel')}</Text>
      <TextInput
        ref={tagInput}
        value={tag}
        onChangeText={setTypedTag}
        style={styles.tag}
        editable={!saving}
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel={t('goal.new.tagLabel')}
      />
      <Text style={[styles.counter, over.tag && styles.counterOver]}>
        {`${count.tag}/${TAG_MAX}`}
      </Text>

      <Text style={styles.hint}>{t('goal.new.hint')}</Text>

      {create.isError ? <Text style={styles.failed}>{t('goal.new.failed')}</Text> : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  title: {
    minHeight: 76,
    borderRadius: radius.lg,
    backgroundColor: theme.paper,
    padding: space.lg,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: theme.ink,
    textAlignVertical: 'top',
  },
  label: { marginTop: space.xl, fontSize: fontSize.xs, fontWeight: '700', color: theme.ink },
  tag: {
    marginTop: space.sm,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: theme.paper,
    paddingHorizontal: space.lg,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: theme.ink,
  },
  counter: { marginTop: space.sm, alignSelf: 'flex-end', fontSize: fontSize.xs, fontWeight: '700', color: theme.hint },
  counterOver: { color: theme.amber },
  hint: { marginTop: space.xl, fontSize: fontSize.xs, fontWeight: '600', color: theme.ink, opacity: 0.7 },
  failed: { marginTop: space.lg, fontSize: fontSize.sm, fontWeight: '700', color: theme.amber },
  confirm: { gap: space.sm },
  confirmText: { fontSize: fontSize.sm, fontWeight: '700', color: theme.ink },
  confirmRow: { flexDirection: 'row', gap: space.sm },
  keep: { paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.round, backgroundColor: theme.paper },
  keepLabel: { fontSize: fontSize.sm, fontWeight: '700', color: theme.ink },
  leave: { paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.round, backgroundColor: theme.amber },
  leaveLabel: { fontSize: fontSize.sm, fontWeight: '700', color: theme.paper },
  create: {
    height: 52,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.ink,
  },
  createOff: { opacity: 0.35 },
  createLabel: { color: theme.paper, fontSize: fontSize.sm, fontWeight: '700' },
});
