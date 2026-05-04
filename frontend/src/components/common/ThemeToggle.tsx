'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'default' | 'subtle';
  showLabel?: boolean;
}

export default function ThemeToggle({ variant = 'default', showLabel = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    console.log('[ThemeToggle] Current theme:', theme, 'Toggling...');
    // If in auto mode or currently showing light, switch to dark
    // If currently showing dark, switch to light
    if (resolvedTheme === 'light') {
      console.log('[ThemeToggle] Switching to dark');
      setTheme('dark');
    } else {
      console.log('[ThemeToggle] Switching to light');
      setTheme('light');
    }
  };

  const getIcon = () => {
    return resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />;
  };

  const getLabel = () => {
    return resolvedTheme === 'dark' ? 'Dark' : 'Light';
  };

  if (variant === 'subtle') {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={`Theme: ${getLabel()}`}
      >
        {getIcon()}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={`Theme: ${getLabel()}`}
    >
      {getIcon()}
      {showLabel && <span className="text-sm font-medium">{getLabel()}</span>}
    </button>
  );
}
