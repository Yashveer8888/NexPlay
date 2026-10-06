import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  StatusBar,
  Image,
  ToastAndroid,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useThemeStore } from '../../store/useThemeStore';
import { VaultVideoItem } from '../../services/native/NexPlayFileManager';
import { VideoItem } from '../../types/video';
import { VaultProgressPill } from '../../components/common/VaultProgressPill';

const formatDuration = (ms: number): string => {
  if (!ms || isNaN(ms)) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatSize = (bytes: number): string => {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const PrivateVaultScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const theme = useThemeStore((state) => state.theme);
  const {
    vaultVideos,
    vaultPin,
    loadVault,
    setVaultPinAction,
    restoreVideosFromVault,
    deleteFromVaultPermanently,
  } = useLibraryStore();

  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Selection mode for batch operations
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  const handleKeyPress = (num: string) => {
    setErrorMessage('');
    if (pinInput.length < 4) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);

      if (nextPin.length === 4) {
        if (!vaultPin) {
          // Setting up new PIN
          if (setupStep === 'create') {
            setFirstPin(nextPin);
            setSetupStep('confirm');
            setPinInput('');
          } else {
            // Confirming new PIN
            if (nextPin === firstPin) {
              setVaultPinAction(nextPin);
              setIsUnlocked(true);
            } else {
              setErrorMessage('PINs did not match. Please try again.');
              setSetupStep('create');
              setFirstPin('');
              setPinInput('');
            }
          }
        } else {
          // Unlocking with existing PIN
          if (nextPin === vaultPin) {
            setIsUnlocked(true);
            setPinInput('');
          } else {
            setErrorMessage('Incorrect PIN. Please try again.');
            setPinInput('');
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    setErrorMessage('');
    if (pinInput.length > 0) {
      setPinInput(pinInput.slice(0, -1));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === vaultVideos.length) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(vaultVideos.map((v) => v.id));
    }
  };

  const handlePlayVideo = (item: VaultVideoItem) => {
    const videoItem: VideoItem = {
      id: item.id,
      uri: `file://${item.vaultPath}`,
      path: item.vaultPath,
      filename: item.filename,
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
    };
    navigation.navigate('Player', { video: videoItem });
  };

  const handleBatchRestore = async () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    setSelectedIds([]);
    setIsSelectionMode(false);
    restoreVideosFromVault(ids);
    ToastAndroid.show(`${ids.length} video(s) restored to original location`, ToastAndroid.SHORT);
  };

  const handleSingleRestore = async (id: string) => {
    restoreVideosFromVault([id]);
    ToastAndroid.show('Video restored to original location', ToastAndroid.SHORT);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Permanent Delete',
      `Are you sure you want to PERMANENTLY delete ${selectedIds.length} private video(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const count = await deleteFromVaultPermanently(selectedIds);
              setSelectedIds([]);
              setIsSelectionMode(false);
              ToastAndroid.show(`${count} video(s) permanently deleted`, ToastAndroid.SHORT);
            } catch (e: any) {
              ToastAndroid.show(e?.message || 'Failed to delete', ToastAndroid.SHORT);
            }
          },
        },
      ]
    );
  };

  const topInset = Math.max(insets.top, StatusBar.currentHeight || 0) + 12;

  // PIN ENTRY / SETUP VIEW
  if (!isUnlocked) {
    const titleText = !vaultPin
      ? setupStep === 'create'
        ? 'Create 4-Digit PIN'
        : 'Confirm Your 4-Digit PIN'
      : 'Enter 4-Digit PIN';

    const subtitleText = !vaultPin
      ? setupStep === 'create'
        ? 'Set a private code to protect your private videos'
        : 'Re-enter the same 4-digit code to confirm'
      : 'Private Vault is locked';

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: topInset }]}>
        <View style={styles.pinHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2.2">
              <Path d="M19 12H5M12 19l-7-7 7-7" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.pinContent}>
          <View style={[styles.lockIconCircle, { backgroundColor: theme.colors.surfaceLight }]}>
            <Svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
              <Path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </Svg>
          </View>

          <Text style={[styles.pinTitle, { color: theme.colors.textPrimary }]}>{titleText}</Text>
          <Text style={[styles.pinSub, { color: theme.colors.textMuted }]}>{subtitleText}</Text>

          {/* 4 Dots Indicator */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.pinDot,
                  {
                    backgroundColor:
                      idx < pinInput.length ? theme.colors.primary : 'rgba(255, 255, 255, 0.2)',
                    transform: [{ scale: idx < pinInput.length ? 1.2 : 1 }],
                  },
                ]}
              />
            ))}
          </View>

          {errorMessage.length > 0 && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          {/* Numeric Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'del'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((k, kIdx) => {
                  if (k === '') {
                    return <View key={kIdx} style={styles.keyEmpty} />;
                  }
                  if (k === 'del') {
                    return (
                      <TouchableOpacity
                        key={kIdx}
                        style={[styles.keyBtn, { backgroundColor: theme.colors.surfaceLight }]}
                        onPress={handleBackspace}
                      >
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2">
                          <Path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zM18 9l-6 6M12 9l6 6" />
                        </Svg>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={kIdx}
                      style={[styles.keyBtn, { backgroundColor: theme.colors.surfaceLight }]}
                      onPress={() => handleKeyPress(k)}
                    >
                      <Text style={[styles.keyText, { color: theme.colors.textPrimary }]}>{k}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // UNLOCKED PRIVATE VAULT CONTENT
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: topInset }]}>
      {/* Top Header */}
      {isSelectionMode ? (
        <View style={[styles.header, styles.selectionHeader, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              setIsSelectionMode(false);
              setSelectedIds([]);
            }}
          >
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2.2">
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          </TouchableOpacity>

          <Text style={[styles.selectionCount, { color: theme.colors.textPrimary }]}>
            {selectedIds.length} Selected
          </Text>

          <TouchableOpacity style={styles.selectAllBtn} onPress={handleSelectAll}>
            <Text style={[styles.selectAllText, { color: theme.colors.primary }]}>
              {selectedIds.length === vaultVideos.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.actionCircleBtn} onPress={handleBatchRestore}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
                <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <Path d="M12 9a3 3 0 100 6 3 3 0 000-6z" />
              </Svg>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCircleBtn, styles.deleteBtnBg]} onPress={handleBatchDelete}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" strokeWidth="2">
                <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2.2">
                <Path d="M19 12H5M12 19l-7-7 7-7" />
              </Svg>
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Private Vault</Text>
              <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>
                {vaultVideos.length} {vaultVideos.length === 1 ? 'Video' : 'Videos'} • Hidden from Device
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {vaultVideos.length > 0 && (
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceLight }]}
                onPress={() => setIsSelectionMode(true)}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
                  <Path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </Svg>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceLight }]}
              onPress={() => setIsUnlocked(false)}
            >
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2">
                <Path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Vault Videos List */}
      <FlatList
        data={vaultVideos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.vaultItem,
                { backgroundColor: theme.colors.card, borderColor: isSelected ? theme.colors.primary : theme.colors.border },
              ]}
              onPress={() => {
                if (isSelectionMode) {
                  toggleSelect(item.id);
                } else {
                  handlePlayVideo(item);
                }
              }}
              onLongPress={() => {
                if (!isSelectionMode) {
                  setIsSelectionMode(true);
                  setSelectedIds([item.id]);
                }
              }}
              activeOpacity={0.8}
            >
              {isSelectionMode && (
                <View
                  style={[
                    styles.checkboxCircle,
                    {
                      borderColor: isSelected ? theme.colors.primary : theme.colors.textMuted,
                      backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3">
                      <Path d="M5 13l4 4L19 7" />
                    </Svg>
                  )}
                </View>
              )}

              <View style={[styles.thumbnailBox, { backgroundColor: theme.colors.surfaceLight }]}>
                {item.thumbnailUri ? (
                  <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnailImage} />
                ) : (
                  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="1.5">
                    <Path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <Path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                )}
                <View style={styles.durationBadge}>
                  <Text style={styles.badgeText}>{formatDuration(item.duration)}</Text>
                </View>
              </View>

              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {item.filename}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                    {formatSize(item.size)}
                  </Text>
                  <Text style={[styles.dot, { color: theme.colors.textMuted }]}>•</Text>
                  <Text style={[styles.metaText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    From: {item.originalFolder}
                  </Text>
                </View>
              </View>

              {!isSelectionMode && (
                <TouchableOpacity
                  style={[styles.singleRestoreBtn, { backgroundColor: theme.colors.surfaceLight }]}
                  onPress={() => handleSingleRestore(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2.2">
                    <Path d="M3 10h10a5 5 0 015 5v2m0 0l-3-3m3 3l3-3M3 10l4-4m-4 4l4 4" />
                  </Svg>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: theme.colors.surfaceLight }]}>
              <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="1.5">
                <Path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </Svg>
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Vault is Empty</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              Select any video or folder on the home page and tap "Move to Private" to isolate it here.
            </Text>
          </View>
        }
      />

      {/* Floating Real-time Vault Progress Pill */}
      <VaultProgressPill />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  selectionHeader: {
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  selectAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnBg: {
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
  },
  listPadding: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 60,
  },
  vaultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 3,
    marginHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  thumbnailBox: {
    width: 82,
    height: 50,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  itemContent: {
    flex: 1,
    marginLeft: 10,
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11.5,
  },
  dot: {
    marginHorizontal: 4,
    fontSize: 11.5,
  },
  singleRestoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },

  // PIN Styles
  pinHeader: {
    paddingHorizontal: 16,
  },
  pinContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  lockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  pinTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  pinSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  keypad: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
    marginTop: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyEmpty: {
    width: 70,
    height: 70,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    width: '84%',
    maxWidth: 320,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  counterLarge: {
    fontSize: 26,
    fontWeight: '800',
  },
  percentBadge: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 6,
  },
  subInfoText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  filenameText: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
  },
});
