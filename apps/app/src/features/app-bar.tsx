import { Ionicons } from '@expo/vector-icons'
import { Link, usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSession } from '@/lib/session'
import { font, radius, space, useTheme, useWide } from '@/ui'

/** Barre du haut, identique sur le web et dans l'application. */
export function AppBar() {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const path = usePathname()
  const wide = useWide(700)
  const { user, alert, dismissAlert, online } = useSession()

  useEffect(() => {
    if (!alert) return
    const timer = setTimeout(dismissAlert, 20_000)
    return () => clearTimeout(timer)
  }, [alert, dismissAlert])

  const link = (href: string, label: string, icon: React.ComponentProps<typeof Ionicons>['name'], active: boolean) => (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(href as never)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: wide ? 12 : 8, height: 40, borderRadius: radius.pill, backgroundColor: active ? 'rgba(255,255,255,0.14)' : 'transparent' }}
    >
      <Ionicons name={icon} size={20} color="#FFFFFF" />
      {wide ? <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{label}</Text> : null}
    </Pressable>
  )
  return (
    <View testID="noprint" style={{ backgroundColor: t.night, paddingTop: insets.top, zIndex: 10 }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: 6, width: '100%', maxWidth: 1120, alignSelf: 'center' }}>
        <Link href="/" accessibilityLabel="Plume, accueil" style={{ marginRight: 'auto' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={require('../../assets/images/splash-icon.png')} style={{ width: 32, height: 32 }} accessibilityIgnoresInvertColors />
            <Text style={{ fontFamily: font.display, fontSize: 26, color: '#FFFFFF', letterSpacing: 1.5 }}>PLUME</Text>
          </View>
        </Link>
        {link('/', 'Tournois', 'trophy-outline', path === '/')}
        {link('/orga', 'Organiser', 'construct-outline', path.startsWith('/orga'))}
        {link('/connexion', user ? user.name.split(' ')[0]! : 'Connexion', user ? 'person-circle' : 'person-circle-outline', path === '/connexion')}
      </View>
      {!online
        ? (
            <View style={{ backgroundColor: t.warnBg, paddingVertical: 6, paddingHorizontal: space.lg }}>
              <Text style={{ color: t.warn, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>Connexion au direct interrompue, nouvelle tentative en cours…</Text>
            </View>
          )
        : null}
      {alert
        ? (
            <Pressable
              testID="live-alert"
              accessibilityRole="alert"
              onPress={() => { const u = alert.url; dismissAlert(); if (u) router.push(u as never) }}
              style={{ backgroundColor: t.volant, paddingVertical: 12, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Ionicons name="notifications" size={24} color={t.volantInk} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.display, fontSize: 22, color: t.volantInk }}>{alert.title}</Text>
                <Text style={{ color: t.volantInk, fontSize: 15, fontWeight: '600' }}>{alert.body}</Text>
              </View>
              <Pressable accessibilityLabel="Fermer l'alerte" onPress={dismissAlert} hitSlop={12}><Ionicons name="close" size={22} color={t.volantInk} /></Pressable>
            </Pressable>
          )
        : null}
    </View>
  )
}
