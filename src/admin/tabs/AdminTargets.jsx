import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { Target, Search, CheckCircle2, Circle, Calendar } from 'lucide-react';

export default function AdminTargets() {
  const [targets, setTargets] = useState([]);
  const [students, setStudents] = useState([]);

  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [studentFilter, setStudentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubTargets = onSnapshot(collection(db, 'targets'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dbDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dbDate - da;
      });
      setTargets(docs);
    });

    const unsubStudents = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTargets();
      unsubStudents();
    };
  }, []);

  const getStudentName = (uid) => {
    const found = students.find(s => (s.id || s.uid) === uid);
    return found ? found.name : 'Student';
  };

  const filteredTargets = targets.filter(target => {
    const name = getStudentName(target.uid).toLowerCase();
    const title = (target.title || '').toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || title.includes(searchQuery.toLowerCase());
    
    const matchesStudent = studentFilter === 'all' || target.uid === studentFilter;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'completed' && target.completed) || 
      (statusFilter === 'pending' && !target.completed);

    return matchesSearch && matchesStudent && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/30">
            <Target className="w-3.5 h-3.5" />
            <span>Student Daily Goal Monitoring</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Target Milestones <span className="gold-gradient-text">Hub</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Monitor self-managed study goals created by CA Foundation & CMA students.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student or target title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-gold-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-gold-500"
          >
            <option value="all">All Students</option>
            {students.filter(s => s.role !== 'admin').map(s => (
              <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-gold-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Targets Table */}
      {filteredTargets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No targets found"
          description="Targets created by students will be monitored here."
        />
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Target Title</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4 text-center">Target Duration</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredTargets.map((target) => (
                  <tr key={target.id} className="hover:bg-white/5 transition-colors">
                    
                    <td className="px-6 py-4 font-bold text-white">
                      {getStudentName(target.uid)}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-200">
                      {target.title}
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-gold-400">
                      <span className="px-2.5 py-1 rounded-lg bg-navy-900 border border-white/10">
                        {target.subject}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-white">
                      {target.targetHours} Hours
                    </td>

                    <td className="px-6 py-4 text-right">
                      {target.completed ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Completed
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 inline-flex items-center gap-1">
                          <Circle className="w-3.5 h-3.5 text-amber-400" />
                          Pending
                        </span>
                      )}
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
