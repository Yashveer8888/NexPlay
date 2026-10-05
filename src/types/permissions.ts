export type StoragePermissionState =
  | 'UNDETERMINED'
  | 'GRANTED'
  | 'DENIED'
  | 'BLOCKED';

export interface PermissionStatus {
  hasStoragePermission: boolean;
  permissionState: StoragePermissionState;
  isFirstRun: boolean;
}
