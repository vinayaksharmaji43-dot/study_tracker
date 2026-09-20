import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, increment, serverTimestamp, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getDateKey, formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { Target, Plus, CheckCircle2, Circle, Trash2, Calendar, Award, Filter, Sparkles, AlertTriangle, Lock, FileText } from 'lucide-react';
import TestTracker from './TestTracker';

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

export default function Targets() {
  const { currentUser, userProfile } = useAuth();
  const subjects = userProfile?.course === 'CMA' ? CMA_SUBJECTS : CA_SUBJECTS;

  const [hubTab, setHubTab] = useState('targets'); // 'targets', 'test_tracker'
  const [testSummary, setTestSummary] = useState({ attempted: 0, avgScore: 0, bestScore: 0 });

  const [targets, setTargets] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // New Target Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(subjects[0]);
  const [targetHours, setTargetHours] = useState('2.0');
  const [submitting, setSubmitting] = useState(false);

  // Listen to studentTests for compact summary widget
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

  // Listen to Firestore targets
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
        targetValue: parseFloat(targetHours) || 1.0, // Used for display
        targetHours: parseFloat(targetHours) || 1.0, // Legacy support
        targetDate: todayStr,
        status: 'pending',
        locked: true,
        targetRewardGranted: false,
        targetPenaltyApplied: false,
        course: userProfile?.course || 'CA Foundation',
        createdAt: serverTimestamp(),
        date: serverTimestamp() // Legacy support
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

  const toggleTargetComplete = async (target) => {
    if (target.status === 'completed' || target.completed) return; // Locked when completed

    try {
      const batch = writeBatch(db);
      const targetRef = doc(db, 'targets', target.id);
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = doc(collection(db, 'pointTransactions'));
      const todayStr = getDateKey(new Date());

      // Update target doc
      batch.update(targetRef, {
        status: 'completed',
        completed: true, // Legacy support
        targetRewardGranted: true,
        completedAt: serverTimestamp()
      });

      // Update user points +10
      batch.update(userRef, {
        points: increment(10)
      });

      // Log transaction
      batch.set(txRef, {
        studentId: currentUser.uid,
        amount: 10,
        type: 'reward',
        reason: 'Daily Target Completed',
        sourceId: target.id,
        date: todayStr,
        createdAt: serverTimestamp()
      });

      await batch.commit();
    } catch (err) {
      console.error("Error updating target status:", err);
    }
  };

  const filteredTargets = targets.filter(t => {
    const isCompleted = t.status === 'completed' || t.completed === true;
    if (filter === 'pending') return !isCompleted;
    if (filter === 'completed') return isCompleted;
    return true;
  });

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

        {/* Compact Test Summary Box (Section 22) */}
        {hubTab === 'targets' && (
          <div className="flex items-center gap-3 p-3 rounded-2xl glass-card border border-purple-500/20 text-xs">
            <div className="flex items-center gap-3 text-slate-300">
              <div>Attempted: <strong className="text-white">{testSummary.attempted}</strong></div>
              <div>Avg: <strong className="text-purple-300">{testSummary.avgScore.toFixed(0)}%</strong></div>
              <div>Best: <strong className="text-emerald-400">{testSummary.bestScore.toFixed(0)}%</strong></div>
            </div>
            <button
              onClick={() => setHubTab('test_tracker')}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all shadow-glow-purple"
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
                Daily Targets
              </h1>
              <p className="text-sm text-slate-400 mt-1">Set and lock your daily goals. Complete them for points!</p>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 text-sm font-black flex items-center justify-center gap-2 transition-all shadow-glow-emerald"
            >
              <Plus className="w-4 h-4" />
              <span>New Target</span>
            </button>
          </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-900 border border-white/5">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300">Filter:</span>
        </div>
        {['all', 'pending', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
              filter === f 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-navy-900 text-slate-400 border border-white/5 hover:bg-navy-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Target List */}
      {targets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No daily targets set"
          description="Create a daily target to challenge yourself. Lock it in, complete it, and earn verified points!"
        />
      ) : filteredTargets.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm glass-card rounded-3xl border border-white/5">
          No {filter} targets found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTargets.map((target) => {
            const isCompleted = target.status === 'completed' || target.completed === true;
            const isPending = !isCompleted && target.targetDate && target.targetDate < getDateKey(new Date());

            return (
              <div 
                key={target.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isCompleted 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : isPending
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-navy-900 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    isCompleted 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : isPending
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {isCompleted ? 'Completed' : isPending ? '⚠️ Pending' : '🔒 Locked'}
                  </div>
                  {isCompleted && <Award className="w-5 h-5 text-emerald-400" />}
                  {isPending && <AlertTriangle className="w-5 h-5 text-rose-400" />}
                </div>

                <h3 className={`text-base font-bold mb-2 ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                  {target.title}
                </h3>

                <div className="space-y-1 mb-5">
                  <div className="text-xs font-semibold text-slate-400">
                    Subject: <span className="text-gold-400">{target.subject}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400">
                    Target: <span className="text-slate-200">{target.targetValue || target.targetHours} Hours</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Date: {target.targetDate || (target.createdAt?.toDate ? getDateKey(target.createdAt.toDate()) : 'Legacy Target')}
                  </div>
                </div>

                {!isCompleted ? (
                  <button
                    onClick={() => toggleTargetComplete(target)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete (+10 Pts)</span>
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-black flex items-center justify-center gap-1.5 border border-emerald-500/20 cursor-default">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Rewarded (+10 Pts)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Target Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-emerald-500/20 animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                New Daily Target
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewTarget} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete Chapter 4 MCQs"
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                >
                  {subjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Duration (Hours)</label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-sm transition-colors"
              >
                Review Target
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Warning Confirmation Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-navy-900 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-amber-500/10 p-6 border-b border-amber-500/20 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">⚠️ Set your target carefully</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300 text-center font-medium leading-relaxed">
                Once you set today's target, it will be <strong className="text-amber-400">LOCKED</strong> and cannot be removed, reduced, or edited.
              </p>
              
              <div className="p-4 rounded-2xl bg-navy-950 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">If you complete it:</span>
                  <span className="font-bold text-emerald-400">+10 Points</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">If you fail to complete it:</span>
                  <span className="font-bold text-rose-400">-3 Points</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWarningModal(false)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-bold text-sm transition-all"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirmTarget}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-black text-sm transition-all flex items-center justify-center gap-2"
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
        </>
      )}
    </div>
  );
}
