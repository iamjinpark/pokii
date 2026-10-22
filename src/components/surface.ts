import { Platform, type ViewStyle } from 'react-native';
import { radius, theme } from '@/theme';

/**
 * 떠 있는 면(드롭다운·모달·토스트·바텀시트). 사용자가 놀이터에서 고른 값 (2026-10-21):
 * 흰색 20%, 뒤 흐림 24, 테두리 없음, 부드러운 그림자 16%, 흰 글씨, 모서리 8.
 * 뒤를 흐리는 효과는 웹만 된다(CSS backdrop-filter). 앱에서는 블러 라이브러리가 없어 반투명하게만 보인다.
 */
export const SURFACE: ViewStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(24px)' } as ViewStyle) : {}),
  boxShadow: '0 6px 18px rgba(53, 51, 100, 0.16)',
};
export const SURFACE_TEXT = theme.paper;
export const SURFACE_RADIUS = radius.sm;
