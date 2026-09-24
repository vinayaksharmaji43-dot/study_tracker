import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Users, Send, Youtube, MessageCircle, Link as LinkIcon, Trash2, Plus } from 'lucide-react';
import EmptyState from '../../components/EmptyState';

const COURSES = ['CA', 'CMA'];
const LEVELS = ['Foundation', 'Intermediate'];
const CA_ATTEMPTS = ['May 27', 'Jan 27', 'Sep 27', 'May 2027', 'Jan 2027', 'Sep 2027'];
const CMA_ATTEMPTS = ['June 27', 'Dec 27', 'June 2027', 'December 2027'];

function getAttempts(course) {
  return course === 'CMA' ? CMA_ATTEMPTS : CA_ATTEMPTS;
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace('2027', '27').replace('december', 'dec');
}

export default function AdminStudyGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [course, setCourse] = useState('CA');
  const [level, setLevel] = useState('Foundation');
  const [attempt, setAttempt] = useState('May 27');
  const [platform, setPlatform] = useState('telegram');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'studyGroups'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setSubmitting(true);
      const docId = `${course}_${level}_${normalizeAttempt(attempt)}`;
      
      const payload = {
        course,
        level,
        attempt,
        platform,
        url: url.trim(),
        title: title.trim() || `Join ${course} ${level} Group`,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'studyGroups', docId), payload);
      setShowModal(false);
      setUrl('');
      setTitle('');
    } catch (err) {
      console.error(err);
      alert('Failed to save study group link.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this study group link?')) return;
    try {
      await deleteDoc(doc(db, 'studyGroups', id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete.');
    }
  };

  const getPlatformIcon = (plat) => {
    switch (plat) {
      case 'telegram': return <Send className="w-5 h-5 text-blue-400" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-500" />;
      case 'whatsapp': return <MessageCircle className="w-5 h-5 text-emerald-400" />;
      default: return <LinkIcon className="w-5 h-5 text-purple-400" />;
    }
  };

  const getPlatformBg = (plat) => {
    switch (plat) {
      case 'telegram': return 'bg-blue-500/10 border-blue-500/30';
      case 'youtube': return 'bg-red-500/10 border-red-500/30';
      case 'whatsapp': return 'bg-emerald-500/10 border-emerald-500/30';
      default: return 'bg-purple-500/10 border-purple-500/30';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-blue-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
              <Users className="w-3.5 h-3.5" /><span>Study Groups</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Stream <span className="text-blue-400">Communities</span></h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Set Telegram, WhatsApp, or YouTube channel links for each specific stream. Students will see an attractive banner in their dashboard.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-all hover:scale-105">
            <Plus className="w-5 h-5" /><span>Add/Edit Group Link</span>
          </button>
        </div>
      </div>

      {/* List */}
      {groups.length === 0 ? (
        <EmptyState icon={Users} title="No Study Groups Configured" description="Add a Telegram or WhatsApp group link to start building communities." actionText="Add Group" onAction={() => setShowModal(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g.id} className={`p-5 rounded-2xl glass-card border flex items-start justify-between gap-4 ${getPlatformBg(g.platform)}`}>
              <div className="flex gap-4 items-start overflow-hidden">
                <div className="p-3 rounded-xl bg-navy-950/50 border border-white/5 shrink-0">
                  {getPlatformIcon(g.platform)}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{g.title}</div>
                  <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-900 border border-white/10 text-slate-300 w-fit">
                    {g.course} {g.level} • {g.attempt}
                  </div>
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate block mt-1">
                    {g.url}
                  </a>
                </div>
              </div>
              <button onClick={() => handleDelete(g.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /><span>Configure Study Group</span></h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course</label>
                  <select value={course} onChange={e => { setCourse(e.target.value); setAttempt(getAttempts(e.target.value)[0]); }} className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-blue-500">
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Level</label>
                  <select value={level} onChange={e => setLevel(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-blue-500">
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attempt</label>
                <select value={attempt} onChange={e => setAttempt(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-blue-500">
                  {getAttempts(course).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'telegram', icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
                    { id: 'youtube', icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/20 border-red-500/30' },
                    { id: 'whatsapp', icon: MessageCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
                    { id: 'other', icon: LinkIcon, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' }
                  ].map(p => (
                    <button key={p.id} type="button" onClick={() => setPlatform(p.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${platform === p.id ? p.bg : 'bg-navy-900 border-white/5 hover:bg-white/5'}`}>
                      <p.icon className={`w-5 h-5 ${platform === p.id ? p.color : 'text-slate-400'}`} />
                      <span className="text-[9px] font-bold mt-1 text-slate-300 capitalize">{p.id}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custom Title (Optional)</label>
                <input type="text" placeholder={`e.g. Join ${course} ${level} Group`} value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Group URL / Link *</label>
                <input type="url" required placeholder="https://t.me/..." value={url} onChange={e => setUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg hover:bg-blue-500 disabled:opacity-50">Save Link</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
