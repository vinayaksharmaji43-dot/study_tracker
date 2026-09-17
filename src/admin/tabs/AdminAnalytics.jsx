import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatHours, formatTimerTime } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { TrendingUp, Clock, Calendar, BookOpen, Target, Award, Sparkles } from 'lucide-react';

export default function AdminAnalytics() {
  const [sessions, setSessions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const unsubSessions = onSnapshot(collection(db, 'studySessions'), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTargets = onSnapshot(collection(db, 'targets'), (snapshot) => {
      setTargets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubStudents = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSessions();
      unsubTargets();
      unsubStudents();
    };
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Time calculations
  let todaySeconds = 0;
  let weeklySeconds = 0;
  let monthlySeconds = 0;
  let totalSeconds = 0;

  const subjectBreakdown = {};

  sessions.forEach(session => {
    const dur = session.duration || 0;
    totalSeconds += dur;

    const sDate = session.date?.toDate ? session.date.toDate() : new Date(session.date);
    if (sDate) {
      if (sDate.toISOString().split('T')[0] === todayStr) {
        todaySeconds += dur;
      }
      if (sDate >= sevenDaysAgo) {
        weeklySeconds += dur;
      }
      if (sDate >= thirtyDaysAgo) {
        monthlySeconds += dur;
      }
    }

    const sub = session.subject || 'General';
    subjectBreakdown[sub] = (subjectBreakdown[sub] || 0) + dur;
  });

  const totalTargetsCount = targets.length;
  const completedTargetsCount = targets.filter(t => t.completed).length;
  const pendingTargetsCount = totalTargetsCount - completedTargetsCount;

  const totalPointsEarned = students
    .filter(s => s.role !== 'admin')
    .reduce((acc, curr) => acc + (curr.points || 0), 0);

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Platform Study Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Study Analytics <span className="gold-gradient-text">Engine</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Real-time calculation of overall platform study hours, subject breakdown, and target completions.
          </p>
        </div>
      </div>

      {/* Main Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Study Hours</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{formatHours(totalSeconds, true)}</div>
          <div className="text-xs text-emerald-400 font-semibold">Across all student sessions</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Study Hours</span>
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{formatHours(todaySeconds, true)}</div>
          <div className="text-xs text-slate-400">Logged today</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Study Hours</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{formatHours(weeklySeconds, true)}</div>
          <div className="text-xs text-slate-400">Last 7 calendar days</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Study Hours</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{formatHours(monthlySeconds, true)}</div>
          <div className="text-xs text-slate-400">Last 30 calendar days</div>
        </div>

      </div>

      {/* Subject-Wise Breakdown & Targets Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Subject-Wise Time Distribution */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span>Subject-Wise Study Time Breakdown</span>
          </h3>

          {Object.keys(subjectBreakdown).length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No study sessions logged yet"
              description="As students use the study timer for Accounting, Laws, Economics & Tax, real time breakdowns will populate here."
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(subjectBreakdown).map(([subjectName, sec]) => {
                const pct = totalSeconds > 0 ? Math.round((sec / totalSeconds) * 100) : 0;

                return (
                  <div key={subjectName} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-white">{subjectName}</span>
                      <span className="text-emerald-400 font-bold">{formatHours(sec, true)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-navy-950 rounded-full h-2.5 overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-gold-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Target Milestone Stats */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-gold-400" />
            <span>Target Milestone Overview</span>
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Total Targets Created</div>
                <div className="text-2xl font-black text-white">{totalTargetsCount}</div>
              </div>
              <Target className="w-8 h-8 text-cyan-400" />
            </div>

            <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Completed Targets</div>
                <div className="text-2xl font-black text-emerald-400">{completedTargetsCount}</div>
              </div>
              <Award className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Pending Targets</div>
                <div className="text-2xl font-black text-amber-400">{pendingTargetsCount}</div>
              </div>
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
