import React, { useState, useEffect, useMemo } from 'react';
import { collection, collectionGroup, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateStreak } from '../utils/helpers';
import { calculateStudentLevel, getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../utils/levelSystem';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StudentProfileModal from '../components/StudentProfileModal';
import { useActiveSessionsTracker } from '../hooks/useActiveSessionsTracker';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Flame, 
  Clock, 
  Star, 
  Search, 
  Sparkles, 
  Users, 
  Filter, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

// Format seconds into "Xh Ym" format
function formatStudyTimeHms(totalSecs) {
  if (!totalSecs || totalSecs <= 0) return '0h 0m';
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

export default function OverallLeaderboard() {
  const { currentUser } = useAuth();
  const { isEyeCare } = useTheme();
  const { isStudentOnline, getStudentLiveDuration } = useActiveSessionsTracker(currentUser);

  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dayOffs, setDayOffs] = useState([]);
  const [levelConfigs, setLevelConfigs] = useState({});
  const [loading, setLoading] = useState(true);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('all'); // 'all' | 'CA_Foundation' | 'CA_Intermediate' | 'CMA_Foundation' | 'CMA_Intermediate'
  const [selectedStudent, setSelectedStudent] = useState(null);

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

  // 2. Fetch Users
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const docs = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setUsers(docs);
      setLoading(false);
    }, (err) => {
      console.error("OverallLeaderboard users error:", err);
      setLoading(false);
    });

    return () => unsubUsers();
  }, []);

  // 3. Fetch Study Sessions for exact recorded time
  useEffect(() => {
    const unsubSessions = onSnapshot(collection(db, 'studySessions'), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSessions(docs);
    }, (err) => {
      console.warn("OverallLeaderboard studySessions warning:", err);
    });

    return () => unsubSessions();
  }, []);

  // 4. Fetch Day Offs for streak calculation
  useEffect(() => {
    try {
      const unsubDayOffs = onSnapshot(collectionGroup(db, 'records'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDayOffs(docs);
      }, () => {});
      return () => unsubDayOffs();
    } catch {
      // Ignore if collectionGroup records index not available
    }
  }, []);

  // Pre-aggregate sessions and protected days by uid
  const { sessionsByUid, dayOffsByUid } = useMemo(() => {
    const sMap = {};
    sessions.forEach((s) => {
      const uid = s.uid || s.studentId;
      if (!uid) return;
      if (!sMap[uid]) sMap[uid] = [];
      sMap[uid].push(s);
    });

    const dMap = {};
    dayOffs.forEach((d) => {
      if (!d.uid || !d.dateKey) return;
      if (!dMap[d.uid]) dMap[d.uid] = [];
      dMap[d.uid].push(d.dateKey);
    });

    return { sessionsByUid: sMap, dayOffsByUid: dMap };
  }, [sessions, dayOffs]);

  // Ranked List Calculation (Strict Priority: 1. Hours DESC, 2. Points DESC, 3. Streak DESC)
  const rankedStudents = useMemo(() => {
    // 1. Filter out platform admins & invalid accounts (exempt currentUser so they can see/test their own rank & timer)
    const realStudents = users.filter((u) => {
      if (u.uid === currentUser?.uid) return true;
      const isRoleAdmin = u.role === 'admin';
      const isSpecialAdmin = 
        u.email?.toLowerCase() === 'vaultstore27@gmail.com' ||
        u.email?.toLowerCase() === 'thunderworld766@gmail.com';
      return !isRoleAdmin && !isSpecialAdmin;
    });

    // 2. Map and compute actual recorded metrics for every student
    const processed = realStudents.map((student) => {
      const userSessions = sessionsByUid[student.uid] || [];
      const userProtectedDates = dayOffsByUid[student.uid] || [];

      // Priority 1: Actual recorded study time in seconds
      const recordedSecs = userSessions.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
      const fallbackSecs = (Number(student.studyHours) || 0) * 3600;
      const totalStudySeconds = Math.max(recordedSecs, fallbackSecs);

      // Priority 2: Points
      const points = Number(student.points) || 0;

      // Priority 3: Streak
      const streak = Number(student.streak) || calculateStreak(userSessions, userProtectedDates);

      // Course & Level info
      const courseKey = student.course === 'CMA' || student.course?.includes('CMA') ? 'CMA' : 'CA';
      const levelKey = student.level === 'Intermediate' || student.course?.includes('Intermediate') ? 'Intermediate' : 'Foundation';
      const streamId = getStreamId(courseKey, levelKey);

      const levelConfig = levelConfigs[streamId] || getDefaultStreamLevels(streamId);
      const levelInfo = calculateStudentLevel(points, levelConfig);

      return {
        ...student,
        name: student.name || 'Student',
        courseKey,
        levelKey,
        streamId,
        totalStudySeconds,
        points,
        streak,
        levelInfo
      };
    });

    // 3. Strict 3-Tier Sort:
    // Priority 1: Total Study Hours DESC
    // Priority 2: Points DESC
    // Priority 3: Streak DESC
    processed.sort((a, b) => {
      if (b.totalStudySeconds !== a.totalStudySeconds) {
        return b.totalStudySeconds - a.totalStudySeconds;
      }
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.streak !== a.streak) {
        return b.streak - a.streak;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // 4. Assign continuous 1-indexed global rank
    return processed.map((student, index) => ({
      ...student,
      rank: index + 1
    }));
  }, [users, sessionsByUid, dayOffsByUid, levelConfigs, currentUser?.uid]);

  // Logged-in user's entry in the global ranking
  const currentUserEntry = useMemo(() => {
    if (!currentUser?.uid) return null;
    return rankedStudents.find((s) => s.uid === currentUser.uid);
  }, [rankedStudents, currentUser]);

  // Top 3 Students
  const topThree = useMemo(() => {
    return rankedStudents.slice(0, 3);
  }, [rankedStudents]);

  // Filtered List based on Search & Stream Filter (Rank stays the true Global Rank)
  const filteredStudents = useMemo(() => {
    let list = rankedStudents;

    if (streamFilter !== 'all') {
      list = list.filter((s) => s.streamId === streamFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => 
        (s.name || '').toLowerCase().includes(q) ||
        (s.rollNumber || '').toLowerCase().includes(q) ||
        (s.course || '').toLowerCase().includes(q) ||
        (s.level || '').toLowerCase().includes(q) ||
        (s.attempt || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [rankedStudents, streamFilter, searchQuery]);

  if (loading) {
    return <LoadingSpinner text="Calculating overall all-students ranking..." />;
  }

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-royal-950">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-bold border border-gold-500/40">
              <Crown className="w-3.5 h-3.5 text-gold-400" />
              <span>Universal All-Stream Leaderboard</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
              {rankedStudents.length} Students Ranked
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            🏆 <span className="gold-gradient-text">All Students Leaderboard</span>
          </h1>

          <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
            Every registered student across <strong>CA Foundation</strong>, <strong>CA Intermediate</strong>, <strong>CMA Foundation</strong>, and <strong>CMA Intermediate</strong> ranked strictly by:
          </p>

          {/* Priority Rules Badge Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
              <span>1️⃣</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Study Hours ↓</span>
            </span>
            <span className="text-slate-500">→</span>
            <span className="px-2.5 py-1 rounded-lg bg-gold-500/15 border border-gold-500/30 text-gold-300 flex items-center gap-1">
              <span>2️⃣</span>
              <Star className="w-3.5 h-3.5 text-gold-400" />
              <span>Points ↓</span>
            </span>
            <span className="text-slate-500">→</span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1">
              <span>3️⃣</span>
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Streak ↓</span>
            </span>
          </div>
        </div>
      </div>

      {/* Logged-In Student Own Rank Card */}
      {currentUserEntry && (
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 ${
          isEyeCare 
            ? 'glass-card border-royal-500/40 bg-gradient-to-r from-royal-950/70 via-navy-900/80 to-navy-950' 
            : 'bg-white border-2 border-blue-300 shadow-md'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 shadow-md flex items-center justify-center font-black text-2xl shrink-0 ${
              isEyeCare 
                ? 'bg-gradient-to-tr from-gold-500 via-amber-500 to-royal-600 shadow-glow-gold text-navy-950' 
                : 'bg-gradient-to-tr from-amber-500 to-blue-600 text-white'
            }`}>
              #{currentUserEntry.rank}
            </div>
            <div>
              <div className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600 font-black'}`}>
                Your Position Across All Streams
              </div>
              <div className={`text-lg sm:text-xl font-black flex items-center gap-2 flex-wrap mt-0.5 ${
                isEyeCare ? 'text-white' : 'text-slate-950 font-black'
              }`}>
                <span>{currentUserEntry.name}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isEyeCare ? 'bg-royal-500/30 border-royal-400/40 text-royal-300' : 'bg-blue-100 border-blue-300 text-blue-900 font-black'
                }`}>
                  Rank #{currentUserEntry.rank} of {rankedStudents.length}
                </span>
                <span className="text-sm">{currentUserEntry.levelInfo.badge}</span>
                {isStudentOnline(currentUserEntry.uid) && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isEyeCare ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]' : 'bg-emerald-100 border-emerald-300 text-emerald-900 font-extrabold'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online</span>
                    <span className={`font-mono font-black pl-1.5 border-l ${
                      isEyeCare ? 'text-white border-emerald-500/40' : 'text-emerald-950 border-emerald-300'
                    }`}>
                      ⏱ {getStudentLiveDuration(currentUserEntry.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className={`text-xs font-bold mt-1 ${isEyeCare ? 'text-gold-400' : 'text-blue-700'}`}>
                {currentUserEntry.courseKey} {currentUserEntry.levelKey} • {currentUserEntry.attempt || 'Jan 27'}
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-between sm:justify-end text-right ${
            isEyeCare ? 'border-white/10' : 'border-slate-200'
          }`}>
            <div>
              <div className={`text-[11px] uppercase font-bold flex items-center gap-1 ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                <Clock className={`w-3 h-3 ${isEyeCare ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>Total Study</span>
              </div>
              <div className={`text-base sm:text-lg font-black font-mono ${isEyeCare ? 'text-emerald-400' : 'text-emerald-800'}`}>
                {formatStudyTimeHms(currentUserEntry.totalStudySeconds)}
              </div>
            </div>

            <div>
              <div className={`text-[11px] uppercase font-bold flex items-center gap-1 ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                <Star className={`w-3 h-3 ${isEyeCare ? 'text-gold-400' : 'text-amber-500'}`} />
                <span>Points</span>
              </div>
              <div className={`text-base sm:text-lg font-black font-mono ${isEyeCare ? 'text-gold-400' : 'text-blue-700'}`}>
                {currentUserEntry.points.toLocaleString()} PTS
              </div>
            </div>

            <div>
              <div className={`text-[11px] uppercase font-bold flex items-center gap-1 ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                <Flame className={`w-3 h-3 ${isEyeCare ? 'text-rose-400' : 'text-rose-600'}`} />
                <span>Streak</span>
              </div>
              <div className={`text-base sm:text-lg font-black font-mono ${isEyeCare ? 'text-rose-400' : 'text-rose-700'}`}>
                {currentUserEntry.streak} Days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {rankedStudents.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 (Silver) */}
          <div 
            onClick={() => setSelectedStudent(topThree[1])}
            className={`order-2 md:order-1 p-5 rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between ${
              isEyeCare 
                ? 'glass-card border-slate-300/30 bg-gradient-to-b from-slate-900/80 to-navy-950 hover:border-slate-300/60' 
                : 'bg-white border-2 border-slate-300 shadow-md hover:border-blue-400'
            }`}
            title="Click to view student profile & study statistics"
          >
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-2xl border font-black text-lg flex items-center justify-center ${
                isEyeCare ? 'bg-slate-300/20 border-slate-300 text-slate-300' : 'bg-slate-100 border-slate-400 text-slate-800'
              }`}>
                🥈 2
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Silver Podium</span>
            </div>

            <div className="my-4 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={`text-base font-black truncate transition-colors ${
                  isEyeCare ? 'text-white group-hover:text-slate-200' : 'text-slate-950 group-hover:text-blue-700'
                }`}>
                  {topThree[1]?.name}
                </h3>
                <span className="text-base">{topThree[1]?.levelInfo.badge}</span>
                {isStudentOnline(topThree[1]?.uid) && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    isEyeCare ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online</span>
                    <span className={`font-mono font-bold pl-1 border-l ${
                      isEyeCare ? 'text-white border-emerald-500/30' : 'text-emerald-950 border-emerald-300'
                    }`}>
                      ⏱ {getStudentLiveDuration(topThree[1]?.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className={`text-xs truncate font-semibold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                Level {topThree[1]?.levelInfo.currentLevelNumber} • {topThree[1]?.courseKey} {topThree[1]?.levelKey}
              </div>
            </div>

            <div className={`grid grid-cols-3 gap-2 pt-3 border-t text-center ${
              isEyeCare ? 'border-white/5' : 'border-slate-100'
            }`}>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Hours</div>
                <div className={`text-xs font-black font-mono truncate ${isEyeCare ? 'text-emerald-400' : 'text-emerald-800'}`}>
                  {formatStudyTimeHms(topThree[1]?.totalStudySeconds)}
                </div>
              </div>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Points</div>
                <div className={`text-xs font-black font-mono truncate ${isEyeCare ? 'text-gold-400' : 'text-blue-700'}`}>
                  {topThree[1]?.points}
                </div>
              </div>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Streak</div>
                <div className={`text-xs font-black font-mono truncate ${isEyeCare ? 'text-rose-400' : 'text-rose-700'}`}>
                  🔥 {topThree[1]?.streak}d
                </div>
              </div>
            </div>
          </div>

          {/* Rank 1 (Gold - Elevated) */}
          <div 
            onClick={() => setSelectedStudent(topThree[0])}
            className={`order-1 md:order-2 p-6 rounded-3xl border-2 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden md:-translate-y-2 ${
              isEyeCare 
                ? 'glass-card border-gold-500/60 bg-gradient-to-b from-amber-950/40 via-navy-900/90 to-navy-950 shadow-glow-gold hover:border-gold-400' 
                : 'bg-amber-50/70 border-amber-400 shadow-lg hover:border-amber-500'
            }`}
            title="Click to view student profile & study statistics"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-2xl border-2 font-black text-xl flex items-center justify-center ${
                isEyeCare ? 'bg-gold-500/20 border-gold-400 text-gold-400 shadow-glow-gold' : 'bg-amber-100 border-amber-500 text-amber-950 shadow-sm'
              }`}>
                🥇 1
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1 ${
                isEyeCare ? 'bg-gold-500/20 text-gold-300 border-gold-500/30' : 'bg-amber-200/80 text-amber-950 border-amber-400'
              }`}>
                <Crown className="w-3.5 h-3.5" />
                <span>Grand Champion</span>
              </span>
            </div>

            <div className="my-4 space-y-1 relative z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-lg font-black truncate transition-colors ${
                  isEyeCare ? 'text-white group-hover:text-gold-300' : 'text-slate-950 group-hover:text-blue-700'
                }`}>
                  {topThree[0]?.name}
                </h3>
                <span className="text-xl">{topThree[0]?.levelInfo.badge}</span>
                {isStudentOnline(topThree[0]?.uid) && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isEyeCare ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online</span>
                    <span className={`font-mono font-black pl-1.5 border-l ${
                      isEyeCare ? 'text-white border-emerald-500/40' : 'text-emerald-950 border-emerald-300'
                    }`}>
                      ⏱ {getStudentLiveDuration(topThree[0]?.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className={`text-xs font-bold truncate ${isEyeCare ? 'text-gold-400' : 'text-amber-900'}`}>
                Level {topThree[0]?.levelInfo.currentLevelNumber} ({topThree[0]?.levelInfo.currentLevelName}) • {topThree[0]?.courseKey} {topThree[0]?.levelKey}
              </div>
            </div>

            <div className={`grid grid-cols-3 gap-2 pt-3 border-t text-center relative z-10 ${
              isEyeCare ? 'border-gold-500/20' : 'border-amber-200'
            }`}>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-amber-900'}`}>Total Hours</div>
                <div className={`text-sm font-black font-mono truncate ${isEyeCare ? 'text-emerald-400' : 'text-emerald-900'}`}>
                  {formatStudyTimeHms(topThree[0]?.totalStudySeconds)}
                </div>
              </div>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-amber-900'}`}>Points</div>
                <div className={`text-sm font-black font-mono truncate ${isEyeCare ? 'text-gold-400' : 'text-blue-900'}`}>
                  {topThree[0]?.points}
                </div>
              </div>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-amber-900'}`}>Streak</div>
                <div className={`text-sm font-black font-mono truncate ${isEyeCare ? 'text-rose-400' : 'text-rose-700'}`}>
                  🔥 {topThree[0]?.streak}d
                </div>
              </div>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div 
            onClick={() => setSelectedStudent(topThree[2])}
            className={`order-3 p-5 rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between ${
              isEyeCare 
                ? 'glass-card border-amber-600/30 bg-gradient-to-b from-amber-950/20 to-navy-950 hover:border-amber-600/60' 
                : 'bg-white border-2 border-amber-300 shadow-md hover:border-amber-400'
            }`}
            title="Click to view student profile & study statistics"
          >
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-2xl border font-black text-lg flex items-center justify-center ${
                isEyeCare ? 'bg-amber-600/20 border-amber-600 text-amber-500' : 'bg-amber-50 border-amber-400 text-amber-950'
              }`}>
                🥉 3
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Bronze Podium</span>
            </div>

            <div className="my-4 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={`text-base font-black truncate transition-colors ${
                  isEyeCare ? 'text-white group-hover:text-amber-300' : 'text-slate-950 group-hover:text-blue-700'
                }`}>
                  {topThree[2]?.name}
                </h3>
                <span className="text-base">{topThree[2]?.levelInfo.badge}</span>
                {isStudentOnline(topThree[2]?.uid) && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    isEyeCare ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online</span>
                    <span className={`font-mono font-bold pl-1 border-l ${
                      isEyeCare ? 'text-white border-emerald-500/30' : 'text-emerald-950 border-emerald-300'
                    }`}>
                      ⏱ {getStudentLiveDuration(topThree[2]?.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className={`text-xs truncate font-semibold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                Level {topThree[2]?.levelInfo.currentLevelNumber} • {topThree[2]?.courseKey} {topThree[2]?.levelKey}
              </div>
            </div>

            <div className={`grid grid-cols-3 gap-2 pt-3 border-t text-center ${
              isEyeCare ? 'border-white/5' : 'border-slate-100'
            }`}>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Hours</div>
                <div className={`text-xs font-black font-mono truncate ${isEyeCare ? 'text-emerald-400' : 'text-emerald-800'}`}>
                  {formatStudyTimeHms(topThree[2]?.totalStudySeconds)}
                </div>
              </div>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Points</div>
                <div className={`text-xs font-black font-mono truncate ${isEyeCare ? 'text-gold-400' : 'text-blue-700'}`}>
                  {topThree[2]?.points}
                </div>
              </div>
              <div>
                <div className={`text-[10px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Streak</div>
                <div className={`text-xs font-black font-mono truncate ${isEyeCare ? 'text-rose-400' : 'text-rose-700'}`}>
                  🔥 {topThree[2]?.streak}d
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls: Search & Stream Filter */}
      <div className={`p-4 rounded-3xl border space-y-3 ${
        isEyeCare ? 'glass-card border-white/10' : 'bg-white border-2 border-blue-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
              isEyeCare ? 'text-slate-400' : 'text-slate-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name, roll number, stream..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs transition-colors font-bold ${
                isEyeCare 
                  ? 'bg-navy-900 border-white/10 text-white placeholder:text-slate-500 focus:border-gold-500/50' 
                  : 'bg-white border-blue-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-600'
              }`}
            />
          </div>

          {/* Student Count Badge */}
          <div className={`text-xs font-bold px-2 flex items-center gap-1.5 shrink-0 ${
            isEyeCare ? 'text-slate-400' : 'text-slate-700'
          }`}>
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Showing {filteredStudents.length} of {rankedStudents.length} students</span>
          </div>
        </div>

        {/* Stream Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-1 shrink-0 flex items-center gap-1 ${
            isEyeCare ? 'text-slate-400' : 'text-slate-700 font-black'
          }`}>
            <Filter className="w-3 h-3 text-blue-600" />
            <span>Stream:</span>
          </span>
          {[
            { id: 'all', label: 'All Streams' },
            { id: 'CA_Foundation', label: 'CA Foundation' },
            { id: 'CA_Intermediate', label: 'CA Intermediate' },
            { id: 'CMA_Foundation', label: 'CMA Foundation' },
            { id: 'CMA_Intermediate', label: 'CMA Intermediate' }
          ].map((stream) => (
            <button
              key={stream.id}
              onClick={() => setStreamFilter(stream.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                streamFilter === stream.id
                  ? (isEyeCare ? 'bg-gold-500 text-navy-950 shadow-glow-gold' : 'bg-blue-600 text-white font-black shadow-md')
                  : (isEyeCare ? 'bg-navy-900/60 text-slate-400 hover:text-white hover:bg-white/5 border border-white/5' : 'bg-slate-100 text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 font-bold')
              }`}
            >
              {stream.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main All-Students Leaderboard Table */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No students found matching your search"
          description="Try clearing the search query or changing the stream filter."
        />
      ) : (
        <div className={`rounded-3xl border overflow-hidden shadow-xl ${
          isEyeCare ? 'glass-card border-white/10' : 'bg-white border-2 border-blue-200 shadow-md'
        }`}>
          
          {/* Table Header */}
          <div className={`grid grid-cols-12 px-5 sm:px-6 py-4 border-b text-xs font-bold uppercase tracking-wider ${
            isEyeCare ? 'bg-navy-900/90 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-800 font-black'
          }`}>
            <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
            <div className="col-span-6 sm:col-span-4">Student & Stream</div>
            <div className="hidden sm:block col-span-3 text-center">Total Study Hours</div>
            <div className="hidden sm:block col-span-2 text-center">Points</div>
            <div className="col-span-4 sm:col-span-2 text-right">Streak</div>
          </div>

          {/* Table Rows (All Students Rendered) */}
          <div className={isEyeCare ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
            {filteredStudents.map((student) => {
              const isCurrentUser = student.uid === currentUser?.uid;

              return (
                <div
                  key={student.uid}
                  onClick={() => setSelectedStudent(student)}
                  className={`grid grid-cols-12 px-5 sm:px-6 py-4 items-center transition-all cursor-pointer group ${
                    isCurrentUser 
                      ? (isEyeCare ? 'bg-royal-600/20 border-l-4 border-royal-500' : 'bg-blue-50/80 border-l-4 border-blue-600')
                      : (isEyeCare ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                  }`}
                  title="Click to view student profile & study statistics"
                >
                  {/* Rank Column */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center font-black">
                    {student.rank === 1 ? (
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-black ${
                        isEyeCare ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-glow-gold' : 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                      }`}>
                        🥇 1
                      </div>
                    ) : student.rank === 2 ? (
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-black ${
                        isEyeCare ? 'bg-slate-300/20 border-slate-300 text-slate-300' : 'bg-slate-200 border-slate-400 text-slate-800 shadow-sm'
                      }`}>
                        🥈 2
                      </div>
                    ) : student.rank === 3 ? (
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-black ${
                        isEyeCare ? 'bg-amber-600/20 border-amber-600 text-amber-500' : 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                      }`}>
                        🥉 3
                      </div>
                    ) : (
                      <span className={`text-sm font-mono font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-700'}`}>#{student.rank}</span>
                    )}
                  </div>

                  {/* Student Name & Stream */}
                  <div className="col-span-6 sm:col-span-4 flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-amber-500 p-0.5 shrink-0 group-hover:scale-105 transition-transform">
                      <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-sm ${
                        isEyeCare ? 'bg-navy-950 text-white' : 'bg-white text-blue-900 shadow-inner'
                      }`}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-black truncate transition-colors ${
                          isEyeCare ? 'text-white group-hover:text-gold-400' : 'text-slate-950 group-hover:text-blue-700'
                        }`}>
                          {student.name}
                        </span>
                        <span className="text-sm">{student.levelInfo.badge}</span>
                        {isCurrentUser && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isEyeCare ? 'bg-royal-500/30 border border-royal-500/50 text-royal-300' : 'bg-blue-600 text-white'
                          }`}>
                            YOU
                          </span>
                        )}
                        {isStudentOnline(student.uid) && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isEyeCare ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]' : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online</span>
                            <span className={`font-mono font-black pl-1 border-l ${
                              isEyeCare ? 'text-white border-emerald-500/30' : 'text-emerald-950 border-emerald-300'
                            }`}>
                              ⏱ {getStudentLiveDuration(student.uid)}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] truncate font-semibold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span className={isEyeCare ? 'text-gold-400 font-semibold' : 'text-blue-700 font-bold'}>{student.courseKey} {student.levelKey}</span>
                        {student.attempt && <span> · {student.attempt}</span>}
                      </div>
                      <div className={`text-[10px] sm:hidden font-mono font-bold mt-0.5 ${
                        isEyeCare ? 'text-emerald-400' : 'text-emerald-800'
                      }`}>
                        ⏱ {formatStudyTimeHms(student.totalStudySeconds)} • ⭐ {student.points} PTS
                      </div>
                    </div>
                  </div>

                  {/* Total Study Hours (Desktop) */}
                  <div className="hidden sm:block col-span-3 text-center">
                    <div className={`text-sm font-black font-mono ${isEyeCare ? 'text-emerald-400' : 'text-emerald-900'}`}>
                      ⏱ {formatStudyTimeHms(student.totalStudySeconds)}
                    </div>
                    <div className={`text-[10px] font-bold uppercase ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Recorded Study</div>
                  </div>

                  {/* Total Points (Desktop) */}
                  <div className="hidden sm:block col-span-2 text-center">
                    <div className={`text-sm font-black font-mono ${isEyeCare ? 'text-gold-400' : 'text-blue-700'}`}>
                      {student.points.toLocaleString()} <span className={`text-xs font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>PTS</span>
                    </div>
                    <div className={`text-[10px] font-bold uppercase ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Level {student.levelInfo.currentLevelNumber}</div>
                  </div>

                  {/* Current Streak */}
                  <div className="col-span-4 sm:col-span-2 text-right">
                    <div className={`text-xs sm:text-sm font-black font-mono flex items-center justify-end gap-1 ${
                      isEyeCare ? 'text-rose-400' : 'text-rose-700'
                    }`}>
                      <Flame className={`w-3.5 h-3.5 ${isEyeCare ? 'text-rose-400' : 'text-rose-600'}`} />
                      <span>{student.streak} Days</span>
                    </div>
                    <div className={`text-[10px] font-bold hidden sm:block ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Current Streak</div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Profile & Study Statistics Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

    </div>
  );
}
