//src/theme/colors.ts
export const Colors = {
  // Primary Palette
  offWhite: '#FAF8F3',
  lightSurface: '#F2F2F2',
  active_tab: '#1f1f1f',
  darkGreen: '#4F6F52',
  lightGreen: '#C9D3B0',
  white: '#FFFFFF',
  muted: '#6B6B6B',
  errorRed: '#D64545',
  black: '#000000',

  lightRed:'#FFEAEA',
  brightRed: '#f90101',
  greenBtn: '#1B6B4A',
  greenBg:'#D1DFD2',
  lineRoute: '#5A3EE5',
  // Supporting
  lightGray: '#E2E8F0',
  mediumGray: '#94A3B8',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',

  // Transparent
  overlay: 'rgba(15, 36, 3, 0.75)',
  border: 'rgba(255, 255, 255, 0.08)',
  backgroundOverlay: 'rgba(147, 145, 145, 0.09)',
};

export const DarkTheme = {
  background: Colors.offWhite,
  surface: Colors.lightGreen,
  surfaceSecondary: Colors.darkGreen,
  textPrimary: Colors.offWhite,
  textSecondary: Colors.mediumGray,
  accent: Colors.offWhite,
  border: 'rgba(255,255,255,0.08)',
  danger: Colors.danger,
};

export const LightTheme = {
  background: Colors.offWhite,
  surface: Colors.lightSurface,
  surfaceSecondary: Colors.darkGreen,
  textPrimary: Colors.black,
  textSecondary: '#64748B',
  accent: Colors.lightGreen,
  border: 'rgba(0,0,0,0.08)',
  danger: Colors.danger,
};