import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { Megaphone, Plus, Edit2, Trash2, CheckCircle, EyeOff, AlertCircle } from 'lucide-react';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setMessage('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setTitle(item.title || '');
    setMessage(item.message || '');
    setShowModal(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    try {
      setSubmitting(true);

      if (editingItem) {
        await updateDoc(doc(db, 'announcements', editingItem.id), {
          title: title.trim(),
          message: message.trim(),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'announcements'), {
          title: title.trim(),
          message: message.trim(),
          published: true,
          createdAt: serverTimestamp(),
          author: 'Platform Admin'
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
                        Unpublished
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">By {item.author || 'Admin'} • {formatDate(item.createdAt)}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => togglePublishStatus(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      item.published !== false 
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                  >
                    {item.published !== false ? 'Unpublish' : 'Publish'}
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

              <p className="text-sm text-slate-300 bg-navy-950/60 p-4 rounded-2xl border border-white/5 leading-relaxed">
                {item.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-rose-400" />
                <span>{editingItem ? 'Edit Announcement' : 'New Platform Announcement'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Important Update: January 2027 ICAI Schedule Released"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
                />
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

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-rose-600 text-white text-sm font-bold shadow-lg hover:bg-rose-500 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-red-500/30 max-w-sm w-full space-y-4 text-center">
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
