import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  increment, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getDateKey, formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Award, 
  Filter, 
  Sparkles, 
  AlertTriangle, 
  Lock, 
  FileText,
  Clock,
  Play,
  History,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  TrendingUp,
  X
} from 'lucide-react';
import TestTracker from './TestTracker';
import { isSubjectMatch, calculateTargetProgress, formatDurationHuman } from '../utils/subjectMatcher';
import { calculateCombinedDailyStudy, syncDailyPointsAndEligibility } from '../services/pointsService';
import { useTheme } from '../contexts/ThemeContext';

const CA_SUBJECTS = [
  'Paper 1: Accounting',
  'Paper 2: Business Laws',
  'Paper 3: Quantitative Aptitude',
  'Paper 4: Business Economics'
];

const CMA_SUBJECTS = [
  'Financial Accounting',
  'Cost Accounting',
  'Laws & Ethics',
  'Direct & Indirect Taxation'
];

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

export default function Targets({ setActiveTab }) {
  const { currentUser, userProfile } = useAuth();
  const { isEyeCare } = useTheme();
  const defaultSubjects = userProfile?.course === 'CMA' ? CMA_SUBJECTS : CA_SUBJECTS;

  const [hubTab, setHubTab] = useState('targets'); // 'targets', 'test_tracker'
  const [testSummary, setTestSummary] = useState({ attempted: 0, avgScore: 0, bestScore: 0 });

  const [subjects, setSubjects] = useState(defaultSubjects);
  const [targets, setTargets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [targetTransactions, setTargetTransactions] = useState([]);
  const [activeTimerState, setActiveTimerState] = useState(null);
  const [ticker, setTicker] = useState(0);

  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed', 'missed'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [incompleteModalData, setIncompleteModalData] = useState(null);
  const [rewardToast, setRewardToast] = useState(null);

  // New Target Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(defaultSubjects[0]);
  const [targetHours, setTargetHours] = useState('2.0');
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState('stream');
  const [customSubject, setCustomSubject] = useState('');
  const [topicName, setTopicName] = useState('');
  const [tasksRequired, setTasksRequired] = useState({ mcq: false, dpp: false, notes: false, practice: false });
  const [plannedTime, setPlannedTime] = useState('');

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showAddModal || showWarningModal || incompleteModalData || showHistoryModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showAddModal, showWarningModal, incompleteModalData, showHistoryModal]);

  // 1. Fetch subjects from timerSubjects to ensure exact subject matching with Study Timer
  useEffect(() => {
    if (!userProfile) return;
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
      const attemptFiltered = data.filter(sub => 
        sub.allAttempts || normalizeAttempt(sub.attempt) === myAttempt
      );
      attemptFiltered.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.subjectName.localeCompare(b.subjectName);
      });
      const subjectNames = attemptFiltered.map(sub => sub.subjectName);
      if (subjectNames.length > 0) {
        setSubjects(subjectNames);
        setSubject(prev => subjectNames.includes(prev) ? prev : subjectNames[0]);
      }
    });

    return () => unsubscribe();
  }, [userProfile?.course, userProfile?.level, userProfile?.attempt]);

  // 2. Listen to studentTests for compact summary widget
  useEffect(() => {
    if (!currentUser?.uid) return;
    const qTest = query(collection(db, 'studentTests'), where('studentId', '==', currentUser.uid));
    const unsubTest = onSnapshot(qTest, (snap) => {
      const docs = snap.docs.map(d => d.data());
      const completed = docs.filter(t => t.status === 'Completed');
      const attempted = docs.length;
      let avgScore = 0;
      let bestScore = 0;
      if (completed.length > 0) {
        const totalObt = completed.reduce((s, t) => s + (t.marksObtained || 0), 0);
        const totalTot = completed.reduce((s, t) => s + (t.totalMarks || 0), 0);
        avgScore = totalTot > 0 ? (totalObt / totalTot) * 100 : 0;
        const pcts = completed.map(t => t.percentage).filter(p => !isNaN(p));
        if (pcts.length > 0) bestScore = Math.max(...pcts);
      }
      setTestSummary({ attempted, avgScore, bestScore });
    });
    return () => unsubTest();
  }, [currentUser]);

  // 3. Listen to Firestore targets
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'targets'),
      where('uid', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : (a.date?.toDate ? a.date.toDate() : new Date());
        const dbDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.date?.toDate ? b.date.toDate() : new Date());
        return dbDate - da;
      });
      setTargets(docs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 4. Listen to studySessions for subject-wise actual recorded time
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'studySessions'),
      where('uid', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(docs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 5. Listen to target pointTransactions for Points History
  useEffect(() => {
    if (!currentUser?.uid) return;

    const qTx = query(
      collection(db, 'pointTransactions'),
      where('studentId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(qTx, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const targetOnly = docs.filter(tx => 
        (tx.reason && tx.reason.toLowerCase().includes('target')) || 
        (tx.sourceId && targets.some(t => t.id === tx.sourceId))
      );
      targetOnly.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date || 0);
        const dbDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date || 0);
        return dbDate - da;
      });
      setTargetTransactions(targetOnly);
    });

    return () => unsubscribe();
  }, [currentUser, targets]);

  // 6. Track active timer state from localStorage & 1s interval ticker
  useEffect(() => {
    if (!currentUser?.uid) return;
    const storageKey = `study_timer_state_${currentUser.uid}`;

    const readTimerState = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setActiveTimerState(parsed);
        } else {
          setActiveTimerState(null);
        }
      } catch (e) {
        setActiveTimerState(null);
      }
    };

    readTimerState();

    const interval = setInterval(() => {
      readTimerState();
      setTicker(t => t + 1);
    }, 1000);

    const handleStorage = (e) => {
      if (e.key === storageKey) readTimerState();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

  
  const handleConfirmTarget = async (e) => {
    if(e && e.preventDefault) e.preventDefault();
    if (!title.trim()) return;
    
    const finalSubject = category === 'stream' ? subject : customSubject.trim();
    if (!finalSubject) {
      alert("Please enter or select a subject.");
      return;
    }

    try {
      setSubmitting(true);
      const todayStr = getDateKey(new Date());

      await addDoc(collection(db, 'targets'), {
        uid: currentUser.uid,
        title: title.trim(),
        category,
        subject: finalSubject,
        topicName: topicName.trim(),
        tasks: tasksRequired,
        plannedTime: plannedTime ? parseFloat(plannedTime) : null,
        targetValue: parseFloat(targetHours) || 1.0,
        targetHours: parseFloat(targetHours) || 1.0,
        targetDate: todayStr,
        status: 'pending',
        studiedSeconds: 0,
        locked: false,
        targetRewardGranted: false,
        targetPenaltyApplied: false,
        course: userProfile?.course || 'CA Foundation',
        createdAt: serverTimestamp(),
        date: serverTimestamp()
      });

      setTitle('');
      setTargetHours('2.0');
      setCategory('stream');
      setCustomSubject('');
      setTopicName('');
      setTasksRequired({ mcq: false, dpp: false, notes: false, practice: false });
      setPlannedTime('');
      setShowAddModal(false);
    } catch (err) {
      console.error("Error creating target:", err);
      alert("Failed to add target. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Prevent false completion: Check if student has genuinely met the target study time
  
  const markTarget = async (target, statusAction) => {
    if (target.status === 'completed' || target.status === 'half_completed' || target.status === 'missed') return;

    const progress = target.progress || calculateTargetProgress(target, sessions, activeTimerState);

    // Enforce 20-minute requirement on subject before Done / Half Done
    if ((statusAction === 'done' || statusAction === 'half_done') && target.category !== 'other') {
      if (progress.effectiveStudied < 1200) {
        alert(`You must study at least 20 verified minutes on "${target.subject}" before marking it complete.\nCurrent studied: ${progress.studiedHuman || '0m'}.`);
        return;
      }
    }

    try {
      const todayStr = getDateKey(new Date());
      const study = calculateCombinedDailyStudy(sessions, activeTimerState, todayStr);
      const isEligible = study.isTargetEligible; // Verified study time >= 14,400s (4+ hours)

      let pointsToAward = 0;
      let reason = '';
      let newStatus = '';
      let isPenalty = false;

      if (statusAction === 'done') {
        newStatus = 'completed';
        if (isEligible) {
          pointsToAward = 10;
          reason = 'Daily Target Completed (>= 4 hrs verified)';
        }
      } else if (statusAction === 'half_done') {
        newStatus = 'half_completed';
        if (isEligible) {
          pointsToAward = 5;
          reason = 'Daily Target Half Done (>= 4 hrs verified)';
        }
      } else if (statusAction === 'missed') {
        newStatus = 'missed';
        pointsToAward = -3;
        reason = 'Daily Target Missed';
        isPenalty = true;
      }

      const batch = writeBatch(db);
      const targetRef = doc(db, 'targets', target.id);
      const userRef = doc(db, 'users', currentUser.uid);

      batch.update(targetRef, {
        status: newStatus,
        completed: statusAction === 'done' || statusAction === 'half_done',
        targetRewardGranted: pointsToAward > 0,
        targetPenaltyApplied: isPenalty,
        completedAt: serverTimestamp()
      });

      if (pointsToAward !== 0) {
        const txDocId = isPenalty 
          ? `${currentUser.uid}_target_penalty_${target.id}` 
          : `${currentUser.uid}_target_reward_${target.id}`;
        const txRef = doc(db, 'pointTransactions', txDocId);

        batch.set(txRef, {
          studentId: currentUser.uid,
          amount: pointsToAward,
          type: isPenalty ? 'penalty' : 'reward',
          reason: reason,
          sourceId: txDocId,
          targetId: target.id,
          targetTitle: target.title || 'Daily Target',
          subject: target.subject || '',
          date: todayStr,
          createdAt: serverTimestamp()
        });

        batch.update(userRef, {
          points: increment(pointsToAward)
        });
      }

      await batch.commit();

      if (pointsToAward > 0) {
        setRewardToast({
          title: target.title,
          subject: target.subject,
          points: pointsToAward
        });
        setTimeout(() => setRewardToast(null), 4500);
      } else if ((statusAction === 'done' || statusAction === 'half_done') && !isEligible) {
        const remainingMinutes = Math.max(0, Math.ceil((14400 - study.totalSeconds) / 60));
        alert(`Target marked as ${statusAction === 'done' ? 'Completed' : 'Half Done'}! Study ${remainingMinutes} more minutes today across your subjects to unlock your +${statusAction === 'done' ? 10 : 5} PTS.`);
      }
    } catch (err) {
      console.error("Error updating target status:", err);
      alert("Failed to update target. Please try again.");
    }
  };

  // Auto-sync daily points and eligibility on mount / sessions change without duplicates
  useEffect(() => {
    if (!currentUser?.uid || !sessions || sessions.length === 0) return;
    const todayStr = getDateKey(new Date());
    syncDailyPointsAndEligibility({
      db,
      uid: currentUser.uid,
      dateKey: todayStr,
      sessions,
      targets,
      activeTimerState
    });
  }, [currentUser?.uid, sessions.length, targets.length]);

  const handleQuickStudy = (subjectName) => {
    if (!subjectName) return;
    sessionStorage.setItem('quick_timer_subject', subjectName);
    setIncompleteModalData(null);
    if (setActiveTab) {
      setActiveTab('timer');
    }
  };

  // Group targets into: Pending (today active), Completed (+3), and Missed (-3)
  const todayKey = getDateKey(new Date());

  const enrichedTargets = targets.map(t => {
    const targetDateKey = t.targetDate || (t.createdAt?.toDate ? getDateKey(t.createdAt.toDate()) : todayKey);
    const isCompleted = t.status === 'completed' || t.completed === true || t.targetRewardGranted === true;
    const isHalfCompleted = t.status === 'half_completed';
    const isMissed = !isCompleted && !isHalfCompleted && (t.status === 'missed' || t.targetPenaltyApplied === true || (targetDateKey && targetDateKey < todayKey));
    const isPending = !isCompleted && !isHalfCompleted && !isMissed;
    const progress = calculateTargetProgress(t, sessions, activeTimerState);

    const requiresTimer = t.category !== 'other';
    const has20Mins = progress.effectiveStudied >= 1200;
    const isLocked = requiresTimer && !has20Mins;

    return {
      ...t,
      isCompleted,
      isHalfCompleted,
      isMissed,
      isPending,
      targetDateKey,
      progress,
      isLocked,
      requiresTimer
    };
  });

  const pendingTargets = enrichedTargets.filter(t => t.isPending);
  const completedTargets = enrichedTargets.filter(t => t.isCompleted || t.isHalfCompleted);
  const missedTargets = enrichedTargets.filter(t => t.isMissed);

  const displayedTargets = enrichedTargets.filter(t => {
    if (filter === 'pending') return t.isPending;
    if (filter === 'completed') return t.isCompleted || t.isHalfCompleted;
    if (filter === 'missed') return t.isMissed;
    return true; // 'all'
  });

  // Calculate Target Points statistics
  const totalEarned = targetTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalDeducted = Math.abs(targetTransactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + (tx.amount || 0), 0));
  const netTargetPoints = totalEarned - totalDeducted;

  return (
    <div className="space-y-6">
      {/* Daily Target and Test Section Switcher */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isEyeCare ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`flex items-center gap-2 p-1.5 rounded-2xl border ${isEyeCare ? 'glass-card border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <button
            onClick={() => setHubTab('targets')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              hubTab === 'targets'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-glow-emerald'
                : isEyeCare ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 font-bold'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>🎯 Daily Targets</span>
          </button>
          
          <button
            onClick={() => setHubTab('test_tracker')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              hubTab === 'test_tracker'
                ? 'bg-purple-600 text-white font-black shadow-glow-purple'
                : isEyeCare ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 font-bold'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📝 Test Tracker</span>
          </button>
        </div>

        {/* Compact Test Summary Box */}
        {hubTab === 'targets' && (
          <div className={`flex items-center gap-3 p-3 rounded-2xl border text-xs ${
            isEyeCare ? 'glass-card border-purple-500/20 text-slate-300' : 'bg-white border-purple-200 text-slate-700 shadow-sm'
          }`}>
            <div className={`flex items-center gap-3 ${isEyeCare ? 'text-slate-300' : 'text-slate-700 font-semibold'}`}>
              <div>Attempted: <strong className={isEyeCare ? 'text-white' : 'text-slate-950 font-black'}>{testSummary?.attempted ?? 0}</strong></div>
              <div>Avg: <strong className={isEyeCare ? 'text-purple-300' : 'text-purple-700 font-black'}>{Number(testSummary?.avgScore || 0).toFixed(0)}%</strong></div>
              <div>Best: <strong className={isEyeCare ? 'text-emerald-400' : 'text-emerald-700 font-black'}>{Number(testSummary?.bestScore || 0).toFixed(0)}%</strong></div>
            </div>
            <button
              onClick={() => setHubTab('test_tracker')}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black transition-all shadow-glow-purple cursor-pointer"
            >
              View Tests →
            </button>
          </div>
        )}
      </div>

      {/* RENDER TEST TRACKER TAB */}
      {hubTab === 'test_tracker' ? (
        <TestTracker />
      ) : (
        <>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-black flex items-center gap-2 ${isEyeCare ? 'text-white' : 'text-slate-950'}`}>
                <Target className="w-7 h-7 text-emerald-500" />
                Daily Subject Targets
              </h1>
              <p className={`text-sm mt-1 font-medium ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                Connected strictly to your subject study timer. Fulfill your target on time to earn verified points!
              </p>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowHistoryModal(true)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isEyeCare 
                    ? 'bg-navy-900 hover:bg-navy-800 text-slate-300 border border-white/10' 
                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm'
                }`}
              >
                <History className="w-4 h-4 text-amber-500" />
                <span>Points History</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black flex items-center justify-center gap-2 transition-all shadow-glow-emerald cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Target</span>
              </button>
            </div>
          </div>

          {/* 📋 TARGET RULES PANEL */}
          <div className={`p-5 rounded-3xl border shadow-sm mb-6 ${
            isEyeCare 
              ? 'bg-gradient-to-br from-navy-900 to-navy-950 border-emerald-500/20 shadow-xl' 
              : 'bg-emerald-50/60 border-emerald-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                📋
              </div>
              <div>
                <h3 className={`text-base font-black ${isEyeCare ? 'text-white' : 'text-slate-950'}`}>Target Rules</h3>
                <p className={`text-xs font-medium ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Strictly enforced for verified points</p>
              </div>
            </div>
            
            <ul className={`space-y-2.5 text-sm font-medium ${isEyeCare ? 'text-slate-300' : 'text-slate-700'}`}>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong className={isEyeCare ? 'text-white' : 'text-slate-950 font-bold'}>Minimum 4 hours</strong> verified study daily is mandatory to earn points for targets.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>Every Subject Target requires at least <strong className={isEyeCare ? 'text-emerald-400' : 'text-emerald-700 font-bold'}>20 minutes</strong> of verified study on that same subject.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>The 20 minutes must be recorded through the <strong className={isEyeCare ? 'text-white' : 'text-slate-950 font-bold'}>Study Timer</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>The Done button unlocks <strong className={isEyeCare ? 'text-amber-400' : 'text-amber-700 font-bold'}>only after</strong> the 20-minute requirement is completed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>Subject timer minutes are calculated separately for each subject.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>All verified subject study time contributes toward the daily 4-hour requirement.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>"Other" Targets have no timer requirement and can be completed directly.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>Only verified Study Timer time counts toward study hours.</span>
              </li>
            </ul>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-2xl border flex flex-col gap-0.5 ${
              isEyeCare ? 'glass-card border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Total Targets</span>
              <span className={`text-xl font-black ${isEyeCare ? 'text-white' : 'text-slate-950'}`}>{targets.length}</span>
            </div>
            <div className={`p-3.5 rounded-2xl border flex flex-col gap-0.5 ${
              isEyeCare ? 'glass-card border-royal-500/20 bg-royal-500/5' : 'bg-blue-50/70 border-blue-200 shadow-sm'
            }`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isEyeCare ? 'text-royal-400' : 'text-blue-700'}`}>Pending (Today)</span>
              <span className={`text-xl font-black ${isEyeCare ? 'text-royal-400' : 'text-blue-800'}`}>{pendingTargets.length}</span>
            </div>
            <div className={`p-3.5 rounded-2xl border flex flex-col gap-0.5 ${
              isEyeCare ? 'glass-card border-emerald-500/20 bg-emerald-500/5' : 'bg-emerald-50/70 border-emerald-200 shadow-sm'
            }`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isEyeCare ? 'text-emerald-400' : 'text-emerald-700'}`}>Completed / Half Done</span>
              <span className={`text-xl font-black ${isEyeCare ? 'text-emerald-400' : 'text-emerald-800'}`}>{completedTargets.length}</span>
            </div>
            <div className={`p-3.5 rounded-2xl border flex flex-col gap-0.5 ${
              isEyeCare ? 'glass-card border-rose-500/20 bg-rose-500/5' : 'bg-rose-50/70 border-rose-200 shadow-sm'
            }`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isEyeCare ? 'text-rose-400' : 'text-rose-700'}`}>Missed</span>
              <span className={`text-xl font-black ${isEyeCare ? 'text-rose-400' : 'text-rose-800'}`}>{missedTargets.length}</span>
            </div>
          </div>

          {/* Reward Toast */}
          {rewardToast && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-between animate-in slide-in-from-top duration-300 shadow-glow-emerald">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-navy-950 flex items-center justify-center font-black">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Target Completed! 🎉</h4>
                  <p className="text-xs text-emerald-300">
                    <strong className="text-white">+{rewardToast.points} Points</strong> added to your profile for <strong className="text-white">{rewardToast.subject}</strong> ({rewardToast.title}).
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-emerald-500 text-navy-950">
                +{rewardToast.points} PTS
              </span>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              isEyeCare ? 'bg-navy-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <Filter className={`w-4 h-4 ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`} />
              <span className={`text-xs font-bold ${isEyeCare ? 'text-slate-300' : 'text-slate-700'}`}>Filter:</span>
            </div>
            {[
              { id: 'all', label: `All (${targets.length})` },
              { id: 'pending', label: `Pending (${pendingTargets.length})` },
              { id: 'completed', label: `Completed (${completedTargets.length})` },
              { id: 'missed', label: `Missed (${missedTargets.length})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filter === f.id 
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-glow-emerald' 
                    : isEyeCare 
                      ? 'bg-navy-900 text-slate-400 border border-white/5 hover:bg-navy-800 hover:text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-950 shadow-sm'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Active Timer Running Alert Banner if user has an active timer right now */}
          {activeTimerState?.isActive && (
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs animate-pulse ${
              isEyeCare ? 'bg-royal-600/20 border-royal-500/40' : 'bg-blue-50 border-blue-300 shadow-sm'
            }`}>
              <div className={`flex items-center gap-2 font-semibold ${isEyeCare ? 'text-royal-300' : 'text-blue-800'}`}>
                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Timer currently running for <strong className={isEyeCare ? 'text-white' : 'text-slate-950 font-bold'}>{activeTimerState.selectedSubject}</strong>. Target progress updating live!</span>
              </div>
              {setActiveTab && (
                <button
                  onClick={() => setActiveTab('timer')}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-sm"
                >
                  View Timer →
                </button>
              )}
            </div>
          )}

          {/* Target Cards Grid */}
          {targets.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No daily targets set"
              description="Create a subject target to challenge yourself. Start your subject timer, study the required hours, and earn +3 Points!"
            />
          ) : displayedTargets.length === 0 ? (
            <div className={`p-8 text-center text-sm rounded-3xl border ${
              isEyeCare ? 'glass-card border-white/5 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm font-medium'
            }`}>
              No targets found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedTargets.map((target) => {
                const { progress, isCompleted, isHalfCompleted, isMissed, isPending } = target;
                const isTimerActiveForThis = activeTimerState?.isActive && isSubjectMatch(activeTimerState.selectedSubject, target.subject);

                return (
                  <div 
                    key={target.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isCompleted 
                        ? (isEyeCare ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200 shadow-sm')
                        : isMissed
                          ? (isEyeCare ? 'bg-rose-500/5 border-rose-500/30' : 'bg-rose-50/40 border-rose-200 shadow-sm')
                          : progress.isEligible
                            ? (isEyeCare ? 'bg-emerald-500/10 border-emerald-400/50 shadow-glow-emerald ring-1 ring-emerald-400/30' : 'bg-emerald-50 border-emerald-400 shadow-md ring-1 ring-emerald-300')
                            : (isEyeCare ? 'bg-navy-900 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm')
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCompleted 
                              ? (isEyeCare ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-200')
                              : isMissed
                                ? (isEyeCare ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-800 border border-rose-200')
                                : progress.isEligible
                                  ? 'bg-emerald-500 text-white font-black animate-pulse'
                                  : (isEyeCare ? 'bg-royal-500/20 text-royal-300 border border-royal-500/30' : 'bg-blue-100 text-blue-800 border border-blue-200')
                          }`}>
                            {isCompleted 
                              ? '✅ Completed' 
                              : isHalfCompleted
                                ? '✅ Half Done'
                                : isMissed
                                  ? '❌ Missed'
                                  : progress.isEligible 
                                    ? '🎯 Ready to Complete' 
                                    : '⏳ Pending'
                            }
                          </span>

                          {isTimerActiveForThis && isPending && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                              Timer Live
                            </span>
                          )}
                        </div>

                        {isCompleted || isHalfCompleted ? (
                          <Award className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : isMissed ? (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        ) : (
                          <Clock className={`w-5 h-5 shrink-0 ${isEyeCare ? 'text-slate-500' : 'text-slate-400'}`} />
                        )}
                      </div>

                      {/* Title & Subject */}
                      <h3 className={`text-base font-bold mb-1.5 leading-snug ${
                        isCompleted || isHalfCompleted 
                          ? (isEyeCare ? 'text-slate-400 line-through' : 'text-slate-500 line-through') 
                          : isMissed 
                            ? (isEyeCare ? 'text-slate-400' : 'text-slate-500') 
                            : (isEyeCare ? 'text-white' : 'text-slate-950')
                      }`}>
                        {target.title}
                      </h3>

                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold mb-4 ${
                        isEyeCare ? 'bg-navy-950 border-white/10 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        <span>📖</span>
                        <span className="truncate max-w-[220px]">{target.subject}</span>
                      </div>

                      {/* Progress Section */}
                      <div className={`p-3 rounded-2xl border space-y-2 mb-4 ${
                        isEyeCare 
                          ? `bg-navy-950/70 ${isCompleted ? 'border-emerald-500/20' : isMissed ? 'border-rose-500/20' : 'border-white/5'}`
                          : `bg-slate-50 ${isCompleted ? 'border-emerald-200' : isMissed ? 'border-rose-200' : 'border-slate-200'}`
                      }`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Recorded Study Time:</span>
                          <span className={`font-bold ${isEyeCare ? 'text-white' : 'text-slate-950'}`}>
                            {progress.studiedHuman} <span className={isEyeCare ? 'text-slate-500 font-normal' : 'text-slate-500 font-medium'}>/ {progress.targetHuman}</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 border ${
                          isEyeCare ? 'bg-navy-900 border-white/10' : 'bg-slate-200 border-slate-300'
                        }`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted || isHalfCompleted || progress.isEligible 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-glow-emerald' 
                                : isMissed
                                  ? 'bg-gradient-to-r from-rose-500 to-red-600'
                                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
                            }`}
                            style={{ width: `${progress.progressPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className={`font-black ${
                            (isCompleted || isHalfCompleted) 
                              ? (isEyeCare ? 'text-emerald-400' : 'text-emerald-700') 
                              : isMissed 
                                ? (isEyeCare ? 'text-rose-400' : 'text-rose-700') 
                                : progress.isEligible 
                                  ? (isEyeCare ? 'text-emerald-400' : 'text-emerald-700') 
                                  : (isEyeCare ? 'text-amber-400' : 'text-amber-700')
                          }`}>
                            {progress.progressPct}% {(isCompleted || isHalfCompleted) ? 'Achieved' : isMissed ? 'Incomplete' : 'Complete'}
                          </span>

                          <span className={`font-semibold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                            {isCompleted ? (
                              <span className={isEyeCare ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-black'}>Completed (+10 Points)</span>
                            ) : isHalfCompleted ? (
                              <span className={isEyeCare ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-black'}>Half Done (+5 Points)</span>
                            ) : isMissed ? (
                              <span className={isEyeCare ? 'text-rose-400 font-bold' : 'text-rose-700 font-black'}>Target Missed (-3 Points)</span>
                            ) : progress.isEligible ? (
                              <span className={isEyeCare ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-black'}>Ready to Claim!</span>
                            ) : (
                              <span>Remaining: <strong className={isEyeCare ? 'text-amber-300' : 'text-amber-700 font-bold'}>{progress.remainingHuman}</strong></span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Target Meta Details */}
                      <div className={`text-[11px] flex flex-col gap-1 mb-4 ${isEyeCare ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                        <div className="flex items-center justify-between">
                          <span>Assigned Date: {target.targetDateKey || 'Today'}</span>
                          <span className={`font-bold ${
                            isCompleted || isHalfCompleted 
                              ? (isEyeCare ? 'text-emerald-400' : 'text-emerald-700') 
                              : isMissed 
                                ? (isEyeCare ? 'text-rose-400' : 'text-rose-700') 
                                : (isEyeCare ? 'text-amber-400' : 'text-amber-700')
                          }`}>
                            {isCompleted ? 'Done' : isHalfCompleted ? 'Half Done' : isMissed ? 'Missed' : 'Pending'}
                          </span>
                        </div>
                        {target.topicName && (
                          <div><span className={`font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Topic:</span> <span className={isEyeCare ? 'text-white' : 'text-slate-900 font-semibold'}>{target.topicName}</span></div>
                        )}
                        {target.plannedTime && (
                          <div><span className={`font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Planned Time:</span> <span className={isEyeCare ? 'text-white' : 'text-slate-900 font-semibold'}>{target.plannedTime} hrs</span></div>
                        )}
                        {target.tasks && typeof target.tasks === 'object' && Object.values(target.tasks).some(Boolean) && (
                          <div className="flex gap-1.5 flex-wrap mt-1">
                             {(target.tasks || {}).mcq && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isEyeCare ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>MCQ</span>}
                             {(target.tasks || {}).dpp && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isEyeCare ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>DPP</span>}
                             {(target.tasks || {}).notes && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isEyeCare ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>Notes</span>}
                             {(target.tasks || {}).practice && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isEyeCare ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>Practice</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={`space-y-2 pt-2 border-t ${isEyeCare ? 'border-white/5' : 'border-slate-200'}`}>
                      {isCompleted ? (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-black flex items-center justify-center gap-1.5 border border-emerald-500/20 cursor-default">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{target.targetRewardGranted ? 'Target Completed (+10 Points)' : 'Target Completed (Pending 4h Daily Study)'}</span>
                        </div>
                      ) : isHalfCompleted ? (
                        <div className="w-full py-2.5 rounded-xl bg-teal-500/10 text-teal-400 text-xs font-black flex items-center justify-center gap-1.5 border border-teal-500/20 cursor-default">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{target.targetRewardGranted ? 'Target Half Done (+5 Points)' : 'Target Half Done (Pending 4h Daily Study)'}</span>
                        </div>
                      ) : isMissed ? (
                        <div className="w-full py-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-black flex items-center justify-center gap-1.5 border border-rose-500/20 cursor-default">
                          <XCircle className="w-4 h-4" />
                          <span>Target Missed (-3 Points Applied)</span>
                        </div>
                      ) : (
                        <>
                          {target.isLocked ? (
                            <div className="w-full py-2.5 rounded-xl bg-navy-800 border border-white/10 text-slate-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock className="w-3.5 h-3.5 text-slate-500" />
                              <span>🔒 Study 20 min to complete ({progress.studiedHuman || '0m'} / 20m)</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => markTarget(target, 'done')}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-navy-950 text-xs font-black shadow-glow-emerald flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <span>✅ Done (+10 PTS)</span>
                              </button>
                              <button
                                onClick={() => markTarget(target, 'half_done')}
                                className="w-full py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
                              >
                                <span>Half Done (+5 PTS)</span>
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => markTarget(target, 'missed')}
                            className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2"
                          >
                            <span>Mark Missed</span>
                          </button>

                          {/* Quick Start Timer Button for this Subject */}
                          <button
                            onClick={() => handleQuickStudy(target.subject)}
                            className="w-full py-2 rounded-xl bg-royal-600/20 hover:bg-royal-600/30 text-royal-300 hover:text-white border border-royal-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Study {(target.subject || 'Subject').split(':')[0]} on Timer</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create Target Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-sm">
              <div className="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar p-6 rounded-3xl border border-emerald-500/20 animate-in zoom-in-95 duration-200 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" />
                    New Daily Target
                  </h2>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleConfirmTarget} className="space-y-4">
                  <div className="p-3 rounded-xl bg-navy-950 border border-white/5 space-y-2">
                    <h3 className="text-xs font-bold text-white mb-2">Points System</h3>
                    <p className="text-[11px] text-slate-400">You must complete <strong>&gt;= 4 hours of total study time today</strong> to qualify for points when marking a target as DONE or HALF DONE.</p>
                    <ul className="text-[11px] text-slate-300 list-disc list-inside">
                      <li>DONE (4+ hrs today) = <strong>+10 Points</strong></li>
                      <li>HALF DONE (4+ hrs today) = <strong>+5 Points</strong></li>
                      <li>MARK MISSED / PENDING = <strong>-3 Points</strong></li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Title / Description</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Complete Chapter 4"
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="stream">Your Stream</option>
                      <option value="other">Other (Optional)</option>
                    </select>
                  </div>

                  {category === 'stream' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                      >
                        {subjects.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Subject</label>
                      <input
                        type="text"
                        required
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="e.g. Graduation subject"
                        className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topic Name (Optional)</label>
                    <input
                      type="text"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      placeholder="e.g. Differentiation"
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optional Tasks</label>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={tasksRequired.mcq} onChange={(e) => setTasksRequired({...tasksRequired, mcq: e.target.checked})} className="accent-emerald-500" /> MCQ
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={tasksRequired.dpp} onChange={(e) => setTasksRequired({...tasksRequired, dpp: e.target.checked})} className="accent-emerald-500" /> DPP
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={tasksRequired.notes} onChange={(e) => setTasksRequired({...tasksRequired, notes: e.target.checked})} className="accent-emerald-500" /> Notes Revision
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={tasksRequired.practice} onChange={(e) => setTasksRequired({...tasksRequired, practice: e.target.checked})} className="accent-emerald-500" /> Practice Questions
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Planned Study Time (hrs, optional)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={plannedTime}
                      onChange={(e) => setPlannedTime(e.target.value)}
                      placeholder="e.g. 2.5"
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  
                  {/* Keep old required targetHours for backward compatibility */}
                  <div className="space-y-1.5 hidden">
                     <input type="hidden" value={targetHours} onChange={()=>{}} />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-sm transition-colors cursor-pointer shadow-glow-emerald disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Create Target'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Target Lock Warning Confirmation Modal */}
          {showWarningModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md">
              <div className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar bg-navy-900 border border-amber-500/40 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-amber-500/10 p-6 border-b border-amber-500/20 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">⚠️ Set your target carefully</h2>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-300 text-center font-medium leading-relaxed">
                    Once you set today's target, it will be <strong className="text-amber-400">LOCKED</strong> for today. You must study <strong className="text-white">{targetHours} Hours</strong> on the <strong className="text-gold-400">{subject}</strong> timer to complete it.
                  </p>
                  
                  <div className="p-4 rounded-2xl bg-navy-950 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">If you complete it:</span>
                      <span className="font-bold text-emerald-400">+3 Points</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">If you fail to complete it:</span>
                      <span className="font-bold text-rose-400">-3 Points</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Subject-wise Timer:</span>
                      <span className="font-bold text-gold-400">Strictly Required</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowWarningModal(false)}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-bold text-sm transition-all cursor-pointer"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleConfirmTarget}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitting ? 'Locking...' : (
                        <>
                          <span>Confirm Target</span>
                          <Lock className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Prevent False Completion Alert Modal */}
          {incompleteModalData && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md animate-in fade-in duration-150">
              <div className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar bg-navy-900 border border-rose-500/40 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-rose-500/10 p-6 border-b border-rose-500/20 text-center">
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                    <AlertTriangle className="w-7 h-7 text-rose-400 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-black text-white">Target Not Completed Yet!</h2>
                  <p className="text-xs text-rose-300 mt-1 font-semibold uppercase tracking-wider">Study Timer Requirement Not Met</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
                    <p className="text-sm text-slate-200 font-semibold leading-relaxed">
                      Target not completed yet! You still need to study{' '}
                      <span className="text-amber-300 font-black text-base underline underline-offset-2">
                        {incompleteModalData.progress.remainingHuman}
                      </span>{' '}
                      more of{' '}
                      <span className="text-white font-black text-base">
                        {incompleteModalData.target.subject}
                      </span>{' '}
                      to complete this target.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-navy-950 border border-white/5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target Goal:</span>
                      <span className="font-bold text-white">{incompleteModalData.progress.targetHuman}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Actually Studied on Timer:</span>
                      <span className="font-bold text-amber-400">
                        {incompleteModalData.progress.studiedHuman} ({incompleteModalData.progress.progressPct}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="text-rose-300 font-bold">Remaining Duration:</span>
                      <span className="font-black text-rose-400 text-sm">{incompleteModalData.progress.remainingHuman}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      onClick={() => handleQuickStudy(incompleteModalData.target?.subject)}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-navy-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-glow-emerald"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start {(incompleteModalData.target?.subject || 'Subject').split(':')[0]} Timer Now</span>
                    </button>
                    <button
                      onClick={() => setIncompleteModalData(null)}
                      className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      Okay, I'll Complete It Later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TARGET POINTS HISTORY MODAL */}
          {showHistoryModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md animate-in fade-in duration-150">
              <div className="w-full max-w-2xl bg-navy-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-navy-950/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Target Points History</h2>
                      <p className="text-xs text-slate-400">Complete log of target rewards (+3) and missed penalties (-3)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Score Summary Banner */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-navy-950/40 border-b border-white/5 text-center">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Completed Rewards</div>
                    <div className="text-xl font-black text-emerald-400">+{totalEarned} Pts</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Missed Penalties</div>
                    <div className="text-xl font-black text-rose-400">-{totalDeducted} Pts</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-royal-500/10 border border-royal-500/20">
                    <div className="text-[10px] font-bold text-royal-300 uppercase tracking-wider">Net Target Score</div>
                    <div className={`text-xl font-black ${netTargetPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {netTargetPoints >= 0 ? `+${netTargetPoints}` : netTargetPoints} Pts
                    </div>
                  </div>
                </div>

                {/* Transactions List */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                  {targetTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="font-semibold text-white">No target points history yet</p>
                      <p className="text-xs text-slate-500 mt-1">Complete your subject timer targets to earn +3 Points!</p>
                    </div>
                  ) : (
                    targetTransactions.map((tx) => {
                      const isPositive = (tx.amount || 0) > 0;
                      return (
                        <div 
                          key={tx.id}
                          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                            isPositive 
                              ? 'bg-emerald-500/5 border-emerald-500/20' 
                              : 'bg-rose-500/5 border-rose-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{tx.reason || (isPositive ? 'Target Completed' : 'Target Missed')}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {tx.targetTitle && <span className="text-slate-300 font-medium">{tx.targetTitle} • </span>}
                                {tx.subject && <span className="text-gold-400">{tx.subject} • </span>}
                                <span>{tx.date || (tx.createdAt ? formatDate(tx.createdAt) : '')}</span>
                              </div>
                            </div>
                          </div>

                          <div className={`px-3 py-1.5 rounded-xl font-black text-sm shrink-0 ${
                            isPositive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {isPositive ? `+${tx.amount} Pts` : `${tx.amount} Pts`}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-navy-950/60 flex justify-end">
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="px-5 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
