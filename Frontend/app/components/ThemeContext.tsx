import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Create the context
export const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
});

// Custom hook so screens can easily grab the theme
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemTheme = useColorScheme() === 'dark';
  const [isDark, setIsDark] = useState(systemTheme);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};