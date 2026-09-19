import React, { useState, useEffect } from 'react';
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
  Users
} from 'lucide-react';

function parseStream(userProfile) {
  const raw = (userProfile?.course || '').toUpperCase();
  const isCMA = raw.includes('CMA');
  const course = isCMA ? 'CMA' : 'CA';
  const level = raw.includes('FOUNDATION') ? 'Foundation' : 'Intermediate';
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

  // Daily rotating motivational quote
  const motivationQuotes = [
    'Discipline is choosing what you want most over what you want now.',
    'Consistency beats intensity when intensity fades away.',
    'Small daily wins are the real foundation of greatness.',
    'Your future self will thank you for the hours you protect today.',
    'Study with intention, and progress will become visible.',
    'Success is built one focused session at a time.'
  ];
  const motivationIndex = new Date().getDate() % motivationQuotes.length;
  const dailyMotivation = motivationQuotes[motivationIndex];

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


  // Today's study time calculation (in seconds)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySeconds = sessions.reduce((acc, curr) => {
    const sDate = curr.date?.toDate ? curr.date.toDate() : new Date(curr.date);
    if (sDate && sDate.toISOString().split('T')[0] === todayStr) {
      return acc + (curr.duration || 0);
    }
    return acc;
  }, 0);

  // Target completion %
  const totalTargets = targets.length;
  const completedTargets = targets.filter(t => t.completed).length;
  const targetCompletionPct = totalTargets > 0 ? Math.round((completedTargets / totalTargets) * 100) : 0;

  // Streak
  const currentStreak = calculateStreak(sessions, dayOffs.map(dayOff => dayOff.dateKey));

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
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300/90">Daily Motivation</div>
        <p className="mt-3 text-lg sm:text-xl font-semibold italic text-gold-200 leading-relaxed">
          “{dailyMotivation}”
        </p>
        <div className="mt-3 text-right text-xs sm:text-sm font-medium text-slate-300">
          ~ Mentor MADHAV
        </div>
      </div>

      {/* Published Announcements Banner (from Admin) */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 pl-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block"></span>
            <span>Official Platform Announcements</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {announcements.slice(0, 1).map((a) => {
              const isRead = readIds.has(a.id);
              return (
                <div 
                  key={a.id} 
                  onClick={() => handleMarkAsRead(a.id)}
                  className={`p-4 rounded-2xl border flex items-start space-x-3 relative overflow-hidden group cursor-pointer transition-all ${isRead ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-500/10 border-rose-500/30'}`}
                >
                  <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/20 transition-all"></div>
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5 relative z-10">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 w-full relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!isRead && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white uppercase tracking-wider">New</span>}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white uppercase tracking-wider">Latest</span>
                        <h4 className="text-sm font-bold text-white">{a.title}</h4>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/20 text-rose-300 w-fit">
                        {a.audienceType === 'specific' ? `${a.course} ${a.level}` : 'All Students'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{a.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <div className="text-xs text-slate-400">
            {todaySeconds > 0 ? `${(todaySeconds / 3600).toFixed(1)} hours completed today` : 'No study logged yet today'}
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {currentStreak} <span className="text-sm font-bold text-slate-400">Days</span>
          </div>
          <div className="text-xs text-amber-400 font-medium">
            {currentStreak > 0 ? 'Consistency streak active!' : 'Study today to build a streak'}
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

          </div>
        </div>

      </div>

    </div>
  );
}
