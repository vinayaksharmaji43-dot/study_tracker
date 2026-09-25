import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, addDoc, doc, increment, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatTimerTime, formatDate, getDateKey, getMonthKey, calculateDailyPoints } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  CheckCircle2,
  Calendar, 
  ShieldCheck, 
  X, 
  Zap, 
  AlertTriangle, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  GraduationCap,
  Lock
} from 'lucide-react';
import CoachingStudyModal from '../components/CoachingStudyModal';
import { isSubjectMatch, calculateTargetProgress } from '../utils/subjectMatcher';

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

function parseStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', attempt: '' };
  const rawCourse = String(userProfile.course || 'CA Foundation').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  
  if (rawCourse.includes('CMA')) course = 'CMA';
  
  const rawLevel = String(userProfile.level || '').toUpperCase();
  if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND')) level = 'Foundation';
  else if (userProfile.level) level = userProfile.level; 
  
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

export default function StudyTimer() {
  const { currentUser, userProfile } = useAuth();
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    if (!userProfile) {
      setLoadingSubjects(false);
      return;
    }
    
    const { course: myCourse, level: myLevel, attempt: myAttemptRaw } = parseStream(userProfile);
    const myAttempt = normalizeAttempt(myAttemptRaw);

    const q = query(
      collection(db, 'timerSubjects'),
      where('course', '==', myCourse),
      where('level', '==', myLevel),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by attempt (All Attempts OR Specific Attempt)
      const attemptFiltered = data.filter(sub => 
        sub.allAttempts || normalizeAttempt(sub.attempt) === myAttempt
      );

      // Sort by order if available, else by name
      attemptFiltered.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.subjectName.localeCompare(b.subjectName);
      });

      const subjectNames = attemptFiltered.map(sub => sub.subjectName);
      setSubjects(subjectNames);
      
      const quickSubject = sessionStorage.getItem('quick_timer_subject');
      if (quickSubject) {
        const match = subjectNames.find(s => isSubjectMatch(s, quickSubject));
        setSelectedSubject(match || quickSubject);
        sessionStorage.removeItem('quick_timer_subject');
      } else if (subjectNames.length > 0) {
        setSelectedSubject(prev => subjectNames.includes(prev) ? prev : subjectNames[0]);
      } else {
        setSelectedSubject('');
      }
      
      setLoadingSubjects(false);
    });

    return () => unsubscribe();
  }, [userProfile?.course, userProfile?.level, userProfile?.attempt]);

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState(null);

  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showTimerDayModal, setShowTimerDayModal] = useState(false);
  const [timerDayDate, setTimerDayDate] = useState(() => new Date());
  const [showCoachingModal, setShowCoachingModal] = useState(false);

  const todayKey = getDateKey(new Date());

  // Only sessions for current stream (using subjects list) and for today
  const todayStreamSessions = useMemo(() => {
    return sessions.filter((sess) => {
      const sDate = sess.date?.toDate ? sess.date.toDate() : (sess.date ? new Date(sess.date) : null);
      if (!sDate) return false;
      if (getDateKey(sDate) !== todayKey) return false;
      return subjects.some(sub => isSubjectMatch(sess.subject, sub));
    });
  }, [sessions, todayKey, subjects]);

  const todaySubjectTotals = useMemo(() => {
    const map = {};
    let totalSeconds = 0;
    todayStreamSessions.forEach((sess) => {
      const sub = (sess.subject || 'General').trim();
      const officialSub = subjects.find(s => isSubjectMatch(sub, s)) || sub;
      const dur = Number(sess.duration) || 0;
      if (!map[officialSub]) map[officialSub] = 0;
      map[officialSub] += dur;
      totalSeconds += dur;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return { list: sorted, totalSeconds };
  }, [todayStreamSessions, subjects]);

  const timerDayKey = getDateKey(timerDayDate);
  const timerDaySessions = useMemo(() => {
    return sessions.filter((sess) => {
      const sDate = sess.date?.toDate ? sess.date.toDate() : (sess.date ? new Date(sess.date) : null);
      if (!sDate) return false;
      if (getDateKey(sDate) !== timerDayKey) return false;
      return subjects.some(sub => isSubjectMatch(sess.subject, sub));
    });
  }, [sessions, timerDayKey, subjects]);

  const timerDayTotals = useMemo(() => {
    const map = {};
    let totalSeconds = 0;
    timerDaySessions.forEach((sess) => {
      const sub = (sess.subject || 'General').trim();
      const officialSub = subjects.find(s => isSubjectMatch(sub, s)) || sub;
      const dur = Number(sess.duration) || 0;
      if (!map[officialSub]) map[officialSub] = 0;
      map[officialSub] += dur;
      totalSeconds += dur;
    });
    return { list: Object.entries(map).sort((a, b) => b[1] - a[1]), totalSeconds };
  }, [timerDaySessions, subjects]);

  const formatHm = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [autoStoppedAlert, setAutoStoppedAlert] = useState(false);
  const [dayOffs, setDayOffs] = useState([]);
  const [activeWarnings, setActiveWarnings] = useState([]);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [showDayOnModal, setShowDayOnModal] = useState(false);
  const [savingDayOff, setSavingDayOff] = useState(false);
  const [dayOffError, setDayOffError] = useState('');

  const [todayStats, setTodayStats] = useState(null);
  const [todayTarget, setTodayTarget] = useState(null);
  const [userTargets, setUserTargets] = useState([]);

  const intervalRef = useRef(null);
  const isAutoSavingRef = useRef(false);

  const storageKey = currentUser?.uid ? `study_timer_state_${currentUser.uid}` : null;

  // 1. Restore saved timer state from localStorage on component mount / user load
  useEffect(() => {
    if (!storageKey) return;

    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved.selectedSubject) {
          setSelectedSubject(saved.selectedSubject);
        }

        const savedAccumulated = saved.accumulatedSeconds || 0;

        if (saved.isActive && saved.startTimestamp) {
          const now = Date.now();
          const elapsed = savedAccumulated + Math.floor((now - saved.startTimestamp) / 1000);

          if (elapsed >= 18000) {
            setSeconds(0);
            setAccumulatedSeconds(0);
            setStartTimestamp(null);
            setIsActive(false);
            localStorage.removeItem(storageKey);
            triggerAutoStop5Hours(18000, saved.selectedSubject);
          } else {
            setAccumulatedSeconds(savedAccumulated);
            setStartTimestamp(saved.startTimestamp);
            setIsActive(true);
            setSeconds(elapsed);
          }
        } else {
          // Restore paused / idle state
          setAccumulatedSeconds(savedAccumulated);
          setStartTimestamp(null);
          setIsActive(false);
          setSeconds(savedAccumulated);
        }
      }
    } catch (e) {
      console.warn("Could not restore saved timer state:", e);
    }
  }, [storageKey]);

  // 2. Accurate timestamp-based timer tick with a 5-hour session limit
  useEffect(() => {
    if (isActive && startTimestamp) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const currentElapsed = accumulatedSeconds + Math.floor((now - startTimestamp) / 1000);

        if (currentElapsed >= 18000) {
          clearInterval(intervalRef.current);
          setSeconds(0);
          setIsActive(false);
          setStartTimestamp(null);
          setAccumulatedSeconds(0);
          if (storageKey) localStorage.removeItem(storageKey);
          triggerAutoStop5Hours(18000, selectedSubject);
        } else {
          setSeconds(currentElapsed);
          // Persist running state continuously to localStorage
          if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify({
              selectedSubject,
              isActive: true,
              accumulatedSeconds,
              startTimestamp
            }));
          }
        }
      }, 500);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, startTimestamp, accumulatedSeconds, selectedSubject, storageKey]);

  // Listen for programmatic start commands (e.g. from Webcam Study)
  useEffect(() => {
    const handleRemoteStart = (e) => {
      const { subject, startTimestamp: remoteStart, accumulatedSeconds: remoteAccumulated } = e.detail || {};
      if (subject) setSelectedSubject(subject);
      setStartTimestamp(remoteStart || Date.now());
      setAccumulatedSeconds(remoteAccumulated || 0);
      setIsActive(true);
      setSavedSuccess(false);
      setAutoStoppedAlert(false);
    };

    window.addEventListener('study-timer-start-command', handleRemoteStart);
    return () => window.removeEventListener('study-timer-start-command', handleRemoteStart);
  }, []);

  // Live Study Broadcast
  const secondsRef = useRef(seconds);
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return;

    const sessionRef = doc(db, 'activeStudySessions', currentUser.uid);
    let intervalId;

    const broadcastPresence = async () => {
      if (isActive) {
        try {
          const course = userProfile.course || 'CA';
          const level = userProfile.level || 'Foundation';
          const currentContinuous = startTimestamp ? Math.floor((Date.now() - startTimestamp) / 1000) : 0;
          const currentFocusSecs = Math.max(currentContinuous, secondsRef.current || 0);

          await setDoc(sessionRef, {
            studentId: currentUser.uid,
            displayName: userProfile.name || currentUser.email,
            course,
            level,
            attempt,
            points: userProfile.points || 0,
            subject: selectedSubject || '',
            startedAt: Date.now() - (secondsRef.current * 1000),
            lastUpdatedAt: Date.now(),
            maxFocusSecs: currentFocusSecs,
            active: true
          }, { merge: true });
        } catch (e) {
          console.warn("Failed to broadcast live session", e);
        }
      }
    };

    if (isActive) {
      broadcastPresence();
      intervalId = setInterval(broadcastPresence, 30000);
    } else {
      updateDoc(sessionRef, { active: false, lastUpdatedAt: Date.now() }).catch(() => {});
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, currentUser, userProfile]);

  // Real-time listener for study sessions
  useEffect(() => {
    if (!currentUser?.uid) return;
    const uid = currentUser.uid;
    const todayStr = getDateKey(new Date());

    const q = query(collection(db, 'studySessions'), where('uid', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dbDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dbDate - da;
      });
      setSessions(docs);
    });

    const qStats = query(collection(db, 'studyDailyStats'), where('studentId', '==', uid), where('date', '==', todayStr));
    const unsubStats = onSnapshot(qStats, (snap) => {
      if (!snap.empty) setTodayStats({ id: snap.docs[0].id, ...snap.docs[0].data() });
      else setTodayStats(null);
    });

    const qTarget = query(collection(db, 'targets'), where('uid', '==', uid));
    const unsubTarget = onSnapshot(qTarget, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUserTargets(docs);
      const today = docs.find(d => d.targetDate === todayStr);
      setTodayTarget(today || null);
    });

    return () => { unsubscribe(); unsubStats(); unsubTarget(); };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const dayOffQuery = collection(db, 'dayOffs', currentUser.uid, 'records');

    return onSnapshot(dayOffQuery, (snapshot) => {
      setDayOffs(snapshot.docs
        .map(dayOffDoc => ({ id: dayOffDoc.id, ...dayOffDoc.data() }))
        .filter(dayOff => dayOff.monthKey === getMonthKey()));
    }, (error) => console.error('Day Off subscription error:', error));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const warningsQuery = query(
      collection(db, 'warnings'),
      where('uid', '==', currentUser.uid)
    );

    return onSnapshot(warningsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveWarnings(docs.filter(w => w.status === 'active'));
    }, (error) => console.error('Warnings subscription error:', error));
  }, [currentUser]);


  const currentMonthKey = getMonthKey();
  const todayDayOff = dayOffs.find(dayOff => dayOff.dateKey === todayKey && dayOff.status === 'active');
  const dayOffsUsed = dayOffs.filter(dayOff => dayOff.status === 'active').length;
  const remainingDayOffs = Math.max(0, 7 - dayOffsUsed);

  const handleConfirmDayOff = async () => {
    if (!currentUser?.uid || todayDayOff || dayOffsUsed >= 7) return;

    const now = new Date();
    const usageId = `${currentUser.uid}_${currentMonthKey}`;
    const dayOffData = {
      uid: currentUser.uid,
      dateKey: todayKey,
      monthKey: currentMonthKey,
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      monthlyUsageId: usageId,
      status: 'active',
      createdAt: serverTimestamp()
    };

    try {
      setSavingDayOff(true);
      setDayOffError('');
      await runTransaction(db, async (transaction) => {
        const usageRef = doc(db, 'dayOffUsage', currentUser.uid, 'months', currentMonthKey);
        const dayOffRef = doc(db, 'dayOffs', currentUser.uid, 'records', todayKey);
        const usageSnapshot = await transaction.get(usageRef);
        const dayOffSnapshot = await transaction.get(dayOffRef);
        if (dayOffSnapshot.exists() && dayOffSnapshot.data()?.status === 'active') {
          throw new Error('TODAY_ALREADY_ACTIVE');
        }

        const currentUsage = usageSnapshot.exists() ? usageSnapshot.data() : null;
        if ((currentUsage?.used || 0) >= 7) throw new Error('MONTHLY_LIMIT_REACHED');

        transaction.set(dayOffRef, dayOffData);
        if (currentUsage) {
          transaction.update(usageRef, { used: increment(1), updatedAt: serverTimestamp() });
        } else {
          transaction.set(usageRef, {
            uid: currentUser.uid,
            monthKey: currentMonthKey,
            year: now.getUTCFullYear(),
            month: now.getUTCMonth() + 1,
            used: 1,
            updatedAt: serverTimestamp()
          });
        }
      });
      setShowDayOffModal(false);
    } catch (error) {
      console.error('Error activating Day Off:', error);
      setDayOffError(error.message === 'TODAY_ALREADY_ACTIVE'
        ? 'Day Off is already active for today.'
        : error.message === 'MONTHLY_LIMIT_REACHED'
          ? 'Monthly limit reached (7/7).'
          : (error.message || 'Failed to activate Day Off. Please try again.'));
    } finally {
      setSavingDayOff(false);
    }
  };

  const handleCancelDayOff = async () => {
    if (!currentUser?.uid || !todayDayOff) return;

    try {
      setSavingDayOff(true);
      setDayOffError('');
      await runTransaction(db, async (transaction) => {
        const usageRef = doc(db, 'dayOffUsage', currentUser.uid, 'months', currentMonthKey);
        const dayOffRef = doc(db, 'dayOffs', currentUser.uid, 'records', todayKey);

        const usageSnapshot = await transaction.get(usageRef);
        const dayOffSnapshot = await transaction.get(dayOffRef);

        if (!dayOffSnapshot.exists() || dayOffSnapshot.data()?.status !== 'active') {
          throw new Error('NO_ACTIVE_DAY_OFF');
        }

        transaction.delete(dayOffRef);

        if (usageSnapshot.exists()) {
          const currentUsed = usageSnapshot.data().used || 1;
          const newUsed = Math.max(0, currentUsed - 1);
          transaction.update(usageRef, { used: newUsed, updatedAt: serverTimestamp() });
        }
      });
      setShowDayOnModal(false);
    } catch (error) {
      console.error('Error deactivating Day Off:', error);
      setDayOffError(error.message === 'NO_ACTIVE_DAY_OFF'
        ? 'No active Day Off found for today.'
        : (error.message || 'Failed to turn Day On. Please try again.'));
    } finally {
      setSavingDayOff(false);
    }
  };

  // Helper function to save completed session to Firestore
  const [milestoneMessages, setMilestoneMessages] = useState([]);

  useEffect(() => {
    if (milestoneMessages.length > 0) {
      const timer = setTimeout(() => setMilestoneMessages([]), 8000);
      return () => clearTimeout(timer);
    }
  }, [milestoneMessages]);

  const getMilestoneMessage = (hours) => {
    switch (hours) {
      case 1: return "⏱️ 1 Hour Completed! Keep going — consistency wins.";
      case 2: return "🔥 2 Hours Done! You're building momentum.";
      case 3: return "💪 3 Hours Completed! Keep pushing.";
      case 4: return "🎯 4 Hours Done! Keep the consistency going.";
      case 5: return "🚀 5 Hours Completed! One more hour to unlock +5 points.";
      case 6: return "🏆 6 Hours Completed! +5 Points Unlocked!";
      case 7: return "⚡ 7 Hours Done! +2 Bonus Points Earned.";
      case 8: return "🔥 8 Hours Completed! Another +2 Bonus Points.";
      case 9: return "👑 9 Hours Done! Excellent consistency.";
      case 10: return "💎 10 Hours Completed! Amazing discipline.";
      default: return `🔥 ${hours} Hours Completed! Another +2 Bonus Points.`;
    }
  };

  const saveSessionToFirestore = async (durationSecs, targetSubject) => {
    if (!currentUser?.uid) return;
    const durationHours = durationSecs / 3600;
    const todayStr = getDateKey(new Date());

    try {
      const { newMilestones, pointsEarned } = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', currentUser.uid);
        const statRef = doc(db, 'studyDailyStats', `${currentUser.uid}_${todayStr}`);
        
        const statDoc = await transaction.get(statRef);
        let prevTotalSecs = 0;
        let completedMilestones = [];
        
        if (statDoc.exists()) {
          prevTotalSecs = statDoc.data().totalStudySeconds || 0;
          completedMilestones = statDoc.data().completedMilestones || [];
        }

        const newTotalSecs = prevTotalSecs + durationSecs;
        const newFullHours = Math.floor(newTotalSecs / 3600);
        
        let earned = 0;
        let newlyUnlocked = [];

        for (let h = 1; h <= newFullHours; h++) {
          if (!completedMilestones.includes(h)) {
            newlyUnlocked.push(h);
            completedMilestones.push(h);
            if (h === 6) earned += 5;
            if (h >= 7) earned += 2;
          }
        }

        transaction.set(statRef, {
          studentId: currentUser.uid,
          date: todayStr,
          totalStudySeconds: newTotalSecs,
          completedFullHours: newFullHours,
          dailyStudyPoints: increment(earned),
          completedMilestones,
          lowStudyPenaltyApplied: statDoc.exists() ? statDoc.data().lowStudyPenaltyApplied || false : false
        }, { merge: true });

        if (earned > 0) {
          const txRef = doc(collection(db, 'pointTransactions'));
          transaction.set(txRef, {
            studentId: currentUser.uid,
            amount: earned,
            type: 'reward',
            reason: `Study Milestones: ${newlyUnlocked.join(', ')} Hours`,
            sourceId: `timer_${todayStr}`,
            date: todayStr,
            createdAt: serverTimestamp()
          });

          transaction.update(userRef, {
            studyHours: increment(durationHours),
            points: increment(earned)
          });
        } else {
          transaction.update(userRef, {
            studyHours: increment(durationHours)
          });
        }
        
        return { newMilestones: newlyUnlocked, pointsEarned: earned };
      });

      await addDoc(collection(db, 'studySessions'), {
        uid: currentUser.uid,
        subject: targetSubject || selectedSubject,
        duration: durationSecs,
        maxFocusSecs: durationSecs,
        course: userProfile?.course || 'CA Foundation',
        date: serverTimestamp()
      });

      // Increment studiedSeconds on matching incomplete targets
      try {
        const savedSub = targetSubject || selectedSubject;
        const matchingTargets = userTargets.filter(t => 
          (t.status !== 'completed' && !t.completed) && isSubjectMatch(t.subject, savedSub)
        );
        for (const t of matchingTargets) {
          const tRef = doc(db, 'targets', t.id);
          await updateDoc(tRef, {
            studiedSeconds: increment(durationSecs),
            lastStudiedAt: serverTimestamp()
          });
        }
      } catch (tErr) {
        console.warn("Could not update target studiedSeconds:", tErr);
      }

      if (newMilestones.length > 0) {
        const msgs = newMilestones.map(h => getMilestoneMessage(h));
        setMilestoneMessages(msgs);
      }

    } catch (err) {
      console.error("Error saving session in transaction:", err);
      throw err;
    }
  };

  // Auto-stop 5-hour limit handler
  const triggerAutoStop5Hours = async (durationSecs, subjectToSave) => {
    if (isAutoSavingRef.current) return;
    isAutoSavingRef.current = true;

    try {
      await saveSessionToFirestore(durationSecs, subjectToSave || selectedSubject);
      setAutoStoppedAlert(true);
      alert("5 hours completed! Timer automatically stopped. Press Start to continue studying.");
    } catch (e) {
      console.error("Error auto-saving 5 hour session:", e);
    } finally {
      isAutoSavingRef.current = false;
    }
  };

  // Handle Start / Resume Session
  const handleStart = async () => {
    const now = Date.now();
    let currentAccumulated = accumulatedSeconds;

    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          lastActiveAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('Could not update study activity:', error);
      }
    }

    if (seconds === 0) {
      currentAccumulated = 0;
      setAccumulatedSeconds(0);
    } else {
      currentAccumulated = seconds;
      setAccumulatedSeconds(seconds);
    }

    setStartTimestamp(now);
    setIsActive(true);
    setSavedSuccess(false);
    setAutoStoppedAlert(false);

    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedSubject,
        isActive: true,
        accumulatedSeconds: currentAccumulated,
        startTimestamp: now
      }));
    }
  };

  // Handle Pause Session
  const handlePause = () => {
    const now = Date.now();
    let currentElapsed = seconds;
    if (startTimestamp) {
      currentElapsed = accumulatedSeconds + Math.floor((now - startTimestamp) / 1000);
    }

    setIsActive(false);
    setStartTimestamp(null);
    setAccumulatedSeconds(currentElapsed);
    setSeconds(currentElapsed);

    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedSubject,
        isActive: false,
        accumulatedSeconds: currentElapsed,
        startTimestamp: null
      }));
    }
  };

  // Handle Subject Change
  const handleSubjectChange = (newSubject) => {
    setSelectedSubject(newSubject);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedSubject: newSubject,
        isActive,
        accumulatedSeconds,
        startTimestamp
      }));
    }
  };

  // Handle Stop & Save Session
  const handleStopAndSave = async () => {
    let finalSeconds = seconds;
    if (isActive && startTimestamp) {
      finalSeconds = accumulatedSeconds + Math.floor((Date.now() - startTimestamp) / 1000);
    }

    if (finalSeconds < 5) {
      alert("Session is too short to save (minimum 5 seconds).");
      setIsActive(false);
      setStartTimestamp(null);
      setAccumulatedSeconds(0);
      setSeconds(0);
      if (storageKey) localStorage.removeItem(storageKey);
      return;
    }

    try {
      setSaving(true);
      setIsActive(false);

      const sessionDuration = Math.min(finalSeconds, 18000);
      await saveSessionToFirestore(sessionDuration, selectedSubject);

      setSeconds(0);
      setAccumulatedSeconds(0);
      setStartTimestamp(null);
      if (storageKey) localStorage.removeItem(storageKey);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving study session:", err);
      alert("Failed to save session. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const activeSubjectTarget = userTargets.find(t => 
    (t.status !== 'completed' && !t.completed) && isSubjectMatch(t.subject, selectedSubject)
  );

  const activeSubjectProgress = activeSubjectTarget
    ? calculateTargetProgress(activeSubjectTarget, sessions, {
        isActive,
        startTimestamp,
        accumulatedSeconds,
        selectedSubject
      })
    : null;

  return (
    <div className="space-y-8">
      
      {/* Official Admin Warnings Alert if present */}
      {activeWarnings.length > 0 && (
        <div className="space-y-3">
          {activeWarnings.map((warn) => (
            <div key={warn.id} className="p-5 rounded-3xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start gap-4 shadow-xl">
              <AlertTriangle className="w-6 h-6 text-rose-400 mt-0.5 shrink-0 animate-pulse" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-300 uppercase tracking-wider">⚠️ Official Admin Warning</span>
                  <span className="text-[11px] text-rose-400/80">{formatDate(warn.issuedAt)}</span>
                </div>
                <div className="text-sm font-bold text-white">{warn.reason || 'Minimum study hour threshold not met'}</div>
                {warn.message && <div className="text-xs text-rose-200/90 bg-navy-950/40 p-2.5 rounded-xl border border-rose-500/20">{warn.message}</div>}
                <div className="text-xs text-rose-300 font-medium pt-1">
                  Please ensure you complete at least 6+ hours of study daily to fulfill target requirements.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact Daily Progress Area */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-navy-900 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Study Time</span>
          <span className="text-lg font-black text-white">{todayStats ? formatTimerTime(todayStats.totalStudySeconds) : '0h 00m 00s'}</span>
        </div>
        <div className="p-4 rounded-3xl bg-navy-900 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Points</span>
          <span className="text-lg font-black text-emerald-400">+{todayStats?.dailyStudyPoints || 0}</span>
          <span className="text-[10px] font-semibold text-slate-500">
            Next: {((todayStats?.completedFullHours || 0) + 1) === 6 ? '6 Hrs → +5' : ((todayStats?.completedFullHours || 0) + 1) > 6 ? `${(todayStats?.completedFullHours || 0) + 1} Hrs → +2` : '6 Hrs → +5'}
          </span>
        </div>
        <div className="p-4 rounded-3xl bg-navy-900 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subject Target</span>
            {activeSubjectProgress && (
              <span className={`text-[10px] font-black ${activeSubjectProgress.isEligible ? 'text-emerald-400' : 'text-gold-400'}`}>
                {activeSubjectProgress.progressPct}%
              </span>
            )}
          </div>
          {activeSubjectTarget ? (
            <div className="space-y-1">
              <span className="text-sm font-bold text-white truncate block" title={activeSubjectTarget.subject}>
                {activeSubjectTarget.targetValue || activeSubjectTarget.targetHours}h {activeSubjectTarget.subject}
              </span>
              <div className="w-full bg-navy-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-300 ${activeSubjectProgress?.isEligible ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-gold-500'}`}
                  style={{ width: `${activeSubjectProgress?.progressPct || 0}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-400 block truncate">
                {activeSubjectProgress?.studiedHuman} / {activeSubjectProgress?.targetHuman} • {activeSubjectProgress?.isEligible ? '🎯 Target Met!' : `${activeSubjectProgress?.remainingHuman} left`}
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-400 truncate block">No Target for {selectedSubject || 'Subject'}</span>
              <span className="text-[10px] font-semibold text-slate-500 block">Set in Self-Manage Hub</span>
            </div>
          )}
        </div>
        <div className="p-4 rounded-3xl bg-navy-900 border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Target Status</span>
          {activeSubjectTarget ? (
            <div className="space-y-0.5">
              <span className={`text-sm font-bold flex items-center gap-1.5 ${activeSubjectProgress?.isEligible ? 'text-emerald-400' : 'text-amber-400'}`}>
                {activeSubjectProgress?.isEligible ? '🎯 Ready to Complete' : '⏳ In Progress'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Reward: <strong className="text-emerald-400">+3 Points</strong>
              </span>
            </div>
          ) : todayTarget ? (
            <div className="space-y-0.5">
              <span className={`text-sm font-bold ${todayTarget.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {todayTarget.status === 'completed' ? '✅ Completed' : '⚠️ Pending'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">Reward: +3 Points</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-500">-</span>
              <span className="text-[10px] font-semibold text-slate-500">Reward: +3 Points</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-400 text-xs font-bold border border-royal-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>Precision Session Tracker</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Academic <span className="gold-gradient-text">Study Timer</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Select your subject, start the stopwatch, and log real study hours to gain verified points.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            onClick={() => setShowCoachingModal(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-black flex items-center gap-2.5 transition-all shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] cursor-pointer group"
          >
            <GraduationCap className="w-5 h-5 text-indigo-200 group-hover:scale-110 transition-transform" />
            <span>Coaching Study</span>
            {userProfile?.coachingStudyAccess ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Access Approved"></span>
            ) : (
              <Lock className="w-3.5 h-3.5 text-indigo-200 ml-0.5 opacity-80" />
            )}
          </button>
        </div>
      </div>

      {/* 🎓 COACHING STUDY TIME TRACKER CARD */}
      <div 
        onClick={() => setShowCoachingModal(true)}
        className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-navy-900 to-purple-950/70 border border-indigo-500/30 hover:border-indigo-500/60 shadow-xl hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-glow-indigo group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white group-hover:text-indigo-200 transition-colors">
                  Coaching Study Time Tracker
                </h3>
                {userProfile?.coachingStudyAccess ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Approval Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Log your offline coaching lectures directly into daily study hours & earn milestone points.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <span className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-glow-indigo">
              <span>Log Coaching Study</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Timer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Timer Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-8 rounded-3xl glass-card border border-white/10 text-center space-y-8 relative overflow-hidden shadow-2xl">
            
            {/* Subject Selector */}
            <div className="space-y-2 max-w-md mx-auto">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Subject for Timer Session
              </label>
              {loadingSubjects ? (
                <div className="w-full py-3.5 px-4 rounded-2xl bg-navy-900 border border-white/15 text-slate-400 text-sm">
                  Loading subjects...
                </div>
              ) : subjects.length > 0 ? (
                <select
                  value={selectedSubject}
                  disabled={isActive}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-navy-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-royal-500 cursor-pointer disabled:opacity-60"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-sm">
                  No subjects are currently available for your stream.
                </div>
              )}
            </div>

            {/* Timer Clock Display */}
            <div className="py-6">
              <div className="inline-block relative">
                {/* Glowing Ring */}
                <div className={`absolute -inset-6 rounded-full blur-2xl transition-all duration-500 ${
                  isActive ? 'bg-royal-500/25 scale-105' : 'bg-transparent'
                }`} />

                <div className="relative z-10 font-mono text-6xl sm:text-7xl font-black tracking-tight text-white drop-shadow-lg">
                  {formatTimerTime(seconds)}
                </div>
                <div className="text-xs text-slate-400 mt-2 font-medium">
                  {isActive ? 'Session Active — Time Recording...' : seconds > 0 ? 'Session Paused' : 'Ready to Start'}
                </div>
              </div>
            </div>

            {/* 5-Hour Auto Stop Alert */}
            {autoStoppedAlert && (
              <div className="p-4 rounded-xl bg-gold-500/20 border border-gold-500/40 text-gold-300 text-sm font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-300">
                <CheckCircle className="w-5 h-5 text-gold-400" />
                <span>5 hours completed! Study Timer has been automatically stopped.</span>
              </div>
            )}

            {/* Milestone Messages */}
            {milestoneMessages.length > 0 && (
              <div className="space-y-2 mb-2">
                {milestoneMessages.map((msg, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-sm font-semibold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Success Toast */}
            {savedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-300">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Session saved! Study hours and points updated.</span>
              </div>
            )}

            {/* Timer Control Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-white/10">
              {!isActive ? (
                <button
                  onClick={handleStart}
                  disabled={Boolean(todayDayOff) || subjects.length === 0}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white font-black text-base shadow-glow-blue hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>{seconds > 0 ? 'Resume Session' : 'Start Session'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-navy-950 font-black text-base shadow-glow-gold hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Pause className="w-5 h-5 fill-navy-950" />
                  <span>Pause Session</span>
                </button>
              )}

              {seconds > 0 && (
                <button
                  onClick={handleStopAndSave}
                  disabled={saving}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-base shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Square className="w-5 h-5 fill-white" />
                  <span>{saving ? 'Saving...' : 'Stop & Save'}</span>
                </button>
              )}
            </div>

            {/* Your Timer Day Button */}
            <div className="pt-5 border-t border-white/10 text-center">
              <button
                onClick={() => setShowTimerDayModal(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600/30 hover:to-purple-500/30 border border-purple-500/30 text-purple-300 font-bold text-sm sm:text-base shadow-glow-purple hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                <span>Your Timer Day</span>
              </button>
            </div>

            <div className="pt-5 border-t border-white/10 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-white">{todayDayOff ? 'Day Off Active' : 'Day Off'}</div>
                    <div className="text-xs text-slate-300 mt-1">
                      {todayDayOff ? "You're all set for today. No study penalty will be applied." : `${dayOffsUsed}/7 used this month`}
                    </div>
                    {todayDayOff && <div className="text-xs text-amber-300 mt-1">Day Offs used this month: {dayOffsUsed}/7</div>}
                  </div>
                </div>
                {todayDayOff ? (
                  <button
                    onClick={() => { setDayOffError(''); setShowDayOnModal(true); }}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black hover:bg-emerald-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Turn Day On</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setDayOffError(''); setShowDayOffModal(true); }}
                    disabled={dayOffsUsed >= 7 || isActive}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-black hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {dayOffsUsed >= 7 ? 'Monthly limit reached (7/7)' : 'Take Day Off'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Today's Daily Study Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
             <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                         <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-white leading-tight">Today's Study</h3>
                         <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                           {userProfile?.course || 'CA'} {userProfile?.level || 'Foundation'}
                         </span>
                      </div>
                   </div>
                </div>

                <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/5 text-center space-y-1">
                   <div className="text-3xl font-black text-white font-mono">{formatHm(todaySubjectTotals.totalSeconds)}</div>
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Stream Study Time</div>
                </div>

                <div className="pt-2">
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Subjects Studied</h4>
                   {todaySubjectTotals.list.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-sm border border-white/5 rounded-2xl bg-white/5">
                         You haven't recorded any sessions for today yet.
                      </div>
                   ) : (
                      <div className="space-y-3">
                         {todaySubjectTotals.list.map(([sub, dur]) => (
                            <div key={sub} className="flex items-center justify-between p-3.5 rounded-2xl bg-navy-900/50 border border-white/5">
                               <div className="font-semibold text-slate-300 text-sm truncate pr-4">{sub.split(':')[0]}</div>
                               <div className="font-mono text-emerald-400 font-bold text-sm shrink-0">{formatHm(dur)}</div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* Your Timer Day Modal */}
      {showTimerDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-purple-500/30 shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-navy-900/95 backdrop-blur-md z-10 border-b border-white/10">
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    Your Timer Day
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                    {userProfile?.course || 'CA'} {userProfile?.level || 'Foundation'}
                  </p>
                </div>
                <button onClick={() => setShowTimerDayModal(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date Navigation */}
              <div className="px-6 pb-4 flex items-center justify-between">
                <button 
                  onClick={() => setTimerDayDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 1); return nd; })}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
                >
                  ← Prev Day
                </button>
                <div className="text-sm font-black text-gold-400">
                  {timerDayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <button 
                  onClick={() => setTimerDayDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 1); return nd; })}
                  disabled={getDateKey(timerDayDate) >= getDateKey(new Date())}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next Day →
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">Total Study</div>
                <div className="text-3xl font-black text-white font-mono">{formatHm(timerDayTotals.totalSeconds)}</div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Subject-wise Study</h4>
                {timerDayTotals.list.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm border border-white/5 rounded-2xl bg-navy-900/50">
                    No study sessions recorded for this day.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timerDayTotals.list.map(([sub, dur]) => (
                      <div key={sub} className="flex flex-col p-4 rounded-2xl bg-navy-900/80 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-royal-400" />
                          <span className="font-bold text-white text-sm">{sub}</span>
                        </div>
                        <div className="font-mono text-emerald-400 font-bold text-sm">
                          {formatHm(dur)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules Section */}
      <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-navy-900 border border-white/5 space-y-6">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-royal-400" />
          Study Timer Rules & Points System
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rewards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Positive Points (Rewards)
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span><strong>6 Hours Complete:</strong> +5 Points (One-time daily milestone)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span><strong>7+ Hours:</strong> +2 Points per additional hour</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-slate-400 mt-2">
                Note: Milestones (1-5 hours) give no points, only messages. Each timer session auto-stops at 5 hours; press Start again to continue. Streaks grow only on days with 4+ hours studied.
              </li>
            </ul>
          </div>
          
          {/* Penalties */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Negative Points (Penalties)
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-0.5">•</span>
                <span><strong>Missed Target:</strong> -3 Points per incomplete past target</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-0.5">•</span>
                <span><strong>Low Study Day:</strong> -3 Points if you study less than 4 hours in a day</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-slate-400 mt-2">
                Note: Penalties are checked and applied automatically when you log in the next day.
              </li>
            </ul>
          </div>

          {/* Exemptions */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Exemptions (Day Off)
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span><strong>No Penalty:</strong> If you mark a Day Off, you will not receive penalties for missed targets or low study hours.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span><strong>Monthly Limit:</strong> You are allowed a maximum of 7 Day Offs per month.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>


      {showDayOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-amber-500/30 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Take a Day Off?</h2>
                <p className="text-sm text-slate-300 mt-2">You won't be penalized for not studying today. You have {remainingDayOffs} Day Offs remaining this month.</p>
              </div>
              <button onClick={() => setShowDayOffModal(false)} className="text-slate-400 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            {dayOffError && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{dayOffError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowDayOffModal(false)} className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancel</button>
              <button onClick={handleConfirmDayOff} disabled={savingDayOff} className="w-full py-3 rounded-xl bg-amber-500 text-navy-950 text-sm font-black hover:bg-amber-400 disabled:opacity-50">{savingDayOff ? 'Confirming...' : 'Confirm Day Off'}</button>
            </div>
          </div>
        </div>
      )}

      {showDayOnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Turn Day On?
                </h2>
                <p className="text-sm text-slate-300 mt-2">This will cancel your Day Off for today, restore 1 Day Off back to your monthly quota, and allow you to record your study sessions.</p>
              </div>
              <button onClick={() => setShowDayOnModal(false)} className="text-slate-400 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            {dayOffError && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{dayOffError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowDayOnModal(false)} className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Keep Day Off</button>
              <button onClick={handleCancelDayOff} disabled={savingDayOff} className="w-full py-3 rounded-xl bg-emerald-500 text-navy-950 text-sm font-black hover:bg-emerald-400 disabled:opacity-50">{savingDayOff ? 'Turning Day On...' : 'Confirm Day On'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Coaching Study Modal */}
      <CoachingStudyModal 
        isOpen={showCoachingModal} 
        onClose={() => setShowCoachingModal(false)} 
        subjects={subjects} 
      />

    </div>
  );
}
