import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatHours } from '../../utils/helpers';
import { getStudentSyllabus } from '../../data/syllabusData';
import EmptyState from '../../components/EmptyState';
import { Trophy, Award, Sliders, AlertCircle, Sparkles, Filter, Calendar } from 'lucide-react';

export default function AdminLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic syllabi mapping for correct totals
  const [syllabiMeta, setSyllabiMeta] = useState({});

  // Admin stream filters
  const [courseFilter, setCourseFilter] = useState('all'); // 'all', 'CA', 'CMA'
  const [levelFilter, setLevelFilter] = useState('all');   // 'all', 'Foundation', 'Intermediate'
  const [attemptFilter, setAttemptFilter] = useState('all'); // 'all', 'Jan 27', 'May 27', 'Sep 27', 'June 27', 'Dec 27'

  // Controlled point adjustment modal
  const [adjustingStudent, setAdjustingStudent] = useState(null);
  const [pointDelta, setPointDelta] = useState('50');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Load syllabi metadata (total chapters)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'syllabi'), (snap) => {
      const meta = {};
      snap.docs.forEach(doc => {
        let total = 0;
        doc.data().subjects?.forEach(s => total += (s.chapters?.length || 0));
        meta[doc.id] = total;
      });
      setSyllabiMeta(meta);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const courseKey = data.course === 'CMA' || data.course?.includes('CMA') ? 'CMA' : 'CA';
          const levelKey = data.level === 'Intermediate' || data.course?.includes('Intermediate') ? 'Intermediate' : 'Foundation';
          const streamId = `${courseKey}_${levelKey}`;

          const completedCount = data.syllabusCompletedCount || (data.syllabusCompleted ? Object.keys(data.syllabusCompleted).length : 0);
          const totalChapters = syllabiMeta[streamId] || 1;
          const progressPct = totalChapters > 0 ? Math.min(100, Math.round((completedCount / totalChapters) * 100)) : 0;

          return {
            id: doc.id,
            ...data,
            courseKey,
            levelKey,
            completedCount,
            totalChapters,
            progressPct
          };
        })
        .filter(u => 
          u.role !== 'admin' && 
          u.email?.toLowerCase() !== 'vaultstore27@gmail.com' &&
          u.email?.toLowerCase() !== 'thunderworld766@gmail.com'
        );

      setLeaderboard(users);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syllabiMeta]);

  // Filter leaderboard strictly by Admin selection
  const filteredLeaderboard = leaderboard
    .filter(student => {
      const matchesCourse = courseFilter === 'all' || student.courseKey === courseFilter;
      const matchesLevel = levelFilter === 'all' || student.levelKey === levelFilter;
      const matchesAttempt = attemptFilter === 'all' || student.attempt === attemptFilter;

      return matchesCourse && matchesLevel && matchesAttempt;
    })
    .map((student, idx) => ({
      ...student,
      name: student.name || 'Student',
      rank: idx + 1
    }));

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
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/30">
            <Trophy className="w-3.5 h-3.5" />
            <span>Stream Leaderboard Oversight & Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Stream-Isolated <span className="gold-gradient-text">Live Leaderboard</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Filter and inspect student rankings for CA / CMA Foundation & Intermediate streams and attempt groups.
          </p>
        </div>
      </div>

      {/* Admin Stream Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 glass-card rounded-2xl border border-white/10">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-gold-400" />
          <span>Stream Filters:</span>
        </div>

        {/* Course Filter */}
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-bold text-xs focus:outline-none focus:border-gold-500"
        >
          <option value="all">All Courses (CA & CMA)</option>
          <option value="CA">CA Only</option>
          <option value="CMA">CMA Only</option>
        </select>

        {/* Level Filter */}
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-bold text-xs focus:outline-none focus:border-gold-500"
        >
          <option value="all">All Levels (Foundation & Inter)</option>
          <option value="Foundation">Foundation Only</option>
          <option value="Intermediate">Intermediate Only</option>
        </select>

        {/* Attempt Filter */}
        <select
          value={attemptFilter}
          onChange={(e) => setAttemptFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-bold text-xs focus:outline-none focus:border-gold-500"
        >
          <option value="all">All Attempts</option>
          <option value="Jan 27">Jan 27</option>
          <option value="May 27">May 27</option>
          <option value="Sep 27">Sep 27</option>
          <option value="June 27">June 27</option>
          <option value="Dec 27">Dec 27</option>
        </select>
      </div>

      {filteredLeaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No leaderboard entries match this filter"
          description="Try changing the course, level, or attempt dropdown filters."
        />
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 text-center">Rank</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Course, Level & Attempt</th>
                  <th className="px-6 py-4 text-center">Syllabus Progress</th>
                  <th className="px-6 py-4 text-center">Study Hours</th>
                  <th className="px-6 py-4 text-right">Points</th>
                  <th className="px-6 py-4 text-right">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredLeaderboard.map((student) => (
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
                        {student.courseKey} {student.levelKey} {student.attempt ? `(${student.attempt})` : ''}
                      </span>
                    </td>

                    {/* Syllabus Progress % */}
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-emerald-400 font-mono text-sm">{student.progressPct}%</div>
                      <div className="text-[11px] text-slate-400">{student.completedCount}/{student.totalChapters} chs</div>
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
