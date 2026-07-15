import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useAccessibilityAnnouncement(message: string | null) {
  const lastAnnouncement = useRef<string | null>(null);

  useEffect(() => {
    if (!message) {
      lastAnnouncement.current = null;
      return;
    }
    if (process.env.EXPO_OS !== 'ios' || lastAnnouncement.current === message) return;
    lastAnnouncement.current = message;
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
