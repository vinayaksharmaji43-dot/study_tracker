import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Radio, Flame, Sparkles, ChevronRight, BarChart3 } from 'lucide-react';
import { calculateStudentLevel, getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../utils/levelSystem';
import StudentProfileModal from './StudentProfileModal';

import { useActiveSessionsTracker, formatLiveTimer } from '../hooks/useActiveSessionsTracker';

function getBadge(durationSecs) {
  const hours = durationSecs / 3600;
  if (hours >= 5) return { text: '💎 Unstoppable', color: 'text-cyan-400', bg: 'bg-cyan-400/20' };
  if (hours >= 4) return { text: '🏆 Study Beast', color: 'text-gold-400', bg: 'bg-gold-500/20' };
  if (hours >= 3) return { text: '⚡ Deep Focus', color: 'text-purple-400', bg: 'bg-purple-500/20' };
  if (hours >= 2) return { text: '🔥 Locked In', color: 'text-rose-400', bg: 'bg-rose-500/20' };
  if (hours >= 1) return { text: '🟢 Focused', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  return null;
}

export default function LiveStudyNow({ onSelectStudent }) {
  const { currentUser, userProfile } = useAuth();
  const { activeSessionsList } = useActiveSessionsTracker(currentUser, userProfile);
  const [levelConfigs, setLevelConfigs] = useState({});
  const [localSelectedStudent, setLocalSelectedStudent] = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'levelConfigs'), (snapshot) => {
      const configs = {};
      snapshot.docs.forEach(configDoc => {
        configs[configDoc.id] = normalizeLevelConfig(configDoc.data().levels, configDoc.id);
      });
      setLevelConfigs(configs);
    });
  }, []);

  const validSessions = activeSessionsList;

  const handleCardClick = (session) => {
    if (onSelectStudent) {
      onSelectStudent(session);
    } else {
      setLocalSelectedStudent(session);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
            Live Study Now
          </h2>
          <p className="text-sm text-slate-400 mt-1">Students who are currently studying globally across all streams.</p>
        </div>

        <span className="text-xs font-semibold text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 hidden sm:inline-flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-gold-400" />
          <span>Click any student to view profile & stats</span>
        </span>
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
                onClick={() => handleCardClick(s)}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between cursor-pointer group hover:scale-[1.01] hover:border-gold-500/40 hover:shadow-lg ${
                  isMe 
                    ? 'bg-royal-600/10 border-royal-500/30 shadow-lg shadow-royal-900/20 hover:border-royal-400/50' 
                    : 'bg-navy-900/60 border-white/5 hover:bg-navy-900/90'
                }`}
                title="Click to view student profile & study statistics"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h3 className="text-sm font-black text-white truncate max-w-[120px] sm:max-w-[150px] uppercase flex items-center gap-1 group-hover:text-gold-400 transition-colors">
                          <span>{s.displayName}</span>
                          <span title={`Level ${liveLevel.currentLevelNumber}: ${liveLevel.currentLevelName}`}>
                            {liveLevel.badge}
                          </span>
                        </h3>
                      </div>

                      {/* 🟢 Online tag */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Online</span>
                      </span>
                      
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

                <div className="mt-auto flex items-center justify-between pt-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950/80 border border-emerald-500/25 shadow-inner">
                    <span className="text-emerald-400 text-xs animate-pulse">⏱</span>
                    <span className="text-sm font-mono font-bold text-white tracking-wide">
                      {s.formattedDuration || formatLiveTimer(s.elapsedSeconds || s.durationSecs || 0)}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-400 group-hover:text-gold-400 transition-colors flex items-center gap-1">
                    <span>Profile & Stats</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standalone fallback modal if not managed by parent */}
      {!onSelectStudent && localSelectedStudent && (
        <StudentProfileModal
          student={localSelectedStudent}
          activeSession={localSelectedStudent}
          onClose={() => setLocalSelectedStudent(null)}
        />
      )}
    </div>
  );
}
