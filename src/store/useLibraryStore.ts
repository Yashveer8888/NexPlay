import { create } from 'zustand';
import { VideoItem, FolderItem, SortOption } from '../types/video';
import { NexPlayScanner } from '../services/native/NexPlayScanner';
import { ThumbnailService } from '../services/native/NexPlayThumbnail';
import {
  initDatabase,
  getAllSavedVideos,
  syncScannedVideosToDb,
  updateVideoPlaybackState,
  updateVideoThumbnail,
  getVaultPin,
  setVaultPin,
  saveVideosToVaultDb,
  removeVideosFromVaultDb,
  getAllVaultVideos,
  deleteVideosFromDb,
  deleteFoldersFromDb,
} from '../services/database/db';
import { FileManagerService, VaultVideoItem } from '../services/native/NexPlayFileManager';

export interface VaultProgress {
  current: number;
  total: number;
  filename: string;
}

export interface VaultTaskState {
  isActive: boolean;
  type: 'move' | 'restore';
  current: number;
  total: number;
  filename: string;
  isComplete: boolean;
  message: string;
}

interface LibraryStoreState {
  videos: VideoItem[];
  folders: FolderItem[];
  recentVideos: VideoItem[];
  favorites: VideoItem[];
  isScanning: boolean;
  scannedCount: number;
  totalCount: number;
  viewMode: 'grid' | 'list';
  searchQuery: string;
  sortOption: SortOption;
  isDbReady: boolean;
  vaultVideos: VaultVideoItem[];
  vaultPin: string | null;
  vaultTask: VaultTaskState | null;
  
  // Actions
  initStore: () => Promise<void>;
  scanLibrary: () => Promise<void>;
  generateMissingThumbnails: (videoList: VideoItem[]) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSortOption: (option: SortOption) => void;
  toggleViewMode: () => void;
  toggleFavorite: (videoId: string) => void;
  updatePlaybackPosition: (videoId: string, positionMs: number, durationMs: number) => Promise<void>;
  getFilteredVideos: () => VideoItem[];
  dismissVaultTask: () => void;
  
  // Vault & File Management Actions
  loadVault: () => Promise<void>;
  setVaultPinAction: (pin: string) => Promise<void>;
  deleteVideosPermanently: (videoIds: string[]) => Promise<{ deletedCount: number; failedCount: number }>;
  deleteFoldersPermanently: (folderNames: string[]) => Promise<{ deletedFilesCount: number }>;
  moveVideosToVault: (videoIds: string[]) => Promise<number>;
  moveFoldersToVault: (folderNames: string[]) => Promise<number>;
  restoreVideosFromVault: (vaultItemIds: string[]) => Promise<number>;
  deleteFromVaultPermanently: (vaultItemIds: string[]) => Promise<number>;
}

const computeFoldersFromVideos = (videoList: VideoItem[]): FolderItem[] => {
  const folderMap = new Map<string, { count: number; size: number; path: string }>();
  videoList.forEach((video) => {
    const folderName = video.folder || 'Internal Storage';
    const existing = folderMap.get(folderName) || { count: 0, size: 0, path: video.path };
    folderMap.set(folderName, {
      count: existing.count + 1,
      size: existing.size + video.size,
      path: video.path,
    });
  });

  return Array.from(folderMap.entries()).map(([name, info]) => ({
    name,
    path: info.path,
    videoCount: info.count,
    totalSize: info.size,
  }));
};

