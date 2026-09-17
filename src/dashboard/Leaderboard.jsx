import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatHours } from '../utils/helpers';
import { getStudentSyllabus } from '../data/syllabusData';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Award, Flame, UserCheck, ShieldCheck, Sparkles, Calendar, BookOpenCheck, Filter, Star } from 'lucide-react';

export default function Leaderboard() {
  const { currentUser } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'CA Foundation', 'CA Intermediate', 'CMA Foundation', 'CMA Intermediate'

  useEffect(() => {
    // Real-time listener for users collection sorted by points descending
    const q = query(
      collection(db, 'users'),
      orderBy('points', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map((doc) => {
        const data = doc.data();
        const syllabusInfo = getStudentSyllabus(data.course, data.level);
        const completedCount = data.syllabusCompletedCount || (data.syllabusCompleted ? Object.keys(data.syllabusCompleted).length : 0);
        const totalChapters = syllabusInfo.totalChaptersCount || 1;
        const progressPct = Math.min(100, Math.round((completedCount / totalChapters) * 100));

        return {
          uid: doc.id,
          ...data,
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
  }, []);

  if (loading) {
    return <LoadingSpinner text="Fetching live leaderboard..." />;
  }

  // Filter out admin accounts while keeping all real registered students
  const activeStudents = leaderboardData
    .filter(u => 
      u.role !== 'admin' && 
      u.email?.toLowerCase() !== 'vaultstore27@gmail.com' &&
      u.email?.toLowerCase() !== 'thunderworld766@gmail.com'
    )
    .map((u) => {
      const courseKey = u.course === 'CMA' || u.course?.includes('CMA') ? 'CMA' : 'CA';
      const levelKey = u.level === 'Intermediate' || u.course?.includes('Intermediate') ? 'Intermediate' : 'Foundation';
      const fullCategory = `${courseKey} ${levelKey}`;

      return {
        ...u,
        name: u.name || 'Student',
        courseKey,
        levelKey,
        fullCategory
      };
    });

  // Category Filtering
  const filteredStudents = activeStudents
    .filter(student => {
      if (categoryFilter === 'all') return true;
      return student.fullCategory === categoryFilter;
    })
    .map((student, index) => ({
      ...student,
      rank: index + 1
    }));

  const userRankEntry = filteredStudents.find(s => s.uid === currentUser?.uid);
  const topThree = filteredStudents.slice(0, 3);

  // Check if today is Sunday (0)
  const isSunday = new Date().getDay() === 0;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Real-Time Leaderboard</span>
            </div>
            {isSunday && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>Sunday Weekly Leaderboard Live</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            CA/CMA <span className="gold-gradient-text">Weekly Live Leaderboard</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Rankings are calculated automatically from real database progress. Tick syllabus chapters and log study sessions to earn points and claim top positions!
          </p>
        </div>
      </div>

      {/* Category Selection Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 glass-card rounded-2xl border border-white/10 scrollbar-none">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            categoryFilter === 'all'
              ? 'bg-gold-500 text-navy-950 font-black shadow-glow-gold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All Students ({activeStudents.length})
        </button>

        <button
          onClick={() => setCategoryFilter('CA Foundation')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            categoryFilter === 'CA Foundation'
              ? 'bg-royal-600 text-white font-black shadow-glow-blue'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          CA Foundation
        </button>

        <button
          onClick={() => setCategoryFilter('CA Intermediate')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            categoryFilter === 'CA Intermediate'
              ? 'bg-royal-600 text-white font-black shadow-glow-blue'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          CA Intermediate
        </button>

        <button
          onClick={() => setCategoryFilter('CMA Foundation')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            categoryFilter === 'CMA Foundation'
              ? 'bg-amber-500 text-navy-950 font-black shadow-glow-gold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          CMA Foundation
        </button>

        <button
          onClick={() => setCategoryFilter('CMA Intermediate')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            categoryFilter === 'CMA Intermediate'
              ? 'bg-amber-500 text-navy-950 font-black shadow-glow-gold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          CMA Intermediate
        </button>
      </div>

      {/* Logged-In User Live Rank Summary Card */}
      {userRankEntry && (
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-royal-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl bg-gradient-to-r from-royal-950/60 via-navy-900/80 to-navy-950">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-600 p-0.5 shadow-glow-gold flex items-center justify-center font-black text-2xl text-navy-950">
              #{userRankEntry.rank}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Live Rank</div>
              <div className="text-lg font-black text-white flex items-center gap-2">
                <span>{userRankEntry.name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-royal-500/30 border border-royal-400/40 text-royal-300 text-xs font-bold">
                  Rank #{userRankEntry.rank} of {filteredStudents.length}
                </span>
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

      {/* Main Leaderboard Table */}
      {filteredStudents.length === 0 ? (
        <EmptyState 
          icon={Trophy}
          title="No student rankings in this category yet"
          description="Register and complete syllabus chapters or timer sessions to build your leaderboard rank."
        />
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          
          {/* Table Header */}
          <div className="grid grid-cols-12 px-6 py-4 bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
            <div className="col-span-6 sm:col-span-4">Student</div>
            <div className="hidden sm:block col-span-3">Course & Attempt</div>
            <div className="hidden sm:block col-span-2 text-center">Syllabus Progress</div>
            <div className="col-span-4 sm:col-span-2 text-right">Points</div>
          </div>

          {/* Leaderboard List */}
          <div className="divide-y divide-white/5">
            {filteredStudents.map((student) => {
              const isCurrentUser = student.uid === currentUser?.uid;

              return (
                <div
                  key={student.uid}
                  className={`grid grid-cols-12 px-6 py-4 items-center transition-colors ${
                    isCurrentUser 
                      ? 'bg-royal-600/20 border-l-4 border-royal-500' 
                      : 'hover:bg-white/5'
                  }`}
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-royal-600 to-gold-500 p-0.5 shrink-0">
                      <div className="w-full h-full bg-navy-950 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{student.name}</span>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full bg-royal-500/30 border border-royal-500/50 text-[10px] font-extrabold text-royal-300">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 sm:hidden">
                        {student.fullCategory} • {student.progressPct}% ({student.completedCount} chs)
                      </div>
                    </div>
                  </div>

                  {/* Course & Attempt (Desktop) */}
                  <div className="hidden sm:block col-span-3 text-xs text-slate-300">
                    <span className="px-2.5 py-1 rounded-lg bg-navy-900 border border-white/10 font-semibold text-emerald-400">
                      {student.fullCategory} {student.attempt ? `(${student.attempt})` : ''}
                    </span>
                  </div>

                  {/* Syllabus Progress % (Desktop) */}
                  <div className="hidden sm:block col-span-2 text-center">
                    <div className="text-sm font-bold text-emerald-400 font-mono">{student.progressPct}%</div>
                    <div className="text-[11px] text-slate-400">{student.completedCount} chapters</div>
                  </div>

                  {/* Points & Hours */}
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

    </div>
  );
}
