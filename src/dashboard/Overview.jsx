import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
  ChevronRight,
  Filter,
  Layers
} from 'lucide-react';
import { useEffectiveMotivation } from '../hooks/useEffectiveMotivation';
import { useRealStudyTimer } from '../hooks/useRealStudyTimer';

function parseStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', attempt: '' };
  const rawCourse = String(userProfile.course || 'CA Foundation').toUpperCase();
  const rawLevel = String(userProfile.level || '').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  
  if (rawCourse.includes('CMA')) course = 'CMA';
  
  if (rawCourse.includes('FINAL') || rawLevel.includes('FINAL')) level = 'Final';
  else if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND') || rawCourse.includes('FOUND')) level = 'Foundation';
  else if (userProfile.level) level = userProfile.level; 
  
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

function getSessionStream(session, defaultStream = 'CA Foundation') {
  if (!session) return defaultStream;
  const courseStr = String(session.course || '').trim();
  const levelStr = String(session.level || '').trim();
  const streamStr = String(session.stream || '').trim();

  // 1. Direct course matching
  if (courseStr.toLowerCase().includes('cma')) {
    if (courseStr.toLowerCase().includes('final') || levelStr.toLowerCase().includes('final')) return 'CMA Final';
    if (courseStr.toLowerCase().includes('inter') || levelStr.toLowerCase().includes('inter')) return 'CMA Intermediate';
    return 'CMA Foundation';
  } else if (courseStr.toLowerCase().includes('ca')) {
    if (courseStr.toLowerCase().includes('final') || levelStr.toLowerCase().includes('final')) return 'CA Final';
    if (courseStr.toLowerCase().includes('inter') || levelStr.toLowerCase().includes('inter')) return 'CA Intermediate';
    return 'CA Foundation';
  }

  // 2. Stream ID matching
  if (streamStr) {
    const s = streamStr.toLowerCase();
    if (s.includes('cma_final') || s.includes('cma final')) return 'CMA Final';
    if (s.includes('cma_intermediate') || s.includes('cma_inter') || s.includes('cma inter')) return 'CMA Intermediate';
    if (s.includes('cma_foundation') || s.includes('cma foundation')) return 'CMA Foundation';
    if (s.includes('ca_final') || s.includes('ca final')) return 'CA Final';
    if (s.includes('ca_intermediate') || s.includes('ca_inter') || s.includes('ca inter')) return 'CA Intermediate';
    if (s.includes('ca_foundation') || s.includes('ca foundation')) return 'CA Foundation';
  }

  // 3. Fallback to subject keywords
  const sub = String(session.subject || '').toLowerCase();
  if (sub.includes('advanced accounting') || sub.includes('cost and management') || sub.includes('strategic management') || sub.includes('corporate and other laws')) {
    return 'CA Intermediate';
  }
  if (sub.includes('financial reporting') || sub.includes('advanced auditing') || sub.includes('integrated business')) {
    return 'CA Final';
  }
  if (sub.includes('corporate financial reporting') || sub.includes('strategic financial management')) {
    return 'CMA Final';
  }
  if (sub.includes('business laws and ethics') || sub.includes('direct taxation') || sub.includes('cost accounting')) {
    return 'CMA Intermediate';
  }
  if (sub.includes('quantitative aptitude') || sub.includes('business economics') || sub.includes('accounting') || sub.includes('business law') || sub.includes('law')) {
    return defaultStream || 'CA Foundation';
  }

  return defaultStream || 'CA Foundation';
}

