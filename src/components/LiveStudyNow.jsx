import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Radio, Flame, Sparkles, ChevronRight, BarChart3 } from 'lucide-react';
import { calculateStudentLevel, getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../utils/levelSystem';
import StudentProfileModal from './StudentProfileModal';

import { useActiveSessionsTracker, formatLiveTimer } from '../hooks/useActiveSessionsTracker';
import { useTheme } from '../contexts/ThemeContext';

function getBadge(durationSecs, isEyeCare = false) {
  const hours = durationSecs / 3600;
  if (hours >= 5) return { 
    text: '💎 Unstoppable', 
    color: isEyeCare ? 'text-cyan-400' : 'text-cyan-950 font-black', 
    bg: isEyeCare ? 'bg-cyan-400/20' : 'bg-cyan-100 border border-cyan-300' 
  };
  if (hours >= 4) return { 
    text: '🏆 Study Beast', 
    color: isEyeCare ? 'text-gold-400' : 'text-amber-950 font-black', 
    bg: isEyeCare ? 'bg-gold-500/20' : 'bg-amber-100 border border-amber-300' 
  };
  if (hours >= 3) return { 
    text: '⚡ Deep Focus', 
    color: isEyeCare ? 'text-purple-400' : 'text-purple-950 font-black', 
    bg: isEyeCare ? 'bg-purple-500/20' : 'bg-purple-100 border border-purple-300' 
  };
  if (hours >= 2) return { 
    text: '🔥 Locked In', 
    color: isEyeCare ? 'text-rose-400' : 'text-rose-950 font-black', 
    bg: isEyeCare ? 'bg-rose-500/20' : 'bg-rose-100 border border-rose-300' 
  };
  if (hours >= 1) return { 
    text: '🟢 Focused', 
    color: isEyeCare ? 'text-emerald-400' : 'text-emerald-950 font-black', 
    bg: isEyeCare ? 'bg-emerald-500/20' : 'bg-emerald-100 border border-emerald-300' 
  };
  return null;
}

export default function LiveStudyNow({ onSelectStudent }) {
  const { currentUser, userProfile } = useAuth();
  const { isEyeCare } = useTheme();
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
          <h2 className={`text-xl font-black flex items-center gap-2 ${
            isEyeCare ? 'text-white' : 'text-slate-950 font-black'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
            Live Study Now
          </h2>
          <p className={`text-sm mt-1 font-medium ${
            isEyeCare ? 'text-slate-400' : 'text-slate-700 font-bold'
          }`}>Students who are currently studying globally across all streams.</p>
        </div>

        <span className={`text-xs px-3 py-1.5 rounded-xl border hidden sm:inline-flex items-center gap-1.5 font-bold ${
          isEyeCare 
            ? 'text-slate-300 bg-white/5 border-white/10' 
            : 'text-blue-950 bg-blue-50 border-blue-200 font-extrabold shadow-xs'
        }`}>
          <BarChart3 className={`w-3.5 h-3.5 ${isEyeCare ? 'text-gold-400' : 'text-blue-600'}`} />
          <span>Click any student to view profile & stats</span>
        </span>
      </div>

      {validSessions.length === 0 ? (
        <div className={`p-8 rounded-3xl text-center space-y-2 border ${
          isEyeCare 
            ? 'glass-card border-white/5' 
            : 'bg-white border-2 border-blue-200 shadow-sm'
        }`}>
          <div className="text-3xl mb-2">😴</div>
          <div className={`text-sm font-black ${isEyeCare ? 'text-slate-300' : 'text-slate-900 font-black'}`}>No students are studying right now.</div>
          <div className={`text-xs font-bold ${isEyeCare ? 'text-slate-500' : 'text-slate-600'}`}>Start your timer and become the first one!</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {validSessions.map((s) => {
            const badge = getBadge(Math.max(0, s.durationSecs), isEyeCare);
            const isMe = s.studentId === currentUser?.uid;
            const streamId = getStreamId(s.course, s.level);
            const liveLevel = calculateStudentLevel(s.points || 0, levelConfigs[streamId] || getDefaultStreamLevels(streamId));

            return (
              <div 
                key={s.id} 
                onClick={() => handleCardClick(s)}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between cursor-pointer group hover:scale-[1.01] hover:shadow-lg ${
                  isMe 
                    ? (isEyeCare 
                        ? 'bg-royal-600/10 border-royal-500/30 shadow-lg shadow-royal-900/20 hover:border-royal-400/50' 
                        : 'bg-blue-50/80 border-2 border-blue-400 shadow-sm hover:border-blue-500') 
                    : (isEyeCare 
                        ? 'bg-navy-900/60 border-white/5 hover:bg-navy-900/90 hover:border-gold-500/40' 
                        : 'bg-white border-2 border-blue-200/90 hover:border-blue-400 shadow-sm hover:bg-slate-50')
                }`}
                title="Click to view student profile & study statistics"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h3 className={`text-sm font-black truncate max-w-[120px] sm:max-w-[150px] uppercase flex items-center gap-1 transition-colors ${
                          isEyeCare ? 'text-white group-hover:text-gold-400' : 'text-slate-950 group-hover:text-blue-700 font-black'
                        }`}>
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
                    <div className={`text-xs font-bold mt-1 ${
                      isEyeCare ? 'text-slate-400' : 'text-slate-700 font-bold'
                    }`}>
                      {s.course} {s.level} • {s.attempt}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-1">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    isEyeCare 
                      ? 'bg-navy-950/80 border-emerald-500/25 shadow-inner' 
                      : 'bg-emerald-50 border-2 border-emerald-300 shadow-xs'
                  }`}>
                    <span className="text-emerald-500 text-xs animate-pulse font-black">⏱</span>
                    <span className={`text-sm font-mono font-black tracking-wide ${
                      isEyeCare ? 'text-white' : 'text-emerald-950 font-black'
                    }`}>
                      {s.formattedDuration || formatLiveTimer(s.elapsedSeconds || s.durationSecs || 0)}
                    </span>
                  </div>

                  <span className={`text-[11px] font-black transition-colors flex items-center gap-1 ${
                    isEyeCare 
                      ? 'text-slate-400 group-hover:text-gold-400' 
                      : 'text-blue-800 group-hover:text-blue-950 font-black'
                  }`}>
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
