import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, increment, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';
import { Target, Plus, CheckCircle2, Circle, Trash2, Calendar, Award, Filter, Sparkles } from 'lucide-react';

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

  const [targets, setTargets] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [showAddModal, setShowAddModal] = useState(false);

  // New Target Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(subjects[0]);
  const [targetHours, setTargetHours] = useState('2.0');
  const [submitting, setSubmitting] = useState(false);

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
        const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dbDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dbDate - da;
      });
      setTargets(docs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAddTarget = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'targets'), {
        uid: currentUser.uid,
        title: title.trim(),
        subject,
        targetHours: parseFloat(targetHours) || 1.0,
        completed: false,
        course: userProfile?.course || 'CA Foundation',
        date: serverTimestamp()
      });

      setTitle('');
      setTargetHours('2.0');
      setShowAddModal(false);
    } catch (err) {
      console.error("Error creating target:", err);
      alert("Failed to add target. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTargetComplete = async (target) => {
    try {
      const newStatus = !target.completed;
      const targetRef = doc(db, 'targets', target.id);
      
      await updateDoc(targetRef, {
        completed: newStatus
      });

      // Update user points: +50 for completing, -50 if unchecking
      const pointsDelta = newStatus ? 50 : -50;
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        points: increment(pointsDelta)
      });

    } catch (err) {
      console.error("Error updating target status:", err);
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!confirm("Are you sure you want to delete this target?")) return;
    try {
      await deleteDoc(doc(db, 'targets', id));
    } catch (err) {
      console.error("Error deleting target:", err);
    }
  };

  const filteredTargets = targets.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/30">
              <Target className="w-3.5 h-3.5" />
              <span>Self-Managed Study Goals</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Daily Study <span className="gold-gradient-text">Targets Hub</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Create daily preparation milestones. Completing targets earns +50 bonus points.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-black text-sm shadow-glow-gold flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Create New Target</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 p-1.5 rounded-2xl glass-card border border-white/10">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({targets.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'pending' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({targets.filter(t => !t.completed).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'completed' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed ({targets.filter(t => t.completed).length})
          </button>
        </div>
      </div>

      {/* Targets Grid / List */}
      {filteredTargets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No targets found"
          description="Create custom study targets for your syllabus topics to stay disciplined."
          actionText="Create Target"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTargets.map((target) => (
            <div
              key={target.id}
              className={`p-5 rounded-2xl glass-card border transition-all flex items-start justify-between gap-4 ${
                target.completed 
                  ? 'border-emerald-500/30 bg-emerald-500/5' 
                  : 'border-white/10 hover:border-royal-500/30'
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => toggleTargetComplete(target)}
                  className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  {target.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-500" />
                  )}
                </button>

                <div className="space-y-1">
                  <h4 className={`text-base font-bold transition-all ${
                    target.completed ? 'line-through text-slate-400' : 'text-white'
                  }`}>
                    {target.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-md bg-navy-900 border border-white/10 text-gold-400 font-semibold">
                      {target.subject}
                    </span>
                    <span className="text-slate-400">
                      Target: <strong className="text-slate-200">{target.targetHours} Hours</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {target.completed && (
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    +50 PTS
                  </span>
                )}
                <button
                  onClick={() => handleDeleteTarget(target.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Target Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-gold-400" />
                <span>Create Study Target</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Target Title / Topic
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete 20 Accounting Practical Questions"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-royal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Target Duration (Hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-royal-600 to-royal-500 text-white text-sm font-bold shadow-glow-blue hover:from-royal-500 hover:to-royal-600 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Target'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
