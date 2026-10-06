import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { SplashScreen } from '../screens/Splash/SplashScreen';
import { FirstRunPermissionScreen } from '../screens/Permission/FirstRunPermissionScreen';
import { TabNavigator } from './TabNavigator';
import { PlayerScreen } from '../screens/Player/PlayerScreen';
import { PrivateVaultScreen } from '../screens/Vault/PrivateVaultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="FirstRunPermission" component={FirstRunPermissionScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Player" component={PlayerScreen} options={{ orientation: 'landscape' }} />
      <Stack.Screen name="PrivateVault" component={PrivateVaultScreen} />
    </Stack.Navigator>
  );
};
