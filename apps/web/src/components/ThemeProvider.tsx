'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, themeClasses } from '@/stores/theme-store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const classes = themeClasses[mounted ? theme : 'original'];

  return (
    <div className={`min-h-screen ${classes.bg} ${classes.text} transition-colors duration-300`}>
      {children}
    </div>
  );
}
