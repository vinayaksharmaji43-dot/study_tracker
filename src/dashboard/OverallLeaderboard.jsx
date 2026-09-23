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
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-royal-500/40 shadow-xl bg-gradient-to-r from-royal-950/70 via-navy-900/80 to-navy-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-gold-500 via-amber-500 to-royal-600 p-0.5 shadow-glow-gold flex items-center justify-center font-black text-2xl text-navy-950 shrink-0">
              #{currentUserEntry.rank}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Position Across All Streams</div>
              <div className="text-lg sm:text-xl font-black text-white flex items-center gap-2 flex-wrap mt-0.5">
                <span>{currentUserEntry.name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-royal-500/30 border border-royal-400/40 text-royal-300 text-xs font-bold">
                  Rank #{currentUserEntry.rank} of {rankedStudents.length}
                </span>
                <span className="text-sm">{currentUserEntry.levelInfo.badge}</span>
                {isStudentOnline(currentUserEntry.uid) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online</span>
                    <span className="font-mono font-black text-white pl-1.5 border-l border-emerald-500/40">
                      ⏱ {getStudentLiveDuration(currentUserEntry.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-xs text-gold-400 font-semibold mt-1">
                {currentUserEntry.courseKey} {currentUserEntry.levelKey} • {currentUserEntry.attempt || 'Jan 27'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-between sm:justify-end text-right">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Total Study</span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-emerald-400">
                {formatStudyTimeHms(currentUserEntry.totalStudySeconds)}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Star className="w-3 h-3 text-gold-400" />
                <span>Points</span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-gold-400">
                {currentUserEntry.points.toLocaleString()} PTS
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>Streak</span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-rose-400">
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
            className="order-2 md:order-1 p-5 rounded-3xl glass-card border border-slate-300/30 bg-gradient-to-b from-slate-900/80 to-navy-950 hover:border-slate-300/60 transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view student profile & study statistics"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-slate-300/20 border border-slate-300 text-slate-300 font-black text-lg flex items-center justify-center">
                🥈 2
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Silver Podium</span>
            </div>

            <div className="my-4 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-black text-white group-hover:text-slate-200 transition-colors truncate">
                  {topThree[1]?.name}
                </h3>
                <span className="text-base">{topThree[1]?.levelInfo.badge}</span>
                {isStudentOnline(topThree[1]?.uid) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online</span>
                    <span className="font-mono font-bold text-white pl-1 border-l border-emerald-500/30">
                      ⏱ {getStudentLiveDuration(topThree[1]?.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate">
                Level {topThree[1]?.levelInfo.currentLevelNumber} • {topThree[1]?.courseKey} {topThree[1]?.levelKey}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-center">
              <div>
                <div className="text-[10px] text-slate-400">Hours</div>
                <div className="text-xs font-black text-emerald-400 font-mono truncate">
                  {formatStudyTimeHms(topThree[1]?.totalStudySeconds)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Points</div>
                <div className="text-xs font-black text-gold-400 font-mono truncate">
                  {topThree[1]?.points}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Streak</div>
                <div className="text-xs font-black text-rose-400 font-mono truncate">
                  🔥 {topThree[1]?.streak}d
                </div>
              </div>
            </div>
          </div>

          {/* Rank 1 (Gold - Elevated) */}
          <div 
            onClick={() => setSelectedStudent(topThree[0])}
            className="order-1 md:order-2 p-6 rounded-3xl glass-card border-2 border-gold-500/60 bg-gradient-to-b from-amber-950/40 via-navy-900/90 to-navy-950 shadow-glow-gold hover:border-gold-400 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden md:-translate-y-2"
            title="Click to view student profile & study statistics"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border-2 border-gold-400 text-gold-400 font-black text-xl flex items-center justify-center shadow-glow-gold">
                🥇 1
              </div>
              <span className="px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-black uppercase tracking-wider border border-gold-500/30 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>Grand Champion</span>
              </span>
            </div>

            <div className="my-4 space-y-1 relative z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white group-hover:text-gold-300 transition-colors truncate">
                  {topThree[0]?.name}
                </h3>
                <span className="text-xl">{topThree[0]?.levelInfo.badge}</span>
                {isStudentOnline(topThree[0]?.uid) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online</span>
                    <span className="font-mono font-black text-white pl-1.5 border-l border-emerald-500/40">
                      ⏱ {getStudentLiveDuration(topThree[0]?.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-gold-400 truncate">
                Level {topThree[0]?.levelInfo.currentLevelNumber} ({topThree[0]?.levelInfo.currentLevelName}) • {topThree[0]?.courseKey} {topThree[0]?.levelKey}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gold-500/20 text-center relative z-10">
              <div>
                <div className="text-[10px] text-slate-400">Total Hours</div>
                <div className="text-sm font-black text-emerald-400 font-mono truncate">
                  {formatStudyTimeHms(topThree[0]?.totalStudySeconds)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Points</div>
                <div className="text-sm font-black text-gold-400 font-mono truncate">
                  {topThree[0]?.points}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Streak</div>
                <div className="text-sm font-black text-rose-400 font-mono truncate">
                  🔥 {topThree[0]?.streak}d
                </div>
              </div>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div 
            onClick={() => setSelectedStudent(topThree[2])}
            className="order-3 p-5 rounded-3xl glass-card border border-amber-600/30 bg-gradient-to-b from-amber-950/20 to-navy-950 hover:border-amber-600/60 transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view student profile & study statistics"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-600 text-amber-500 font-black text-lg flex items-center justify-center">
                🥉 3
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bronze Podium</span>
            </div>

            <div className="my-4 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors truncate">
                  {topThree[2]?.name}
                </h3>
                <span className="text-base">{topThree[2]?.levelInfo.badge}</span>
                {isStudentOnline(topThree[2]?.uid) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online</span>
                    <span className="font-mono font-bold text-white pl-1 border-l border-emerald-500/30">
                      ⏱ {getStudentLiveDuration(topThree[2]?.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate">
                Level {topThree[2]?.levelInfo.currentLevelNumber} • {topThree[2]?.courseKey} {topThree[2]?.levelKey}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-center">
              <div>
                <div className="text-[10px] text-slate-400">Hours</div>
                <div className="text-xs font-black text-emerald-400 font-mono truncate">
                  {formatStudyTimeHms(topThree[2]?.totalStudySeconds)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Points</div>
                <div className="text-xs font-black text-gold-400 font-mono truncate">
                  {topThree[2]?.points}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Streak</div>
                <div className="text-xs font-black text-rose-400 font-mono truncate">
                  🔥 {topThree[2]?.streak}d
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls: Search & Stream Filter */}
      <div className="p-4 rounded-3xl glass-card border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name, roll number, stream..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-gold-500/50 transition-colors"
            />
          </div>

          {/* Student Count Badge */}
          <div className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-gold-400" />
            <span>Showing {filteredStudents.length} of {rankedStudents.length} students</span>
          </div>
        </div>

        {/* Stream Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-gold-400" />
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
                  ? 'bg-gold-500 text-navy-950 shadow-glow-gold'
                  : 'bg-navy-900/60 text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
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
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          
          {/* Table Header */}
          <div className="grid grid-cols-12 px-5 sm:px-6 py-4 bg-navy-900/90 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
            <div className="col-span-6 sm:col-span-4">Student & Stream</div>
            <div className="hidden sm:block col-span-3 text-center">Total Study Hours</div>
            <div className="hidden sm:block col-span-2 text-center">Points</div>
            <div className="col-span-4 sm:col-span-2 text-right">Streak</div>
          </div>

          {/* Table Rows (All Students Rendered) */}
          <div className="divide-y divide-white/5">
            {filteredStudents.map((student) => {
              const isCurrentUser = student.uid === currentUser?.uid;

              return (
                <div
                  key={student.uid}
                  onClick={() => setSelectedStudent(student)}
                  className={`grid grid-cols-12 px-5 sm:px-6 py-4 items-center transition-all cursor-pointer group hover:bg-white/5 ${
                    isCurrentUser 
                      ? 'bg-royal-600/20 border-l-4 border-royal-500' 
                      : ''
                  }`}
                  title="Click to view student profile & study statistics"
                >
                  {/* Rank Column */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center font-black">
                    {student.rank === 1 ? (
                      <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500 text-gold-400 flex items-center justify-center text-sm shadow-glow-gold">
                        🥇 1
                      </div>
                    ) : student.rank === 2 ? (
                      <div className="w-8 h-8 rounded-full bg-slate-300/20 border border-slate-300 text-slate-300 flex items-center justify-center text-sm">
                        🥈 2
                      </div>
                    ) : student.rank === 3 ? (
                      <div className="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-600 text-amber-500 flex items-center justify-center text-sm">
                        🥉 3
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm font-mono">#{student.rank}</span>
                    )}
                  </div>

                  {/* Student Name & Stream */}
                  <div className="col-span-6 sm:col-span-4 flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-royal-600 to-gold-500 p-0.5 shrink-0 group-hover:scale-105 transition-transform">
                      <div className="w-full h-full bg-navy-950 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-white group-hover:text-gold-400 transition-colors truncate">
                          {student.name}
                        </span>
                        <span className="text-sm">{student.levelInfo.badge}</span>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full bg-royal-500/30 border border-royal-500/50 text-[10px] font-extrabold text-royal-300">
                            YOU
                          </span>
                        )}
                        {isStudentOnline(student.uid) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Online</span>
                            <span className="font-mono font-black text-white pl-1 border-l border-emerald-500/30">
                              ⏱ {getStudentLiveDuration(student.uid)}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        <span className="text-gold-400 font-semibold">{student.courseKey} {student.levelKey}</span>
                        {student.attempt && <span> · {student.attempt}</span>}
                      </div>
                      <div className="text-[10px] text-emerald-400 sm:hidden font-mono font-bold mt-0.5">
                        ⏱ {formatStudyTimeHms(student.totalStudySeconds)} • ⭐ {student.points} PTS
                      </div>
                    </div>
                  </div>

                  {/* Total Study Hours (Desktop) */}
                  <div className="hidden sm:block col-span-3 text-center">
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      ⏱ {formatStudyTimeHms(student.totalStudySeconds)}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Recorded Study</div>
                  </div>

                  {/* Total Points (Desktop) */}
                  <div className="hidden sm:block col-span-2 text-center">
                    <div className="text-sm font-black text-gold-400 font-mono">
                      {student.points.toLocaleString()} <span className="text-xs font-normal text-slate-400">PTS</span>
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Level {student.levelInfo.currentLevelNumber}</div>
                  </div>

                  {/* Current Streak */}
                  <div className="col-span-4 sm:col-span-2 text-right">
                    <div className="text-xs sm:text-sm font-black text-rose-400 font-mono flex items-center justify-end gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>{student.streak} Days</span>
                    </div>
                    <div className="text-[10px] text-slate-400 hidden sm:block">Current Streak</div>
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
