import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const LOCK_KEY = 'snapit-db-owner';
const BEAT_KEY = 'snapit-db-beat';
const TIMEOUT_MS = 10000; // Increased from 6s to 10s

export function useTabLock() {
  const [locked, setLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const id = Math.random().toString(36).slice(2);
    let timer;

    const tryAcquire = () => {
      const owner = localStorage.getItem(LOCK_KEY);
      const lastBeat = Number(localStorage.getItem(BEAT_KEY) || 0);
      const fresh = Date.now() - lastBeat < TIMEOUT_MS;

      if (owner && fresh && owner !== id) {
        setLocked(true);
        setLockInfo({ owner, lastBeat, age: Date.now() - lastBeat });
        return;
      }
      setLocked(false);
      setLockInfo(null);
      localStorage.setItem(LOCK_KEY, id);
      localStorage.setItem(BEAT_KEY, String(Date.now()));
    };

    // Initial attempt
    tryAcquire();
    
    // Periodic check
    timer = setInterval(tryAcquire, 1000);
    window.addEventListener('focus', tryAcquire);

    const onUnload = () => {
      if (localStorage.getItem(LOCK_KEY) === id) {
        localStorage.removeItem(LOCK_KEY);
        localStorage.removeItem(BEAT_KEY);
      }
    };
    window.addEventListener('beforeunload', onUnload);

    // Expose force release for debugging
    window.__snapitForceRelease = () => {
      localStorage.removeItem(LOCK_KEY);
      localStorage.removeItem(BEAT_KEY);
      tryAcquire();
    };

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tryAcquire);
      window.removeEventListener('beforeunload', onUnload);
      if (localStorage.getItem(LOCK_KEY) === id) {
        localStorage.removeItem(LOCK_KEY);
        localStorage.removeItem(BEAT_KEY);
      }
      delete window.__snapitForceRelease;
    };
  }, []);

  return { locked, lockInfo };
}
