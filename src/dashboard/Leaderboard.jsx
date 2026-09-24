import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatHours } from '../utils/helpers';
import { getStudentSyllabus } from '../data/syllabusData';
import { calculateStudentLevel, getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../utils/levelSystem';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import LiveStudyNow from '../components/LiveStudyNow';
import StudentProfileModal from '../components/StudentProfileModal';
import { useActiveSessionsTracker } from '../hooks/useActiveSessionsTracker';
import { Trophy, Award, Flame, UserCheck, ShieldCheck, Sparkles, Calendar, BookOpenCheck, Filter, Star } from 'lucide-react';

export default function Leaderboard() {
  const { currentUser, userProfile } = useAuth();
  const { isStudentOnline, getStudentLiveDuration } = useActiveSessionsTracker(currentUser, userProfile);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dynamic syllabi mapping for correct totals
  const [syllabiMeta, setSyllabiMeta] = useState({});
  const [levelConfigs, setLevelConfigs] = useState({});

  // Student's stream parameters
  const userCourseKey = userProfile?.course === 'CMA' || userProfile?.course?.includes('CMA') ? 'CMA' : 'CA';
  const userLevelKey = userProfile?.level === 'Intermediate' || userProfile?.course?.includes('Intermediate') ? 'Intermediate' : 'Foundation';
  const defaultAttempt = userProfile?.attempt || (userCourseKey === 'CA' ? 'Jan 27' : 'June 27');

  const [activeAttempt, setActiveAttempt] = useState(defaultAttempt);

  // Update activeAttempt if userProfile attempt finishes loading
  useEffect(() => {
    if (userProfile?.attempt) {
      setActiveAttempt(userProfile.attempt);
    }
  }, [userProfile]);

  // Load syllabi metadata (total chapters)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'syllabi'), (snap) => {
      const meta = {};
      snap.docs.forEach(doc => {
        let total = 0;
        doc.data().subjects?.forEach(s => total += (s.chapters?.length || 0));
        meta[doc.id] = total;
      });
      setSyllabiMeta(meta);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'levelConfigs'), (snap) => {
      const configs = {};
      snap.docs.forEach(configDoc => {
        configs[configDoc.id] = normalizeLevelConfig(configDoc.data().levels, configDoc.id);
      });
      setLevelConfigs(configs);
    });
  }, []);

  useEffect(() => {
    // Real-time listener for users collection sorted by points descending
    const q = query(
      collection(db, 'users'),
      orderBy('points', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map((doc) => {
        const data = doc.data();
        
        const courseKey = data.course === 'CMA' || data.course?.includes('CMA') ? 'CMA' : 'CA';
        const levelKey = data.level === 'Intermediate' || data.course?.includes('Intermediate') ? 'Intermediate' : 'Foundation';
        const streamId = `${courseKey}_${levelKey}`;

        const completedCount = data.syllabusCompletedCount || (data.syllabusCompleted ? Object.keys(data.syllabusCompleted).length : 0);
        // Fallback to static count if dynamic meta isn't loaded yet
        const totalChapters = syllabiMeta[streamId] || 1;
        const progressPct = Math.min(100, Math.round((completedCount / totalChapters) * 100));

        return {
          uid: doc.id,
          ...data,
          courseKey,
          levelKey,
          completedCount,
          totalChapters,
          progressPct
        };
      });
      setLeaderboardData(users);
      setLoading(false);
    }, (err) => {
      console.error("Leaderboard subscription error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syllabiMeta]);

  if (loading) {
    return <LoadingSpinner text="Fetching live stream leaderboard..." />;
  }

  // Strictly filter out admins (except currentUser) and filter ONLY matching student Course + Level + Attempt
  const activeStreamStudents = leaderboardData
    .filter(u => {
      const isSelf = u.uid === currentUser?.uid;
      const isRoleAdmin = !isSelf && u.role === 'admin';
      const isSpecialAdmin = !isSelf && (
        u.email?.toLowerCase() === 'vaultstore27@gmail.com' ||
        u.email?.toLowerCase() === 'thunderworld766@gmail.com'
      );
      if (isRoleAdmin || isSpecialAdmin) return false;

      return (
        u.courseKey === userCourseKey &&
        u.levelKey === userLevelKey &&
        (u.attempt === activeAttempt || (activeAttempt === 'Jan 27' && u.attempt === 'January 2027') || (activeAttempt === 'Sep 27' && u.attempt === 'September 2027'))
      );
    })
    .map((u, index) => ({
      ...u,
      name: u.name || 'Student',
      rank: index + 1
    }));

  const userRankEntry = activeStreamStudents.find(s => s.uid === currentUser?.uid);
  const isSunday = new Date().getDay() === 0;

  // Available attempts for switching within student's stream
  const availableAttempts = userCourseKey === 'CA' 
    ? ['Jan 27', 'May 27', 'Sep 27']
    : ['Dec 26', 'June 27', 'Dec 27'];

  return (
    <div className="space-y-6">
      
      {/* Stream-Specific Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stream-Isolated Leaderboard</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
              {userCourseKey} {userLevelKey} Stream
            </span>
            {isSunday && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>Sunday Live Ranking</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            🏆 {userCourseKey} {userLevelKey} — <span className="gold-gradient-text">{activeAttempt} Live Leaderboard</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            You are competing exclusively with registered students in the <strong>{userCourseKey} {userLevelKey} ({activeAttempt})</strong> stream. No cross-stream mixing.
          </p>
        </div>
      </div>

      {/* Attempt Filter Tabs */}
      <div className="flex items-center space-x-2 p-1.5 glass-card rounded-2xl border border-white/10 overflow-x-auto scrollbar-none">
        <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider flex items-center gap-1 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-gold-400" />
          <span>Attempt:</span>
        </span>
        {availableAttempts.map((att) => (
          <button
            key={att}
            onClick={() => setActiveAttempt(att)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeAttempt === att
                ? 'bg-gold-500 text-navy-950 shadow-glow-gold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {att} {att === defaultAttempt ? '(Your Attempt)' : ''}
          </button>
        ))}
      </div>

      {/* Logged-In User Live Rank Summary Card */}
      {userRankEntry && (
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-royal-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl bg-gradient-to-r from-royal-950/60 via-navy-900/80 to-navy-950">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-600 p-0.5 shadow-glow-gold flex items-center justify-center font-black text-2xl text-navy-950">
              #{userRankEntry.rank}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Live Rank ({userCourseKey} {userLevelKey})</div>
              <div className="text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>{userRankEntry.name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-royal-500/30 border border-royal-400/40 text-royal-300 text-xs font-bold">
                  Rank #{userRankEntry.rank} of {activeStreamStudents.length}
                </span>
                {isStudentOnline(userRankEntry.uid) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online</span>
                    <span className="font-mono font-black text-white pl-1.5 border-l border-emerald-500/40">
                      ⏱ {getStudentLiveDuration(userRankEntry.uid)}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-xs text-gold-400 font-semibold mt-0.5">
                Syllabus Progress: {userRankEntry.progressPct}% ({userRankEntry.completedCount} chapters)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-6 text-right">
            <div>
              <div className="text-xs text-slate-400">Total Points</div>
              <div className="text-lg font-mono font-black text-gold-400">{userRankEntry.points || 0} PTS</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Logged Study</div>
              <div className="text-lg font-bold text-emerald-400">{formatHours(userRankEntry.studyHours || 0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stream-Specific Leaderboard Table */}
      {activeStreamStudents.length === 0 ? (
        <EmptyState 
          icon={Trophy}
          title={`No student rankings in ${userCourseKey} ${userLevelKey} (${activeAttempt}) yet`}
          description="Complete syllabus chapters to claim top ranking on your stream leaderboard."
        />
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          
          {/* Table Header */}
          <div className="grid grid-cols-12 px-6 py-4 bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
            <div className="col-span-6 sm:col-span-4">Student</div>
            <div className="hidden sm:block col-span-3">Completed Chapters</div>
            <div className="hidden sm:block col-span-2 text-center">Syllabus Progress</div>
            <div className="col-span-4 sm:col-span-2 text-right">Points</div>
          </div>

          {/* Leaderboard List */}
          <div className="divide-y divide-white/5">
            {activeStreamStudents.map((student) => {
              const isCurrentUser = student.uid === currentUser?.uid;

              return (
                <div
                  key={student.uid}
                  onClick={() => setSelectedStudent(student)}
                  className={`grid grid-cols-12 px-6 py-4 items-center transition-all cursor-pointer group hover:bg-white/10 ${
                    isCurrentUser 
                      ? 'bg-royal-600/20 border-l-4 border-royal-500' 
                      : 'hover:bg-white/5'
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

                  {/* Student Name */}
                  <div className="col-span-6 sm:col-span-4 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-royal-600 to-gold-500 p-0.5 shrink-0 group-hover:scale-105 transition-transform">
                      <div className="w-full h-full bg-navy-950 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white group-hover:text-gold-400 transition-colors">{student.name}</span>
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
                      <div className="text-[11px] text-gold-400 font-bold flex items-center gap-1 mt-0.5">
                        <span>{calculateStudentLevel(student.points, levelConfigs[getStreamId(student.courseKey, student.levelKey)] || getDefaultStreamLevels(getStreamId(student.courseKey, student.levelKey))).badge}</span>
                        <span>Level {calculateStudentLevel(student.points, levelConfigs[getStreamId(student.courseKey, student.levelKey)] || getDefaultStreamLevels(getStreamId(student.courseKey, student.levelKey))).currentLevelNumber} — {calculateStudentLevel(student.points, levelConfigs[getStreamId(student.courseKey, student.levelKey)] || getDefaultStreamLevels(getStreamId(student.courseKey, student.levelKey))).currentLevelName}</span>
                      </div>
                      <div className="text-xs text-slate-400 sm:hidden">
                        {student.progressPct}% ({student.completedCount} chs)
                      </div>
                    </div>
                  </div>

                  {/* Completed Chapters (Desktop) */}
                  <div className="hidden sm:block col-span-3 text-xs text-slate-300">
                    <span className="px-2.5 py-1 rounded-lg bg-navy-900 border border-white/10 font-semibold text-emerald-400">
                      {student.completedCount} / {student.totalChapters} Chapters
                    </span>
                  </div>

                  {/* Syllabus Progress % (Desktop) */}
                  <div className="hidden sm:block col-span-2 text-center">
                    <div className="text-sm font-bold text-emerald-400 font-mono">{student.progressPct}%</div>
                    <div className="text-[11px] text-slate-400">Completion</div>
                  </div>

                  {/* Points */}
                  <div className="col-span-4 sm:col-span-2 text-right">
                    <div className="text-sm font-black text-gold-400 font-mono">
                      {student.points || 0} <span className="text-xs font-normal text-slate-400">PTS</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatHours(student.studyHours || 0)} study
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Live Study Now Section */}
      <div className="pt-4 border-t border-white/10">
        <LiveStudyNow onSelectStudent={setSelectedStudent} />
      </div>

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
