import { create } from 'zustand';
import { PermissionsAndroid, Platform } from 'react-native';
import { StoragePermissionState } from '../types/permissions';
import { NexPlayScanner } from '../services/native/NexPlayScanner';

interface PermissionStoreState {
  permissionState: StoragePermissionState;
  hasPermission: boolean;
  isChecking: boolean;
  checkPermissions: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
}

export const usePermissionStore = create<PermissionStoreState>((set, get) => ({
  permissionState: 'UNDETERMINED',
  hasPermission: false,
  isChecking: true,

  checkPermissions: async () => {
    set({ isChecking: true });
    if (Platform.OS !== 'android') {
      set({ hasPermission: true, permissionState: 'GRANTED', isChecking: false });
      return true;
    }

    try {
      const granted = await NexPlayScanner.checkStoragePermission();
      set({
        hasPermission: granted,
        permissionState: granted ? 'GRANTED' : 'DENIED',
        isChecking: false,
      });
      return granted;
    } catch (e) {
      console.warn('Error checking permissions:', e);
      set({ hasPermission: false, permissionState: 'DENIED', isChecking: false });
      return false;
    }
  },

  requestPermissions: async () => {
    if (Platform.OS !== 'android') return true;

    set({ isChecking: true });
    try {
      let granted = false;
      const apiLevel = Platform.Version as number;

      if (apiLevel >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          {
            title: 'NexPlay Video Access',
            message: 'NexPlay needs access to your videos to display your local library offline.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'NexPlay Storage Permission',
            message: 'NexPlay needs access to device storage to discover and play your local videos.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
      }

      set({
        hasPermission: granted,
        permissionState: granted ? 'GRANTED' : 'DENIED',
        isChecking: false,
      });
      return granted;
    } catch (e) {
      console.error('Permission request failed:', e);
      set({ hasPermission: false, permissionState: 'DENIED', isChecking: false });
      return false;
    }
  },
}));
