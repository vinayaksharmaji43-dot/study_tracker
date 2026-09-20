import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, orderBy, increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  PenLine, Plus, CheckCircle2, Clock, BarChart3, History,
  Star, Upload, Eye, Award, Target, AlertCircle, BookOpen
} from 'lucide-react';
import EmptyState from '../components/EmptyState';

const IMGBB_KEY = 'f43ca36cbb4a3e5de80d145fb53cbfff';

function parseStream(userProfile) {
  const raw = (userProfile?.course || '').toUpperCase();
  const isCMA = raw.includes('CMA');
  const course = isCMA ? 'CMA' : 'CA';
  const level = raw.includes('FOUNDATION') ? 'Foundation' : 'Intermediate';
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', file);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('Image upload failed');
}

export default function WritingPractice() {
  const { currentUser, userProfile } = useAuth();
  const { course, level, attempt } = parseStream(userProfile);
  const streamLabel = `${course} ${level} • ${attempt}`;

  const [activeTab, setActiveTab] = useState('targets');
  const [adminTargets, setAdminTargets] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(true);

  // Modals
  const [completeModal, setCompleteModal] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [pointsModal, setPointsModal] = useState(null);
  const [viewImagesModal, setViewImagesModal] = useState(null);

  // Create form state
  const [form, setForm] = useState({ subject: '', chapter: '', title: '', targetDate: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  // Image upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selfPoints, setSelfPoints] = useState('10');
  const fileInputRef = useRef();

  // Load admin-assigned targets for this stream
  useEffect(() => {
    if (!currentUser?.uid || !course || !level) return;
    const q = query(
      collection(db, 'writingPracticeTargets'),
      where('course', '==', course),
      where('level', '==', level)
    );
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = all.filter(t => !t.attempt || normalizeAttempt(t.attempt) === normalizeAttempt(attempt));
      setAdminTargets(filtered);
    });
  }, [currentUser, course, level, attempt]);

  // Load my submissions
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'writingPracticeSubmissions'),
      where('studentId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => {
      setMySubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, [currentUser]);

  // Load evaluations
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'writingPracticeEvaluations'), where('studentId', '==', currentUser.uid));
    return onSnapshot(q, snap => {
      const m = {};
      snap.docs.forEach(d => { const dt = d.data(); m[dt.submissionId] = { id: d.id, ...dt }; });
      setEvaluations(m);
    });
  }, [currentUser]);

  const completedAdminIds = new Set(
    mySubmissions.filter(s => s.adminTargetId && s.status === 'completed').map(s => s.adminTargetId)
  );
  const pendingAdminTargets = adminTargets.filter(t => !completedAdminIds.has(t.id));
  const pendingSelf = mySubmissions.filter(s => s.createdBy === 'student' && s.status === 'pending');
  const completed = mySubmissions.filter(s => s.status === 'completed');
  const totalPending = pendingSelf.length + pendingAdminTargets.length;

  // File handling
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(p => [...p, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrls(p => [...p, { url: reader.result, name: file.name }]);
      reader.readAsDataURL(file);
    });
  };
  const removeImage = (i) => {
    setSelectedFiles(p => p.filter((_, idx) => idx !== i));
    setPreviewUrls(p => p.filter((_, idx) => idx !== i));
  };
  const resetCompleteModal = () => { setCompleteModal(null); setSelectedFiles([]); setPreviewUrls([]); };

  // Create self target
  const handleCreateTarget = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await addDoc(collection(db, 'writingPracticeSubmissions'), {
        studentId: currentUser.uid,
        studentName: userProfile?.name || currentUser?.email || 'Unknown Student',
        studentEmail: currentUser?.email || 'no-email@test.com',
        course: course || '', 
        level: level || '', 
        attempt: attempt || '',
        subject: form.subject?.trim() || '',
        chapter: form.chapter?.trim() || '',
        title: form.title?.trim() || '',
        targetDate: form.targetDate || '',
        notes: form.notes?.trim() || '',
        createdBy: 'student',
        createdAt: serverTimestamp(),
        status: 'pending',
        uploadedImages: [],
        selfAwardedPoints: 0,
        pointsAwarded: false,
      });
      setForm({ subject: '', chapter: '', title: '', targetDate: '', notes: '' });
      setCreateModal(false);
    } catch (err) { 
      console.error('Create Target Error:', err); 
      alert(`Failed to create target: ${err.message || err}`); 
    }
    finally { setSubmitting(false); }
  };

  // Complete practice
  const handleComplete = async () => {
    if (!completeModal) return;
    try {
      setUploading(true);
      let imageUrls = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const url = await uploadToImgBB(file);
          imageUrls.push(url);
        }
      }
      if (completeModal.submissionId) {
        await updateDoc(doc(db, 'writingPracticeSubmissions', completeModal.submissionId), {
          status: 'completed', completedAt: serverTimestamp(), uploadedImages: imageUrls,
        });
      } else {
        await addDoc(collection(db, 'writingPracticeSubmissions'), {
          studentId: currentUser.uid,
          studentName: userProfile?.name || currentUser?.email || 'Unknown Student',
          studentEmail: currentUser?.email || 'no-email@test.com',
          course: course || '', 
          level: level || '', 
          attempt: attempt || '',
          subject: completeModal.subject || '',
          chapter: completeModal.chapter || '',
          title: completeModal.title || '',
          targetDate: completeModal.targetDate || '',
          adminTargetId: completeModal.adminTargetId,
          createdBy: 'admin',
          createdAt: serverTimestamp(),
          status: 'completed',
          completedAt: serverTimestamp(),
          uploadedImages: imageUrls,
          selfAwardedPoints: 0,
          pointsAwarded: false,
        });
      }
      resetCompleteModal();
    } catch (err) { 
      console.error('Submit Error:', err); 
      alert(`Submission failed: ${err.message || err}`); 
    }
    finally { setUploading(false); }
  };

  // Self award points
  const handleAwardPoints = async (submissionId) => {
    const pts = parseInt(selfPoints, 10);
    if (!pts || pts < 1) return;
    try {
      await updateDoc(doc(db, 'writingPracticeSubmissions', submissionId), {
        selfAwardedPoints: pts, pointsAwarded: true,
      });
      await updateDoc(doc(db, 'users', currentUser.uid), { points: increment(pts) });
      setPointsModal(null);
    } catch (err) { console.error(err); alert('Failed to award points.'); }
  };

  // Analytics
  const totalSelfPts = mySubmissions.reduce((s, sub) => s + (sub.selfAwardedPoints || 0), 0);
  const evalSubs = completed.filter(s => evaluations[s.id]);
  const avgMarks = evalSubs.length > 0
    ? (evalSubs.reduce((s, sub) => { const ev = evaluations[sub.id]; return s + (ev.marksObtained / ev.totalMarks) * 100; }, 0) / evalSubs.length).toFixed(1)
    : null;
  const subjectCount = {};
  mySubmissions.forEach(s => { subjectCount[s.subject] = (subjectCount[s.subject] || 0) + 1; });

  const fmtDate = (ts) => {
    if (!ts) return 'N/A';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Loading Writing Practice...</div>;

  const tabs = [
    { id: 'targets', label: 'My Targets', icon: Target },
    { id: 'history', label: 'History', icon: History },
    { id: 'marks', label: 'Marks & Feedback', icon: Award },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl glass-card border border-purple-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
            <PenLine className="w-3.5 h-3.5" /><span>Writing Practice</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Writing <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Practice Hub</span>
          </h1>
          <p className="text-slate-300 text-sm">{streamLabel}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 glass-card rounded-2xl border border-white/10 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 justify-center ${isActive ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
              {tab.id === 'targets' && totalPending > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] font-black flex items-center justify-center text-white">{totalPending}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* MY TARGETS */}
      {activeTab === 'targets' && (
        <div className="space-y-5">
          <button onClick={() => setCreateModal(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/10 font-bold flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Create My Own Writing Target
          </button>

          {adminTargets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Admin Assigned ({pendingAdminTargets.length} Pending)
              </h3>
              {adminTargets.map(t => {
                const done = completedAdminIds.has(t.id);
                return (
                  <div key={t.id} className={`p-4 rounded-2xl glass-card border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/20'}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Admin Assigned</span>
                        {done && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Done</span>}
                      </div>
                      <div className="font-bold text-white">{t.title}</div>
                      <div className="text-xs text-slate-400">{t.subject}{t.chapter ? ` — ${t.chapter}` : ''}</div>
                      {t.targetDate && <div className="text-xs text-slate-500">Target: {t.targetDate}</div>}
                      {t.instructions && <div className="text-xs text-purple-300/70 italic">{t.instructions}</div>}
                    </div>
                    {!done && (
                      <button onClick={() => { setCompleteModal({ adminTargetId: t.id, subject: t.subject, chapter: t.chapter, title: t.title, targetDate: t.targetDate }); setSelectedFiles([]); setPreviewUrls([]); }}
                        className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-500 transition-all whitespace-nowrap">
                        ✍️ Complete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <PenLine className="w-3.5 h-3.5 text-purple-400" /> My Self Targets ({pendingSelf.length} Pending)
            </h3>
            {pendingSelf.length === 0
              ? <div className="p-6 text-center text-slate-500 text-sm glass-card rounded-2xl border border-white/5">No self targets yet. Create one above!</div>
              : pendingSelf.map(s => (
                <div key={s.id} className="p-4 rounded-2xl glass-card border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold text-purple-400 uppercase">Self Target</span></div>
                    <div className="font-bold text-white">{s.title}</div>
                    <div className="text-xs text-slate-400">{s.subject}{s.chapter ? ` — ${s.chapter}` : ''}</div>
                    {s.targetDate && <div className="text-xs text-slate-500">Target: {s.targetDate}</div>}
                  </div>
                  <button onClick={() => { setCompleteModal({ submissionId: s.id, subject: s.subject, chapter: s.chapter, title: s.title, targetDate: s.targetDate }); setSelectedFiles([]); setPreviewUrls([]); }}
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-500 transition-all whitespace-nowrap">
                    ✍️ Complete
                  </button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-purple-400" /> Practice History ({completed.length})</h3>
          {completed.length === 0
            ? <EmptyState icon={History} title="No Completed Practices" description="Complete a writing practice to see your history here." />
            : completed.map(s => {
              const ev = evaluations[s.id];
              const pct = ev ? Math.round((ev.marksObtained / ev.totalMarks) * 100) : null;
              return (
                <div key={s.id} className="p-4 rounded-2xl glass-card border border-emerald-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-bold text-white">{s.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.createdBy === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                          {s.createdBy === 'admin' ? 'Admin Assigned' : 'Self Target'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{s.subject}{s.chapter ? ` — ${s.chapter}` : ''}</div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                        {s.targetDate && <span>🎯 Target: {s.targetDate}</span>}
                        <span>✅ Done: {fmtDate(s.completedAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {ev && <div className="text-sm font-black text-emerald-400">{ev.marksObtained}/{ev.totalMarks} ({pct}%)</div>}
                      {s.selfAwardedPoints > 0 && <div className="text-xs font-bold text-gold-400">+{s.selfAwardedPoints} PTS</div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.uploadedImages?.length > 0 && (
                      <button onClick={() => setViewImagesModal(s.uploadedImages)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 font-bold flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {s.uploadedImages.length} Photo(s) — Submitted to Admin ✓
                      </button>
                    )}
                    {!s.pointsAwarded && (
                      <button onClick={() => setPointsModal(s.id)} className="text-xs px-3 py-1.5 rounded-lg bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 font-bold flex items-center gap-1">
                        <Star className="w-3 h-3" /> Award Points
                      </button>
                    )}
                    {s.pointsAwarded && <span className="text-xs text-gold-400 font-bold">✓ +{s.selfAwardedPoints} PTS Self Awarded</span>}
                  </div>
                  {ev?.feedback && (
                    <div className="p-3 rounded-xl bg-navy-900 border border-white/5 text-xs text-slate-300">
                      <span className="text-slate-400 font-bold">Admin Feedback: </span>{ev.feedback}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}

      {/* MARKS & FEEDBACK */}
      {activeTab === 'marks' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Award className="w-5 h-5 text-gold-400" /> Marks & Feedback</h3>
          {evalSubs.length === 0
            ? <EmptyState icon={Award} title="No Evaluations Yet" description="Admin will review your submitted practices and assign marks & feedback." />
            : evalSubs.map(s => {
              const ev = evaluations[s.id];
              const pct = Math.round((ev.marksObtained / ev.totalMarks) * 100);
              const pctColor = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
              const barColor = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={s.id} className="p-5 rounded-2xl glass-card border border-gold-500/20 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="font-bold text-white">{s.title}</div><div className="text-xs text-slate-400">{s.subject}{s.chapter ? ` — ${s.chapter}` : ''}</div></div>
                    <div className="text-right"><div className={`text-2xl font-black font-mono ${pctColor}`}>{pct}%</div><div className="text-xs text-slate-400">{ev.marksObtained}/{ev.totalMarks} marks</div></div>
                  </div>
                  <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  {ev.feedback && (
                    <div className="p-3 rounded-xl bg-navy-900 border border-gold-500/20 text-sm text-slate-200">
                      <span className="text-gold-400 font-bold text-xs uppercase block mb-1">Admin Feedback</span>{ev.feedback}
                    </div>
                  )}
                  {!s.pointsAwarded
                    ? <button onClick={() => setPointsModal(s.id)} className="w-full py-2 rounded-xl bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-black hover:bg-gold-500/30 flex items-center justify-center gap-2">
                        <Star className="w-4 h-4" /> Award Yourself Points
                      </button>
                    : <div className="text-center text-xs text-gold-400 font-bold">✓ +{s.selfAwardedPoints} Points Self Awarded</div>
                  }
                </div>
              );
            })
          }
        </div>
      )}

      {/* ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-400" /> Writing Analytics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: mySubmissions.length + pendingAdminTargets.length, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
              { label: 'Completed', value: completed.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Pending', value: totalPending, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Self Points', value: `+${totalSelfPts}`, color: 'text-gold-400', bg: 'bg-gold-500/10 border-gold-500/20' },
            ].map(stat => (
              <div key={stat.label} className={`p-4 rounded-2xl glass-card border ${stat.bg} text-center`}>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          {avgMarks && (
            <div className="p-4 rounded-2xl glass-card border border-gold-500/20 text-center">
              <div className="text-3xl font-black text-gold-400">{avgMarks}%</div>
              <div className="text-xs text-slate-400 mt-1">Average Marks (Admin Evaluated)</div>
            </div>
          )}
          {Object.keys(subjectCount).length > 0 && (
            <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Subject-wise Practice Count</div>
              {Object.entries(subjectCount).sort((a, b) => b[1] - a[1]).map(([subject, count]) => {
                const max = Math.max(...Object.values(subjectCount));
                return (
                  <div key={subject} className="space-y-1">
                    <div className="flex items-center justify-between text-xs"><span className="text-slate-300">{subject}</span><span className="text-purple-400 font-black">{count}</span></div>
                    <div className="w-full bg-navy-950 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {mySubmissions.length === 0 && <EmptyState icon={BarChart3} title="No Data Yet" description="Complete writing practices to see your analytics." />}
        </div>
      )}

      {/* CREATE TARGET MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><PenLine className="w-5 h-5 text-purple-400" /> Create Writing Target</h3>
              <button onClick={() => setCreateModal(false)} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateTarget} className="space-y-4">
              {[
                { label: 'Subject *', field: 'subject', placeholder: 'e.g. Business Law', type: 'text', required: true },
                { label: 'Chapter / Topic', field: 'chapter', placeholder: 'e.g. Indian Contract Act', type: 'text', required: false },
                { label: 'Practice Title *', field: 'title', placeholder: 'e.g. Practice 3 Questions', type: 'text', required: true },
                { label: 'Target Date', field: 'targetDate', placeholder: '', type: 'date', required: false },
                { label: 'Notes (Optional)', field: 'notes', placeholder: 'Any specific instructions...', type: 'text', required: false },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input type={f.type} required={f.required} placeholder={f.placeholder} value={form[f.field]}
                    onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreateModal(false)} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-black hover:bg-purple-500 disabled:opacity-50">{submitting ? 'Saving...' : 'Create Target'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE MODAL */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-white/15 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Complete Practice</h3>
              <button onClick={resetCompleteModal} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
            </div>
            <div className="p-3 rounded-xl bg-navy-900/80 border border-white/5 space-y-1">
              <div className="font-bold text-white">{completeModal.title}</div>
              <div className="text-xs text-slate-400">{completeModal.subject}{completeModal.chapter ? ` — ${completeModal.chapter}` : ''}</div>
              {completeModal.targetDate && <div className="text-xs text-slate-500">Target: {completeModal.targetDate}</div>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">Upload Handwritten Answer Photos (Optional)</label>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-xl border-2 border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/10 text-sm font-bold flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Select Photos
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              {previewUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {previewUrls.map((img, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-white/10 aspect-square group">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-2">Images will be submitted to admin for review.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={resetCompleteModal} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancel</button>
              <button onClick={handleComplete} disabled={uploading} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-500 disabled:opacity-50">
                {uploading ? 'Uploading...' : '✅ Mark Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AWARD POINTS MODAL */}
      {pointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-gold-500/30 max-w-sm w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Star className="w-5 h-5 text-gold-400" /> Award Yourself Points</h3>
              <button onClick={() => setPointsModal(null)} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
            </div>
            <p className="text-sm text-slate-300">Points awarded for completing this writing practice (cannot be changed later).</p>
            <input type="number" min="1" max="100" value={selfPoints} onChange={e => setSelfPoints(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-gold-500/30 text-gold-400 font-black text-3xl text-center focus:outline-none" />
            <div className="flex gap-3">
              <button onClick={() => setPointsModal(null)} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancel</button>
              <button onClick={() => handleAwardPoints(pointsModal)} className="w-full py-2.5 rounded-xl bg-gold-500 text-navy-950 text-sm font-black hover:bg-gold-400">+{selfPoints} Points 🎖️</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW IMAGES MODAL */}
      {viewImagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md" onClick={() => setViewImagesModal(null)}>
          <div className="max-w-2xl w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold">Submitted Answers ({viewImagesModal.length} photos)</h3>
              <button onClick={() => setViewImagesModal(null)} className="text-slate-400 hover:text-white font-bold text-2xl">✕</button>
            </div>
            {viewImagesModal.map((url, i) => (
              <img key={i} src={url} alt={`Page ${i + 1}`} className="w-full rounded-2xl border border-white/10 shadow-2xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
