import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useRealStudyTimer(currentUser, userProfile) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentSubject, setCurrentSubject] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);

  const storageKey = currentUser?.uid ? `study_timer_state_${currentUser.uid}` : null;

  // 1. Sync state from localStorage
  const checkLocalStorage = useCallback(() => {
    if (!storageKey) return { isRunning: false, seconds: 0, subject: '' };
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { isRunning: false, seconds: 0, subject: '' };
      const saved = JSON.parse(raw);
      if (saved.isActive && saved.startTimestamp) {
        const now = Date.now();
        const elapsed = (saved.accumulatedSeconds || 0) + Math.floor((now - saved.startTimestamp) / 1000);
        return {
          isRunning: elapsed < 18000,
          seconds: elapsed,
          subject: saved.selectedSubject || '',
          startedAt: saved.startTimestamp
        };
      }
      return {
        isRunning: false,
        seconds: saved.accumulatedSeconds || 0,
        subject: saved.selectedSubject || ''
      };
    } catch {
      return { isRunning: false, seconds: 0, subject: '' };
    }
  }, [storageKey]);

  // 2. Real-time Firestore sync with activeStudySessions
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsTimerRunning(false);
      setElapsedSeconds(0);
      return;
    }

    const unsub = onSnapshot(doc(db, 'activeStudySessions', currentUser.uid), (snap) => {
      const local = checkLocalStorage();

      if (snap.exists()) {
        const data = snap.data();
        const isRecent = data.active && (Date.now() - (data.lastUpdatedAt || data.startedAt)) < 120000;
        
        if (isRecent || local.isRunning) {
          setIsTimerRunning(true);
          setCurrentSubject(data.subject || local.subject || 'General Study');
          setSessionStartedAt(data.startedAt || local.startedAt || Date.now());
        } else {
          setIsTimerRunning(false);
          setCurrentSubject(data.subject || local.subject || '');
        }
      } else {
        setIsTimerRunning(local.isRunning);
        setCurrentSubject(local.subject || '');
      }
    }, () => {
      const local = checkLocalStorage();
      setIsTimerRunning(local.isRunning);
    });

    return () => unsub();
  }, [currentUser?.uid, checkLocalStorage]);

  // 3. Local clock tick
  useEffect(() => {
    const interval = setInterval(() => {
      const local = checkLocalStorage();
      if (local.isRunning) {
        setIsTimerRunning(true);
        setElapsedSeconds(local.seconds);
        if (local.subject) setCurrentSubject(local.subject);
      } else if (!isTimerRunning) {
        setElapsedSeconds(local.seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [checkLocalStorage, isTimerRunning]);

  // 4. Start existing study timer programmatically
  const startExistingStudyTimer = useCallback(async (customSubject) => {
    if (!currentUser?.uid) return false;

    const now = Date.now();
    const subject = customSubject || currentSubject || 'General Study';

    // 1. Get current accumulated seconds if any
    let accumulated = 0;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        accumulated = parsed.accumulatedSeconds || 0;
      }
    } catch {
      accumulated = 0;
    }

    // 2. Update localStorage with existing timer format
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedSubject: subject,
        isActive: true,
        accumulatedSeconds: accumulated,
        startTimestamp: now
      }));
    }

    // 3. Broadcast to Firestore activeStudySessions
    try {
      const course = userProfile?.course || 'CA';
      const level = userProfile?.level || 'Foundation';
      const attempt = userProfile?.attempt || '';
      const sessionRef = doc(db, 'activeStudySessions', currentUser.uid);

      await setDoc(sessionRef, {
        studentId: currentUser.uid,
        displayName: userProfile?.name || currentUser.email,
        course,
        level,
        attempt,
        points: userProfile?.points || 0,
        subject,
        startedAt: now - (accumulated * 1000),
        lastUpdatedAt: now,
        maxFocusSecs: accumulated,
        active: true
      }, { merge: true });

      // Update user activity
      await updateDoc(doc(db, 'users', currentUser.uid), {
        lastActiveAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Could not broadcast active session on start:", e);
    }

    // 4. Dispatch custom event so StudyTimer.jsx immediately updates if mounted
    window.dispatchEvent(new CustomEvent('study-timer-start-command', {
      detail: { subject, startTimestamp: now, accumulatedSeconds: accumulated }
    }));

    setIsTimerRunning(true);
    setCurrentSubject(subject);
    setSessionStartedAt(now);
    return true;
  }, [currentUser, userProfile, storageKey, currentSubject]);

  return {
    isTimerRunning,
    currentSubject,
    elapsedSeconds,
    sessionStartedAt,
    startExistingStudyTimer
  };
}
