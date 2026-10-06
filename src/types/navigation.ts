import { VideoItem } from './video';

export type RootStackParamList = {
  Splash: undefined;
  FirstRunPermission: undefined;
  MainTabs: undefined;
  Player: { video: VideoItem };
  MediaInfo: { video: VideoItem };
  PrivateVault: undefined;
};

export type MainTabParamList = {
  MediaTab: undefined;
  FutureTab: undefined;
};
