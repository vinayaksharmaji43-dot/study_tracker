import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { BookOpen, GraduationCap, Calendar, Plus, Trash2, CheckCircle, Sparkles } from 'lucide-react';

export default function AdminCourses() {
  const [cmaAttempts, setCmaAttempts] = useState(['June 2027', 'December 2027']);
  const [newCmaAttempt, setNewCmaAttempt] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'courses'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.cmaAttempts && Array.isArray(data.cmaAttempts)) {
          setCmaAttempts(data.cmaAttempts);
        }
      }
    });

    return () => unsub();
  }, []);

  const handleAddCmaAttempt = async (e) => {
    e.preventDefault();
    if (!newCmaAttempt.trim()) return;

    try {
      setSaving(true);
      const updated = Array.from(new Set([...cmaAttempts, newCmaAttempt.trim()]));
      
      await setDoc(doc(db, 'settings', 'courses'), {
        cmaAttempts: updated
      }, { merge: true });

      setCmaAttempts(updated);
      setNewCmaAttempt('');
      setSuccessMsg('CMA attempt configured successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Error saving CMA attempt:", err);
      alert("Failed to save CMA attempt.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCmaAttempt = async (attemptToRemove) => {
    try {
      const updated = cmaAttempts.filter(a => a !== attemptToRemove);
      await setDoc(doc(db, 'settings', 'courses'), {
        cmaAttempts: updated
      }, { merge: true });

      setCmaAttempts(updated);
    } catch (err) {
      console.error("Error removing attempt:", err);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/30">
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Stream & Attempt Structure</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Courses & Exam <span className="gold-gradient-text">Attempts Configuration</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Configure active examination attempts for CA Foundation and future CMA attempts.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Courses Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* CA Foundation Box */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">CA Foundation</h3>
              <p className="text-xs text-slate-400">ICAI Foundation Exam Schedule</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Configured Attempts:</div>
            
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-navy-900 border border-white/10 flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold-400" />
                  January 2027
                </span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">Active</span>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-900 border border-white/10 flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold-400" />
                  September 2027
                </span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* CMA Box (Configurable) */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">CMA Preparation</h3>
              <p className="text-xs text-slate-400">Configurable ICMAI Attempts</p>
            </div>
          </div>

          <form onSubmit={handleAddCmaAttempt} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Add New CMA Exam Attempt
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. June 2027"
                value={newCmaAttempt}
                onChange={(e) => setNewCmaAttempt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-gold-500"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gold-500 text-navy-950 text-xs font-black shadow-glow-gold hover:bg-gold-400 shrink-0"
              >
                Add
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Configured CMA Attempts:</div>
            
            <div className="space-y-2">
              {cmaAttempts.map((att) => (
                <div key={att} className="p-3.5 rounded-xl bg-navy-900 border border-white/10 flex items-center justify-between">
                  <span className="text-sm font-bold text-gold-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold-400" />
                    {att}
                  </span>
                  <button
                    onClick={() => handleRemoveCmaAttempt(att)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
