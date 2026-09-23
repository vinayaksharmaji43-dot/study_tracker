import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

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
  const [now, setNow] = useState(Date.now());

  // 1. Listen to active study sessions from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'activeStudySessions'),
      where('active', '==', true)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, studentId: d.id, ...d.data() }));
      setRawSessions(docs);
    }, (err) => {
      console.warn("Active study sessions listener warning:", err);
    });

    return () => unsub();
  }, []);

  // 2. Second-by-second local tick for real-time live timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Keep current user's active session continuously alive in Firestore (Heartbeat)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const storageKey = `study_timer_state_${currentUser.uid}`;
    const broadcastHeartbeat = async () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);

        if (saved.isActive && saved.startTimestamp) {
          const elapsed = (saved.accumulatedSeconds || 0) + Math.floor((Date.now() - saved.startTimestamp) / 1000);
          if (elapsed < 18000) { // under 5 hours
            const sessionRef = doc(db, 'activeStudySessions', currentUser.uid);
            await setDoc(sessionRef, {
              studentId: currentUser.uid,
              displayName: userProfile?.name || currentUser.displayName || currentUser.email,
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
  }, [currentUser?.uid, userProfile]);

  // 4. Build activeSessionsMap with live seconds & check stale sessions (< 3 mins)
  const activeSessionsMap = {};

  rawSessions.forEach((s) => {
    const studentId = s.studentId || s.id;
    if (!studentId) return;

    const lastUpdated = s.lastUpdatedAt || s.startedAt || 0;
    // Session is valid if updated in last 3 minutes (180,000 ms)
    if ((now - lastUpdated) < 180000) {
      const startedAt = s.startedAt || (now - ((s.elapsedSeconds || 0) * 1000));
      const elapsedSecs = Math.max(0, Math.floor((now - startedAt) / 1000));

      activeSessionsMap[studentId] = {
        ...s,
        studentId,
        isOnline: true,
        elapsedSeconds: elapsedSecs,
        formattedDuration: formatLiveTimer(elapsedSecs)
      };
    }
  });

  // 5. Always merge current user's local active timer if active right now
  if (currentUser?.uid) {
    try {
      const storageKey = `study_timer_state_${currentUser.uid}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.isActive && saved.startTimestamp) {
          const elapsed = (saved.accumulatedSeconds || 0) + Math.floor((now - saved.startTimestamp) / 1000);
          if (elapsed < 18000) {
            activeSessionsMap[currentUser.uid] = {
              id: currentUser.uid,
              studentId: currentUser.uid,
              displayName: userProfile?.name || currentUser.displayName || currentUser.email || 'Student',
              course: userProfile?.course || 'CA',
              level: userProfile?.level || 'Foundation',
              attempt: userProfile?.attempt || '',
              points: userProfile?.points || 0,
              isOnline: true,
              elapsedSeconds: elapsed,
              formattedDuration: formatLiveTimer(elapsed),
              active: true,
              startedAt: now - (elapsed * 1000),
              subject: saved.selectedSubject || 'General Study'
            };
          }
        } else {
          // Timer explicitly paused or stopped locally
          delete activeSessionsMap[currentUser.uid];
        }
      }
    } catch {
      // Ignore localStorage parse errors
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

  const activeSessionsList = Object.values(activeSessionsMap).sort((a, b) => (b.elapsedSeconds || 0) - (a.elapsedSeconds || 0));

  return {
    activeSessionsMap,
    activeSessionsList,
    isStudentOnline,
    getStudentLiveDuration,
    getStudentLiveSeconds,
    now
  };
}
