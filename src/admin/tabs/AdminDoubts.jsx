import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { HelpCircle, MessageSquare, CheckCircle, Clock, Trash2, Send, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminDoubts() {
  const { userProfile } = useAuth();
  const [doubts, setDoubts] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'answered'
  
  // Reply form state
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'doubts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDoubts(docs);
    });

    return () => unsubscribe();
  }, []);

  const handlePostReply = async (doubtId) => {
    if (!replyText.trim()) return;

    try {
      setSubmitting(true);
      const doubtRef = doc(db, 'doubts', doubtId);
      await updateDoc(doubtRef, {
        reply: replyText.trim(),
        repliedBy: userProfile?.name || 'Faculty Admin',
        status: 'answered',
        repliedAt: serverTimestamp()
      });

      setReplyText('');
      setReplyingId(null);
    } catch (err) {
      console.error("Error replying to doubt:", err);
      alert("Failed to submit reply.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteDoubt = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'doubts', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting doubt:", err);
      alert("Failed to delete doubt.");
    }
  };

  const filteredDoubts = doubts.filter(d => {
    if (filter === 'pending') return d.status === 'open';
    if (filter === 'answered') return d.status === 'answered';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Faculty Academic Support Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Academic Doubts <span className="gold-gradient-text">Management</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Review student questions, post faculty answers, and maintain academic doubt threads.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 p-1.5 rounded-2xl glass-card border border-white/10 w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'all' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
          }`}
        >
          All ({doubts.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'pending' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
          }`}
        >
          Pending Reply ({doubts.filter(d => d.status === 'open').length})
        </button>
        <button
          onClick={() => setFilter('answered')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'answered' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
          }`}
        >
          Answered ({doubts.filter(d => d.status === 'answered').length})
        </button>
      </div>

      {/* Doubts List */}
      {filteredDoubts.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No academic doubts found"
          description="Student doubt submissions will be displayed here for faculty reply."
        />
      ) : (
        <div className="space-y-6">
          {filteredDoubts.map((doubt) => (
            <div key={doubt.id} className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      {doubt.subject}
                    </span>
                    <span className="text-xs text-slate-400">
                      Student: <strong className="text-white">{doubt.studentName}</strong> • {formatDate(doubt.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white pt-1">{doubt.title}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  {doubt.status === 'answered' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Answered
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Reply
                    </span>
                  )}

                  <button
                    onClick={() => setDeletingId(doubt.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Body */}
              <p className="text-sm text-slate-300 bg-navy-950/60 p-4 rounded-2xl border border-white/5 leading-relaxed">
                {doubt.description}
              </p>

              {/* Answer Thread / Reply Form */}
              {doubt.reply ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-gold-400" />
                      Faculty Solution by {doubt.repliedBy}
                    </span>
                    <span className="text-slate-400 font-normal">{formatDate(doubt.repliedAt)}</span>
                  </div>
                  <p className="text-sm text-slate-100 font-medium leading-relaxed">
                    {doubt.reply}
                  </p>
                  <div className="pt-2 text-right">
                    <button
                      onClick={() => {
                        setReplyingId(doubt.id);
                        setReplyText(doubt.reply);
                      }}
                      className="text-xs font-bold text-amber-400 hover:underline"
                    >
                      Edit Answer
                    </button>
                  </div>
                </div>
              ) : null}

              {replyingId === doubt.id && (
                <div className="space-y-3 p-4 rounded-2xl bg-navy-900 border border-white/15 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Write Official Answer
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Provide full academic step-by-step answer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setReplyingId(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handlePostReply(doubt.id)}
                      disabled={submitting}
                      className="px-5 py-2 rounded-xl bg-amber-500 text-navy-950 text-xs font-black shadow-glow-gold hover:bg-amber-400 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Posting...' : 'Publish Answer'}</span>
                    </button>
                  </div>
                </div>
              )}

              {!doubt.reply && replyingId !== doubt.id && (
                <div>
                  <button
                    onClick={() => {
                      setReplyingId(doubt.id);
                      setReplyText('');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-navy-950 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Reply to Doubt</span>
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-red-500/30 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Delete Academic Doubt?</h3>
            <p className="text-xs text-slate-400">Are you sure you want to remove this doubt entry?</p>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDoubt}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
