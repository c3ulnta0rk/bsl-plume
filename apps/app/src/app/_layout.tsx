import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed'
import { Ionicons } from '@expo/vector-icons'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppBar } from '@/features/app-bar'
import { SessionProvider } from '@/lib/session'
import { useTheme } from '@/ui'

void SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const t = useTheme()
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } }))
  const [loaded, error] = useFonts({ BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, ...Ionicons.font })
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync().catch(() => {})
  }, [loaded, error])
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: t.night }} />
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <SessionProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: t.bg }}>
            <AppBar />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'fade' }} />
          </View>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
