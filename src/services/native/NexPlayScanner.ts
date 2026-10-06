import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { VideoItem, ScanProgressPayload } from '../../types/video';

const { NexPlayScanner: NativeScanner } = NativeModules;

export interface NexPlayScannerInterface {
  checkStoragePermission(): Promise<boolean>;
  scanMediaLibrary(): Promise<VideoItem[]>;
}

class NexPlayScannerBridge implements NexPlayScannerInterface {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'android' && NativeScanner) {
      this.eventEmitter = new NativeEventEmitter(NativeScanner);
    }
  }

  async checkStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (!NativeScanner) return false;
    try {
      return await NativeScanner.checkStoragePermission();
    } catch (e) {
      console.warn('[NexPlayScanner] checkStoragePermission failed:', e);
      return false;
    }
  }

  async requestStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (!NativeScanner) return false;
    try {
      return await NativeScanner.requestStoragePermission();
    } catch (e) {
      console.warn('[NexPlayScanner] requestStoragePermission failed:', e);
      return false;
    }
  }

  async scanMediaLibrary(): Promise<VideoItem[]> {
    if (Platform.OS !== 'android') return [];
    if (!NativeScanner) {
      console.warn('[NexPlayScanner] Native module not installed');
      return [];
    }
    try {
      const results: VideoItem[] = await NativeScanner.scanMediaLibrary();
      return results;
    } catch (e) {
      console.error('[NexPlayScanner] scanMediaLibrary failed:', e);
      return [];
    }
  }

  onScanProgress(listener: (data: ScanProgressPayload) => void) {
    if (!this.eventEmitter) return { remove: () => {} };
    const subscription = this.eventEmitter.addListener('onScanProgress', (event: any) => {
      listener(event as ScanProgressPayload);
    });
    return subscription;
  }
}

export const NexPlayScanner = new NexPlayScannerBridge();
