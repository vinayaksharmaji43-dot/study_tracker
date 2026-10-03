import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Robustly parses any timestamp format (Firestore Timestamp, seconds, millis, Date, ISO string)
 * into numeric milliseconds.
 */
export function parseTimestampToMillis(val) {
  if (!val) return 0;
  if (typeof val === 'number') {
    // If it's in epoch seconds (< 100 billion, 10-digit timestamp), convert to milliseconds
    return val < 1e11 ? val * 1000 : val;
  }
  if (typeof val?.toMillis === 'function') {
    return val.toMillis();
  }
  if (typeof val?.toDate === 'function') {
    return val.toDate().getTime();
  }
  if (val.seconds) {
    return (val.seconds * 1000) + (val.nanoseconds ? Math.floor(val.nanoseconds / 1000000) : 0);
  }
  if (val instanceof Date) {
    return val.getTime();
  }
  if (typeof val === 'string') {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function formatLiveTimer(totalSecs) {
  if (!totalSecs || totalSecs <= 0) return '00:00';
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = Math.floor(totalSecs % 60);

  const mStr = mins < 10 ? `0${mins}` : `${mins}`;
  const sStr = secs < 10 ? `0${secs}` : `${secs}`;

  if (hrs > 0) {
    return `${hrs}h ${mStr}m ${sStr}s`;
  }
  return `${mStr}m ${sStr}s`;
}

export function useActiveSessionsTracker(currentUser, userProfile) {
  const [rawSessions, setRawSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [localTimerState, setLocalTimerState] = useState(null);

  const uid = currentUser?.uid;

  // 1. Sync local timer state from localStorage & storage events
  const readLocalStorageTimer = useCallback(() => {
    if (!uid) {
      setLocalTimerState(null);
      return null;
    }
    try {
      const storageKey = `study_timer_state_${uid}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setLocalTimerState(null);
        return null;
      }
      const saved = JSON.parse(raw);
      setLocalTimerState(saved);
      return saved;
    } catch {
      setLocalTimerState(null);
      return null;
    }
  }, [uid]);

  useEffect(() => {
    readLocalStorageTimer();

    const handleStorage = (e) => {
      if (!uid) return;
      if (e.key === `study_timer_state_${uid}`) {
        readLocalStorageTimer();
      }
    };

    const handleTimerCommand = () => {
      readLocalStorageTimer();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('study-timer-start-command', handleTimerCommand);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('study-timer-start-command', handleTimerCommand);
    };
  }, [uid, readLocalStorageTimer]);

  // 2. Real-time Firestore subscription to activeStudySessions
  useEffect(() => {
    // Only subscribe once user is defined or auth is ready
    if (!uid) {
      // If no currentUser yet, keep loading until auth resolves
      return;
    }

    setIsLoading(true);

    const q = query(
      collection(db, 'activeStudySessions'),
      where('active', '==', true)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          studentId: d.id,
          ...d.data()
        }));
        setRawSessions(docs);
        setIsLoading(false);
      },
      (err) => {
        console.warn("Active study sessions listener warning:", err);
        // Fallback: If filtered query fails or has permissions delay, attempt collection fallback
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  // 3. Second-by-second local tick for real-time live timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Keep current user's active session continuously alive in Firestore (Heartbeat)
  useEffect(() => {
    if (!uid) return;

    const storageKey = `study_timer_state_${uid}`;
    const broadcastHeartbeat = async () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);

        if (saved.isActive && saved.startTimestamp) {
          const elapsed = (saved.accumulatedSeconds || 0) + Math.floor((Date.now() - saved.startTimestamp) / 1000);
          if (elapsed < 18000) { // under 5 hours
            const sessionRef = doc(db, 'activeStudySessions', uid);
            await setDoc(sessionRef, {
              studentId: uid,
              displayName: userProfile?.name || currentUser.displayName || currentUser.email || 'Student',
              course: userProfile?.course || 'CA',
              level: userProfile?.level || 'Foundation',
              attempt: userProfile?.attempt || '',
              points: userProfile?.points || 0,
              subject: saved.selectedSubject || 'General Study',
              startedAt: Date.now() - (elapsed * 1000),
              lastUpdatedAt: Date.now(),
              active: true
            }, { merge: true });
          }
        }
      } catch (err) {
        console.warn("Heartbeat broadcast error:", err);
      }
    };

    // Broadcast immediately on mount & every 15 seconds
    broadcastHeartbeat();
    const interval = setInterval(broadcastHeartbeat, 15000);
    return () => clearInterval(interval);
  }, [uid, userProfile?.name, userProfile?.course, userProfile?.level, userProfile?.attempt, userProfile?.points]);

  // 5. Build activeSessionsMap with live seconds & check stale sessions (< 5 mins = 300,000ms)
  const activeSessionsMap = {};

  rawSessions.forEach((s) => {
    const studentId = s.studentId || s.id;
    if (!studentId) return;

    const lastUpdated = parseTimestampToMillis(s.lastUpdatedAt) || parseTimestampToMillis(s.startedAt) || 0;
    // Session is valid if updated in last 5 minutes (300,000 ms)
    if (lastUpdated > 0 && (now - lastUpdated) < 300000) {
      const startedAt = parseTimestampToMillis(s.startedAt) || (now - ((Number(s.elapsedSeconds) || 0) * 1000));
      const elapsedSecs = Math.max(0, Math.floor((now - startedAt) / 1000));

      activeSessionsMap[studentId] = {
        ...s,
        studentId,
        isOnline: true,
        elapsedSeconds: elapsedSecs,
        durationSecs: elapsedSecs,
        formattedDuration: formatLiveTimer(elapsedSecs)
      };
    }
  });

  // 6. Always merge current user's local active timer if active right now
  if (uid && localTimerState) {
    if (localTimerState.isActive && localTimerState.startTimestamp) {
      const elapsed = (localTimerState.accumulatedSeconds || 0) + Math.floor((now - localTimerState.startTimestamp) / 1000);
      if (elapsed < 18000) {
        activeSessionsMap[uid] = {
          id: uid,
          studentId: uid,
          displayName: userProfile?.name || currentUser.displayName || currentUser.email || 'Student',
          course: userProfile?.course || 'CA',
          level: userProfile?.level || 'Foundation',
          attempt: userProfile?.attempt || '',
          points: userProfile?.points || 0,
          isOnline: true,
          elapsedSeconds: elapsed,
          durationSecs: elapsed,
          formattedDuration: formatLiveTimer(elapsed),
          active: true,
          startedAt: now - (elapsed * 1000),
          subject: localTimerState.selectedSubject || 'General Study'
        };
      }
    } else {
      // Timer explicitly paused or stopped locally
      delete activeSessionsMap[uid];
    }
  }

  const isStudentOnline = (studentId) => {
    return Boolean(activeSessionsMap[studentId]?.isOnline);
  };

  const getStudentLiveDuration = (studentId) => {
    return activeSessionsMap[studentId]?.formattedDuration || null;
  };

  const getStudentLiveSeconds = (studentId) => {
    return activeSessionsMap[studentId]?.elapsedSeconds || 0;
  };

  const activeSessionsList = Object.values(activeSessionsMap).sort(
    (a, b) => (b.elapsedSeconds || 0) - (a.elapsedSeconds || 0)
  );

  return {
    activeSessionsMap,
    activeSessionsList,
    isLoading,
    isStudentOnline,
    getStudentLiveDuration,
    getStudentLiveSeconds,
    now
  };
}
