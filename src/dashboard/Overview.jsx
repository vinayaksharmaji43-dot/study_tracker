import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatHours, formatTimerTime, calculateStreak, formatDate, getDateKey } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
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
  Send,
  Camera,
  MessageCircle,
  Users
} from 'lucide-react';

export default function Overview({ setActiveTab }) {
  const { userProfile, currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dayOffs, setDayOffs] = useState([]);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real-time user sessions, targets, and published announcements
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Listen to announcements
    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => a.published !== false);
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

    return () => {
      unsubAnnouncements();
      unsubSessions();
      unsubDayOffs();
      unsubTargets();
      unsubUsers();
    };
  }, [currentUser]);

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

  const communityLinks = [
    { name: 'Telegram', url: 'https://t.me/Ca_foundation_help', icon: Send, color: 'text-violet-400 bg-violet-500/20' },
    { name: 'YouTube', url: 'https://youtube.com/@casuccessblueprint?si=_eCZhlzUlwn9DnnT', icon: Play, color: 'text-red-400 bg-red-500/20' },
    { name: 'Instagram', url: 'https://www.instagram.com/ca_success_blueprint?igsh=eDZtbGQxa2lsanVi', icon: Camera, color: 'text-pink-400 bg-pink-500/20' },
    { name: 'WhatsApp', url: 'https://whatsapp.com/channel/0029Vb8IO0XAu3aMmUjkKW3o', icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/20' },
  ];

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
            {announcements.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{a.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

            <div className="p-4 rounded-xl bg-navy-900/60 border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Join Community</div>
                  <div className="text-xs text-slate-400">Connect with mentors & students</div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {communityLinks.map(({ name, url, icon: Icon, color }) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-gold-500/40 hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md ${color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {name}
                    </span>
                    <span className="text-xs text-slate-400">Open</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
