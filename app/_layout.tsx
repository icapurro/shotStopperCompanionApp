import React from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider, useThemeContext } from './hooks/useThemeContext';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DeviceSettingsProvider } from './hooks/DeviceSettingsContext';
import BLEConnectionGuard from './components/BLEConnectionGuard';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const AppContent = () => {
  const { theme, isDarkMode } = useThemeContext();
  
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: { 
            backgroundColor: '#111110'
          },
          animation: 'fade',
          freezeOnBlur: true,
          animationDuration: 400
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            gestureEnabled: false,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    MenloRegular: require('../assets/fonts/Menlo-Regular.ttf'),
    MenloBold: require('../assets/fonts/Menlo-Bold.ttf'),
    InstrumentSherif: require('../assets/fonts/InstrumentSerif-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BLEConnectionGuard>
          <DeviceSettingsProvider>
            <SafeAreaProvider>
              <AppContent />
            </SafeAreaProvider>
          </DeviceSettingsProvider>
        </BLEConnectionGuard>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
