import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getStudentSyllabus } from '../data/syllabusData';
import EmptyState from '../components/EmptyState';
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Award, 
  TrendingUp, 
  BookOpenCheck, 
  Target, 
  Sparkles, 
  ShieldCheck,
  BarChart3,
  Layers,
  Calendar
} from 'lucide-react';

export default function Syllabus() {
  const { currentUser, userProfile } = useAuth();
  
  const [completedMap, setCompletedMap] = useState({});
  const [togglingChapterId, setTogglingChapterId] = useState(null);

  const course = userProfile?.course || 'CA';
  const level = userProfile?.level || 'Foundation';
  const attempt = userProfile?.attempt || 'Jan 27';

  const syllabusInfo = getStudentSyllabus(course, level);
  const { courseKey, levelKey, subjects, totalChaptersCount } = syllabusInfo;

  // Real-time listener for student's completed syllabus chapters from Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCompletedMap(data.syllabusCompleted || {});
      }
    }, (err) => console.error("Error subscribing to syllabus progress:", err));

    return () => unsubscribe();
  }, [currentUser]);

  // Calculate actual progress statistics
  const completedChaptersCount = Object.keys(completedMap).filter(id => Boolean(completedMap[id])).length;
  const remainingChaptersCount = Math.max(0, totalChaptersCount - completedChaptersCount);
  const completionPercentage = totalChaptersCount > 0 
    ? Math.min(100, Math.round((completedChaptersCount / totalChaptersCount) * 100))
    : 0;

  const totalSyllabusPoints = totalChaptersCount * 10;
  const pointsEarned = completedChaptersCount * 10;

  // Toggle chapter completion & sync with Firestore
  const handleToggleChapter = async (chapterId) => {
    if (!currentUser?.uid || togglingChapterId) return;

    try {
      setTogglingChapterId(chapterId);
      const isCurrentlyCompleted = Boolean(completedMap[chapterId]);
      const userRef = doc(db, 'users', currentUser.uid);

      if (isCurrentlyCompleted) {
        // Uncheck chapter: remove from map and deduct 10 points
        const newCount = Math.max(0, completedChaptersCount - 1);
        await updateDoc(userRef, {
          [`syllabusCompleted.${chapterId}`]: deleteField(),
          syllabusCompletedCount: newCount,
          syllabusPoints: newCount * 10,
          points: Math.max(0, (userProfile?.points || 0) - 10)
        });
      } else {
        // Check chapter: add to map and add 10 points
        const newCount = completedChaptersCount + 1;
        await updateDoc(userRef, {
          [`syllabusCompleted.${chapterId}`]: true,
          syllabusCompletedCount: newCount,
          syllabusPoints: newCount * 10,
          points: (userProfile?.points || 0) + 10
        });
      }
    } catch (err) {
      console.error("Error updating chapter completion:", err);
      alert("Failed to update chapter status. Please check your internet connection.");
    } finally {
      setTogglingChapterId(null);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>Official ICAI / ICMAI Syllabus</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
              {courseKey} • {levelKey}
            </span>
            <span className="px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/30 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gold-400" />
              <span>{attempt} Attempt</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {courseKey} {levelKey} <span className="gold-gradient-text">Academic Syllabus</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Track your chapter-by-chapter preparation. Tick completed chapters to gain <strong>+10 Points</strong> per chapter and boost your live rank on the leaderboard!
          </p>
        </div>
      </div>

      {/* SYLLABUS ANALYTICS & GRAPHICAL OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Progress Chart & Overview */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span>Syllabus Progress Analytics</span>
            </h3>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {completionPercentage}%
            </span>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 uppercase tracking-wider">Overall Completion</span>
              <span className="text-emerald-400">{completedChaptersCount} / {totalChaptersCount} Chapters</span>
            </div>
            
            {/* Visual Bar */}
            <div className="w-full bg-navy-950 rounded-full h-4 overflow-hidden p-0.5 border border-white/10">
              <div 
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-gold-400 h-full rounded-full transition-all duration-500 shadow-glow-emerald"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-between pt-1 font-mono">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* 4 Analytics Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Total Chapters</div>
              <div className="text-xl font-black text-white">{totalChaptersCount}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Completed</div>
              <div className="text-xl font-black text-emerald-400">{completedChaptersCount}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Remaining</div>
              <div className="text-xl font-black text-amber-400">{remainingChaptersCount}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Points Earned</div>
              <div className="text-xl font-black text-gold-400 font-mono">+{pointsEarned} PTS</div>
            </div>
          </div>
        </div>

        {/* Circular Progress & Reward Banner */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Chapter Point Engine</div>
            <div className="px-2.5 py-1 rounded-full bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-black">
              +10 PTS / CHAPTER
            </div>
          </div>

          <div className="flex items-center justify-center py-2">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Circular Gauge SVG */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-navy-900"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * completionPercentage) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                  fill="transparent"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white font-mono">{completionPercentage}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Syllabus</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gold-500/10 border border-gold-500/25 text-xs text-gold-300 font-medium leading-relaxed">
            🏆 Every completed chapter adds <strong>10 Points</strong> to your profile and updates the live Sunday Leaderboard!
          </div>
        </div>

      </div>

      {/* SUBJECT-WISE PROGRESS CARDS GRID */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-gold-400" />
          <span>Subject-Wise Progress Breakdown</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((subObj) => {
            const subjectChapters = subObj.chapters || [];
            const subTotal = subjectChapters.length;
            const subCompleted = subjectChapters.filter(ch => Boolean(completedMap[ch.id])).length;
            const subPct = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;

            return (
              <div key={subObj.subject} className="p-5 rounded-2xl glass-card border border-white/10 space-y-3 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-white text-sm truncate">{subObj.subject}</div>
                  <div className="text-xs font-black text-emerald-400 font-mono shrink-0">
                    {subCompleted} / {subTotal} ({subPct}%)
                  </div>
                </div>

                <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-gold-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${subPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAPTER-BY-CHAPTER TICK SYSTEM */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Detailed Chapter Completion Checklist</span>
        </h3>

        <div className="space-y-6">
          {subjects.map((subObj) => {
            const subjectChapters = subObj.chapters || [];
            const subCompleted = subjectChapters.filter(ch => Boolean(completedMap[ch.id])).length;

            return (
              <div key={subObj.subject} className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                
                {/* Subject Header */}
                <div className="p-5 bg-navy-900/90 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-base text-white">{subObj.subject}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    {subCompleted} / {subjectChapters.length} Completed
                  </span>
                </div>

                {/* Chapter Checkbox Items */}
                <div className="divide-y divide-white/5">
                  {subjectChapters.map((ch) => {
                    const isChecked = Boolean(completedMap[ch.id]);

                    return (
                      <div 
                        key={ch.id}
                        onClick={() => handleToggleChapter(ch.id)}
                        className={`p-4 sm:px-6 flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                          isChecked 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/15' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 pr-4">
                          <button
                            type="button"
                            disabled={togglingChapterId === ch.id}
                            className="focus:outline-none shrink-0"
                          >
                            {isChecked ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300 transition-colors" />
                            )}
                          </button>

                          <span className={`text-sm font-medium transition-all ${
                            isChecked 
                              ? 'text-emerald-200 line-through decoration-emerald-500/50' 
                              : 'text-slate-200'
                          }`}>
                            {ch.title}
                          </span>
                        </div>

                        <span className={`text-xs font-mono font-bold shrink-0 px-2.5 py-1 rounded-lg border transition-all ${
                          isChecked 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                            : 'bg-navy-900 border-white/5 text-slate-400'
                        }`}>
                          {isChecked ? '+10 PTS ✓' : '+10 PTS'}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
