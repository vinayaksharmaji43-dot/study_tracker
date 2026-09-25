import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, updateDoc, deleteField, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { SYLLABUS_DATA, getDefaultUnitsForChapter } from '../data/syllabusData';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStreamId } from '../utils/levelSystem';
import { getDateKey } from '../utils/helpers';
import { 
  RotateCcw, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Layers, 
  Sparkles, 
  Search, 
  Flame, 
  Zap, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

export default function Revision() {
  const { currentUser, userProfile } = useAuth();

  // Documents from Firestore
  const [syllabusDoc, setSyllabusDoc] = useState(null);
  const [revisionDoc, setRevisionDoc] = useState(null);
  const [completedMap, setCompletedMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Interaction State
  const [togglingUnitId, setTogglingUnitId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [expandedChapters, setExpandedChapters] = useState({});

  const rawCourse = userProfile?.course || 'CA';
  const courseKey = rawCourse === 'CMA' || rawCourse?.includes('CMA') ? 'CMA' : 'CA';
  const levelKey = userProfile?.level || (rawCourse?.includes('Intermediate') ? 'Intermediate' : 'Foundation');
  const streamId = getStreamId(courseKey, levelKey);

  // 1. Real-time listener for Syllabus Blueprint (Source of Truth: Subject -> Chapter -> Units)
  useEffect(() => {
    const syllabusRef = doc(db, 'syllabi', streamId);
    const unsubSyllabus = onSnapshot(syllabusRef, (snap) => {
      if (snap.exists()) {
        setSyllabusDoc(snap.data());
      } else {
        setSyllabusDoc(null);
      }
    }, (err) => {
      console.error("Error fetching syllabus for revision:", err);
      setSyllabusDoc(null);
    });

    return () => unsubSyllabus();
  }, [streamId]);

  // 2. Real-time listener for Revision Configuration (manual units, disabled units, overrides)
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

  // 3. Real-time listener for Student's Revision Progress in users/{uid}
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

  // Extract base syllabus subjects
  const baseSubjects = useMemo(() => {
    if (syllabusDoc?.subjects && syllabusDoc.subjects.length > 0) {
      return syllabusDoc.subjects;
    }
    const fallbackCourse = SYLLABUS_DATA[courseKey]?.[levelKey] || [];
    return fallbackCourse.map((sub, sIdx) => ({
      id: `fallback_sub_${sIdx}`,
      subject: sub.subject,
      chapters: (sub.chapters || []).map((ch, cIdx) => ({
        id: ch.id,
        chapterNo: String(cIdx + 1),
        title: ch.title,
        points: 10,
        units: getDefaultUnitsForChapter(ch.id, ch.title)
      }))
    }));
  }, [syllabusDoc, courseKey, levelKey]);

  // Read revision manual controls
  const disabledUnitIds = useMemo(() => revisionDoc?.disabledUnitIds || [], [revisionDoc]);
  const manualUnits = useMemo(() => revisionDoc?.manualUnits || [], [revisionDoc]);
  const unitOverrides = useMemo(() => revisionDoc?.unitOverrides || {}, [revisionDoc]);

  // Combine Syllabus Subject -> Chapter -> Units with Revision Manual Units & Filters
  const {
    subjects,
    totalRevisionUnitsCount,
    fullyRevisedUnitsCount,
    overallPercentage,
    totalRevisionPoints,
    earnedRevisionPoints
  } = useMemo(() => {
    let totalUnits = 0;
    let revisedUnits = 0;
    let totalPts = 0;
    let earnedPts = 0;

    const mergedSubjects = baseSubjects.map(sub => {
      const activeChapters = (sub.chapters || []).map(ch => {
        // 1. Base syllabus units
        const chSyllabusUnits = (ch.units && ch.units.length > 0)
          ? ch.units
          : getDefaultUnitsForChapter(ch.id, ch.title);

        const mappedSyllabusUnits = chSyllabusUnits
          .filter(u => !disabledUnitIds.includes(u.id) && u.isActive !== false)
          .map((u, uIdx) => {
            const override = unitOverrides[u.id] || {};
            return {
              id: u.id,
              chapterId: ch.id,
              subjectId: sub.id,
              unitNo: u.unitNo || `Unit ${uIdx + 1}`,
              title: override.title || u.title,
              description: u.description || '',
              points: override.points !== undefined ? Number(override.points) : (Number(u.points) || 10),
              isManual: false,
              isSyllabus: true
            };
          });

        // 2. Manual units added specifically for Revision in this chapter
        const chManualUnits = manualUnits
          .filter(mu => mu.chapterId === ch.id && mu.isActive !== false)
          .map(mu => ({
            id: mu.id,
            chapterId: ch.id,
            subjectId: sub.id,
            unitNo: mu.unitNo || 'Manual Unit',
            title: mu.title,
            description: mu.description || '',
            points: Number(mu.points) || 10,
            isManual: true,
            isSyllabus: false
          }));

        const chapterRevisionUnits = [...mappedSyllabusUnits, ...chManualUnits];

        // Track statistics (3 revisions = 100% completed)
        if (chapterRevisionUnits.length > 0) {
          chapterRevisionUnits.forEach(u => {
            totalUnits++;
            const pts = Number(u.points) || 10;
            totalPts += pts;

            const rawVal = completedMap[u.id];
            const revCount = rawVal === true ? 3 : (Number(rawVal) || 0);

            if (revCount >= 3) {
              revisedUnits++;
              earnedPts += pts;
            }
          });
        } else {
          // Chapter without sub-units fallback
          totalUnits++;
          const pts = Number(ch.points) || 10;
          totalPts += pts;
          const rawVal = completedMap[ch.id];
          const revCount = rawVal === true ? 3 : (Number(rawVal) || 0);
          if (revCount >= 3) {
            revisedUnits++;
            earnedPts += pts;
          }
        }

        return {
          ...ch,
          units: chapterRevisionUnits
        };
      });

      return {
        ...sub,
        chapters: activeChapters
      };
    });

    const pct = totalUnits > 0 ? Math.round((revisedUnits / totalUnits) * 100) : 0;

    return {
      subjects: mergedSubjects,
      totalRevisionUnitsCount: totalUnits,
      fullyRevisedUnitsCount: revisedUnits,
      overallPercentage: pct,
      totalRevisionPoints: totalPts,
      earnedRevisionPoints: earnedPts
    };
  }, [baseSubjects, disabledUnitIds, manualUnits, unitOverrides, completedMap]);

  // Handle Toggle Revision (R1, R2, R3 - exactly 3 revision ticks)
  const handleToggleRevisionTick = async (item, targetRevNumber, isChecking) => {
    if (!currentUser?.uid || togglingUnitId) return;

    try {
      setTogglingUnitId(`${item.id}_${targetRevNumber}`);
      const userRef = doc(db, 'users', currentUser.uid);
      const pointsReward = Number(item.points) || 10;

      const now = new Date();
      const dateKey = getDateKey(now);

      if (!isChecking) {
        // Unmark Revision
        // If unmarking the 3rd revision, deduct points
        const pointChange = targetRevNumber === 3 ? -pointsReward : 0;
        const newCount = targetRevNumber - 1;

        const updates = {
          [`revisionCompleted.${item.id}`]: newCount === 0 ? deleteField() : newCount,
          points: increment(pointChange)
        };

        if (targetRevNumber === 3) {
          updates.revisionCompletedCount = increment(-1);
        }

        await updateDoc(userRef, updates);
        setCompletedMap(prev => {
          const next = { ...prev };
          if (newCount === 0) delete next[item.id];
          else next[item.id] = newCount;
          return next;
        });

      } else {
        // Mark Revision
        // Award points when 3rd revision tick is completed
        const pointChange = targetRevNumber === 3 ? pointsReward : 0;
        const updates = {
          [`revisionCompleted.${item.id}`]: targetRevNumber,
          points: increment(pointChange)
        };

        if (targetRevNumber === 3) {
          updates.revisionCompletedCount = increment(1);
        }

        await updateDoc(userRef, updates);

        // Record daily study activity in user daily log when 3rd revision is done
        if (targetRevNumber === 3) {
          const dailyLogRef = doc(db, 'users', currentUser.uid, 'dailyLogs', dateKey);
          await setDoc(dailyLogRef, {
            dateKey,
            revisionPoints: increment(pointsReward),
            lastUpdated: serverTimestamp()
          }, { merge: true });
        }

        setCompletedMap(prev => ({
          ...prev,
          [item.id]: targetRevNumber
        }));
      }
    } catch (err) {
      console.error("Error toggling revision tick:", err);
      alert("Failed to update revision progress. Please try again.");
    } finally {
      setTogglingUnitId(null);
    }
  };

  const handleToggleExpandChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: prev[chapterId] === false ? true : false
    }));
  };

  if (loading) return <LoadingSpinner />;

  // Filter subjects based on search & subject filter
  const displayedSubjects = subjects.filter(sub => {
    if (selectedSubjectFilter !== 'all' && sub.id !== selectedSubjectFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 🚀 TOP HERO BANNER & PROGRESS SUMMARY */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
              <RotateCcw className="w-4 h-4 text-royal-400" />
              <span>3-Round Revision Tracker</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Revision Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Track your revision step-by-step with <strong>3 revision rounds (R1 → R2 → R3)</strong> for every section and unit, exactly aligned with the syllabus.
            </p>
          </div>

          {/* Circular Progress Gauge */}
          <div className="p-5 rounded-2xl bg-navy-900/80 border border-white/10 flex items-center gap-5 shrink-0 shadow-lg">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" className="text-navy-950" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#revisionGradient)" 
                  strokeWidth="8" 
                  strokeDasharray={251.2} 
                  strokeDashoffset={251.2 - (251.2 * overallPercentage) / 100} 
                  strokeLinecap="round" 
                  className="transition-all duration-700 ease-out" 
                  fill="transparent" 
                />
                <defs>
                  <linearGradient id="revisionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-base font-black text-white font-mono">{overallPercentage}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Revised</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Revision</div>
              <div className="text-lg font-black text-white">
                <span className="text-emerald-400">{fullyRevisedUnitsCount}</span> / {totalRevisionUnitsCount} <span className="text-xs font-semibold text-slate-400">Sections</span>
              </div>
              <div className="text-xs font-mono font-bold text-gold-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>{earnedRevisionPoints} / {totalRevisionPoints} PTS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📊 METRICS ROW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-royal-400" />
            <span>Subjects</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{subjects.length}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Total Units & Sections</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{totalRevisionUnitsCount}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fully Revised (R3)</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{fullyRevisedUnitsCount}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Units</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {Math.max(0, totalRevisionUnitsCount - fullyRevisedUnitsCount)}
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
            placeholder="Search chapters or revision units..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-royal-500 font-medium"
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
            All Subjects ({subjects.length})
          </button>
          {subjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectFilter(sub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 max-w-[200px] truncate ${
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
      {/* 📚 SUBJECT → CHAPTER → UNITS REVISION CHECKLIST (MATCHING SYLLABUS) */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        {displayedSubjects.map(subObj => {
          const rawChapters = subObj.chapters || [];
          
          // Calculate subject-level unit metrics
          let subTotalUnits = 0;
          let subRevisedUnits = 0;

          rawChapters.forEach(ch => {
            const chUnits = ch.units || [];
            if (chUnits.length > 0) {
              chUnits.forEach(u => {
                subTotalUnits++;
                const rawVal = completedMap[u.id];
                const revCount = rawVal === true ? 3 : (Number(rawVal) || 0);
                if (revCount >= 3) subRevisedUnits++;
              });
            } else {
              subTotalUnits++;
              const rawVal = completedMap[ch.id];
              const revCount = rawVal === true ? 3 : (Number(rawVal) || 0);
              if (revCount >= 3) subRevisedUnits++;
            }
          });

          const subPct = subTotalUnits > 0 ? Math.round((subRevisedUnits / subTotalUnits) * 100) : 0;
          const isSubFullyRevised = subRevisedUnits === subTotalUnits && subTotalUnits > 0;

          // Filter chapters by search query
          const filteredChapters = searchQuery.trim()
            ? rawChapters.filter(ch => 
                ch.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ch.units?.some(u => u.title?.toLowerCase().includes(searchQuery.toLowerCase()))
              )
            : rawChapters;

          if (searchQuery.trim() && filteredChapters.length === 0) {
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
                      Revision Progress: {subRevisedUnits} / {subTotalUnits} Sections Fully Revised
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

              {/* Subject Progress Line */}
              <div className="w-full bg-navy-950 h-1 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isSubFullyRevised ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-gradient-to-r from-royal-500 to-indigo-400'
                  }`}
                  style={{ width: `${subPct}%` }}
                />
              </div>

              {/* Chapters & Units List (Matches Syllabus Section Style) */}
              <div className="divide-y divide-white/5">
                {filteredChapters.map(ch => {
                  const units = ch.units || [];
                  const hasUnits = units.length > 0;
                  const isExpanded = expandedChapters[ch.id] !== false; // default expanded

                  if (hasUnits) {
                    let chTotalUnits = units.length;
                    let chRevisedUnits = 0;
                    let chTotalPts = 0;

                    units.forEach(u => {
                      chTotalPts += (Number(u.points) || 10);
                      const rawVal = completedMap[u.id];
                      const revCount = rawVal === true ? 3 : (Number(rawVal) || 0);
                      if (revCount >= 3) chRevisedUnits++;
                    });

                    const chPct = chTotalUnits > 0 ? Math.round((chRevisedUnits / chTotalUnits) * 100) : 0;
                    const isChFullyRevised = chRevisedUnits === chTotalUnits && chTotalUnits > 0;

                    return (
                      <div key={ch.id} className="border-b border-white/5 last:border-b-0">
                        
                        {/* Chapter Accordion Bar (Identical to Syllabus Chapter Header) */}
                        <div 
                          onClick={() => handleToggleExpandChapter(ch.id)}
                          className={`p-4 sm:px-6 flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                            isChFullyRevised ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5 pr-4 min-w-0">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg bg-navy-950 border border-white/10 text-slate-400 hover:text-white shrink-0 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-royal-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>

                            <div className="min-w-0">
                              <div className={`text-sm font-bold transition-all truncate ${
                                isChFullyRevised ? 'text-emerald-200' : 'text-slate-200'
                              }`}>
                                {ch.chapterNo ? `Ch ${ch.chapterNo}: ${ch.title}` : ch.title}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                Progress: {chRevisedUnits}/{chTotalUnits} Units Revised — {chPct}%
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {isChFullyRevised ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden sm:inline">Chapter Revised ✓</span>
                                <span className="sm:hidden">Done ✓</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-navy-900 border border-white/10 text-slate-300 text-xs font-mono font-bold">
                                {chPct}%
                              </span>
                            )}

                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-navy-900 border border-white/5 text-gold-400">
                              {chTotalPts} PTS
                            </span>
                          </div>
                        </div>

                        {/* Chapter Progress Line */}
                        <div className="w-full bg-navy-950 h-1 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              isChFullyRevised ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-gradient-to-r from-royal-500 to-indigo-400'
                            }`}
                            style={{ width: `${chPct}%` }}
                          />
                        </div>

                        {/* Units List Inside Chapter (Showing 3 Revision Ticks) */}
                        {isExpanded && (
                          <div className="bg-navy-950/40 divide-y divide-white/5 pl-4 sm:pl-12 pr-4 sm:pr-6 py-2">
                            {units.map((unit) => {
                              const rawVal = completedMap[unit.id];
                              const revCount = rawVal === true ? 3 : (Number(rawVal) || 0);
                              const isFullyRevised = revCount >= 3;
                              const pts = Number(unit.points) || 10;

                              return (
                                <div
                                  key={unit.id}
                                  className={`p-3.5 sm:px-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 select-none ${
                                    isFullyRevised
                                      ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20'
                                      : 'hover:bg-white/5 border border-transparent'
                                  }`}
                                >
                                  {/* Left: Unit Identity & Description */}
                                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-navy-900 border border-white/10 text-royal-300 shrink-0">
                                      {unit.unitNo || 'Unit'}
                                    </span>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs sm:text-sm font-semibold transition-all ${
                                          isFullyRevised
                                            ? 'text-emerald-200 line-through decoration-emerald-500/50'
                                            : 'text-slate-200'
                                        }`}>
                                          {unit.title}
                                        </span>

                                        {unit.isManual && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
                                            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                            Revision Focus
                                          </span>
                                        )}
                                      </div>

                                      {unit.description && (
                                        <p className="text-[10px] text-slate-400 truncate max-w-sm sm:max-w-lg mt-0.5">
                                          {unit.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: 3 Revision Tick Options (R1, R2, R3) & Points */}
                                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 shrink-0 bg-navy-900/60 p-2 sm:p-1.5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      {[1, 2, 3].map(revNum => {
                                        const isChecked = revCount >= revNum;
                                        const canInteract = revNum === revCount + 1 || revNum === revCount;

                                        return (
                                          <button
                                            key={revNum}
                                            type="button"
                                            disabled={!canInteract || togglingUnitId === `${unit.id}_${revNum}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleRevisionTick(unit, revNum, !isChecked);
                                            }}
                                            className={`focus:outline-none flex flex-col items-center gap-1 transition-all p-1.5 rounded-lg ${
                                              !canInteract 
                                                ? 'opacity-35 cursor-not-allowed' 
                                                : 'hover:bg-white/10 cursor-pointer active:scale-95'
                                            }`}
                                            title={`Revision Round ${revNum} of 3`}
                                          >
                                            {isChecked ? (
                                              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 fill-emerald-500/20 shadow-glow-emerald" />
                                            ) : (
                                              <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 hover:text-royal-400 transition-colors" />
                                            )}
                                            <span className={`text-[9px] font-bold ${isChecked ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
                                              R{revNum}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    <div className="flex flex-col items-end gap-0.5 border-l border-white/10 pl-3 sm:pl-4">
                                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                        isFullyRevised
                                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-glow-emerald'
                                          : 'bg-navy-900 border-white/5 text-gold-400'
                                      }`}>
                                        {isFullyRevised ? `+${pts} PTS ✓` : `+${pts} PTS`}
                                      </span>
                                      {!isFullyRevised && (
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                          At R3
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    );
                  }

                  // Fallback for chapter without sub-units (Direct Chapter with 3 Ticks)
                  const rawVal = completedMap[ch.id];
                  const revCount = rawVal === true ? 3 : (Number(rawVal) || 0);
                  const isFullyRevised = revCount >= 3;
                  const pts = Number(ch.points) || 10;

                  return (
                    <div
                      key={ch.id}
                      className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 select-none border-b border-white/5 last:border-b-0 ${
                        isFullyRevised ? 'bg-emerald-500/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-navy-900 border border-white/10 text-royal-300 mr-2">
                          {ch.chapterNo ? `Ch ${ch.chapterNo}` : 'Ch'}
                        </span>
                        <span className={`text-sm font-semibold transition-all ${
                          isFullyRevised ? 'text-emerald-200 line-through decoration-emerald-500/50' : 'text-slate-200'
                        }`}>
                          {ch.title}
                        </span>
                      </div>

                      {/* 3 Revision Ticks for chapter */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 shrink-0 bg-navy-900/60 p-2 sm:p-1.5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {[1, 2, 3].map(revNum => {
                            const isChecked = revCount >= revNum;
                            const canInteract = revNum === revCount + 1 || revNum === revCount;

                            return (
                              <button
                                key={revNum}
                                type="button"
                                disabled={!canInteract || togglingUnitId === `${ch.id}_${revNum}`}
                                onClick={() => handleToggleRevisionTick(ch, revNum, !isChecked)}
                                className={`focus:outline-none flex flex-col items-center gap-1 transition-all p-1.5 rounded-lg ${
                                  !canInteract ? 'opacity-35 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer active:scale-95'
                                }`}
                                title={`Revision Round ${revNum} of 3`}
                              >
                                {isChecked ? (
                                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 fill-emerald-500/20 shadow-glow-emerald" />
                                ) : (
                                  <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 hover:text-royal-400 transition-colors" />
                                )}
                                <span className={`text-[9px] font-bold ${isChecked ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
                                  R{revNum}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex flex-col items-end gap-0.5 border-l border-white/10 pl-3 sm:pl-4">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border transition-all ${
                            isFullyRevised ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-navy-900 border-white/5 text-gold-400'
                          }`}>
                            {isFullyRevised ? `+${pts} PTS ✓` : `+${pts} PTS`}
                          </span>
                          {!isFullyRevised && (
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                              At R3
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
