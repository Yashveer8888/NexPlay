export interface ColorPalette {
  primary: string;
  primaryVariant: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceLight: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  overlay: string;
  gradientStart: string;
  gradientEnd: string;
}

export const darkColors: ColorPalette = {
  primary: '#6366F1', // Indigo Accent
  primaryVariant: '#4F46E5',
  secondary: '#10B981', // Emerald
  background: '#0B0F19', // Deep dark space background
  surface: '#111827',
  surfaceLight: '#1F2937',
  card: '#1E293B',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#EC4899', // Vivid pink accent
  border: '#374151',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  overlay: 'rgba(0, 0, 0, 0.75)',
  gradientStart: '#6366F1',
  gradientEnd: '#8B5CF6',
};

export const lightColors: ColorPalette = {
  primary: '#4F46E5',
  primaryVariant: '#4338CA',
  secondary: '#059669',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceLight: '#F1F5F9',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#DB2777',
  border: '#E2E8F0',
  error: '#DC2626',
  success: '#059669',
  warning: '#D97706',
  overlay: 'rgba(15, 23, 42, 0.6)',
  gradientStart: '#4F46E5',
  gradientEnd: '#7C3AED',
};
