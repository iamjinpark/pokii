import { renderHook, waitFor } from '@testing-library/react-native';
import { queryClient } from '@/utils/query';
import { useSession } from './use-session';

const mockGetSession = jest.fn();
const mockUnsubscribe = jest.fn();
let emit: ((event: string, session: unknown) => void) | null = null;

jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        emit = cb;
        return { data: { subscription: { unsubscribe: () => mockUnsubscribe() } } };
      },
    },
  },
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockUnsubscribe.mockReset();
  emit = null;
  queryClient.clear();
  mockGetSession.mockResolvedValue({ data: { session: null } });
});

describe('useSession', () => {
  it('로그아웃하면 캐시를 비운다 — 같은 기기의 다음 사용자가 이전 데이터를 보면 안 된다', async () => {
    const { result } = await renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    queryClient.setQueryData(['goals'], [{ id: 'A의 목표' }]);
    expect(queryClient.getQueryData(['goals'])).toBeDefined();

    emit?.('SIGNED_OUT', null);
    await waitFor(() => expect(queryClient.getQueryData(['goals'])).toBeUndefined());
  });

  it('로그인 이벤트에서는 캐시를 비우지 않는다', async () => {
    const { result } = await renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    queryClient.setQueryData(['goals'], [{ id: '내 목표' }]);
    emit?.('SIGNED_IN', { user: { id: 'u1' } });

    await waitFor(() => expect(result.current.session).not.toBeNull());
    expect(queryClient.getQueryData(['goals'])).toBeDefined();
  });

  it('언마운트되면 구독을 해제한다', async () => {
    const { unmount } = await renderHook(() => useSession());
    unmount();
    await waitFor(() => expect(mockUnsubscribe).toHaveBeenCalled());
  });
});
