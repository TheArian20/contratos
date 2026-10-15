'use client';
import { useCallback, useEffect, useState } from 'react';
import { recentVisits, type RecentVisit } from '@/lib/work-ease';
const eventName = 'cartera-recent-visits';
function read(key: string) {
  try {
    return recentVisits(JSON.parse(sessionStorage.getItem(key) || '[]'));
  } catch {
    return [];
  }
}
export function useRecentVisits(userId: string) {
  const key = `cartera:recent:${userId}`;
  const [visits, setVisits] = useState<RecentVisit[]>([]);
  useEffect(() => {
    const sync = () => setVisits(read(key));
    sync();
    window.addEventListener(eventName, sync);
    return () => window.removeEventListener(eventName, sync);
  }, [key]);
  const remember = useCallback(
    (visit: RecentVisit) => {
      if (!userId) return;
      const next = recentVisits([visit, ...read(key)]);
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Storage may be disabled. */
      }
      setVisits(next);
      window.dispatchEvent(new Event(eventName));
    },
    [key, userId],
  );
  const clear = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Storage may be disabled. */
    }
    setVisits([]);
    window.dispatchEvent(new Event(eventName));
  };
  return { visits, remember, clear };
}
