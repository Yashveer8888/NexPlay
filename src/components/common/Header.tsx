import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeStore } from '../../store/useThemeStore';

interface HeaderProps {
  title: string;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  showSearch?: boolean;
  viewMode?: 'grid' | 'list';
  onToggleViewMode?: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  searchQuery = '',
  onSearchChange,
  showSearch = true,
  viewMode = 'list',
  onToggleViewMode,
  onRefresh,
}) => {
  const theme = useThemeStore((state) => state.theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        </View>

        <View style={styles.actions}>
          {onRefresh && (
            <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
              <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2">
                <Path d="M23 4v6h-6M1 20v-6h6" />
                <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </Svg>
            </TouchableOpacity>
          )}

          {onToggleViewMode && (
            <TouchableOpacity style={styles.iconButton} onPress={onToggleViewMode}>
              <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2">
                {viewMode === 'list' ? (
                  <Path d="M4 6h16M4 12h16M4 18h16" />
                ) : (
                  <Path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                )}
              </Svg>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearch && onSearchChange && (
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2">
            <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </Svg>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search videos, formats, folders..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
});
