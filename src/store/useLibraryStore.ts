import { create } from 'zustand';
import { VideoItem, FolderItem, SortOption, VideoFilter } from '../types/video';
import { NexPlayScanner } from '../services/native/NexPlayScanner';

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
  
  // Actions
  scanLibrary: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSortOption: (option: SortOption) => void;
  toggleViewMode: () => void;
  toggleFavorite: (videoId: string) => void;
  updatePlaybackPosition: (videoId: string, positionSeconds: number) => void;
  getFilteredVideos: () => VideoItem[];
}

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

  scanLibrary: async () => {
    set({ isScanning: true, scannedCount: 0, totalCount: 0 });

    const progressSub = NexPlayScanner.onScanProgress(({ scanned, total }) => {
      set({ scannedCount: scanned, totalCount: total });
    });

    try {
      const scannedVideos = await NexPlayScanner.scanMediaLibrary();

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
    } catch (e) {
      console.error('Failed scanning video library:', e);
      set({ isScanning: false });
    } finally {
      progressSub?.remove();
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

  updatePlaybackPosition: (videoId: string, positionSeconds: number) => {
    set((state) => {
      const updatedVideos = state.videos.map((v) =>
        v.id === videoId ? { ...v, lastPosition: positionSeconds } : v
      );
      return { videos: updatedVideos };
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
}));
