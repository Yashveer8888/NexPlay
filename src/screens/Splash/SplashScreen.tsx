import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { usePermissionStore } from '../../store/usePermissionStore';
import { useThemeStore } from '../../store/useThemeStore';

import { useLibraryStore } from '../../store/useLibraryStore';

type SplashScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const theme = useThemeStore((state) => state.theme);
  const { checkPermissions } = usePermissionStore();
  const { initStore, scanLibrary } = useLibraryStore();

  useEffect(() => {
    const initApp = async () => {
      await initStore();
      const hasPerm = await checkPermissions();
      if (hasPerm) {
        scanLibrary();
      }
      setTimeout(() => {
        if (hasPerm) {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('FirstRunPermission');
        }
      }, 1500);
    };

    initApp();
  }, [navigation, checkPermissions, initStore, scanLibrary]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.logoContainer}>
        <Svg width="90" height="90" viewBox="0 0 24 24" fill="none">
          <Path
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            fill={theme.colors.primary}
          />
          <Path
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke={theme.colors.primary}
            strokeWidth="1.8"
          />
        </Svg>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>NexPlay</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          High-Performance Offline Media Engine
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
});
