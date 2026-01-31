import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="document/[id]"
        options={{
          title: '書類編集',
          headerBackTitle: '戻る',
        }}
      />
      <Stack.Screen
        name="document/preview"
        options={{
          title: 'プレビュー',
          headerBackTitle: '戻る',
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          title: 'Proプラン',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="data-handling"
        options={{
          title: 'データ取扱説明',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
