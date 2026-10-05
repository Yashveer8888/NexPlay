import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Header } from '../../components/common/Header';
import { FolderItem } from '../../types/video';

interface FoldersScreenProps {
  navigation: any;
}

const formatSize = (bytes: number): string => {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const FoldersScreen: React.FC<FoldersScreenProps> = ({ navigation }) => {
  const theme = useThemeStore((state) => state.theme);
  const { folders, setSearchQuery } = useLibraryStore();

  const handleSelectFolder = (folder: FolderItem) => {
    setSearchQuery(folder.name);
    navigation.navigate('VideosTab');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Device Folders" showSearch={false} />

      <FlatList
        data={folders}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.folderCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => handleSelectFolder(item)}
            activeOpacity={0.8}
          >
            <View style={[styles.folderIconContainer, { backgroundColor: theme.colors.surfaceLight }]}>
              <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={theme.colors.secondary} strokeWidth="2">
                <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </Svg>
            </View>

            <View style={styles.folderDetails}>
              <Text style={[styles.folderName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.folderMeta, { color: theme.colors.textMuted }]}>
                {item.videoCount} {item.videoCount === 1 ? 'video' : 'videos'} • {formatSize(item.totalSize)}
              </Text>
            </View>

            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2">
              <Path d="M9 18l6-6-6-6" />
            </Svg>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              No video folders discovered yet.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderDetails: {
    flex: 1,
    marginLeft: 14,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  folderMeta: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
