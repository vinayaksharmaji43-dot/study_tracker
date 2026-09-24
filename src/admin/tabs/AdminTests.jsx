import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  FileText, Plus, Trash2, Edit3, Eye, ExternalLink, Upload, X, 
  ShieldCheck, AlertCircle, CheckCircle2, Clock, Globe, Filter
} from 'lucide-react';

const IMGBB_KEY = 'f43ca36cbb4a3e5de80d145fb53cbfff';

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', file);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('File upload failed');
}

const COURSES = ['CA', 'CMA'];
const LEVELS = ['Foundation', 'Intermediate'];
const CA_ATTEMPTS = ['All Attempts', 'May 27', 'Jan 27', 'Sep 27', 'May 2027', 'Jan 2027', 'Sep 2027'];
const CMA_ATTEMPTS = ['All Attempts', 'June 27', 'Dec 27', 'June 2027', 'December 2027'];

const ALL_SUBJECTS = [
  'Paper 1: Accounting',
  'Paper 2: Business Laws',
  'Paper 3: Quantitative Aptitude',
  'Paper 4: Business Economics',
  'Paper 1 — Advanced Accounting',
  'Paper 2 — Corporate and Other Laws',
  'Paper 3 — Taxation',
  'Paper 4 — Cost and Management Accounting',
  'Paper 5 — Auditing and Ethics',
  'Paper 6 — Financial Management and Strategic Management',
  'Financial Accounting',
  'Cost Accounting',
  'Laws & Ethics',
  'Direct & Indirect Taxation'
];

