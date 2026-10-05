import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { usePermissionStore } from '../../store/usePermissionStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useThemeStore } from '../../store/useThemeStore';

type FirstRunProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FirstRunPermission'>;
};

export const FirstRunPermissionScreen: React.FC<FirstRunProps> = ({ navigation }) => {
  const theme = useThemeStore((state) => state.theme);
  const { requestPermissions } = usePermissionStore();
  const { scanLibrary } = useLibraryStore();

  const handleGrant = async () => {
    const granted = await requestPermissions();
    if (granted) {
      scanLibrary();
      navigation.replace('MainTabs');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceLight }]}>
          <Svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
            <Path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </Svg>
        </View>

        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Local Storage Access</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Your videos stay on your device. NexPlay processes media completely offline without uploading data or calling cloud servers.
        </Text>

        <View style={[styles.badgeContainer, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
          <Text style={[styles.badgeText, { color: theme.colors.success }]}>
            ✓ 100% Privacy-First & Offline
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={handleGrant}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Grant Media Permission</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  badgeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 28,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
