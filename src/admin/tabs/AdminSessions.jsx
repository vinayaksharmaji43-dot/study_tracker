import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatTimerTime, formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { Clock, Search, Filter, Calendar, BookOpen } from 'lucide-react';

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);

  const [studentFilter, setStudentFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubSessions = onSnapshot(collection(db, 'studySessions'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dbDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dbDate - da;
      });
      setSessions(docs);
    });

    const unsubStudents = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSessions();
      unsubStudents();
    };
  }, []);

  const getStudentName = (uid) => {
    const found = students.find(s => (s.id || s.uid) === uid);
    return found ? found.name : 'Student';
  };

  const uniqueSubjects = Array.from(new Set(sessions.map(s => s.subject).filter(Boolean)));

  const filteredSessions = sessions.filter(session => {
    const name = getStudentName(session.uid).toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || (session.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStudent = studentFilter === 'all' || session.uid === studentFilter;
    const matchesSubject = subjectFilter === 'all' || session.subject === subjectFilter;

    return matchesSearch && matchesStudent && matchesSubject;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>Study Timer Logs Oversight</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Genuine Study <span className="gold-gradient-text">Sessions Monitor</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Monitor real-time recorded timer sessions across CA Foundation & CMA subjects.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Students</option>
            {students.filter(s => s.role !== 'admin').map(s => (
              <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>
            ))}
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Subjects</option>
            {uniqueSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      {filteredSessions.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No study sessions recorded"
          description="Study timer activity recorded by students will show up here."
        />
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-center">Duration</th>
                  <th className="px-6 py-4 text-right">Points Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredSessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-white/5 transition-colors">
                    
                    <td className="px-6 py-4 font-bold text-white">
                      {getStudentName(sess.uid)}
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-emerald-400">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        {sess.subject}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-300">
                      {formatDate(sess.date)}
                    </td>

                    <td className="px-6 py-4 text-center font-mono font-bold text-white">
                      {formatTimerTime(sess.duration)}
                    </td>

                    <td className="px-6 py-4 text-right font-black text-gold-400 font-mono">
                      +{(sess.duration / 3600 * 10).toFixed(0)} PTS
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
