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

  const handleReviewTarget = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setShowAddModal(false);
    setShowWarningModal(true);
  };

  const handleConfirmTarget = async () => {
    try {
      setSubmitting(true);
      const todayStr = getDateKey(new Date());

      await addDoc(collection(db, 'targets'), {
        uid: currentUser.uid,
        title: title.trim(),
        subject,
        targetValue: parseFloat(targetHours) || 1.0,
        targetHours: parseFloat(targetHours) || 1.0,
        targetDate: todayStr,
        status: 'pending',
        studiedSeconds: 0,
        locked: true,
        targetRewardGranted: false,
        targetPenaltyApplied: false,
        course: userProfile?.course || 'CA Foundation',
        createdAt: serverTimestamp(),
        date: serverTimestamp()
      });

      setTitle('');
      setTargetHours('2.0');
      setShowWarningModal(false);
    } catch (err) {
      console.error("Error creating target:", err);
      alert("Failed to add target. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Prevent false completion: Check if student has genuinely met the target study time
  const handleTargetAction = (target, progress) => {
    // If completed or missed, action is blocked
    if (target.isCompleted || target.isMissed) return;

    if (!progress.isEligible) {
      // PREVENT false completion: show explicit warning with remaining duration
      setIncompleteModalData({ target, progress });
      return;
    }

    // Target duration genuinely met on subject timer! Complete and reward (+3 Pts)
    completeTarget(target);
  };

  const completeTarget = async (target) => {
    // Strict mutual exclusivity guard: never reward twice, never reward a missed target
    if (target.status === 'completed' || target.status === 'missed' || target.completed || target.targetRewardGranted || target.targetPenaltyApplied) {
      return;
    }

    try {
      const batch = writeBatch(db);
      const targetRef = doc(db, 'targets', target.id);
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = doc(collection(db, 'pointTransactions'));
      const todayStr = getDateKey(new Date());

      // Update target doc
      batch.update(targetRef, {
        status: 'completed',
        completed: true,
        targetRewardGranted: true,
        completedAt: serverTimestamp()
      });

      // Update user points: +3 Points
      batch.update(userRef, {
        points: increment(3)
      });

      // Log transaction: +3 Points
      batch.set(txRef, {
        studentId: currentUser.uid,
        amount: 3,
        type: 'reward',
        reason: 'Daily Target Completed',
        sourceId: target.id,
        targetTitle: target.title,
        subject: target.subject,
        date: todayStr,
        createdAt: serverTimestamp()
      });

      await batch.commit();

      setRewardToast({
        title: target.title,
        subject: target.subject
      });
      setTimeout(() => setRewardToast(null), 4500);
    } catch (err) {
      console.error("Error updating target status:", err);
      alert("Failed to claim target. Please try again.");
    }
  };

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
    const isMissed = !isCompleted && (t.status === 'missed' || t.targetPenaltyApplied === true || (targetDateKey && targetDateKey < todayKey));
    const isPending = !isCompleted && !isMissed;
    const progress = calculateTargetProgress(t, sessions, activeTimerState);

    return {
      ...t,
      isCompleted,
      isMissed,
      isPending,
      targetDateKey,
      progress
    };
  });

  const pendingTargets = enrichedTargets.filter(t => t.isPending);
  const completedTargets = enrichedTargets.filter(t => t.isCompleted);
  const missedTargets = enrichedTargets.filter(t => t.isMissed);

  const displayedTargets = enrichedTargets.filter(t => {
    if (filter === 'pending') return t.isPending;
    if (filter === 'completed') return t.isCompleted;
    if (filter === 'missed') return t.isMissed;
    return true; // 'all'
  });

  // Calculate Target Points statistics
  const totalEarned = targetTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalDeducted = Math.abs(targetTransactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + (tx.amount || 0), 0));
  const netTargetPoints = totalEarned - totalDeducted;

  return (
    <div className="space-y-6">
      {/* Self Manage Hub Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-card border border-white/10">
          <button
            onClick={() => setHubTab('targets')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              hubTab === 'targets'
                ? 'bg-emerald-500 text-navy-950 font-black shadow-glow-emerald'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📝 Test Tracker</span>
          </button>
        </div>

        {/* Compact Test Summary Box */}
        {hubTab === 'targets' && (
          <div className="flex items-center gap-3 p-3 rounded-2xl glass-card border border-purple-500/20 text-xs">
            <div className="flex items-center gap-3 text-slate-300">
              <div>Attempted: <strong className="text-white">{testSummary.attempted}</strong></div>
              <div>Avg: <strong className="text-purple-300">{testSummary.avgScore.toFixed(0)}%</strong></div>
              <div>Best: <strong className="text-emerald-400">{testSummary.bestScore.toFixed(0)}%</strong></div>
            </div>
            <button
              onClick={() => setHubTab('test_tracker')}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all shadow-glow-purple cursor-pointer"
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
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Target className="w-7 h-7 text-emerald-400" />
                Daily Subject Targets
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Connected strictly to your subject study timer. Fulfill your target on time to earn verified points!
              </p>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-slate-300 border border-white/10 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <History className="w-4 h-4 text-gold-400" />
                <span>Points History</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 text-sm font-black flex items-center justify-center gap-2 transition-all shadow-glow-emerald cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Target</span>
              </button>
            </div>
          </div>

          {/* OFFICIAL TARGET POINTS RULES BANNER */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-navy-900 to-rose-500/10 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center font-black text-xl shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                🎯
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-wide">Target Points System</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30">
                    Official
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Scores are computed exclusively from verified <strong className="text-white">subject study timer</strong> hours logged on the assigned day.
                </p>
              </div>
            </div>

            {/* Visual Points Rule Pills */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm">
                <span className="text-lg">🎯</span>
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-emerald-400/90">Target Reward</div>
                  <div className="text-sm font-black text-emerald-300">+3 Points</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 shadow-sm">
                <span className="text-lg">⚠️</span>
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-rose-400/90">Target Missed</div>
                  <div className="text-sm font-black text-rose-300">-3 Points</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl glass-card border border-white/5 flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Targets</span>
              <span className="text-xl font-black text-white">{targets.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl glass-card border border-royal-500/20 bg-royal-500/5 flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-royal-400">Pending (Today)</span>
              <span className="text-xl font-black text-royal-400">{pendingTargets.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl glass-card border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Completed (+3)</span>
              <span className="text-xl font-black text-emerald-400">{completedTargets.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl glass-card border border-rose-500/20 bg-rose-500/5 flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Missed (-3)</span>
              <span className="text-xl font-black text-rose-400">{missedTargets.length}</span>
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
                    <strong className="text-white">+3 Points</strong> added to your profile for <strong className="text-white">{rewardToast.subject}</strong> ({rewardToast.title}).
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-emerald-500 text-navy-950">
                +3 PTS
              </span>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-900 border border-white/5">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">Filter:</span>
            </div>
            {[
              { id: 'all', label: `All (${targets.length})` },
              { id: 'pending', label: `Pending (${pendingTargets.length})` },
              { id: 'completed', label: `Completed (+3) (${completedTargets.length})` },
              { id: 'missed', label: `Missed (-3) (${missedTargets.length})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filter === f.id 
                    ? 'bg-emerald-500 text-navy-950 font-black shadow-glow-emerald' 
                    : 'bg-navy-900 text-slate-400 border border-white/5 hover:bg-navy-800 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Active Timer Running Alert Banner if user has an active timer right now */}
          {activeTimerState?.isActive && (
            <div className="p-3.5 rounded-2xl bg-royal-600/20 border border-royal-500/40 flex items-center justify-between text-xs animate-pulse">
              <div className="flex items-center gap-2 text-royal-300 font-semibold">
                <Clock className="w-4 h-4 text-royal-400 shrink-0" />
                <span>Timer currently running for <strong className="text-white">{activeTimerState.selectedSubject}</strong>. Target progress updating live!</span>
              </div>
              {setActiveTab && (
                <button
                  onClick={() => setActiveTab('timer')}
                  className="px-3 py-1 rounded-lg bg-royal-500 hover:bg-royal-400 text-white font-bold text-[11px] shrink-0 cursor-pointer"
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
            <div className="p-8 text-center text-slate-400 text-sm glass-card rounded-3xl border border-white/5">
              No targets found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedTargets.map((target) => {
                const { progress, isCompleted, isMissed, isPending } = target;
                const isTimerActiveForThis = activeTimerState?.isActive && isSubjectMatch(activeTimerState.selectedSubject, target.subject);

                return (
                  <div 
                    key={target.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isCompleted 
                        ? 'bg-emerald-500/5 border-emerald-500/30' 
                        : isMissed
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : progress.isEligible
                            ? 'bg-emerald-500/10 border-emerald-400/50 shadow-glow-emerald ring-1 ring-emerald-400/30'
                            : 'bg-navy-900 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCompleted 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : isMissed
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : progress.isEligible
                                  ? 'bg-emerald-400 text-navy-950 font-black animate-pulse'
                                  : 'bg-royal-500/20 text-royal-300 border border-royal-500/30'
                          }`}>
                            {isCompleted 
                              ? '✅ Completed (+3)' 
                              : isMissed
                                ? '❌ Missed (-3)'
                                : progress.isEligible 
                                  ? '🎯 Ready to Complete (+3)' 
                                  : '⏳ Pending'
                            }
                          </span>

                          {isTimerActiveForThis && isPending && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                              Timer Live
                            </span>
                          )}
                        </div>

                        {isCompleted ? (
                          <Award className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : isMissed ? (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        ) : (
                          <Clock className="w-5 h-5 text-slate-500 shrink-0" />
                        )}
                      </div>

                      {/* Title & Subject */}
                      <h3 className={`text-base font-bold mb-1.5 leading-snug ${isCompleted ? 'text-slate-300 line-through' : isMissed ? 'text-slate-400' : 'text-white'}`}>
                        {target.title}
                      </h3>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-950 border border-white/10 text-xs font-semibold text-gold-400 mb-4">
                        <span>📖</span>
                        <span className="truncate max-w-[220px]">{target.subject}</span>
                      </div>

                      {/* Progress Section */}
                      <div className={`p-3 rounded-2xl bg-navy-950/70 border space-y-2 mb-4 ${
                        isCompleted ? 'border-emerald-500/20' : isMissed ? 'border-rose-500/20' : 'border-white/5'
                      }`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Recorded Study Time:</span>
                          <span className="font-bold text-white">
                            {progress.studiedHuman} <span className="text-slate-500 font-normal">/ {progress.targetHuman}</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-navy-900 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted || progress.isEligible 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-glow-emerald' 
                                : isMissed
                                  ? 'bg-gradient-to-r from-rose-500 to-red-600'
                                  : 'bg-gradient-to-r from-gold-500 to-amber-400'
                            }`}
                            style={{ width: `${progress.progressPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className={`font-black ${
                            isCompleted ? 'text-emerald-400' : isMissed ? 'text-rose-400' : progress.isEligible ? 'text-emerald-400' : 'text-gold-400'
                          }`}>
                            {progress.progressPct}% {isCompleted ? 'Achieved' : isMissed ? 'Incomplete' : 'Complete'}
                          </span>

                          <span className="font-semibold text-slate-400">
                            {isCompleted ? (
                              <span className="text-emerald-400 font-bold">Target Completed +3 Points</span>
                            ) : isMissed ? (
                              <span className="text-rose-400 font-bold">Target Missed -3 Points</span>
                            ) : progress.isEligible ? (
                              <span className="text-emerald-400 font-bold">Ready to Claim (+3 Pts)!</span>
                            ) : (
                              <span>Remaining: <strong className="text-amber-300">{progress.remainingHuman}</strong></span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Target Meta Details */}
                      <div className="text-[11px] text-slate-500 flex items-center justify-between mb-4">
                        <span>Assigned Date: {target.targetDateKey || 'Today'}</span>
                        <span className={`font-bold ${
                          isCompleted ? 'text-emerald-400' : isMissed ? 'text-rose-400' : 'text-gold-400'
                        }`}>
                          {isCompleted ? 'Rewarded: +3 Pts' : isMissed ? 'Deducted: -3 Pts' : 'Reward: +3 Pts'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      {isCompleted ? (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-black flex items-center justify-center gap-1.5 border border-emerald-500/20 cursor-default">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Target Completed (+3 Points)</span>
                        </div>
                      ) : isMissed ? (
                        <div className="w-full py-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-black flex items-center justify-center gap-1.5 border border-rose-500/20 cursor-default">
                          <XCircle className="w-4 h-4" />
                          <span>Target Missed (-3 Points Applied)</span>
                        </div>
                      ) : (
                        <>
                          {progress.isEligible ? (
                            /* Unlocked: Ready to complete */
                            <button
                              onClick={() => completeTarget(target)}
                              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-navy-950 text-xs font-black shadow-glow-emerald flex items-center justify-center gap-1.5 transition-all cursor-pointer animate-bounce-subtle"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>✨ Claim Target (+3 Points)</span>
                            </button>
                          ) : (
                            /* Locked: Clicking triggers prevent false completion warning */
                            <button
                              onClick={() => handleTargetAction(target, progress)}
                              className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700/80 border border-white/10 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
                            >
                              <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                              <span>Complete (+3 Points)</span>
                              <span className="text-[10px] text-amber-400/80 font-medium">({progress.remainingHuman} left)</span>
                            </button>
                          )}

                          {/* Quick Start Timer Button for this Subject */}
                          <button
                            onClick={() => handleQuickStudy(target.subject)}
                            className="w-full py-2 rounded-xl bg-royal-600/20 hover:bg-royal-600/30 text-royal-300 hover:text-white border border-royal-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Study {target.subject.split(':')[0]} on Timer</span>
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

                <form onSubmit={handleReviewTarget} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Title / Description</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Complete Chapter 4 Practice Problems"
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Subject (Connected to Timer)</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                    >
                      {subjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Only study timer hours logged for this specific subject will count towards this target.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Study Duration (Hours)</label>
                    <input
                      type="number"
                      required
                      min="0.5"
                      step="0.5"
                      max="12"
                      value={targetHours}
                      onChange={(e) => setTargetHours(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-sm transition-colors cursor-pointer shadow-glow-emerald"
                  >
                    Review & Set Target
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
                      onClick={() => handleQuickStudy(incompleteModalData.target.subject)}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-navy-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-glow-emerald"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start {incompleteModalData.target.subject.split(':')[0]} Timer Now</span>
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