export const useLibraryStore = create<LibraryStoreState>((set, get) => ({
  videos: [],
  folders: [],
  recentVideos: [],
  favorites: [],
  isScanning: false,
  scannedCount: 0,
  totalCount: 0,
  viewMode: 'list',
  searchQuery: '',
  sortOption: { field: 'date', order: 'desc' },
  isDbReady: false,
  vaultVideos: [],
  vaultPin: null,
  vaultTask: null,
  dismissVaultTask: () => set({ vaultTask: null }),

  initStore: async () => {
    try {
      await initDatabase();
      set({ isDbReady: true });
      const savedVideos = await getAllSavedVideos();
      if (savedVideos.length > 0) {
        const folderMap = new Map<string, { count: number; size: number; path: string }>();
        savedVideos.forEach((video) => {
          const folderName = video.folder || 'Internal Storage';
          const existing = folderMap.get(folderName) || { count: 0, size: 0, path: video.path };
          folderMap.set(folderName, {
            count: existing.count + 1,
            size: existing.size + video.size,
            path: video.path,
          });
        });

        const folderList: FolderItem[] = Array.from(folderMap.entries()).map(([name, info]) => ({
          name,
          path: info.path,
          videoCount: info.count,
          totalSize: info.size,
        }));

        const sortedRecent = [...savedVideos]
          .filter((v) => (v.lastPlayedAt || 0) > 0)
          .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
          .slice(0, 10);

        set({
          videos: savedVideos,
          folders: folderList,
          recentVideos: sortedRecent.length > 0 ? sortedRecent : savedVideos.slice(0, 10),
        });
      }
    } catch (e) {
      console.warn('Failed initializing SQLite library store:', e);
    }
  },

  scanLibrary: async () => {
    set({ isScanning: true, scannedCount: 0, totalCount: 0 });

    const progressSub = NexPlayScanner.onScanProgress(({ scanned, total }) => {
      set({ scannedCount: scanned, totalCount: total });
    });

    try {
      const scannedVideos = await NexPlayScanner.scanMediaLibrary();

      // Sync scanned videos to SQLite
      if (get().isDbReady) {
        await syncScannedVideosToDb(scannedVideos);
      }

      // Aggregate folders from scanned videos
      const folderMap = new Map<string, { count: number; size: number; path: string }>();
      
      scannedVideos.forEach((video) => {
        const folderName = video.folder || 'Internal Storage';
        const existing = folderMap.get(folderName) || { count: 0, size: 0, path: video.path };
        folderMap.set(folderName, {
          count: existing.count + 1,
          size: existing.size + video.size,
          path: video.path,
        });
      });

      const folderList: FolderItem[] = Array.from(folderMap.entries()).map(
        ([name, info]) => ({
          name,
          path: info.path,
          videoCount: info.count,
          totalSize: info.size,
        })
      );

      // Sort recent videos by date modified
      const sortedRecent = [...scannedVideos].sort(
        (a, b) => b.dateModified - a.dateModified
      ).slice(0, 10);

      set({
        videos: scannedVideos,
        folders: folderList,
        recentVideos: sortedRecent,
        isScanning: false,
      });

      // Background thumbnail extraction
      get().generateMissingThumbnails(scannedVideos);
    } catch (e) {
      console.error('Failed scanning video library:', e);
      set({ isScanning: false });
    } finally {
      progressSub?.remove();
    }
  },

  generateMissingThumbnails: async (videoList: VideoItem[]) => {
    const missing = videoList.filter((v) => !v.thumbnailUri);
    if (missing.length === 0) return;

    for (const video of missing) {
      try {
        const thumbUri = await ThumbnailService.generateThumbnail(video.path || video.uri);
        if (thumbUri) {
          if (get().isDbReady) {
            await updateVideoThumbnail(video.id, thumbUri);
          }
          set((state) => ({
            videos: state.videos.map((v) =>
              v.id === video.id ? { ...v, thumbnailUri: thumbUri } : v
            ),
          }));
        }
      } catch (e) {
        // Continue processing remaining thumbnails silently
      }
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  
  setSortOption: (option: SortOption) => set({ sortOption: option }),
  
  toggleViewMode: () =>
    set((state) => ({ viewMode: state.viewMode === 'list' ? 'grid' : 'list' })),

  toggleFavorite: (videoId: string) => {
    set((state) => {
      const updatedVideos = state.videos.map((v) =>
        v.id === videoId ? { ...v, isFavorite: !v.isFavorite } : v
      );
      const updatedFavs = updatedVideos.filter((v) => v.isFavorite);
      return { videos: updatedVideos, favorites: updatedFavs };
    });
  },

  updatePlaybackPosition: async (videoId: string, positionMs: number, durationMs: number) => {
    if (get().isDbReady) {
      await updateVideoPlaybackState(videoId, positionMs, durationMs);
    }
    set((state) => {
      const now = Date.now();
      const updatedVideos = state.videos.map((v) =>
        v.id === videoId ? { ...v, lastPosition: positionMs, lastPlayedAt: now } : v
      );
      const sortedRecent = [...updatedVideos]
        .filter((v) => (v.lastPlayedAt || 0) > 0)
        .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
      return {
        videos: updatedVideos,
        recentVideos: sortedRecent.length > 0 ? sortedRecent : state.recentVideos,
      };
    });
  },

  getFilteredVideos: () => {
    const { videos, searchQuery, sortOption } = get();

    let filtered = videos;
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (v) =>
          v.filename.toLowerCase().includes(query) ||
          v.folder.toLowerCase().includes(query) ||
          (v.mimeType && v.mimeType.toLowerCase().includes(query))
      );
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortOption.field === 'name') {
        comparison = a.filename.localeCompare(b.filename);
      } else if (sortOption.field === 'date') {
        comparison = a.dateModified - b.dateModified;
      } else if (sortOption.field === 'duration') {
        comparison = a.duration - b.duration;
      } else if (sortOption.field === 'size') {
        comparison = a.size - b.size;
      }
      return sortOption.order === 'desc' ? -comparison : comparison;
    });
  },

  deleteVideosPermanently: async (videoIds: string[]) => {
    const currentVideos = get().videos;
    const targets = currentVideos.filter((v) => videoIds.includes(v.id));
    const paths = targets.map((v) => v.path);

    const result = await FileManagerService.deleteFiles(paths);
    await deleteVideosFromDb(videoIds);

    const remainingVideos = currentVideos.filter((v) => !videoIds.includes(v.id));
    const updatedFolders = computeFoldersFromVideos(remainingVideos);
    const updatedRecent = get().recentVideos.filter((v) => !videoIds.includes(v.id));

    set({
      videos: remainingVideos,
      folders: updatedFolders,
      recentVideos: updatedRecent,
    });

    return result;
  },

  deleteFoldersPermanently: async (folderNames: string[]) => {
    const currentVideos = get().videos;
    const targetVideos = currentVideos.filter((v) => folderNames.includes(v.folder));
    const targetPaths = targetVideos.map((v) => v.path);

    const folderDirs = Array.from(
      new Set(
        targetVideos.map((v) => {
          const idx = v.path.lastIndexOf('/');
          return idx > 0 ? v.path.substring(0, idx) : '';
        })
      )
    ).filter(Boolean);

    await FileManagerService.deleteFiles(targetPaths);
    if (folderDirs.length > 0) {
      await FileManagerService.deleteFolders(folderDirs);
    }
    await deleteFoldersFromDb(folderNames);

    const remainingVideos = currentVideos.filter((v) => !folderNames.includes(v.folder));
    const updatedFolders = computeFoldersFromVideos(remainingVideos);
    const updatedRecent = get().recentVideos.filter((v) => !folderNames.includes(v.folder));

    set({
      videos: remainingVideos,
      folders: updatedFolders,
      recentVideos: updatedRecent,
    });

    return { deletedFilesCount: targetVideos.length };
  },

  moveVideosToVault: async (videoIds: string[]) => {
    const currentVideos = get().videos;
    const targets = currentVideos.filter((v) => videoIds.includes(v.id));
    if (targets.length === 0) return 0;

    // Show floating real-time task pill immediately
    set({
      vaultTask: {
        isActive: true,
        type: 'move',
        current: 0,
        total: targets.length,
        filename: targets[0].filename,
        isComplete: false,
        message: `Moving 0 / ${targets.length} to Vault...`,
      },
    });

    const allVaultItems: VaultVideoItem[] = [];
    const allMovedIds: string[] = [];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      set((state) => ({
        vaultTask: state.vaultTask
          ? {
              ...state.vaultTask,
              current: i + 1,
              filename: target.filename,
              message: `Moving ${i + 1} / ${targets.length} to Vault...`,
            }
          : null,
      }));

      try {
        const result = await FileManagerService.moveToVault([target]);
        if (result && result.length > 0) {
          allVaultItems.push(...result);
          allMovedIds.push(target.id);

          // Optimistically remove each video from library in real-time as it moves!
          set((state) => {
            const nextVideos = state.videos.filter((v) => v.id !== target.id);
            return {
              videos: nextVideos,
              folders: computeFoldersFromVideos(nextVideos),
              recentVideos: state.recentVideos.filter((v) => v.id !== target.id),
            };
          });
        }
      } catch (err) {
        console.warn(`Failed moving ${target.filename}:`, err);
      }

      if (targets.length > 1 && i < targets.length - 1) {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 40);
        });
      }
    }

    if (allVaultItems.length > 0) {
      await saveVideosToVaultDb(allVaultItems);
      set((state) => ({
        vaultVideos: [...allVaultItems, ...state.vaultVideos],
      }));
    }

    // Mark completed with green checkmark
    set((state) => ({
      vaultTask: state.vaultTask
        ? {
            ...state.vaultTask,
            isActive: false,
            isComplete: true,
            current: targets.length,
            message: `✓ ${allMovedIds.length} video(s) moved to Private Vault`,
          }
        : null,
    }));

    setTimeout(() => {
      set((state) => (state.vaultTask?.isComplete ? { vaultTask: null } : {}));
    }, 2500);

    return allMovedIds.length;
  },

  moveFoldersToVault: async (folderNames: string[]) => {
    const currentVideos = get().videos;
    const matchingVideos = currentVideos.filter((v) => folderNames.includes(v.folder));
    const matchingIds = matchingVideos.map((v) => v.id);
    if (matchingIds.length === 0) return 0;
    return await get().moveVideosToVault(matchingIds);
  },

  loadVault: async () => {
    try {
      const pin = await getVaultPin();
      const vaultVids = await getAllVaultVideos();
      set({ vaultPin: pin, vaultVideos: vaultVids });
    } catch (e) {
      console.warn('Failed loading vault data:', e);
    }
  },

  setVaultPinAction: async (pin: string) => {
    await setVaultPin(pin);
    set({ vaultPin: pin });
  },

  restoreVideosFromVault: async (vaultItemIds: string[]) => {
    const currentVault = get().vaultVideos;
    const targets = currentVault.filter((v) => vaultItemIds.includes(v.id));
    if (targets.length === 0) return 0;

    // Show floating real-time task pill immediately
    set({
      vaultTask: {
        isActive: true,
        type: 'restore',
        current: 0,
        total: targets.length,
        filename: targets[0].filename,
        isComplete: false,
        message: `Restoring 0 / ${targets.length}...`,
      },
    });

    const allRestoredIds: string[] = [];
    const restoredVideoObjects: VideoItem[] = [];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      set((state) => ({
        vaultTask: state.vaultTask
          ? {
              ...state.vaultTask,
              current: i + 1,
              filename: target.filename,
              message: `Restoring ${i + 1} / ${targets.length}...`,
            }
          : null,
      }));

      try {
        const restored = await FileManagerService.restoreFromVault([
          { id: target.id, vaultPath: target.vaultPath, originalPath: target.originalPath },
        ]);

        if (restored && restored.length > 0) {
          allRestoredIds.push(target.id);
          const restoredItem: VideoItem = {
            id: target.id,
            uri: `file://${target.originalPath}`,
            path: target.originalPath,
            filename: target.filename,
            size: target.size,
            duration: target.duration,
            width: target.width,
            height: target.height,
            mimeType: target.mimeType,
            folder: target.originalFolder,
            dateAdded: target.dateAdded,
            dateModified: Date.now(),
            thumbnailUri: target.thumbnailUri,
            completed: false,
            lastPosition: 0,
            lastPlayedAt: 0,
            playCount: 0,
          };
          restoredVideoObjects.push(restoredItem);

          // Optimistically remove from vault and add to library as it restores!
          set((state) => {
            const nextVault = state.vaultVideos.filter((v) => v.id !== target.id);
            const nextVideos = [restoredItem, ...state.videos.filter((v) => v.id !== target.id)];
            return {
              vaultVideos: nextVault,
              videos: nextVideos,
              folders: computeFoldersFromVideos(nextVideos),
            };
          });
        }
      } catch (err) {
        console.warn(`Failed restoring ${target.filename}:`, err);
      }

      if (targets.length > 1 && i < targets.length - 1) {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 40);
        });
      }
    }

    if (allRestoredIds.length > 0) {
      await removeVideosFromVaultDb(allRestoredIds);
      if (get().isDbReady && restoredVideoObjects.length > 0) {
        syncScannedVideosToDb(restoredVideoObjects).catch(console.warn);
      }
    }

    // Mark complete with green checkmark
    set((state) => ({
      vaultTask: state.vaultTask
        ? {
            ...state.vaultTask,
            isActive: false,
            isComplete: true,
            current: targets.length,
            message: `✓ ${allRestoredIds.length} video(s) restored to original location`,
          }
        : null,
    }));

    setTimeout(() => {
      set((state) => (state.vaultTask?.isComplete ? { vaultTask: null } : {}));
    }, 2500);

    return allRestoredIds.length;
  },

  deleteFromVaultPermanently: async (vaultItemIds: string[]) => {
    const currentVault = get().vaultVideos;
    const targets = currentVault.filter((v) => vaultItemIds.includes(v.id));
    if (targets.length === 0) return 0;

    const vaultPaths = targets.map((t) => t.vaultPath);
    await FileManagerService.deleteFromVault(vaultPaths);
    await removeVideosFromVaultDb(vaultItemIds);

    const remainingVault = currentVault.filter((v) => !vaultItemIds.includes(v.id));
    set({ vaultVideos: remainingVault });
    return targets.length;
  },
}));

