import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TARGET_STREAMS, 
  MOTIVATION_DURATION_MS, 
  isMotivationActive, 
  getRemainingTime, 
  parseTimestampMs,
  getStudentStream,
  DEFAULT_AUTOMATIC_QUOTES
} from '../../utils/motivationSystem';
import { 
  Sparkles, 
  Send, 
  Clock, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Globe, 
  GraduationCap, 
  Layers, 
  Power, 
  Eye, 
  X, 
  ShieldCheck,
  Calendar,
  RefreshCw
} from 'lucide-react';

export default function AdminMotivation() {
  const { currentUser, userProfile } = useAuth();

  // Firestore Data State
  const [motivations, setMotivations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [text, setText] = useState('');
  const [targetStream, setTargetStream] = useState('all');
  const [author, setAuthor] = useState('Mentor MADHAV');
  const [publishing, setPublishing] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Modal State
  const [editItem, setEditItem] = useState(null);
  const [editText, setEditText] = useState('');
  const [editStream, setEditStream] = useState('all');
  const [editAuthor, setEditAuthor] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter State
  const [filterStream, setFilterStream] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'expired'

  // Live real-time tick for countdown timers
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000); // 1-second countdown precision

    return () => clearInterval(timer);
  }, []);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (editItem || deletingId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [editItem, deletingId]);

  // Firestore real-time listener
  useEffect(() => {
    const q = query(collection(db, 'manualMotivations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMotivations(docs);
        setLoading(false);
      },
      (err) => {
        console.warn('Falling back to basic listener:', err);
        const fallbackUnsub = onSnapshot(collection(db, 'manualMotivations'), (snapshot) => {
          const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          docs.sort((a, b) => {
            const timeA = parseTimestampMs(a.createdAt) || a.createdAtMs || 0;
            const timeB = parseTimestampMs(b.createdAt) || b.createdAtMs || 0;
            return timeB - timeA;
          });
          setMotivations(docs);
          setLoading(false);
        });
        return () => fallbackUnsub();
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle Publish Motivation
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setPublishing(true);
      const currentTime = new Date();
      const expiresAt = new Date(currentTime.getTime() + MOTIVATION_DURATION_MS);

      await addDoc(collection(db, 'manualMotivations'), {
        text: text.trim(),
        targetStream: targetStream,
        author: author.trim() || 'Mentor MADHAV',
        active: true,
        createdAt: serverTimestamp(),
        createdAtMs: currentTime.getTime(),
        expiresAt: expiresAt,
        expiresAtMs: expiresAt.getTime(),
        createdBy: currentUser?.uid || 'admin',
        createdByName: userProfile?.name || 'Admin'
      });

      setText('');
      setSuccessToast(`Motivation successfully published for ${targetStream === 'all' ? 'All Streams' : targetStream}! Active for 24 hours.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to publish motivation:', err);
      alert('Failed to publish motivation. Please check database permissions.');
    } finally {
      setPublishing(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditItem(item);
    setEditText(item.text || '');
    setEditStream(item.targetStream || 'all');
    setEditAuthor(item.author || 'Mentor MADHAV');
    setEditActive(item.active !== false);
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editItem || !editText.trim()) return;

    try {
      setSavingEdit(true);
      const docRef = doc(db, 'manualMotivations', editItem.id);
      await updateDoc(docRef, {
        text: editText.trim(),
        targetStream: editStream,
        author: editAuthor.trim() || 'Mentor MADHAV',
        active: editActive,
        updatedAt: serverTimestamp()
      });

      setEditItem(null);
    } catch (err) {
      console.error('Failed to update motivation:', err);
      alert('Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle Active / Deactivate
  const handleToggleActive = async (item) => {
    try {
      const docRef = doc(db, 'manualMotivations', item.id);
      await updateDoc(docRef, {
        active: item.active === false,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update status.');
    }
  };

  // Delete Confirmation
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'manualMotivations', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete motivation:', err);
      alert('Failed to delete motivation.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Motivations
  const filteredMotivations = useMemo(() => {
    return motivations.filter((m) => {
      // Stream filter
      if (filterStream !== 'all') {
        const streamMatch = m.targetStream === filterStream || (filterStream === 'All Streams' && m.targetStream === 'all');
        if (!streamMatch) return false;
      }

      // Status filter
      const active = isMotivationActive(m, nowMs);
      if (filterStatus === 'active' && !active) return false;
      if (filterStatus === 'expired' && active) return false;

      return true;
    });
  }, [motivations, filterStream, filterStatus, nowMs]);

  // Compute what each stream is currently seeing right now
  const streamStatusMap = useMemo(() => {
    const streams = ['CA Foundation', 'CA Intermediate', 'CMA Foundation', 'CMA Intermediate'];
    const activeList = motivations.filter((m) => isMotivationActive(m, nowMs));
    activeList.sort((a, b) => {
      const timeA = parseTimestampMs(a.createdAt) || a.createdAtMs || 0;
      const timeB = parseTimestampMs(b.createdAt) || b.createdAtMs || 0;
      return timeB - timeA;
    });

    const allStreamsMotivation = activeList.find(m => m.targetStream === 'all' || m.targetStream === 'All Streams');

    const result = {};
    streams.forEach(stream => {
      const specific = activeList.find(m => m.targetStream === stream);
      if (specific) {
        result[stream] = {
          type: 'specific',
          text: specific.text,
          timeRemaining: getRemainingTime(specific, nowMs).text,
          author: specific.author || 'Mentor MADHAV'
        };
      } else if (allStreamsMotivation) {
        result[stream] = {
          type: 'all_streams',
          text: allStreamsMotivation.text,
          timeRemaining: getRemainingTime(allStreamsMotivation, nowMs).text,
          author: allStreamsMotivation.author || 'Mentor MADHAV'
        };
      } else {
        const autoIdx = new Date(nowMs).getDate() % DEFAULT_AUTOMATIC_QUOTES.length;
        result[stream] = {
          type: 'automatic',
          text: DEFAULT_AUTOMATIC_QUOTES[autoIdx],
          timeRemaining: 'Permanent rotation',
          author: 'Mentor MADHAV'
        };
      }
    });

    return result;
  }, [motivations, nowMs]);

  const activeCount = useMemo(() => {
    return motivations.filter((m) => isMotivationActive(m, nowMs)).length;
  }, [motivations, nowMs]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Motivation Management System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Daily <span className="gold-gradient-text">Motivation</span> Manager
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Publish manual motivational quotes with 24-hour auto-expiration. Specific stream motivations override All Streams, and automatically revert to system quotes upon expiry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 text-center min-w-[110px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Now</div>
              <div className="text-2xl font-black text-gold-400 flex items-center justify-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{activeCount}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 text-center min-w-[110px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Published</div>
              <div className="text-2xl font-black text-white mt-0.5">{motivations.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-3 shadow-glow-emerald animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Live Stream View Snapshot */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-gold-400" />
            <h2 className="text-base font-bold text-white">Current Live Student Experience</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated in real-time</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(streamStatusMap).map(([stream, info]) => {
            const isSpecific = info.type === 'specific';
            const isAll = info.type === 'all_streams';

            return (
              <div 
                key={stream} 
                className={`p-4 rounded-2xl border transition-all ${
                  isSpecific 
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                    : isAll 
                    ? 'bg-gold-500/10 border-gold-500/30' 
                    : 'bg-navy-900/60 border-white/5 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-white truncate">{stream}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                    isSpecific 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : isAll 
                      ? 'bg-gold-500/20 text-gold-300 border-gold-500/40' 
                      : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                  }`}>
                    {isSpecific ? 'Specific' : isAll ? 'All Streams' : 'Automatic'}
                  </span>
                </div>

                <p className="text-xs italic text-slate-200 line-clamp-3 mb-2 font-medium">
                  "{info.text}"
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/10 pt-2">
                  <span>~ {info.author}</span>
                  <span className={isSpecific || isAll ? 'text-gold-300 font-semibold' : ''}>
                    {info.timeRemaining}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Publish Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Column */}
        <div className="lg:col-span-7 glass-card p-6 sm:p-7 rounded-3xl border border-white/10 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/30">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Publish New Motivation</h2>
                <p className="text-xs text-slate-400">Valid for exactly 24 hours from publication</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-300 text-[10px] font-bold">
              24-Hour Validity
            </span>
          </div>

          <form onSubmit={handlePublish} className="space-y-4">
            {/* Target Stream Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Target Stream Audience *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TARGET_STREAMS.map((s) => {
                  const isSelected = targetStream === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTargetStream(s.id)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-gold-500/20 border-gold-500 text-gold-300 shadow-glow-gold'
                          : 'bg-navy-900 border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {s.id === 'all' ? <Globe className="w-3.5 h-3.5 text-gold-400" /> : <GraduationCap className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{s.label}</span>
                      </div>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {targetStream === 'all' 
                  ? 'Will be displayed to students across all streams (unless they have an active specific stream motivation).' 
                  : `Will strictly override and show to all ${targetStream} students.`}
              </p>
            </div>

            {/* Motivation Text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Motivation Quote / Text *
                </label>
                <span className="text-[11px] text-slate-500">
                  {text.length} characters
                </span>
              </div>
              <textarea
                required
                rows="4"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Consistency today creates confidence tomorrow. Keep pushing, your exam target is within reach!"
                className="w-full px-4 py-3 bg-navy-950 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-gold-500 placeholder-slate-600 transition-colors custom-scrollbar"
              />
            </div>

            {/* Author Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Author / Signature
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Mentor MADHAV"
                className="w-full px-4 py-2.5 bg-navy-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
              />
            </div>

            {/* Notice / Rules Callout */}
            <div className="p-3.5 rounded-2xl bg-navy-950/70 border border-gold-500/20 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-gold-400 font-bold text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>Automatic 24-Hour Expiration Rule</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Upon publishing, this motivation will remain active for exactly 24 hours based on Google Server UTC timestamp. When 24 hours finish, the student dashboard automatically falls back without needing any manual intervention.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={publishing || !text.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-navy-950 font-black text-sm shadow-glow-gold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {publishing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Motivation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Motivation ({targetStream === 'all' ? 'All Streams' : targetStream})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Eye className="w-4 h-4 text-gold-400" />
              <span>Student Overview Live Preview</span>
            </div>
            <p className="text-xs text-slate-400">
              This is exactly how students will see this motivation on their dashboard:
            </p>

            {/* Simulated Banner */}
            <div className="p-5 rounded-3xl border border-gold-500/25 bg-gradient-to-r from-gold-500/10 via-amber-500/10 to-orange-500/10 shadow-[0_0_20px_rgba(245,158,11,0.18)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300/90">Daily Motivation</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[9px] font-extrabold tracking-normal">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{targetStream === 'all' ? 'All Streams' : targetStream}</span>
                  </span>
                </div>
              </div>
              <p className="mt-3 text-base sm:text-lg font-semibold italic text-gold-200 leading-relaxed min-h-[48px]">
                “{text.trim() || 'Your motivational quote will appear here...'}”
              </p>
              <div className="mt-3 text-right text-xs sm:text-sm font-medium text-slate-300">
                ~ {author.trim() || 'Mentor MADHAV'}
              </div>
            </div>

            {/* Priority Rules Guide */}
            <div className="p-4 rounded-2xl bg-navy-950/60 border border-white/5 space-y-2 text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Priority Hierarchy</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-start gap-1.5">
                  <span className="text-gold-400 font-bold">1.</span>
                  <span><strong>Specific Stream Motivation:</strong> Shows exclusively to the target course students (e.g. CA Foundation).</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-gold-400 font-bold">2.</span>
                  <span><strong>All Streams Motivation:</strong> Shows to all other students who do not have a specific stream motivation active.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-gold-400 font-bold">3.</span>
                  <span><strong>Automatic Quotes:</strong> System rotates daily quotes if no manual motivation is active or after 24h expiration.</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Motivation History & Current Active Section */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>Manual Motivations History</span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage all published manual quotes, view live countdown timers, and control status.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Stream Filter */}
            <select
              value={filterStream}
              onChange={(e) => setFilterStream(e.target.value)}
              className="px-3 py-2 bg-navy-900 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-gold-500"
            >
              <option value="all">All Stream Audiences</option>
              {TARGET_STREAMS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-navy-900 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-gold-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="expired">Expired Only</option>
            </select>
          </div>
        </div>

        {/* List of Motivations */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gold-400" />
            <span>Loading motivations...</span>
          </div>
        ) : filteredMotivations.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm space-y-2">
            <Sparkles className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-bold text-white">No motivations found matching this filter</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Publish a motivation using the form above to inspire students across CA and CMA streams.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMotivations.map((item) => {
              const active = isMotivationActive(item, nowMs);
              const remaining = getRemainingTime(item, nowMs);
              const isSpecific = item.targetStream !== 'all' && item.targetStream !== 'All Streams';

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    active
                      ? isSpecific
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                        : 'bg-gold-500/10 border-gold-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                      : 'bg-navy-900/60 border-white/5 opacity-70'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Main Content */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Stream Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                          item.targetStream === 'all'
                            ? 'bg-gold-500/20 text-gold-300 border-gold-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {item.targetStream === 'all' ? <Globe className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                          <span>{item.targetStream === 'all' ? 'All Streams' : item.targetStream}</span>
                        </span>

                        {/* Priority Badge */}
                        {isSpecific ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                            High Priority (Stream Override)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                            Global Motivation
                          </span>
                        )}

                        {/* Status Badge */}
                        {active ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active ({remaining.text})</span>
                          </span>
                        ) : item.active === false ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 text-xs font-bold">
                            Paused by Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                            Expired (24h completed)
                          </span>
                        )}
                      </div>

                      {/* Quote Text */}
                      <p className="text-base font-semibold text-white italic leading-relaxed pt-1">
                        “{item.text}”
                      </p>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span>Author: <strong className="text-slate-200">{item.author || 'Mentor MADHAV'}</strong></span>
                        {item.createdAtMs && (
                          <span>Published: <strong className="text-slate-300">{new Date(item.createdAtMs).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
                        )}
                        {item.expiresAtMs && (
                          <span>Expires: <strong className={active ? 'text-gold-300' : 'text-slate-400'}>{new Date(item.expiresAtMs).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 border-white/10 pt-3 lg:pt-0">
                      {/* Toggle Active / Pause */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                          item.active !== false
                            ? 'bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border-slate-500/30'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'
                        }`}
                        title={item.active !== false ? 'Pause Motivation' : 'Resume Motivation'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{item.active !== false ? 'Pause' : 'Activate'}</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Edit Motivation"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeletingId(item.id)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT MOTIVATION MODAL */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-gold-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Sticky Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-navy-900/90 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-gold-400" />
                <span>Edit Manual Motivation</span>
              </h3>
              <button
                onClick={() => setEditItem(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                {/* Target Stream */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Target Stream Audience
                  </label>
                  <select
                    value={editStream}
                    onChange={(e) => setEditStream(e.target.value)}
                    className="w-full px-4 py-2.5 bg-navy-950 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-gold-500"
                  >
                    {TARGET_STREAMS.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Motivation Text */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Motivation Text *
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-4 py-3 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold-500 custom-scrollbar"
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Author / Signature
                  </label>
                  <input
                    type="text"
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    className="w-full px-4 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>

                {/* Active Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="w-4 h-4 rounded accent-gold-500 cursor-pointer"
                    />
                    <span className="text-xs text-white font-bold">
                      Active (Visible to students while within 24-hr period)
                    </span>
                  </label>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-white/10 bg-navy-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editText.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-black shadow-glow-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save & Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 rounded-3xl border border-rose-500/30 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Delete Motivation?</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this manual motivation? Once deleted, students will immediately fallback according to priority rules.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
