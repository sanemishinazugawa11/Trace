import React from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomNavBar from './components/CustomNavbar';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { AuthProvider } from './components/AuthContext'; 
// 1. Import Safe Area Tools
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

function AppLayout() {
  const { isDark, toggleTheme } = useTheme();
  const bgColor = isDark ? '#000000' : '#F2F2F7';
  
  // 2. Grab the dynamic notch/status bar measurements for the device
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.appContainer, { backgroundColor: bgColor }]}>
      <TouchableOpacity
        style={[
          styles.themeToggle,
          { 
            backgroundColor: isDark ? 'rgba(44,44,46,0.92)' : 'rgba(255,255,255,0.92)',
            // 3. Push the button down dynamically based on the specific phone's notch!
            top: insets.top + 10 
          },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={isDark ? '#FFD60A' : '#3C3C43'} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="history" />
        </Stack>
      </View>

      <CustomNavBar />
    </View>
  );
}

export default function RootLayout() {
  return (
    // 4. Wrap the whole app in the Provider so it can calculate screen dimensions
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppLayout />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1 },
  content: { flex: 1 },
  themeToggle: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
});