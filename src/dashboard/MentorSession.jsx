import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Video, Calendar, Clock, User, ExternalLink, PlayCircle } from 'lucide-react';
import EmptyState from '../components/EmptyState';

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

function parseStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', attempt: '' };
  const rawCourse = String(userProfile.course || 'CA Foundation').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  
  if (rawCourse.includes('CMA')) course = 'CMA';
  
  const rawLevel = String(userProfile.level || '').toUpperCase();
  if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND')) level = 'Foundation';
  else if (userProfile.level) level = userProfile.level;
  
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

export default function MentorSession() {
  const { userProfile } = useAuth();
  const [sessions, setSessions] = useState({ upcoming: [], live: [], past: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'mentorSessions'),
      where('published', '==', true)
    );

    let allFetched = [];

    const processSessions = () => {
      const { course: myCourse, level: myLevel, attempt: myAttemptRaw } = parseStream(userProfile);
      const myAttempt = normalizeAttempt(myAttemptRaw);

      const filtered = allFetched.filter(sess => {
        if (sess.audienceType !== 'specific') return true;
        return (
          String(sess.course).toUpperCase() === String(myCourse).toUpperCase() &&
          String(sess.level).toUpperCase() === String(myLevel).toUpperCase() &&
          normalizeAttempt(sess.attempt) === myAttempt
        );
      });
      
      const now = new Date();
      const upcoming = [];
      const live = [];
      const past = [];

      filtered.forEach(sess => {
        const startDate = new Date(`${sess.date}T${sess.startTime || '00:00'}`);
        // If no end time, assume 1 hour duration
        const endDateTime = sess.endTime 
          ? new Date(`${sess.date}T${sess.endTime}`) 
          : new Date(startDate.getTime() + 60 * 60 * 1000);

        if (now > endDateTime) {
          past.push(sess);
        } else if (now >= startDate && now <= endDateTime) {
          live.push(sess);
        } else {
          upcoming.push(sess);
        }
      });

      // Sort logic
      upcoming.sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
      live.sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
      past.sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`));

      setSessions({ upcoming, live, past });
      setLoading(false);
    };

    const unsub = onSnapshot(q, (snapshot) => {
      allFetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processSessions();
    });

    // Re-evaluate live/upcoming status every minute
    const intervalId = setInterval(processSessions, 60000);

    return () => {
      unsub();
      clearInterval(intervalId);
    };
  }, [userProfile?.course, userProfile?.level, userProfile?.attempt]);

  const SessionCard = ({ session, status }) => (
    <div className="p-5 rounded-2xl glass-card border border-white/10 flex flex-col sm:flex-row gap-5 items-start sm:items-center hover:bg-white/5 transition-all">
      <div className={`p-4 rounded-xl shrink-0 flex items-center justify-center ${
        status === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
        status === 'upcoming' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
      }`}>
        <Video className="w-8 h-8" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">{session.title}</h3>
          {status === 'live' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500 text-white animate-pulse">
              Live Now
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            {session.date}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gold-400" />
            {session.startTime} {session.endTime ? `- ${session.endTime}` : ''}
          </div>
          {session.mentorName && (
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-400" />
              {session.mentorName}
            </div>
          )}
        </div>

        {session.description && (
          <p className="text-sm text-slate-300 line-clamp-2">{session.description}</p>
        )}
      </div>

      <div className="w-full sm:w-auto shrink-0 flex items-center justify-end">
        {status === 'live' ? (
          <a
            href={session.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-glow-red"
          >
            <PlayCircle className="w-4 h-4" />
            Join Live Meeting
          </a>
        ) : status === 'upcoming' ? (
          <a
            href={session.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
          >
            <ExternalLink className="w-4 h-4" />
            Join at Scheduled Time
          </a>
        ) : (
          <div className="px-6 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl text-sm border border-slate-700 w-full sm:w-auto text-center">
            Session Ended
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <Video className="w-3.5 h-3.5" />
            <span>Interactive Learning</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Mentor <span className="emerald-gradient-text">Sessions</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Join exclusive live mentoring and guidance sessions tailored for your exact attempt. Connect with top educators directly.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading your sessions...</div>
      ) : sessions.upcoming.length === 0 && sessions.live.length === 0 && sessions.past.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No Mentor Sessions"
          description="There are currently no mentor sessions scheduled for your stream. Check back later!"
        />
      ) : (
        <div className="space-y-8">
          {sessions.live.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                Live Now
              </h2>
              <div className="space-y-3">
                {sessions.live.map(sess => <SessionCard key={sess.id} session={sess} status="live" />)}
              </div>
            </div>
          )}

          {sessions.upcoming.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Upcoming Sessions
              </h2>
              <div className="space-y-3">
                {sessions.upcoming.map(sess => <SessionCard key={sess.id} session={sess} status="upcoming" />)}
              </div>
            </div>
          )}

          {sessions.past.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Past Sessions
              </h2>
              <div className="space-y-3 opacity-75 hover:opacity-100 transition-opacity">
                {sessions.past.map(sess => <SessionCard key={sess.id} session={sess} status="past" />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
