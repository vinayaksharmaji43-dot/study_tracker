import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Radio, Flame, Sparkles } from 'lucide-react';
import { calculateStudentLevel, getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../utils/levelSystem';

function getBadge(durationSecs) {
  const hours = durationSecs / 3600;
  if (hours >= 5) return { text: '💎 Unstoppable', color: 'text-cyan-400', bg: 'bg-cyan-400/20' };
  if (hours >= 4) return { text: '🏆 Study Beast', color: 'text-gold-400', bg: 'bg-gold-500/20' };
  if (hours >= 3) return { text: '⚡ Deep Focus', color: 'text-purple-400', bg: 'bg-purple-500/20' };
  if (hours >= 2) return { text: '🔥 Locked In', color: 'text-rose-400', bg: 'bg-rose-500/20' };
  if (hours >= 1) return { text: '🟢 Focused', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  return null;
}

function formatLiveDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  }
  return `${m}m`;
}

export default function LiveStudyNow() {
  const { currentUser } = useAuth();
  const [activeSessions, setActiveSessions] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [levelConfigs, setLevelConfigs] = useState({});

  useEffect(() => {
    return onSnapshot(collection(db, 'levelConfigs'), (snapshot) => {
      const configs = {};
      snapshot.docs.forEach(configDoc => {
        configs[configDoc.id] = normalizeLevelConfig(configDoc.data().levels, configDoc.id);
      });
      setLevelConfigs(configs);
    });
  }, []);

  // 1. Fetch active sessions from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'activeStudySessions'),
      where('active', '==', true)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveSessions(docs);
    });

    return () => unsub();
  }, []);

  // 2. Local Tick for UI (every second)
  useEffect(() => {
    const timerId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  // 3. Filter and Sort
  // Stale check: if lastUpdatedAt is older than 2 minutes (120,000 ms), drop it.
  const validSessions = activeSessions
    .filter(s => {
      // Allow 2 minutes of stale time for brief network drops
      return (now - (s.lastUpdatedAt || s.startedAt)) < 120000;
    })
    .map(s => {
      const durationSecs = Math.floor((now - s.startedAt) / 1000);
      return { ...s, durationSecs };
    })
    .sort((a, b) => b.durationSecs - a.durationSecs); // Highest duration first

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
          Live Study Now
        </h2>
        <p className="text-sm text-slate-400 mt-1">Students who are currently studying globally.</p>
      </div>

      {validSessions.length === 0 ? (
        <div className="p-8 rounded-3xl glass-card border border-white/5 text-center space-y-2">
          <div className="text-3xl mb-2">😴</div>
          <div className="text-sm font-bold text-slate-300">No students are studying right now.</div>
          <div className="text-xs text-slate-500">Start your timer and become the first one!</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {validSessions.map((s) => {
            const badge = getBadge(Math.max(0, s.durationSecs));
            const isMe = s.studentId === currentUser?.uid;
            const streamId = getStreamId(s.course, s.level);
            const liveLevel = calculateStudentLevel(s.points || 0, levelConfigs[streamId] || getDefaultStreamLevels(streamId));

            return (
              <div 
                key={s.id} 
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                  isMe ? 'bg-royal-600/10 border-royal-500/30 shadow-lg shadow-royal-900/20' : 'bg-navy-900/60 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <h3 className="text-sm font-black text-white truncate max-w-[120px] sm:max-w-[150px] uppercase flex items-center gap-1">
                          <span>{s.displayName}</span>
                          <span title={`Level ${liveLevel.currentLevelNumber}: ${liveLevel.currentLevelName}`}>
                            {liveLevel.badge} {liveLevel.currentLevelName}
                          </span>
                        </h3>
                      </div>
                      
                      {badge && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider shrink-0 ${badge.bg} ${badge.color}`}>
                          {badge.text}
                        </span>
                      )}
                      
                      {isMe && (
                        <span className="px-2 py-0.5 rounded bg-royal-500/20 text-royal-400 text-[10px] font-bold border border-royal-500/30 shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mt-1">
                      {s.course} {s.level} • {s.attempt}
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950/80 border border-white/5 shadow-inner">
                    <span className="text-slate-400 text-xs">⏱</span>
                    <span className="text-sm font-mono font-bold text-white tracking-wide">
                      {formatLiveDuration(Math.max(0, s.durationSecs))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
