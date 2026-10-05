import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeStore } from '../../store/useThemeStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { Header } from '../../components/common/Header';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const { theme, themeMode, setThemeMode } = useThemeStore();
  const { scanLibrary } = useLibraryStore();

  const isDarkMode = themeMode === 'dark';

  const handleToggleTheme = () => {
    setThemeMode(isDarkMode ? 'light' : 'dark');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Settings" showSearch={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Dark Mode</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                Use sleek dark color scheme for media playback
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Media Scanning Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Media Library</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={() => scanLibrary()}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Rescan Media Storage</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                Re-index device files and media folders
              </Text>
            </View>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
              <Path d="M23 4v6h-6M1 20v-6h6" />
              <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Privacy & Safety Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Privacy & Safety</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>100% Offline Processing</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                Your local video files and metadata remain strictly on device. No internet processing required.
              </Text>
            </View>
          </View>
        </View>

        {/* About App */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>About</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>NexPlay Player</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>
                Version 1.0.0 (Phase 1 Build)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSub: {
    fontSize: 12,
    lineHeight: 18,
  },
});
