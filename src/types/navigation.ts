import { VideoItem } from './video';

export type RootStackParamList = {
  Splash: undefined;
  FirstRunPermission: undefined;
  MainTabs: undefined;
  Player: { video: VideoItem };
  MediaInfo: { video: VideoItem };
  FolderDetail: { folderName: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  VideosTab: undefined;
  FoldersTab: undefined;
  SettingsTab: undefined;
};
