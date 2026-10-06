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

    // Step 1: Check if already granted
    try {
      const alreadyGranted = await NexPlayScanner.checkStoragePermission();
      if (alreadyGranted) {
        set({ hasPermission: true, permissionState: 'GRANTED', isChecking: false });
        return true;
      }
    } catch (e) {
      // Continue to request
    }

    // Step 2: Try native scanner module permission request (uses PermissionAwareActivity)
    try {
      const nativeGranted = await NexPlayScanner.requestStoragePermission();
      if (nativeGranted) {
        set({
          hasPermission: true,
          permissionState: 'GRANTED',
          isChecking: false,
        });
        return true;
      }
    } catch (e) {
      console.warn('Native requestStoragePermission exception:', e);
    }

    // Step 3: Try React Native PermissionsAndroid request as fallback
    try {
      const apiLevel = Platform.Version as number;
      const permToRequest =
        apiLevel >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const result = await PermissionsAndroid.request(permToRequest, {
        title: 'NexPlay Storage Permission',
        message: 'NexPlay needs access to your local media to play videos offline.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });

      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      set({
        hasPermission: granted,
        permissionState: granted ? 'GRANTED' : 'DENIED',
        isChecking: false,
      });
      return granted;
    } catch (e: any) {
      console.warn('PermissionsAndroid.request failed (activity unattached):', e?.message || e);

      // Step 4: Final verification check
      const finalCheck = await NexPlayScanner.checkStoragePermission();
      set({
        hasPermission: finalCheck,
        permissionState: finalCheck ? 'GRANTED' : 'DENIED',
        isChecking: false,
      });
      return finalCheck;
    }
  },
}));
