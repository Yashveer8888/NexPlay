import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import { MainTabParamList } from '../types/navigation';
import { MediaFoldersScreen } from '../screens/Media/MediaFoldersScreen';
import { FutureScreen } from '../screens/Future/FutureScreen';
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
          height: 64,
          paddingBottom: 10,
          paddingTop: 3,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="MediaTab"
        component={MediaFoldersScreen}
        options={{
          tabBarLabel: 'Folders & Videos',
          tabBarIcon: ({ color }) => (
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </Svg>
          ),
        }}
      />

      <Tab.Screen
        name="FutureTab"
        component={FutureScreen}
        options={{
          tabBarLabel: 'JASSI AI (Future)',
          tabBarIcon: ({ color }) => (
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <Path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6a4 4 0 100 8 4 4 0 000-8z" />
              <Path d="M12 14v4M10 18h4" />
            </Svg>
          ),
        }}
      />
    </Tab.Navigator>
  );
};
