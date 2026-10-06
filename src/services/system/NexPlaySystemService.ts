import { NativeModules, Platform } from 'react-native';

const { NexPlaySystemModule } = NativeModules;

export interface SystemVolumeInfo {
  volume: number;
  current: number;
  max: number;
}

export const NexPlaySystemService = {
  /**
   * Retrieves the current system media volume ratio (0.0 to 1.0) and indices.
   */
  async getSystemVolume(): Promise<SystemVolumeInfo> {
    if (Platform.OS !== 'android' || !NexPlaySystemModule?.getSystemVolume) {
      return { volume: 1.0, current: 15, max: 15 };
    }
    try {
      const info = await NexPlaySystemModule.getSystemVolume();
      return info;
    } catch (e) {
      console.warn('[NexPlaySystemService] Failed to get system volume:', e);
      return { volume: 1.0, current: 15, max: 15 };
    }
  },

  /**
   * Sets the internal phone media volume (STREAM_MUSIC).
   * @param volumeRatio 0.0 to 1.0
   */
  setSystemVolume(volumeRatio: number): void {
    if (Platform.OS !== 'android' || !NexPlaySystemModule?.setSystemVolume) {
      return;
    }
    NexPlaySystemModule.setSystemVolume(volumeRatio).catch((err: any) => {
      console.warn('[NexPlaySystemService] Failed to set system volume:', err);
    });
  },

  /**
   * Retrieves the current screen brightness (0.01 to 1.0).
   */
  async getScreenBrightness(): Promise<number> {
    if (Platform.OS !== 'android' || !NexPlaySystemModule?.getScreenBrightness) {
      return 0.8;
    }
    try {
      const val = await NexPlaySystemModule.getScreenBrightness();
      return typeof val === 'number' ? val : 0.8;
    } catch (e) {
      console.warn('[NexPlaySystemService] Failed to get screen brightness:', e);
      return 0.8;
    }
  },

  /**
   * Directly sets the phone's hardware screen brightness (via WindowManager).
   * @param brightness 0.01 to 1.0
   */
  setScreenBrightness(brightness: number): void {
    if (Platform.OS !== 'android' || !NexPlaySystemModule?.setScreenBrightness) {
      return;
    }
    NexPlaySystemModule.setScreenBrightness(brightness).catch((err: any) => {
      console.warn('[NexPlaySystemService] Failed to set screen brightness:', err);
    });
  },

  /**
   * Restores system default screen brightness (BRIGHTNESS_OVERRIDE_NONE).
   */
  restoreScreenBrightness(): void {
    if (Platform.OS !== 'android' || !NexPlaySystemModule?.restoreScreenBrightness) {
      return;
    }
    NexPlaySystemModule.restoreScreenBrightness().catch((err: any) => {
      console.warn('[NexPlaySystemService] Failed to restore screen brightness:', err);
    });
  },
};
