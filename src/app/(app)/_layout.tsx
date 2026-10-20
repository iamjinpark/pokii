import { Stack } from 'expo-router';
import { AppHeader } from '@/components/app-header';

// 하위 화면으로 바로 들어와도 뒤로 가면 탭으로 돌아간다.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function AppLayout() {
  return <Stack screenOptions={{ header: () => <AppHeader /> }} />;
}
