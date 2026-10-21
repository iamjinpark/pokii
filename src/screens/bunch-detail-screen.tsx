import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_HEIGHT, TAB_BAR_HEIGHT } from '@/components/app-header';
import { Text } from '@/components/text';
import { Grape } from '@/components/grape';
import { BERRIES, berryBox, BERRY_D, BUNCH_EXTENT, STEM_LEAF } from '@/components/tree-bunch';
import { useCurrentBunch } from '@/hooks/use-current-bunch';
import { useDeleteGoal, useGoalFootprint } from '@/hooks/use-goal-mutations';
import { useToday } from '@/hooks/use-today';
import { WeatherLayer } from '@/components/weather-layer';
import { backgroundImage, skyBackground, skyNow } from '@/utils/sky';
import { weatherNow } from '@/utils/weather';
import { STAGE_W } from '@/utils/stage';
import { t } from '@/i18n';
import { theme } from '@/theme';
import {
  bunchDates,
  footerKey,
  grapeStateFor,
  startLabel,
  wiltLevels,
  type GrapeState,
} from '@/utils/bunch';

/** 탭하면 하루 기록 화면이 열리는 상태 (스펙 7.4). 놓침·미래는 아무 일도 일어나지 않는다. */
const OPENABLE = new Set<GrapeState>(['filled', 'today', 'yesterday']);

/**
 * 큰 송이는 나무 송이를 그대로 키워 쓴다. 두 화면의 송이 모양이 같아야 한다.
 * 배율(393 폭 기준)과 아래 상수 값은 사용자가 상세 화면 조절기에서 골랐다 (#57).
 */
const BIG = 2.8;
/** stem-leaf.svg(84×74)는 위쪽 10.7이 비어 있다. 보이는 잎 끝부터 간격을 재려고 뺀다. */
const LEAF_EMPTY_TOP = 10.7;
/** 보이는 송이 위 끝. 송이 그룹 기준. */
const BUNCH_TOP = BUNCH_EXTENT.top + LEAF_EMPTY_TOP;
/** 송이(보이는 잎 끝 ~ 맨 아래 알)의 높이. 393 폭 기준 px. */
const BIG_H = (BUNCH_EXTENT.bottom - BUNCH_TOP) * BIG;
/**
 * 송이는 이 비율 밑으로 줄이지 않는다 (화면 폭 기준 크기 대비). 짧은 화면에 긴 제목이면 안내 문구와 겹친다.
 * 이 비율로도 탭바에 잘리면 그때만 더 줄인다.
 */
const MIN_BUNCH_RATIO = 0.75;
/** 알 범위(그룹 x 0–100)의 가로 가운데. 오른쪽으로 삐져나온 줄기잎은 빼고 잰다. */
const BIG_CENTER_X = 50 * BIG;
/** 송이가 터치를 받는 영역. 부모 밖의 터치는 Android에서 버려지므로 알이 모두 들어가게 잡는다. */
const BIG_BOX = { width: (STEM_LEAF.left + STEM_LEAF.width) * BIG, height: BUNCH_EXTENT.bottom * BIG };
/** 제목과 송이 사이 간격. 제목이 몇 줄이든 같다. 잎 위 빈 여백은 빼고 잰다. */
const TITLE_BUNCH_GAP = 12;
/** 송이 아래 여백. 안내 문구는 토스트처럼 떠서 송이와 겹쳐도 된다. */
const FOOTER_SPACE = 32;
/**
 * 덤불은 포도를 기준으로 놓는다. 덤불 경계가 포도 가운데 세로선에서 포도 높이의 이 비율 지점을 지난다.
 * 시안 detail-*에서 약 53%다. 덤불은 그린 비율 그대로 폭에 맞추고 위아래로만 옮긴다.
 */
const CANOPY_CROSS = 0.52;
/** canopy.svg 크기. */
const CANOPY_W = 393;
const CANOPY_H = 551;
/** canopy.svg(사용자가 그린 덤불)의 경계가 가운데 세로선(x 196.5)을 처음 지나는 높이 (그림 높이 대비). 외곽선에서 쟀다. */
const CANOPY_EDGE_AT_CENTER = 0.7477;
/** 헤더(← No · Start)와 제목 사이 간격. */
const HEADER_TITLE_GAP = 16;
/** 덤불 위 글자색. */
const CANOPY_TEXT = '#FFFFFF';

