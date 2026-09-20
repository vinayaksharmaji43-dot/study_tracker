import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { HelpCircle, Plus, MessageSquare, CheckCircle, Clock, ShieldCheck, Send, Upload, Eye, X, Image as ImageIcon } from 'lucide-react';

const IMGBB_KEY = 'f43ca36cbb4a3e5de80d145fb53cbfff';

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', file);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('Image upload failed');
}

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

export default function Doubts() {
  const { userProfile, currentUser } = useAuth();
  const subjects = userProfile?.course === 'CMA' ? CMA_SUBJECTS : CA_SUBJECTS;

  const [doubts, setDoubts] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'my_doubts', 'unanswered'
  const [showAskModal, setShowAskModal] = useState(false);

  // New Doubt Form
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(subjects[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // File uploads
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [viewImagesModal, setViewImagesModal] = useState(null);

  // Reply Form Modal / Inline State (Admin Only)
  const [replyingDoubtId, setReplyingDoubtId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const isAdmin = userProfile?.role === 'admin' || currentUser?.email === 'vaultstore27@gmail.com' || currentUser?.email === 'thunderworld766@gmail.com';

  useEffect(() => {
    const q = query(collection(db, 'doubts'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDoubts(docs);
    }, (err) => {
      console.error("Doubts listener error:", err);
    });

    return () => unsubscribe();
  }, []);

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

  const resetAskModal = () => {
    setTitle('');
    setDescription('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    setShowAskModal(false);
  };

  const handleAskDoubt = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);

      // Upload attached images if any
      let imageUrls = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const url = await uploadToImgBB(file);
          imageUrls.push(url);
        }
      }

      await addDoc(collection(db, 'doubts'), {
        uid: currentUser.uid,
        studentName: userProfile?.name || currentUser?.email || 'Student',
        title: title.trim(),
        subject,
        description: description.trim(),
        uploadedImages: imageUrls,
        status: 'open',
        reply: null,
        repliedBy: null,
        createdAt: serverTimestamp(),
        repliedAt: null,
        course: userProfile?.course || 'CA Foundation'
      });

      resetAskModal();
    } catch (err) {
      console.error("Error asking doubt:", err);
      alert("Failed to submit doubt. Please check your network connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (doubtId) => {
    if (!replyText.trim()) return;

    try {
      setReplying(true);
      const doubtRef = doc(db, 'doubts', doubtId);
      await updateDoc(doubtRef, {
        reply: replyText.trim(),
        repliedBy: userProfile?.name || 'CA/CMA Faculty',
        status: 'answered',
        repliedAt: serverTimestamp()
      });

      setReplyText('');
      setReplyingDoubtId(null);
    } catch (err) {
      console.error("Error submitting reply:", err);
      alert("Failed to post reply.");
    } finally {
      setReplying(false);
    }
  };

  const filteredDoubts = doubts.filter(d => {
    if (filter === 'my_doubts') return d.uid === currentUser?.uid;
    if (filter === 'unanswered') return d.status === 'open';
    return true;
  });

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Academic Q&A Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Academic <span className="gold-gradient-text">Doubts & Solutions</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Post your subject doubts with photos and get verified solutions directly from faculty & admin.
            </p>
          </div>

          <button
            onClick={() => setShowAskModal(true)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-navy-950 font-black text-sm shadow-glow-gold flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Ask Academic Doubt</span>
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
            All Doubts ({doubts.length})
          </button>
          <button
            onClick={() => setFilter('my_doubts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'my_doubts' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Doubts ({doubts.filter(d => d.uid === currentUser?.uid).length})
          </button>
          <button
            onClick={() => setFilter('unanswered')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'unanswered' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Faculty Reply ({doubts.filter(d => d.status === 'open').length})
          </button>
        </div>
      </div>

      {/* Doubts List */}
      {filteredDoubts.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No doubts found"
          description="Have a question about Accounting, Laws, or Economics? Submit your doubt now with optional photos."
          actionText="Ask a Doubt"
          onAction={() => setShowAskModal(true)}
        />
      ) : (
        <div className="space-y-6">
          {filteredDoubts.map((doubt) => (
            <div key={doubt.id} className="p-6 rounded-3xl glass-card border border-white/10 hover:border-amber-500/30 transition-all space-y-4">
              
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-lg bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
                      {doubt.subject}
                    </span>
                    <span className="text-xs text-slate-400">
                      Asked by <strong className="text-white">{doubt.studentName}</strong> • {formatDate(doubt.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white pt-1">{doubt.title}</h3>
                </div>

                <div>
                  {doubt.status === 'answered' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Answered by Faculty
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Pending Reply
                    </span>
                  )}
                </div>
              </div>

              {/* Question Description */}
              <p className="text-sm text-slate-300 bg-navy-950/60 p-4 rounded-2xl border border-white/5 leading-relaxed whitespace-pre-wrap">
                {doubt.description}
              </p>

              {/* Uploaded Photos (If Any) */}
              {doubt.uploadedImages?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Attached Photo Question:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doubt.uploadedImages.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Doubt Attachment ${idx + 1}`}
                        onClick={() => setViewImagesModal(doubt.uploadedImages)}
                        className="w-24 h-24 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Answer Thread */}
              {doubt.reply ? (
                <div className="p-5 rounded-2xl bg-royal-600/10 border border-royal-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-royal-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-gold-400" />
                      Official Faculty Solution by {doubt.repliedBy}
                    </span>
                    <span className="text-slate-400 font-normal">{formatDate(doubt.repliedAt)}</span>
                  </div>
                  <p className="text-sm text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                    {doubt.reply}
                  </p>
                </div>
              ) : (
                /* Only Admin can post reply */
                isAdmin && (
                  <div className="pt-2">
                    {replyingDoubtId === doubt.id ? (
                      <div className="space-y-3 p-4 rounded-2xl bg-navy-900 border border-white/15">
                        <textarea
                          rows="3"
                          placeholder="Write official faculty answer..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full p-3 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setReplyingDoubtId(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSubmitReply(doubt.id)}
                            disabled={replying}
                            className="px-5 py-2 rounded-xl bg-royal-600 hover:bg-royal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-glow-blue"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{replying ? 'Posting...' : 'Post Reply'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setReplyingDoubtId(doubt.id);
                          setReplyText('');
                        }}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Reply as Faculty / Admin</span>
                      </button>
                    )}
                  </div>
                )
              )}

            </div>
          ))}
        </div>
      )}

      {/* Ask Doubt Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>Submit Academic Question</span>
              </h3>
              <button onClick={resetAskModal} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAskDoubt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Question Title / Topic *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clarification on Consignment Accounting entry"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Subject *
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Detailed Explanation of Doubt *
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Describe your exact issue or formula confusion..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 resize-none"
                ></textarea>
              </div>

              {/* Photo Upload Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Attach Photo / Screenshot (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Attach Question Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {previewUrls.map((item, idx) => (
                      <div key={idx} className="relative group aspect-square">
                        <img
                          src={item.url}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-xl border border-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-90 hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetAskModal}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-amber-500 text-navy-950 text-sm font-black shadow-glow-gold hover:bg-amber-400 disabled:opacity-50"
                >
                  {submitting ? 'Uploading & Posting...' : 'Post Doubt'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* View Images Modal */}
      {viewImagesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md" onClick={() => setViewImagesModal(null)}>
          <div className="max-w-3xl w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold">Doubt Attachment Photos ({viewImagesModal.length})</h3>
              <button onClick={() => setViewImagesModal(null)} className="text-slate-400 hover:text-white font-bold text-2xl">✕</button>
            </div>
            {viewImagesModal.map((url, i) => (
              <img key={i} src={url} alt={`Doubt Attachment ${i + 1}`} className="w-full rounded-2xl border border-white/10 shadow-2xl" />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
