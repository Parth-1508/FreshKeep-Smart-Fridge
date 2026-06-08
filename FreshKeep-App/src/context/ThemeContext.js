import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeCtx = createContext();
export const useTheme = () => useContext(ThemeCtx);

export const lightColors = {
  primary:       '#4a7c59',
  primaryMid:    '#5a8f6b',
  primaryLight:  '#7aab86',
  primaryPale:   '#e8f0eb',
  bg:            '#f5f2ec',
  card:          '#ffffff',
  border:        '#e2ddd6',
  textPrimary:   '#1a2318',
  textSecondary: '#6b7b6e',
  textLight:     '#9aaa9c',
  urgent:        '#c0534a',
  warning:       '#c98a3a',
  fresh:         '#5a8f6b',
};

export const darkColors = {
  primary:       '#5a8f6b',
  primaryMid:    '#4a7c59',
  primaryLight:  '#3a6a49',
  primaryPale:   '#1e2a21',
  bg:            '#141c17',
  card:          '#1e2a21',
  border:        '#2a3a2d',
  textPrimary:   '#e8f0eb',
  textSecondary: '#8fa891',
  textLight:     '#6b7b6e',
  urgent:        '#e06860',
  warning:       '#d9a050',
  fresh:         '#7aab86',
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme').then(saved => {
      if (saved !== null) {
        setIsDark(saved === 'dark');
      } else {
        setIsDark(systemScheme === 'dark');
      }
      setLoaded(true);
    });
  }, []);

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem('theme', next ? 'dark' : 'light');
  }

  if (!loaded) return null; // prevents theme flash on startup

  return (
    <ThemeCtx.Provider value={{
      isDark,
      colors: isDark ? darkColors : lightColors,
      toggleDark,
    }}>
      {children}
    </ThemeCtx.Provider>
  );
}
