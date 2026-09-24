import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, updateDoc, deleteField, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { calculateStudentLevel, getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../utils/levelSystem';
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Award, 
  BarChart3,
  Layers,
  Calendar,
  BookOpenCheck,
  Trophy,
  Star,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lock,
  Check,
  Zap,
  Target,
  Search,
  ArrowRight,
  ShieldCheck,
  Flame
} from 'lucide-react';

export default function Syllabus() {
  const { currentUser, userProfile } = useAuth();
  
  const [completedMap, setCompletedMap] = useState({});
  const [unitCompletionsMap, setUnitCompletionsMap] = useState({});
  const [currentUserData, setCurrentUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('syllabus');
  const [togglingChapterId, setTogglingChapterId] = useState(null);
  const [togglingUnitId, setTogglingUnitId] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});

  // Dynamic syllabus from Firestore
  const [syllabusDoc, setSyllabusDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Level roadmap states
  const [showAllLevels, setShowAllLevels] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'
  const [levelSearch, setLevelSearch] = useState('');

  const rawCourse = userProfile?.course || 'CA';
  const courseKey = rawCourse === 'CMA' || rawCourse?.includes('CMA') ? 'CMA' : 'CA';
  const levelKey = userProfile?.level || (rawCourse?.includes('Intermediate') ? 'Intermediate' : 'Foundation');
  const attempt = userProfile?.attempt || (courseKey === 'CA' ? 'Jan 27' : 'June 27');
  
  const streamId = getStreamId(courseKey, levelKey);
  const [levelConfig, setLevelConfig] = useState(() => getDefaultStreamLevels(streamId));

  // 1. Real-time listener for syllabus blueprint
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

  // 2. Real-time listener for stream levelConfigs
  useEffect(() => {
    const unsubLevel = onSnapshot(doc(db, 'levelConfigs', streamId), (snap) => {
      if (snap.exists() && snap.data().levels) {
        setLevelConfig(normalizeLevelConfig(snap.data().levels, streamId));
      } else {
        setLevelConfig(getDefaultStreamLevels(streamId));
      }
    }, (err) => {
      console.warn("Error fetching levelConfigs for stream:", streamId, err);
      setLevelConfig(getDefaultStreamLevels(streamId));
    });
    return () => unsubLevel();
  }, [streamId]);

  // 3. Real-time listener for student's live user data (points, completed chapters & units)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentUserData(data);
        setCompletedMap(data.syllabusCompleted || {});
        setUnitCompletionsMap(data.unitCompletions || {});
      }
    }, (err) => console.error("Error subscribing to syllabus progress:", err));
    return () => unsubUser();
  }, [currentUser]);

  // Calculate actual progress statistics from dynamic syllabus including Units and PTS
  const { 
    subjects, 
    totalChaptersCount, 
    totalUnitsCount,
    totalSyllabusPoints, 
    chapterPointsMap,
    unitPointsMap,
    totalProgressItems,
    completedProgressItems
  } = useMemo(() => {
    let subjs = syllabusDoc?.subjects || [];
    let chapCount = 0;
    let unitCount = 0;
    let points = 0;
    let chPointMap = {};
    let uPointMap = {};
    let totalItems = 0;
    let doneItems = 0;

    subjs.forEach(s => {
      s.chapters?.forEach(ch => {
        chapCount++;
        const activeUnits = (ch.units || []).filter(u => u.isActive !== false);

        if (activeUnits.length > 0) {
          totalItems += activeUnits.length;
          activeUnits.forEach(u => {
            unitCount++;
            const uPts = Number(u.points) || 0;
            points += uPts;
            uPointMap[u.id] = uPts;
            if (unitCompletionsMap[u.id]?.completed) {
              doneItems++;
            }
          });
        } else {
          totalItems++;
          const chPts = Number(ch.points) || 0;
          points += chPts;
          chPointMap[ch.id] = chPts;
          if (completedMap[ch.id]) {
            doneItems++;
          }
        }
      });
    });

    return { 
      subjects: subjs, 
      totalChaptersCount: chapCount, 
      totalUnitsCount: unitCount,
      totalSyllabusPoints: points, 
      chapterPointsMap: chPointMap,
      unitPointsMap: uPointMap,
      totalProgressItems: totalItems,
      completedProgressItems: doneItems
    };
  }, [syllabusDoc, completedMap, unitCompletionsMap]);

  // Overall syllabus completion percentage
  const completionPercentage = totalProgressItems > 0 
    ? Math.min(100, Math.round((completedProgressItems / totalProgressItems) * 100))
    : 0;

  // Completed chapters count (either marked in completedMap OR all active units completed)
  const completedChaptersCount = useMemo(() => {
    let count = 0;
    subjects.forEach(s => {
      s.chapters?.forEach(ch => {
        const activeUnits = (ch.units || []).filter(u => u.isActive !== false);
        if (activeUnits.length > 0) {
          if (activeUnits.every(u => Boolean(unitCompletionsMap[u.id]?.completed))) {
            count++;
          }
        } else if (completedMap[ch.id]) {
          count++;
        }
      });
    });
    return count;
  }, [subjects, completedMap, unitCompletionsMap]);

  const completedUnitsCount = Object.keys(unitCompletionsMap).filter(id => Boolean(unitCompletionsMap[id]?.completed)).length;
  const remainingChaptersCount = Math.max(0, totalChaptersCount - completedChaptersCount);
  
  // Total points earned
  let pointsEarned = 0;
  Object.keys(unitCompletionsMap).forEach(id => {
    if (unitCompletionsMap[id]?.completed) {
      pointsEarned += Number(unitCompletionsMap[id]?.earnedPts ?? unitPointsMap[id] ?? 0);
    }
  });
  Object.keys(completedMap).forEach(id => {
    if (completedMap[id] && chapterPointsMap[id]) {
      pointsEarned += (chapterPointsMap[id] || 0);
    }
  });

  // Live student points & gamified level calculations
  const studentPoints = Number(currentUserData?.points ?? userProfile?.points ?? 0);

  const levelInfo = useMemo(() => {
    return calculateStudentLevel(studentPoints, levelConfig);
  }, [studentPoints, levelConfig]);

  const filteredLevels = useMemo(() => {
    return levelConfig.filter((lvl) => {
      const isUnlocked = studentPoints >= lvl.requiredPoints;
      const isCurrent = lvl.levelNumber === levelInfo.currentLevelNumber;

      if (levelFilter === 'unlocked' && !isUnlocked) return false;
      if (levelFilter === 'locked' && isUnlocked) return false;
      if (levelFilter === 'current' && !isCurrent) return false;

      if (levelSearch.trim()) {
        const q = levelSearch.toLowerCase().trim();
        const matchesName = (lvl.levelName || '').toLowerCase().includes(q);
        const matchesNum = String(lvl.levelNumber).includes(q);
        const matchesPoints = String(lvl.requiredPoints).includes(q);
        return matchesName || matchesNum || matchesPoints;
      }
      return true;
    });
  }, [levelConfig, studentPoints, levelFilter, levelSearch, levelInfo.currentLevelNumber]);

  // Expand / collapse chapter units
  const handleToggleExpandChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: prev[chapterId] === undefined ? false : !prev[chapterId]
    }));
  };

  // Toggle unit completion & sync with Firestore
  const handleToggleUnit = async (unit, chapter, subject) => {
    if (!currentUser?.uid || togglingUnitId) return;

    const unitId = unit.id;
    try {
      setTogglingUnitId(unitId);
      const userRef = doc(db, 'users', currentUser.uid);
      const existingCompletion = unitCompletionsMap[unitId];
      const isCurrentlyCompleted = Boolean(existingCompletion?.completed);

      if (isCurrentlyCompleted) {
        // UNCHECKING UNIT: Deduct the EXACT pts that were recorded when checked
        const ptsToDeduct = Number(existingCompletion?.earnedPts ?? unit.points ?? 0);

        const activeUnits = (chapter.units || []).filter(u => u.isActive !== false);
        const willRemainingUnitsBeComplete = activeUnits.length > 0 && activeUnits.every(u => {
          if (u.id === unitId) return false;
          return Boolean(unitCompletionsMap[u.id]?.completed);
        });

        const updates = {
          [`unitCompletions.${unitId}`]: deleteField(),
          points: increment(-ptsToDeduct),
          unitsCompletedCount: increment(-1)
        };

        if (!willRemainingUnitsBeComplete && Boolean(completedMap[chapter.id])) {
          updates[`syllabusCompleted.${chapter.id}`] = deleteField();
          updates.syllabusCompletedCount = increment(-1);
        }

        await updateDoc(userRef, updates);

        // Audit doc in unitCompletions collection
        try {
          const auditRef = doc(db, 'unitCompletions', `${currentUser.uid}_${unitId}`);
          await setDoc(auditRef, {
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
            userName: userProfile?.name || '',
            stream: streamId,
            subjectId: subject.id || '',
            chapterId: chapter.id,
            unitId: unitId,
            unitTitle: unit.title || '',
            unitNo: unit.unitNo || '',
            status: 'uncompleted',
            uncompletedAt: serverTimestamp(),
            earnedPts: 0
          }, { merge: true });
        } catch (auditErr) {
          console.warn("Audit update log non-critical:", auditErr);
        }
      } else {
        // CHECKING UNIT
        const ptsToAdd = Number(unit.points) || 0;

        const activeUnits = (chapter.units || []).filter(u => u.isActive !== false);
        const willAllUnitsBeComplete = activeUnits.length > 0 && activeUnits.every(u => {
          if (u.id === unitId) return true;
          return Boolean(unitCompletionsMap[u.id]?.completed);
        });

        const completionData = {
          completed: true,
          completedAt: new Date().toISOString(),
          earnedPts: ptsToAdd,
          streamId,
          subjectId: subject.id || '',
          chapterId: chapter.id,
          unitId: unitId,
          unitTitle: unit.title || '',
          unitNo: unit.unitNo || ''
        };

        const updates = {
          [`unitCompletions.${unitId}`]: completionData,
          points: increment(ptsToAdd),
          unitsCompletedCount: increment(1)
        };

        if (willAllUnitsBeComplete && !Boolean(completedMap[chapter.id])) {
          updates[`syllabusCompleted.${chapter.id}`] = true;
          updates.syllabusCompletedCount = increment(1);
        }

        await updateDoc(userRef, updates);

        // Audit doc in unitCompletions collection
        try {
          const auditRef = doc(db, 'unitCompletions', `${currentUser.uid}_${unitId}`);
          await setDoc(auditRef, {
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
            userName: userProfile?.name || '',
            stream: streamId,
            subjectId: subject.id || '',
            chapterId: chapter.id,
            unitId: unitId,
            unitTitle: unit.title || '',
            unitNo: unit.unitNo || '',
            status: 'completed',
            completedAt: serverTimestamp(),
            earnedPts: ptsToAdd
          }, { merge: true });
        } catch (auditErr) {
          console.warn("Audit write log non-critical:", auditErr);
        }
      }
    } catch (err) {
      console.error("Error updating unit completion:", err);
      alert("Failed to update unit completion. Please check your internet connection.");
    } finally {
      setTogglingUnitId(null);
    }
  };

  // Toggle chapter completion & sync with Firestore (for chapters without units)
  const handleToggleChapter = async (chapterId, pointsReward) => {
    if (!currentUser?.uid || togglingChapterId) return;

    try {
      setTogglingChapterId(chapterId);
      const isCurrentlyCompleted = Boolean(completedMap[chapterId]);
      const userRef = doc(db, 'users', currentUser.uid);

      if (isCurrentlyCompleted) {
        const newCount = Math.max(0, completedChaptersCount - 1);
        await updateDoc(userRef, {
          [`syllabusCompleted.${chapterId}`]: deleteField(),
          syllabusCompletedCount: newCount,
          points: increment(-pointsReward)
        });
      } else {
        const newCount = completedChaptersCount + 1;
        await updateDoc(userRef, {
          [`syllabusCompleted.${chapterId}`]: true,
          syllabusCompletedCount: newCount,
          points: increment(pointsReward)
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
      {/* Top Hub Navigation (Tab Switcher) */}
      <div className="flex justify-center mb-6 pt-2">
        <div className="bg-navy-900/50 p-1.5 rounded-2xl border border-white/5 flex gap-2 w-full max-w-sm relative">
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 relative ${
              activeTab === 'syllabus' 
                ? 'text-white bg-royal-500/20 shadow-glow-royal' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${activeTab === 'syllabus' ? 'text-royal-400' : ''}`} />
            <span>Syllabus</span>
            {activeTab === 'syllabus' && (
              <div className="absolute inset-0 rounded-xl border border-royal-500/30"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('levels')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 relative ${
              activeTab === 'levels' 
                ? 'text-white bg-gold-500/20 shadow-glow-gold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className={`w-4 h-4 ${activeTab === 'levels' ? 'text-gold-400' : ''}`} />
            <span>Levels</span>
            {activeTab === 'levels' && (
              <div className="absolute inset-0 rounded-xl border border-gold-500/30"></div>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'syllabus' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              <div className="text-[11px] font-bold text-slate-400 uppercase">Chapters & Units</div>
              <div className="text-base sm:text-xl font-black text-white">
                {totalChaptersCount} <span className="text-xs text-slate-400 font-normal">Ch</span>
                {totalUnitsCount > 0 && <span className="text-xs text-royal-400 ml-1 font-mono font-bold">• {totalUnitsCount} Units</span>}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Completed</div>
              <div className="text-base sm:text-xl font-black text-emerald-400">
                {completedChaptersCount} <span className="text-xs text-slate-400 font-normal">Ch</span>
                {completedUnitsCount > 0 && <span className="text-xs text-emerald-300 ml-1 font-mono font-bold">• {completedUnitsCount} Units</span>}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Remaining</div>
              <div className="text-base sm:text-xl font-black text-amber-400">{remainingChaptersCount} Ch</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Points Earned</div>
              <div className="text-base sm:text-xl font-black text-gold-400 font-mono">+{pointsEarned} PTS</div>
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
            let subTotalItems = 0;
            let subCompletedItems = 0;

            subjectChapters.forEach(ch => {
              const activeUnits = (ch.units || []).filter(u => u.isActive !== false);
              if (activeUnits.length > 0) {
                subTotalItems += activeUnits.length;
                activeUnits.forEach(u => {
                  if (unitCompletionsMap[u.id]?.completed) subCompletedItems++;
                });
              } else {
                subTotalItems++;
                if (completedMap[ch.id]) subCompletedItems++;
              }
            });

            const subPct = subTotalItems > 0 ? Math.round((subCompletedItems / subTotalItems) * 100) : 0;

            return (
              <div key={subObj.id} className="p-5 rounded-2xl glass-card border border-white/10 space-y-3 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-white text-sm truncate">{subObj.subject}</div>
                  <div className="text-xs font-black text-emerald-400 font-mono shrink-0">
                    {subCompletedItems} / {subTotalItems} ({subPct}%)
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
          <span>Detailed Chapter & Unit Completion Checklist</span>
        </h3>

        <div className="space-y-6">
          {subjects.map((subObj) => {
            const subjectChapters = subObj.chapters || [];
            let subTotalItems = 0;
            let subCompletedItems = 0;

            subjectChapters.forEach(ch => {
              const activeUnits = (ch.units || []).filter(u => u.isActive !== false);
              if (activeUnits.length > 0) {
                subTotalItems += activeUnits.length;
                activeUnits.forEach(u => {
                  if (unitCompletionsMap[u.id]?.completed) subCompletedItems++;
                });
              } else {
                subTotalItems++;
                if (completedMap[ch.id]) subCompletedItems++;
              }
            });

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
                    {subCompletedItems} / {subTotalItems} Completed
                  </span>
                </div>

                {/* Chapter & Unit Items */}
                <div className="divide-y divide-white/5">
                  {subjectChapters.map((ch) => {
                    const activeUnits = (ch.units || []).filter(u => u.isActive !== false);
                    const hasUnits = activeUnits.length > 0;

                    if (hasUnits) {
                      const completedUnitsInCh = activeUnits.filter(u => Boolean(unitCompletionsMap[u.id]?.completed)).length;
                      const chPct = Math.round((completedUnitsInCh / activeUnits.length) * 100);
                      const isChCompleted = completedUnitsInCh === activeUnits.length && activeUnits.length > 0;
                      const chPtsTotal = activeUnits.reduce((sum, u) => sum + (Number(u.points) || 0), 0);
                      const isExpanded = expandedChapters[ch.id] !== false; // default expanded

                      return (
                        <div key={ch.id} className="border-b border-white/5 last:border-b-0">
                          {/* Chapter Accordion Header */}
                          <div 
                            onClick={() => handleToggleExpandChapter(ch.id)}
                            className={`p-4 sm:px-6 flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                              isChCompleted ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'hover:bg-white/5'
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
                                  isChCompleted ? 'text-emerald-200' : 'text-slate-200'
                                }`}>
                                  {ch.chapterNo ? `Ch ${ch.chapterNo}: ${ch.title}` : ch.title}
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium">
                                  Progress: {completedUnitsInCh}/{activeUnits.length} Units — {chPct}%
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              {isChCompleted ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="hidden sm:inline">Chapter Completed ✓</span>
                                  <span className="sm:hidden">Done ✓</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-navy-900 border border-white/10 text-slate-300 text-xs font-mono font-bold">
                                  {chPct}%
                                </span>
                              )}

                              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-navy-900 border border-white/5 text-gold-400">
                                {chPtsTotal} PTS
                              </span>
                            </div>
                          </div>

                          {/* Progress Line Bar Under Chapter Header */}
                          <div className="w-full bg-navy-950 h-1 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                isChCompleted ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-gradient-to-r from-royal-500 to-emerald-400'
                              }`}
                              style={{ width: `${chPct}%` }}
                            />
                          </div>

                          {/* Expanded Units List */}
                          {isExpanded && (
                            <div className="bg-navy-950/40 divide-y divide-white/5 pl-4 sm:pl-12 pr-4 sm:pr-6 py-2">
                              {activeUnits.map((unit) => {
                                const isUnitChecked = Boolean(unitCompletionsMap[unit.id]?.completed);
                                const uPts = Number(unit.points) || 0;

                                return (
                                  <div
                                    key={unit.id}
                                    onClick={() => handleToggleUnit(unit, ch, subObj)}
                                    className={`p-3 sm:px-4 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-150 select-none ${
                                      isUnitChecked 
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20' 
                                        : 'hover:bg-white/5 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3 pr-4 min-w-0">
                                      <button
                                        type="button"
                                        disabled={togglingUnitId === unit.id}
                                        className="focus:outline-none shrink-0"
                                      >
                                        {isUnitChecked ? (
                                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                                        ) : (
                                          <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300 transition-colors" />
                                        )}
                                      </button>

                                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-navy-900 border border-white/10 text-royal-300 shrink-0">
                                        {unit.unitNo || 'Unit'}
                                      </span>

                                      <div className="min-w-0">
                                        <span className={`text-xs sm:text-sm font-medium transition-all block truncate ${
                                          isUnitChecked 
                                            ? 'text-emerald-200 line-through decoration-emerald-500/50' 
                                            : 'text-slate-200'
                                        }`}>
                                          {unit.title}
                                        </span>
                                        {unit.description && (
                                          <p className="text-[10px] text-slate-400 truncate max-w-sm sm:max-w-lg">
                                            {unit.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <span className={`text-xs font-mono font-bold shrink-0 px-2.5 py-1 rounded-lg border transition-all ${
                                      isUnitChecked 
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                                        : 'bg-navy-900 border-white/5 text-gold-400'
                                    }`}>
                                      {isUnitChecked ? `+${uPts} PTS ✓` : `+${uPts} PTS`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // FALLBACK FOR CHAPTERS WITHOUT UNITS (100% Backward Compatible)
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
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
{/* ========================================================================= */}
      {/* 🏆 GAMIFIED LEVEL PROGRESS & NEXT LEVEL REQUIREMENT HERO BANNER */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-7 rounded-3xl glass-card border border-gold-500/40 bg-gradient-to-r from-amber-950/40 via-navy-900/90 to-royal-950/50 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Top Header & Identity */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          
          {/* Current Level Identity */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-gold-500 via-amber-500 to-royal-600 p-0.5 shadow-glow-gold flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-navy-950 rounded-[22px] flex items-center justify-center text-3xl sm:text-4xl">
                {levelInfo.badge}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-300 text-xs font-black uppercase tracking-wider">
                  Level {levelInfo.currentLevelNumber} of 35
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {courseKey} {levelKey} Gamified Track
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>{levelInfo.currentLevelName}</span>
                <span className="text-2xl">{levelInfo.badge}</span>
              </h2>
              <div className="text-xs text-slate-300 font-medium">
                Your Current Balance: <strong className="text-gold-400 font-mono text-sm">{studentPoints.toLocaleString()} PTS</strong>
              </div>
            </div>
          </div>

          {/* Next Level Target Pill & Roadmap Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {!levelInfo.isMaxLevel && levelInfo.nextLevelObj ? (
              <div className="p-4 rounded-2xl bg-navy-900/90 border border-emerald-500/30 space-y-1 sm:min-w-[260px] shadow-lg shadow-emerald-950/20">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Next Milestone Target</span>
                  <span className="text-gold-400 font-black flex items-center gap-1">
                    {levelInfo.nextLevelObj.badge} Level {levelInfo.nextLevelObj.levelNumber}
                  </span>
                </div>
                <div className="text-sm font-black text-white truncate">
                  {levelInfo.nextLevelObj.levelName}
                </div>
                <div className="text-xs font-extrabold text-emerald-400 pt-0.5 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Next level ke liye {levelInfo.pointsRemaining.toLocaleString()} PTS chahiye!</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-center space-y-1">
                <div className="text-xs font-black text-gold-300">🏆 MAXIMUM LEVEL 35 REACHED!</div>
                <div className="text-xs text-slate-300">You are the Ultimate Blueprint Master!</div>
              </div>
            )}

            <button
              onClick={() => setShowAllLevels(prev => !prev)}
              className="px-4 py-3 rounded-2xl bg-royal-600/30 hover:bg-royal-600/50 border border-royal-400/40 text-royal-200 hover:text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shrink-0"
              title="Click to show or hide the full 35 levels roadmap"
            >
              <Award className="w-4 h-4 text-gold-400" />
              <span>{showAllLevels ? 'Hide Levels Roadmap' : 'Show All 35 Levels'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAllLevels ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Level Progression Bar */}
        {!levelInfo.isMaxLevel && levelInfo.nextLevelObj && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5 flex-wrap">
                <span>Progress to Level {levelInfo.nextLevelObj.levelNumber} ({levelInfo.nextLevelObj.levelName})</span>
                <span className="text-gold-400 font-mono font-black">({levelInfo.progressPct}%)</span>
              </span>
              <span className="text-emerald-400 font-mono text-xs font-extrabold">
                {studentPoints.toLocaleString()} / {levelInfo.nextLevelObj.requiredPoints.toLocaleString()} PTS
              </span>
            </div>

            <div className="w-full bg-navy-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/10 shadow-inner">
              <div 
                className="bg-gradient-to-r from-gold-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-glow-gold"
                style={{ width: `${levelInfo.progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 flex-wrap gap-2">
              <span className="font-semibold">{levelInfo.badge} Level {levelInfo.currentLevelNumber} ({levelInfo.currentLevelObj.requiredPoints.toLocaleString()} PTS)</span>
              <span className="text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                🎯 {levelInfo.pointsRemaining.toLocaleString()} more points to level up!
              </span>
              <span className="font-semibold">{levelInfo.nextLevelObj.badge} Level {levelInfo.nextLevelObj.levelNumber} ({levelInfo.nextLevelObj.requiredPoints.toLocaleString()} PTS)</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🌟 ALL 35 LEVELS ROADMAP SECTION */}
      {/* ========================================================================= */}
      {showAllLevels && (
        <div className="p-6 sm:p-7 rounded-3xl glass-card border border-white/10 space-y-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-400" />
                <span>{courseKey} {levelKey} Levels Roadmap — All 35 Levels</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete chapters and log study sessions to climb through all 35 levels and earn prestigious badges.
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={levelSearch}
                  onChange={(e) => setLevelSearch(e.target.value)}
                  placeholder="Search level name..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-gold-500/50 transition-colors w-full sm:w-44"
                />
              </div>

              <div className="flex items-center gap-1 bg-navy-900/80 p-1 rounded-xl border border-white/10">
                {[
                  { id: 'all', label: `All (${levelConfig.length})` },
                  { id: 'unlocked', label: `Unlocked (${levelConfig.filter(l => studentPoints >= l.requiredPoints).length})` },
                  { id: 'locked', label: `Locked (${levelConfig.filter(l => studentPoints < l.requiredPoints).length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setLevelFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      levelFilter === tab.id
                        ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 35 Levels Grid */}
          {filteredLevels.length === 0 ? (
            <div className="p-8 rounded-2xl bg-navy-900/40 border border-white/5 text-center text-xs text-slate-400">
              No levels match your search or filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
              {filteredLevels.map((lvl) => {
                const isUnlocked = studentPoints >= lvl.requiredPoints;
                const isCurrent = lvl.levelNumber === levelInfo.currentLevelNumber;
                const pointsNeeded = Math.max(0, lvl.requiredPoints - studentPoints);

                return (
                  <div
                    key={lvl.levelNumber}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between relative group ${
                      isCurrent
                        ? 'bg-gradient-to-b from-gold-500/25 via-navy-900 to-amber-950/40 border-2 border-gold-400 shadow-glow-gold scale-[1.03] z-10'
                        : isUnlocked
                        ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/50 hover:bg-emerald-950/30'
                        : 'bg-navy-900/50 border-white/5 opacity-75 hover:opacity-100 hover:border-white/20'
                    }`}
                  >
                    {/* Top Row: Level Number & Badge */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                        isCurrent
                          ? 'bg-gold-500 text-navy-950 font-black'
                          : isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400'
                      }`}>
                        #{lvl.levelNumber}
                      </span>
                      <span className="text-xl">{lvl.badge}</span>
                    </div>

                    {/* Level Title */}
                    <div className="space-y-0.5 my-1">
                      <h4 className={`text-xs font-black truncate ${
                        isCurrent 
                          ? 'text-gold-300' 
                          : isUnlocked 
                          ? 'text-white' 
                          : 'text-slate-300'
                      }`}>
                        {lvl.levelName}
                      </h4>
                      <div className="text-[11px] font-mono font-bold text-slate-400">
                        {lvl.requiredPoints.toLocaleString()} PTS
                      </div>
                    </div>

                    {/* Bottom Status Tag */}
                    <div className="pt-2 border-t border-white/5 mt-auto">
                      {isCurrent ? (
                        <div className="text-[10px] font-black text-gold-300 flex items-center gap-1 justify-center bg-gold-500/20 py-0.5 px-1 rounded-md border border-gold-400/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse"></span>
                          <span>Current Level</span>
                        </div>
                      ) : isUnlocked ? (
                        <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 justify-center bg-emerald-500/10 py-0.5 px-1 rounded-md border border-emerald-500/20">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Unlocked</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 justify-center bg-white/5 py-0.5 px-1 rounded-md">
                          <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          <span className="truncate">Need {pointsNeeded.toLocaleString()} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      
        </div>
      )}

    </div>
  );
}
