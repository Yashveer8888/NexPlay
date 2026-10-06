import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  BackHandler,
  ToastAndroid,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useThemeStore } from '../../store/useThemeStore';
import { VideoCard } from '../../components/common/VideoCard';
import { ScanProgressBar } from '../../components/common/ScanProgressBar';
import { VideoItem, FolderItem } from '../../types/video';
import { FileManagerService } from '../../services/native/NexPlayFileManager';
import { VaultProgressPill } from '../../components/common/VaultProgressPill';

interface MediaFoldersScreenProps {
  navigation: any;
}

const formatSize = (bytes: number): string => {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const MediaFoldersScreen: React.FC<MediaFoldersScreenProps> = ({ navigation }) => {
  const theme = useThemeStore((state) => state.theme);
  const {
    videos,
    folders,
    recentVideos,
    isScanning,
    scannedCount,
    totalCount,
    scanLibrary,
    searchQuery,
    setSearchQuery,
    viewMode,
    toggleViewMode,
    deleteVideosPermanently,
    deleteFoldersPermanently,
    moveVideosToVault,
    moveFoldersToVault,
  } = useLibraryStore();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [browseMode, setBrowseMode] = useState<'folders' | 'all'>('folders');

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [selectedFolderNames, setSelectedFolderNames] = useState<string[]>([]);

  // Exit selection mode helper
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedVideoIds([]);
    setSelectedFolderNames([]);
  };

  // Hardware back button handler
  useEffect(() => {
    const backAction = () => {
      if (isSelectionMode) {
        exitSelectionMode();
        return true;
      }
      if (selectedFolder) {
        setSelectedFolder(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isSelectionMode, selectedFolder]);

  // When switching modes or folder, clear selection
  const handleTabChange = (mode: 'folders' | 'all') => {
    exitSelectionMode();
    setBrowseMode(mode);
    if (mode === 'all') {
      setSelectedFolder(null);
    }
  };

  // Most recent video for quick play button
  const mostRecentVideo = useMemo(() => {
    if (recentVideos && recentVideos.length > 0) return recentVideos[0];
    const withHistory = videos.filter((v) => (v.lastPlayedAt || 0) > 0 || (v.lastPosition || 0) > 0);
    if (withHistory.length > 0) {
      return [...withHistory].sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))[0];
    }
    return videos[0] || null;
  }, [recentVideos, videos]);

  const handlePlayRecent = () => {
    if (mostRecentVideo) {
      navigation.navigate('Player', { video: mostRecentVideo });
    }
  };

  // Filtered videos based on search and selected folder
  const displayedVideos = useMemo(() => {
    let result = videos;

    if (selectedFolder && browseMode === 'folders') {
      result = result.filter(
        (v) => (v.folder || 'Internal Storage').toLowerCase() === selectedFolder.toLowerCase()
      );
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.filename.toLowerCase().includes(q) ||
          v.folder.toLowerCase().includes(q) ||
          (v.mimeType && v.mimeType.toLowerCase().includes(q))
      );
    }

    return result;
  }, [videos, selectedFolder, browseMode, searchQuery]);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 0) + 0;

  const handlePlayVideo = (video: VideoItem) => {
    navigation.navigate('Player', { video });
  };

  // Selection handlers for folders
  const handleFolderPress = (folderName: string) => {
    if (isSelectionMode) {
      toggleFolderSelection(folderName);
    } else {
      setSelectedFolder(folderName);
    }
  };

  const handleFolderLongPress = (folderName: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedFolderNames([folderName]);
    } else {
      toggleFolderSelection(folderName);
    }
  };

  const toggleFolderSelection = (folderName: string) => {
    setSelectedFolderNames((prev) => {
      const next = prev.includes(folderName)
        ? prev.filter((f) => f !== folderName)
        : [...prev, folderName];
      if (next.length === 0) setIsSelectionMode(false);
      return next;
    });
  };

  // Selection handlers for videos
  const handleVideoPress = (video: VideoItem) => {
    if (isSelectionMode) {
      toggleVideoSelection(video.id);
    } else {
      handlePlayVideo(video);
    }
  };

  const handleVideoLongPress = (video: VideoItem) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedVideoIds([video.id]);
    } else {
      toggleVideoSelection(video.id);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) => {
      const next = prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId];
      if (next.length === 0) setIsSelectionMode(false);
      return next;
    });
  };

  // Toggle select all
  const isAllSelected = useMemo(() => {
    if (browseMode === 'folders' && !selectedFolder) {
      return folders.length > 0 && selectedFolderNames.length === folders.length;
    }
    return displayedVideos.length > 0 && selectedVideoIds.length === displayedVideos.length;
  }, [browseMode, selectedFolder, folders, selectedFolderNames, displayedVideos, selectedVideoIds]);

  const handleToggleSelectAll = () => {
    if (browseMode === 'folders' && !selectedFolder) {
      if (isAllSelected) {
        setSelectedFolderNames([]);
        setIsSelectionMode(false);
      } else {
        setSelectedFolderNames(folders.map((f) => f.name));
      }
    } else {
      if (isAllSelected) {
        setSelectedVideoIds([]);
        setIsSelectionMode(false);
      } else {
        setSelectedVideoIds(displayedVideos.map((v) => v.id));
      }
    }
  };

  // Permission check helper
  const ensureStoragePermission = async (): Promise<boolean> => {
    try {
      const hasPerm = await FileManagerService.checkAllFilesPermission();
      if (hasPerm) return true;

      return new Promise((resolve) => {
        Alert.alert(
          'Permission Required',
          'Videos ko private vault me move karne aur phone ki gallery/dusre apps se hatane ke liye "All Files Access" permission zaroori hai. Kripya Settings me jakar NexPlay ko allow karein.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Open Settings',
              onPress: async () => {
                await FileManagerService.requestAllFilesPermission();
                resolve(false);
              },
            },
          ]
        );
      });
    } catch {
      return true;
    }
  };

  // Delete action (Req 1, 2, 3)
  const handleDeleteSelected = async () => {
    const hasPerm = await ensureStoragePermission();
    if (!hasPerm) return;

    if (browseMode === 'folders' && !selectedFolder) {
      if (selectedFolderNames.length === 0) return;
      Alert.alert(
        'Delete Folders Permanently',
        `Permanently delete ${selectedFolderNames.length} folder(s) and all videos inside? They will be removed completely from device storage.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteFoldersPermanently(selectedFolderNames);
                exitSelectionMode();
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Failed to delete folders');
              }
            },
          },
        ]
      );
    } else {
      if (selectedVideoIds.length === 0) return;
      Alert.alert(
        'Delete Videos Permanently',
        `Permanently delete ${selectedVideoIds.length} video(s) from device storage? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteVideosPermanently(selectedVideoIds);
                exitSelectionMode();
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Failed to delete videos');
              }
            },
          },
        ]
      );
    }
  };

  // Move to Private Vault action (Zero Delay - MicroSecond Execution)
  const handleMoveToVaultSelected = async () => {
    const hasPerm = await ensureStoragePermission();
    if (!hasPerm) return;

    if (browseMode === 'folders' && !selectedFolder) {
      if (selectedFolderNames.length === 0) return;
      const matchingVideos = videos.filter((v) => selectedFolderNames.includes(v.folder));
      if (matchingVideos.length === 0) return;
      const count = matchingVideos.length;

      exitSelectionMode();
      moveFoldersToVault(selectedFolderNames);
      ToastAndroid.show(`${count} video(s) moved to Private Vault`, ToastAndroid.SHORT);
    } else {
      if (selectedVideoIds.length === 0) return;
      const count = selectedVideoIds.length;
      const ids = [...selectedVideoIds];

      exitSelectionMode();
      moveVideosToVault(ids);
      ToastAndroid.show(`${count} video(s) moved to Private Vault`, ToastAndroid.SHORT);
    }
  };

  const selectedCount =
    browseMode === 'folders' && !selectedFolder
      ? selectedFolderNames.length
      : selectedVideoIds.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        {isSelectionMode ? (
          /* SELECTION MODE HEADER (Req 4) */
          <View style={styles.selectionHeaderRow}>
            <View style={styles.selectionLeft}>
              <TouchableOpacity style={styles.selectionCloseBtn} onPress={exitSelectionMode}>
                <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2.5">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </TouchableOpacity>
              <Text style={[styles.selectionCountText, { color: theme.colors.textPrimary }]}>
                {selectedCount} Selected
              </Text>
            </View>

            <View style={styles.selectionActions}>
              {/* Select All Toggle */}
              <TouchableOpacity
                style={[styles.selectionActionBtn, { backgroundColor: theme.colors.surfaceLight }]}
                onPress={handleToggleSelectAll}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2">
                  <Path d="M9 11l3 3L22 4" />
                  <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </Svg>
              </TouchableOpacity>

              {/* Move to Private Vault Button (Req 4 & 6) */}
              <TouchableOpacity
                style={[styles.selectionActionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B', borderWidth: 1 }]}
                onPress={handleMoveToVaultSelected}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2">
                  <Path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </Svg>
              </TouchableOpacity>

              {/* Delete Permanently Button (Req 1, 2, 3, 4) */}
              <TouchableOpacity
                style={[styles.selectionActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444', borderWidth: 1 }]}
                onPress={handleDeleteSelected}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2">
                  <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* NORMAL HEADER */
          <View style={styles.headerTopRow}>
            <View>
              <Text style={[styles.appTitle, { color: theme.colors.textPrimary }]}>NexPlay</Text>
              <Text style={[styles.appSub, { color: theme.colors.textMuted }]}>
                {videos.length} Videos • {folders.length} Folders
              </Text>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceLight }]}
                onPress={toggleViewMode}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2">
                  {viewMode === 'list' ? (
                    <Path d="M3 3h7v7H3zm11 0h7v7h-7zm0 11h7v7h-7zm-11 0h7v7H3z" />
                  ) : (
                    <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  )}
                </Svg>
              </TouchableOpacity>

              {/* Scan Button */}
              <TouchableOpacity
                style={[styles.rescanBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => scanLibrary()}
                disabled={isScanning}
              >
                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.2">
                  <Path d="M23 4v6h-6M1 20v-6h6" />
                  <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </Svg>
                <Text style={styles.rescanText}>Scan</Text>
              </TouchableOpacity>

              {/* Private Folder Vault Button (Req 5) */}
              <TouchableOpacity
                style={[styles.vaultHeaderBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', borderWidth: 1 }]}
                onPress={() => navigation.navigate('PrivateVault')}
                activeOpacity={0.8}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2">
                  <Path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search Bar */}
        {!isSelectionMode && (
          <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2">
              <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </Svg>
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder="Search videos or folders..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Mode Selector Tabs (Folders vs All Videos) */}
        {!isSelectionMode && (
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                browseMode === 'folders' && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => handleTabChange('folders')}
            >
              <Text
                style={[
                  styles.modeTabText,
                  { color: browseMode === 'folders' ? '#FFF' : theme.colors.textMuted },
                ]}
              >
                📁 Folders ({folders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                browseMode === 'all' && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => handleTabChange('all')}
            >
              <Text
                style={[
                  styles.modeTabText,
                  { color: browseMode === 'all' ? '#FFF' : theme.colors.textMuted },
                ]}
              >
                🎬 All Videos ({videos.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Scanning Progress */}
      {isScanning && <ScanProgressBar scanned={scannedCount} total={totalCount} />}

      {/* Main Content Area */}
      {browseMode === 'folders' && !selectedFolder ? (
        /* FOLDERS LIST */
        <FlatList
          data={folders}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => {
            const isFolderSelected = selectedFolderNames.includes(item.name);
            return (
              <TouchableOpacity
                style={[
                  styles.folderItem,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: isFolderSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => handleFolderPress(item.name)}
                onLongPress={() => handleFolderLongPress(item.name)}
                activeOpacity={0.8}
              >
                {isSelectionMode && (
                  <View
                    style={[
                      styles.folderCheckbox,
                      {
                        borderColor: isFolderSelected ? theme.colors.primary : theme.colors.textMuted,
                        backgroundColor: isFolderSelected ? theme.colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isFolderSelected && (
                      <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3">
                        <Path d="M5 13l4 4L19 7" />
                      </Svg>
                    )}
                  </View>
                )}

                <View style={[styles.folderIconBox, { backgroundColor: theme.colors.surfaceLight }]}>
                  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
                    <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </Svg>
                </View>

                <View style={styles.folderTextContainer}>
                  <Text style={[styles.folderTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.folderSub, { color: theme.colors.textMuted }]}>
                    {item.videoCount} {item.videoCount === 1 ? 'video' : 'videos'} • {formatSize(item.totalSize)}
                  </Text>
                </View>

                {!isSelectionMode && (
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2">
                    <Path d="M9 18l6-6-6-6" />
                  </Svg>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyLabel, { color: theme.colors.textMuted }]}>
                {isScanning ? 'Scanning device for videos...' : 'No video folders found.'}
              </Text>
            </View>
          }
        />
      ) : (
        /* VIDEOS INSIDE FOLDER OR ALL VIDEOS */
        <View style={{ flex: 1 }}>
          {selectedFolder && browseMode === 'folders' && (
            <View style={[styles.folderBreadcrumb, { backgroundColor: theme.colors.surfaceLight }]}>
              <TouchableOpacity
                style={styles.backToFoldersBtn}
                onPress={() => {
                  exitSelectionMode();
                  setSelectedFolder(null);
                }}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2.2">
                  <Path d="M19 12H5M12 19l-7-7 7-7" />
                </Svg>
                <Text style={[styles.backToFoldersText, { color: theme.colors.primary }]}>Folders</Text>
              </TouchableOpacity>
              <Text style={[styles.breadcrumbDivider, { color: theme.colors.textMuted }]}>/</Text>
              <Text style={[styles.currentFolderText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {selectedFolder} ({displayedVideos.length})
              </Text>
            </View>
          )}

          <FlatList
            key={viewMode}
            data={displayedVideos}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            contentContainerStyle={styles.listPadding}
            renderItem={({ item }) => (
              <VideoCard
                video={item}
                viewMode={viewMode}
                isSelectionMode={isSelectionMode}
                isSelected={selectedVideoIds.includes(item.id)}
                onPress={() => handleVideoPress(item)}
                onLongPress={() => handleVideoLongPress(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyLabel, { color: theme.colors.textMuted }]}>
                  No videos found in this folder.
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* FLOATING ACTION PLAY BUTTON (BOTTOM RIGHT FOR RECENT VIDEO - CIRCLE) */}
      {!isSelectionMode && mostRecentVideo && (
        <TouchableOpacity
          style={[styles.floatingRecentBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handlePlayRecent}
          activeOpacity={0.8}
        >
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="#FFFFFF" style={{ marginLeft: 3 }}>
            <Path d="M8 5v14l11-7z" />
          </Svg>
        </TouchableOpacity>
      )}

      {/* Floating Real-time Vault Progress Pill */}
      <VaultProgressPill />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  rescanText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 0,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listPadding: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 85,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  folderIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  folderSub: {
    fontSize: 12,
  },
  folderBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  backToFoldersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToFoldersText: {
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbDivider: {
    marginHorizontal: 8,
    fontSize: 14,
  },
  currentFolderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyLabel: {
    fontSize: 14,
  },
  floatingRecentBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 99,
  },
  vaultHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  selectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCloseBtn: {
    padding: 6,
    borderRadius: 8,
  },
  selectionCountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectionActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    width: '84%',
    maxWidth: 320,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  counterLarge: {
    fontSize: 26,
    fontWeight: '800',
  },
  percentBadge: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 6,
  },
  subInfoText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  filenameText: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
  },
});
