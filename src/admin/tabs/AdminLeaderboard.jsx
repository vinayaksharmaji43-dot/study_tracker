import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatHours } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { Trophy, Award, Sliders, AlertCircle, Sparkles } from 'lucide-react';

export default function AdminLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Controlled point adjustment modal
  const [adjustingStudent, setAdjustingStudent] = useState(null);
  const [pointDelta, setPointDelta] = useState('50');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => 
          u.role !== 'admin' && 
          u.email?.toLowerCase() !== 'vaultstore27@gmail.com' &&
          u.email?.toLowerCase() !== 'thunderworld766@gmail.com'
        )
        .map((u, idx) => ({
          ...u,
          name: u.name || u.email?.split('@')[0] || 'Student',
          rank: idx + 1
        }));
      setLeaderboard(users);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    if (!adjustingStudent || !pointDelta || !adjustReason.trim()) return;

    try {
      setSubmittingAdjust(true);
      const deltaNum = parseInt(pointDelta, 10);

      const userRef = doc(db, 'users', adjustingStudent.id);
      await updateDoc(userRef, {
        points: increment(deltaNum)
      });

      await addDoc(collection(db, 'auditLogs'), {
        studentUid: adjustingStudent.id,
        studentName: adjustingStudent.name,
        studentEmail: adjustingStudent.email,
        pointDelta: deltaNum,
        reason: adjustReason.trim(),
        adjustedBy: 'Admin',
        timestamp: serverTimestamp()
      });

      alert(`Points adjusted by ${deltaNum > 0 ? '+' : ''}${deltaNum} PTS. Audit log saved.`);
      setAdjustingStudent(null);
      setAdjustReason('');
    } catch (err) {
      console.error("Point adjustment error:", err);
      alert("Failed to adjust points.");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/30">
            <Trophy className="w-3.5 h-3.5" />
            <span>Leaderboard Oversight & Point Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Live Platform <span className="gold-gradient-text">Leaderboard</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Calculated in real-time from verified student study sessions and targets.
          </p>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No leaderboard entries yet"
          description="Leaderboard will populate automatically as registered students log study hours."
        />
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 text-center">Rank</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Course & Attempt</th>
                  <th className="px-6 py-4 text-center">Study Hours</th>
                  <th className="px-6 py-4 text-right">Points</th>
                  <th className="px-6 py-4 text-right">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {leaderboard.map((student) => (
                  <tr key={student.id} className="hover:bg-white/5 transition-colors">
                    
                    {/* Rank */}
                    <td className="px-6 py-4 text-center font-black">
                      {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                    </td>

                    {/* Student Name */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{student.name}</div>
                      <div className="text-xs text-slate-400">{student.email}</div>
                    </td>

                    {/* Course & Attempt */}
                    <td className="px-6 py-4 text-xs text-slate-300">
                      <span className="px-2.5 py-1 rounded-lg bg-navy-900 border border-white/10 font-semibold text-emerald-400">
                        {student.course} {student.attempt ? `(${student.attempt})` : ''}
                      </span>
                    </td>

                    {/* Study Hours */}
                    <td className="px-6 py-4 text-center font-bold text-white">
                      {formatHours(student.studyHours || 0)}
                    </td>

                    {/* Points */}
                    <td className="px-6 py-4 text-right font-black text-gold-400 font-mono">
                      {student.points || 0} PTS
                    </td>

                    {/* Audit Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setAdjustingStudent(student)}
                        className="px-3 py-1.5 rounded-xl bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:bg-gold-500 hover:text-navy-950 text-xs font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Adjust Points</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Controlled Point Adjustment Modal */}
      {adjustingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-gold-400" />
                <span>Adjust Points — Audit System</span>
              </h3>
              <button onClick={() => setAdjustingStudent(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/30 text-xs text-gold-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Adjusting points for: <strong>{adjustingStudent.name}</strong> (Current: {adjustingStudent.points || 0} PTS)</span>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Point Change (+ or -)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50 or -20"
                  value={pointDelta}
                  onChange={(e) => setPointDelta(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Reason for Adjustment (Recorded in Audit Log)
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Reason for audit log..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-gold-500 resize-none"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustingStudent(null)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="w-full py-3 rounded-xl bg-gold-500 text-navy-950 text-sm font-black shadow-glow-gold hover:bg-gold-400 disabled:opacity-50"
                >
                  {submittingAdjust ? 'Updating...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
