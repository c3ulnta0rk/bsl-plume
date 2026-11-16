import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'

/** Sur le web il n'y a pas de pilote natif : on évite l'avertissement. */
export const NATIVE = Platform.OS !== 'web'
export const EASE = Easing.bezier(0.2, 0.8, 0.2, 1)

let reduced = false
void AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduced = v }).catch(() => {})
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduced = v })
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced = mq.matches
  mq.addEventListener?.('change', (e) => { reduced = e.matches })
}
/** Les personnes qui ont demandé moins d'animations n'en voient pas. */
export const reduceMotion = () => reduced

/** Apparition : fondu et léger glissement. `delay` permet les cascades dans les listes. */
export function Appear({ children, delay = 0, from = 14, axis = 'y', duration = 380, style, testID }: {
  children: ReactNode, delay?: number, from?: number, axis?: 'x' | 'y', duration?: number, style?: StyleProp<ViewStyle>, testID?: string
}) {
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current
  useEffect(() => {
    if (reduced) return
    const a = Animated.timing(v, { toValue: 1, duration, delay: Math.min(delay, 600), easing: EASE, useNativeDriver: NATIVE })
    a.start()
    return () => a.stop()
  }, [v, delay, duration])
  const move = v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] })
  return <Animated.View testID={testID} style={[style, { opacity: v, transform: [axis === 'y' ? { translateY: move } : { translateX: move }] }]}>{children}</Animated.View>
}

/** Délai de cascade pour le n-ième élément d'une liste. */
export const stagger = (i: number, step = 45) => Math.min(i, 12) * step

/** Valeur animée pour l'effet de pression (léger enfoncement). */
export function usePress(to = 0.96) {
  const v = useRef(new Animated.Value(1)).current
  const go = (toValue: number) => Animated.spring(v, { toValue, useNativeDriver: NATIVE, speed: 40, bounciness: 6 }).start()
  return { scale: v, onPressIn: () => { if (!reduced) go(to) }, onPressOut: () => go(1) }
}

/** Rejoue un petit rebond chaque fois que `watch` change (un point marqué, un statut qui bascule). */
export function Pop({ watch, children, style, scale = 1.22 }: { watch: unknown, children: ReactNode, style?: StyleProp<ViewStyle>, scale?: number }) {
  const v = useRef(new Animated.Value(1)).current
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (reduced) return
    v.setValue(scale)
    Animated.spring(v, { toValue: 1, useNativeDriver: NATIVE, speed: 14, bounciness: 14 }).start()
  }, [watch, v, scale])
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>
}

/** Pulsation continue : réservé à ce qui est en direct. */
export function Pulse({ children, style, min = 0.35, duration = 900 }: { children: ReactNode, style?: StyleProp<ViewStyle>, min?: number, duration?: number }) {
  const v = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (reduced) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: min, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE })
    ]))
    loop.start()
    return () => loop.stop()
  }, [v, min, duration])
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>
}

/** Halo qui s'élargit autour d'un élément pour attirer l'œil (match appelé). */
export function Halo({ color, radius = 16 }: { color: string, radius?: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduced) return
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }))
    loop.start()
    return () => loop.stop()
  }, [v])
  if (reduced) return null
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, borderWidth: 3, borderColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}
    />
  )
}

/** Barre de progression dont la largeur s'anime. */
export function Bar({ ratio, color, track, height = 8 }: { ratio: number, color: string, track: string, height?: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduced) { v.setValue(ratio); return }
    Animated.timing(v, { toValue: ratio, duration: 700, delay: 150, easing: EASE, useNativeDriver: false }).start()
  }, [v, ratio])
  return (
    <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </Animated.View>
  )
}

/** Nombre qui défile jusqu'à sa valeur. */
export function CountUp({ value, style, suffix = '' }: { value: number, style?: StyleProp<TextStyle>, suffix?: string }) {
  const [shown, setShown] = useState(reduced ? value : 0)
  const from = useRef(reduced ? value : 0)
  useEffect(() => {
    if (reduced) { setShown(value); return }
    const start = from.current
    const t0 = Date.now()
    const dur = 600
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / dur)
      const eased = 1 - (1 - p) ** 3
      setShown(Math.round(start + (value - start) * eased))
      if (p === 1) { clearInterval(id); from.current = value }
    }, 30)
    return () => { clearInterval(id); from.current = value }
  }, [value])
  return <Text style={style}>{shown}{suffix}</Text>
}

/** Interrupteur, curseur d'onglet… : valeur 0/1 animée. */
export function useToggle(on: boolean, duration = 180) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: on ? 1 : 0, duration: reduced ? 0 : duration, easing: EASE, useNativeDriver: false }).start()
  }, [on, v, duration])
  return v
}
