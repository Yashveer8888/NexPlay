import { useLibraryStore } from '../../store/useLibraryStore';

export interface VideoPlayerController {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seekTo: (positionMs: number) => void;
  seekRelative: (deltaMs: number) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setAudioTrack: (index: number) => void;
  setSubtitleTrack: (index: number) => void;
  setResizeMode: (mode: 'contain' | 'cover' | 'fill' | 'zoom' | '16:9' | '4:3') => void;
  playNext: () => void;
  playPrevious: () => void;
  openVideoById: (videoId: string) => void;
}

let playerControllerRef: VideoPlayerController | null = null;

export const registerPlayerController = (controller: VideoPlayerController) => {
  playerControllerRef = controller;
};

export const unregisterPlayerController = () => {
  playerControllerRef = null;
};

export const JASSI = {
  play: () => playerControllerRef?.play(),
  pause: () => playerControllerRef?.pause(),
  togglePlayPause: () => playerControllerRef?.togglePlayPause(),
  seekTo: (ms: number) => playerControllerRef?.seekTo(ms),
  seekForward: (seconds = 10) => playerControllerRef?.seekRelative(seconds * 1000),
  seekBackward: (seconds = 10) => playerControllerRef?.seekRelative(-seconds * 1000),
  setSpeed: (speed: number) => playerControllerRef?.setSpeed(speed),
  setVolume: (volume: number) => playerControllerRef?.setVolume(volume),
  setAudioTrack: (index: number) => playerControllerRef?.setAudioTrack(index),
  setSubtitleTrack: (index: number) => playerControllerRef?.setSubtitleTrack(index),
  setAspectRatio: (mode: 'contain' | 'cover' | 'fill' | 'zoom' | '16:9' | '4:3') =>
    playerControllerRef?.setResizeMode(mode),
  next: () => playerControllerRef?.playNext(),
  previous: () => playerControllerRef?.playPrevious(),
  openVideo: (query: string) => {
    const videos = useLibraryStore.getState().videos;
    const match = videos.find((v) =>
      v.filename.toLowerCase().includes(query.toLowerCase())
    );
    if (match && playerControllerRef) {
      playerControllerRef.openVideoById(match.id);
    }
  },
};
