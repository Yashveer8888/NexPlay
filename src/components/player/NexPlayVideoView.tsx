import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { requireNativeComponent, ViewProps, UIManager, findNodeHandle } from 'react-native';

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

export interface NexPlayVideoViewRef {
  seekTo: (positionMs: number) => void;
}

const NativeVideoView = requireNativeComponent<NexPlayVideoViewProps>('NexPlayPlayerView');

export const NexPlayVideoView = forwardRef<NexPlayVideoViewRef, NexPlayVideoViewProps>((props, ref) => {
  const nativeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (positionMs: number) => {
      if (nativeRef.current && positionMs >= 0) {
        const handle = findNodeHandle(nativeRef.current);
        if (handle) {
          const config = (UIManager.getViewManagerConfig?.('NexPlayPlayerView') as any);
          const commandId = config?.Commands?.seekTo ?? 1;
          UIManager.dispatchViewManagerCommand(handle, commandId, [positionMs]);
        }
      }
    },
  }));

  return <NativeVideoView ref={nativeRef} {...props} />;
});
