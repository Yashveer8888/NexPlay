import { NativeModules, Platform } from 'react-native';

const { NexPlayFileManager } = NativeModules;

export interface VaultVideoItem {
  id: string;
  originalPath: string;
  originalFolder: string;
  vaultPath: string;
  filename: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  mimeType: string;
  dateAdded: number;
  thumbnailUri?: string;
  dateMoved: number;
}

export const FileManagerService = {
  async checkAllFilesPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NexPlayFileManager?.checkAllFilesPermission) return true;
    try {
      return await NexPlayFileManager.checkAllFilesPermission();
    } catch {
      return true;
    }
  },

  async requestAllFilesPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NexPlayFileManager?.requestAllFilesPermission) return true;
    try {
      return await NexPlayFileManager.requestAllFilesPermission();
    } catch {
      return true;
    }
  },

  async deleteFiles(paths: string[]): Promise<{ deletedCount: number; failedCount: number }> {
    if (Platform.OS !== 'android' || !NexPlayFileManager?.deleteFiles) {
      return { deletedCount: 0, failedCount: 0 };
    }
    return await NexPlayFileManager.deleteFiles(paths);
  },

  async deleteFolders(folderPaths: string[]): Promise<{ deletedFilesCount: number }> {
    if (Platform.OS !== 'android' || !NexPlayFileManager?.deleteFolders) {
      return { deletedFilesCount: 0 };
    }
    return await NexPlayFileManager.deleteFolders(folderPaths);
  },

  async moveToVault(videos: Array<{
    id: string;
    path: string;
    filename: string;
    folder: string;
    size: number;
    duration: number;
    width: number;
    height: number;
    mimeType: string;
    dateAdded: number;
    thumbnailUri?: string;
  }>): Promise<VaultVideoItem[]> {
    if (Platform.OS !== 'android' || !NexPlayFileManager?.moveToVault) {
      return [];
    }
    return await NexPlayFileManager.moveToVault(videos);
  },

  async restoreFromVault(items: Array<{ id: string; vaultPath: string; originalPath: string }>): Promise<string[]> {
    if (Platform.OS !== 'android' || !NexPlayFileManager?.restoreFromVault) {
      return [];
    }
    return await NexPlayFileManager.restoreFromVault(items);
  },

  async deleteFromVault(vaultPaths: string[]): Promise<number> {
    if (Platform.OS !== 'android' || !NexPlayFileManager?.deleteFromVault) {
      return 0;
    }
    return await NexPlayFileManager.deleteFromVault(vaultPaths);
  },
};
