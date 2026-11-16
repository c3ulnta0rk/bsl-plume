import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps, ReactNode } from 'react'
import {
  ActivityIndicator, Modal, Platform, Pressable, RefreshControl, ScrollView, Text as RNText, TextInput, useWindowDimensions, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { font, radius, space, useTheme, type Theme } from './theme'

export { font, radius, space, useTheme } from './theme'
export type IconName = ComponentProps<typeof Ionicons>['name']

/** Écran large : mise en page à plusieurs colonnes, vues condensées par défaut. */
export function useWide(min = 900): boolean {
  return useWindowDimensions().width >= min
}

type Variant = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'small' | 'label'
const sizes: Record<Variant, TextStyle> = {
  display: { fontFamily: font.display, fontSize: 40, lineHeight: 42, letterSpacing: 0.2 },
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 34, letterSpacing: 0.2 },
  h2: { fontFamily: font.displayMedium, fontSize: 23, lineHeight: 27, letterSpacing: 0.2 },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 14, lineHeight: 19 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }
}

export function T({ v = 'body', color, style, children, ...rest }: { v?: Variant, color?: string, style?: StyleProp<TextStyle>, children?: ReactNode } & ComponentProps<typeof RNText>) {
  const t = useTheme()
  return <RNText {...rest} style={[{ color: color ?? (v === 'label' ? t.muted : t.ink) }, sizes[v], style]}>{children}</RNText>
}

export function Icon({ name, size = 20, color }: { name: IconName, size?: number, color?: string }) {
  const t = useTheme()
  return <Ionicons name={name} size={size} color={color ?? t.ink} />
}

export function Screen({ children, maxWidth = 1120, onRefresh, refreshing, padded = true, footer }: {
  children: ReactNode, maxWidth?: number, onRefresh?: () => void, refreshing?: boolean, padded?: boolean, footer?: ReactNode
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl + (footer ? 72 : 0) }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.action} /> : undefined}
      >
        <View style={{ width: '100%', maxWidth, alignSelf: 'center', padding: padded ? space.lg : 0, gap: space.lg }}>{children}</View>
      </ScrollView>
      {footer}
    </View>
  )
}

export function Card({ children, style, pad = space.lg, onPress, testID }: { children: ReactNode, style?: StyleProp<ViewStyle>, pad?: number, onPress?: () => void, testID?: string }) {
  const t = useTheme()
  const s: StyleProp<ViewStyle> = [{ backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.line, padding: pad }, style]
  if (onPress) {
    return <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]}>{children}</Pressable>
  }
  return <View testID={testID} style={s}>{children}</View>
}

export function Row({ children, gap = space.sm, wrap, style, align = 'center', justify }: { children: ReactNode, gap?: number, wrap?: boolean, style?: StyleProp<ViewStyle>, align?: ViewStyle['alignItems'], justify?: ViewStyle['justifyContent'] }) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap', justifyContent: justify }, style]}>{children}</View>
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'night'
export function Button({ label, onPress, kind = 'primary', icon, size = 'md', disabled, loading, full, testID, style }: {
  label: string, onPress?: () => void, kind?: ButtonKind, icon?: IconName, size?: 'sm' | 'md' | 'lg', disabled?: boolean, loading?: boolean, full?: boolean, testID?: string, style?: StyleProp<ViewStyle>
}) {
  const t = useTheme()
  const c: Record<ButtonKind, { bg: string, fg: string, border?: string }> = {
    primary: { bg: t.action, fg: t.actionText },
    secondary: { bg: t.surface, fg: t.ink, border: t.line },
    ghost: { bg: 'transparent', fg: t.action },
    danger: { bg: t.dangerBg, fg: t.danger },
    accent: { bg: t.volant, fg: t.volantInk },
    night: { bg: t.night, fg: '#FFFFFF' }
  }
  const k = c[kind]
  const h = size === 'lg' ? 54 : size === 'sm' ? 36 : 46
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [{
        minHeight: h, paddingHorizontal: size === 'sm' ? 12 : 18, borderRadius: radius.md, backgroundColor: k.bg, borderWidth: k.border ? 1 : 0, borderColor: k.border,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, alignSelf: full ? 'stretch' : 'flex-start'
      }, style]}
    >
      {loading ? <ActivityIndicator color={k.fg} /> : icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={k.fg} /> : null}
      <RNText style={{ color: k.fg, fontWeight: '700', fontSize: size === 'lg' ? 17 : size === 'sm' ? 14 : 16 }}>{label}</RNText>
    </Pressable>
  )
}

export type Tone = 'neutral' | 'info' | 'success' | 'warn' | 'danger' | 'live' | 'accent' | 'night'
export function toneColors(t: Theme, tone: Tone): { bg: string, fg: string } {
  switch (tone) {
    case 'info': return { bg: t.actionSoft, fg: t.action }
    case 'success': return { bg: t.successBg, fg: t.success }
    case 'warn': return { bg: t.warnBg, fg: t.warn }
    case 'danger': return { bg: t.dangerBg, fg: t.danger }
    case 'live': return { bg: t.live, fg: '#FFFFFF' }
    case 'accent': return { bg: t.volant, fg: t.volantInk }
    case 'night': return { bg: t.night, fg: '#FFFFFF' }
    default: return { bg: t.surface2, fg: t.ink2 }
  }
}

export function Chip({ label, tone = 'neutral', icon, small }: { label: string, tone?: Tone, icon?: IconName, small?: boolean }) {
  const t = useTheme()
  const c = toneColors(t, tone)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 2 : 4, alignSelf: 'flex-start' }}>
      {icon ? <Ionicons name={icon} size={small ? 11 : 13} color={c.fg} /> : null}
      <RNText style={{ color: c.fg, fontSize: small ? 11 : 13, fontWeight: '700' }}>{label}</RNText>
    </View>
  )
}

