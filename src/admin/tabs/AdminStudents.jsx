import React, { useState, useEffect } from 'react';
import { collection, collectionGroup, onSnapshot, query, where, doc, updateDoc, addDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate, formatHours } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Award, 
  Clock, 
  BookOpen, 
  Calendar, 
  Target, 
  HelpCircle, 
  Sliders, 
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  LogOut,
  UserX,
  UserCheck,
  ShieldAlert,
  Crown,
  X
} from 'lucide-react';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [dayOffs, setDayOffs] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all'); // 'all', 'CA Foundation', 'CMA'
  const [attemptFilter, setAttemptFilter] = useState('all'); // 'all', 'January 2027', 'September 2027'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'banned', 'logout'
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'Instagram', 'YouTube', 'Telegram', 'Facebook', 'Friends Circle'

  // Selected Student Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Controlled Point Adjustment Modal State
  const [adjustingStudent, setAdjustingStudent] = useState(null);
  const [pointDelta, setPointDelta] = useState('50');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Warning System Modal State
  const [warningStudent, setWarningStudent] = useState(null);
  const [warningReason, setWarningReason] = useState('Studied less than 6 hours minimum requirement today');
  const [warningMessage, setWarningMessage] = useState('');
  const [submittingWarning, setSubmittingWarning] = useState(false);

  // Ban System Modal State
  const [banningStudent, setBanningStudent] = useState(null);
  const [banReason, setBanReason] = useState('Violation of study tracking rules & false session logging');
  const [submittingBan, setSubmittingBan] = useState(false);

  // Helper to format referral source badges with consistent colors & icons
  const getReferralBadge = (source) => {
    switch (source) {
      case 'Instagram':
        return { icon: '📸', label: 'Instagram', bg: 'bg-pink-500/15 text-pink-300 border-pink-500/30' };
      case 'YouTube':
        return { icon: '▶️', label: 'YouTube', bg: 'bg-red-500/15 text-rose-300 border-red-500/30' };
      case 'Telegram':
        return { icon: '✈️', label: 'Telegram', bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
      case 'Facebook':
        return { icon: '👥', label: 'Facebook', bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'Friends Circle':
        return { icon: '🤝', label: 'Friends Circle', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      default:
        return { icon: '🌐', label: source || 'Not Specified', bg: 'bg-slate-700/30 text-slate-400 border-white/10' };
    }
  };

  useEffect(() => {
    // Real-time listener for users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(docs);
    });

    // Real-time listener for sessions
    const unsubSessions = onSnapshot(collection(db, 'studySessions'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(docs);
    });

    // Real-time listener for targets
    const unsubTargets = onSnapshot(collection(db, 'targets'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTargets(docs);
    });

    // Real-time listener for doubts
    const unsubDoubts = onSnapshot(collection(db, 'doubts'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDoubts(docs);
    });

    const unsubDayOffs = onSnapshot(collectionGroup(db, 'records'), (snapshot) => {
      setDayOffs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUsers();
      unsubSessions();
      unsubTargets();
      unsubDoubts();
      unsubDayOffs();
    };
  }, []);

  // Prevent background scroll when any modal is open
  useEffect(() => {
    if (selectedStudent || adjustingStudent || warningStudent || banningStudent) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedStudent, adjustingStudent, warningStudent, banningStudent]);

  const bannedStudents = students.filter(s => s.banned && s.role !== 'admin');
  const loggedOutStudents = students.filter(s => (s.forceLoggedOutAt || s.forceLogout) && s.role !== 'admin');

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.phone || '').includes(searchQuery) ||
      (student.referralSource || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse = courseFilter === 'all' || 
      (courseFilter === 'CA Foundation' && ((student.course === 'CA' && (student.level === 'Foundation' || !student.level)) || student.course === 'CA Foundation')) ||
      (courseFilter === 'CA Intermediate' && ((student.course === 'CA' && student.level === 'Intermediate') || student.course === 'CA Intermediate')) ||
      (courseFilter === 'CMA Foundation' && ((student.course === 'CMA' && (student.level === 'Foundation' || !student.level)) || student.course === 'CMA Foundation')) ||
      (courseFilter === 'CMA Intermediate' && ((student.course === 'CMA' && student.level === 'Intermediate') || student.course === 'CMA Intermediate')) ||
      student.course === courseFilter;

    const matchesAttempt = attemptFilter === 'all' || student.attempt === attemptFilter;

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? !student.banned :
      statusFilter === 'banned' ? Boolean(student.banned) :
      statusFilter === 'logout' ? Boolean(student.forceLoggedOutAt || student.forceLogout) : true;

    const matchesSource = 
      sourceFilter === 'all' ? true :
      sourceFilter === 'Not Specified' ? (!student.referralSource || student.referralSource === 'Not Specified') :
      (student.referralSource || '') === sourceFilter;

    return matchesSearch && matchesCourse && matchesAttempt && matchesStatus && matchesSource;
  });

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const getStudentDayOffs = (student) => dayOffs.filter(dayOff =>
    dayOff.uid === (student.id || student.uid) &&
    dayOff.monthKey === currentMonthKey &&
    dayOff.status === 'active'
  );

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    if (!adjustingStudent || !pointDelta || !adjustReason.trim()) {
      return alert("Please enter points amount and audit reason.");
    }

    try {
      setSubmittingAdjust(true);
      const deltaNum = parseInt(pointDelta, 10);

      // 1. Update user points in Firestore
      const userRef = doc(db, 'users', adjustingStudent.id || adjustingStudent.uid);
      await updateDoc(userRef, {
        points: increment(deltaNum)
      });

      // 2. Add Audit Log entry in auditLogs collection
      await addDoc(collection(db, 'auditLogs'), {
        studentUid: adjustingStudent.id || adjustingStudent.uid,
        studentName: adjustingStudent.name,
        studentEmail: adjustingStudent.email,
        pointDelta: deltaNum,
        reason: adjustReason.trim(),
        adjustedBy: 'Admin',
        timestamp: serverTimestamp()
      });

      alert(`Points adjusted by ${deltaNum > 0 ? '+' : ''}${deltaNum} PTS for ${adjustingStudent.name}. Audit log recorded.`);
      setAdjustingStudent(null);
      setAdjustReason('');
    } catch (err) {
      console.error("Point adjustment error:", err);
      alert("Failed to adjust points. Check Firestore permissions.");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleSendWarning = async (e) => {
    e.preventDefault();
    if (!warningStudent || !warningReason.trim()) {
      return alert("Please select a warning reason.");
    }

    try {
      setSubmittingWarning(true);
      const targetUid = warningStudent.id || warningStudent.uid;

      // 1. Add warning document
      await addDoc(collection(db, 'warnings'), {
        uid: targetUid,
        studentName: warningStudent.name || 'Student',
        studentEmail: warningStudent.email || '',
        reason: warningReason.trim(),
        message: warningMessage.trim(),
        status: 'active',
        issuedAt: serverTimestamp(),
        issuedBy: 'Admin'
      });

      // 2. Increment warning count on user profile
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        warningCount: increment(1),
        lastWarningAt: serverTimestamp()
      });

      alert(`Official warning issued to ${warningStudent.name} successfully.`);
      setWarningStudent(null);
      setWarningReason('Studied less than 6 hours minimum requirement today');
      setWarningMessage('');
    } catch (err) {
      console.error("Warning issuance error:", err);
      alert("Failed to issue warning. Check permissions.");
    } finally {
      setSubmittingWarning(false);
    }
  };

  const handleForceLogout = async (student) => {
    const targetUid = student.id || student.uid;
    if (!window.confirm(`Force log out ${student.name}? Their active session will be disconnected immediately.`)) return;

    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        forceLogout: true,
        forceLoggedOutAt: serverTimestamp()
      });
      alert(`Force logout command sent for ${student.name}. Their active session will disconnect immediately.`);
    } catch (err) {
      console.error('Force logout error:', err);
      alert('Failed to force logout student. Check permissions.');
    }
  };

  const handleTogglePaidAccess = async (student) => {
    const targetUid = student.id || student.uid;
    const currentStatus = Boolean(student.paidQuizAccess || student.isPaid);
    const nextStatus = !currentStatus;

    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        paidQuizAccess: nextStatus,
        isPaid: nextStatus,
        plan: nextStatus ? 'paid' : 'free'
      });
      setSelectedStudent(prev => prev ? { ...prev, paidQuizAccess: nextStatus, isPaid: nextStatus, plan: nextStatus ? 'paid' : 'free' } : null);
      alert(`Paid Quiz Access has been ${nextStatus ? 'GRANTED' : 'REVOKED'} for ${student.name}.`);
    } catch (err) {
      console.error('Error updating paid status:', err);
      alert('Failed to update paid status.');
    }
  };

  const handleUnban = async (student) => {
    const targetUid = student.id || student.uid;
    if (!window.confirm(`Unban ${student.name}? They will be allowed to log in and access their dashboard again.`)) return;

    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        banned: false,
        banReason: '',
        unbannedAt: serverTimestamp()
      });
      alert(`${student.name} has been unbanned successfully.`);
    } catch (err) {
      console.error('Unban error:', err);
      alert('Failed to unban student.');
    }
  };

  const handleConfirmBan = async (e) => {
    e.preventDefault();
    if (!banningStudent) return;

    try {
      setSubmittingBan(true);
      const targetUid = banningStudent.id || banningStudent.uid;
      const userRef = doc(db, 'users', targetUid);

      await updateDoc(userRef, {
        banned: true,
        banReason: banReason.trim() || 'Violation of terms & community guidelines',
        forceLogout: true,
        bannedAt: serverTimestamp()
      });

      alert(`${banningStudent.name} has been BANNED and remotely logged out.`);
      setBanningStudent(null);
      setBanReason('Violation of study tracking rules & false session logging');
    } catch (err) {
      console.error('Ban error:', err);
      alert('Failed to ban student.');
    } finally {
      setSubmittingBan(false);
    }
  };

  const allStudentsRankSorted = [...students]
    .filter(u => u.role !== 'admin' && u.email?.toLowerCase() !== 'vaultstore27@gmail.com' && u.email?.toLowerCase() !== 'thunderworld766@gmail.com')
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  const getStudentRank = (student) => {
    const idx = allStudentsRankSorted.findIndex(s => (s.id || s.uid) === (student.id || student.uid));
    return idx !== -1 ? idx + 1 : '-';
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <Users className="w-3.5 h-3.5" />
            <span>Student Management Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Registered Student <span className="gold-gradient-text">Roster</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Search, filter, view detailed student study analytics, audit points, and track live platform ranks.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, roll number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Courses & Levels</option>
            <option value="CA Foundation">CA Foundation</option>
            <option value="CA Intermediate">CA Intermediate</option>
            <option value="CMA Foundation">CMA Foundation</option>
            <option value="CMA Intermediate">CMA Intermediate</option>
          </select>

          {/* Attempt Filter */}
          <select
            value={attemptFilter}
            onChange={(e) => setAttemptFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Attempts</option>
            <option value="Dec 26">Dec 26</option>
            <option value="Jan 27">Jan 27</option>
            <option value="May 27">May 27</option>
            <option value="Sep 27">Sep 27</option>
            <option value="June 27">June 27</option>
            <option value="Dec 27">Dec 27</option>
            <option value="January 2027">January 2027</option>
            <option value="September 2027">September 2027</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses ({students.length})</option>
            <option value="active">Active Only</option>
            <option value="banned">🚫 Banned Only ({bannedStudents.length})</option>
            <option value="logout">🚪 Force Logged Out Only ({loggedOutStudents.length})</option>
          </select>

          {/* Referral Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Referral Sources</option>
            <option value="Instagram">📸 Instagram</option>
            <option value="YouTube">▶️ YouTube</option>
            <option value="Telegram">✈️ Telegram</option>
            <option value="Facebook">👥 Facebook</option>
            <option value="Friends Circle">🤝 Friends Circle</option>
            <option value="Not Specified">Not Specified</option>
          </select>

        </div>

      </div>

      {/* Dedicated Admin Security Audit: Banned Roster & Remote Logout Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Banned Accounts Roster Card */}
        <div className="p-6 rounded-3xl glass-card border border-rose-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center space-x-2.5">
              <UserX className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-white">Banned Accounts Roster</h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/30">
              {bannedStudents.length} Banned
            </span>
          </div>

          {bannedStudents.length === 0 ? (
            <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 text-xs text-slate-400 text-center">
              No student accounts are currently banned.
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {bannedStudents.map((bStudent) => (
                <div key={bStudent.id || bStudent.uid} className="p-3.5 rounded-2xl bg-navy-900/80 border border-rose-500/25 flex items-center justify-between gap-3 hover:bg-navy-900 transition-colors">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{bStudent.name}</span>
                      <span className="text-xs text-slate-400">({bStudent.email})</span>
                    </div>
                    {bStudent.phone && <div className="text-[11px] text-emerald-400 font-medium">📞 {bStudent.phone}</div>}
                    <div className="text-xs text-rose-300 italic font-medium">Reason: "{bStudent.banReason || 'Violation of terms'}"</div>
                    {bStudent.bannedAt && <div className="text-[10px] text-slate-400">Banned: {formatDate(bStudent.bannedAt)}</div>}
                  </div>
                  <button
                    onClick={() => handleUnban(bStudent)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white text-xs font-bold shrink-0 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Unban Student</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remote Logout Audit Log Card */}
        <div className="p-6 rounded-3xl glass-card border border-sky-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
            <div className="flex items-center space-x-2.5">
              <LogOut className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">Remote Logout Audit Log</h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-black border border-sky-500/30">
              {loggedOutStudents.length} Disconnected
            </span>
          </div>

          {loggedOutStudents.length === 0 ? (
            <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 text-xs text-slate-400 text-center">
              No force logouts issued yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {loggedOutStudents.map((lStudent) => (
                <div key={lStudent.id || lStudent.uid} className="p-3.5 rounded-2xl bg-navy-900/80 border border-sky-500/25 flex items-center justify-between gap-3 hover:bg-navy-900 transition-colors">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{lStudent.name}</span>
                      <span className="text-xs text-slate-400">({lStudent.email})</span>
                    </div>
                    {lStudent.phone && <div className="text-[11px] text-emerald-400 font-medium">📞 {lStudent.phone}</div>}
                    <div className="text-xs text-sky-300">Status: Session Disconnected</div>
                    {lStudent.forceLoggedOutAt && <div className="text-[10px] text-slate-400">Logged out: {formatDate(lStudent.forceLoggedOutAt)}</div>}
                  </div>
                  <button
                    onClick={() => handleForceLogout(lStudent)}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-600 hover:text-white text-xs font-bold shrink-0 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Re-Logout</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Student Table */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No registered students found"
          description="When new students register for CA Foundation or CMA, their details will appear here automatically."
        />
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-4 text-center">Rank</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Course & Attempt</th>
                  <th className="px-5 py-4 text-center">Referral Source</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-center">Study Hours</th>
                  <th className="px-6 py-4 text-center">Points</th>
                  <th className="px-6 py-4 text-center">Day Offs</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredStudents.map((student) => (
                  <tr key={student.id || student.uid} className="hover:bg-white/5 transition-colors">
                    
                    {/* Rank */}
                    <td className="px-4 py-4 text-center font-black text-gold-400 font-mono">
                      #{getStudentRank(student)}
                    </td>
                    
                    {/* Name & Email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-gold-500 p-0.5 shrink-0">
                          <div className="w-full h-full bg-navy-950 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-gold-400 transition-colors">{student.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 font-bold border border-gold-500/30 flex items-center gap-1">
                              <span>{student.badge || '🌱'}</span>
                              <span>Lvl {student.currentLevel || 1}</span>
                            </span>
                            {student.role === 'admin' && (
                              <span className="px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 text-[10px] font-bold">ADMIN</span>
                            )}
                            {student.banned && (
                              <span className="px-2 py-0.5 rounded bg-rose-600/30 border border-rose-500/50 text-rose-300 text-[10px] font-black flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-400" />
                                <span>BANNED</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{student.email}</div>
                          {student.phone && (
                            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                              <span>📞 {student.phone}</span>
                            </div>
                          )}
                          {student.referralSource && (
                            <div className="mt-1">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${getReferralBadge(student.referralSource).bg}`}>
                                <span>{getReferralBadge(student.referralSource).icon}</span>
                                <span>{student.referralSource}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Course & Attempt */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="px-2.5 py-1 rounded-lg bg-navy-900 border border-white/10 text-xs font-semibold text-emerald-400">
                          {student.course === 'CA' || student.course === 'CMA'
                            ? `${student.course} ${student.level ? `(${student.level})` : ''}`
                            : (student.course || 'CA Foundation')}
                        </span>
                        <div className="text-xs text-slate-400 pl-1">{student.attempt || 'N/A'}</div>
                      </div>
                    </td>

                    {/* Referral Source Column */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getReferralBadge(student.referralSource).bg}`}>
                        <span>{getReferralBadge(student.referralSource).icon}</span>
                        <span>{getReferralBadge(student.referralSource).label}</span>
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {formatDate(student.createdAt)}
                    </td>

                    {/* Study Hours */}
                    <td className="px-6 py-4 text-center font-bold text-white">
                      {formatHours(student.studyHours || 0)}
                    </td>

                    {/* Points */}
                    <td className="px-6 py-4 text-center font-black text-gold-400 font-mono">
                      {student.points || 0} PTS
                    </td>

                    <td className="px-6 py-4 text-center text-xs text-slate-300">
                      <div className="font-bold text-amber-300">{getStudentDayOffs(student).length}/7</div>
                      <div className="text-[11px] text-slate-500">{7 - getStudentDayOffs(student).length} left</div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          title="View student profile details"
                          className="px-2.5 py-1.5 rounded-xl bg-royal-600/20 border border-royal-500/30 text-royal-400 hover:bg-royal-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => setAdjustingStudent(student)}
                          title="Adjust student points"
                          className="px-2.5 py-1.5 rounded-xl bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:bg-gold-500 hover:text-navy-950 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Adjust</span>
                        </button>

                        <button
                          onClick={() => {
                            setWarningReason('Studied less than 6 hours minimum requirement today');
                            setWarningMessage('');
                            setWarningStudent(student);
                          }}
                          title="Issue official warning"
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-navy-950 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Warn</span>
                        </button>

                        <button
                          onClick={() => handleForceLogout(student)}
                          title="Remotely disconnect student session"
                          className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Logout</span>
                        </button>

                        {student.banned ? (
                          <button
                            onClick={() => handleUnban(student)}
                            title="Unban this student account"
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Unban</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setBanReason('Violation of study tracking rules & false session logging');
                              setBanningStudent(student);
                            }}
                            title="Ban & suspend student account"
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Ban</span>
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-gold-500 p-0.5">
                  <div className="w-full h-full bg-navy-950 rounded-full flex items-center justify-center text-white font-extrabold text-lg">
                    {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedStudent.name}
                    {selectedStudent.rollNumber && (
                      <span className="px-2 py-0.5 rounded-md bg-gold-500/20 text-gold-400 text-[10px] font-mono border border-gold-500/30">
                        {selectedStudent.rollNumber}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedStudent.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-white font-bold p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Profile Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                <div className="text-[11px] text-slate-400">Course Stream</div>
                <div className="text-sm font-bold text-emerald-400">
                  {selectedStudent.course === 'CA' || selectedStudent.course === 'CMA'
                    ? `${selectedStudent.course} ${selectedStudent.level ? `(${selectedStudent.level})` : ''}`
                    : selectedStudent.course}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                <div className="text-[11px] text-slate-400">Exam Attempt</div>
                <div className="text-sm font-bold text-white">{selectedStudent.attempt || 'N/A'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                <div className="text-[11px] text-slate-400">Study Hours</div>
                <div className="text-sm font-bold text-white">{formatHours(selectedStudent.studyHours || 0)}</div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                <div className="text-[11px] text-slate-400">Earned Points</div>
                <div className="text-sm font-bold text-gold-400">{selectedStudent.points || 0} PTS</div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                <div className="text-[11px] text-slate-400">Day Offs This Month</div>
                <div className="text-sm font-bold text-amber-300">{getStudentDayOffs(selectedStudent).length}/7 used</div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                <div className="text-[11px] text-slate-400">Heard About Us</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getReferralBadge(selectedStudent.referralSource).bg}`}>
                    <span>{getReferralBadge(selectedStudent.referralSource).icon}</span>
                    <span>{getReferralBadge(selectedStudent.referralSource).label}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Activity Summaries */}
            <div className="space-y-4 pt-2">

              {/* Paid Quiz Access Status */}
              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedStudent.paidQuizAccess || selectedStudent.isPaid ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Paid Quiz Access</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedStudent.paidQuizAccess || selectedStudent.isPaid ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-700 text-slate-300'}`}>
                        {selectedStudent.paidQuizAccess || selectedStudent.isPaid ? 'Authorized (Paid)' : 'Free Only'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {selectedStudent.paidQuizAccess || selectedStudent.isPaid ? 'Student can attempt all Free and Paid Quizzes' : 'Student has access to Free Quizzes only'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePaidAccess(selectedStudent)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedStudent.paidQuizAccess || selectedStudent.isPaid ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-navy-950 border border-amber-500/30'}`}
                >
                  {selectedStudent.paidQuizAccess || selectedStudent.isPaid ? 'Revoke Paid' : 'Grant Paid'}
                </button>
              </div>
              
              {/* Targets Summary */}
              <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span>Target Milestones</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-navy-950 text-slate-300">
                    Completed: <strong className="text-emerald-400">{targets.filter(t => t.uid === (selectedStudent.id || selectedStudent.uid) && t.completed).length}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-navy-950 text-slate-300">
                    Pending: <strong className="text-amber-400">{targets.filter(t => t.uid === (selectedStudent.id || selectedStudent.uid) && !t.completed).length}</strong>
                  </div>
                </div>
              </div>

              {/* Sessions Summary */}
              <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Logged Study Sessions</span>
                </h4>
                <div className="text-xs text-slate-300">
                  Total sessions recorded: <strong className="text-white">{sessions.filter(s => s.uid === (selectedStudent.id || selectedStudent.uid)).length}</strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Day Off Dates This Month</span>
                </h4>
                <div className="text-xs text-slate-300">
                  {getStudentDayOffs(selectedStudent).length > 0
                    ? getStudentDayOffs(selectedStudent).map(dayOff => dayOff.dateKey).join(', ')
                    : 'No Day Offs used this month.'}
                </div>
              </div>

              {/* Doubts Summary */}
              <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Submitted Academic Doubts</span>
                </h4>
                <div className="text-xs text-slate-300">
                  Total doubts asked: <strong className="text-white">{doubts.filter(d => d.uid === (selectedStudent.id || selectedStudent.uid)).length}</strong>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-white/10 text-right">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-6 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Controlled Point Adjustment Modal */}
      {adjustingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-gold-400" />
                <span>Adjust Points — Audit System</span>
              </h3>
              <button onClick={() => setAdjustingStudent(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/30 text-xs text-gold-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Adjusting points for: <strong>{adjustingStudent.name}</strong> (Current: {adjustingStudent.points || 0} PTS)</span>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Point Change (+ or -)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50 or -20"
                  value={pointDelta}
                  onChange={(e) => setPointDelta(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Reason for Adjustment (Recorded in Audit Log)
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Bonus points for winning weekly accounting quiz challenge"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-gold-500 resize-none"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustingStudent(null)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="w-full py-3 rounded-xl bg-gold-500 text-navy-950 text-sm font-black shadow-glow-gold hover:bg-gold-400 disabled:opacity-50"
                >
                  {submittingAdjust ? 'Updating...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Warning Issuance Modal */}
      {warningStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-rose-500/30 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Issue Official Warning</span>
              </h3>
              <button onClick={() => setWarningStudent(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Target Student: <strong>{warningStudent.name}</strong> ({warningStudent.email})</span>
            </div>

            <form onSubmit={handleSendWarning} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Warning Reason
                </label>
                <select
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-rose-500"
                >
                  <option value="Studied less than 6 hours minimum requirement today">
                    ⚠️ Studied less than 6 hours minimum requirement today
                  </option>
                  <option value="Inconsistent study streak & low daily activity">
                    ⚠️ Inconsistent study streak & low daily activity
                  </option>
                  <option value="Unexcused absence without taking a Day Off">
                    ⚠️ Unexcused absence without taking a Day Off
                  </option>
                  <option value="Custom Warning">
                    ✏️ Custom Warning (Specify below)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Warning Message / Direct Note for Student
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. You only completed 3.5 hours of study today. Minimum 6 hours is mandatory."
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500 resize-none"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setWarningStudent(null)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWarning}
                  className="w-full py-3 rounded-xl bg-rose-500 text-white text-sm font-black shadow-lg hover:bg-rose-600 disabled:opacity-50"
                >
                  {submittingWarning ? 'Issuing Warning...' : 'Issue Warning'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Ban Student Modal */}
      {banningStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-rose-500/40 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-400" />
                <span>Ban Student Account</span>
              </h3>
              <button onClick={() => setBanningStudent(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Target Account: <strong>{banningStudent.name}</strong> ({banningStudent.email})</span>
            </div>

            <form onSubmit={handleConfirmBan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Reason for Account Ban (Shown to Student)
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Violation of academic integrity / Repeated fake study session logs"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500 resize-none"
                ></textarea>
              </div>

              <div className="text-xs text-slate-400 bg-navy-900/60 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="font-bold text-rose-400">⚠️ Ban Effects:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Student will be immediately logged out from all active sessions.</li>
                  <li>Student will be prevented from logging in until unbanned by Admin.</li>
                </ul>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setBanningStudent(null)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBan}
                  className="w-full py-3 rounded-xl bg-rose-600 text-white text-sm font-black shadow-lg hover:bg-rose-500 disabled:opacity-50"
                >
                  {submittingBan ? 'Banning Account...' : 'Confirm Ban & Logout'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
