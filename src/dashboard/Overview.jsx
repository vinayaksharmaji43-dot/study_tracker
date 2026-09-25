import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatHours, formatTimerTime, calculateStreak, formatDate, getDateKey } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import NextMentorSessionWidget from '../components/NextMentorSessionWidget';
import { 
  Clock, 
  Trophy, 
  Target, 
  Flame, 
  Award, 
  Play, 
  Plus, 
  HelpCircle,
  BookOpen,
  CheckCircle2,
  Calendar,
  Megaphone,
  Flag,
  Send,
  Camera,
  MessageCircle,
  Users,
  Bell,
  Sparkles,
  ShoppingBag,
  ChevronRight
} from 'lucide-react';
import { useEffectiveMotivation } from '../hooks/useEffectiveMotivation';
import { useRealStudyTimer } from '../hooks/useRealStudyTimer';

function parseStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', attempt: '' };
  const rawCourse = String(userProfile.course || 'CA Foundation').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  
  if (rawCourse.includes('CMA')) course = 'CMA';
  
  const rawLevel = String(userProfile.level || '').toUpperCase();
  if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND') || rawCourse.includes('FOUND')) level = 'Foundation';
  else if (userProfile.level) level = userProfile.level; 
  
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

export default function Overview({ setActiveTab }) {
  const { userProfile, currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dayOffs, setDayOffs] = useState([]);
  const [studyGroup, setStudyGroup] = useState(null);
  const [weeklyMissions, setWeeklyMissions] = useState([]);
  const [missionSubmissions, setMissionSubmissions] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real-time user sessions, targets, and published announcements
  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return;

    const my = parseStream(userProfile);

    // Fetch relevant study group link
    const groupId = `${my.course}_${my.level}_${normalizeAttempt(my.attempt)}`;
    const unsubGroup = onSnapshot(doc(db, 'studyGroups', groupId), (d) => {
      if (d.exists()) {
        setStudyGroup({ id: d.id, ...d.data() });
      } else {
        setStudyGroup(null);
      }
    });

    // Listen to announcements
    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => {
          if (a.published === false) return false;
          if (a.audienceType !== 'specific') return true;
          return (
            a.course === my.course &&
            a.level === my.level &&
            normalizeAttempt(a.attempt) === normalizeAttempt(my.attempt)
          );
        });
      setAnnouncements(docs);
    });

    // Listen to study sessions
    const sessionsQuery = query(
      collection(db, 'studySessions'),
      where('uid', '==', currentUser.uid)
    );
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(docs);
    });

    const dayOffsQuery = collection(db, 'dayOffs', currentUser.uid, 'records');
    const unsubDayOffs = onSnapshot(dayOffsQuery, (snapshot) => {
      setDayOffs(snapshot.docs.map(doc => doc.data()));
    });

    // Listen to user targets
    const targetsQuery = query(
      collection(db, 'targets'),
      where('uid', '==', currentUser.uid)
    );
    const unsubTargets = onSnapshot(targetsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTargets(docs);
    });

    // Listen to all users to calculate real rank
    const usersQuery = collection(db, 'users');
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allUsers.sort((a, b) => (b.points || 0) - (a.points || 0));
      const userIndex = allUsers.findIndex(u => u.id === currentUser.uid);
      if (userIndex !== -1) {
        setRank(userIndex + 1);
      }
      setLoading(false);
    });

    // Listen to Weekly Missions
    const today = new Date().toISOString().split('T')[0];
    const qM = query(collection(db, 'weeklyMissions'));
    const unsubMissions = onSnapshot(qM, (snap) => {
      const allM = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeFiltered = allM.filter(m => m.endDate >= today && m.startDate <= today && (
        m.audienceType === 'all' || 
        (m.course === my.course && m.level === my.level && normalizeAttempt(m.attempt) === normalizeAttempt(my.attempt))
      ));
      setWeeklyMissions(activeFiltered);
    });

    const qSub = query(collection(db, 'weeklyMissionSubmissions'), where('studentId', '==', currentUser.uid));
    const unsubSubmissions = onSnapshot(qSub, (snap) => {
      setMissionSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qRead = query(collection(db, 'announcementReads'), where('studentId', '==', currentUser.uid));
    const unsubRead = onSnapshot(qRead, (snap) => {
      setReadIds(new Set(snap.docs.map(d => d.data().announcementId)));
    });

    return () => {
      unsubGroup();
      unsubAnnouncements();
      unsubSessions();
      unsubDayOffs();
      unsubTargets();
      unsubUsers();
      unsubMissions();
      unsubSubmissions();
      unsubRead();
    };
  }, [currentUser, userProfile?.course, userProfile?.level, userProfile?.attempt]);

  // Effective Motivation (Manual Specific > Manual All Streams > Automatic Rotating Quotes)
  const { effectiveMotivation } = useEffectiveMotivation(userProfile);

  const handleMarkAsRead = async (announcementId) => {
    if (readIds.has(announcementId) || !currentUser) return;
    try {
      const readRef = doc(db, 'announcementReads', `${currentUser.uid}_${announcementId}`);
      await setDoc(readRef, {
        studentId: currentUser.uid,
        announcementId,
        readAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  if (!currentUser?.uid || !userProfile) return null;


  // Live Study Timer auto-detection
  const { isTimerRunning, elapsedSeconds, currentSubject } = useRealStudyTimer(currentUser, userProfile);

  // Today's study time calculation (in seconds) - uses local dateKey to prevent timezone skew
  const todayKey = getDateKey(new Date());
  const savedTodaySeconds = sessions.reduce((acc, curr) => {
    if (!curr.date) return acc;
    const sDate = curr.date?.toDate ? curr.date.toDate() : new Date(curr.date);
    if (getDateKey(sDate) === todayKey) {
      return acc + (Number(curr.duration) || 0);
    }
    return acc;
  }, 0);

  // Auto-detect live running study timer into today's total study time
  const activeTimerSeconds = isTimerRunning && elapsedSeconds > 0 ? elapsedSeconds : 0;
  const todaySeconds = savedTodaySeconds + activeTimerSeconds;

  // Target completion %
  const totalTargets = targets.length;
  const completedTargets = targets.filter(t => t.completed).length;
  const targetCompletionPct = totalTargets > 0 ? Math.round((completedTargets / totalTargets) * 100) : 0;

  // Auto-detect ongoing active study timer for real-time streak calculation
  const sessionsForStreak = useMemo(() => {
    if (!isTimerRunning || !elapsedSeconds || elapsedSeconds <= 0) return sessions;
    return [
      ...sessions,
      {
        date: new Date(),
        duration: elapsedSeconds
      }
    ];
  }, [sessions, isTimerRunning, elapsedSeconds]);

  // Streak (auto-detects 4 hours / 14400s threshold from saved + live study timer)
  const currentStreak = calculateStreak(sessionsForStreak, dayOffs.map(dayOff => dayOff.dateKey));
  const unreadAnnouncementCount = announcements.filter(announcement => !readIds.has(announcement.id)).length;
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const getTime = item => item.createdAt?.toMillis ? item.createdAt.toMillis() : new Date(item.createdAt || 0).getTime();
    return getTime(b) - getTime(a);
  });

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-400 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{userProfile?.course || 'CA Foundation'} • {userProfile?.attempt || 'Active Stream'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, <span className="gold-gradient-text">{userProfile?.name || 'Student'}</span> 👋
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Track your study hours, complete daily targets, and climb the live leaderboard.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('announcements')}
              className="relative p-3 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-rose-200 hover:bg-rose-500/20 hover:border-rose-300/50 transition-all shadow-[0_0_18px_rgba(244,63,94,0.14)]"
              title="Open Announcements"
              aria-label="Open Announcements"
            >
              <Bell className="w-5 h-5" />
              {unreadAnnouncementCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-navy-950">{unreadAnnouncementCount > 9 ? '9+' : unreadAnnouncementCount}</span>}
            </button>
            <button
              onClick={() => setActiveTab('timer')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-bold shadow-glow-emerald flex items-center gap-2 transition-all hover:scale-105"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Study Timer</span>
            </button>

            <button
              onClick={() => setActiveTab('targets')}
              className="px-4 py-3 rounded-2xl glass-card border border-white/10 hover:bg-white/10 text-white text-sm font-bold flex items-center gap-2 transition-all"
            >
              <span>New Target</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Study Group Banner */}
      {studyGroup && (
        <a href={studyGroup.url} target="_blank" rel="noopener noreferrer" className={`block w-full p-1 rounded-3xl bg-gradient-to-r ${studyGroup.platform === 'youtube' ? 'from-red-600 to-rose-500' : studyGroup.platform === 'whatsapp' ? 'from-emerald-500 to-teal-400' : studyGroup.platform === 'telegram' ? 'from-blue-600 to-cyan-500' : 'from-purple-600 to-pink-500'} hover:scale-[1.01] transition-transform duration-300 shadow-xl group`}>
          <div className="bg-navy-950/40 backdrop-blur-md rounded-[22px] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 border border-white/20 shadow-inner group-hover:scale-110 transition-transform ${studyGroup.platform === 'youtube' ? 'text-red-400' : studyGroup.platform === 'whatsapp' ? 'text-emerald-400' : studyGroup.platform === 'telegram' ? 'text-blue-400' : 'text-purple-400'}`}>
                <Users className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Official Study Group
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-gold-200 transition-colors">
                  {studyGroup.title || `Join ${studyGroup.course} ${studyGroup.level} Community`}
                </h3>
                <p className="text-sm text-slate-200 font-medium">Connect with mentors and peers for {studyGroup.attempt}</p>
              </div>
            </div>
            <div className="shrink-0">
              <div className="px-6 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm flex items-center gap-2 border border-white/30 shadow-lg backdrop-blur-sm transition-all">
                <span>Join Now</span>
                <Send className="w-4 h-4" />
              </div>
            </div>
          </div>
        </a>
      )}

      {/* Mentor Session Widget */}
      <NextMentorSessionWidget setActiveTab={setActiveTab} />

      {/* Daily Motivation Quote */}
      <div className="p-5 sm:p-6 rounded-3xl border border-gold-500/25 bg-gradient-to-r from-gold-500/10 via-amber-500/10 to-orange-500/10 shadow-[0_0_20px_rgba(245,158,11,0.18)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300/90">Daily Motivation</span>
            {effectiveMotivation?.isManual && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[9px] font-extrabold tracking-normal">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{effectiveMotivation.type === 'manual_specific' ? effectiveMotivation.targetStream : 'All Streams'}</span>
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 text-lg sm:text-xl font-semibold italic text-gold-200 leading-relaxed">
          “{effectiveMotivation?.text}”
        </p>
        <div className="mt-3 text-right text-xs sm:text-sm font-medium text-slate-300">
          ~ {effectiveMotivation?.author || 'Mentor MADHAV'}
        </div>
      </div>

      {/* Latest Announcements */}
      <div className="p-5 sm:p-6 rounded-3xl glass-card border border-rose-500/25 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-400/25 flex items-center justify-center text-rose-400 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">Official updates</div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Latest Announcements</h2>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('announcements')} 
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
          >
            <span>View All</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {sortedAnnouncements.length === 0 ? (
          <div className="p-6 rounded-2xl bg-navy-950/60 border border-white/5 text-center space-y-2">
            <p className="text-xs text-slate-400">No announcements right now. Official updates and exam alerts will appear here.</p>
          </div>
        ) : (() => {
          const a = sortedAnnouncements[0];
          const isRead = readIds.has(a.id);
          const message = a.message || a.description || '';

          return (
            <div 
              onClick={() => {
                handleMarkAsRead(a.id);
                setActiveTab('announcements');
              }}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group cursor-pointer hover:shadow-xl ${
                isRead 
                  ? 'bg-navy-950/70 border-white/10 hover:border-rose-500/30' 
                  : 'bg-rose-500/10 border-rose-500/35 hover:border-rose-400/60 shadow-[0_0_25px_rgba(244,63,94,0.12)]'
              }`}
            >
              <div className="absolute right-0 top-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/20 transition-all"></div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 relative z-10">
                {a.imageUrl && (
                  <div className="w-full sm:w-60 h-44 sm:h-36 rounded-xl overflow-hidden border border-white/10 relative shrink-0 bg-navy-900 shadow-md">
                    <img 
                      src={a.imageUrl} 
                      alt={a.title || 'Announcement'} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  </div>
                )}

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isRead ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>New Announcement</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-rose-300 uppercase tracking-wider">
                        Latest Update
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-medium">
                      {formatDate(a.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-rose-200 transition-colors">
                    {a.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed line-clamp-2">
                    {message}
                  </p>

                  <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-rose-300 group-hover:text-rose-200">
                    <span>Read full announcement</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Weekly Mission Widget */}
      <div className="p-5 sm:p-6 rounded-3xl glass-card border border-rose-500/30 bg-gradient-to-r from-navy-900 to-navy-800 shadow-xl relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/10 transition-all"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">Weekly Mission</div>
              <h3 className="text-xl font-bold text-white mb-1">
                {weeklyMissions.length > 0 
                  ? `${missionSubmissions.filter(s => s.status === 'completed' && weeklyMissions.find(m => m.id === s.missionId)).length} / ${weeklyMissions.length} Missions Completed`
                  : 'No Active Missions This Week'}
              </h3>
              {weeklyMissions.length > 0 && (
                <div className="text-xs text-slate-300">
                  Next: <span className="font-semibold text-rose-300">{weeklyMissions.find(m => !missionSubmissions.find(s => s.missionId === m.id && s.status === 'completed'))?.title || 'All caught up!'}</span>
                </div>
              )}
            </div>
          </div>
          
          <button onClick={() => setActiveTab('missions')} className="shrink-0 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2 border border-rose-500/50">
            <span>View Missions</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Today's Study Time */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Study Time</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {formatTimerTime(todaySeconds)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>
              {todaySeconds > 0 ? `${(todaySeconds / 3600).toFixed(1)} hours completed today` : 'No study logged yet today'}
            </span>
            {isTimerRunning && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Timer
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Study Hours */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Study Hours</span>
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {formatHours(userProfile?.studyHours || 0)}
          </div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All verified study sessions</span>
          </div>
        </div>

        {/* Card 3: Points */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Points</span>
            <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gold-400">
            {userProfile?.points || 0} <span className="text-xs text-slate-400 font-normal">PTS</span>
          </div>
          <div className="text-xs text-slate-400">
            Earn 10 pts/hr + target bonus
          </div>
        </div>

        {/* Card 4: Current Streak */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Streak</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${todaySeconds >= 14400 ? 'bg-amber-500/25 text-amber-400 shadow-glow-gold' : 'bg-amber-500/15 text-amber-400'}`}>
              <Flame className={`w-5 h-5 ${todaySeconds >= 14400 ? 'animate-bounce' : ''}`} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-white">
              {currentStreak} <span className="text-sm font-bold text-slate-400">Days</span>
            </div>
            {isTimerRunning && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Timer Running</span>
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={todaySeconds >= 14400 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-medium'}>
                {todaySeconds >= 14400 
                  ? '🔥 4h goal completed today!' 
                  : isTimerRunning 
                  ? 'Studying now to extend streak' 
                  : currentStreak > 0 
                  ? 'Consistency streak active!' 
                  : 'Study today to build a streak'}
              </span>
              <span className="text-[11px] text-slate-400 font-bold">
                {(todaySeconds / 3600).toFixed(1)}h / 4h
              </span>
            </div>
            {/* 4-Hour Daily Streak Progress Bar */}
            <div className="w-full bg-navy-950 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${todaySeconds >= 14400 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-gold-400'}`}
                style={{ width: `${Math.min(100, Math.round((todaySeconds / 14400) * 100))}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-medium pt-2 border-t border-white/5 flex items-center justify-between">
            <span>⚠️ Requires minimum 4 hours of total study per day to grow streak.</span>
          </div>
        </div>

        {/* Card 5: Target Completion */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Completion</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {targetCompletionPct}%
          </div>
          <div className="w-full bg-navy-950 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${targetCompletionPct}%` }}></div>
          </div>
        </div>

        {/* Card 6: Leaderboard Rank */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Leaderboard Rank</span>
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {rank ? `#${rank}` : 'N/A'}
          </div>
          <div className="text-xs text-slate-400">
            {rank ? 'Real-time student standing' : 'Start studying to get ranked'}
          </div>
        </div>

      </div>

      {/* Recent Activity & Quick Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recent Sessions */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Recent Study Sessions
            </h3>
            <button 
              onClick={() => setActiveTab('timer')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              View All in Timer →
            </button>
          </div>

          {sessions.length === 0 ? (
            <EmptyState 
              icon={Clock}
              title="No study sessions logged yet"
              description="Start the study timer to record your real study sessions and subject-wise duration."
              actionText="Start Study Timer"
              onAction={() => setActiveTab('timer')}
            />
          ) : (
            <div className="glass-card rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {session.subject ? session.subject.substring(0, 3).toUpperCase() : 'SUB'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{session.subject}</div>
                      <div className="text-xs text-slate-400">{formatDate(session.date)}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      {formatTimerTime(session.duration)}
                    </div>
                    <div className="text-[11px] text-gold-400 font-medium">
                      +{(session.duration / 3600 * 10).toFixed(0)} PTS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Links & Help */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-gold-400" />
            Blueprint Hub
          </h3>

          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className="w-full p-4 rounded-xl bg-navy-900/60 border border-white/10 hover:border-gold-500/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-gold-400 transition-colors">Live Leaderboard</div>
                  <div className="text-xs text-slate-400">View genuine student rankings</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('doubts')}
              className="w-full p-4 rounded-xl bg-navy-900/60 border border-white/10 hover:border-amber-500/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Academic Doubts</div>
                  <div className="text-xs text-slate-400">Ask faculty & admin questions</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className="w-full p-4 rounded-xl bg-navy-900/60 border border-white/10 hover:border-purple-500/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Notes & Resources</div>
                  <div className="text-xs text-slate-400">Access official study material</div>
                </div>
              </div>
            </button>

            {/* Product Store Link in Hub */}
            <button
              onClick={() => setActiveTab('product')}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/15 border border-amber-500/30 hover:border-amber-400/60 text-left transition-all flex items-center justify-between group shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-navy-950 flex items-center justify-center shadow-sm">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                    <span>Product Store</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black">
                      PRO 🔒
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Hand Notes, Test Series, Quizzes</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>

          </div>
        </div>

        {/* ✨ NEW PRODUCT SECTION CARD (Store Showcase) */}
        <div 
          onClick={() => setActiveTab('product')}
          className="col-span-1 lg:col-span-12 relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#130d2a] to-purple-950/50 border border-amber-500/40 hover:border-amber-400/80 p-6 sm:p-8 mt-4 shadow-[0_0_35px_rgba(245,158,11,0.15)] hover:shadow-[0_0_45px_rgba(245,158,11,0.25)] transition-all duration-300 cursor-pointer group"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/15 to-purple-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-navy-950 flex items-center justify-center shrink-0 shadow-glow-amber group-hover:scale-105 transition-transform duration-300">
                <ShoppingBag className="w-8 h-8 fill-current" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-200 transition-colors">
                    Product
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/40 flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>Premium Store</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Unlock our curated suite of premium study resources: <strong className="text-amber-300">Premium Hand Notes</strong> 🔒, <strong className="text-emerald-300">Test Series</strong> 🔒, and <strong className="text-purple-300">Premium Quiz</strong> 🔒.
                </p>

                <div className="flex items-center gap-3 pt-1 flex-wrap text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1 text-amber-300">
                    <span>🔒</span> Premium Hand Notes
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-300">
                    <span>🔒</span> Test Series
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-purple-300">
                    <span>🔒</span> Premium Quiz
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto shrink-0">
              <button 
                type="button"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-navy-950 text-sm font-black transition-all flex items-center justify-center gap-2 shadow-glow-amber group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] cursor-pointer"
              >
                <span>Open Product Store</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
