import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeStore } from '../../store/useThemeStore';

export const FutureScreen: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>JASSI AI Assistant</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Next-Generation Voice & Smart Media Intelligence
        </Text>
      </View>

      {/* Main Futuristic Banner Card */}
      <View style={[styles.bannerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={[styles.aiIconCircle, { backgroundColor: theme.colors.surfaceLight }]}>
          <Svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="1.8">
            <Path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6a4 4 0 100 8 4 4 0 000-8z" />
            <Path d="M12 14v4M10 18h4" />
          </Svg>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
          <Text style={[styles.statusText, { color: theme.colors.primary }]}>
            ✨ Reserved for Future AI Updates
          </Text>
        </View>

        <Text style={[styles.bannerTitle, { color: theme.colors.textPrimary }]}>
          JASSI Voice Controller
        </Text>
        <Text style={[styles.bannerDesc, { color: theme.colors.textSecondary }]}>
          Hands-free voice commands to play, pause, seek, switch audio tracks, and organize your media collection without touching the screen.
        </Text>
      </View>

      {/* Feature Preview Cards */}
      <View style={styles.featuresSection}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          Upcoming Capabilities
        </Text>

        <View style={[styles.featureCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.featureIconBox, { backgroundColor: theme.colors.surfaceLight }]}>
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
              <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
            </Svg>
          </View>
          <View style={styles.featureTextBox}>
            <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>Voice Playback Control</Text>
            <Text style={[styles.featureDesc, { color: theme.colors.textMuted }]}>
              Say "Jassi, play next video" or "seek 30 seconds"
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.featureIconBox, { backgroundColor: theme.colors.surfaceLight }]}>
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.secondary} strokeWidth="2">
              <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </Svg>
          </View>
          <View style={styles.featureTextBox}>
            <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>Natural Language Video Search</Text>
            <Text style={[styles.featureDesc, { color: theme.colors.textMuted }]}>
              Find any downloaded video instantly by topic or description
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.featureIconBox, { backgroundColor: theme.colors.surfaceLight }]}>
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent} strokeWidth="2">
              <Path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
            </Svg>
          </View>
          <View style={styles.featureTextBox}>
            <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>Smart Equalizer & Audio Enhancer</Text>
            <Text style={[styles.featureDesc, { color: theme.colors.textMuted }]}>
              Automatic speech clarity boosting and volume leveling
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  bannerCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  aiIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  bannerDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextBox: {
    flex: 1,
    marginLeft: 14,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
  },
});
