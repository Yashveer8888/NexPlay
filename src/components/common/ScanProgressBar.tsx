import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/useThemeStore';

interface ScanProgressBarProps {
  scanned: number;
  total: number;
}

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ scanned, total }) => {
  const theme = useThemeStore((state) => state.theme);
  const progressPercent = total > 0 ? Math.min(100, Math.round((scanned / total) * 100)) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
      <View style={styles.textRow}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          Scanning device storage...
        </Text>
        <Text style={[styles.count, { color: theme.colors.primary }]}>
          {scanned} / {total > 0 ? total : '...'} ({progressPercent}%)
        </Text>
      </View>
      <View style={[styles.barBackground, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: theme.colors.primary, width: `${progressPercent}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
