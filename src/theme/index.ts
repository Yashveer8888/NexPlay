import { darkColors, lightColors, ColorPalette } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

export interface Theme {
  colors: ColorPalette;
  typography: typeof typography;
  spacing: typeof spacing;
  isDark: boolean;
}

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  isDark: true,
};

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  isDark: false,
};

export * from './colors';
export * from './typography';
export * from './spacing';
