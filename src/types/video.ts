export interface VideoItem {
  id: string;
  uri: string;
  path: string;
  filename: string;
  size: number; // in bytes
  duration: number; // in milliseconds
  width: number;
  height: number;
  mimeType: string;
  dateAdded: number; // timestamp
  dateModified: number; // timestamp
  folder: string;
  lastPosition?: number; // playback resume position in seconds
  completed?: boolean;
  isFavorite?: boolean;
  thumbnailUri?: string;
  videoCodec?: string;
  audioCodec?: string;
  fps?: number;
  bitrate?: number;
}

export interface FolderItem {
  name: string;
  path: string;
  videoCount: number;
  totalSize: number;
}

export interface ScanProgressPayload {
  scanned: number;
  total: number;
}

export type SortField = 'name' | 'date' | 'duration' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
}

export interface VideoFilter {
  searchQuery: string;
  folder?: string;
  resolutionFilter?: 'ALL' | '4K' | '1080p' | '720p' | 'SD';
  extensionFilter?: string;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  videoCount: number;
  videoIds: string[];
}

export interface PlaybackHistoryItem {
  videoId: string;
  lastPosition: number; // seconds
  duration: number; // seconds
  lastPlayedAt: number;
  completed: boolean;
}
