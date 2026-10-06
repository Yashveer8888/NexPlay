import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Header } from '../../components/common/Header';
import { VideoCard } from '../../components/common/VideoCard';
import { ScanProgressBar } from '../../components/common/ScanProgressBar';
import { SortField, SortOrder, VideoItem } from '../../types/video';

interface AllVideosScreenProps {
  navigation: any;
}

export const AllVideosScreen: React.FC<AllVideosScreenProps> = ({ navigation }) => {
  const theme = useThemeStore((state) => state.theme);
  const {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    viewMode,
    toggleViewMode,
    isScanning,
    scannedCount,
    totalCount,
    scanLibrary,
    getFilteredVideos,
    toggleFavorite,
  } = useLibraryStore();

  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  const filteredVideos = getFilteredVideos();

  const handlePlayVideo = (video: VideoItem) => {
    navigation.navigate('Player', { video });
  };

  const handleSelectSort = (field: SortField) => {
    let order: SortOrder = 'asc';
    if (sortOption.field === field) {
      order = sortOption.order === 'asc' ? 'desc' : 'asc';
    } else {
      order = field === 'date' || field === 'size' || field === 'duration' ? 'desc' : 'asc';
    }
    setSortOption({ field, order });
    setIsSortModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Video Library"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={true}
        viewMode={viewMode}
        onToggleViewMode={toggleViewMode}
        onRefresh={() => scanLibrary()}
      />

      {isScanning && <ScanProgressBar scanned={scannedCount} total={totalCount} />}

      {/* Subheader Toolbar */}
      <View style={styles.toolbar}>
        <Text style={[styles.videoCount, { color: theme.colors.textMuted }]}>
          {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'} found
        </Text>

        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: theme.colors.surfaceLight }]}
          onPress={() => setIsSortModalVisible(true)}
        >
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2">
            <Path d="M3 6h18M6 12h12M9 18h6" />
          </Svg>
          <Text style={[styles.sortText, { color: theme.colors.textPrimary }]}>
            Sort: {sortOption.field.toUpperCase()} ({sortOption.order})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Video List / Grid */}
      <FlatList
        key={viewMode} // Re-render when switching grid/list
        data={filteredVideos}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            viewMode={viewMode}
            onPress={() => handlePlayVideo(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              {searchQuery ? 'No videos matching your query.' : 'No videos found on device storage.'}
            </Text>
          </View>
        }
      />

      {/* Sort Selection Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
          activeOpacity={1}
          onPress={() => setIsSortModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Sort Videos By</Text>
            
            {(['name', 'date', 'size', 'duration'] as SortField[]).map((field) => {
              const isSelected = sortOption.field === field;
              return (
                <TouchableOpacity
                  key={field}
                  style={[
                    styles.sortOptionRow,
                    isSelected && { backgroundColor: theme.colors.surfaceLight },
                  ]}
                  onPress={() => handleSelectSort(field)}
                >
                  <Text style={[styles.sortOptionText, { color: isSelected ? theme.colors.primary : theme.colors.textPrimary }]}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </Text>
                  {isSelected && (
                    <Text style={[styles.sortOrderBadge, { color: theme.colors.primary }]}>
                      {sortOption.order === 'asc' ? '↑ Ascending' : '↓ Descending'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  videoCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  sortOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sortOrderBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
});
