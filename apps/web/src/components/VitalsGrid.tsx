'use client';

import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useState, useEffect } from 'react';

interface Vital {
  icon: string;
  label: string;
  value: string;
  sublabel?: string;
}

interface VitalsGridProps {
  vitals: Vital[];
}

export default function VitalsGrid({ vitals }: VitalsGridProps) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const classes = themeClasses[mounted ? theme : 'original'];

  return (
    <div className="space-y-4">
      {vitals.map((vital, i) => (
        <div
          key={i}
          className={`${classes.glass} rounded-2xl p-5 hover:scale-[1.01] transition-all duration-300`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${classes.glassButton} flex items-center justify-center text-2xl`}>
              {vital.icon}
            </div>
            <div>
              <p className={`text-sm ${classes.textSecondary}`}>{vital.label}</p>
              <p className={`text-2xl font-bold ${classes.text}`}>{vital.value}</p>
              {vital.sublabel && (
                <p className={`text-xs ${classes.textSecondary}`}>{vital.sublabel}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
