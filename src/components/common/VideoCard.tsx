import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { VideoItem } from '../../types/video';
import { useThemeStore } from '../../store/useThemeStore';

interface VideoCardProps {
  video: VideoItem;
  viewMode: 'grid' | 'list';
  onPress: () => void;
  onLongPress?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const formatDuration = (ms: number): string => {
  if (!ms || isNaN(ms)) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

const formatSize = (bytes: number): string => {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getResolutionLabel = (width: number, height: number): string => {
  const maxDim = Math.max(width, height);
  if (maxDim >= 3840) return '4K';
  if (maxDim >= 1920) return '1080p';
  if (maxDim >= 1280) return '720p';
  if (maxDim > 0) return 'SD';
  return '';
};

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  viewMode,
  onPress,
  onLongPress,
  isSelectionMode,
  isSelected,
}) => {
  const theme = useThemeStore((state) => state.theme);
  const resLabel = getResolutionLabel(video.width, video.height);

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[
          styles.gridContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
      >
        <View style={[styles.gridThumbnail, { backgroundColor: theme.colors.surfaceLight }]}>
          {video.thumbnailUri ? (
            <Image source={{ uri: video.thumbnailUri }} style={styles.thumbnailImage} />
          ) : (
            <Svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="1.5">
              <Path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <Path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Svg>
          )}

          <View style={styles.durationBadge}>
            <Text style={styles.badgeText}>{formatDuration(video.duration)}</Text>
          </View>

          {resLabel ? (
            <View style={[styles.resBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{resLabel}</Text>
            </View>
          ) : null}

          {isSelectionMode && (
            <View
              style={[
                styles.gridCheckbox,
                {
                  borderColor: isSelected ? theme.colors.primary : '#FFFFFF',
                  backgroundColor: isSelected ? theme.colors.primary : 'rgba(0,0,0,0.5)',
                },
              ]}
            >
              {isSelected && (
                <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3">
                  <Path d="M5 13l4 4L19 7" />
                </Svg>
              )}
            </View>
          )}
        </View>

        <View style={styles.gridInfo}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {video.filename}
          </Text>
          <Text style={[styles.subText, { color: theme.colors.textMuted }]}>
            {formatSize(video.size)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.listContainer,
        {
          backgroundColor: theme.colors.card,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {isSelectionMode && (
        <View
          style={[
            styles.checkboxCircle,
            {
              borderColor: isSelected ? theme.colors.primary : theme.colors.textMuted,
              backgroundColor: isSelected ? theme.colors.primary : 'transparent',
            },
          ]}
        >
          {isSelected && (
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3">
              <Path d="M5 13l4 4L19 7" />
            </Svg>
          )}
        </View>
      )}
      <View style={[styles.listThumbnail, { backgroundColor: theme.colors.surfaceLight }]}>
        {video.thumbnailUri ? (
          <Image source={{ uri: video.thumbnailUri }} style={styles.thumbnailImage} />
        ) : (
          <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="1.5">
            <Path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <Path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </Svg>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.badgeText}>{formatDuration(video.duration)}</Text>
        </View>
      </View>

      <View style={styles.listContent}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {video.filename}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>
            {formatSize(video.size)}
          </Text>
          <Text style={[styles.dot, { color: theme.colors.textMuted }]}>•</Text>
          <Text style={[styles.subText, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {video.folder}
          </Text>
          {resLabel ? (
            <>
              <Text style={[styles.dot, { color: theme.colors.textMuted }]}>•</Text>
              <View style={[styles.inlineBadge, { backgroundColor: theme.colors.surfaceLight }]}>
                <Text style={[styles.inlineBadgeText, { color: theme.colors.primary }]}>
                  {resLabel}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Grid layout styles
  gridContainer: {
    flex: 1,
    margin: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridThumbnail: {
    height: 94,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gridInfo: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  // List layout styles
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 9,
    marginVertical: 3,
    marginHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  listThumbnail: {
    width: 82,
    height: 50,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listContent: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subText: {
    fontSize: 11.5,
  },
  dot: {
    marginHorizontal: 4,
    fontSize: 11.5,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  resBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  inlineBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  inlineBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  gridCheckbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
