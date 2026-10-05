import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { VideoItem } from '../../types/video';
import { useThemeStore } from '../../store/useThemeStore';

interface VideoCardProps {
  video: VideoItem;
  viewMode: 'grid' | 'list';
  onPress: () => void;
  onFavoriteToggle?: () => void;
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
  onFavoriteToggle,
}) => {
  const theme = useThemeStore((state) => state.theme);
  const resLabel = getResolutionLabel(video.width, video.height);

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[styles.gridContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={onPress}
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
      style={[styles.listContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
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

      {onFavoriteToggle && (
        <TouchableOpacity style={styles.favButton} onPress={onFavoriteToggle}>
          <Svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={video.isFavorite ? theme.colors.accent : 'none'}
            stroke={video.isFavorite ? theme.colors.accent : theme.colors.textMuted}
            strokeWidth="2"
          >
            <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </Svg>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Grid layout styles
  gridContainer: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridThumbnail: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gridInfo: {
    padding: 10,
  },

  // List layout styles
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  listThumbnail: {
    width: 90,
    height: 60,
    borderRadius: 8,
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
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subText: {
    fontSize: 12,
  },
  dot: {
    marginHorizontal: 5,
    fontSize: 12,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  inlineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  favButton: {
    padding: 8,
  },
});
