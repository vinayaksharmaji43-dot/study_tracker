import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatHours } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Award, Flame, UserCheck, ShieldCheck, Sparkles } from 'lucide-react';

export default function Leaderboard() {
  const { currentUser } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for users collection sorted by points descending
    const q = query(
      collection(db, 'users'),
      orderBy('points', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map((doc, index) => ({
        uid: doc.id,
        rank: index + 1,
        ...doc.data()
      }));
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

  // Filter out admin accounts while keeping all registered students
  const activeStudents = leaderboardData
    .filter(u => 
      u.role !== 'admin' && 
      u.email?.toLowerCase() !== 'vaultstore27@gmail.com' &&
      u.email?.toLowerCase() !== 'thunderworld766@gmail.com'
    )
    .map((u, index) => ({
      ...u,
      name: u.name || u.email?.split('@')[0] || 'Student',
      rank: index + 1
    }));

  const userRankEntry = activeStudents.find(s => s.uid === currentUser?.uid);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Genuine Leaderboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            CA/CMA <span className="gold-gradient-text">Live Leaderboard</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Rankings are updated automatically in real-time for all registered students as study sessions and daily targets are completed.
          </p>
        </div>
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
                  Rank #{userRankEntry.rank} of {activeStudents.length}
                </span>
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

      {activeStudents.length === 0 ? (
        <EmptyState 
          icon={Trophy}
          title="Start studying to build your leaderboard position."
          description="Log your study sessions using the timer or complete daily targets to earn points and claim your spot."
        />
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          
          {/* Table Header */}
          <div className="grid grid-cols-12 px-6 py-4 bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
            <div className="col-span-6 sm:col-span-5">Student</div>
            <div className="hidden sm:block col-span-3">Course & Attempt</div>
            <div className="col-span-4 sm:col-span-3 text-right">Study Hours & Points</div>
          </div>

          {/* Leaderboard List */}
          <div className="divide-y divide-white/5">
            {activeStudents.map((student) => {
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
                      <span className="text-slate-400 text-sm">#{student.rank}</span>
                    )}
                  </div>

                  {/* Student Name */}
                  <div className="col-span-6 sm:col-span-5 flex items-center space-x-3">
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
                        {student.role === 'admin' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 sm:hidden">
                        {student.course} {student.attempt ? `• ${student.attempt}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Course & Attempt (Desktop) */}
                  <div className="hidden sm:block col-span-3 text-xs text-slate-300">
                    <span className="px-2.5 py-1 rounded-lg bg-navy-900 border border-white/10 font-semibold">
                      {student.course || 'CA Foundation'} {student.attempt ? `(${student.attempt})` : ''}
                    </span>
                  </div>

                  {/* Points & Hours */}
                  <div className="col-span-4 sm:col-span-3 text-right">
                    <div className="text-sm font-black text-gold-400 font-mono">
                      {student.points || 0} <span className="text-xs font-normal text-slate-400">PTS</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatHours(student.studyHours || 0)} total study
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
