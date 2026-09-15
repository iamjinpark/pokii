import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localToday, msUntilMidnight, type IsoDate } from '@/utils/date';

/**
 * 기기 로컬 자정을 경계로 오늘 날짜를 준다.
 *
 * 화면을 띄워둔 채 자정이 지나면 렌더 시점에 계산한 날짜가 어제로 남는다. 읽기 화면에서는
 * 강조된 알과 안내 문구가 틀리고, 쓰기가 붙으면 어제 날짜로 저장돼 하루 한 알 제약 때문에
 * 그날이 소진된다.
 */
export function useToday(): IsoDate {
  const [today, setToday] = useState<IsoDate>(localToday);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      setToday(localToday());
      timer = setTimeout(tick, msUntilMidnight());
    };
    timer = setTimeout(tick, msUntilMidnight());

    // OS가 백그라운드에서 타이머를 멈추거나 늦게 깨운다. 포그라운드 복귀에서 다시 맞춘다.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      clearTimeout(timer);
      tick();
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