export default function BunchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: bunch, isLoading, isError, refetch } = useCurrentBunch(id);
  // 메뉴와 삭제 확인은 이 화면 안에서 연다. Alert은 웹에서 뜨지 않는다.
  const [menu, setMenu] = useState<'closed' | 'open' | 'confirm'>('closed');
  const footprint = useGoalFootprint(id, menu === 'confirm');
  const remove = useDeleteGoal(id);
  // 주소로 직접 들어오면 돌아갈 히스토리가 없다.
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // 훅이라 이른 return보다 위에 있어야 한다.
  const today = useToday();
  // onLayout은 웹에서 믿을 수 없어 Tree처럼 창 크기에서 헤더·하단 탭을 뺀다.
  const win = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const area = {
    width: win.width,
    height: win.height - top - HEADER_HEIGHT - bottom - TAB_BAR_HEIGHT,
  };
  // ponytail: 렌더 시점 시각. Tree와 같은 한계다.
  const weather = weatherNow(today);
  const sky = skyNow(today);
  const skyBg = skyBackground(sky, 1);
  // 송이 칸(제목 아래 ~ 안내 문구 위)의 크기. 재기 전(0)에는 송이를 그리지 않는다.
  const [slot, setSlot] = useState({ y: 0, width: 0, height: 0 });

  if (isLoading) {
    return (
      <View style={[styles.center, skyBg]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !bunch) {
    return (
      <View style={[styles.center, skyBg]}>
        <Text style={[styles.body, { color: sky.text }]}>{t('common.error.network')}</Text>
        <Pressable onPress={() => refetch()} style={styles.retry}>
          <Text style={styles.retryLabel}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const dates = bunchDates(bunch.startedOn);
  const filled = new Set(bunch.grapes.map((g) => g.grapeDate));
  const moodOf = new Map(bunch.grapes.map((g) => [g.grapeDate, g.mood]));
  const states = dates.map((date) => grapeStateFor({ date, today, filled }));
  const wilts = wiltLevels(states);

  const key = footerKey({ startedOn: bunch.startedOn, today, filled });

  const { width } = area;
  // 송이는 칸 맨 위에 붙인다. 칸이 송이보다 작으면 줄이되 최소 크기 밑으로는 줄이지 않는다.
  // 최소 크기여도 칸(탭바 위까지)을 넘치면 칸에 딱 맞게 더 줄인다. 잘리는 것보다 작은 게 낫다.
  const full = area.width / STAGE_W;
  const fit = (slot.height - FOOTER_SPACE) / BIG_H;
  const floor = Math.min(full * MIN_BUNCH_RATIO, slot.height / BIG_H);
  const bigScale = slot.height > 0 ? Math.max(floor, Math.min(full, fit)) : 0;
  const bunchAt = {
    left: slot.width / 2 - BIG_CENTER_X * bigScale,
    top: -BUNCH_TOP * BIG * bigScale,
  };
  // 덤불 경계가 지나야 할 높이에 맞춰 덤불을 올린다. 내려야 하면 위에 하늘이 드러나 흰 제목이 안 보이므로,
  // 그때만 위를 붙인 채 세로로 늘린다.
  const crossY = slot.y + CANOPY_CROSS * BIG_H * bigScale;
  const canopyNaturalH = (width * CANOPY_H) / CANOPY_W;
  const canopyTop = crossY - CANOPY_EDGE_AT_CENTER * canopyNaturalH;
  const canopyBox =
    canopyTop <= 0
      ? { top: canopyTop, height: canopyNaturalH }
      : { top: 0, height: crossY / CANOPY_EDGE_AT_CENTER };

  return (
    <View style={[styles.root, skyBg]}>
      <Image
        source={require('../../assets/detail/canopy.svg')}
        contentFit="fill"
        style={[styles.canopy, { width }, canopyBox]}
      />
      {/* 비 오는 날은 덤불이 한 톤 짙어져 젖어 보인다 (나무 화면과 같은 색·세기). */}
      {weather === 'rain' ? (
        <Image
          source={require('../../assets/detail/canopy.svg')}
          contentFit="fill"
          style={[styles.canopy, { width, opacity: 0.28 }, canopyBox]}
          tintColor="#001914"
        />
      ) : null}

      <View style={styles.column}>
        <View style={styles.top}>
          <View style={styles.header}>
            <View style={styles.headerSide}>
              <Pressable onPress={back} style={styles.iconButton} accessibilityLabel="뒤로" hitSlop={5}>
                <Image source={require('../../assets/icons/back.svg')} style={styles.icon} tintColor={CANOPY_TEXT} />
              </Pressable>
              <Text style={styles.meta}>{`No.${bunch.sequence}`}</Text>
            </View>
            <View style={styles.headerSide}>
              <Text style={styles.meta}>{startLabel(bunch.startedOn)}</Text>
              <Pressable
                onPress={() => setMenu(menu === 'closed' ? 'open' : 'closed')}
                style={styles.iconButton}
                accessibilityLabel={t('goal.menu')}
                hitSlop={5}
              >
                <Image source={require('../../assets/icons/more.svg')} style={styles.icon} tintColor={CANOPY_TEXT} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.title}>{bunch.title}</Text>
        </View>
        <View style={styles.slot} onLayout={(e) => setSlot(e.nativeEvent.layout)}>
          {bigScale > 0 ? (
            <View style={[styles.bunch, BIG_BOX, bunchAt, { transform: [{ scale: bigScale }] }]}>
              <Image
                source={require('../../assets/tree/stem-leaf.svg')}
                style={{
                  position: 'absolute',
                  left: STEM_LEAF.left * BIG,
                  top: STEM_LEAF.top * BIG,
                  width: STEM_LEAF.width * BIG,
                  height: STEM_LEAF.height * BIG,
                }}
              />
              {/* 오늘 알은 채웠든 아니든 맨 앞에 그린다. 뒤에 겹친 자리여도 가려지지 않는다. */}
              {[...BERRIES]
                .sort((a, b) => Number(dates[a.day] === today) - Number(dates[b.day] === today))
                .map(({ day, cx, cy, shape }) => {
                const date = dates[day];
                return (
                  <Grape
                    key={date}
                    day={day + 1}
                    state={states[day]}
                    mood={moodOf.get(date) ?? null}
                    wilt={wilts[day]}
                    shape={shape}
                    box={berryBox(shape, cx * BIG, cy * BIG, BERRY_D * BIG)}
                    onPress={
                      OPENABLE.has(states[day])
                        ? () => router.push({ pathname: '/goal/[id]/[date]', params: { id, date } })
                        : undefined
                    }
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      </View>

      {/* 안내 문구는 토스트처럼 반투명 배경에 띄운다. 송이와 겹쳐도 읽힌다. */}
      {key ? (
        <View style={styles.toast}>
          <Text style={styles.toastLabel}>{t(key)}</Text>
        </View>
      ) : null}

      {/* 메뉴·삭제 확인은 날씨 효과 위에 뜬다. */}
      <WeatherLayer weather={weather} night={sky.dark} width={area.width} height={area.height} />

      {/* 메뉴·삭제 확인이 떠 있을 때 바깥을 누르면 닫힌다. */}
      {menu !== 'closed' ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu('closed')} accessibilityLabel={t('goal.delete.no')} />
      ) : null}

      {menu === 'open' ? (
        <View style={[styles.menu, styles.overlay]}>
          <Pressable
            onPress={() => router.push({ pathname: '/goal/[id]/edit', params: { id } })}
            style={styles.menuItem}
            accessibilityLabel={t('goal.edit')}
          >
            <Image source={require('../../assets/icons/pencil.svg')} style={styles.menuIcon} tintColor={theme.ink} />
            <Text style={styles.menuLabel}>{t('goal.edit')}</Text>
          </Pressable>
          <View style={styles.menuRule} />
          <Pressable
            onPress={() => setMenu('confirm')}
            style={styles.menuItem}
            accessibilityLabel={t('goal.delete')}
          >
            <Image source={require('../../assets/icons/trash.svg')} style={styles.menuIcon} tintColor={theme.amber} />
            <Text style={[styles.menuLabel, styles.danger]}>{t('goal.delete')}</Text>
          </Pressable>
        </View>
      ) : null}

      {menu === 'confirm' ? (
        <View style={[styles.menu, styles.overlay]}>
          <Text style={styles.confirmText}>
            {footprint.data
              ? t('goal.delete.confirm', {
                  bunches: footprint.data.bunches,
                  grapes: footprint.data.grapes,
                })
              : '…'}
          </Text>
          <View style={styles.confirmRow}>
            <Pressable
              onPress={() => setMenu('closed')}
              style={styles.keep}
              accessibilityLabel={t('goal.delete.no')}
            >
              <Text style={styles.menuLabel}>{t('goal.delete.no')}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                remove.mutate(undefined, { onSuccess: back })
              }
              disabled={!footprint.data || remove.isPending}
              style={[styles.removeButton, (!footprint.data || remove.isPending) && styles.off]}
              accessibilityLabel={t('goal.delete.yes')}
            >
              <Text style={styles.removeLabel}>{t('goal.delete.yes')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  canopy: { position: 'absolute', top: 0, left: 0 },
  bunch: { position: 'absolute', transformOrigin: 'top left' },
  /** 뒤로가기·메뉴 아이콘 버튼. 보이는 크기는 34, hitSlop으로 누르는 영역은 44다. */
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 22, height: 22 },
  column: { flex: 1, gap: TITLE_BUNCH_GAP, paddingTop: 22 },
  top: { gap: HEADER_TITLE_GAP },
  slot: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // 아이콘 버튼(34) 안쪽 여백만큼 줄여, 꺾쇠 끝이 제목(좌우 22)과 같은 선에 오게 한다.
    paddingHorizontal: 12,
  },
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  /**
   * 메뉴·삭제 확인 카드: 뿌연 유리처럼. 반투명한 흰 바탕이 아래로 살짝 회색으로 진해지고, 밝은 흰 테두리와
   * 부드러운 그림자를 두른다. 뒤를 흐리는 효과는 웹만 된다(CSS backdrop-filter). 앱에서는 블러 라이브러리가
   * 없어 흐림 없이 반투명하게만 보인다.
   */
  menu: {
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(244, 244, 246, 0.6)',
    ...backgroundImage('linear-gradient(180deg, rgba(255, 255, 255, 0.62) 0%, rgba(232, 232, 238, 0.55) 100%)'),
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(14px) saturate(1.3)' } as object) : {}),
    paddingHorizontal: 14, paddingVertical: 6,
    boxShadow: '0 8px 24px rgba(53, 51, 100, 0.18), 0 0 0 0.5px rgba(53, 51, 100, 0.12)',
  },
  /** 메뉴는 세로 점 버튼 바로 아래, 제목·송이 위에 뜬다. */
  overlay: { position: 'absolute', top: 64, right: 14, minWidth: 180, zIndex: 2, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  menuIcon: { width: 20, height: 20 },
  menuRule: { height: 1, backgroundColor: 'rgba(53, 51, 100, 0.1)' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: theme.ink },
  danger: { color: theme.amber },
  confirmText: { fontSize: 14, fontWeight: '600', color: theme.ink, lineHeight: 20, paddingTop: 10 },
  confirmRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 12, paddingBottom: 8 },
  keep: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(53, 51, 100, 0.06)' },
  removeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.amber,
  },
  removeLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  off: { opacity: 0.4 },
  meta: { fontSize: 16, color: CANOPY_TEXT },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 26, color: CANOPY_TEXT, paddingHorizontal: 22 },
  toast: {
    position: 'absolute', bottom: 16, alignSelf: 'center', maxWidth: '90%', pointerEvents: 'none',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(53, 51, 100, 0.72)',
  },
  toastLabel: { fontSize: 14, fontWeight: '600', color: '#fff', textAlign: 'center' },
  body: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  retry: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.ink },
  retryLabel: { color: '#fff', fontWeight: '700' },
});
