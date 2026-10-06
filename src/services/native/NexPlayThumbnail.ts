import { NativeModules } from 'react-native';

const { NexPlayThumbnail } = NativeModules;

export interface NexPlayThumbnailInterface {
  generateThumbnail(filePath: string, timeMs?: number): Promise<string | null>;
  generateBatchThumbnails(filePaths: string[]): Promise<Record<string, string>>;
}

export const ThumbnailService: NexPlayThumbnailInterface = {
  generateThumbnail: async (filePath: string, timeMs = 1000): Promise<string | null> => {
    if (!NexPlayThumbnail) {
      console.warn('NexPlayThumbnail native module not found');
      return null;
    }
    return NexPlayThumbnail.generateThumbnail(filePath, timeMs);
  },

  generateBatchThumbnails: async (filePaths: string[]): Promise<Record<string, string>> => {
    if (!NexPlayThumbnail) {
      console.warn('NexPlayThumbnail native module not found');
      return {};
    }
    return NexPlayThumbnail.generateBatchThumbnails(filePaths);
  },
};
