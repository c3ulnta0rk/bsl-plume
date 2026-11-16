import { useColorScheme } from 'react-native'

/**
 * Direction artistique « Plume ».
 * Un bleu nuit pour la structure, un jaune volant pour ce qui gagne ou ce qui compte,
 * un rouge vif réservé au direct. Les scores vivent sur des « tableaux de marque » sombres,
 * en chiffres condensés très grands : lisibles de loin, au soleil comme dans un gymnase.
 */
const base = {
  night: '#0B1437',
  volant: '#C8F03C',
  volantInk: '#182300',
  live: '#F0384B'
}

export const light = {
  ...base,
  dark: false,
  bg: '#F2F4F8',
  surface: '#FFFFFF',
  surface2: '#E8ECF4',
  ink: '#0B1437',
  ink2: '#454F72',
  muted: '#77819E',
  line: '#D9DEEA',
  action: '#2440F0',
  actionText: '#FFFFFF',
  actionSoft: '#E4E8FF',
  success: '#0B8F50',
  successBg: '#DCF5E7',
  warn: '#A96300',
  warnBg: '#FFF0D2',
  danger: '#D0203A',
  dangerBg: '#FDE2E6',
  board: '#0B1437',
  boardUp: '#16215A',
  boardText: '#FFFFFF',
  boardMuted: '#93A0CF',
  boardLine: '#26336E'
}

export const dark: typeof light = {
  ...base,
  dark: true,
  bg: '#050818',
  surface: '#0E1533',
  surface2: '#182149',
  ink: '#F1F3FB',
  ink2: '#B5BEDC',
  muted: '#7F8BB3',
  line: '#232E60',
  action: '#8497FF',
  actionText: '#050818',
  actionSoft: '#1A2459',
  success: '#3DD68C',
  successBg: '#0D2E22',
  warn: '#F5B544',
  warnBg: '#33260A',
  danger: '#FF6B7E',
  dangerBg: '#3A0F18',
  board: '#111A40',
  boardUp: '#1B2760',
  boardText: '#FFFFFF',
  boardMuted: '#93A0CF',
  boardLine: '#2B397A'
}

export type Theme = typeof light

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light
}

export const font = {
  display: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_600SemiBold'
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 }
