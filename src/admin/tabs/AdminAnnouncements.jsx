import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { Megaphone, Plus, Edit2, Trash2, CheckCircle, EyeOff, AlertCircle, ImagePlus, X, Link as LinkIcon } from 'lucide-react';

const COURSES = ['CA', 'CMA'];
const LEVELS = ['Foundation', 'Intermediate'];
const CA_ATTEMPTS = ['May 27', 'Jan 27', 'Sep 27', 'May 2027', 'Jan 2027', 'Sep 2027'];
const DEFAULT_CMA_ATTEMPTS = ['June 27', 'Dec 27', 'June 2027', 'December 2027'];

export default function AdminAnnouncements() {
  const { userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [cmaAttempts, setCmaAttempts] = useState(DEFAULT_CMA_ATTEMPTS);
  const [loading, setLoading] = useState(true);

  function getAttempts(courseName) {
    return courseName === 'CMA' ? cmaAttempts : CA_ATTEMPTS;
  }

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState('all');
  const [course, setCourse] = useState('CA');
  const [level, setLevel] = useState('Foundation');
  const [attempt, setAttempt] = useState('May 27');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal || deletingId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal, deletingId]);

  const readAndCompressImage = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!file.type.startsWith('image/')) return reject(new Error('Please select an image file.'));
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 1400;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressedImage = canvas.toDataURL('image/jpeg', 0.72);
        if (compressedImage.length > 900000) {
          reject(new Error('Please choose a smaller image (maximum compressed size is about 900 KB).'));
          return;
        }
        resolve(compressedImage);
      };
      image.onerror = () => reject(new Error('Could not read this image.'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not upload this image.'));
    reader.readAsDataURL(file);
  });

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(docs);
      setLoading(false);
    });

    const unsubCourses = onSnapshot(doc(db, 'settings', 'courses'), (snap) => {
      if (snap.exists() && snap.data()?.cmaAttempts && Array.isArray(snap.data().cmaAttempts)) {
        setCmaAttempts(snap.data().cmaAttempts);
      }
    });

    return () => {
      unsubscribe();
      unsubCourses();
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setMessage('');
    setAudienceType('all');
    setCourse('CA');
    setLevel('Foundation');
    setAttempt('May 27');
    setImageUrl('');
    setImageName('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setTitle(item.title || '');
    setMessage(item.message || item.description || '');
    setAudienceType(item.audienceType || 'all');
    setCourse(item.course || 'CA');
    setLevel(item.level || 'Foundation');
    setAttempt(item.attempt || 'Jan 2027');
    setImageUrl(item.imageUrl || '');
    setImageName(item.imageUrl ? 'Current announcement image' : '');
    setShowModal(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        message: message.trim(),
        description: message.trim(),
        audienceType: audienceType,
        imageUrl: imageUrl || '',
        ...(audienceType === 'specific' && { course, level, attempt }),
      };

      if (editingItem) {
        await updateDoc(doc(db, 'announcements', editingItem.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...payload,
          published: true,
          createdAt: serverTimestamp(),
          author: userProfile?.name || 'Platform Admin'
        });
      }

      setShowModal(false);
    } catch (err) {
      console.error("Error saving announcement:", err);
      alert(`Failed to save announcement: ${err.message || err.code || 'Permission error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublishStatus = async (item) => {
    try {
      const newStatus = item.published === false ? true : false;
      await updateDoc(doc(db, 'announcements', item.id), {
        published: newStatus
      });
    } catch (err) {
      console.error("Error toggling publish status:", err);
      alert(`Failed to update status: ${err.message || err.code}`);
    }
  };

  const confirmDeleteAnnouncement = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'announcements', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting announcement:", err);
      alert(`Failed to delete announcement: ${err.message || err.code}`);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Platform <span className="gold-gradient-text">Announcements</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Broadcast exam alerts, schedule updates, and preparation tips to student dashboards.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>Create Announcement</span>
          </button>
        </div>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements published yet"
          description="Create your first platform announcement to broadcast important exam dates and alerts."
          actionText="Create Announcement"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div key={item.id} className={`p-6 rounded-3xl glass-card border transition-all space-y-3 ${
              item.published !== false ? 'border-white/10' : 'border-amber-500/30 bg-amber-500/5 opacity-75'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    {item.published !== false ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        Published
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-xs text-slate-400">By {item.author || 'Admin'} • {formatDate(item.createdAt)}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-900 border border-white/10 text-slate-300">
                      {item.audienceType === 'specific' ? `${item.course} ${item.level} • ${item.attempt}` : 'All Streams'}
                    </span>
                  </div>
                </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePublishStatus(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        item.published !== false 
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      {item.published !== false ? 'Archive' : 'Publish'}
                    </button>

                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-2 rounded-xl bg-navy-900 border border-white/10 text-slate-300 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeletingId(item.id)}
                    className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-300 bg-navy-950/60 p-4 rounded-2xl border border-white/5 leading-relaxed whitespace-pre-wrap">
                {item.message || item.description}
              </p>
              {item.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-white/10 max-h-72 bg-navy-900 flex items-center justify-center">
                  <img src={item.imageUrl} alt="" className="w-full max-h-72 object-contain sm:object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card rounded-3xl border border-white/15 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-navy-900/80 shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-rose-400" />
                <span>{editingItem ? 'Edit Announcement' : 'New Platform Announcement'}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Important Update: May 2027 ICAI Schedule Released"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Optional Photo / Image Attachment</label>
                  <label className="flex items-center justify-center gap-2 w-full min-h-20 rounded-xl border border-dashed border-rose-500/35 bg-rose-500/5 text-rose-200 text-xs font-semibold cursor-pointer hover:bg-rose-500/10 transition-colors p-4">
                    <ImagePlus className="w-5 h-5 text-rose-400" />
                    <span className="truncate">{imageName || 'Upload image file (PNG, JPG, WebP)'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setImageUrl(await readAndCompressImage(file));
                          setImageName(file.name);
                        } catch (error) {
                          alert(error.message);
                        }
                      }}
                    />
                  </label>

                  <div className="flex items-center gap-2 my-2.5">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">or paste image link</span>
                    <div className="h-px bg-white/10 flex-1"></div>
                  </div>

                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl.startsWith('data:') ? '' : imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setImageName(e.target.value ? 'Direct Image URL' : '');
                      }}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {imageUrl && (
                    <div className="relative mt-3">
                      <img src={imageUrl} alt="Announcement preview" className="w-full max-h-44 object-cover rounded-xl border border-white/10" />
                      <button type="button" onClick={() => { setImageUrl(''); setImageName(''); }} className="absolute top-2 right-2 p-1.5 rounded-lg bg-navy-950/80 text-white hover:bg-rose-500 transition-colors" aria-label="Remove image"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Message Content
                  </label>
                  <textarea
                    rows="4"
                    required
                    placeholder="Detailed broadcast announcement for students..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Audience Type
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button type="button" onClick={() => setAudienceType('all')} className={`py-2 rounded-xl border text-xs font-bold transition-all ${audienceType === 'all' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-navy-900 border-white/10 text-slate-400 hover:bg-white/5'}`}>
                      All Streams
                    </button>
                    <button type="button" onClick={() => setAudienceType('specific')} className={`py-2 rounded-xl border text-xs font-bold transition-all ${audienceType === 'specific' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-navy-900 border-white/10 text-slate-400 hover:bg-white/5'}`}>
                      Specific Stream
                    </button>
                  </div>
                  
                  {audienceType === 'specific' && (
                    <div className="space-y-3 p-3 rounded-xl bg-navy-900/50 border border-white/5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course</label>
                          <select value={course} onChange={e => { setCourse(e.target.value); setAttempt(getAttempts(e.target.value)[0]); }} className="w-full px-3 py-2 rounded-lg bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-rose-500">
                            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Level</label>
                          <select value={level} onChange={e => setLevel(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-rose-500">
                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attempt</label>
                        <select value={attempt} onChange={e => setAttempt(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-rose-500">
                          {getAttempts(course).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Action Buttons */}
              <div className="flex gap-3 px-6 py-4 border-t border-white/10 bg-navy-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-rose-600 text-white text-sm font-bold shadow-lg hover:bg-rose-500 disabled:opacity-50 transition-colors"
                >
                  {editingItem ? 'Save Changes' : 'Publish Announcement'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 rounded-3xl border border-red-500/30 max-w-sm w-full space-y-4 text-center max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Delete Announcement?</h3>
            <p className="text-xs text-slate-400">Are you sure you want to delete this announcement?</p>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAnnouncement}
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
