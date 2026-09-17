import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Award, 
  BarChart3,
  Layers,
  Calendar,
  BookOpenCheck
} from 'lucide-react';

export default function Syllabus() {
  const { currentUser, userProfile } = useAuth();
  
  const [completedMap, setCompletedMap] = useState({});
  const [togglingChapterId, setTogglingChapterId] = useState(null);

  // Dynamic syllabus from Firestore
  const [syllabusDoc, setSyllabusDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const rawCourse = userProfile?.course || 'CA';
  const courseKey = rawCourse === 'CMA' || rawCourse?.includes('CMA') ? 'CMA' : 'CA';
  const levelKey = userProfile?.level || (rawCourse?.includes('Intermediate') ? 'Intermediate' : 'Foundation');
  const attempt = userProfile?.attempt || (courseKey === 'CA' ? 'Jan 27' : 'June 27');
  
  const streamId = `${courseKey}_${levelKey}`;

  // Real-time listener for syllabus blueprint
  useEffect(() => {
    const unsubSyllabus = onSnapshot(doc(db, 'syllabi', streamId), (snap) => {
      if (snap.exists()) {
        setSyllabusDoc(snap.data());
      } else {
        setSyllabusDoc(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching syllabus:", err);
      setSyllabusDoc(null);
      setLoading(false);
    });
    return () => unsubSyllabus();
  }, [streamId]);

  // Real-time listener for student's completed syllabus chapters
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        setCompletedMap(snapshot.data().syllabusCompleted || {});
      }
    }, (err) => console.error("Error subscribing to syllabus progress:", err));
    return () => unsubUser();
  }, [currentUser]);

  // Calculate actual progress statistics from dynamic syllabus
  const { subjects, totalChaptersCount, totalSyllabusPoints, chapterPointsMap } = useMemo(() => {
    let subjs = syllabusDoc?.subjects || [];
    let count = 0;
    let points = 0;
    let pointMap = {};

    subjs.forEach(s => {
      s.chapters?.forEach(ch => {
        count++;
        const chPts = Number(ch.points) || 0;
        points += chPts;
        pointMap[ch.id] = chPts;
      });
    });
    return { subjects: subjs, totalChaptersCount: count, totalSyllabusPoints: points, chapterPointsMap: pointMap };
  }, [syllabusDoc]);

  const completedChaptersCount = Object.keys(completedMap).filter(id => Boolean(completedMap[id])).length;
  const remainingChaptersCount = Math.max(0, totalChaptersCount - completedChaptersCount);
  
  let pointsEarned = 0;
  Object.keys(completedMap).forEach(id => {
    if (completedMap[id]) pointsEarned += (chapterPointsMap[id] || 0);
  });

  const completionPercentage = totalChaptersCount > 0 
    ? Math.min(100, Math.round((completedChaptersCount / totalChaptersCount) * 100))
    : 0;

  // Toggle chapter completion & sync with Firestore
  const handleToggleChapter = async (chapterId, pointsReward) => {
    if (!currentUser?.uid || togglingChapterId) return;

    try {
      setTogglingChapterId(chapterId);
      const isCurrentlyCompleted = Boolean(completedMap[chapterId]);
      const userRef = doc(db, 'users', currentUser.uid);

      if (isCurrentlyCompleted) {
        // Uncheck chapter: remove from map and deduct specific chapter points
        const newCount = Math.max(0, completedChaptersCount - 1);
        await updateDoc(userRef, {
          [`syllabusCompleted.${chapterId}`]: deleteField(),
          syllabusCompletedCount: newCount,
          points: Math.max(0, (userProfile?.points || 0) - pointsReward)
        });
      } else {
        // Check chapter: add to map and add specific chapter points
        const newCount = completedChaptersCount + 1;
        await updateDoc(userRef, {
          [`syllabusCompleted.${chapterId}`]: true,
          syllabusCompletedCount: newCount,
          points: (userProfile?.points || 0) + pointsReward
        });
      }
    } catch (err) {
      console.error("Error updating chapter completion:", err);
      alert("Failed to update chapter status. Please check your internet connection.");
    } finally {
      setTogglingChapterId(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading curriculum..." />;

  if (!syllabusDoc) {
    return (
      <EmptyState
        icon={BookOpenCheck}
        title="Curriculum Not Configured"
        description={`The syllabus for ${courseKey} ${levelKey} has not been set up yet. Please ask an administrator to initialize it from the Admin Panel.`}
      />
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>Official Dynamic Syllabus</span>
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
            Track your chapter-by-chapter preparation. Tick completed chapters to gain <strong>Reward Points</strong> and boost your live rank on the leaderboard!
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

        {/* Circular Progress */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Completion Gauge</div>
            <div className="px-2.5 py-1 rounded-full bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-black">
              {totalSyllabusPoints} TOTAL PTS MAX
            </div>
          </div>

          <div className="flex items-center justify-center py-2">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Circular Gauge SVG */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" className="text-navy-900" fill="transparent" />
                <circle cx="50" cy="50" r="42" stroke="url(#progressGradient)" strokeWidth="8" strokeDasharray={264} strokeDashoffset={264 - (264 * completionPercentage) / 100} strokeLinecap="round" className="transition-all duration-700 ease-out" fill="transparent" />
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
              <div key={subObj.id} className="p-5 rounded-2xl glass-card border border-white/10 space-y-3 shadow-md">
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
              <div key={subObj.id} className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                
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
                    const pts = Number(ch.points) || 0;

                    return (
                      <div 
                        key={ch.id}
                        onClick={() => handleToggleChapter(ch.id, pts)}
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
                            {ch.chapterNo ? `Ch ${ch.chapterNo}: ${ch.title}` : ch.title}
                          </span>
                        </div>

                        <span className={`text-xs font-mono font-bold shrink-0 px-2.5 py-1 rounded-lg border transition-all ${
                          isChecked 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                            : 'bg-navy-900 border-white/5 text-slate-400'
                        }`}>
                          {isChecked ? `+${pts} PTS ✓` : `+${pts} PTS`}
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
