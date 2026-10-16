import { Stack } from 'expo-router';
import { AppHeader } from '@/components/app-header';

export default function AppLayout() {
  return <Stack screenOptions={{ header: () => <AppHeader /> }} />;
}
