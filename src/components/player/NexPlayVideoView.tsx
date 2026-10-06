import React from 'react';
import { requireNativeComponent, ViewProps } from 'react-native';

export interface PlayerStatusEvent {
  position: number; // in milliseconds
  duration: number; // in milliseconds
  bufferedPosition: number; // in milliseconds
  isPlaying: boolean;
  isBuffering: boolean;
  isEnded: boolean;
}

export interface TrackItem {
  id: number;
  index: number;
  label: string;
  language: string;
  mimeType: string;
}

export interface TracksChangedEvent {
  audioTracks: TrackItem[];
  subtitleTracks: TrackItem[];
}

export interface NexPlayVideoViewProps extends ViewProps {
  videoUri?: string;
  initialPositionMs?: number;
  paused?: boolean;
  seekToMs?: number;
  speed?: number;
  volume?: number;
  resizeMode?: 'contain' | 'cover' | 'fill' | 'zoom' | '16:9' | '4:3';
  audioTrackIndex?: number;
  subtitleTrackIndex?: number;
  onPlayerStatus?: (event: { nativeEvent: PlayerStatusEvent }) => void;
  onTracksChanged?: (event: { nativeEvent: TracksChangedEvent }) => void;
}

const NativeVideoView = requireNativeComponent<NexPlayVideoViewProps>('NexPlayPlayerView');

export const NexPlayVideoView: React.FC<NexPlayVideoViewProps> = (props) => {
  return <NativeVideoView {...props} />;
};
