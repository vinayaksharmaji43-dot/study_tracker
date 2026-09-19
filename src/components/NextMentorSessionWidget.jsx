import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Video, Calendar, Clock, PlayCircle, ExternalLink } from 'lucide-react';

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

export default function NextMentorSessionWidget({ setActiveTab }) {
  const { userProfile } = useAuth();
  const [nextSession, setNextSession] = useState(null);
  const [status, setStatus] = useState(null);
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
      let liveSession = null;
      let closestUpcoming = null;

      filtered.forEach(sess => {
        const startDate = new Date(`${sess.date}T${sess.startTime || '00:00'}`);
        const endDateTime = sess.endTime 
          ? new Date(`${sess.date}T${sess.endTime}`) 
          : new Date(startDate.getTime() + 60 * 60 * 1000);

        if (now >= startDate && now <= endDateTime) {
          if (!liveSession || startDate < new Date(`${liveSession.date}T${liveSession.startTime}`)) {
            liveSession = sess;
          }
        } else if (now < startDate) {
          if (!closestUpcoming || startDate < new Date(`${closestUpcoming.date}T${closestUpcoming.startTime}`)) {
            closestUpcoming = sess;
          }
        }
      });

      if (liveSession) {
        setNextSession(liveSession);
        setStatus('live');
      } else if (closestUpcoming) {
        setNextSession(closestUpcoming);
        setStatus('upcoming');
      } else {
        setNextSession(null);
        setStatus(null);
      }
      setLoading(false);
    };

    const unsub = onSnapshot(q, (snapshot) => {
      allFetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processSessions();
    });

    const intervalId = setInterval(processSessions, 60000);

    return () => {
      unsub();
      clearInterval(intervalId);
    };
  }, [userProfile?.course, userProfile?.level, userProfile?.attempt]);

  if (loading || !nextSession) return null;

  return (
    <div className={`p-5 rounded-2xl glass-card border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${
      status === 'live' ? 'border-red-500/40 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
    }`}>
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          status === 'live' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          <Video className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-white">{nextSession.title}</h4>
            {status === 'live' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-500 text-white animate-pulse">
                Live Now
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400">Next Mentor Session</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300">
             <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-400"/> {nextSession.date}</span>
             <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gold-400"/> {nextSession.startTime}</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 w-full sm:w-auto">
        {status === 'live' ? (
          <a
            href={nextSession.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition"
          >
            <PlayCircle className="w-4 h-4" />
            Join Meeting
          </a>
        ) : (
          <button
            onClick={() => setActiveTab('mentor')}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition"
          >
            <ExternalLink className="w-4 h-4" />
            View Session
          </button>
        )}
      </div>
    </div>
  );
}
