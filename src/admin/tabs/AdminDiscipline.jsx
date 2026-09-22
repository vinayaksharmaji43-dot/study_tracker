import React, { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
  X
} from 'lucide-react';

const INACTIVE_AFTER_DAYS = 15;

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getStream(student) {
  if (student.course === 'CA' || student.course === 'CMA') {
    return `${student.course} ${student.level || 'Foundation'}`;
  }
  return student.course || 'Not specified';
}

function getDateLabel(value) {
  return value ? formatDate(value) : 'No activity recorded';
}

function getStudentActivity(student, sessions, now) {
  const studentId = student.id || student.uid;
  const studentSessions = sessions.filter(session => session.uid === studentId);
  const latestSession = studentSessions.reduce((latest, session) => {
    const time = toMillis(session.date);
    return time > latest ? time : latest;
  }, 0);
  const lastActivity = Math.max(toMillis(student.lastActiveAt), latestSession);
  const inactivityBase = lastActivity || toMillis(student.createdAt);
  const lastStudy = latestSession;
  const inactiveDays = inactivityBase
    ? Math.max(0, Math.floor((now - inactivityBase) / 86400000))
    : INACTIVE_AFTER_DAYS;

  return {
    lastActive: lastActivity,
    lastStudy,
    inactiveDays,
    inactive: inactiveDays >= INACTIVE_AFTER_DAYS
  };
}

