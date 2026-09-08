// supabase 클라이언트는 AsyncStorage 네이티브 모듈을 요구한다. 순수 함수 테스트에는 필요 없다.
jest.mock('@/utils/supabase', () => ({ supabase: {} }));

import { tokensFrom } from './sign-in';

describe('tokensFrom', () => {
  it('프래그먼트에서 두 토큰을 꺼낸다', () => {
    const url = 'pokii://auth-callback#access_token=aaa&refresh_token=bbb&expires_in=3600';
    expect(tokensFrom(url)).toEqual({ access_token: 'aaa', refresh_token: 'bbb' });
  });

  it('프래그먼트가 없으면 null', () => {
    expect(tokensFrom('pokii://auth-callback')).toBeNull();
  });

  it('취소·거부로 error만 돌아오면 null', () => {
    expect(tokensFrom('pokii://auth-callback#error=access_denied')).toBeNull();
  });

  it('refresh_token이 빠지면 null', () => {
    expect(tokensFrom('pokii://auth-callback#access_token=aaa')).toBeNull();
  });

  it('쿼리스트링에 담겨 오면 무시한다', () => {
    expect(tokensFrom('pokii://auth-callback?access_token=aaa&refresh_token=bbb')).toBeNull();
  });
});
