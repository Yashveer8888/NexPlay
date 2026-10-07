import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { VideoItem } from '../../types/video';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useThemeStore } from '../../store/useThemeStore';
import {
  NexPlayVideoView,
  NexPlayVideoViewRef,
  PlayerStatusEvent,
  TracksChangedEvent,
  TrackItem,
} from '../../components/player/NexPlayVideoView';
import {
  registerPlayerController,
  unregisterPlayerController,
  VideoPlayerController,
} from '../../services/ai/JassiDispatcher';
import { NexPlaySystemService } from '../../services/system/NexPlaySystemService';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const RESIZE_MODES: Array<'contain' | 'cover' | 'fill' | 'zoom' | '16:9' | '4:3'> = [
  'contain',
  'cover',
  'fill',
  'zoom',
  '16:9',
  '4:3',
];

export const PlayerScreen: React.FC<Props> = ({ route, navigation }) => {
  const initialVideo = route.params?.video;
  const passedPlaylist = route.params?.playlist;
  const isVaultParam = route.params?.isVault || initialVideo?.folder === 'Private Vault';
  const theme = useThemeStore((state) => state.theme);
  const { videos, vaultVideos, updatePlaybackPosition } = useLibraryStore();

  const activePlaylist = useMemo(() => {
    if (passedPlaylist && passedPlaylist.length > 0) {
      return passedPlaylist;
    }
    if (
      isVaultParam ||
      initialVideo?.folder === 'Private Vault' ||
      vaultVideos.some((v) => v.id === initialVideo?.id)
    ) {
      return vaultVideos.map((item) => ({
        id: item.id,
        title: item.filename.replace(/\.[^/.]+$/, ''),
        filename: item.filename,
        path: item.vaultPath,
        uri: item.vaultPath.startsWith('file://') ? item.vaultPath : `file://${item.vaultPath}`,
        size: item.size,
        duration: item.duration,
        width: item.width,
        height: item.height,
        mimeType: item.mimeType,
        dateAdded: item.dateAdded,
        dateModified: item.dateMoved,
        folder: 'Private Vault',
        lastPosition: 0,
        completed: false,
        lastPlayedAt: Date.now(),
        playCount: 1,
        thumbnailUri: item.thumbnailUri,
      }));
    }
    return videos;
  }, [passedPlaylist, isVaultParam, initialVideo, vaultVideos, videos]);

  const [currentVideoId, setCurrentVideoId] = useState<string>(
    initialVideo?.id || activePlaylist[0]?.id || ''
  );

  const video = useMemo(() => {
    return activePlaylist.find((v: VideoItem) => v.id === currentVideoId) || initialVideo || activePlaylist[0];
  }, [activePlaylist, currentVideoId, initialVideo]);

  const initialResume =
    video?.lastPosition &&
    video.lastPosition > 1000 &&
    video.duration &&
    video.lastPosition < video.duration - 2000
      ? video.lastPosition
      : 0;

  const [paused, setPaused] = useState<boolean>(false);
  const [positionMs, setPositionMs] = useState<number>(initialResume);
  const [durationMs, setDurationMs] = useState<number>(video?.duration || 0);
  const [bufferedMs, setBufferedMs] = useState<number>(0);
  const [seekToTargetMs, setSeekToTargetMs] = useState<number>(-1);

  const videoRef = useRef<NexPlayVideoViewRef>(null);
  const currentVideoIdRef = useRef<string>(video?.id || '');
  const latestPositionRef = useRef<number>(initialResume);
  const latestDurationRef = useRef<number>(video?.duration || 0);
  const lastSavedTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    currentVideoIdRef.current = video?.id || '';
    if (video?.duration) {
      latestDurationRef.current = video.duration;
    }
  }, [video?.id, video?.duration]);

  // When active video changes (e.g. Next / Previous pressed), reset playback state
  useEffect(() => {
    if (!video) return;
    const resume =
      video.lastPosition &&
      video.lastPosition > 1000 &&
      video.duration &&
      video.lastPosition < video.duration - 2000
        ? video.lastPosition
        : 0;
    currentVideoIdRef.current = video.id;
    latestPositionRef.current = resume;
    latestDurationRef.current = video.duration || 0;
    setPositionMs(resume);
    setDurationMs(video.duration || 0);
    setBufferedMs(0);
    setSeekToTargetMs(-1);
    setPaused(false);
  }, [video?.id]);

  // Save exact playback position when unmounting (closing video)
  useEffect(() => {
    return () => {
      if (currentVideoIdRef.current && latestPositionRef.current > 0) {
        updatePlaybackPosition(
          currentVideoIdRef.current,
          latestPositionRef.current,
          latestDurationRef.current
        );
      }
    };
  }, [updatePlaybackPosition]);
  const [speed, setSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [brightness, setBrightness] = useState<number>(0.8);
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'fill' | 'zoom' | '16:9' | '4:3'>('contain');
  const [audioTrackIndex, setAudioTrackIndex] = useState<number>(0);
  const [subtitleTrackIndex, setSubtitleTrackIndex] = useState<number>(-1);

  const [audioTracks, setAudioTracks] = useState<TrackItem[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<TrackItem[]>([]);

  const [showControls, setShowControls] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showUnlockButton, setShowUnlockButton] = useState<boolean>(false);

  // Audio Modal
  const [showAudioModal, setShowAudioModal] = useState<boolean>(false);

  // Auto-hide controls timer
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAutoHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, []);

  const toggleControls = useCallback(() => {
    if (isLocked) {
      if (showUnlockButton) {
        if (unlockTimer.current) clearTimeout(unlockTimer.current);
        setShowUnlockButton(false);
      } else {
        setShowUnlockButton(true);
        if (unlockTimer.current) clearTimeout(unlockTimer.current);
        unlockTimer.current = setTimeout(() => {
          setShowUnlockButton(false);
        }, 3500);
      }
      return;
    }

    setShowControls((prev) => {
      const nextState = !prev;
      if (nextState) {
        startAutoHideTimer();
      } else {
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      }
      return nextState;
    });
  }, [isLocked, showUnlockButton, startAutoHideTimer]);

  const handleLock = () => {
    setIsLocked(true);
    setShowControls(false);
    setShowUnlockButton(true);
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => {
      setShowUnlockButton(false);
    }, 3500);
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setShowUnlockButton(false);
    setShowControls(true);
    startAutoHideTimer();
  };

  useEffect(() => {
    startAutoHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
    };
  }, [startAutoHideTimer]);

  // Two-Finger Pinch to Zoom in & Zoom out
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [showZoomBadge, setShowZoomBadge] = useState<boolean>(false);
  const zoomBadgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateZoomDisplay = useCallback((currentScale: number) => {
    setZoomPercent(Math.round(currentScale * 100));
    setShowZoomBadge(true);
    if (zoomBadgeTimer.current) clearTimeout(zoomBadgeTimer.current);
    zoomBadgeTimer.current = setTimeout(() => {
      setShowZoomBadge(false);
    }, 1500);
  }, []);

  const videoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pinchGesture = Gesture.Pinch()
    .enabled(!isLocked)
    .onStart(() => {
      'worklet';
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      'worklet';
      const newScale = Math.min(Math.max(savedScale.value * e.scale, 0.5), 5.0);
      scale.value = newScale;
      runOnJS(updateZoomDisplay)(newScale);
    })
    .onEnd(() => {
      'worklet';
      // Persistent Zoom: whatever zoom user sets, it stays permanently!
      savedScale.value = scale.value;
    });

  // Dynamic screen dimensions for rotation & aspect ratios
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const layoutWidth = useSharedValue(windowWidth);
  const layoutHeight = useSharedValue(windowHeight);

  useEffect(() => {
    layoutWidth.value = windowWidth;
    layoutHeight.value = windowHeight;
  }, [windowWidth, windowHeight]);

  // Vertical Slide Gestures (Right side: Volume -> Left HUD | Left side: Brightness -> Right HUD)
  const currentVolumeSV = useSharedValue(volume);
  const currentBrightnessSV = useSharedValue(brightness);
  const startVolume = useSharedValue(volume);
  const startBrightness = useSharedValue(brightness);
  const panSide = useSharedValue<'left' | 'right' | null>(null);

  const [displayVolumePercent, setDisplayVolumePercent] = useState<number>(Math.round(volume * 100));
  const [displayBrightnessPercent, setDisplayBrightnessPercent] = useState<number>(Math.round(brightness * 100));

  // Initialize real system volume and hardware screen brightness on mount
  useEffect(() => {
    let isMounted = true;
    NexPlaySystemService.getSystemVolume().then((info) => {
      if (isMounted && typeof info?.volume === 'number') {
        const v = Math.min(Math.max(info.volume, 0.0), 1.0);
        setVolume(v);
        currentVolumeSV.value = v;
        startVolume.value = v;
        setDisplayVolumePercent(Math.round(v * 100));
      }
    });

    NexPlaySystemService.getScreenBrightness().then((b) => {
      if (isMounted && typeof b === 'number') {
        const bright = Math.min(Math.max(b, 0.01), 1.0);
        setBrightness(bright);
        currentBrightnessSV.value = bright;
        startBrightness.value = bright;
        setDisplayBrightnessPercent(Math.round(bright * 100));
      }
    });

    return () => {
      isMounted = false;
      NexPlaySystemService.restoreScreenBrightness();
    };
  }, []);

  const lastVolCallRef = useRef<number>(0);
  const lastBrightCallRef = useRef<number>(0);
  const latestVolRef = useRef<number>(volume);
  const latestBrightRef = useRef<number>(brightness);

  const handleVolumeChange = useCallback((newVol: number) => {
    latestVolRef.current = newVol;
    const now = Date.now();
    // Throttle native system calls and React state updates to at most once per 35ms
    if (now - lastVolCallRef.current >= 35) {
      lastVolCallRef.current = now;
      setDisplayVolumePercent(Math.round(newVol * 100));
      NexPlaySystemService.setSystemVolume(newVol);
    }
  }, []);

  const handleBrightnessChange = useCallback((newBright: number) => {
    latestBrightRef.current = newBright;
    const now = Date.now();
    // Throttle native system calls and React state updates to at most once per 35ms
    if (now - lastBrightCallRef.current >= 35) {
      lastBrightCallRef.current = now;
      setDisplayBrightnessPercent(Math.round(newBright * 100));
      NexPlaySystemService.setScreenBrightness(newBright);
    }
  }, []);

  const handleFinalizeVolume = useCallback((finalVol: number) => {
    setVolume(finalVol);
    setDisplayVolumePercent(Math.round(finalVol * 100));
    NexPlaySystemService.setSystemVolume(finalVol);
  }, []);

  const handleFinalizeBrightness = useCallback((finalBright: number) => {
    setBrightness(finalBright);
    setDisplayBrightnessPercent(Math.round(finalBright * 100));
    NexPlaySystemService.setScreenBrightness(finalBright);
  }, []);

  // Reanimated HUD animations: Left side for Volume, Right side for Brightness
  const volumeHudOpacity = useSharedValue(0);
  const volumeHudTranslateX = useSharedValue(-40);

  const brightnessHudOpacity = useSharedValue(0);
  const brightnessHudTranslateX = useSharedValue(40);

  const volumeHudAnimatedStyle = useAnimatedStyle(() => ({
    opacity: volumeHudOpacity.value,
    transform: [{ translateX: volumeHudTranslateX.value }],
  }));

  const volumeFillAnimatedStyle = useAnimatedStyle(() => ({
    height: `${Math.round(currentVolumeSV.value * 100)}%`,
  }));

  const brightnessHudAnimatedStyle = useAnimatedStyle(() => ({
    opacity: brightnessHudOpacity.value,
    transform: [{ translateX: brightnessHudTranslateX.value }],
  }));

  const brightnessFillAnimatedStyle = useAnimatedStyle(() => ({
    height: `${Math.round(currentBrightnessSV.value * 100)}%`,
  }));

  const panGesture = Gesture.Pan()
    .enabled(!isLocked)
    .maxPointers(1)
    .activeOffsetY([-8, 8])
    .failOffsetX([-60, 60])
    .onStart((e) => {
      'worklet';
      const isRight = e.x > layoutWidth.value / 2;
      panSide.value = isRight ? 'right' : 'left';
      startVolume.value = currentVolumeSV.value;
      startBrightness.value = currentBrightnessSV.value;

      if (isRight) {
        // Right side slide -> Volume HUD displayed on LEFT side
        volumeHudOpacity.value = withTiming(1, { duration: 100 });
        volumeHudTranslateX.value = withSpring(0, { damping: 14, stiffness: 140 });
      } else {
        // Left side slide -> Brightness HUD displayed on RIGHT side
        brightnessHudOpacity.value = withTiming(1, { duration: 100 });
        brightnessHudTranslateX.value = withSpring(0, { damping: 14, stiffness: 140 });
      }
    })
    .onUpdate((e) => {
      'worklet';
      const sweepHeight = Math.max(layoutHeight.value * 0.45, 160);
      const delta = -e.translationY / sweepHeight;

      if (panSide.value === 'right') {
        // Right side slide -> Volume (+ and -)
        const newVol = Math.min(Math.max(startVolume.value + delta, 0.0), 1.0);
        currentVolumeSV.value = newVol;
        runOnJS(handleVolumeChange)(newVol);
      } else if (panSide.value === 'left') {
        // Left side slide -> Brightness (+ and -)
        const newBright = Math.min(Math.max(startBrightness.value + delta, 0.01), 1.0);
        currentBrightnessSV.value = newBright;
        runOnJS(handleBrightnessChange)(newBright);
      }
    })
    .onFinalize(() => {
      'worklet';
      if (panSide.value === 'right') {
        volumeHudOpacity.value = withDelay(600, withTiming(0, { duration: 200 }));
        volumeHudTranslateX.value = withDelay(600, withTiming(-40, { duration: 200 }));
        runOnJS(handleFinalizeVolume)(currentVolumeSV.value);
      } else if (panSide.value === 'left') {
        brightnessHudOpacity.value = withDelay(600, withTiming(0, { duration: 200 }));
        brightnessHudTranslateX.value = withDelay(600, withTiming(40, { duration: 200 }));
        runOnJS(handleFinalizeBrightness)(currentBrightnessSV.value);
      }
      panSide.value = null;
    });

  // Double-tap Seek Feedback (+10s on Right, -10s on Left)
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDoubleTapSeek = useCallback(
    (isRight: boolean) => {
      // Lock status updates for 600ms so incoming player events don't fight the seek
      isSeekingLockRef.current = true;
      if (seekLockTimer.current) clearTimeout(seekLockTimer.current);
      seekLockTimer.current = setTimeout(() => {
        isSeekingLockRef.current = false;
      }, 600);

      const currentPos = latestPositionRef.current;
      const step = 10000;
      const targetPos = isRight
        ? Math.min(durationMsRef.current, currentPos + step)
        : Math.max(0, currentPos - step);

      latestPositionRef.current = targetPos;
      setPositionMs(targetPos);
      videoRef.current?.seekTo(targetPos);
      setSeekToTargetMs(targetPos);
      setDoubleTapSide(isRight ? 'right' : 'left');

      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      doubleTapTimer.current = setTimeout(() => {
        setDoubleTapSide(null);
      }, 650);

      // Reset seek target prop to -1 so subsequent renders don't re-seek
      setTimeout(() => {
        setSeekToTargetMs(-1);
      }, 150);
    },
    []
  );

  const doubleTapGesture = Gesture.Tap()
    .enabled(!isLocked)
    .numberOfTaps(2)
    .onEnd((e) => {
      'worklet';
      const isRight = e.x > layoutWidth.value / 2;
      runOnJS(handleDoubleTapSeek)(isRight);
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      'worklet';
      runOnJS(toggleControls)();
    });

  const tapGestures = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const playerGesture = Gesture.Simultaneous(pinchGesture, panGesture, tapGestures);

  const handleResetZoom = () => {
    scale.value = withTiming(1.0);
    savedScale.value = 1.0;
    updateZoomDisplay(1.0);
  };

  const handleNext = useCallback(() => {
    if (!activePlaylist || activePlaylist.length === 0) return;
    if (currentVideoIdRef.current && latestPositionRef.current > 0) {
      updatePlaybackPosition(
        currentVideoIdRef.current,
        latestPositionRef.current,
        latestDurationRef.current
      );
    }
    const currentIndex = activePlaylist.findIndex((v: VideoItem) => v.id === currentVideoId);
    if (currentIndex >= 0 && currentIndex < activePlaylist.length - 1) {
      setCurrentVideoId(activePlaylist[currentIndex + 1].id);
    } else if (currentIndex === activePlaylist.length - 1 && activePlaylist.length > 1) {
      setCurrentVideoId(activePlaylist[0].id);
    }
  }, [activePlaylist, currentVideoId, updatePlaybackPosition]);

  const handlePrevious = useCallback(() => {
    if (!activePlaylist || activePlaylist.length === 0) return;
    if (currentVideoIdRef.current && latestPositionRef.current > 0) {
      updatePlaybackPosition(
        currentVideoIdRef.current,
        latestPositionRef.current,
        latestDurationRef.current
      );
    }
    const currentIndex = activePlaylist.findIndex((v: VideoItem) => v.id === currentVideoId);
    if (currentIndex > 0) {
      setCurrentVideoId(activePlaylist[currentIndex - 1].id);
    } else if (currentIndex === 0 && activePlaylist.length > 1) {
      setCurrentVideoId(activePlaylist[activePlaylist.length - 1].id);
    }
  }, [activePlaylist, currentVideoId, updatePlaybackPosition]);

  // JASSI AI Voice Controller registration
  useEffect(() => {
    const controller: VideoPlayerController = {
      play: () => setPaused(false),
      pause: () => setPaused(true),
      togglePlayPause: () => setPaused((p) => !p),
      seekTo: (ms) => {
        latestPositionRef.current = ms;
        setPositionMs(ms);
        videoRef.current?.seekTo(ms);
        setSeekToTargetMs(ms);
        setTimeout(() => setSeekToTargetMs(-1), 150);
      },
      seekRelative: (deltaMs) => {
        const currentPos = latestPositionRef.current;
        const newPos = Math.max(0, Math.min(durationMsRef.current, currentPos + deltaMs));
        latestPositionRef.current = newPos;
        setPositionMs(newPos);
        videoRef.current?.seekTo(newPos);
        setSeekToTargetMs(newPos);
        setTimeout(() => setSeekToTargetMs(-1), 150);
      },
      setSpeed: (s) => setSpeed(s),
      setVolume: (v) => setVolume(v),
      setAudioTrack: (idx) => setAudioTrackIndex(idx),
      setSubtitleTrack: (idx) => setSubtitleTrackIndex(idx),
      setResizeMode: (mode) => setResizeMode(mode),
      playNext: () => handleNext(),
      playPrevious: () => handlePrevious(),
      openVideoById: (id) => setCurrentVideoId(id),
    };

    registerPlayerController(controller);
    return () => {
      unregisterPlayerController();
    };
  }, [durationMs, handleNext, handlePrevious]);

  // Language Mapping Helper for Audio Tracks
  const getLanguageName = (code?: string, label?: string) => {
    if (label && label.length > 2 && label.toLowerCase() !== 'und' && !label.toLowerCase().startsWith('track')) {
      return label;
    }
    const map: Record<string, string> = {
      hin: 'Hindi (हिंदी)',
      hi: 'Hindi (हिंदी)',
      eng: 'English',
      en: 'English',
      tam: 'Tamil (தமிழ்)',
      ta: 'Tamil (தமிழ்)',
      tel: 'Telugu (తెలుగు)',
      te: 'Telugu (తెలుగు)',
      pan: 'Punjabi (ਪੰਜਾਬੀ)',
      pa: 'Punjabi (ਪੰਜਾਬੀ)',
      mar: 'Marathi (मराठी)',
      mr: 'Marathi (मराठी)',
      ben: 'Bengali (বাংলা)',
      bn: 'Bengali (বাংলা)',
      guj: 'Gujarati (ગુજરાતી)',
      gu: 'Gujarati (ગુજરાતી)',
      kan: 'Kannada (ಕನ್ನಡ)',
      kn: 'Kannada (ಕನ್ನಡ)',
      mal: 'Malayalam (മലയാളം)',
      ml: 'Malayalam (മലയാളം)',
      urd: 'Urdu (اردو)',
      ur: 'Urdu (اردو)',
      spa: 'Spanish (Español)',
      es: 'Spanish (Español)',
      fra: 'French (Français)',
      fr: 'French (Français)',
      deu: 'German (Deutsch)',
      de: 'German (Deutsch)',
      rus: 'Russian (Русский)',
      ru: 'Russian (Русский)',
      jpn: 'Japanese (日本語)',
      ja: 'Japanese (日本語)',
      kor: 'Korean (한국어)',
      ko: 'Korean (한국어)',
      zho: 'Chinese (中文)',
      zh: 'Chinese (中文)',
      ara: 'Arabic (العربية)',
      ar: 'Arabic (العربية)',
      und: 'Default Audio Track',
    };
    const key = (code || '').toLowerCase().trim();
    return map[key] || (code ? code.toUpperCase() : 'Default Audio');
  };

  // Speed Cycle on click: 1x -> 1.25x -> 1.5x -> 1.75x -> 2x -> 1x
  const SPEED_CYCLE = [1.0, 1.25, 1.5, 1.75, 2.0];
  const handleCycleSpeed = () => {
    const currentIdx = SPEED_CYCLE.indexOf(speed);
    const nextIdx = (currentIdx + 1) % SPEED_CYCLE.length;
    setSpeed(SPEED_CYCLE[nextIdx]);
    startAutoHideTimer();
  };

  // Interactive Progress Bar Scrubbing with Absolute Screen Coordinates (No 0 snap-backs!)
  const progressTouchRef = useRef<any>(null);
  const trackBounds = useRef<{ x: number; width: number }>({ x: 20, width: 350 });
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubPositionMs, setScrubPositionMs] = useState<number>(0);
  const isScrubbingRef = useRef<boolean>(false);
  const isSeekingLockRef = useRef<boolean>(false);
  const seekLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationMsRef = useRef<number>(durationMs);

  useEffect(() => {
    durationMsRef.current = durationMs;
  }, [durationMs]);

  const updateTrackBounds = useCallback(() => {
    progressTouchRef.current?.measureInWindow((x: number, _y: number, width: number) => {
      if (width > 0) {
        trackBounds.current = { x, width };
      }
    });
  }, []);

  const calculateMsFromPageX = useCallback((pageX: number) => {
    const { x: trackX, width: trackW } = trackBounds.current;
    const touchX = pageX - trackX;
    const ratio = Math.max(0, Math.min(1, touchX / Math.max(1, trackW)));
    return Math.round(ratio * durationMsRef.current);
  }, []);

  const progressPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        updateTrackBounds();
        isScrubbingRef.current = true;
        setIsScrubbing(true);
        const targetMs = calculateMsFromPageX(evt.nativeEvent.pageX);
        setScrubPositionMs(targetMs);
      },
      onPanResponderMove: (evt) => {
        const targetMs = calculateMsFromPageX(evt.nativeEvent.pageX);
        setScrubPositionMs(targetMs);
      },
      onPanResponderRelease: (evt) => {
        const targetMs = calculateMsFromPageX(evt.nativeEvent.pageX);
        setPositionMs(targetMs);
        latestPositionRef.current = targetMs;
        videoRef.current?.seekTo(targetMs);
        setSeekToTargetMs(targetMs);
        setTimeout(() => {
          setSeekToTargetMs(-1);
        }, 150);
        isScrubbingRef.current = false;
        setIsScrubbing(false);

        // Lock status updates briefly so ExoPlayer pre-seek events don't snap position to 0
        isSeekingLockRef.current = true;
        if (seekLockTimer.current) clearTimeout(seekLockTimer.current);
        seekLockTimer.current = setTimeout(() => {
          isSeekingLockRef.current = false;
        }, 400);

        startAutoHideTimer();
      },
      onPanResponderTerminate: () => {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        startAutoHideTimer();
      },
    })
  ).current;

  const handleStatusUpdate = (e: { nativeEvent: PlayerStatusEvent }) => {
    const { position, duration, bufferedPosition } = e.nativeEvent;
    if (!isScrubbingRef.current && !isSeekingLockRef.current) {
      setPositionMs(position);
      latestPositionRef.current = position;
    }
    if (duration > 0) {
      setDurationMs(duration);
      latestDurationRef.current = duration;
    }
    setBufferedMs(bufferedPosition);

    // Save playback position periodically to SQLite DB (throttled to 20s to eliminate re-render lag)
    const now = Date.now();
    if (video && position > 0 && now - lastSavedTimeRef.current > 20000) {
      lastSavedTimeRef.current = now;
      updatePlaybackPosition(video.id, position, duration);
    }
  };

  const handleTracksChanged = (e: { nativeEvent: TracksChangedEvent }) => {
    setAudioTracks(e.nativeEvent.audioTracks);
    setSubtitleTracks(e.nativeEvent.subtitleTracks);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!video) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <Text style={{ color: '#fff' }}>Video not found</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        layoutWidth.value = e.nativeEvent.layout.width;
        layoutHeight.value = e.nativeEvent.layout.height;
      }}
    >
      <StatusBar hidden />

      <GestureDetector gesture={playerGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, videoAnimatedStyle]}>
            <NexPlayVideoView
              ref={videoRef}
              style={StyleSheet.absoluteFill}
              videoUri={video.uri || video.path}
              initialPositionMs={initialResume}
              paused={paused}
              seekToMs={seekToTargetMs}
              speed={speed}
              volume={1.0}
              resizeMode={resizeMode}
              audioTrackIndex={audioTrackIndex}
              subtitleTrackIndex={subtitleTrackIndex}
              onPlayerStatus={handleStatusUpdate}
              onTracksChanged={handleTracksChanged}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      {/* FLOATING ZOOM BADGE */}
      {showZoomBadge && (
        <View style={styles.zoomBadge} pointerEvents="none">
          <Text style={styles.zoomBadgeText}>Zoom: {zoomPercent}%</Text>
        </View>
      )}

      {/* DOUBLE TAP SEEK FEEDBACK OVERLAYS */}
      {doubleTapSide === 'right' && (
        <View style={styles.seekRippleRight} pointerEvents="none">
          <View style={styles.seekRippleCircle}>
            <Svg width="36" height="36" viewBox="0 0 24 24" fill="#FFF">
              <Path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
            </Svg>
            <Text style={styles.seekRippleText}>+10s</Text>
          </View>
        </View>
      )}

      {doubleTapSide === 'left' && (
        <View style={styles.seekRippleLeft} pointerEvents="none">
          <View style={styles.seekRippleCircle}>
            <Svg width="36" height="36" viewBox="0 0 24 24" fill="#FFF">
              <Path d="M11 18V6l-8.5 6 8.5 6zm9-12v12l-8.5-6L20 6z" />
            </Svg>
            <Text style={styles.seekRippleText}>-10s</Text>
          </View>
        </View>
      )}



      {/* VOLUME HUD - DISPLAYED ON LEFT SIDE OF SCREEN */}
      <Animated.View
        style={[styles.hudLeftContainer, volumeHudAnimatedStyle]}
        pointerEvents="none"
      >
        <View style={styles.hudCard}>
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.2">
            {displayVolumePercent === 0 ? (
              <Path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
            ) : (
              <Path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            )}
          </Svg>
          <View style={styles.hudTrack}>
            <Animated.View
              style={[
                styles.hudFill,
                { backgroundColor: '#6366F1' },
                volumeFillAnimatedStyle,
              ]}
            />
          </View>
          <Text style={styles.hudLabel}>{displayVolumePercent}%</Text>
          <Text style={styles.hudSubLabel}>Volume</Text>
        </View>
      </Animated.View>

      {/* BRIGHTNESS HUD - DISPLAYED ON RIGHT SIDE OF SCREEN */}
      <Animated.View
        style={[styles.hudRightContainer, brightnessHudAnimatedStyle]}
        pointerEvents="none"
      >
        <View style={styles.hudCard}>
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.2">
            <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 100-10 5 5 0 000 10z" />
          </Svg>
          <View style={styles.hudTrack}>
            <Animated.View
              style={[
                styles.hudFill,
                { backgroundColor: '#F59E0B' },
                brightnessFillAnimatedStyle,
              ]}
            />
          </View>
          <Text style={styles.hudLabel}>{displayBrightnessPercent}%</Text>
          <Text style={styles.hudSubLabel}>Brightness</Text>
        </View>
      </Animated.View>

      {/* CONTROLS OVERLAY */}
      {showControls && (
        <View style={styles.overlayContainer} pointerEvents="box-none">
          {/* Top Bar */}
          <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.goBack()}
              >
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.2">
                  <Path d="M19 12H5M12 19l-7-7 7-7" />
                </Svg>
              </TouchableOpacity>

              {/* Lock Screen Button */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleLock}
              >
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2">
                  <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <Path d="M7 11V7a5 5 0 0110 0v4" />
                </Svg>
              </TouchableOpacity>

              <Text style={styles.videoTitle} numberOfLines={1}>
                {video.filename}
              </Text>

              <View style={styles.topRightActions}>
                {/* Audio Language Selector */}
                <TouchableOpacity
                  style={[styles.pillButton, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99, 102, 241, 0.25)', borderColor: '#6366F1', borderWidth: 1 }]}
                  onPress={() => setShowAudioModal(true)}
                  activeOpacity={0.7}
                >
                  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.2">
                    <Path d="M9 18V5l12-2v13M9 9l12-2M6 18a3 3 0 100-6 3 3 0 000 6zM18 16a3 3 0 100-6 3 3 0 000 6z" />
                  </Svg>
                  <Text style={[styles.pillText, { color: '#818CF8' }]}>
                    {audioTracks.length > 0
                      ? (audioTracks[audioTrackIndex]?.language ? audioTracks[audioTrackIndex].language.toUpperCase() : 'AUDIO')
                      : 'AUDIO'}
                  </Text>
                </TouchableOpacity>

                {/* Speed Cycle Button (1x -> 1.25x -> 1.5x -> 1.75x -> 2x) */}
                <TouchableOpacity
                  style={[styles.pillButton, speed > 1.0 && { backgroundColor: '#6366F1' }]}
                  onPress={handleCycleSpeed}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pillText}>{speed}x</Text>
                </TouchableOpacity>

                {/* Aspect Ratio Toggle */}
                <TouchableOpacity
                  style={styles.pillButton}
                  onPress={() => {
                    const nextIdx = (RESIZE_MODES.indexOf(resizeMode) + 1) % RESIZE_MODES.length;
                    setResizeMode(RESIZE_MODES[nextIdx]);
                  }}
                >
                  <Text style={styles.pillText}>{resizeMode.toUpperCase()}</Text>
                </TouchableOpacity>

                {/* Zoom Indicator / Reset Button */}
                {zoomPercent !== 100 && (
                  <TouchableOpacity
                    style={[styles.pillButton, { backgroundColor: '#6366F1' }]}
                    onPress={handleResetZoom}
                  >
                    <Text style={styles.pillText}>{zoomPercent}% (Reset)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Center Controls (Clean: Previous | Play/Pause | Next) */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.controlCircle}
                onPress={handlePrevious}
              >
                <Svg width="28" height="28" viewBox="0 0 24 24" fill="#FFF">
                  <Path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </Svg>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mainPlayButton}
                onPress={() => setPaused(!paused)}
              >
                <Svg width="36" height="36" viewBox="0 0 24 24" fill="#FFF">
                  {paused ? (
                    <Path d="M8 5v14l11-7z" />
                  ) : (
                    <Path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  )}
                </Svg>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlCircle}
                onPress={handleNext}
              >
                <Svg width="28" height="28" viewBox="0 0 24 24" fill="#FFF">
                  <Path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
              {/* Interactive Progress Slider Track */}
              <View
                ref={progressTouchRef}
                style={styles.progressTouchArea}
                onLayout={updateTrackBounds}
                {...progressPanResponder.panHandlers}
              >
                {/* Scrubbing Time Tooltip Badge */}
                {isScrubbing && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.scrubBadge,
                      {
                        left: `${Math.max(6, Math.min(94, (scrubPositionMs / Math.max(1, durationMs)) * 100))}%`,
                      },
                    ]}
                  >
                    <Text style={styles.scrubBadgeText}>{formatTime(scrubPositionMs)}</Text>
                  </View>
                )}

                <View style={styles.progressContainer} pointerEvents="none">
                  <View
                    style={[
                      styles.bufferedTrack,
                      { width: `${(bufferedMs / Math.max(1, durationMs)) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.playedTrack,
                      {
                        width: `${((isScrubbing ? scrubPositionMs : positionMs) / Math.max(1, durationMs)) * 100}%`,
                      },
                    ]}
                  />
                </View>

                {/* Scrubber Thumb Knob */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.scrubberThumb,
                    {
                      left: `${((isScrubbing ? scrubPositionMs : positionMs) / Math.max(1, durationMs)) * 100}%`,
                      transform: [{ translateX: -7 }, { scale: isScrubbing ? 1.3 : 1 }],
                    },
                  ]}
                />
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>
                  {formatTime(isScrubbing ? scrubPositionMs : positionMs)} / {formatTime(durationMs)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* FLOATING UNLOCK BUTTON WHEN LOCKED */}
        {isLocked && showUnlockButton && (
          <View style={styles.lockedContainer} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.floatingUnlockBtn}
              onPress={handleUnlock}
              activeOpacity={0.8}
            >
              <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.2">
                <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <Path d="M7 11V7a5 5 0 019.9-1" />
              </Svg>
              <Text style={styles.unlockText}>Unlock Screen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AUDIO TRACK / LANGUAGE SELECTION MODAL */}
        <Modal
          visible={showAudioModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAudioModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAudioModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.2">
                  <Path d="M9 18V5l12-2v13M9 9l12-2M6 18a3 3 0 100-6 3 3 0 000 6zM18 16a3 3 0 100-6 3 3 0 000 6z" />
                </Svg>
                <Text style={[styles.modalTitle, { marginBottom: 0, marginLeft: 10 }]}>Audio Language</Text>
              </View>

              {audioTracks.length === 0 ? (
                <View style={[styles.modalItem, styles.modalItemActive]}>
                  <Text style={[styles.modalItemText, styles.modalItemTextActive]}>
                    Default Audio Track (Stereo)
                  </Text>
                </View>
              ) : (
                audioTracks.map((track) => {
                  const isSelected = audioTrackIndex === track.index;
                  const langName = getLanguageName(track.language, track.label);
                  return (
                    <TouchableOpacity
                      key={track.index}
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemActive,
                        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                      ]}
                      onPress={() => {
                        setAudioTrackIndex(track.index);
                        setShowAudioModal(false);
                      }}
                    >
                      <View>
                        <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                          {langName}
                        </Text>
                        {track.language && track.language !== 'und' && (
                          <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
                            Code: {track.language.toUpperCase()}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="3">
                          <Path d="M5 13l4 4L19 7" />
                        </Svg>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  videoTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 8,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  seekButton: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  seekLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  mainPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressTouchArea: {
    height: 38,
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 4,
  },
  progressContainer: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bufferedTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  playedTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#6366F1',
  },
  scrubberThumb: {
    position: 'absolute',
    top: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6366F1',
    elevation: 5,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  scrubBadge: {
    position: 'absolute',
    bottom: 30,
    transform: [{ translateX: -24 }],
    backgroundColor: 'rgba(15, 17, 26, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
    elevation: 8,
  },
  scrubBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  modalItemActive: {
    backgroundColor: '#6366F1',
  },
  modalItemText: {
    color: '#CCCCCC',
    fontSize: 15,
    fontWeight: '500',
  },
  modalItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: '#888888',
    fontSize: 14,
    marginVertical: 8,
  },
  lockedContainer: {
    position: 'absolute',
    left: 24,
    top: '45%',
  },
  floatingUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 35, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    gap: 8,
    elevation: 8,
  },
  unlockText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  zoomBadge: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 35, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    zIndex: 999,
  },
  zoomBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  seekRippleRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '42%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderTopLeftRadius: 120,
    borderBottomLeftRadius: 120,
    zIndex: 90,
  },
  seekRippleLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '42%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderTopRightRadius: 120,
    borderBottomRightRadius: 120,
    zIndex: 90,
  },
  seekRippleCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 35, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#6366F1',
    gap: 6,
  },
  seekRippleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudLeftContainer: {
    position: 'absolute',
    left: 28,
    top: '28%',
    zIndex: 95,
  },
  hudRightContainer: {
    position: 'absolute',
    right: 28,
    top: '28%',
    zIndex: 95,
  },
  hudCard: {
    width: 68,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 18, 30, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    gap: 10,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  hudTrack: {
    width: 8,
    height: 110,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  hudFill: {
    width: '100%',
    borderRadius: 4,
  },
  hudLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudSubLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