export default function AdminDiscipline() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [negativeHistory, setNegativeHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [customNegativePoints, setCustomNegativePoints] = useState('0');
  const [savingPoints, setSavingPoints] = useState(false);
  const [warningStudentId, setWarningStudentId] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'users'), snapshot => {
      setStudents(snapshot.docs
        .map(studentDoc => ({ id: studentDoc.id, ...studentDoc.data() }))
        .filter(student => student.role !== 'admin'));
    });
    const unsubSessions = onSnapshot(collection(db, 'studySessions'), snapshot => {
      setSessions(snapshot.docs.map(sessionDoc => ({ id: sessionDoc.id, ...sessionDoc.data() })));
    });
    const unsubWarnings = onSnapshot(collection(db, 'warnings'), snapshot => {
      setWarnings(snapshot.docs.map(warningDoc => ({ id: warningDoc.id, ...warningDoc.data() })));
    });
    const unsubHistory = onSnapshot(collection(db, 'negativePointHistory'), snapshot => {
      setNegativeHistory(snapshot.docs.map(historyDoc => ({ id: historyDoc.id, ...historyDoc.data() })));
    });

    return () => {
      unsubStudents();
      unsubSessions();
      unsubWarnings();
      unsubHistory();
    };
  }, []);

  const studentRows = useMemo(() => {
    const now = Date.now();
    return students.map(student => ({
      ...student,
      activity: getStudentActivity(student, sessions, now)
    }));
  }, [students, sessions]);

  const filteredStudents = studentRows.filter(student => {
    const search = searchQuery.trim().toLowerCase();
    const matchesSearch = !search || [student.name, student.email, student.rollNumber, getStream(student)]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'inactive' ? student.activity.inactive : !student.activity.inactive);
    return matchesSearch && matchesStatus;
  });

  const inactiveCount = studentRows.filter(student => student.activity.inactive).length;
  const selectedHistory = negativeHistory
    .filter(entry => entry.studentUid === selectedStudent?.id)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const selectedWarnings = warnings
    .filter(warning => warning.uid === selectedStudent?.id)
    .sort((a, b) => toMillis(b.issuedAt) - toMillis(a.issuedAt));

  const openPointManager = (student) => {
    setSelectedStudent(student);
    setCustomNegativePoints(String(Number(student.negativePoints) || 0));
  };

  const saveNegativePoints = async (newValue, action) => {
    if (!selectedStudent) return;
    const oldPoints = Math.max(0, Number(selectedStudent.negativePoints) || 0);
    const nextPoints = Math.max(0, Math.floor(Number(newValue) || 0));
    const delta = nextPoints - oldPoints;

    if (delta === 0) {
      setCustomNegativePoints(String(nextPoints));
      return;
    }

    try {
      setSavingPoints(true);
      const studentRef = doc(db, 'users', selectedStudent.id);
      await updateDoc(studentRef, {
        negativePoints: nextPoints,
        points: increment(-delta)
      });
      await addDoc(collection(db, 'negativePointHistory'), {
        studentUid: selectedStudent.id,
        studentName: selectedStudent.name || 'Student',
        oldPoints,
        newPoints: nextPoints,
        action,
        adminUid: currentUser?.uid || '',
        createdAt: serverTimestamp()
      });
      setCustomNegativePoints(String(nextPoints));
      setSelectedStudent(previous => previous
        ? { ...previous, negativePoints: nextPoints, points: (Number(previous.points) || 0) - delta }
        : previous);
    } catch (error) {
      console.error('Negative point update failed:', error);
      alert('Could not save negative points. Check Firestore permissions.');
    } finally {
      setSavingPoints(false);
    }
  };

  const handleCustomPointsSave = async (event) => {
    event.preventDefault();
    await saveNegativePoints(customNegativePoints, 'Custom value saved');
  };

  const handleSendWarning = async (event) => {
    event.preventDefault();
    const student = students.find(item => item.id === warningStudentId);
    if (!student || !warningMessage.trim()) {
      alert('Select a student and enter a warning message.');
      return;
    }

    try {
      setSendingWarning(true);
      await addDoc(collection(db, 'warnings'), {
        uid: student.id,
        studentName: student.name || 'Student',
        studentEmail: student.email || '',
        reason: 'Admin Warning',
        message: warningMessage.trim(),
        status: 'active',
        issuedAt: serverTimestamp(),
        issuedBy: currentUser?.uid || 'Admin'
      });
      await updateDoc(doc(db, 'users', student.id), {
        warningCount: increment(1),
        lastWarningAt: serverTimestamp()
      });
      setWarningMessage('');
      alert(`Warning sent to ${student.name || 'student'}.`);
    } catch (error) {
      console.error('Warning send failed:', error);
      alert('Could not send warning. Check Firestore permissions.');
    } finally {
      setSendingWarning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Student Discipline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Inactive Students / Student Discipline</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Inactivity is based on the last time a student started the Study Timer. Login or page refresh alone does not reset the 15-day counter.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-navy-900 border border-white/10">
          <div className="text-xs text-slate-400">Students</div>
          <div className="text-2xl font-black text-white">{studentRows.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
          <div className="text-xs text-rose-300">Inactive</div>
          <div className="text-2xl font-black text-rose-300">{inactiveCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 col-span-2 sm:col-span-1">
          <div className="text-xs text-emerald-300">Active</div>
          <div className="text-2xl font-black text-emerald-300">{studentRows.length - inactiveCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search name, roll number, email, or stream..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-rose-500"
        >
          <option value="all">All Students</option>
          <option value="inactive">Inactive Only</option>
          <option value="active">Active Only</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-navy-900/60">
        <table className="w-full min-w-[1050px] text-left">
          <thead className="bg-navy-950/80 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Roll Number</th>
              <th className="p-4">Stream</th>
              <th className="p-4">Last Active Date</th>
              <th className="p-4">Last Study Date</th>
              <th className="p-4">Inactive Days</th>
              <th className="p-4">Negative Points</th>
              <th className="p-4">Total Points</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredStudents.map(student => (
              <tr key={student.id} className="hover:bg-white/5">
                <td className="p-4">
                  <div className="font-bold text-white">{student.name || 'Unnamed student'}</div>
                  <div className="text-[11px] text-slate-500">{student.email || 'No email'}</div>
                </td>
                <td className="p-4 text-sm text-slate-300">{student.rollNumber || 'N/A'}</td>
                <td className="p-4 text-sm text-emerald-300">{getStream(student)}</td>
                <td className="p-4 text-xs text-slate-300">{getDateLabel(student.activity.lastActive)}</td>
                <td className="p-4 text-xs text-slate-300">{getDateLabel(student.activity.lastStudy)}</td>
                <td className="p-4 text-sm font-bold text-amber-300">{student.activity.inactiveDays}</td>
                <td className="p-4 text-sm font-black text-rose-300">{Number(student.negativePoints) || 0}</td>
                <td className="p-4 text-sm font-black text-gold-400">{Number(student.points) || 0}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase ${student.activity.inactive ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {student.activity.inactive ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {student.activity.inactive ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => openPointManager(student)} className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-bold hover:bg-rose-500/25">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No students match this search.</div>}
      </div>

      <section className="p-5 sm:p-6 rounded-2xl bg-navy-900 border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-black text-white">Send Student-Specific Warning</h2>
        </div>
        <form onSubmit={handleSendWarning} className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)_auto] gap-3 items-end">
          <label className="text-xs font-bold text-slate-400">
            Select Student
            <select value={warningStudentId} onChange={event => setWarningStudentId(event.target.value)} className="mt-2 w-full px-3 py-3 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500">
              <option value="">Choose a student...</option>
              {[...students].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(student => <option key={student.id} value={student.id}>{student.name || student.email}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-400">
            Custom Warning Message
            <textarea value={warningMessage} onChange={event => setWarningMessage(event.target.value)} rows="2" placeholder="Write the message that should appear in the student's dashboard..." className="mt-2 w-full px-3 py-3 rounded-xl bg-navy-950 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </label>
          <button type="submit" disabled={sendingWarning} className="px-5 py-3 rounded-xl bg-amber-500 text-navy-950 font-black text-sm hover:bg-amber-400 disabled:opacity-50">
            {sendingWarning ? 'Sending...' : 'Send Warning'}
          </button>
        </form>
      </section>

      <section className="p-5 sm:p-6 rounded-2xl bg-navy-900 border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Clock3 className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-black text-white">Warning History</h2>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {[...warnings].sort((a, b) => toMillis(b.issuedAt) - toMillis(a.issuedAt)).slice(0, 30).map(warning => (
            <div key={warning.id} className="p-3 rounded-xl bg-navy-950 border border-white/5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-white">{warning.studentName || 'Student'}</div>
                <div className="text-xs text-rose-200 mt-1">{warning.message || warning.reason || 'Admin Warning'}</div>
              </div>
              <div className="text-[11px] text-slate-500 shrink-0">{getDateLabel(warning.issuedAt)}</div>
            </div>
          ))}
          {warnings.length === 0 && <div className="text-sm text-slate-500">No warnings have been sent yet.</div>}
        </div>
      </section>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-5 sm:p-7 rounded-3xl border border-rose-500/30 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Negative Points: {selectedStudent.name || 'Student'}</h2>
                <p className="text-xs text-slate-400 mt-1">Total points: {Number(selectedStudent.points) || 0}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 text-slate-400 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30"><div className="text-xs text-rose-300">Current Negative Points</div><div className="text-2xl font-black text-rose-200">{Number(selectedStudent.negativePoints) || 0}</div></div>
              <div className="p-4 rounded-xl bg-navy-950 border border-white/10"><div className="text-xs text-slate-400">Student Status</div><div className="text-sm font-black text-white mt-1">{selectedStudent.activity.inactive ? 'Inactive' : 'Active'}</div></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button disabled={savingPoints} onClick={() => saveNegativePoints((Number(selectedStudent.negativePoints) || 0) + 1, 'Increased by 1')} className="px-3 py-2 rounded-xl bg-rose-500/15 text-rose-200 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"><Plus className="w-3.5 h-3.5" /> Increase</button>
              <button disabled={savingPoints} onClick={() => saveNegativePoints(Math.max(0, (Number(selectedStudent.negativePoints) || 0) - 1), 'Decreased by 1')} className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"><Minus className="w-3.5 h-3.5" /> Decrease</button>
              <button disabled={savingPoints} onClick={() => saveNegativePoints(0, 'Reset to 0')} className="px-3 py-2 rounded-xl bg-sky-500/15 text-sky-200 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" /> Reset</button>
              <div className="px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-xs text-slate-400 flex items-center justify-center">Saved permanently</div>
            </div>

            <form onSubmit={handleCustomPointsSave} className="flex gap-2">
              <input type="number" min="0" value={customNegativePoints} onChange={event => setCustomNegativePoints(event.target.value)} className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500" aria-label="Custom negative points" />
              <button disabled={savingPoints} type="submit" className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-black disabled:opacity-50">Save Custom Value</button>
            </form>

            <div className="space-y-2">
              <h3 className="text-sm font-black text-white">Negative Points History</h3>
              {selectedHistory.length === 0 && <p className="text-xs text-slate-500">No negative point changes recorded yet.</p>}
              {selectedHistory.map(entry => <div key={entry.id} className="p-3 rounded-xl bg-navy-950 border border-white/5 flex items-center justify-between gap-3 text-xs"><span className="text-slate-300">{entry.action}</span><span className="text-slate-400">{entry.oldPoints} → <strong className="text-rose-300">{entry.newPoints}</strong></span><span className="text-slate-500">{getDateLabel(entry.createdAt)}</span></div>)}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-black text-white">This Student's Warning History</h3>
              {selectedWarnings.length === 0 && <p className="text-xs text-slate-500">No warnings recorded.</p>}
              {selectedWarnings.map(warning => <div key={warning.id} className="p-3 rounded-xl bg-navy-950 border border-white/5 text-xs"><div className="text-rose-200">{warning.message || warning.reason}</div><div className="text-slate-500 mt-1">{getDateLabel(warning.issuedAt)}</div></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
