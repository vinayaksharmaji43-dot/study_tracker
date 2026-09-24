import React, { useState, useEffect } from 'react';
import { 
  collection, query, where, onSnapshot, getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getDateKey, calculateStreak, formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, 
  Clock, Award, Flame, CheckCircle2, XCircle, AlertTriangle, 
  FileText, Flag, ShieldCheck, TrendingUp, BarChart2, Check,
  BookOpen, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Calendar() {
  const { currentUser, userProfile } = useAuth();

  // Selected Month State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  
  // Selected Date State (for Day Details Drawer)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDayDrawer, setShowDayDrawer] = useState(false);

  // Firestore Real-Time Data States
  const [sessions, setSessions] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [writingSubs, setWritingSubs] = useState([]);
  const [missionsProgress, setMissionsProgress] = useState([]);
  const [missionsList, setMissionsList] = useState({});
  const [dayOffsSet, setDayOffsSet] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Expanded sections in Day Details Drawer
  const [expandWriting, setExpandWriting] = useState(false);
  const [expandMissions, setExpandMissions] = useState(false);
  const [expandSessions, setExpandSessions] = useState(false);

  // Load Real-Time Data
  useEffect(() => {
    if (!currentUser?.uid) return;
    const uid = currentUser.uid;

    // 1. Study Sessions
    const qSessions = query(collection(db, 'studySessions'), where('uid', '==', uid));
    const unsubSessions = onSnapshot(qSessions, snap => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('Sessions listener error:', err));

    // 2. Study Daily Stats
    const qStats = query(collection(db, 'studyDailyStats'), where('studentId', '==', uid));
    const unsubStats = onSnapshot(qStats, snap => {
      setDailyStats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('DailyStats listener error:', err));

    // 3. Point Transactions
    const qTx = query(collection(db, 'pointTransactions'), where('studentId', '==', uid));
    const unsubTx = onSnapshot(qTx, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('Transactions listener error:', err));

    // 4. Targets
    const qTargets = query(collection(db, 'targets'), where('uid', '==', uid));
    const unsubTargets = onSnapshot(qTargets, snap => {
      setTargets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('Targets listener error:', err));

    // 5. Writing Practice Submissions
    const qWriting = query(collection(db, 'writingPracticeSubmissions'), where('studentId', '==', uid));
    const unsubWriting = onSnapshot(qWriting, snap => {
      setWritingSubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('Writing listener error:', err));

    // 6. Weekly Mission Progress
    const qMissions = query(collection(db, 'weeklyMissionProgress'), where('studentId', '==', uid));
    const unsubMissions = onSnapshot(qMissions, snap => {
      setMissionsProgress(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('Missions listener error:', err));

    // 7. Weekly Missions List (to get titles)
    const qMissionsList = collection(db, 'weeklyMissions');
    const unsubMissionsList = onSnapshot(qMissionsList, snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setMissionsList(map);
    });

    // 8. Day Offs
    const dayOffRef = collection(db, 'dayOffs', uid, 'records');
    const unsubDayOffs = onSnapshot(dayOffRef, snap => {
      const set = new Set(snap.docs.map(d => d.data().dateKey));
      setDayOffsSet(set);
      setLoading(false);
    }, err => {
      console.error('DayOffs listener error:', err);
      setLoading(false);
    });

    return () => {
      unsubSessions();
      unsubStats();
      unsubTx();
      unsubTargets();
      unsubWriting();
      unsubMissions();
      unsubMissionsList();
      unsubDayOffs();
    };
  }, [currentUser]);

  // Calendar Navigation Handlers
  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleToday = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    setSelectedDate(now);
    setShowDayDrawer(true);
  };

  // Date Selection
  const handleDateClick = (dateObj) => {
    setSelectedDate(dateObj);
    setShowDayDrawer(true);
  };

  // Helper: Format seconds into Xh Ym
  const formatSecsToHms = (totalSecs) => {
    if (!totalSecs || totalSecs <= 0) return '0h 0m';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h 0m`;
    return `${mins}m`;
  };

  // Helper: Parse date from Firestore item
  const parseItemDateKey = (item, dateField = 'date') => {
    if (!item) return null;
    if (item.dateKey) return item.dateKey;
    if (item.targetDate) return item.targetDate;
    const raw = item[dateField] || item.createdAt || item.completedAt;
    if (!raw) return null;
    const d = raw.toDate ? raw.toDate() : new Date(raw);
    return getDateKey(d);
  };

  // Aggregated Data per DateKey
  const getDailyDataForDateKey = (dateKey) => {
    // 1. Timer sessions for this date
    const daySessions = sessions.filter(s => {
      const k = parseItemDateKey(s, 'date') || parseItemDateKey(s, 'createdAt');
      return k === dateKey;
    });
    const totalStudySeconds = daySessions.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

    // 2. Point transactions for this date
    const dayTx = transactions.filter(t => {
      const k = t.date || parseItemDateKey(t, 'createdAt');
      return k === dateKey;
    });

    const positiveTx = dayTx.filter(t => Number(t.amount) > 0);
    const negativeTx = dayTx.filter(t => Number(t.amount) < 0);

    const positivePoints = positiveTx.reduce((sum, t) => sum + Number(t.amount), 0);
    const negativePoints = negativeTx.reduce((sum, t) => sum + Number(t.amount), 0); // negative number
    const netPoints = positivePoints + negativePoints;

    const negativeReasons = negativeTx.map(t => ({
      amount: t.amount,
      reason: t.reason || 'Penalty Applied'
    }));

    // Categorized positive breakdown
    const positiveBreakdown = {
      studyMilestones: positiveTx.filter(t => t.type === 'reward' || (t.reason && t.reason.toLowerCase().includes('study'))).reduce((s, t) => s + Number(t.amount), 0),
      target: positiveTx.filter(t => t.reason && t.reason.toLowerCase().includes('target')).reduce((s, t) => s + Number(t.amount), 0),
      writing: positiveTx.filter(t => t.reason && t.reason.toLowerCase().includes('writing')).reduce((s, t) => s + Number(t.amount), 0),
      mission: positiveTx.filter(t => t.reason && t.reason.toLowerCase().includes('mission')).reduce((s, t) => s + Number(t.amount), 0),
      other: 0
    };
    const knownSum = positiveBreakdown.studyMilestones + positiveBreakdown.target + positiveBreakdown.writing + positiveBreakdown.mission;
    positiveBreakdown.other = Math.max(0, positivePoints - knownSum);

    // 3. Targets for this date
    const dayTarget = targets.find(t => {
      const k = t.targetDate || parseItemDateKey(t, 'date') || parseItemDateKey(t, 'createdAt');
      return k === dateKey;
    });

    // 4. Writing Practice completed on this date
    const dayWriting = writingSubs.filter(w => {
      if (w.status !== 'completed') return false;
      const k = parseItemDateKey(w, 'completedAt') || parseItemDateKey(w, 'createdAt');
      return k === dateKey;
    });

    // 5. Weekly Missions completed on this date
    const dayMissions = missionsProgress.filter(m => {
      if (!m.completed) return false;
      const k = parseItemDateKey(m, 'completedAt');
      return k === dateKey;
    });

    // 6. Day Off status
    const isDayOff = dayOffsSet.has(dateKey);

    // 7. Streak as of this date (calculated using sessions up to dateKey)
    const filteredSessionsUpToDate = sessions.filter(s => {
      const k = parseItemDateKey(s, 'date') || parseItemDateKey(s, 'createdAt');
      return k && k <= dateKey;
    });
    const streakForDate = calculateStreak(filteredSessionsUpToDate, Array.from(dayOffsSet));

    return {
      dateKey,
      daySessions,
      totalStudySeconds,
      positivePoints,
      negativePoints,
      netPoints,
      negativeReasons,
      positiveBreakdown,
      dayTarget,
      dayWriting,
      dayMissions,
      isDayOff,
      streakForDate
    };
  };

  // Determine Visual Indicator Color for Date
  const getDateIndicator = (dateKey, data) => {
    const todayKey = getDateKey(new Date());
    const isFuture = dateKey > todayKey;
    if (isFuture) return 'neutral';

    const { totalStudySeconds, negativePoints, netPoints, isDayOff } = data;

    if (isDayOff) return 'dayoff';
    if (totalStudySeconds >= 14400) return 'green'; // 4+ hours
    if (totalStudySeconds >= 3600 && negativePoints === 0) return 'yellow'; // 1-4 hours
    if (totalStudySeconds > 0 && (totalStudySeconds < 3600 || negativePoints < 0)) return 'red';
    if (dateKey < todayKey && totalStudySeconds < 14400) return 'red'; // missed 4 hours in past
    return 'neutral';
  };

  // Calendar Grid Month Dates Calculation
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week offset (Mon=0, Tue=1, ..., Sun=6)
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6; // Sunday -> 6

  const daysInMonth = lastDayOfMonth.getDate();

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const paddingDaysBefore = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    paddingDaysBefore.push(d);
  }

  // Current month days
  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    currentMonthDays.push(d);
  }

  // Next month padding days to complete 35 or 42 grid cells
  const totalCellsSoFar = paddingDaysBefore.length + currentMonthDays.length;
  const targetTotalCells = totalCellsSoFar > 35 ? 42 : 35;
  const paddingDaysAfter = [];
  for (let i = 1; i <= targetTotalCells - totalCellsSoFar; i++) {
    const d = new Date(year, month + 1, i);
    paddingDaysAfter.push(d);
  }

  // Data for currently selected date in Drawer
  const selectedDateKey = getDateKey(selectedDate);
  const selectedDayData = getDailyDataForDateKey(selectedDateKey);

  // --- SUNDAY WEEKLY PERFORMANCE REVIEW CALCULATIONS ---
  // Calculates Sunday-ending week range (Mon to Sun) for selected month/today
  const getWeeklyReviewData = () => {
    const endOfWeek = new Date(selectedDate);
    // Find nearest Sunday or previous Sunday
    const dayOfWeek = endOfWeek.getDay(); // 0=Sun, 1=Mon, ...
    const diffToSunday = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + diffToSunday); // moves to Sunday

    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(startOfWeek.getDate() - 6); // moves to Monday

    const startKey = getDateKey(startOfWeek);
    const endKey = getDateKey(endOfWeek);

    // 7 days dates array
    const weekDays = [];
    let longestStudySecs = 0;
    let lowestStudySecs = Infinity;
    let totalWeekStudySecs = 0;
    let totalPosPts = 0;
    let totalNegPts = 0;
    let targetsCompletedCount = 0;
    let targetsTotalCount = 0;
    let writingCompletedCount = 0;
    let missionsCompletedCount = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const k = getDateKey(d);
      const data = getDailyDataForDateKey(k);

      const secs = data.totalStudySeconds || 0;
      totalWeekStudySecs += secs;
      if (secs > longestStudySecs) longestStudySecs = secs;
      if (secs < lowestStudySecs && secs > 0) lowestStudySecs = secs;

      totalPosPts += data.positivePoints;
      totalNegPts += data.negativePoints;

      if (data.dayTarget) {
        targetsTotalCount++;
        if (data.dayTarget.status === 'completed') targetsCompletedCount++;
      }

      writingCompletedCount += data.dayWriting.length;
      missionsCompletedCount += data.dayMissions.length;

      weekDays.push({
        date: d,
        dateKey: k,
        dayName: DAYS_OF_WEEK[i],
        studySecs: secs,
        netPts: data.netPoints,
        data
      });
    }

    if (lowestStudySecs === Infinity) lowestStudySecs = 0;
    const avgDailySecs = Math.round(totalWeekStudySecs / 7);
    const netWeekPts = totalPosPts + totalNegPts;

    // Peak study seconds for chart scaling
    const peakSecs = Math.max(...weekDays.map(w => w.studySecs), 1);

    // Dynamic Motivational Quote
    const totalHrs = totalWeekStudySecs / 3600;
    let motivationMsg = "💪 Focus on building daily consistency, one session at a time!";
    if (totalHrs >= 35) {
      motivationMsg = "🔥 Outstanding week! Your consistency and dedication are top-tier.";
    } else if (totalHrs >= 25) {
      motivationMsg = "📈 Great momentum! You are maintaining a solid study habit.";
    } else if (totalHrs >= 15) {
      motivationMsg = "💪 Good effort this week! Aim to reach 5+ hours daily.";
    }

    return {
      startKey,
      endKey,
      startFormatted: `${startOfWeek.getDate()} ${MONTH_NAMES[startOfWeek.getMonth()].slice(0, 3)}`,
      endFormatted: `${endOfWeek.getDate()} ${MONTH_NAMES[endOfWeek.getMonth()].slice(0, 3)} ${endOfWeek.getFullYear()}`,
      weekDays,
      totalWeekStudySecs,
      avgDailySecs,
      longestStudySecs,
      lowestStudySecs,
      totalPosPts,
      totalNegPts,
      netWeekPts,
      targetsCompletedCount,
      targetsTotalCount,
      writingCompletedCount,
      missionsCompletedCount,
      peakSecs,
      motivationMsg
    };
  };

  const weeklyReview = getWeeklyReviewData();

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold animate-pulse flex flex-col items-center justify-center gap-3">
        <Clock className="w-8 h-8 text-emerald-400 animate-spin" />
        <span>Loading Academic Calendar Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Academic Performance Calendar</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Study <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Calendar & Insights</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Track daily study duration, points earned, negative penalties, target completion, and weekly analytics in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToday}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-xs shadow-glow-emerald flex items-center gap-2 transition-all hover:scale-105"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Go to Today</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Navigation & Legend Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/10">
        
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-black text-white min-w-[170px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
            <span>Productive (5h+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
            <span>Moderate (1-5h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
            <span>Low / Penalty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
            <span>No Activity</span>
          </div>
        </div>

      </div>

      {/* Main Calendar Grid */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
        
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-white/10">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Cells Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          
          {/* Padding Days Before */}
          {paddingDaysBefore.map((dateObj, idx) => {
            const dateKey = getDateKey(dateObj);
            return (
              <div
                key={`prev-${idx}`}
                onClick={() => handleDateClick(dateObj)}
                className="p-2 sm:p-3 rounded-2xl bg-navy-950/40 border border-white/5 text-slate-600 opacity-40 cursor-pointer hover:opacity-70 transition-opacity min-h-[75px] sm:min-h-[90px] flex flex-col justify-between"
              >
                <div className="text-xs font-bold">{dateObj.getDate()}</div>
              </div>
            );
          })}

          {/* Current Month Days */}
          {currentMonthDays.map((dateObj) => {
            const dateKey = getDateKey(dateObj);
            const data = getDailyDataForDateKey(dateKey);
            const indicator = getDateIndicator(dateKey, data);
            const isToday = dateKey === getDateKey(new Date());
            const isSelected = dateKey === selectedDateKey;

            return (
              <div
                key={dateKey}
                onClick={() => handleDateClick(dateObj)}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer min-h-[85px] sm:min-h-[100px] flex flex-col justify-between relative group ${
                  isSelected
                    ? 'ring-2 ring-emerald-400 bg-emerald-500/15 border-emerald-500/40 shadow-glow-emerald'
                    : isToday
                    ? 'bg-navy-900 border-amber-500/50 shadow-md'
                    : 'bg-navy-900/80 hover:bg-white/5 border-white/10'
                }`}
              >
                {/* Top Row: Day Number & Status Dot */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs sm:text-sm font-black ${isToday ? 'text-amber-400 underline underline-offset-4' : 'text-white'}`}>
                    {dateObj.getDate()}
                  </span>
                  
                  {/* Status Indicator Dot */}
                  <div className="flex items-center gap-1">
                    {indicator === 'green' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Productive Study (5h+)" />
                    )}
                    {indicator === 'yellow' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" title="Moderate Study (1-5h)" />
                    )}
                    {indicator === 'red' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" title="Low Study / Penalty" />
                    )}
                    {indicator === 'dayoff' && (
                      <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">OFF</span>
                    )}
                  </div>
                </div>

                {/* Middle Content: Study Hours Badge */}
                <div className="my-1">
                  {data.totalStudySeconds > 0 ? (
                    <div className="text-[11px] sm:text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{formatSecsToHms(data.totalStudySeconds)}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-medium">No study</div>
                  )}
                </div>

                {/* Bottom Row: Net Points or Target Indicator */}
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                  {data.netPoints !== 0 ? (
                    <span className={`font-black ${data.netPoints > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {data.netPoints > 0 ? `+${data.netPoints}` : data.netPoints} pts
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono">0 pts</span>
                  )}

                  {data.dayTarget && (
                    <span className={data.dayTarget.status === 'completed' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {data.dayTarget.status === 'completed' ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Padding Days After */}
          {paddingDaysAfter.map((dateObj, idx) => {
            return (
              <div
                key={`next-${idx}`}
                onClick={() => handleDateClick(dateObj)}
                className="p-2 sm:p-3 rounded-2xl bg-navy-950/40 border border-white/5 text-slate-600 opacity-40 cursor-pointer hover:opacity-70 transition-opacity min-h-[75px] sm:min-h-[90px] flex flex-col justify-between"
              >
                <div className="text-xs font-bold">{dateObj.getDate()}</div>
              </div>
            );
          })}

        </div>

      </div>

      {/* --- SUNDAY WEEKLY STUDY REVIEW SECTION --- */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-sky-500/30 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 mb-2">
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Weekly Review</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              📊 How Your Week Went
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Performance breakdown for week of <strong className="text-sky-300">{weeklyReview.startFormatted} – {weeklyReview.endFormatted}</strong>
            </p>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-navy-900 border border-white/10 text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Weekly Total Study</div>
            <div className="text-lg font-black text-emerald-400">{formatSecsToHms(weeklyReview.totalWeekStudySecs)}</div>
          </div>
        </div>

        {/* 7-Day Interactive Bar Chart */}
        <div className="space-y-3 relative z-10">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">7-Day Study Time Chart</h3>
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 p-4 rounded-2xl bg-navy-950/70 border border-white/10">
            {weeklyReview.weekDays.map(day => {
              const heightPct = weeklyReview.peakSecs > 0 ? Math.max(8, Math.round((day.studySecs / weeklyReview.peakSecs) * 100)) : 8;
              const isSelectedDay = day.dateKey === selectedDateKey;

              return (
                <div key={day.dateKey} className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer" onClick={() => handleDateClick(day.date)}>
                  <span className="text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatSecsToHms(day.studySecs)}
                  </span>
                  
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[36px] rounded-t-xl transition-all duration-300 ${
                      isSelectedDay
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-glow-emerald'
                        : day.studySecs >= 14400
                        ? 'bg-gradient-to-t from-emerald-600/80 to-emerald-400/80 hover:from-emerald-500 hover:to-emerald-300'
                        : day.studySecs > 0
                        ? 'bg-gradient-to-t from-amber-600/80 to-amber-400/80 hover:from-amber-500 hover:to-amber-300'
                        : 'bg-slate-800'
                    }`}
                  />
                  
                  {/* Day Label */}
                  <div className="text-[11px] font-bold text-slate-300 text-center">
                    <div>{day.dayName}</div>
                    <div className="text-[9px] text-slate-500">{day.date.getDate()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Metrics Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          <div className="p-4 rounded-2xl bg-navy-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Daily Study</div>
            <div className="text-lg font-black text-white">{formatSecsToHms(weeklyReview.avgDailySecs)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Best Study Day</div>
            <div className="text-lg font-black text-emerald-400">{formatSecsToHms(weeklyReview.longestStudySecs)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Net Week Points</div>
            <div className={`text-lg font-black ${weeklyReview.netWeekPts >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {weeklyReview.netWeekPts > 0 ? `+${weeklyReview.netWeekPts}` : weeklyReview.netWeekPts}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Target Completion</div>
            <div className="text-lg font-black text-sky-400">{weeklyReview.targetsCompletedCount} / {weeklyReview.targetsTotalCount || 7}</div>
          </div>
        </div>

        {/* Weekly Motivation Message Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 to-emerald-500/10 border border-sky-500/30 text-sm font-bold text-sky-200 flex items-center gap-3 relative z-10">
          <TrendingUp className="w-5 h-5 text-sky-400 shrink-0" />
          <span>{weeklyReview.motivationMsg}</span>
        </div>

      </div>

      {/* --- DAY DETAILS DRAWER / MODAL --- */}
      {showDayDrawer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{DAYS_OF_WEEK[(selectedDate.getDay() + 6) % 7]}</span>
                    {selectedDayData.isDayOff && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
                        🛡️ Day Off Exempt
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDayDrawer(false)}
                className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-navy-900 border border-white/5 space-y-0.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" /> Study Time
                </div>
                <div className="text-base font-black text-white">
                  {formatSecsToHms(selectedDayData.totalStudySeconds)}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-navy-900 border border-white/5 space-y-0.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" /> Positive Pts
                </div>
                <div className="text-base font-black text-emerald-400">
                  +{selectedDayData.positivePoints}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-navy-900 border border-white/5 space-y-0.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" /> Negative Pts
                </div>
                <div className="text-base font-black text-rose-400">
                  {selectedDayData.negativePoints}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-navy-900 border border-white/5 space-y-0.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Streak
                </div>
                <div className="text-base font-black text-amber-400">
                  {selectedDayData.streakForDate} Days
                </div>
              </div>
            </div>

            {/* Section 1: Points Breakdown */}
            <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white border-b border-white/5 pb-2">
                <span>Point Transactions Breakdown</span>
                <span className={`text-sm font-black ${selectedDayData.netPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Net Total: {selectedDayData.netPoints > 0 ? `+${selectedDayData.netPoints}` : selectedDayData.netPoints} Pts
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 rounded-xl bg-navy-950 text-slate-300">
                  <span>Study Milestones:</span>
                  <strong className="text-emerald-400">+{selectedDayData.positiveBreakdown.studyMilestones}</strong>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-navy-950 text-slate-300">
                  <span>Target Rewards:</span>
                  <strong className="text-emerald-400">+{selectedDayData.positiveBreakdown.target}</strong>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-navy-950 text-slate-300">
                  <span>Writing Practice:</span>
                  <strong className="text-emerald-400">+{selectedDayData.positiveBreakdown.writing}</strong>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-navy-950 text-slate-300">
                  <span>Weekly Missions:</span>
                  <strong className="text-emerald-400">+{selectedDayData.positiveBreakdown.mission}</strong>
                </div>
              </div>

              {/* Negative Points & Reasons */}
              {selectedDayData.negativeReasons.length > 0 ? (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Negative Penalties Applied:
                  </div>
                  {selectedDayData.negativeReasons.map((neg, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      <span>{neg.reason}</span>
                      <strong className="font-black">{neg.amount} Pts</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 text-center pt-1">
                  No negative penalties recorded for this date.
                </div>
              )}
            </div>

            {/* Section 2: Daily Target Status */}
            <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Target Details</div>
              {selectedDayData.dayTarget ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950 border border-white/5 gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">{selectedDayData.dayTarget.title}</div>
                    <div className="text-xs text-slate-400">{selectedDayData.dayTarget.subject}</div>
                  </div>
                  {selectedDayData.dayTarget.status === 'completed' ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed (+3 Pts)
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/20 px-3 py-1 rounded-lg border border-rose-500/30 shrink-0">
                      <XCircle className="w-3.5 h-3.5" /> Missed (-3 Pts)
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 p-3 rounded-xl bg-navy-950 border border-white/5">
                  ⚠️ No target was created for this date.
                </div>
              )}
            </div>

            {/* Section 3: Timer Sessions List */}
            {selectedDayData.daySessions.length > 0 && (
              <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 space-y-2">
                <div
                  onClick={() => setExpandSessions(!expandSessions)}
                  className="flex items-center justify-between text-xs font-bold text-white cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" /> Timer Sessions ({selectedDayData.daySessions.length})
                  </span>
                  {expandSessions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {expandSessions && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {selectedDayData.daySessions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-navy-950 text-slate-300">
                        <span>Session {i + 1}: <strong className="text-white">{s.subject}</strong></span>
                        <strong className="text-emerald-400">{formatSecsToHms(s.duration)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Writing Practice Completed */}
            <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 space-y-2">
              <div
                onClick={() => setExpandWriting(!expandWriting)}
                className="flex items-center justify-between text-xs font-bold text-white cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-400" /> Writing Practice ({selectedDayData.dayWriting.length} Completed)
                </span>
                {selectedDayData.dayWriting.length > 0 && (expandWriting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
              </div>

              {selectedDayData.dayWriting.length === 0 ? (
                <div className="text-xs text-slate-400 p-2.5 rounded-xl bg-navy-950 border border-white/5">
                  No Writing Practice completed on this date.
                </div>
              ) : expandWriting && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  {selectedDayData.dayWriting.map(w => (
                    <div key={w.id} className="p-3 rounded-xl bg-navy-950 border border-white/5 space-y-1">
                      <div className="text-xs font-bold text-white">{w.title}</div>
                      <div className="text-[11px] text-slate-400">{w.subject}{w.chapter ? ` • ${w.chapter}` : ''}</div>
                      {w.selfAwardedPoints > 0 && (
                        <div className="text-[10px] text-emerald-400 font-bold">Points Awarded: +{w.selfAwardedPoints}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 5: Weekly Missions Completed */}
            <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 space-y-2">
              <div
                onClick={() => setExpandMissions(!expandMissions)}
                className="flex items-center justify-between text-xs font-bold text-white cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-rose-400" /> Weekly Missions ({selectedDayData.dayMissions.length} Completed)
                </span>
                {selectedDayData.dayMissions.length > 0 && (expandMissions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
              </div>

              {selectedDayData.dayMissions.length === 0 ? (
                <div className="text-xs text-slate-400 p-2.5 rounded-xl bg-navy-950 border border-white/5">
                  No Weekly Missions completed on this date.
                </div>
              ) : expandMissions && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  {selectedDayData.dayMissions.map(m => {
                    const info = missionsList[m.missionId] || {};
                    return (
                      <div key={m.id} className="p-3 rounded-xl bg-navy-950 border border-white/5 space-y-1">
                        <div className="text-xs font-bold text-white">{info.title || 'Weekly Mission'}</div>
                        <div className="text-[11px] text-slate-400">{info.subject || 'Academic Mission'}</div>
                        {info.points > 0 && (
                          <div className="text-[10px] text-emerald-400 font-bold">Reward: +{info.points} Points</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
