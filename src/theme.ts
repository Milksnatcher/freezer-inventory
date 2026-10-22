// Palette, fonts and shadows copied from the Gut Log app's tailwind config:
// sage = primary, sky = secondary, amber = warm accent, clay = flagged/old, ink = text neutrals.
export const c = {
  sage: { 50: '#EEF5F0', 100: '#DCEAE0', 200: '#B9D5C2', 300: '#8FBB9E', 400: '#699F7D', 500: '#4E8267', 600: '#3F6A54', 700: '#345645', 800: '#2B4638', 900: '#233A2E' },
  sky: { 50: '#EFF5FA', 100: '#DCEAF4', 200: '#B7D5E9', 300: '#8FBBDA', 400: '#6C9EC4', 500: '#517FA6', 600: '#406484', 700: '#385368', 800: '#2E4453', 900: '#263845' },
  clay: { 50: '#FBF0EE', 100: '#F5DDD8', 200: '#E9B9AF', 300: '#DA9385', 400: '#C97564', 500: '#B45E4C', 600: '#954B3C', 700: '#793D31' },
  amber: { 50: '#FBF6EA', 100: '#F0E4C5', 200: '#E0C98C', 300: '#CDA35C', 400: '#BC9245', 500: '#B8923F', 600: '#96751F', 700: '#785E19' },
  ink: { 50: '#F6F8F7', 100: '#E9EDEB', 200: '#CDD6D1', 300: '#A6B4AC', 400: '#78897F', 500: '#57685E', 600: '#42504A', 700: '#2E3934', 800: '#212B27', 900: '#171E1B' },
};
export const font = {
  display: 'Manrope_800ExtraBold', displayBold: 'Manrope_700Bold',
  body: 'Inter_400Regular', bodyMed: 'Inter_500Medium', bodySemi: 'Inter_600SemiBold',
};
export const radius = { xl2: 20, lg: 12 };
export const shadow = {
  soft: { shadowColor: '#2B4638', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  card: { shadowColor: '#2B4638', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
};