export default function AdminTests() {
  const { currentUser } = useAuth();
  const [adminTests, setAdminTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(ALL_SUBJECTS[0]);
  const [chapter, setChapter] = useState('');
  const [description, setDescription] = useState('');
  const [audienceType, setAudienceType] = useState('specific'); // 'all', 'specific'
  const [course, setCourse] = useState('CA');
  const [level, setLevel] = useState('Foundation');
  const [attempt, setAttempt] = useState('All Attempts');
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [published, setPublished] = useState(true);

  // File Upload State
  const fileInputRef = useRef(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);

  // PDF Viewer Modal State
  const [viewPdfUrl, setViewPdfUrl] = useState(null);

  useEffect(() => {
    const q = collection(db, 'adminTests');
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const dA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dB - dA;
      });
      setAdminTests(docs);
      setLoading(false);
    }, err => {
      console.error("Error fetching admin tests:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal || deletingId || viewPdfUrl) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal, deletingId, viewPdfUrl]);

  const resetForm = () => {
    setEditItem(null);
    setTitle('');
    setSubject(ALL_SUBJECTS[0]);
    setChapter('');
    setDescription('');
    setAudienceType('specific');
    setCourse('CA');
    setLevel('Foundation');
    setAttempt('All Attempts');
    setGoogleDriveUrl('');
    setPdfUrl('');
    setPublished(true);
    setShowModal(false);
  };

  const openEdit = (t) => {
    setEditItem(t);
    setTitle(t.title || '');
    setSubject(t.subject || ALL_SUBJECTS[0]);
    setChapter(t.chapter || '');
    setDescription(t.description || '');
    setAudienceType(t.audienceType || 'specific');
    setCourse(t.course || 'CA');
    setLevel(t.level || 'Foundation');
    setAttempt(t.attempt || 'All Attempts');
    setGoogleDriveUrl(t.googleDriveUrl || '');
    setPdfUrl(t.pdfUrl || '');
    setPublished(t.published !== false);
    setShowModal(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingPdf(true);
      const url = await uploadToImgBB(file);
      setPdfUrl(url);
    } catch (err) {
      console.error(err);
      alert("Failed to upload PDF file.");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        subject,
        chapter: chapter.trim(),
        description: description.trim(),
        audienceType,
        course: audienceType === 'all' ? 'All' : course,
        level: audienceType === 'all' ? 'All' : level,
        attempt: audienceType === 'all' ? 'All Attempts' : attempt,
        googleDriveUrl: googleDriveUrl.trim(),
        pdfUrl: pdfUrl.trim(),
        published,
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid || 'admin'
      };

      if (editItem) {
        await updateDoc(doc(db, 'adminTests', editItem.id), payload);
      } else {
        await addDoc(collection(db, 'adminTests'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      resetForm();
    } catch (err) {
      console.error("Error saving admin test:", err);
      alert("Failed to save test paper.");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (t) => {
    try {
      await updateDoc(doc(db, 'adminTests', t.id), {
        published: !t.published,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'adminTests', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete test.");
    }
  };

  const filteredTests = adminTests.filter(t => {
    if (filterCourse !== 'all' && t.course !== filterCourse) return false;
    if (filterLevel !== 'all' && t.level !== filterLevel) return false;
    if (filterStatus === 'published' && !t.published) return false;
    if (filterStatus === 'draft' && t.published) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin — Academic Resource Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Test Papers <span className="gold-gradient-text">Manager</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Upload test papers, add Google Drive links, and target specific streams (CA/CMA Foundation & Intermediate).
            </p>
          </div>

          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-sm shadow-glow-emerald flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Publish Test Paper</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-white/10">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterCourse}
            onChange={e => setFilterCourse(e.target.value)}
            className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Courses</option>
            <option value="CA">CA</option>
            <option value="CMA">CMA</option>
          </select>

          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Levels</option>
            <option value="Foundation">Foundation</option>
            <option value="Intermediate">Intermediate</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft (Unpublished)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-bold">
          Showing {filteredTests.length} of {adminTests.length} Test Papers
        </div>
      </div>

      {/* Test Papers List */}
      {filteredTests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No admin test papers found"
          description="Click 'Publish Test Paper' to upload PDFs and share test links with students."
        />
      ) : (
        <div className="space-y-4">
          {filteredTests.map(t => (
            <div key={t.id} className="p-6 rounded-3xl glass-card border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    {t.subject}
                  </span>
                  
                  {t.audienceType === 'all' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> All Streams
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                      {t.course} {t.level} • {t.attempt || 'All Attempts'}
                    </span>
                  )}

                  {t.published ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      Published
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                      Draft
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white pt-1">{t.title}</h3>
                {t.chapter && <div className="text-xs text-slate-400">Chapter / Topic: {t.chapter}</div>}
                {t.description && <p className="text-xs text-slate-300 max-w-xl">{t.description}</p>}
              </div>

              {/* Actions & Links */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                {t.pdfUrl && (
                  <button
                    onClick={() => setViewPdfUrl(t.pdfUrl)}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-bold flex items-center gap-1.5 justify-center"
                  >
                    <Eye className="w-3.5 h-3.5" /> PDF
                  </button>
                )}
                {t.googleDriveUrl && (
                  <a
                    href={t.googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 text-xs font-bold flex items-center gap-1.5 justify-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Drive
                  </a>
                )}

                <button
                  onClick={() => togglePublish(t)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    t.published 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                >
                  {t.published ? 'Unpublish' : 'Publish'}
                </button>

                <button
                  onClick={() => openEdit(t)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setDeletingId(t.id)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT ADMIN TEST MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>{editItem ? 'Edit Admin Test Resource' : '+ Publish New Test Paper'}</span>
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Test Paper Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CA Foundation Accounting Grand Mock Test 1"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Subject *</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                >
                  {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Chapter / Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Partnership Accounts & Final Accounts"
                  value={chapter}
                  onChange={e => setChapter(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Target Stream Selection */}
              <div className="p-4 rounded-2xl bg-navy-900/90 border border-emerald-500/20 space-y-3">
                <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Target Stream Audience</label>
                
                <div className="flex gap-4 text-xs font-bold text-white">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      value="specific"
                      checked={audienceType === 'specific'}
                      onChange={() => setAudienceType('specific')}
                      className="accent-emerald-400"
                    />
                    <span>Specific Stream</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      value="all"
                      checked={audienceType === 'all'}
                      onChange={() => setAudienceType('all')}
                      className="accent-emerald-400"
                    />
                    <span>All Streams</span>
                  </label>
                </div>

                {audienceType === 'specific' && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Course</label>
                      <select
                        value={course}
                        onChange={e => setCourse(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                      >
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Level</label>
                      <select
                        value={level}
                        onChange={e => setLevel(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Attempt</label>
                      <select
                        value={attempt}
                        onChange={e => setAttempt(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                      >
                        {(course === 'CMA' ? CMA_ATTEMPTS : CA_ATTEMPTS).map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Description / Instructions</label>
                <textarea
                  rows="2"
                  placeholder="Additional instructions for students..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Upload PDF or Enter URL */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">Test Paper PDF</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://... (or upload file below)"
                    value={pdfUrl}
                    onChange={e => setPdfUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPdf}
                    className="px-3 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/30 shrink-0"
                  >
                    {uploadingPdf ? 'Uploading...' : 'Upload File'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Google Drive Link */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Google Drive Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={googleDriveUrl}
                  onChange={e => setGoogleDriveUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Publish Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pubCheck"
                  checked={published}
                  onChange={e => setPublished(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
                <label htmlFor="pubCheck" className="text-xs text-white font-bold cursor-pointer">
                  Publish test paper immediately
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={resetForm} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-emerald-500 text-navy-950 text-xs font-black hover:bg-emerald-400 disabled:opacity-50 shadow-glow-emerald">
                  {submitting ? 'Saving...' : editItem ? 'Update Test Paper' : 'Publish Test Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-rose-500/30 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" /> Delete Test Resource?
            </h3>
            <p className="text-xs text-slate-300">Are you sure you want to delete this admin test paper?</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeletingId(null)} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={confirmDelete} className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PDF MODAL */}
      {viewPdfUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md" onClick={() => setViewPdfUrl(null)}>
          <div className="max-w-4xl w-full space-y-3 h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold">Test Paper PDF</h3>
              <button onClick={() => setViewPdfUrl(null)} className="text-slate-400 hover:text-white font-bold text-2xl">✕</button>
            </div>
            <iframe src={viewPdfUrl} className="w-full flex-1 rounded-2xl border border-white/10 bg-white" title="Admin Test PDF" />
          </div>
        </div>
      )}

    </div>
  );
}
