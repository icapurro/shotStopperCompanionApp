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
import BLEConnectionGuard from './components/BLEConnectionGuard';
import { initialize } from '@microsoft/react-native-clarity';
import BleManager from 'react-native-ble-manager';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARPcipOGp3051nFVRPEoiQZKhNpvEThN4",
  authDomain: "shotstoppercompanion.firebaseapp.com",
  projectId: "shotstoppercompanion",
  storageBucket: "shotstoppercompanion.firebasestorage.app",
  messagingSenderId: "551602871959",
  appId: "1:551602871959:web:3e41a3a799843829a053d2",
  measurementId: "G-WEFZ3WEP5G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

initialize("qm8srg6dza");

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

BleManager.start({ showAlert: false }).then(() => {
  console.log("BLE Module initialized");
})

const AppContent = () => {
  const { theme, isDarkMode } = useThemeContext();
  
  return (
    <SafeAreaProvider style={{ backgroundColor: theme.colors.background }}>
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
            backgroundColor: theme.colors.background
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
    </SafeAreaProvider>
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
          <AppContent />
        </BLEConnectionGuard>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
