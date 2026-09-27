import { useEffect, useRef } from 'react';
import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * useTabAwayTracker
 * 
 * Uses the browser Page Visibility API (`visibilitychange`) to track when a student
 * leaves the website tab (switches tabs, minimizes browser, or switches windows).
 *
 * Requirements met:
 * 1. Uses document.visibilityState and visibilitychange event.
 * 2. Records exact timestamp as hiddenStartTime when tab becomes hidden.
 * 3. Records timestamp when tab returns to visible, calculates elapsed time, and accumulates to totalHiddenTime.
 * 4. Multiple hide/visible cycles accumulate without overwriting previous hidden time.
 * 5. Continues tracking across tab switches and window changes.
 * 6. Normal active time is NOT counted as hidden time.
 * 7. Completely separated from the Study Timer (no studyHours/studySessions impact).
 * 8. Stored in database in seconds (`totalTabAwayTime`) and milliseconds (`totalTabAwayTimeMs`).
 * 9. Persistent across refreshes and future sessions.
 * 10. Handles safe recovery if tab is closed while hidden.
 * 11. Student dashboard never displays this data; admin-only visibility.
 */
export function useTabAwayTracker(currentUser, userProfile) {
  const hiddenStartTimeRef = useRef(null);
  const totalHiddenTimeMsRef = useRef(0);
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;

  const isStudent = Boolean(
    currentUser?.uid && 
    userProfile?.role !== 'admin' && 
    currentUser?.email?.toLowerCase() !== 'vaultstore27@gmail.com' &&
    currentUser?.email?.toLowerCase() !== 'thunderworld766@gmail.com'
  );

  useEffect(() => {
    if (!isStudent || !currentUser?.uid) return undefined;

    const uid = currentUser.uid;
    const sessionKey = `tab_away_start_${uid}`;
    const activeKey = `tab_away_active_${uid}`;
    const pendingKey = `tab_away_pending_${uid}`;

    // Initialize current total ms from profile if available
    const initialProfile = userProfileRef.current;
    if (initialProfile?.totalTabAwayTimeMs) {
      totalHiddenTimeMsRef.current = Number(initialProfile.totalTabAwayTimeMs);
    } else if (initialProfile?.totalTabAwayTime) {
      totalHiddenTimeMsRef.current = Number(initialProfile.totalTabAwayTime) * 1000;
    }

    // 1. Sync pending away time stored on previous browser/tab close
    const syncPendingAwayTime = async () => {
      try {
        const rawPending = localStorage.getItem(pendingKey);
        if (rawPending) {
          const pending = JSON.parse(rawPending);
          const pendingMs = Number(pending?.ms) || 0;
          const pendingCount = Number(pending?.count) || 1;

          if (pendingMs > 0) {
            const pendingSeconds = Math.max(0, Math.floor(pendingMs / 1000));
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, {
              totalTabAwayTime: increment(pendingSeconds),
              totalTabAwayTimeMs: increment(pendingMs),
              tabAwaySessionsCount: increment(pendingCount),
              lastTabVisibleAt: serverTimestamp()
            }, { merge: true });

            totalHiddenTimeMsRef.current += pendingMs;
          }
          localStorage.removeItem(pendingKey);
        }
      } catch (err) {
        console.warn('Could not sync pending tab away time:', err);
      }

      // 2. Crash / abrupt closure recovery: tab was hidden and browser terminated without pagehide
      try {
        const rawActive = localStorage.getItem(activeKey);
        if (rawActive) {
          const active = JSON.parse(rawActive);
          const startTime = Number(active?.hiddenStartTime);
          if (startTime && startTime > 0) {
            const now = Date.now();
            const elapsed = now - startTime;
            // Cap to at most 1 hour (3600000 ms) to avoid over-inflating if device was off for days
            if (elapsed > 0) {
              const cappedMs = Math.min(elapsed, 3600000);
              const cappedSec = Math.max(0, Math.floor(cappedMs / 1000));
              const userRef = doc(db, 'users', uid);
              await setDoc(userRef, {
                totalTabAwayTime: increment(cappedSec),
                totalTabAwayTimeMs: increment(cappedMs),
                tabAwaySessionsCount: increment(1),
                lastTabVisibleAt: serverTimestamp()
              }, { merge: true });

              totalHiddenTimeMsRef.current += cappedMs;
            }
          }
          localStorage.removeItem(activeKey);
        }
      } catch (err) {
        console.warn('Could not recover unclosed tab away state:', err);
      }
    };

    syncPendingAwayTime();

    // 2. Handle Page Visibility change
    const handleVisibilityChange = async () => {
      const now = Date.now();

      if (document.visibilityState === 'hidden') {
        // Tab became hidden
        hiddenStartTimeRef.current = now;

        // Persist to sessionStorage for tab isolation and localStorage for browser close safety
        try {
          sessionStorage.setItem(sessionKey, String(now));
          localStorage.setItem(activeKey, JSON.stringify({
            hiddenStartTime: now,
            lastHiddenAt: new Date().toISOString()
          }));
        } catch {}

        try {
          const userRef = doc(db, 'users', uid);
          await setDoc(userRef, {
            lastTabHiddenAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.warn('Could not record lastTabHiddenAt in Firestore:', err);
        }

      } else if (document.visibilityState === 'visible') {
        // Tab became visible again
        let startTime = hiddenStartTimeRef.current;

        // Fallback to sessionStorage / localStorage if state was refreshed
        if (!startTime) {
          try {
            const sessionVal = sessionStorage.getItem(sessionKey);
            if (sessionVal) startTime = Number(sessionVal);
          } catch {}
        }
        if (!startTime) {
          try {
            const activeVal = localStorage.getItem(activeKey);
            if (activeVal) {
              const parsed = JSON.parse(activeVal);
              if (parsed?.hiddenStartTime) startTime = Number(parsed.hiddenStartTime);
            }
          } catch {}
        }

        // Clean up stored hidden start markers
        hiddenStartTimeRef.current = null;
        try {
          sessionStorage.removeItem(sessionKey);
          localStorage.removeItem(activeKey);
        } catch {}

        if (startTime && startTime > 0) {
          const elapsedMs = Math.max(0, now - startTime);

          if (elapsedMs > 0) {
            // Correctly accumulate fractional seconds across multiple hide/visible cycles
            const prevTotalSec = Math.floor(totalHiddenTimeMsRef.current / 1000);
            totalHiddenTimeMsRef.current += elapsedMs;
            const newTotalSec = Math.floor(totalHiddenTimeMsRef.current / 1000);
            const deltaSec = Math.max(0, newTotalSec - prevTotalSec);

            try {
              const userRef = doc(db, 'users', uid);
              await setDoc(userRef, {
                totalTabAwayTime: increment(deltaSec),
                totalTabAwayTimeMs: increment(elapsedMs),
                tabAwaySessionsCount: increment(1),
                lastTabVisibleAt: serverTimestamp()
              }, { merge: true });
            } catch (err) {
              console.warn('Could not persist tab away time to Firestore:', err);
            }
          }
        }
      }
    };

    // 3. Handle pagehide / beforeunload (safely captures away time if tab is closed while hidden)
    const handlePageHide = () => {
      const startTime = hiddenStartTimeRef.current;
      if (startTime && startTime > 0) {
        const now = Date.now();
        const awayMs = Math.max(0, now - startTime);
        if (awayMs > 0) {
          try {
            const existingRaw = localStorage.getItem(pendingKey);
            let prevMs = 0;
            let prevCount = 0;
            if (existingRaw) {
              const p = JSON.parse(existingRaw);
              prevMs = Number(p?.ms) || 0;
              prevCount = Number(p?.count) || 0;
            }

            localStorage.setItem(pendingKey, JSON.stringify({
              ms: prevMs + awayMs,
              count: prevCount + 1,
              closedAt: now
            }));
            localStorage.removeItem(activeKey);
            sessionStorage.removeItem(sessionKey);
          } catch {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [isStudent, currentUser?.uid]);
}
