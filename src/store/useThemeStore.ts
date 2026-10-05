import { create } from 'zustand';
import { darkTheme, lightTheme, Theme } from '../theme';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeStoreState {
  themeMode: ThemeMode;
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  themeMode: 'dark', // Modern media players default to dark theme
  theme: darkTheme,

  setThemeMode: (mode: ThemeMode) => {
    const selectedTheme = mode === 'light' ? lightTheme : darkTheme;
    set({ themeMode: mode, theme: selectedTheme });
  },
}));
