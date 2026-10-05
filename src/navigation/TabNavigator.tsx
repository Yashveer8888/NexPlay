import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import { MainTabParamList } from '../types/navigation';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { AllVideosScreen } from '../screens/Videos/AllVideosScreen';
import { FoldersScreen } from '../screens/Folders/FoldersScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { useThemeStore } from '../store/useThemeStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <Path d="M9 22V12h6v10" />
            </Svg>
          ),
        }}
      />

      <Tab.Screen
        name="VideosTab"
        component={AllVideosScreen}
        options={{
          tabBarLabel: 'Videos',
          tabBarIcon: ({ color }) => (
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <Path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <Path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Svg>
          ),
        }}
      />

      <Tab.Screen
        name="FoldersTab"
        component={FoldersScreen}
        options={{
          tabBarLabel: 'Folders',
          tabBarIcon: ({ color }) => (
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </Svg>
          ),
        }}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </Svg>
          ),
        }}
      />
    </Tab.Navigator>
  );
};
