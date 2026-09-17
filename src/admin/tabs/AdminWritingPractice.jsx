import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, orderBy, deleteDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  PenLine, Plus, Trash2, Eye, Award, CheckCircle2, Clock,
  Users, BarChart3, Star, AlertCircle, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import EmptyState from '../../components/EmptyState';

const COURSES = ['CA', 'CMA'];
const LEVELS = ['Foundation', 'Intermediate'];
const CA_ATTEMPTS = ['Jan 2027', 'May 2027', 'Sep 2027'];
const CMA_ATTEMPTS = ['Jun 2027', 'Dec 2027'];

function getAttempts(course) {
  return course === 'CMA' ? CMA_ATTEMPTS : CA_ATTEMPTS;
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

const fmtDate = (ts) => {
  if (!ts) return 'N/A';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminWritingPractice() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // All admin targets
  const [targets, setTargets] = useState([]);
  // All student submissions
  const [submissions, setSubmissions] = useState([]);
  // All evaluations
  const [evaluations, setEvaluations] = useState({});

  // Create target form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [tForm, setTForm] = useState({ course: 'CA', level: 'Foundation', attempt: 'Jan 2027', subject: '', chapter: '', title: '', targetDate: '', instructions: '' });
  const [tSaving, setTSaving] = useState(false);

  // Evaluate modal
  const [evalModal, setEvalModal] = useState(null); // { submissionId, studentId, ... }
  const [evalForm, setEvalForm] = useState({ marksObtained: '', totalMarks: '10', feedback: '' });
  const [evalSaving, setEvalSaving] = useState(false);

  // View images modal
  const [viewImagesModal, setViewImagesModal] = useState(null);

  // Expand submission details
  const [expandedSub, setExpandedSub] = useState(null);

  // Filter state for submissions
  const [subFilter, setSubFilter] = useState({ course: 'all', level: 'all', status: 'all' });

  // Load all targets
  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'writingPracticeTargets'), orderBy('createdAt', 'desc')),
      snap => setTargets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // Load all submissions
  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'writingPracticeSubmissions'), orderBy('createdAt', 'desc')),
      snap => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // Load all evaluations
  useEffect(() => {
    return onSnapshot(collection(db, 'writingPracticeEvaluations'), snap => {
      const m = {};
      snap.docs.forEach(d => { const dt = d.data(); m[dt.submissionId] = { id: d.id, ...dt }; });
      setEvaluations(m);
    });
  }, []);

  // Create / Edit target
  const handleSaveTarget = async (e) => {
    e.preventDefault();
    if (!tForm.subject.trim() || !tForm.title.trim()) return;
    try {
      setTSaving(true);
      const payload = {
        course: tForm.course,
        level: tForm.level,
        attempt: tForm.attempt,
        subject: tForm.subject.trim(),
        chapter: tForm.chapter.trim(),
        title: tForm.title.trim(),
        targetDate: tForm.targetDate,
        instructions: tForm.instructions.trim(),
      };
      if (editTarget) {
        await updateDoc(doc(db, 'writingPracticeTargets', editTarget.id), payload);
      } else {
        await addDoc(collection(db, 'writingPracticeTargets'), { ...payload, createdAt: serverTimestamp(), createdBy: currentUser.uid });
      }
      setShowCreateModal(false);
      setEditTarget(null);
      setTForm({ course: 'CA', level: 'Foundation', attempt: 'Jan 2027', subject: '', chapter: '', title: '', targetDate: '', instructions: '' });
    } catch (err) { console.error(err); alert('Failed to save target.'); }
    finally { setTSaving(false); }
  };

  const openEdit = (t) => {
    setEditTarget(t);
    setTForm({ course: t.course, level: t.level, attempt: t.attempt || 'Jan 2027', subject: t.subject, chapter: t.chapter || '', title: t.title, targetDate: t.targetDate || '', instructions: t.instructions || '' });
    setShowCreateModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this target? Students who already submitted will not be affected.')) return;
    await deleteDoc(doc(db, 'writingPracticeTargets', id));
  };

  // Give marks
  const handleEvaluate = async (e) => {
    e.preventDefault();
    const marks = parseFloat(evalForm.marksObtained);
    const total = parseFloat(evalForm.totalMarks);
    if (isNaN(marks) || isNaN(total) || marks > total) return alert('Invalid marks.');
    try {
      setEvalSaving(true);
      const existing = evaluations[evalModal.id];
      const payload = {
        submissionId: evalModal.id,
        studentId: evalModal.studentId,
        marksObtained: marks,
        totalMarks: total,
        feedback: evalForm.feedback.trim(),
        evaluatedAt: serverTimestamp(),
        evaluatedBy: currentUser.uid,
      };
      if (existing) {
        await updateDoc(doc(db, 'writingPracticeEvaluations', existing.id), payload);
      } else {
        await addDoc(collection(db, 'writingPracticeEvaluations'), payload);
      }
      setEvalModal(null);
      setEvalForm({ marksObtained: '', totalMarks: '10', feedback: '' });
    } catch (err) { console.error(err); alert('Failed to save evaluation.'); }
    finally { setEvalSaving(false); }
  };

  // Stats
  const totalSubs = submissions.length;
  const completedSubs = submissions.filter(s => s.status === 'completed').length;
  const pendingSubs = submissions.filter(s => s.status === 'pending').length;
  const evaluatedCount = Object.keys(evaluations).length;
  const withPhotos = submissions.filter(s => s.uploadedImages?.length > 0).length;

  // Filtered submissions
  const filteredSubs = submissions.filter(s => {
    if (subFilter.course !== 'all' && s.course !== subFilter.course) return false;
    if (subFilter.level !== 'all' && s.level !== subFilter.level) return false;
    if (subFilter.status !== 'all' && s.status !== subFilter.status) return false;
    return true;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'targets', label: 'Manage Targets', icon: PenLine },
    { id: 'submissions', label: `Submissions (${totalSubs})`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl glass-card border border-purple-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
            <PenLine className="w-3.5 h-3.5" /><span>Admin — Writing Practice</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Writing <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Practice Manager</span></h1>
          <p className="text-slate-300 text-sm">Assign targets, review submissions, give marks & feedback.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 glass-card rounded-2xl border border-white/10 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 justify-center ${isActive ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Targets', value: targets.length, color: 'text-purple-400', bg: 'border-purple-500/20 bg-purple-500/10' },
              { label: 'Submissions', value: totalSubs, color: 'text-blue-400', bg: 'border-blue-500/20 bg-blue-500/10' },
              { label: 'Completed', value: completedSubs, color: 'text-emerald-400', bg: 'border-emerald-500/20 bg-emerald-500/10' },
              { label: 'Pending', value: pendingSubs, color: 'text-amber-400', bg: 'border-amber-500/20 bg-amber-500/10' },
              { label: 'Evaluated', value: evaluatedCount, color: 'text-gold-400', bg: 'border-gold-500/20 bg-gold-500/10' },
            ].map(stat => (
              <div key={stat.label} className={`p-4 rounded-2xl glass-card border ${stat.bg} text-center`}>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate-400 mt-1 font-bold uppercase">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Pending evaluations */}
          <div className="glass-card rounded-2xl border border-amber-500/20 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" /> Submissions Pending Evaluation ({completedSubs - evaluatedCount > 0 ? completedSubs - evaluatedCount : 0})
            </h3>
            {submissions.filter(s => s.status === 'completed' && !evaluations[s.id]).slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-navy-900/60 border border-white/5 gap-3">
                <div>
                  <div className="text-sm font-bold text-white">{s.studentName}</div>
                  <div className="text-xs text-slate-400">{s.subject} — {s.title}</div>
                  <div className="text-[10px] text-slate-500">{s.course} {s.level} • {s.attempt}</div>
                </div>
                <button onClick={() => { setEvalModal(s); setEvalForm({ marksObtained: '', totalMarks: '10', feedback: '' }); }}
                  className="px-3 py-1.5 rounded-lg bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 text-xs font-bold whitespace-nowrap flex items-center gap-1">
                  <Award className="w-3 h-3" /> Give Marks
                </button>
              </div>
            ))}
            {completedSubs - evaluatedCount <= 0 && <div className="text-xs text-emerald-400 text-center font-bold py-2">✅ All completed submissions evaluated!</div>}
          </div>
        </div>
      )}

      {/* MANAGE TARGETS */}
      {activeTab === 'targets' && (
        <div className="space-y-5">
          <button onClick={() => { setEditTarget(null); setTForm({ course: 'CA', level: 'Foundation', attempt: 'Jan 2027', subject: '', chapter: '', title: '', targetDate: '', instructions: '' }); setShowCreateModal(true); }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/10 font-bold flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Assign New Writing Target to Stream
          </button>

          {targets.length === 0
            ? <EmptyState icon={PenLine} title="No Targets Created" description="Create writing targets and assign them to specific streams." />
            : targets.map(t => {
              const subCount = submissions.filter(s => s.adminTargetId === t.id && s.status === 'completed').length;
              return (
                <div key={t.id} className="p-4 rounded-2xl glass-card border border-white/10 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">{t.course} {t.level}</span>
                        <span className="text-xs font-bold text-amber-400">{t.attempt}</span>
                      </div>
                      <div className="font-bold text-white">{t.title}</div>
                      <div className="text-xs text-slate-400">{t.subject}{t.chapter ? ` — ${t.chapter}` : ''}</div>
                      {t.targetDate && <div className="text-xs text-slate-500">Target: {t.targetDate}</div>}
                      {t.instructions && <div className="text-xs text-slate-400 italic">{t.instructions}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-emerald-400">{subCount} Submitted</span>
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Edit"><BookOpen className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 p-3 glass-card rounded-2xl border border-white/10">
            {[
              { key: 'course', options: ['all', 'CA', 'CMA'], label: 'Course' },
              { key: 'level', options: ['all', 'Foundation', 'Intermediate'], label: 'Level' },
              { key: 'status', options: ['all', 'pending', 'completed'], label: 'Status' },
            ].map(f => (
              <select key={f.key} value={subFilter[f.key]} onChange={e => setSubFilter(p => ({ ...p, [f.key]: e.target.value }))}
                className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500 capitalize">
                {f.options.map(o => <option key={o} value={o}>{o === 'all' ? `All ${f.label}s` : o}</option>)}
              </select>
            ))}
            <span className="text-xs text-slate-400 ml-auto">{filteredSubs.length} results</span>
          </div>

          {filteredSubs.length === 0
            ? <EmptyState icon={Users} title="No Submissions" description="No student submissions match the current filter." />
            : filteredSubs.map(s => {
              const ev = evaluations[s.id];
              const pct = ev ? Math.round((ev.marksObtained / ev.totalMarks) * 100) : null;
              const isExpanded = expandedSub === s.id;
              return (
                <div key={s.id} className={`rounded-2xl glass-card border overflow-hidden ${s.status === 'completed' ? 'border-emerald-500/20' : 'border-white/10'}`}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedSub(isExpanded ? null : s.id)}>
                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                        <span className="font-bold text-white text-sm">{s.studentName}</span>
                        <span className="text-[10px] text-slate-400">{s.studentEmail}</span>
                      </div>
                      <div className="text-xs text-slate-400">{s.subject}{s.chapter ? ` — ${s.chapter}` : ''} • {s.title}</div>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">{s.course} {s.level} • {s.attempt}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{s.status}</span>
                        {s.createdBy === 'admin' ? <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">Admin Assigned</span> : <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">Self Target</span>}
                        {ev && <span className="px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-bold">✓ Evaluated: {ev.marksObtained}/{ev.totalMarks}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === 'completed' && (
                        <button onClick={e => { e.stopPropagation(); setEvalModal(s); const ex = evaluations[s.id]; setEvalForm({ marksObtained: ex?.marksObtained?.toString() || '', totalMarks: ex?.totalMarks?.toString() || '10', feedback: ex?.feedback || '' }); }}
                          className="px-3 py-1.5 rounded-lg bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 text-xs font-bold flex items-center gap-1">
                          <Award className="w-3 h-3" />{ev ? 'Edit Marks' : 'Give Marks'}
                        </button>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400">
                        <div><span className="font-bold text-slate-300 block">Target Date</span>{s.targetDate || 'Not set'}</div>
                        <div><span className="font-bold text-slate-300 block">Created</span>{fmtDate(s.createdAt)}</div>
                        <div><span className="font-bold text-slate-300 block">Completed</span>{s.status === 'completed' ? fmtDate(s.completedAt) : 'Pending'}</div>
                        <div><span className="font-bold text-slate-300 block">Self Points</span>{s.selfAwardedPoints > 0 ? `+${s.selfAwardedPoints} PTS` : 'Not awarded'}</div>
                      </div>
                      {s.uploadedImages?.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-slate-300 mb-2">Uploaded Answers ({s.uploadedImages.length} photos)</div>
                          <div className="grid grid-cols-4 gap-2">
                            {s.uploadedImages.map((url, i) => (
                              <img key={i} src={url} alt={`Page ${i + 1}`} onClick={() => setViewImagesModal(s.uploadedImages)}
                                className="w-full aspect-square object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-80 transition-opacity" />
                            ))}
                          </div>
                          <button onClick={() => setViewImagesModal(s.uploadedImages)} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold">
                            <Eye className="w-3 h-3" /> View Full Size
                          </button>
                        </div>
                      )}
                      {ev && (
                        <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/20 space-y-1">
                          <div className="text-xs font-bold text-gold-400">Evaluation: {ev.marksObtained}/{ev.totalMarks} marks ({Math.round((ev.marksObtained / ev.totalMarks) * 100)}%)</div>
                          {ev.feedback && <div className="text-xs text-slate-300">{ev.feedback}</div>}
                          <div className="text-[10px] text-slate-500">Evaluated: {fmtDate(ev.evaluatedAt)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}

      {/* CREATE/EDIT TARGET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-white/15 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><PenLine className="w-5 h-5 text-purple-400" />{editTarget ? 'Edit Target' : 'Assign New Target'}</h3>
              <button onClick={() => { setShowCreateModal(false); setEditTarget(null); }} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Course', field: 'course', options: COURSES },
                  { label: 'Level', field: 'level', options: LEVELS },
                ].map(f => (
                  <div key={f.field} className={f.field === 'course' ? 'col-span-1' : 'col-span-2'}>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">{f.label}</label>
                    <select value={tForm[f.field]} onChange={e => {
                      const val = e.target.value;
                      setTForm(p => ({ ...p, [f.field]: val, attempt: f.field === 'course' ? getAttempts(val)[0] : p.attempt }));
                    }} className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-purple-500">
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Attempt</label>
                <select value={tForm.attempt} onChange={e => setTForm(p => ({ ...p, attempt: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-purple-500">
                  {getAttempts(tForm.course).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {[
                { label: 'Subject *', field: 'subject', placeholder: 'e.g. Business Law', type: 'text', required: true },
                { label: 'Chapter / Topic', field: 'chapter', placeholder: 'e.g. Indian Contract Act', type: 'text', required: false },
                { label: 'Practice Title *', field: 'title', placeholder: 'e.g. Write 3 Questions on ICA', type: 'text', required: true },
                { label: 'Target Date', field: 'targetDate', placeholder: '', type: 'date', required: false },
                { label: 'Instructions (Optional)', field: 'instructions', placeholder: 'Additional instructions for students...', type: 'text', required: false },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input type={f.type} required={f.required} placeholder={f.placeholder} value={tForm[f.field]}
                    onChange={e => setTForm(p => ({ ...p, [f.field]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
              ))}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                This target will be visible to all <strong>{tForm.course} {tForm.level} — {tForm.attempt}</strong> students.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateModal(false); setEditTarget(null); }} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={tSaving} className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-black hover:bg-purple-500 disabled:opacity-50">{tSaving ? 'Saving...' : editTarget ? 'Update Target' : 'Assign Target'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVALUATE MODAL */}
      {evalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-gold-500/30 max-w-md w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Award className="w-5 h-5 text-gold-400" /> Give Marks</h3>
              <button onClick={() => setEvalModal(null)} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
            </div>
            <div className="p-3 rounded-xl bg-navy-900/80 border border-white/5 space-y-1">
              <div className="font-bold text-white">{evalModal.studentName}</div>
              <div className="text-xs text-slate-400">{evalModal.studentEmail}</div>
              <div className="text-xs text-purple-300">{evalModal.course} {evalModal.level} • {evalModal.attempt}</div>
              <div className="text-sm text-slate-200 font-bold mt-1">{evalModal.title}</div>
              <div className="text-xs text-slate-400">{evalModal.subject}{evalModal.chapter ? ` — ${evalModal.chapter}` : ''}</div>
            </div>
            {evalModal.uploadedImages?.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-300 mb-2">Student's Uploaded Answers</div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {evalModal.uploadedImages.slice(0, 3).map((url, i) => (
                    <img key={i} src={url} alt={`Page ${i + 1}`} onClick={() => setViewImagesModal(evalModal.uploadedImages)}
                      className="w-full aspect-square object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-80" />
                  ))}
                </div>
                <button onClick={() => setViewImagesModal(evalModal.uploadedImages)} className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> View All {evalModal.uploadedImages.length} Photos
                </button>
              </div>
            )}
            <form onSubmit={handleEvaluate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Marks Obtained *</label>
                  <input type="number" required min="0" step="0.5" placeholder="e.g. 7" value={evalForm.marksObtained}
                    onChange={e => setEvalForm(p => ({ ...p, marksObtained: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-gold-400 font-black text-xl text-center focus:outline-none focus:border-gold-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Out Of *</label>
                  <input type="number" required min="1" step="0.5" placeholder="e.g. 10" value={evalForm.totalMarks}
                    onChange={e => setEvalForm(p => ({ ...p, totalMarks: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-slate-200 font-black text-xl text-center focus:outline-none focus:border-white/30" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Feedback / Comments</label>
                <textarea placeholder="e.g. Improve presentation and include proper provisions..." value={evalForm.feedback}
                  onChange={e => setEvalForm(p => ({ ...p, feedback: e.target.value }))} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-gold-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEvalModal(null)} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={evalSaving} className="w-full py-2.5 rounded-xl bg-gold-500 text-navy-950 text-sm font-black hover:bg-gold-400 disabled:opacity-50">{evalSaving ? 'Saving...' : 'Save Marks & Feedback'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW IMAGES MODAL */}
      {viewImagesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md" onClick={() => setViewImagesModal(null)}>
          <div className="max-w-3xl w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold">Student Answers ({viewImagesModal.length} photos)</h3>
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
