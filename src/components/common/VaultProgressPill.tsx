import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useThemeStore } from '../../store/useThemeStore';

export const VaultProgressPill: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const vaultTask = useLibraryStore((state) => state.vaultTask);
  const dismissVaultTask = useLibraryStore((state) => state.dismissVaultTask);

  if (!vaultTask) return null;

  const percent =
    vaultTask.total > 0
      ? Math.min(100, Math.round((vaultTask.current / vaultTask.total) * 100))
      : 0;

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <View
        style={[
          styles.pillCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: vaultTask.isComplete ? '#10B981' : theme.colors.primary,
          },
        ]}
      >
        <View style={styles.contentRow}>
          {/* Status Icon */}
          <View style={styles.iconBox}>
            {vaultTask.isComplete ? (
              <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                <Path d="M20 6L9 17l-5-5" />
              </Svg>
            ) : (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>

          {/* Main Info */}
          <View style={styles.infoCol}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.titleText,
                  { color: vaultTask.isComplete ? '#10B981' : theme.colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {vaultTask.message}
              </Text>
              {!vaultTask.isComplete && (
                <Text style={[styles.percentText, { color: theme.colors.primary }]}>
                  {percent}%
                </Text>
              )}
            </View>

            {/* Active filename */}
            {!vaultTask.isComplete && vaultTask.filename ? (
              <Text style={[styles.filenameText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {vaultTask.filename}
              </Text>
            ) : null}

            {/* Progress Bar Track */}
            {!vaultTask.isComplete && (
              <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceLight }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: `${percent}%`,
                    },
                  ]}
                />
              </View>
            )}
          </View>

          {/* Close button if complete */}
          {vaultTask.isComplete && (
            <TouchableOpacity onPress={dismissVaultTask} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2">
                <Path d="M18 6L6 18M6 6l12 12" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  pillCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  percentText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  filenameText: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 4,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
