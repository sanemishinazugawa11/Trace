import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { BlurView } from 'expo-blur';

export default function CustomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();

  const iconDefault = isDark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const iconActive = isDark ? '#0A84FF' : '#007AFF';
  const activeBg = isDark ? 'rgba(10,132,255,0.15)' : 'rgba(0,122,255,0.1)';

  const navItems = [
    { path: '/', activeIcon: 'home', inactiveIcon: 'home-outline', size: 24 },
    { path: '/chat', activeIcon: 'hardware-chip', inactiveIcon: 'hardware-chip-outline', size: 24 },
    { path: '/history', activeIcon: 'time', inactiveIcon: 'time-outline', size: 24 },
  ];

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView
        intensity={isDark ? 70 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.navContainer,
          {
            borderColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.navButton, isActive && [styles.navButtonActive, { backgroundColor: activeBg }]]}
              onPress={() => router.replace(item.path as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.inactiveIcon as any}
                size={item.size}
                color={isActive ? iconActive : iconDefault}
              />
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  navContainer: {
    flexDirection: 'row',
    width: '62%',
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  navButton: {
    width: 48,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonActive: {
    borderRadius: 12,
  },
});