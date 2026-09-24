import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateStudentLevel, getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../utils/levelSystem';
import { 
  Trophy, 
  BarChart3, 
  X, 
  Clock, 
  Flame, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  Zap, 
  CheckCircle2, 
  Award,
  Layers,
  Activity,
  ArrowLeft
} from 'lucide-react';

// Helpers
function getBadge(durationSecs) {
  const hours = durationSecs / 3600;
  if (hours >= 5) return { text: '💎 Unstoppable', color: 'text-cyan-400', bg: 'bg-cyan-400/20', border: 'border-cyan-400/40' };
  if (hours >= 4) return { text: '🏆 Study Beast', color: 'text-gold-400', bg: 'bg-gold-500/20', border: 'border-gold-500/40' };
  if (hours >= 3) return { text: '⚡ Deep Focus', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40' };
  if (hours >= 2) return { text: '🔥 Locked In', color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40' };
  if (hours >= 1) return { text: '🟢 Focused', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' };
  return null;
}

function formatStudyDuration(secs) {
  if (!secs || secs <= 0) return '0h';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatFocusDuration(secs) {
  if (!secs || secs <= 0) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
  if (m > 0) return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  return `${s}s`;
}

function formatClockTime(timestamp) {
  if (!timestamp) return '--:--';
  const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getDateKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function StudentProfileModal({ student, activeSession: initialActiveSession, onClose }) {
  const [viewMode, setViewMode] = useState('profile'); // 'profile' | 'statistics'
  const [userData, setUserData] = useState(null);
  const [activeSession, setActiveSession] = useState(initialActiveSession || null);
  const [sessions, setSessions] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [levelConfigs, setLevelConfigs] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);

  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDateKey(new Date()));

  // Lock body scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const studentId = student?.studentId || student?.uid || student?.id;

  // 1. Level Configs Listener
  useEffect(() => {
    return onSnapshot(collection(db, 'levelConfigs'), (snap) => {
      const configs = {};
      snap.docs.forEach((d) => {
        configs[d.id] = normalizeLevelConfig(d.data().levels, d.id);
      });
      setLevelConfigs(configs);
    });
  }, []);

  // 2. Fetch User Public Data (strictly public fields, never private data)
  useEffect(() => {
    if (!studentId) return;
    const unsub = onSnapshot(doc(db, 'users', studentId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setUserData({
          name: d.name || student?.displayName || student?.name || 'Student',
          course: d.course || student?.course || 'CA',
          level: d.level || student?.level || 'Foundation',
          attempt: d.attempt || student?.attempt || '',
          points: Number(d.points) || 0,
          studyHours: Number(d.studyHours) || 0,
          badge: d.badge || '',
          role: d.role || 'student'
        });
      }
    }, (err) => console.warn('Could not read user profile:', err));

    return () => unsub();
  }, [studentId, student]);

  // 3. Listen to Active Session if currently studying
  useEffect(() => {
    if (!studentId) return;
    const unsub = onSnapshot(doc(db, 'activeStudySessions', studentId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const isRecent = data.active && (Date.now() - (data.lastUpdatedAt || data.startedAt)) < 120000;
        if (isRecent) {
          setActiveSession({ id: snap.id, ...data });
        } else {
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
    }, () => {});

    return () => unsub();
  }, [studentId]);

  // 4. Listen to actual recorded study timer data (studySessions, studyDailyStats, pointTransactions)
  useEffect(() => {
    if (!studentId) return;
    setLoadingStats(true);

    // Actual recorded study timer sessions
    const qSessions = query(collection(db, 'studySessions'), where('uid', '==', studentId));
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(docs);
      setLoadingStats(false);
    }, (err) => {
      console.warn("Could not load study sessions:", err);
      setLoadingStats(false);
    });

    // Daily Stats (milestones, daily points)
    const qStats = query(collection(db, 'studyDailyStats'), where('studentId', '==', studentId));
    const unsubStats = onSnapshot(qStats, (snap) => {
      setDailyStats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    // Point Transactions
    const qTx = query(collection(db, 'pointTransactions'), where('studentId', '==', studentId));
    const unsubTx = onSnapshot(qTx, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    return () => {
      unsubSessions();
      unsubStats();
      unsubTx();
    };
  }, [studentId]);

  // 5. Live ticking for current session duration
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!activeSession) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // Compute live session stats
  const isCurrentlyStudying = Boolean(activeSession && activeSession.active);
  const liveDurationSecs = useMemo(() => {
    if (!activeSession?.startedAt) return 0;
    return Math.max(0, Math.floor((now - activeSession.startedAt) / 1000));
  }, [activeSession, now]);

  // Maximum focus for current session
  const currentMaxFocusSecs = useMemo(() => {
    if (!activeSession) return 0;
    if (activeSession.maxFocusSecs) return activeSession.maxFocusSecs;
    // Fallback: duration of uninterrupted session
    return liveDurationSecs;
  }, [activeSession, liveDurationSecs]);

  // Merged profile info
  const displayName = userData?.name || student?.displayName || student?.name || 'Student';
  const course = userData?.course || student?.course || 'CA';
  const level = userData?.level || student?.level || 'Foundation';
  const attempt = userData?.attempt || student?.attempt || '';
  const points = userData?.points ?? student?.points ?? 0;

  const streamId = getStreamId(course, level);
  const streamLevelConfig = levelConfigs[streamId] || getDefaultStreamLevels(streamId);
  const studentLevel = calculateStudentLevel(points, streamLevelConfig);

  const liveBadge = isCurrentlyStudying ? getBadge(liveDurationSecs) : null;

  // Calendar Day Aggregations
  // Map dateKey -> { totalSecs, sessions: [], pointsEarned, longestSessionSecs, maxFocusSecs }
  const calendarData = useMemo(() => {
    const map = {};

    sessions.forEach((s) => {
      let rawDate = s.date || s.createdAt;
      if (!rawDate) return;
      const d = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
      const k = getDateKey(d);
      if (!k) return;

      if (!map[k]) {
        map[k] = {
          dateKey: k,
          totalSecs: 0,
          sessions: [],
          pointsEarned: 0,
          longestSessionSecs: 0,
          maxFocusSecs: 0
        };
      }

      const dur = Number(s.duration) || 0;
      map[k].totalSecs += dur;
      map[k].sessions.push(s);
      if (dur > map[k].longestSessionSecs) {
        map[k].longestSessionSecs = dur;
      }
      const focus = Number(s.maxFocusSecs) || dur;
      if (focus > map[k].maxFocusSecs) {
        map[k].maxFocusSecs = focus;
      }
    });

    // Merge points from dailyStats or transactions
    dailyStats.forEach((st) => {
      const k = st.date;
      if (!k) return;
      if (!map[k]) {
        map[k] = {
          dateKey: k,
          totalSecs: Number(st.totalStudySeconds) || 0,
          sessions: [],
          pointsEarned: 0,
          longestSessionSecs: 0,
          maxFocusSecs: 0
        };
      }
      if (st.dailyStudyPoints) {
        map[k].pointsEarned = Math.max(map[k].pointsEarned, Number(st.dailyStudyPoints));
      }
    });

    transactions.forEach((tx) => {
      const k = tx.date || (tx.createdAt ? getDateKey(tx.createdAt.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt)) : null);
      if (!k || !map[k]) return;
      if (Number(tx.amount) > 0) {
        map[k].pointsEarned += Number(tx.amount);
      }
    });

    return map;
  }, [sessions, dailyStats, transactions]);

  // Calendar Days Calculation for Current Month
  const { calendarCells, monthTitle, monthlyTotalSecs, monthlyActiveDays } = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const title = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let totalMonthSecs = 0;
    let activeDaysCount = 0;

    const cells = [];

    // Leading padding for prior month days
    for (let i = 0; i < firstDay; i++) {
      cells.push({ isPadding: true, dayNum: null, dateKey: null });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarData[k] || { totalSecs: 0, sessions: [], pointsEarned: 0 };
      if (dayData.totalSecs > 0) {
        totalMonthSecs += dayData.totalSecs;
        activeDaysCount++;
      }
      cells.push({
        isPadding: false,
        dayNum: day,
        dateKey: k,
        totalSecs: dayData.totalSecs,
        hasActivity: dayData.totalSecs > 0,
        dayData
      });
    }

    return {
      calendarCells: cells,
      monthTitle: title,
      monthlyTotalSecs: totalMonthSecs,
      monthlyActiveDays: activeDaysCount
    };
  }, [currentMonthDate, calendarData]);

  // Selected Date Details
  const selectedDateData = useMemo(() => {
    const data = calendarData[selectedDateKey] || {
      dateKey: selectedDateKey,
      totalSecs: 0,
      sessions: [],
      pointsEarned: 0,
      longestSessionSecs: 0,
      maxFocusSecs: 0
    };

    // Calculate subject-wise breakdown for selected date
    const subjectMap = {};
    data.sessions.forEach(s => {
      const sub = s.subject || 'General Study';
      subjectMap[sub] = (subjectMap[sub] || 0) + (Number(s.duration) || 0);
    });

    const subjects = Object.entries(subjectMap).map(([subject, secs]) => ({
      subject,
      secs,
      pct: data.totalSecs > 0 ? Math.round((secs / data.totalSecs) * 100) : 0
    })).sort((a, b) => b.secs - a.secs);

    return {
      ...data,
      subjects
    };
  }, [calendarData, selectedDateKey]);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleToday = () => {
    const today = new Date();
    setCurrentMonthDate(today);
    setSelectedDateKey(getDateKey(today));
  };

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateKey) return '';
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    if (!y || !m || !d) return selectedDateKey;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, [selectedDateKey]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-2xl bg-navy-950 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] text-white relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe Handle */}
        <div className="sm:hidden w-full pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Modal Top Bar */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-navy-900/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gold-500 to-royal-600 p-0.5 shrink-0">
              <div className="w-full h-full bg-navy-950 rounded-full flex items-center justify-center text-sm font-black text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-black text-white truncate max-w-[160px] sm:max-w-[220px]">
                  {displayName}
                </h2>
                <span className="text-base">{studentLevel.badge}</span>
                {student?.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {student.badge}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Level {studentLevel.currentLevelNumber} • {studentLevel.currentLevelName}
              </div>
            </div>
          </div>

          {/* Action Buttons: Statistics Toggle & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setViewMode(prev => prev === 'profile' ? 'statistics' : 'profile')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                viewMode === 'statistics'
                  ? 'bg-gold-500 text-navy-950 border-gold-400 shadow-glow-gold'
                  : 'bg-navy-800 text-slate-200 border-white/10 hover:bg-navy-700 hover:text-white'
              }`}
            >
              {viewMode === 'statistics' ? (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-3.5 h-3.5 text-gold-400" />
                  <span>📊 Statistics</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/10">

          {/* ================= VIEW 1: STUDENT PROFILE ================= */}
          {viewMode === 'profile' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Header Profile Identity Card */}
              <div className="p-5 rounded-3xl glass-card border border-white/10 bg-gradient-to-br from-navy-900/90 via-navy-950 to-royal-950/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-white">{displayName}</span>
                      <span className="text-xl">{studentLevel.badge}</span>
                      {liveBadge && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${liveBadge.bg} ${liveBadge.color} ${liveBadge.border}`}>
                          {liveBadge.text}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs font-semibold text-gold-400 flex items-center gap-2">
                      <span>Level {studentLevel.currentLevelNumber}</span>
                      <span>•</span>
                      <span>{studentLevel.badge} {studentLevel.currentLevelName}</span>
                    </div>

                    <div className="text-xs font-medium text-slate-300 pt-0.5">
                      <span className="text-royal-300 font-bold">{course} {level}</span>
                      {attempt && <span> · {attempt}</span>}
                    </div>
                  </div>

                  {/* Points Badge */}
                  <div className="px-4 py-2.5 rounded-2xl bg-navy-900/90 border border-gold-500/30 text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Points</div>
                    <div className="text-lg font-black font-mono text-gold-400">
                      {points.toLocaleString()} <span className="text-xs text-slate-400 font-normal">PTS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Study Status Section */}
              <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    {isCurrentlyStudying ? (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-slate-600"></span>
                    )}
                    <span className="text-sm font-black text-white tracking-wide">
                      {isCurrentlyStudying ? (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          🟢 Currently Studying
                        </span>
                      ) : (
                        <span className="text-slate-400">Currently Offline</span>
                      )}
                    </span>
                  </div>

                  {activeSession?.subject && (
                    <span className="px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                      {activeSession.subject}
                    </span>
                  )}
                </div>

                {isCurrentlyStudying ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Start Time */}
                    <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-royal-400" />
                        <span>Started</span>
                      </div>
                      <div className="text-base font-black text-white font-mono">
                        {formatClockTime(activeSession.startedAt)}
                      </div>
                    </div>

                    {/* Current Session Duration (Live Ticking) */}
                    <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-emerald-500/30 space-y-1">
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Current Session</span>
                      </div>
                      <div className="text-base font-black text-emerald-300 font-mono">
                        {formatStudyDuration(liveDurationSecs)}
                      </div>
                    </div>

                    {/* Maximum Focus */}
                    <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-gold-400" />
                        <span>Maximum Focus</span>
                      </div>
                      <div className="text-base font-black text-gold-400 font-mono">
                        {formatFocusDuration(currentMaxFocusSecs)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 text-center text-xs text-slate-400">
                    This student is not in an active timer session right now.
                  </div>
                )}
              </div>

              {/* Quick Overall Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Total Study</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">
                    {formatStudyDuration(sessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-royal-400" />
                    <span>Total Sessions</span>
                  </div>
                  <div className="text-base font-black text-white font-mono">
                    {sessions.length}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-gold-400" />
                    <span>Current Rank Stream</span>
                  </div>
                  <div className="text-xs font-bold text-gold-400 truncate">
                    {course} {level}
                  </div>
                </div>
              </div>

              {/* Call-to-action to Open Study Statistics */}
              <button
                onClick={() => setViewMode('statistics')}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-royal-600 via-royal-700 to-indigo-700 hover:from-royal-500 hover:to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-royal-900/40 transition-all border border-royal-400/30 group"
              >
                <BarChart3 className="w-4 h-4 text-gold-400 group-hover:scale-110 transition-transform" />
                <span>View Full Study Statistics Calendar</span>
              </button>
            </div>
          )}

          {/* ================= VIEW 2: STUDY STATISTICS CALENDAR ================= */}
          {viewMode === 'statistics' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Calendar Month Navigation Header */}
              <div className="p-4 rounded-3xl glass-card border border-white/10 bg-navy-900/60 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gold-400" />
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {monthTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToday}
                      className="px-2.5 py-1 rounded-lg bg-navy-800 border border-white/10 text-[11px] font-bold text-slate-300 hover:text-white transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg bg-navy-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg bg-navy-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Monthly Summary Badges */}
                <div className="flex items-center gap-3 text-xs pt-1 border-t border-white/5 flex-wrap">
                  <span className="text-slate-400">
                    Monthly Recorded: <strong className="text-emerald-400 font-mono">{formatStudyDuration(monthlyTotalSecs)}</strong>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    Active Days: <strong className="text-white font-mono">{monthlyActiveDays}</strong>
                  </span>
                </div>
              </div>

              {/* Visual Intensity Legend */}
              <div className="flex items-center justify-between gap-2 px-2 text-[11px] text-slate-400 flex-wrap">
                <span className="font-semibold text-slate-300">Activity Level:</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                    <span>High (≥4h)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>Moderate (1–4h)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <span>Light (&lt;1h)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                    <span>No study</span>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="p-3 sm:p-4 rounded-3xl glass-card border border-white/10 bg-navy-950/80">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarCells.map((cell, idx) => {
                    if (cell.isPadding) {
                      return (
                        <div 
                          key={`pad-${idx}`} 
                          className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-transparent opacity-30" 
                        />
                      );
                    }

                    const isSelected = cell.dateKey === selectedDateKey;
                    const hours = cell.totalSecs / 3600;
                    const isHigh = hours >= 4;
                    const isModerate = hours >= 1 && hours < 4;
                    const isLight = hours > 0 && hours < 1;
                    const isZero = cell.totalSecs === 0;

                    let intensityClasses = 'bg-navy-900/40 border-white/5 text-slate-400 hover:bg-white/5';
                    let timeColor = 'text-slate-500';

                    if (isHigh) {
                      intensityClasses = 'bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25';
                      timeColor = 'text-emerald-400 font-bold';
                    } else if (isModerate) {
                      intensityClasses = 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25';
                      timeColor = 'text-amber-300 font-semibold';
                    } else if (isLight) {
                      intensityClasses = 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20';
                      timeColor = 'text-cyan-300 font-medium';
                    }

                    if (isSelected) {
                      intensityClasses += ' ring-2 ring-gold-400 border-gold-400 bg-gold-500/20 shadow-glow-gold';
                    }

                    return (
                      <button
                        key={cell.dateKey}
                        onClick={() => setSelectedDateKey(cell.dateKey)}
                        className={`h-14 sm:h-16 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border transition-all flex flex-col justify-between text-left relative overflow-hidden group ${intensityClasses}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-[11px] sm:text-xs font-black ${isSelected ? 'text-gold-400' : 'text-slate-200'}`}>
                            {cell.dayNum}
                          </span>
                          {isHigh && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,1)]" />
                          )}
                        </div>

                        {/* Actual study time directly displayed under date */}
                        <div className={`text-[10px] sm:text-[11px] font-mono truncate w-full ${timeColor}`}>
                          {cell.totalSecs > 0 ? formatStudyDuration(cell.totalSecs) : '0h'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ================= THAT DAY'S STUDY DETAILS ================= */}
              <div className="p-5 rounded-3xl glass-card border border-white/10 bg-navy-900/70 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gold-400">Date Breakdown</span>
                    <h4 className="text-base font-black text-white">
                      {formattedSelectedDate}
                    </h4>
                  </div>

                  <div className="px-3.5 py-1.5 rounded-xl bg-navy-950 border border-white/10 text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Time</div>
                    <div className="text-sm font-black font-mono text-emerald-400">
                      {formatStudyDuration(selectedDateData.totalSecs)}
                    </div>
                  </div>
                </div>

                {/* Day Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-navy-950/70 border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Sessions</span>
                    <div className="text-sm font-black text-white font-mono">
                      {selectedDateData.sessions.length}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-navy-950/70 border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Longest Session</span>
                    <div className="text-sm font-black text-emerald-300 font-mono">
                      {formatStudyDuration(selectedDateData.longestSessionSecs)}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-navy-950/70 border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Max Focus</span>
                    <div className="text-sm font-black text-gold-400 font-mono">
                      {formatFocusDuration(selectedDateData.maxFocusSecs)}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-navy-950/70 border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Points Earned</span>
                    <div className="text-sm font-black text-gold-400 font-mono">
                      {selectedDateData.pointsEarned > 0 ? `+${selectedDateData.pointsEarned}` : '0'} PTS
                    </div>
                  </div>
                </div>

                {/* Subject-Wise Breakdown for That Day */}
                {selectedDateData.subjects.length > 0 ? (
                  <div className="space-y-2.5 pt-2 border-t border-white/5">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>Subject Breakdown</span>
                    </div>

                    <div className="space-y-2">
                      {selectedDateData.subjects.map(item => (
                        <div key={item.subject} className="p-3 rounded-xl bg-navy-950/50 border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{item.subject}</span>
                            <span className="font-mono font-bold text-emerald-400">{formatStudyDuration(item.secs)}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-navy-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-royal-500 to-emerald-400 rounded-full transition-all duration-300"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-navy-950/40 border border-white/5 text-center text-xs text-slate-400">
                    No study sessions recorded on this day.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
