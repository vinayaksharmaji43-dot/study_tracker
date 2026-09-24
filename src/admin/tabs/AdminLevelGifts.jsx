import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LEVEL_STREAMS, DEFAULT_35_LEVELS } from '../../utils/levelSystem';
import { Gift, Edit, Check, X, Link as LinkIcon, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLevelGifts() {
  const [selectedStream, setSelectedStream] = useState(LEVEL_STREAMS[0]);
  const [gifts, setGifts] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [formData, setFormData] = useState({
    type: 'pdf',
    title: '',
    description: '',
    googleDriveUrl: '',
    extraPoints: 0,
    active: true
  });

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'levelGifts'), where('stream', '==', selectedStream));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const giftsData = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        giftsData[data.levelNumber] = { id: doc.id, ...data };
      });
      setGifts(giftsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedStream]);

  const handleEditClick = (level) => {
    const existingGift = gifts[level.levelNumber];
    setEditingLevel(level);
    if (existingGift) {
      setFormData({
        type: existingGift.type || 'pdf',
        title: existingGift.title || '',
        description: existingGift.description || '',
        googleDriveUrl: existingGift.googleDriveUrl || '',
        extraPoints: existingGift.extraPoints || 0,
        active: existingGift.active !== false
      });
    } else {
      setFormData({
        type: 'pdf',
        title: '',
        description: '',
        googleDriveUrl: '',
        extraPoints: 0,
        active: true
      });
    }
    setModalOpen(true);
  };

  const handleSaveGift = async (e) => {
    e.preventDefault();
    try {
      const docId = `${selectedStream}_${editingLevel.levelNumber}`;
      await setDoc(doc(db, 'levelGifts', docId), {
        stream: selectedStream,
        levelNumber: editingLevel.levelNumber,
        ...formData,
        updatedAt: new Date().toISOString()
      });
      toast.success('Gift configured successfully!');
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save gift configuration.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-3xl border border-white/10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Gift className="w-6 h-6 text-gold-400" />
          <span>Level Gifts & Rewards Configuration</span>
        </h2>
        
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Select Stream
          </label>
          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            className="w-full sm:w-64 px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white focus:border-emerald-500"
          >
            {LEVEL_STREAMS.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400">Loading...</div>
        ) : (
          <div className="space-y-3">
            {DEFAULT_35_LEVELS.map(level => {
              const gift = gifts[level.levelNumber];
              return (
                <div key={level.levelNumber} className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-navy-950 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                      {level.badge}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Level {level.levelNumber}</div>
                      <div className="text-white font-bold">{level.levelName}</div>
                    </div>
                  </div>

                  <div className="flex-1 px-4 text-sm text-slate-400">
                    {gift && gift.active ? (
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs font-bold uppercase">{gift.type}</span>
                        <span className="font-semibold text-slate-200">{gift.title}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No active gift configured</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleEditClick(level)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-bold text-white"
                  >
                    <Edit className="w-4 h-4" />
                    Configure
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-navy-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Configure Level {editingLevel?.levelNumber} Gift
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGift} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Reward Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white"
                >
                  <option value="pdf">PDF / Link Only</option>
                  <option value="points">Points Only</option>
                  <option value="both">Both (PDF & Points)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white"
                  placeholder="e.g. Foundation Mastery PDF"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white"
                  placeholder="Short description of the reward..."
                  rows={2}
                />
              </div>

              {(formData.type === 'pdf' || formData.type === 'both') && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Google Drive URL (or any link)</label>
                  <div className="relative">
                    <LinkIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      required
                      value={formData.googleDriveUrl}
                      onChange={e => setFormData({...formData, googleDriveUrl: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>
              )}

              {(formData.type === 'points' || formData.type === 'both') && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Extra Points to Award</label>
                  <div className="relative">
                    <Star className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.extraPoints}
                      onChange={e => setFormData({...formData, extraPoints: Number(e.target.value)})}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                  className="w-4 h-4 rounded border-white/20 bg-navy-950"
                />
                <label htmlFor="activeToggle" className="text-sm text-slate-300 font-bold">
                  Reward is Active
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors">
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
