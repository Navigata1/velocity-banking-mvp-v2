'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, themeClasses } from '@/stores/theme-store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, accent } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const classes = themeClasses[mounted ? theme : 'original'];

  return (
    <div
      className={`theme-root min-h-screen ${classes.bg} ${classes.text} transition-colors duration-200`}
      data-theme={mounted ? theme : 'original'}
      data-accent={mounted ? accent : 'emerald'}
    >
      {children}
    </div>
  );
}
