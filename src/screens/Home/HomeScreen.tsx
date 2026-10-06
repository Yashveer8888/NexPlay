import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useThemeStore } from '../../store/useThemeStore';
import { VideoCard } from '../../components/common/VideoCard';
import { ScanProgressBar } from '../../components/common/ScanProgressBar';
import { VideoItem } from '../../types/video';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const theme = useThemeStore((state) => state.theme);
  const {
    videos,
    folders,
    recentVideos,
    isScanning,
    scannedCount,
    totalCount,
    scanLibrary,
    toggleFavorite,
  } = useLibraryStore();

  useEffect(() => {
    if (videos.length === 0 && !isScanning) {
      scanLibrary();
    }
  }, []);

  const totalSizeFormatted = React.useMemo(() => {
    const totalBytes = videos.reduce((acc, curr) => acc + (curr.size || 0), 0);
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (totalBytes === 0) return '0 GB';
    const i = Math.floor(Math.log(totalBytes) / Math.log(k));
    return `${parseFloat((totalBytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, [videos]);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 0) + 12;

  const handlePlayVideo = (video: VideoItem) => {
    navigation.navigate('Player', { video });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: topInset }]}>
      {/* App Header Bar */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>NexPlay</Text>
          <Text style={[styles.brandSub, { color: theme.colors.textMuted }]}>Offline Multimedia Engine</Text>
        </View>
        <TouchableOpacity
          style={[styles.rescanButton, { backgroundColor: theme.colors.surfaceLight }]}
          onPress={() => scanLibrary()}
          disabled={isScanning}
        >
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
            <Path d="M23 4v6h-6M1 20v-6h6" />
            <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </Svg>
          <Text style={[styles.rescanText, { color: theme.colors.primary }]}>Rescan</Text>
        </TouchableOpacity>
      </View>

      {/* Scanning Progress */}
      {isScanning && <ScanProgressBar scanned={scannedCount} total={totalCount} />}

      {/* Library Summary Stats Card */}
      <View style={[styles.statsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>{videos.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Videos</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{folders.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Folders</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.accent }]}>{totalSizeFormatted}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Library Size</Text>
        </View>
      </View>

      {/* Navigation Quick Shortcuts */}
      <View style={styles.shortcutsRow}>
        <TouchableOpacity
          style={[styles.shortcutCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('VideosTab')}
        >
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
            <Path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <Path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </Svg>
          <Text style={[styles.shortcutText, { color: theme.colors.textPrimary }]}>All Videos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('FoldersTab')}
        >
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.secondary} strokeWidth="2">
            <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </Svg>
          <Text style={[styles.shortcutText, { color: theme.colors.textPrimary }]}>Folders</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Videos Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent Media</Text>
        <TouchableOpacity onPress={() => navigation.navigate('VideosTab')}>
          <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All ({videos.length})</Text>
        </TouchableOpacity>
      </View>

      {recentVideos.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {isScanning ? 'Scanning media library...' : 'No video files found on device.'}
          </Text>
        </View>
      ) : (
        <View>
          {recentVideos.slice(0, 5).map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              viewMode="list"
              onPress={() => handlePlayVideo(video)}
            />
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 12,
    marginTop: 2,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  rescanText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
  },
  shortcutsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  shortcutText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    marginHorizontal: 16,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
