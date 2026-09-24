import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Target, Plus, CheckCircle, XCircle, Trash2, Calendar, FileText, UploadCloud, Users, Flag, MessageSquare } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';

const COURSES = ['CA', 'CMA'];
const LEVELS = ['Foundation', 'Intermediate'];
const CA_ATTEMPTS = ['May 27', 'Jan 27', 'Sep 27', 'May 2027', 'Jan 2027', 'Sep 2027'];
const CMA_ATTEMPTS = ['June 27', 'Dec 27', 'June 2027', 'December 2027'];

function getAttempts(course) {
  return course === 'CMA' ? CMA_ATTEMPTS : CA_ATTEMPTS;
}

export default function AdminWeeklyMissions() {
  const [activeTab, setActiveTab] = useState('missions'); // 'missions' or 'reviews'
  
  const [missions, setMissions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [missionType, setMissionType] = useState('Mixed Revision');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rewardPoints, setRewardPoints] = useState(50);
  const [proofRequired, setProofRequired] = useState(false);
  const [audienceType, setAudienceType] = useState('all');
  const [course, setCourse] = useState('CA');
  const [level, setLevel] = useState('Foundation');
  const [attempt, setAttempt] = useState('May 27');
  const [submitting, setSubmitting] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal || reviewModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal, reviewModal]);

  // Review State
  const [reviewModal, setReviewModal] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const qM = query(collection(db, 'weeklyMissions'), orderBy('createdAt', 'desc'));
    const unsubM = onSnapshot(qM, (snap) => setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qS = query(collection(db, 'weeklyMissionSubmissions'), orderBy('submittedAt', 'desc'));
    const unsubS = onSnapshot(qS, (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    setLoading(false);
    return () => { unsubM(); unsubS(); };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await addDoc(collection(db, 'weeklyMissions'), {
        title, subject, topic, description, missionType,
        startDate, endDate,
        rewardPoints: Number(rewardPoints),
        proofRequired,
        audienceType,
        ...(audienceType === 'specific' && { course, level, attempt }),
        createdAt: serverTimestamp(),
        createdBy: 'Admin'
      });
      setShowModal(false);
      setTitle(''); setSubject(''); setTopic(''); setDescription('');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this mission?')) return;
    await deleteDoc(doc(db, 'weeklyMissions', id));
  };

  const handleReview = async (status) => {
    if (!reviewModal) return;
    try {
      const subRef = doc(db, 'weeklyMissionSubmissions', reviewModal.id);
      
      // If accept, grant reward
      if (status === 'completed' && !reviewModal.rewardGranted) {
        const m = missions.find(x => x.id === reviewModal.missionId);
        const pts = m?.rewardPoints || 0;
        const userRef = doc(db, 'users', reviewModal.studentId);
        await updateDoc(userRef, { points: increment(pts) });
        
        await updateDoc(subRef, {
          status,
          feedback,
          rewardGranted: true,
          reviewedAt: serverTimestamp()
        });
      } else {
        await updateDoc(subRef, {
          status,
          feedback,
          reviewedAt: serverTimestamp()
        });
      }
      setReviewModal(null);
      setFeedback('');
    } catch (err) {
      alert('Review failed: ' + err.message);
    }
  };

  const pendingReviews = submissions.filter(s => s.status === 'pending_review');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <Flag className="w-3.5 h-3.5" /><span>Weekly Missions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Mission <span className="text-rose-400">Control</span></h1>
            <p className="text-slate-300 text-sm max-w-xl">Create weekly revision missions and review student proofs.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-all hover:scale-105">
            <Plus className="w-5 h-5" /><span>Create Mission</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <button onClick={() => setActiveTab('missions')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'missions' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:bg-white/5 border border-transparent'}`}>
          Active Missions
        </button>
        <button onClick={() => setActiveTab('reviews')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'reviews' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:bg-white/5 border border-transparent'}`}>
          <span>Pending Reviews</span>
          {pendingReviews.length > 0 && <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">{pendingReviews.length}</span>}
        </button>
      </div>

      {activeTab === 'missions' ? (
        missions.length === 0 ? (
          <EmptyState icon={Target} title="No Missions Found" description="Create a weekly mission to assign revision tasks." actionText="Create Mission" onAction={() => setShowModal(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map(m => (
              <div key={m.id} className="p-6 rounded-2xl glass-card border border-white/10 space-y-4 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{m.title}</h3>
                    <div className="text-xs text-slate-400 mt-1">{m.subject} • {m.topic}</div>
                  </div>
                  <button onClick={() => handleDelete(m.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-slate-300 bg-navy-900/50 p-3 rounded-xl border border-white/5">
                  {m.description}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                  <span className="px-2 py-1 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/20">+{m.rewardPoints} XP</span>
                  <span className="px-2 py-1 rounded-full bg-navy-900 border border-white/10 text-slate-300">
                    {m.audienceType === 'specific' ? `${m.course} ${m.level} • ${m.attempt}` : 'All Streams'}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
                    {m.missionType}
                  </span>
                  {m.proofRequired && (
                    <span className="px-2 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                      <UploadCloud className="w-3 h-3" /> Proof Req.
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {m.startDate} to {m.endDate}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pendingReviews.length === 0 ? (
          <EmptyState icon={CheckCircle} title="All Caught Up!" description="No pending mission proofs to review." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReviews.map(s => {
              const m = missions.find(x => x.id === s.missionId);
              return (
                <div key={s.id} className="p-6 rounded-2xl glass-card border border-rose-500/30 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-rose-400"/> {s.studentName}</h3>
                      <div className="text-xs text-slate-400 mt-1">Mission: {m?.title || 'Unknown Mission'}</div>
                    </div>
                  </div>
                  {s.proofUrl && (
                    <a href={s.proofUrl} target="_blank" rel="noopener noreferrer" className="block w-full overflow-hidden rounded-xl border border-white/10">
                      <img src={s.proofUrl} alt="Proof" className="w-full h-32 object-cover hover:scale-105 transition-transform" />
                    </a>
                  )}
                  <button onClick={() => setReviewModal(s)} className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors">
                    Review Submission
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Target className="w-5 h-5 text-rose-400" /><span>Create Mission</span></h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Title</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm" placeholder="e.g. Revise Partnership Accounts" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                  <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm" placeholder="Accounting" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Topic</label>
                  <input type="text" required value={topic} onChange={e => setTopic(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm" placeholder="Partnership" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description / Task</label>
                <textarea rows="3" required value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm resize-none" placeholder="Revise chapters 1-3 + solve 20 questions"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Type</label>
                  <select value={missionType} onChange={e => setMissionType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm">
                    {['Read / Revise', 'Practice Questions', 'Writing Practice', 'Complete Test', 'Mixed Revision'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reward Points (XP)</label>
                  <input type="number" required value={rewardPoints} onChange={e => setRewardPoints(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                  <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
                  <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Audience Type</label>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button type="button" onClick={() => setAudienceType('all')} className={`py-2 rounded-xl border text-xs font-bold transition-all ${audienceType === 'all' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-navy-900 border-white/10 text-slate-400'}`}>All Streams</button>
                  <button type="button" onClick={() => setAudienceType('specific')} className={`py-2 rounded-xl border text-xs font-bold transition-all ${audienceType === 'specific' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-navy-900 border-white/10 text-slate-400'}`}>Specific Stream</button>
                </div>
                {audienceType === 'specific' && (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-navy-900/50 border border-white/5">
                    <select value={course} onChange={e => { setCourse(e.target.value); setAttempt(getAttempts(e.target.value)[0]); }} className="px-2 py-2 rounded-lg bg-navy-900 border border-white/10 text-white text-xs">
                      {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={level} onChange={e => setLevel(e.target.value)} className="px-2 py-2 rounded-lg bg-navy-900 border border-white/10 text-white text-xs">
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select value={attempt} onChange={e => setAttempt(e.target.value)} className="px-2 py-2 rounded-lg bg-navy-900 border border-white/10 text-white text-xs">
                      {getAttempts(course).map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="proof" checked={proofRequired} onChange={e => setProofRequired(e.target.checked)} className="w-4 h-4 rounded bg-navy-900 border-white/10" />
                <label htmlFor="proof" className="text-sm font-bold text-slate-300">Require Photo/Screenshot Proof</label>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-500 disabled:opacity-50">Create Mission</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 rounded-3xl border border-white/15 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-4">Review Proof - {reviewModal.studentName}</h3>
            {reviewModal.proofUrl ? (
              <img src={reviewModal.proofUrl} alt="Proof" className="w-full rounded-xl border border-white/10 max-h-80 object-contain bg-navy-900" />
            ) : (
              <div className="text-slate-400 text-sm italic">No proof image submitted.</div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Feedback (Optional)</label>
              <textarea rows="2" value={feedback} onChange={e => setFeedback(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-sm" placeholder="Great job!"></textarea>
            </div>
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button onClick={() => setReviewModal(null)} className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5">Cancel</button>
              <button onClick={() => handleReview('rejected')} className="w-full py-3 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/30">Reject</button>
              <button onClick={() => handleReview('completed')} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Accept & Award</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
