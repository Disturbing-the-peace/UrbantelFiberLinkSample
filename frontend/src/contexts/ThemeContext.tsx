'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Get system theme based on time (6 AM - 6 PM = light, otherwise dark)
  const getAutoTheme = (): ResolvedTheme => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'light' : 'dark';
  };

  // Resolve the actual theme to apply
  const resolveTheme = (themePreference: Theme): ResolvedTheme => {
    if (themePreference === 'auto') {
      return getAutoTheme();
    }
    return themePreference;
  };

  // Apply theme to document
  const applyTheme = (resolved: ResolvedTheme) => {
    const root = document.documentElement;
    console.log('[ThemeContext] Applying theme to DOM:', resolved);
    console.log('[ThemeContext] Current classList:', root.classList.toString());
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    console.log('[ThemeContext] Updated classList:', root.classList.toString());
  };

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    // Default to 'auto' - user can override by clicking the toggle
    const initialTheme = stored || 'auto';
    console.log('[ThemeContext] Initializing theme:', initialTheme);
    setThemeState(initialTheme);
    const resolved = resolveTheme(initialTheme);
    console.log('[ThemeContext] Resolved theme:', resolved);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Update theme when preference changes
  useEffect(() => {
    console.log('[ThemeContext] Theme changed to:', theme);
    const resolved = resolveTheme(theme);
    console.log('[ThemeContext] Applying resolved theme:', resolved);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auto-update theme every minute if in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const interval = setInterval(() => {
      const newResolved = getAutoTheme();
      if (newResolved !== resolvedTheme) {
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [theme, resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
