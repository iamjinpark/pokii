import type { ViewStyle } from 'react-native';
import { radius, space, theme } from '@/theme';

/**
 * 떠 있는 면(메뉴·삭제 확인·토스트) (스펙 8.7). 흰색 65% + 남색 글씨, 모서리 14, 안쪽 16.
 * 뒤를 흐리게 하지 않는다. 안드로이드 흐림은 무거워서 모든 기기를 같은 반투명 흰색으로 그린다 (2026-10-25).
 */
export const SURFACE: ViewStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.65)',
  borderRadius: radius.lg,
  padding: space.lg,
  boxShadow: '0 6px 18px rgba(53, 51, 100, 0.16)',
};
export const SURFACE_TEXT = theme.ink;
