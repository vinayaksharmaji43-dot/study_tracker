import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, updateDoc, deleteField, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStreamId } from '../utils/levelSystem';
import { getDateKey } from '../utils/helpers';
import { 
  RotateCcw, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Award, 
  BarChart3, 
  Layers, 
  Trophy, 
  Sparkles, 
  Search, 
  Check, 
  ArrowRight,
  Flame,
  Calendar,
  Zap
} from 'lucide-react';

export default function Revision() {
  const { currentUser, userProfile } = useAuth();

  const [revisionDoc, setRevisionDoc] = useState(null);
  const [completedMap, setCompletedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [togglingChapterId, setTogglingChapterId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  const rawCourse = userProfile?.course || 'CA';
  const courseKey = rawCourse === 'CMA' || rawCourse?.includes('CMA') ? 'CMA' : 'CA';
  const levelKey = userProfile?.level || (rawCourse?.includes('Intermediate') ? 'Intermediate' : 'Foundation');
  const streamId = getStreamId(courseKey, levelKey);

  // 1. Real-time listener for Revision document
  useEffect(() => {
    const revRef = doc(db, 'revisions', streamId);
    const unsubRev = onSnapshot(revRef, (snap) => {
      if (snap.exists()) {
        setRevisionDoc(snap.data());
      } else {
        setRevisionDoc(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching revision data:", err);
      setRevisionDoc(null);
      setLoading(false);
    });

    return () => unsubRev();
  }, [streamId]);

  // 2. Real-time listener for student's revision progress in users/{uid}
  useEffect(() => {
    if (!currentUser?.uid) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCompletedMap(data.revisionCompleted || {});
      }
    }, (err) => console.error("Error fetching user revision completions:", err));

    return () => unsubUser();
  }, [currentUser]);

  // Compute revision statistics
  const {
    subjects,
    totalChaptersCount,
    completedChaptersCount,
    overallPercentage,
    totalRevisionPoints,
    earnedRevisionPoints
  } = useMemo(() => {
    const rawSubjects = revisionDoc?.subjects || [];
    let totalChaps = 0;
    let doneChaps = 0;
    let totalPts = 0;
    let earnedPts = 0;

    const filteredSubjects = rawSubjects.map(sub => {
      const activeChapters = (sub.chapters || []).filter(c => c.isActive !== false);
      totalChaps += activeChapters.length;

      activeChapters.forEach(c => {
        const pts = Number(c.points) || 10;
        totalPts += pts;
        if (completedMap[c.id]) {
          doneChaps++;
          earnedPts += pts;
        }
      });

      return {
        ...sub,
        activeChapters
      };
    });

    const pct = totalChaps > 0 ? Math.round((doneChaps / totalChaps) * 100) : 0;

    return {
      subjects: filteredSubjects,
      totalChaptersCount: totalChaps,
      completedChaptersCount: doneChaps,
      overallPercentage: pct,
      totalRevisionPoints: totalPts,
      earnedRevisionPoints: earnedPts
    };
  }, [revisionDoc, completedMap]);

  // Handle Toggle Revision Chapter
  const handleToggleRevisionChapter = async (chapter, subject) => {
    if (!currentUser?.uid || togglingChapterId) return;

    try {
      setTogglingChapterId(chapter.id);
      const isCurrentlyCompleted = Boolean(completedMap[chapter.id]);
      const userRef = doc(db, 'users', currentUser.uid);
      const pointsReward = Number(chapter.points) || 10;

      const now = new Date();
      const dateKey = getDateKey(now);
      const nowIso = now.toISOString();

      if (isCurrentlyCompleted) {
        // Unmark Revision Chapter
        await updateDoc(userRef, {
          [`revisionCompleted.${chapter.id}`]: deleteField(),
          [`revisionChapterCompletions.${chapter.id}`]: deleteField(),
          revisionCompletedCount: increment(-1),
          points: increment(-pointsReward)
        });

        // Sync with chapterCompletions for Calendar
        try {
          const chapDocRef = doc(db, 'chapterCompletions', `${currentUser.uid}_revision_${chapter.id}`);
          await setDoc(chapDocRef, {
            status: 'uncompleted',
            uncompletedAt: serverTimestamp()
          }, { merge: true });
        } catch (cErr) {
          console.warn("Calendar revision uncompleted sync warning:", cErr);
        }
      } else {
        // Mark Revision Chapter as Completed
        await updateDoc(userRef, {
          [`revisionCompleted.${chapter.id}`]: true,
          [`revisionChapterCompletions.${chapter.id}`]: {
            completed: true,
            completedAt: nowIso,
            dateKey: dateKey,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            chapterNo: chapter.chapterNo || '',
            subjectName: subject.subject,
            streamId
          },
          revisionCompletedCount: increment(1),
          points: increment(pointsReward)
        });

        // Sync with chapterCompletions for Calendar
        try {
          const chapDocRef = doc(db, 'chapterCompletions', `${currentUser.uid}_revision_${chapter.id}`);
          await setDoc(chapDocRef, {
            uid: currentUser.uid,
            studentId: currentUser.uid,
            type: 'revision',
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            chapterNo: chapter.chapterNo || '',
            subjectName: subject.subject,
            streamId,
            status: 'completed',
            completedAt: serverTimestamp(),
            dateKey
          }, { merge: true });
        } catch (cErr) {
          console.warn("Calendar revision completion sync warning:", cErr);
        }
      }
    } catch (err) {
      console.error("Error updating revision chapter completion:", err);
      alert("Failed to update revision status. Please check your internet connection.");
    } finally {
      setTogglingChapterId(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading revision plan..." />;

  if (!revisionDoc || subjects.length === 0) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="Revision Not Configured"
        description={`The revision syllabus for ${courseKey} ${levelKey} has not been set up yet. Please ask an administrator to initialize it from the Admin Panel.`}
      />
    );
  }

  // Filtered subjects based on search & filter
  const displayedSubjects = subjects.filter(sub => {
    if (selectedSubjectFilter !== 'all' && sub.id !== selectedSubjectFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 🔄 REVISION HERO BANNER & PROGRESS SUMMARY */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/40 bg-gradient-to-r from-royal-950/70 via-navy-900/90 to-indigo-950/70 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-royal-500/20 border border-royal-500/40 text-royal-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-royal-400" />
                <span>Revision Tracker</span>
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {courseKey} {levelKey} Comprehensive Recall
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span>Chapter-Wise Revision</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track your revision progress across all subjects. Revision tracks complete chapters to guarantee retention and exam readiness.
            </p>
          </div>

          {/* Points & Progress Callout */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="p-4 rounded-2xl bg-navy-900/90 border border-royal-500/30 text-right min-w-[160px] shadow-lg">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revision Points</div>
              <div className="text-xl sm:text-2xl font-black text-gold-400">
                {earnedRevisionPoints.toLocaleString()} <span className="text-xs text-slate-400 font-medium">/ {totalRevisionPoints.toLocaleString()} PTS</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-royal-600/30 border border-emerald-500/30 text-center min-w-[120px] shadow-lg">
              <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Recall Ratio</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{overallPercentage}%</div>
            </div>
          </div>
        </div>

        {/* Global Revision Progress Bar */}
        <div className="space-y-2 relative z-10 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-2">
              <span>Overall Completion</span>
              <span className="text-royal-400 font-mono font-black">({completedChaptersCount} of {totalChaptersCount} Chapters)</span>
            </span>
            <span className="text-emerald-400 font-mono font-extrabold">{overallPercentage}%</span>
          </div>

          <div className="w-full bg-navy-950/80 rounded-full h-3.5 p-0.5 border border-white/10 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-royal-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-500 shadow-glow-royal"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📊 METRICS & FILTER ROW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-royal-400" />
            <span>Total Subjects</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{subjects.length}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Total Chapters</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{totalChaptersCount}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Revised Chapters</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{completedChaptersCount}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Remaining Chapters</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {Math.max(0, totalChaptersCount - completedChaptersCount)}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔍 SEARCH & SUBJECT FILTER BAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search revision chapters..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-royal-500"
          />
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSubjectFilter === 'all'
                ? 'bg-royal-600 text-white border border-royal-400/40 shadow-sm'
                : 'bg-navy-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All Subjects
          </button>
          {subjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectFilter(sub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 truncate max-w-[200px] ${
                selectedSubjectFilter === sub.id
                  ? 'bg-royal-600 text-white border border-royal-400/40 shadow-sm'
                  : 'bg-navy-900 border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {sub.subject}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📚 SUBJECT-WISE REVISION CHAPTERS LIST */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        {displayedSubjects.map(subObj => {
          const rawChaps = subObj.activeChapters || [];
          const filteredChaps = searchQuery.trim()
            ? rawChaps.filter(c => 
                c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(c.chapterNo || '').toLowerCase().includes(searchQuery.toLowerCase())
              )
            : rawChaps;

          const completedInSub = rawChaps.filter(c => Boolean(completedMap[c.id])).length;
          const subPct = rawChaps.length > 0 ? Math.round((completedInSub / rawChaps.length) * 100) : 0;
          const isSubFullyRevised = completedInSub === rawChaps.length && rawChaps.length > 0;

          if (searchQuery.trim() && filteredChaps.length === 0) {
            return null;
          }

          return (
            <div key={subObj.id} className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
              {/* Subject Header */}
              <div className="p-5 bg-navy-900/90 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-royal-500/20 border border-royal-500/30 text-royal-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-white truncate">{subObj.subject}</h3>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Revision Progress: {completedInSub} / {rawChaps.length} Chapters
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {isSubFullyRevised ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Subject Revised ✓</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
                      {subPct}% Completed
                    </span>
                  )}
                </div>
              </div>

              {/* Subject Progress Bar */}
              <div className="w-full bg-navy-950 h-1 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isSubFullyRevised ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-gradient-to-r from-royal-500 to-indigo-400'
                  }`}
                  style={{ width: `${subPct}%` }}
                />
              </div>

              {/* Chapters Checklist */}
              <div className="divide-y divide-white/5">
                {filteredChaps.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No revision chapters found.
                  </div>
                ) : (
                  filteredChaps.map(ch => {
                    const isChecked = Boolean(completedMap[ch.id]);
                    const pts = Number(ch.points) || 10;

                    return (
                      <div
                        key={ch.id}
                        onClick={() => handleToggleRevisionChapter(ch, subObj)}
                        className={`p-4 sm:px-6 flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                          isChecked
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Left: Checkbox + Chapter Info */}
                        <div className="flex items-center space-x-3.5 pr-4 min-w-0">
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

                          <div className="min-w-0">
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-navy-900 border border-white/10 text-royal-300 mr-2 inline-block">
                              {ch.chapterNo ? `Ch ${ch.chapterNo}` : 'Ch'}
                            </span>
                            <span className={`text-sm font-semibold transition-all ${
                              isChecked
                                ? 'text-emerald-200 line-through decoration-emerald-500/50'
                                : 'text-slate-200'
                            }`}>
                              {ch.title}
                            </span>
                          </div>
                        </div>

                        {/* Right: Points Tag */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isChecked && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Revised</span>
                            </span>
                          )}

                          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-all ${
                            isChecked
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-navy-900 border-white/5 text-gold-400'
                          }`}>
                            {isChecked ? `+${pts} PTS ✓` : `+${pts} PTS`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
