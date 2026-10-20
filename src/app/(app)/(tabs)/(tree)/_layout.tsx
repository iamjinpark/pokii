import { Stack } from 'expo-router';

// 송이 상세는 둘러보는 화면이라 탭 안에 쌓는다. 입력·완료 화면은 (app) 스택에서 탭을 덮는다.
export default function TreeLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
