import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAutoRefresh } from './use-auto-refresh';

const mockStart = jest.fn();
const mockStop = jest.fn();
jest.mock('@/utils/supabase', () => ({
  supabase: { auth: { startAutoRefresh: () => mockStart(), stopAutoRefresh: () => mockStop() } },
}));

type Listener = (state: string) => void;

/** 이 버전의 renderHook은 Promise를 돌려준다. await해야 effect가 흐른다. */
async function mountAndCapture(): Promise<Listener> {
  const spy = jest.spyOn(AppState, 'addEventListener');
  await renderHook(() => useAutoRefresh());
  const call = spy.mock.calls.at(-1);
  if (!call) throw new Error('AppState 리스너가 걸리지 않았다.');
  return call[1] as unknown as Listener;
}

beforeEach(() => {
  jest.restoreAllMocks();
  mockStart.mockClear();
  mockStop.mockClear();
});

describe('useAutoRefresh', () => {
  it('마운트되면 자동 갱신을 시작한다', async () => {
    await renderHook(() => useAutoRefresh());
    expect(mockStart).toHaveBeenCalled();
  });

  it('포그라운드로 돌아오면 다시 건다 — 백그라운드에서 타이머가 멈추기 때문', async () => {
    const listener = await mountAndCapture();
    mockStart.mockClear();
    listener('active');
    expect(mockStart).toHaveBeenCalled();
  });

  it('백그라운드로 가면 멈춘다', async () => {
    const listener = await mountAndCapture();
    mockStart.mockClear();
    listener('background');
    expect(mockStop).toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('언마운트되면 멈추고 리스너를 뗀다', async () => {
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove } as never);
    const { unmount } = await renderHook(() => useAutoRefresh());
    unmount();
    // 정리(cleanup)도 비동기로 흐른다.
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(mockStop).toHaveBeenCalled();
  });
});