function getSubjectBadge(subject = '') {
  if (!subject) return 'SUB';
  const clean = String(subject).trim();
  
  // Paper 1, Paper 2, etc.
  const paperMatch = clean.match(/^Paper\s*(\d+)/i);
  if (paperMatch) {
    return `P${paperMatch[1]}`;
  }
  
  const upper = clean.toUpperCase();
  if (upper.includes('ACCOUNTING') || upper.includes('ACCOUNTS')) return 'ACC';
  if (upper.includes('LAW')) return 'LAW';
  if (upper.includes('TAX')) return 'TAX';
  if (upper.includes('AUDIT')) return 'AUD';
  if (upper.includes('COST')) return 'COST';
  if (upper.includes('MATH') || upper.includes('QUANT') || upper.includes('STAT')) return 'QA';
  if (upper.includes('ECONOM')) return 'ECO';
  if (upper.includes('FINANC') || upper.includes('FM')) return 'FM';
  
  return clean.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'SUB';
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

export default function Overview({ setActiveTab }) {
  const { userProfile, currentUser } = useAuth();
  const { isEyeCare } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [sessionStreamFilter, setSessionStreamFilter] = useState('all');
  const [showAllRecentSessions, setShowAllRecentSessions] = useState(false);
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
      docs.sort((a, b) => {
        const getSessionTime = (s) => {
          if (s.date?.toMillis) return s.date.toMillis();
          if (s.date?.toDate) return s.date.toDate().getTime();
          if (s.date) return new Date(s.date).getTime();
          if (s.createdAt?.toMillis) return s.createdAt.toMillis();
          if (s.createdAt?.toDate) return s.createdAt.toDate().getTime();
          if (s.createdAt) return new Date(s.createdAt).getTime();
          return 0;
        };
        return getSessionTime(b) - getSessionTime(a);
      });
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

  const myStream = parseStream(userProfile);
  const userStreamLabel = `${myStream.course} ${myStream.level}`;

  // Unique streams found in sessions for filter tabs
  const availableStreams = useMemo(() => {
    const streamSet = new Set();
    if (userStreamLabel) streamSet.add(userStreamLabel);
    sessions.forEach(sess => {
      const st = getSessionStream(sess, userStreamLabel);
      if (st) streamSet.add(st);
    });
    return Array.from(streamSet);
  }, [sessions, userStreamLabel]);

  // Filter sessions by selected stream tab ('all' or specific stream name)
  const filteredSessions = useMemo(() => {
    if (sessionStreamFilter === 'all') return sessions;
    const normalizedFilter = sessionStreamFilter.toLowerCase().replace(/[\s_]+/g, '');
    return sessions.filter(sess => {
      const st = getSessionStream(sess, userStreamLabel);
      return st.toLowerCase().replace(/[\s_]+/g, '') === normalizedFilter;
    });
  }, [sessions, sessionStreamFilter, userStreamLabel]);

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
              isEyeCare ? 'bg-gold-500/15 border border-gold-500/30 text-gold-400' : 'bg-amber-100 border border-amber-300 text-amber-900 font-extrabold'
            }`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{userProfile?.course || 'CA Foundation'} • {userProfile?.attempt || 'Active Stream'}</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
              Welcome back, <span className="gold-gradient-text">{userProfile?.name || 'Student'}</span> 👋
            </h1>
            <p className={`text-sm max-w-xl font-medium ${isEyeCare ? 'text-slate-300' : 'text-slate-600'}`}>
              Track your study hours, complete daily targets, and climb the live leaderboard.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`relative p-3 rounded-2xl transition-all cursor-pointer border ${
                isEyeCare 
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25 hover:border-amber-300/60 shadow-[0_0_18px_rgba(245,158,11,0.2)]'
                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400 shadow-sm'
              }`}
              title="Open Announcements"
              aria-label="Open Announcements"
            >
              <Bell className="w-5 h-5 text-amber-500" />
              {unreadAnnouncementCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">{unreadAnnouncementCount > 9 ? '9+' : unreadAnnouncementCount}</span>}
            </button>
            <button
              onClick={() => setActiveTab('timer')}
              className={`px-5 py-3 rounded-2xl text-white text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 cursor-pointer shadow-md ${
                isEyeCare
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-glow-emerald'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Study Timer</span>
            </button>

            <button
              onClick={() => setActiveTab('targets')}
              className={`px-4 py-3 rounded-2xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                isEyeCare 
                  ? 'glass-card border border-white/10 hover:bg-white/10 text-white' 
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
              }`}
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
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        isEyeCare
          ? 'border-gold-500/25 bg-gradient-to-r from-gold-500/10 via-amber-500/10 to-orange-500/10 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
          : 'border-blue-200 bg-blue-50/70 shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isEyeCare ? 'text-gold-300/90' : 'text-blue-700'}`}>
              Daily Motivation
            </span>
            {effectiveMotivation?.isManual && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-normal border ${
                isEyeCare ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'
              }`}>
                <Sparkles className="w-2.5 h-2.5" />
                <span>{effectiveMotivation.type === 'manual_specific' ? effectiveMotivation.targetStream : 'All Streams'}</span>
              </span>
            )}
          </div>
        </div>
        <p className={`mt-3 text-lg sm:text-xl font-bold italic leading-relaxed ${isEyeCare ? 'text-gold-200' : 'text-slate-900'}`}>
          “{effectiveMotivation?.text}”
        </p>
        <div className={`mt-3 text-right text-xs sm:text-sm font-extrabold ${isEyeCare ? 'text-slate-300' : 'text-blue-700'}`}>
          ~ {effectiveMotivation?.author || 'Mentor MADHAV'}
        </div>
      </div>

      {/* Latest Announcements - YELLOW + RED THEME */}
      <div className={`p-5 sm:p-6 rounded-3xl space-y-4 border transition-all ${
        isEyeCare
          ? 'glass-card border-amber-400/30'
          : 'bg-white border-2 border-amber-300 shadow-md'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-md shrink-0 ${
              isEyeCare 
                ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950' 
                : 'bg-amber-400 text-red-950'
            }`}>
              <Megaphone className="w-5 h-5 fill-current text-red-700" />
            </div>
            <div>
              <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${isEyeCare ? 'text-amber-300' : 'text-red-700'}`}>Official updates</div>
              <h2 className={`text-lg sm:text-xl font-extrabold ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>Latest Announcements</h2>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('announcements')} 
            className={`shrink-0 px-3.5 py-1.5 rounded-xl border text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 cursor-pointer ${
              isEyeCare
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border-amber-400/40'
                : 'bg-amber-50 hover:bg-amber-100 text-red-700 border-amber-300'
            }`}
          >
            <span>View All</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {sortedAnnouncements.length === 0 ? (
          <div className={`p-6 rounded-2xl text-center space-y-2 border ${
            isEyeCare ? 'bg-navy-950/60 border-white/5 text-slate-400' : 'bg-amber-50/50 border-amber-200 text-slate-600'
          }`}>
            <p className="text-xs">No announcements right now. Official updates and exam alerts will appear here.</p>
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
                isEyeCare
                  ? isRead 
                    ? 'bg-navy-950/70 border-white/10 hover:border-amber-400/40' 
                    : 'bg-amber-500/10 border-amber-500/35 hover:border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                  : isRead
                    ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                    : 'bg-amber-50/80 border-2 border-amber-300 hover:border-red-400 shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 relative z-10">
                {a.imageUrl && (
                  <div className={`w-full sm:w-60 h-44 sm:h-36 rounded-xl overflow-hidden border relative shrink-0 shadow-md ${
                    isEyeCare ? 'border-white/10 bg-navy-900' : 'border-amber-200 bg-white'
                  }`}>
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
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>New Announcement</span>
                      </span>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isEyeCare ? 'bg-white/10 text-amber-300' : 'bg-amber-100 text-amber-800'
                      }`}>
                        Latest Update
                      </span>
                    )}
                    <span className={`text-xs font-bold ${isEyeCare ? 'text-slate-400' : 'text-amber-900/80'}`}>
                      {formatDate(a.createdAt)}
                    </span>
                  </div>

                  <h3 className={`text-base sm:text-lg font-bold transition-colors ${
                    isEyeCare ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-red-700'
                  }`}>
                    {a.title}
                  </h3>

                  <p className={`text-xs sm:text-sm leading-relaxed line-clamp-2 ${
                    isEyeCare ? 'text-slate-300/90' : 'text-slate-700 font-medium'
                  }`}>
                    {message}
                  </p>

                  <div className={`pt-1 flex items-center gap-1.5 text-xs font-bold ${
                    isEyeCare ? 'text-amber-300 group-hover:text-amber-200' : 'text-red-700 group-hover:text-red-800'
                  }`}>
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
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm relative overflow-hidden group ${
        isEyeCare
          ? 'glass-card border-rose-500/30 bg-gradient-to-r from-navy-900 to-navy-800'
          : 'bg-white border-blue-200/90'
      }`}>
        <div className={`absolute right-0 top-0 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all ${
          isEyeCare ? 'bg-rose-500/5 group-hover:bg-rose-500/10' : 'bg-blue-500/5 group-hover:bg-blue-500/10'
        }`}></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isEyeCare ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isEyeCare ? 'text-rose-400' : 'text-blue-700'}`}>Weekly Mission</div>
              <h3 className={`text-xl font-black mb-1 ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
                {weeklyMissions.length > 0 
                  ? `${missionSubmissions.filter(s => s.status === 'completed' && weeklyMissions.find(m => m.id === s.missionId)).length} / ${weeklyMissions.length} Missions Completed`
                  : 'No Active Missions This Week'}
              </h3>
              {weeklyMissions.length > 0 && (
                <div className={`text-xs ${isEyeCare ? 'text-slate-300' : 'text-slate-600 font-medium'}`}>
                  Next: <span className={`font-bold ${isEyeCare ? 'text-rose-300' : 'text-blue-700'}`}>{weeklyMissions.find(m => !missionSubmissions.find(s => s.missionId === m.id && s.status === 'completed'))?.title || 'All caught up!'}</span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => setActiveTab('missions')} 
            className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 border ${
              isEyeCare 
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20 border-rose-500/50' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 border-blue-500'
            }`}
          >
            <span>View Missions</span>
          </button>
        </div>
      </div>

      {/* ✨ Mobile-First Product Store Banner (Visible on Phones & Tablets) */}
      <div 
        onClick={() => setActiveTab('product')}
        className={`block sm:hidden p-4 rounded-2xl border shadow-sm cursor-pointer group active:scale-[0.98] transition-all ${
          isEyeCare
            ? 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
            : 'bg-white border-blue-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-md shrink-0 group-hover:scale-105 transition-transform ${
              isEyeCare ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-navy-950' : 'bg-blue-600 text-white'
            }`}>
              <ShoppingBag className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-black ${isEyeCare ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-blue-700'}`}>Product Store</span>
                <span className={`text-[9px] font-black uppercase border px-1.5 py-0.5 rounded shadow-sm ${
                  isEyeCare ? 'bg-amber-500/30 text-amber-300 border-amber-400/40' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>PRO 🔒</span>
              </div>
              <div className={`text-[11px] ${isEyeCare ? 'text-slate-300' : 'text-slate-600 font-medium'}`}>Hand Notes, Test Series & Premium Quizzes</div>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0 ${isEyeCare ? 'text-amber-400' : 'text-blue-600'}`} />
        </div>
      </div>

      {/* Overview Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Today's Study Time */}
        <div className={`p-6 rounded-2xl glass-card relative overflow-hidden space-y-4 border ${
          isEyeCare ? 'border-white/10' : 'border-blue-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Today's Study Time</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isEyeCare ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black font-mono ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
            {formatTimerTime(todaySeconds)}
          </div>
          <div className={`text-xs flex items-center justify-between ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
            <span>
              {todaySeconds > 0 ? `${(todaySeconds / 3600).toFixed(1)} hours completed today` : 'No study logged yet today'}
            </span>
            {isTimerRunning && (
              <span className={`text-[10px] font-bold flex items-center gap-1 animate-pulse px-2 py-0.5 rounded-full border ${
                isEyeCare ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isEyeCare ? 'bg-emerald-400' : 'bg-blue-600'}`} />
                Live Timer
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Study Hours */}
        <div className={`p-6 rounded-2xl glass-card relative overflow-hidden space-y-4 border ${
          isEyeCare ? 'border-white/10' : 'border-blue-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Total Study Hours</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isEyeCare ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
            {formatHours(userProfile?.studyHours || 0)}
          </div>
          <div className={`text-xs font-semibold flex items-center gap-1 ${
            isEyeCare ? 'text-emerald-400' : 'text-blue-700'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All verified study sessions</span>
          </div>
        </div>

        {/* Card 3: Points */}
        <div className={`p-6 rounded-2xl glass-card relative overflow-hidden space-y-4 border ${
          isEyeCare ? 'border-white/10' : 'border-blue-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Total Points</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isEyeCare ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black ${isEyeCare ? 'text-gold-400' : 'text-blue-700'}`}>
            {userProfile?.points || 0} <span className={`text-xs font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>PTS</span>
          </div>
          <div className={`text-xs ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
            6h = 5 pts (+2/hr) • Target bonus (4h+)
          </div>
        </div>

        {/* Card 4: Current Streak */}
        <div className={`p-6 rounded-2xl glass-card relative overflow-hidden space-y-4 border ${
          isEyeCare ? 'border-white/10' : 'border-blue-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Current Streak</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isEyeCare 
                ? (todaySeconds >= 14400 ? 'bg-amber-500/25 text-amber-400 shadow-glow-gold border-amber-500/40' : 'bg-amber-500/15 text-amber-400 border-amber-500/30')
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Flame className={`w-5 h-5 ${todaySeconds >= 14400 ? 'animate-bounce' : ''}`} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className={`text-3xl font-black ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
              {currentStreak} <span className={`text-sm font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Days</span>
            </div>
            {isTimerRunning && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse border ${
                isEyeCare ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isEyeCare ? 'bg-emerald-400' : 'bg-blue-600'}`} />
                <span>Timer Running</span>
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={todaySeconds >= 14400 
                ? (isEyeCare ? 'text-emerald-400 font-bold' : 'text-blue-700 font-bold')
                : (isEyeCare ? 'text-amber-400 font-medium' : 'text-blue-700 font-semibold')}>
                {todaySeconds >= 14400 
                  ? '🔥 4h goal completed today!' 
                  : isTimerRunning 
                  ? 'Studying now to extend streak' 
                  : currentStreak > 0 
                  ? 'Consistency streak active!' 
                  : 'Study today to build a streak'}
              </span>
              <span className={`text-[11px] font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                {(todaySeconds / 3600).toFixed(1)}h / 4h
              </span>
            </div>
            {/* 4-Hour Daily Streak Progress Bar */}
            <div className={`w-full rounded-full h-1.5 overflow-hidden ${isEyeCare ? 'bg-navy-950' : 'bg-blue-100'}`}>
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isEyeCare ? (todaySeconds >= 14400 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-gold-400') : 'bg-blue-600'}`}
                style={{ width: `${Math.min(100, Math.round((todaySeconds / 14400) * 100))}%` }}
              />
            </div>
          </div>

          <div className={`text-[10px] font-semibold pt-2 border-t flex items-center justify-between ${
            isEyeCare ? 'text-slate-500 border-white/5' : 'text-slate-600 border-slate-100'
          }`}>
            <span>⚠️ Requires minimum 4 hours of total study per day to grow streak.</span>
          </div>
        </div>

        {/* Card 5: Target Completion */}
        <div className={`p-6 rounded-2xl glass-card relative overflow-hidden space-y-4 border ${
          isEyeCare ? 'border-white/10' : 'border-blue-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Target Completion</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isEyeCare ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
            {targetCompletionPct}%
          </div>
          <div className={`w-full rounded-full h-1.5 overflow-hidden ${isEyeCare ? 'bg-navy-950' : 'bg-blue-100'}`}>
            <div className={`h-full rounded-full transition-all duration-500 ${isEyeCare ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${targetCompletionPct}%` }}></div>
          </div>
        </div>

        {/* Card 6: Leaderboard Rank */}
        <div className={`p-6 rounded-2xl glass-card relative overflow-hidden space-y-4 border ${
          isEyeCare ? 'border-white/10' : 'border-blue-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Leaderboard Rank</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isEyeCare ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black ${isEyeCare ? 'text-white' : 'text-blue-700'}`}>
            {rank ? `#${rank}` : 'N/A'}
          </div>
          <div className={`text-xs ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
            {rank ? 'Real-time student standing' : 'Start studying to get ranked'}
          </div>
        </div>

      </div>

      {/* Recent Activity & Quick Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recent Sessions */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${isEyeCare ? 'text-emerald-500' : 'text-blue-600'}`} />
              <h3 className={`text-lg font-bold ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
                Recent Study Sessions
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isEyeCare ? 'bg-white/10 text-slate-300 border border-white/10' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {filteredSessions.length}
              </span>
            </div>
            <button 
              onClick={() => setActiveTab('timer')}
              className={`text-xs font-bold flex items-center gap-1 ${isEyeCare ? 'text-emerald-400 hover:text-emerald-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              View All in Timer →
            </button>
          </div>

          {/* Stream Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => { setSessionStreamFilter('all'); setShowAllRecentSessions(false); }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                sessionStreamFilter === 'all'
                  ? (isEyeCare ? 'bg-emerald-500 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                  : (isEyeCare ? 'bg-navy-900/80 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200')
              }`}
            >
              All Streams
            </button>
            {availableStreams.map((st) => {
              const isSelected = sessionStreamFilter.toLowerCase().replace(/[\s_]+/g, '') === st.toLowerCase().replace(/[\s_]+/g, '');
              return (
                <button
                  key={st}
                  onClick={() => { setSessionStreamFilter(st); setShowAllRecentSessions(false); }}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? (isEyeCare ? 'bg-emerald-500 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                      : (isEyeCare ? 'bg-navy-900/80 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200')
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {filteredSessions.length === 0 ? (
            <EmptyState 
              icon={Clock}
              title={sessionStreamFilter === 'all' ? "No study sessions logged yet" : `No sessions for ${sessionStreamFilter}`}
              description={sessionStreamFilter === 'all' 
                ? "Start the study timer to record your real study sessions and subject-wise duration." 
                : `You haven't recorded any study sessions under ${sessionStreamFilter} yet.`}
              actionText="Start Study Timer"
              onAction={() => setActiveTab('timer')}
            />
          ) : (
            <div className={`glass-card rounded-2xl border divide-y overflow-hidden ${
              isEyeCare ? 'border-white/10 divide-white/5' : 'border-blue-100 divide-slate-100 shadow-sm'
            }`}>
              {(showAllRecentSessions ? filteredSessions : filteredSessions.slice(0, 5)).map((session) => {
                const streamTag = getSessionStream(session, userStreamLabel);
                return (
                  <div 
                    key={session.id} 
                    onClick={() => setActiveTab('timer')}
                    className={`p-4 flex items-center justify-between transition-colors cursor-pointer group ${
                      isEyeCare ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                    title="Open in Study Timer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 ${
                        isEyeCare ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        {getSubjectBadge(session.subject)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold truncate ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
                            {session.subject}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isEyeCare ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {streamTag}
                          </span>
                        </div>
                        <div className={`text-xs mt-0.5 ${isEyeCare ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDate(session.date)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <div className={`text-sm font-bold font-mono ${isEyeCare ? 'text-emerald-400' : 'text-blue-700'}`}>
                        {formatTimerTime(session.duration)}
                      </div>
                      <div className={`text-[11px] font-bold ${isEyeCare ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        ✓ Verified
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSessions.length > 5 && (
                <div className={`p-3 text-center border-t ${isEyeCare ? 'border-white/5 bg-navy-900/40' : 'border-slate-100 bg-slate-50'}`}>
                  <button
                    onClick={() => setShowAllRecentSessions(!showAllRecentSessions)}
                    className={`text-xs font-bold transition-colors cursor-pointer ${
                      isEyeCare ? 'text-emerald-400 hover:text-emerald-300' : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    {showAllRecentSessions ? 'Show Less ↑' : `Show All ${filteredSessions.length} Sessions (${filteredSessions.length - 5} More) ↓`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Quick Links & Help */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
            <Target className={`w-5 h-5 ${isEyeCare ? 'text-gold-500' : 'text-blue-600'}`} />
            Blueprint Hub
          </h3>

          <div className={`glass-card p-6 rounded-2xl border space-y-4 ${
            isEyeCare ? 'border-white/10' : 'border-blue-100 shadow-sm'
          }`}>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${
                isEyeCare 
                  ? 'bg-navy-900/60 border-white/10 hover:border-gold-500/40' 
                  : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  isEyeCare ? 'bg-gold-500/20 text-gold-400' : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-sm font-bold transition-colors ${
                    isEyeCare ? 'text-white group-hover:text-gold-400' : 'text-slate-900 group-hover:text-blue-700'
                  }`}>Live Leaderboard</div>
                  <div className={`text-xs ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>View genuine student rankings</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('doubts')}
              className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${
                isEyeCare 
                  ? 'bg-navy-900/60 border-white/10 hover:border-amber-500/40' 
                  : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  isEyeCare ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-sm font-bold transition-colors ${
                    isEyeCare ? 'text-white group-hover:text-amber-400' : 'text-slate-900 group-hover:text-blue-700'
                  }`}>Doubt & Guidance</div>
                  <div className={`text-xs ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Direct 1-on-1 help & guidance from Admin</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${
                isEyeCare 
                  ? 'bg-navy-900/60 border-white/10 hover:border-purple-500/40' 
                  : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  isEyeCare ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-sm font-bold transition-colors ${
                    isEyeCare ? 'text-white group-hover:text-purple-400' : 'text-slate-900 group-hover:text-blue-700'
                  }`}>Notes & Resources</div>
                  <div className={`text-xs ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Access official study material</div>
                </div>
              </div>
            </button>

            {/* Product Store Link in Hub */}
            <button
              onClick={() => setActiveTab('product')}
              className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group shadow-sm cursor-pointer ${
                isEyeCare
                  ? 'bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/15 border-amber-500/30 hover:border-amber-400/60'
                  : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${
                  isEyeCare ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-navy-950' : 'bg-blue-600 text-white'
                }`}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
                    isEyeCare ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-blue-700'
                  }`}>
                    <span>Product Store</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-black border ${
                      isEyeCare ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      PRO 🔒
                    </span>
                  </div>
                  <div className={`text-xs ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>Hand Notes, Test Series, Quizzes</div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isEyeCare ? 'text-amber-400' : 'text-blue-600'}`} />
            </button>

          </div>
        </div>

        {/* ✨ NEW PRODUCT SECTION CARD (Store Showcase) */}
        <div 
          onClick={() => setActiveTab('product')}
          className={`col-span-1 lg:col-span-12 relative overflow-hidden rounded-3xl border p-6 sm:p-8 mt-4 transition-all duration-300 cursor-pointer group ${
            isEyeCare 
              ? 'bg-gradient-to-r from-amber-950/40 via-[#130d2a] to-purple-950/50 border-amber-500/40 hover:border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.15)] hover:shadow-[0_0_45px_rgba(245,158,11,0.25)]' 
              : 'bg-white border-2 border-blue-200 hover:border-blue-400 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                isEyeCare ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-navy-950 shadow-glow-amber' : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              }`}>
                <ShoppingBag className="w-8 h-8 fill-current" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className={`text-xl sm:text-2xl font-black transition-colors ${
                    isEyeCare ? 'text-white group-hover:text-amber-200' : 'text-slate-900 group-hover:text-blue-700'
                  }`}>
                    Product
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 shadow-sm ${
                    isEyeCare ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border-amber-500/40' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    <Sparkles className={`w-2.5 h-2.5 ${isEyeCare ? 'text-amber-400' : 'text-blue-600'}`} />
                    <span>Premium Store</span>
                  </span>
                </div>

                <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${
                  isEyeCare ? 'text-slate-300' : 'text-slate-700 font-medium'
                }`}>
                  Unlock our curated suite of premium study resources: <strong className={isEyeCare ? 'text-amber-300' : 'text-blue-700'}>Premium Hand Notes</strong> 🔒, <strong className={isEyeCare ? 'text-emerald-300' : 'text-blue-700'}>Test Series</strong> 🔒, and <strong className={isEyeCare ? 'text-purple-300' : 'text-blue-700'}>Premium Quiz</strong> 🔒.
                </p>

                <div className={`flex items-center gap-3 pt-1 flex-wrap text-xs font-semibold ${
                  isEyeCare ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  <span className={`flex items-center gap-1 ${isEyeCare ? 'text-amber-300' : 'text-blue-700'}`}>
                    <span>🔒</span> Premium Hand Notes
                  </span>
                  <span>•</span>
                  <span className={`flex items-center gap-1 ${isEyeCare ? 'text-emerald-300' : 'text-blue-700'}`}>
                    <span>🔒</span> Test Series
                  </span>
                  <span>•</span>
                  <span className={`flex items-center gap-1 ${isEyeCare ? 'text-purple-300' : 'text-blue-700'}`}>
                    <span>🔒</span> Premium Quiz
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto shrink-0">
              <button 
                type="button"
                className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                  isEyeCare
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-glow-amber group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                }`}
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
