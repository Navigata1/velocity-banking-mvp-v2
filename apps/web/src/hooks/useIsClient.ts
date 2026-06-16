'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (callback: () => void) => {
  queueMicrotask(callback);
  return () => {};
};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

let currentTime = 0;

const subscribeToClock = (callback: () => void) => {
  currentTime = Date.now();
  callback();

  const interval = window.setInterval(() => {
    currentTime = Date.now();
    callback();
  }, 60_000);

  return () => window.clearInterval(interval);
};

const getClockSnapshot = () => currentTime;
const getServerClockSnapshot = () => 0;

export function useIsClient() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

export function useClientNow() {
  return useSyncExternalStore(subscribeToClock, getClockSnapshot, getServerClockSnapshot);
}