export function Banner({ text, tone = 'info', icon, action }: { text: string, tone?: Tone, icon?: IconName, action?: ReactNode }) {
  const t = useTheme()
  const c = toneColors(t, tone)
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: c.bg, borderRadius: radius.md, padding: space.md }}>
      {icon ? <Ionicons name={icon} size={20} color={c.fg} /> : null}
      <RNText style={{ color: c.fg, flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{text}</RNText>
      {action}
    </View>
  )
}

export function Field({ label, error, hint, style, ...rest }: { label: string, error?: string | null, hint?: string } & TextInputProps) {
  const t = useTheme()
  return (
    <View style={[{ gap: 6, flexGrow: 1, flexBasis: 220 }, style as StyleProp<ViewStyle>]}>
      <T v="small" style={{ fontWeight: '700' }}>{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.muted}
        {...rest}
        style={[{
          minHeight: rest.multiline ? 110 : 48, borderWidth: 1.5, borderColor: error ? t.danger : t.line, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
          fontSize: 16, color: t.ink, backgroundColor: t.surface, textAlignVertical: rest.multiline ? 'top' : 'center'
        }, Platform.OS === 'web' ? ({ outlineColor: t.action } as object) : null]}
      />
      {error ? <T v="small" color={t.danger}>{error}</T> : hint ? <T v="small" color={t.muted}>{hint}</T> : null}
    </View>
  )
}

/** Choix exclusif parmi quelques options, en pastilles larges faciles à toucher. */
export function Choice<V extends string | number | boolean>({ label, value, options, onChange, wrap = true }: {
  label?: string, value: V | null, options: { value: V, label: string, hint?: string }[], onChange: (v: V) => void, wrap?: boolean
}) {
  const t = useTheme()
  return (
    <View style={{ gap: 6 }}>
      {label ? <T v="small" style={{ fontWeight: '700' }}>{label}</T> : null}
      <View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? t.action : t.line, backgroundColor: on ? t.actionSoft : t.surface, minHeight: 44, justifyContent: 'center' }}
            >
              <RNText style={{ color: on ? t.action : t.ink, fontWeight: '700', fontSize: 15 }}>{o.label}</RNText>
              {o.hint ? <RNText style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{o.hint}</RNText> : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

/** Onglets horizontaux défilants. */
export function Tabs<V extends string>({ value, options, onChange, dark: onDark }: { value: V, options: { value: V, label: string, badge?: number }[], onChange: (v: V) => void, dark?: boolean }) {
  const t = useTheme()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }} style={{ flexGrow: 0 }}>
      {options.map((o) => {
        const on = o.value === value
        const bg = onDark ? (on ? t.volant : 'transparent') : on ? t.night : t.surface
        const fg = onDark ? (on ? t.volantInk : '#C9D1F2') : on ? '#FFFFFF' : t.ink2
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: radius.pill, backgroundColor: bg, borderWidth: onDark || on ? 0 : 1, borderColor: t.line }}
          >
            <RNText style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{o.label}</RNText>
            {o.badge ? <View style={{ backgroundColor: t.live, borderRadius: 10, minWidth: 20, paddingHorizontal: 5, height: 20, alignItems: 'center', justifyContent: 'center' }}><RNText style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{o.badge}</RNText></View> : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export function Empty({ icon = 'albums-outline', title, text, action }: { icon?: IconName, title: string, text?: string, action?: ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ alignItems: 'center', gap: 8, padding: space.xl, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line }}>
      <Ionicons name={icon} size={34} color={t.muted} />
      <T v="h3" style={{ textAlign: 'center' }}>{title}</T>
      {text ? <T v="small" color={t.ink2} style={{ textAlign: 'center', maxWidth: 420 }}>{text}</T> : null}
      {action}
    </View>
  )
}

export function Loading({ label = 'Chargement' }: { label?: string }) {
  const t = useTheme()
  return (
    <View style={{ flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: t.bg }}>
      <ActivityIndicator size="large" color={t.action} />
      <T v="small" color={t.muted}>{label}</T>
    </View>
  )
}

export function Section({ title, right, children }: { title: string, right?: ReactNode, children: ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <Row justify="space-between" wrap>
        <T v="h2" accessibilityRole="header">{title}</T>
        {right}
      </Row>
      {children}
    </View>
  )
}

/** Fenêtre de dialogue : feuille en bas sur mobile, carte centrée sur grand écran. */
export function Sheet({ visible, onClose, title, children, width = 560 }: { visible: boolean, onClose: () => void, title: string, children: ReactNode, width?: number }) {
  const t = useTheme()
  const wide = useWide(700)
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(5,8,24,0.6)', justifyContent: wide ? 'center' : 'flex-end', alignItems: 'center' }}>
        <Pressable accessibilityLabel="Fermer" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        <View style={{ width: '100%', maxWidth: wide ? width : undefined, maxHeight: '92%', backgroundColor: t.bg, borderRadius: radius.lg, borderBottomLeftRadius: wide ? radius.lg : 0, borderBottomRightRadius: wide ? radius.lg : 0, overflow: 'hidden' }}>
          <Row justify="space-between" style={{ padding: space.lg, borderBottomWidth: 1, borderColor: t.line, backgroundColor: t.surface }}>
            <T v="h2" style={{ flex: 1 }}>{title}</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} hitSlop={10}><Ionicons name="close" size={26} color={t.ink} /></Pressable>
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xl }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export function Switcher({ value, onChange, label }: { value: boolean, onChange: (v: boolean) => void, label: string }) {
  const t = useTheme()
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
      <View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: value ? t.action : t.line, padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
      </View>
      <T v="body" style={{ flexShrink: 1 }}>{label}</T>
    </Pressable>
  )
}
