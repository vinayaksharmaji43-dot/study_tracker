import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, doc, increment, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatTimerTime, formatDate, getDateKey, getMonthKey, calculateDailyPoints } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { Play, Pause, Square, Clock, BookOpen, CheckCircle, Calendar, ShieldCheck, X, Zap, AlertTriangle } from 'lucide-react';

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
      
      if (subjectNames.length > 0) {
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
            // Reached 5-hour limit while away
            setSeconds(18000);
            setAccumulatedSeconds(0);
            setStartTimestamp(null);
            setIsActive(false);
            localStorage.removeItem(storageKey);
            triggerAutoStop5Hours(18000, saved.selectedSubject);
          } else {
            // Restore running timer
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

  // 2. Accurate timestamp-based timer tick & 5-hour auto-stop check
  useEffect(() => {
    if (isActive && startTimestamp) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const currentElapsed = accumulatedSeconds + Math.floor((now - startTimestamp) / 1000);

        if (currentElapsed >= 18000) {
          clearInterval(intervalRef.current);
          setSeconds(18000);
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
          const attempt = userProfile.attempt || '';
          
          await setDoc(sessionRef, {
            studentId: currentUser.uid,
            displayName: userProfile.name || currentUser.email,
            course,
            level,
            attempt,
            startedAt: Date.now() - (secondsRef.current * 1000),
            lastUpdatedAt: Date.now(),
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

    const qTarget = query(collection(db, 'targets'), where('uid', '==', uid), where('targetDate', '==', todayStr));
    const unsubTarget = onSnapshot(qTarget, (snap) => {
      if (!snap.empty) setTodayTarget({ id: snap.docs[0].id, ...snap.docs[0].data() });
      else setTodayTarget(null);
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

  const todayKey = getDateKey();
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
      case 5: return "🚀 5 Hours Completed! One more hour to unlock +10 points.";
      case 6: return "🏆 6 Hours Completed! +10 Points Unlocked!";
      case 7: return "⚡ 7 Hours Done! +3 Bonus Points Earned.";
      case 8: return "🔥 8 Hours Completed! Another +3 Bonus Points.";
      case 9: return "👑 9 Hours Done! Excellent consistency.";
      case 10: return "💎 10 Hours Completed! Amazing discipline.";
      default: return `🔥 ${hours} Hours Completed! Another +3 Bonus Points.`;
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
            if (h === 6) earned += 10;
            if (h >= 7) earned += 3;
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
        course: userProfile?.course || 'CA Foundation',
        date: serverTimestamp()
      });

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
      alert("5 hours completed! Study Timer has been automatically stopped.");
    } catch (e) {
      console.error("Error auto-saving 5 hour session:", e);
    } finally {
      isAutoSavingRef.current = false;
    }
  };

  // Handle Start / Resume Session
  const handleStart = () => {
    const now = Date.now();
    let currentAccumulated = accumulatedSeconds;

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
            Next: {((todayStats?.completedFullHours || 0) + 1) === 6 ? '6 Hrs → +10' : ((todayStats?.completedFullHours || 0) + 1) > 6 ? `${(todayStats?.completedFullHours || 0) + 1} Hrs → +3` : '6 Hrs → +10'}
          </span>
        </div>
        <div className="p-4 rounded-3xl bg-navy-900 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daily Target</span>
          <span className="text-sm font-bold text-white truncate">{todayTarget ? `${todayTarget.targetValue} Hrs ${todayTarget.subject || 'Target'}` : 'No Target Set'}</span>
          <span className="text-[10px] font-semibold text-slate-500">{todayTarget?.locked ? '🔒 Locked' : ''}</span>
        </div>
        <div className="p-4 rounded-3xl bg-navy-900 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Status</span>
          {todayTarget ? (
            <span className={`text-sm font-bold ${todayTarget.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {todayTarget.status === 'completed' ? '✅ Completed' : '⚠️ Pending'}
            </span>
          ) : (
            <span className="text-sm font-bold text-slate-500">-</span>
          )}
          <span className="text-[10px] font-semibold text-slate-500">Reward: +10 Points</span>
        </div>
      </div>

      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden">
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

        {/* Right Column: History of Logged Sessions */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold-400" />
            Your Study Log History
          </h3>

          {sessions.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No logged sessions yet"
              description="Your completed sessions will be saved here automatically with timestamp and subject breakdown."
            />
          ) : (
            <div className="glass-card rounded-2xl border border-white/10 divide-y divide-white/5 max-h-[460px] overflow-y-auto">
              {sessions.map((sess) => (
                <div key={sess.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">{sess.subject}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gold-400" />
                      <span>{formatDate(sess.date)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-royal-400">
                      {formatTimerTime(sess.duration)}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      +{(sess.duration / 3600 * 10).toFixed(0)} PTS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

    </div>
  );
}
