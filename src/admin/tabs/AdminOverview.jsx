import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatHours, formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Clock, 
  Award, 
  HelpCircle, 
  FileText, 
  Megaphone,
  TrendingUp,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function AdminOverview({ setActiveTab }) {
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(docs);
    });

    // Real-time listener for studySessions
    const unsubSessions = onSnapshot(collection(db, 'studySessions'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(docs);
    });

    // Real-time listener for notes
    const unsubNotes = onSnapshot(collection(db, 'notes'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(docs);
    });

    // Real-time listener for doubts
    const unsubDoubts = onSnapshot(collection(db, 'doubts'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDoubts(docs);
    });

    // Real-time listener for announcements
    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(docs);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubSessions();
      unsubNotes();
      unsubDoubts();
      unsubAnnouncements();
    };
  }, []);

  // Filter real student statistics
  const realStudents = students.filter(s => s.role !== 'admin');
  const totalStudents = realStudents.length;

  const caFoundationStudents = realStudents.filter(s => 
    (s.course === 'CA' && (s.level === 'Foundation' || !s.level)) || 
    s.course === 'CA Foundation'
  ).length;

  const caInterStudents = realStudents.filter(s => 
    (s.course === 'CA' && s.level === 'Intermediate') || 
    s.course === 'CA Intermediate'
  ).length;

  const cmaFoundationStudents = realStudents.filter(s => 
    (s.course === 'CMA' && (s.level === 'Foundation' || !s.level)) || 
    s.course === 'CMA Foundation'
  ).length;

  const cmaInterStudents = realStudents.filter(s => 
    (s.course === 'CMA' && s.level === 'Intermediate') || 
    s.course === 'CMA Intermediate'
  ).length;

  const totalStudyHours = realStudents.reduce((acc, curr) => acc + (curr.studyHours || 0), 0);
  const totalPoints = realStudents.reduce((acc, curr) => acc + (curr.points || 0), 0);
  const pendingDoubts = doubts.filter(d => d.status === 'open').length;
  const publishedNotes = notes.filter(n => n.published !== false).length;
  const publishedAnnouncements = announcements.filter(a => a.published !== false).length;

  return (
    <div className="space-y-8">
      
      {/* Admin Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CA/CMA Blueprint Admin Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            System Overview & <span className="gold-gradient-text">Live Analytics</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Monitor real student activity, active preparation paths, study timer logs, and academic support.
          </p>
        </div>
      </div>

      {/* Real Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Total Students */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Students</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalStudents}</div>
          <div className="text-[11px] text-slate-400">Registered platform users</div>
        </div>

        {/* Metric 2: CA Foundation */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CA Foundation</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{caFoundationStudents}</div>
          <div className="text-[11px] text-teal-400 font-medium">ICAI Foundation stream</div>
        </div>

        {/* Metric 3: CA Intermediate */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CA Intermediate</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{caInterStudents}</div>
          <div className="text-[11px] text-cyan-400 font-medium">ICAI Intermediate stream</div>
        </div>

        {/* Metric 4: CMA Foundation */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CMA Foundation</span>
            <div className="w-9 h-9 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{cmaFoundationStudents}</div>
          <div className="text-[11px] text-gold-400 font-medium">ICMAI Foundation stream</div>
        </div>

        {/* Metric 5: CMA Intermediate */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CMA Intermediate</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{cmaInterStudents}</div>
          <div className="text-[11px] text-amber-400 font-medium">ICMAI Intermediate stream</div>
        </div>

        {/* Metric 6: Total Study Hours */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Study Hours</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatHours(totalStudyHours)}</div>
          <div className="text-[11px] text-slate-400">Verified stopwatch time</div>
        </div>

        {/* Metric 7: Total Points */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Points</span>
            <div className="w-9 h-9 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gold-400">{totalPoints} <span className="text-xs font-normal">PTS</span></div>
          <div className="text-[11px] text-slate-400">Earned across platform</div>
        </div>

        {/* Metric 8: Pending Doubts */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Doubts</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingDoubts}</div>
          <div className="text-[11px] text-slate-400">Awaiting faculty reply</div>
        </div>

        {/* Metric 9: Published Notes */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Published Notes</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{publishedNotes}</div>
          <div className="text-[11px] text-slate-400">Active study materials</div>
        </div>

        {/* Metric 10: Announcements */}
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Announcements</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{publishedAnnouncements}</div>
          <div className="text-[11px] text-slate-400">Broadcast updates</div>
        </div>

      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setActiveTab('students')}
          className="p-6 rounded-2xl glass-card border border-white/10 hover:border-emerald-500/40 text-left transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <Users className="w-6 h-6 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">Manage →</span>
          </div>
          <h3 className="text-lg font-bold text-white">Student Roster</h3>
          <p className="text-xs text-slate-400">View registered students, course streams, study hours, and points.</p>
        </button>

        <button
          onClick={() => setActiveTab('doubts')}
          className="p-6 rounded-2xl glass-card border border-white/10 hover:border-amber-500/40 text-left transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <HelpCircle className="w-6 h-6 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">Reply ({pendingDoubts}) →</span>
          </div>
          <h3 className="text-lg font-bold text-white">Academic Doubts Portal</h3>
          <p className="text-xs text-slate-400">Reply to student questions on Accounting, Laws, Economics & Tax.</p>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className="p-6 rounded-2xl glass-card border border-white/10 hover:border-purple-500/40 text-left transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <FileText className="w-6 h-6 text-purple-400" />
            <span className="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">Upload →</span>
          </div>
          <h3 className="text-lg font-bold text-white">Notes & Supabase Storage</h3>
          <p className="text-xs text-slate-400">Publish study PDFs, Google Drive links, and chapter summaries.</p>
        </button>
      </div>

    </div>
  );
}
