import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  increment,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import EmptyState from '../../components/EmptyState';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Lock, 
  Unlock, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle,
  Award,
  BookOpen,
  User,
  RotateCcw,
  Sparkles,
  Save,
  X,
  ExternalLink
} from 'lucide-react';

const DISABLE_PRESETS = [
  { label: '1 Day', days: 1 },
  { label: '2 Days', days: 2 },
  { label: '3 Days', days: 3 },
  { label: '5 Days', days: 5 },
  { label: '7 Days', days: 7 },
  { label: '10 Days', days: 10 }
];

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export default function AdminCoachingStudy() {
  const [activeSubTab, setActiveSubTab] = useState('students'); // 'students' | 'records'
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States for Students
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('all'); // 'all' | 'approved' | 'disabled' | 'temp_disabled'

  // Search & Filter States for Records
  const [recordSearch, setRecordSearch] = useState('');
  const [recordDateFilter, setRecordDateFilter] = useState('');
  const [recordSubjectFilter, setRecordSubjectFilter] = useState('all');

  // Modals State
  const [tempDisableStudent, setTempDisableStudent] = useState(null);
  const [tempDisableMode, setTempDisableMode] = useState('preset'); // 'preset' | 'custom' | 'date'
  const [tempPresetDays, setTempPresetDays] = useState(1);
  const [tempCustomDays, setTempCustomDays] = useState('3');
  const [tempSelectedDate, setTempSelectedDate] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Initial Form View/Edit Modal
  const [formModalStudent, setFormModalStudent] = useState(null);
  const [formName, setFormName] = useState('');
  const [formHours, setFormHours] = useState('');
  const [formHoliday, setFormHoliday] = useState('Sunday');

  // Record Edit Modal
  const [editingRecord, setEditingRecord] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHours, setEditHours] = useState('2');
  const [editMinutes, setEditMinutes] = useState('0');

  // Delete Confirmation Modal
  const [deletingRecord, setDeletingRecord] = useState(null);

  // Success Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // 1. Fetch Students
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role !== 'admin');
      setStudents(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading students:", err);
      setLoading(false);
    });

    return () => unsubStudents();
  }, []);

  // 2. Fetch Coaching Records
  useEffect(() => {
    const q = query(collection(db, 'coachingStudyEntries'), orderBy('createdAt', 'desc'));
    const unsubEntries = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEntries(list);
    }, (err) => {
      console.error("Error loading coaching study entries:", err);
    });

    return () => unsubEntries();
  }, []);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const now = new Date();
    return students.filter(s => {
      const roll = (s.rollNumber || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const q = studentSearch.trim().toLowerCase();

      const matchesSearch = !q || roll.includes(q) || name.includes(q) || email.includes(q);
      if (!matchesSearch) return false;

      const isTempDisabled = s.coachingStudyDisabledUntil && new Date(s.coachingStudyDisabledUntil) > now;
      const isApproved = s.coachingStudyAccess === true && !isTempDisabled;
      const isDisabled = !s.coachingStudyAccess;

      if (studentFilter === 'approved') return isApproved;
      if (studentFilter === 'disabled') return isDisabled;
      if (studentFilter === 'temp_disabled') return isTempDisabled;
      return true;
    });
  }, [students, studentSearch, studentFilter]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return entries.filter(e => {
      const roll = (e.rollNumber || '').toLowerCase();
      const name = (e.studentName || '').toLowerCase();
      const subj = (e.subject || '').toLowerCase();
      const q = recordSearch.trim().toLowerCase();

      const matchesSearch = !q || roll.includes(q) || name.includes(q) || subj.includes(q);
      if (!matchesSearch) return false;

      if (recordDateFilter && e.dateKey !== recordDateFilter) return false;
      if (recordSubjectFilter !== 'all' && e.subject !== recordSubjectFilter) return false;

      return true;
    });
  }, [entries, recordSearch, recordDateFilter, recordSubjectFilter]);

  // Unique Subjects for filter
  const uniqueSubjects = useMemo(() => {
    const set = new Set();
    entries.forEach(e => {
      if (e.subject) set.add(e.subject);
    });
    return Array.from(set);
  }, [entries]);

  // Overall Stats
  const stats = useMemo(() => {
    const now = new Date();
    let approved = 0;
    let tempDisabled = 0;
    students.forEach(s => {
      const isTemp = s.coachingStudyDisabledUntil && new Date(s.coachingStudyDisabledUntil) > now;
      if (isTemp) tempDisabled++;
      else if (s.coachingStudyAccess) approved++;
    });

    const totalHours = entries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const totalPoints = entries.reduce((acc, curr) => acc + (Number(curr.pointsEarned) || 0), 0);

    return {
      approved,
      tempDisabled,
      totalHours: totalHours.toFixed(1),
      totalPoints,
      totalRecords: entries.length
    };
  }, [students, entries]);

  // Handle Toggle Access: Allow / Disable
  const handleToggleAccess = async (student, shouldAllow) => {
    try {
      setSubmittingAction(true);
      const studentRef = doc(db, 'users', student.id);
      await updateDoc(studentRef, {
        coachingStudyAccess: shouldAllow,
        coachingStudyDisabledUntil: null,
        coachingStudyAccessUpdatedAt: serverTimestamp()
      });
      showToast(shouldAllow ? `Coaching Study approved for ${student.name}` : `Coaching Study access disabled for ${student.name}`);
    } catch (err) {
      console.error("Error updating access:", err);
      alert("Failed to update student access: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Temporary Disable Submit
  const handleApplyTemporaryDisable = async () => {
    if (!tempDisableStudent) return;
    try {
      setSubmittingAction(true);
      let targetDate = new Date();

      if (tempDisableMode === 'preset') {
        targetDate.setDate(targetDate.getDate() + Number(tempPresetDays));
      } else if (tempDisableMode === 'custom') {
        const days = parseInt(tempCustomDays, 10);
        if (isNaN(days) || days <= 0) {
          alert("Please enter a valid positive number of days.");
          setSubmittingAction(false);
          return;
        }
        targetDate.setDate(targetDate.getDate() + days);
      } else if (tempDisableMode === 'date') {
        if (!tempSelectedDate) {
          alert("Please choose a date.");
          setSubmittingAction(false);
          return;
        }
        // Set to end of selected date (23:59:59)
        const parts = tempSelectedDate.split('-');
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59);
      }

      const studentRef = doc(db, 'users', tempDisableStudent.id);
      await updateDoc(studentRef, {
        coachingStudyDisabledUntil: targetDate.toISOString(),
        coachingStudyAccess: true // Keep base approved flag, disabled until targetDate
      });

      showToast(`Temporarily disabled ${tempDisableStudent.name} until ${targetDate.toLocaleDateString()}`);
      setTempDisableStudent(null);
    } catch (err) {
      console.error("Error applying temporary disable:", err);
      alert("Failed to set temporary disable: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle "Enable Now" (Remove temporary disable or enable directly)
  const handleEnableNow = async (student) => {
    try {
      setSubmittingAction(true);
      const studentRef = doc(db, 'users', student.id);
      await updateDoc(studentRef, {
        coachingStudyAccess: true,
        coachingStudyDisabledUntil: null,
        coachingStudyAccessUpdatedAt: serverTimestamp()
      });
      showToast(`Access immediately restored for ${student.name}`);
    } catch (err) {
      console.error("Error restoring access:", err);
      alert("Failed to restore access: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Initial Form Modal
  const openFormModal = (student) => {
    setFormModalStudent(student);
    const form = student.coachingStudyInitialForm || {};
    setFormName(form.studentName || student.name || '');
    setFormHours(form.coachingHours ? String(form.coachingHours) : '');
    setFormHoliday(form.coachingHoliday || 'Sunday');
  };

  // Save Initial Form Edits
  const handleSaveInitialForm = async () => {
    if (!formModalStudent) return;
    try {
      setSubmittingAction(true);
      const studentRef = doc(db, 'users', formModalStudent.id);
      const updatedForm = {
        studentName: formName.trim() || formModalStudent.name,
        coachingHours: parseFloat(formHours) || 0,
        coachingHoliday: formHoliday,
        submittedAt: formModalStudent.coachingStudyInitialForm?.submittedAt || new Date().toISOString(),
        updatedByAdminAt: new Date().toISOString()
      };

      await updateDoc(studentRef, {
        coachingStudyInitialForm: updatedForm
      });

      showToast(`Initial form updated for ${formModalStudent.name}`);
      setFormModalStudent(null);
    } catch (err) {
      console.error("Error updating initial form:", err);
      alert("Failed to update initial form: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Edit Record Modal
  const openEditRecordModal = (record) => {
    setEditingRecord(record);
    setEditSubject(record.subject || '');
    const totalMins = Math.round((record.durationSeconds || 0) / 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    setEditHours(String(hrs));
    setEditMinutes(String(mins));
  };

  // Save Record Edit with Recalculation
  const handleSaveRecordEdit = async () => {
    if (!editingRecord) return;
    const hrs = parseInt(editHours, 10) || 0;
    const mins = parseInt(editMinutes, 10) || 0;
    const newTotalSecs = (hrs * 3600) + (mins * 60);

    if (newTotalSecs <= 0) {
      alert("Study time must be greater than 0 minutes.");
      return;
    }

    try {
      setSubmittingAction(true);
      const oldSecs = editingRecord.durationSeconds || 0;
      const secDiff = newTotalSecs - oldSecs;
      const hoursDiff = secDiff / 3600;
      const newHoursVal = parseFloat((newTotalSecs / 3600).toFixed(2));

      // Recalculate daily stats & milestone points in atomic transaction
      await runTransaction(db, async (transaction) => {
        const entryRef = doc(db, 'coachingStudyEntries', editingRecord.id);
        const userRef = doc(db, 'users', editingRecord.uid);
        const statDocId = `${editingRecord.uid}_${editingRecord.dateKey}`;
        const statRef = doc(db, 'studyDailyStats', statDocId);

        const statSnap = await transaction.get(statRef);
        let curDailyTotalSecs = 0;
        let curDailyPoints = 0;
        let completedMilestones = [];

        if (statSnap.exists()) {
          const sData = statSnap.data();
          curDailyTotalSecs = sData.totalStudySeconds || 0;
          curDailyPoints = sData.dailyStudyPoints || 0;
          completedMilestones = sData.completedMilestones || [];
        }

        const adjustedDailySecs = Math.max(0, curDailyTotalSecs + secDiff);
        const oldFullHours = Math.floor(curDailyTotalSecs / 3600);
        const newFullHours = Math.floor(adjustedDailySecs / 3600);

        let pointsAdjustment = 0;
        const newlyUnlocked = [];

        // Check newly unlocked hours if duration increased
        for (let h = oldFullHours + 1; h <= newFullHours; h++) {
          if (!completedMilestones.includes(h)) {
            newlyUnlocked.push(h);
            completedMilestones.push(h);
            if (h === 6) pointsAdjustment += 5;
            if (h >= 7) pointsAdjustment += 2;
          }
        }

        // If duration decreased, milestone hours may decrease
        if (newFullHours < oldFullHours) {
          for (let h = oldFullHours; h > newFullHours; h--) {
            const idx = completedMilestones.indexOf(h);
            if (idx > -1) {
              completedMilestones.splice(idx, 1);
              if (h === 6) pointsAdjustment -= 5;
              if (h >= 7) pointsAdjustment -= 2;
            }
          }
        }

        // 1. Update Daily Stats
        transaction.set(statRef, {
          totalStudySeconds: adjustedDailySecs,
          completedFullHours: newFullHours,
          dailyStudyPoints: increment(pointsAdjustment),
          completedMilestones
        }, { merge: true });

        // 2. Update User Profile
        const userUpdates = {
          studyHours: increment(hoursDiff),
          coachingStudyHours: increment(hoursDiff)
        };
        if (pointsAdjustment !== 0) {
          userUpdates.points = increment(pointsAdjustment);
        }
        transaction.update(userRef, userUpdates);

        // 3. Update coaching record
        const oldRecordPoints = editingRecord.pointsEarned || 0;
        const newRecordPoints = Math.max(0, oldRecordPoints + pointsAdjustment);

        transaction.update(entryRef, {
          subject: editSubject.trim() || editingRecord.subject,
          hours: newHoursVal,
          durationSeconds: newTotalSecs,
          studyTimeAddedFormatted: `+${newHoursVal.toFixed(1)} Hours`,
          pointsEarned: newRecordPoints,
          status: 'Edited by Admin',
          updatedAt: serverTimestamp()
        });
      });

      showToast(`Record updated successfully with study time & points recalculated.`);
      setEditingRecord(null);
    } catch (err) {
      console.error("Error editing record:", err);
      alert("Failed to update record: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Delete Record with Automatic Recalculation
  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;
    try {
      setSubmittingAction(true);
      const recordSecs = deletingRecord.durationSeconds || 0;
      const recordHours = recordSecs / 3600;
      const recordPoints = deletingRecord.pointsEarned || 0;

      await runTransaction(db, async (transaction) => {
        const entryRef = doc(db, 'coachingStudyEntries', deletingRecord.id);
        const userRef = doc(db, 'users', deletingRecord.uid);
        const statDocId = `${deletingRecord.uid}_${deletingRecord.dateKey}`;
        const statRef = doc(db, 'studyDailyStats', statDocId);

        // 1. Decrement Daily Stats
        const statSnap = await transaction.get(statRef);
        if (statSnap.exists()) {
          const sData = statSnap.data();
          const currentTotal = sData.totalStudySeconds || 0;
          const newTotal = Math.max(0, currentTotal - recordSecs);
          const newFullHours = Math.floor(newTotal / 3600);
          
          transaction.update(statRef, {
            totalStudySeconds: newTotal,
            completedFullHours: newFullHours,
            dailyStudyPoints: increment(-recordPoints)
          });
        }

        // 2. Decrement User Profile
        transaction.update(userRef, {
          studyHours: increment(-recordHours),
          coachingStudyHours: increment(-recordHours),
          points: increment(-recordPoints)
        });

        // 3. Delete Coaching Entry
        transaction.delete(entryRef);
      });

      showToast(`Coaching record deleted. Study time & points have been deducted from student.`);
      setDeletingRecord(null);
    } catch (err) {
      console.error("Error deleting coaching record:", err);
      alert("Failed to delete record: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500/90 text-navy-950 font-bold shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 fill-current" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            Coaching Study Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Control student approvals, temporary disable intervals, locked initial forms, and date-wise hours.
          </p>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-navy-900 border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'students'
                ? 'bg-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Student Approvals ({filteredStudents.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('records')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'records'
                ? 'bg-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Date-Wise Records ({entries.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl glass-card border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Approved Students</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{stats.approved}</span>
            <span className="text-xs text-slate-500">Active</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl glass-card border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Temp Disabled</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{stats.tempDisabled}</span>
            <span className="text-xs text-slate-500">Time-locked</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl glass-card border border-indigo-500/20 bg-indigo-500/5 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Total Coaching Hours</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-400">{stats.totalHours}</span>
            <span className="text-xs text-slate-500">Hours</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl glass-card border border-gold-500/20 bg-gold-500/5 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-gold-300">Points Awarded</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gold-400">+{stats.totalPoints}</span>
            <span className="text-xs text-slate-500">PTS</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: STUDENT ACCESS & APPROVALS                         */}
      {/* ========================================================= */}
      {activeSubTab === 'students' && (
        <div className="space-y-4">
          
          {/* Controls: Search by Roll Number / Name & Filters */}
          <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by Roll Number, Name, Email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: `All (${students.length})` },
                { id: 'approved', label: 'Approved' },
                { id: 'disabled', label: 'Disabled' },
                { id: 'temp_disabled', label: 'Temp Locked' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStudentFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    studentFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-navy-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Students Table */}
          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No students found"
              description="No students match your search or filter criteria."
            />
          ) : (
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-navy-900/80 border-b border-white/10 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Roll Number</th>
                      <th className="px-5 py-3.5">Student Details</th>
                      <th className="px-5 py-3.5">Coaching Hours</th>
                      <th className="px-5 py-3.5">Initial Form</th>
                      <th className="px-5 py-3.5">Access Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredStudents.map((student) => {
                      const now = new Date();
                      const isTempDisabled = student.coachingStudyDisabledUntil && new Date(student.coachingStudyDisabledUntil) > now;
                      const isApproved = student.coachingStudyAccess === true && !isTempDisabled;
                      const hasForm = !!student.coachingStudyInitialForm;

                      return (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors">
                          
                          {/* Roll Number */}
                          <td className="px-5 py-4 font-mono font-black text-xs text-gold-400">
                            {student.rollNumber || 'N/A'}
                          </td>

                          {/* Student Details */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                                {(student.name || 'S').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm">{student.name}</div>
                                <div className="text-xs text-slate-400">{student.email}</div>
                                {student.course && (
                                  <div className="text-[10px] text-indigo-300 font-semibold mt-0.5">
                                    {student.course} • {student.level || 'Foundation'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Coaching Hours */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{Number(student.coachingStudyHours || 0).toFixed(1)} hrs</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Total study: {Number(student.studyHours || 0).toFixed(1)}h
                            </span>
                          </td>

                          {/* Initial Form Status */}
                          <td className="px-5 py-4">
                            {hasForm ? (
                              <button
                                onClick={() => openFormModal(student)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>View / Edit Form</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Not Submitted</span>
                            )}
                          </td>

                          {/* Access Status Badge */}
                          <td className="px-5 py-4">
                            {isTempDisabled ? (
                              <div className="space-y-1">
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-max">
                                  <Clock className="w-3 h-3" />
                                  <span>Disabled Until: {new Date(student.coachingStudyDisabledUntil).toLocaleDateString()}</span>
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Resumes: {new Date(student.coachingStudyDisabledUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : isApproved ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Access Approved</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-max">
                                <XCircle className="w-3 h-3" />
                                <span>Access Disabled</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              
                              {/* Enable Now (if temp disabled or currently disabled) */}
                              {(isTempDisabled || !isApproved) && (
                                <button
                                  onClick={() => handleEnableNow(student)}
                                  disabled={submittingAction}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Immediately restore access"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Enable Now</span>
                                </button>
                              )}

                              {/* Toggle Allow / Disable */}
                              {isApproved ? (
                                <>
                                  {/* Temporary Disable Trigger */}
                                  <button
                                    onClick={() => {
                                      setTempDisableStudent(student);
                                      setTempDisableMode('preset');
                                      setTempPresetDays(1);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="Temporarily lock coaching access"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Temp Lock</span>
                                  </button>

                                  <button
                                    onClick={() => handleToggleAccess(student, false)}
                                    disabled={submittingAction}
                                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="Disable access indefinitely"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Disable</span>
                                  </button>
                                </>
                              ) : (
                                !isTempDisabled && (
                                  <button
                                    onClick={() => handleToggleAccess(student, true)}
                                    disabled={submittingAction}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Allow Access</span>
                                  </button>
                                )
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DATE-WISE COACHING RECORDS                         */}
      {/* ========================================================= */}
      {activeSubTab === 'records' && (
        <div className="space-y-4">
          
          {/* Controls: Search by Student/Roll, Date, Subject */}
          <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder="Roll No, Student, Subject..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={recordDateFilter}
                  onChange={(e) => setRecordDateFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
                />
                {recordDateFilter && (
                  <button
                    onClick={() => setRecordDateFilter('')}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs"
                    title="Clear Date"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Subject Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs text-slate-400 font-bold shrink-0">Subject:</span>
              <select
                value={recordSubjectFilter}
                onChange={(e) => setRecordSubjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Subjects</option>
                {uniqueSubjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Records Table */}
          {filteredRecords.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No coaching study records found"
              description="When students log daily coaching study sessions, their verified records will appear here."
            />
          ) : (
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-navy-900/80 border-b border-white/10 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Roll Number</th>
                      <th className="px-5 py-3.5">Student Name</th>
                      <th className="px-5 py-3.5">Subject</th>
                      <th className="px-5 py-3.5 text-center">Coaching Hours</th>
                      <th className="px-5 py-3.5 text-center">Study Time Added</th>
                      <th className="px-5 py-3.5 text-center">Points Earned</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredRecords.map((entry) => (
                      <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                        
                        {/* Date */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{entry.dateDisplay || entry.dateKey}</span>
                          </div>
                        </td>

                        {/* Roll Number */}
                        <td className="px-5 py-4 font-mono font-black text-xs text-gold-400 whitespace-nowrap">
                          {entry.rollNumber || 'N/A'}
                        </td>

                        {/* Student Name */}
                        <td className="px-5 py-4 font-bold text-white text-xs">
                          {entry.studentName}
                        </td>

                        {/* Subject */}
                        <td className="px-5 py-4 font-medium text-slate-300 text-xs">
                          {entry.subject}
                        </td>

                        {/* Coaching Hours */}
                        <td className="px-5 py-4 text-center font-black text-white text-xs">
                          {Number(entry.hours || 0).toFixed(1)} hrs
                        </td>

                        {/* Study Time Added */}
                        <td className="px-5 py-4 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                            {entry.studyTimeAddedFormatted || `+${Number(entry.hours || 0).toFixed(1)} Hours`}
                          </span>
                        </td>

                        {/* Points Earned */}
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                            (entry.pointsEarned || 0) > 0
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/5 text-slate-400'
                          }`}>
                            +{entry.pointsEarned || 0} PTS
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-white/10">
                            {entry.status || 'Active'}
                          </span>
                        </td>

                        {/* Actions: Edit / Delete */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditRecordModal(entry)}
                              className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer"
                              title="Edit Hours / Subject"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingRecord(entry)}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer"
                              title="Delete Record & Deduct Hours"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: TEMPORARY DISABLE MODAL                          */}
      {/* ========================================================= */}
      {tempDisableStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-navy-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Temporary Disable</h3>
                  <p className="text-xs text-slate-400">{tempDisableStudent.name} ({tempDisableStudent.rollNumber || 'No Roll'})</p>
                </div>
              </div>
              <button
                onClick={() => setTempDisableStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Student will see <strong className="text-amber-300">“Admin Disabled Until: [Date]”</strong> on their Coaching Study button. Access will resume automatically once the interval expires.
            </p>

            {/* Mode Selectors: Preset / Custom / Specific Date */}
            <div className="flex rounded-xl bg-navy-950 p-1 border border-white/10 text-xs font-bold">
              <button
                onClick={() => setTempDisableMode('preset')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${tempDisableMode === 'preset' ? 'bg-amber-500 text-navy-950 font-black' : 'text-slate-400'}`}
              >
                Presets
              </button>
              <button
                onClick={() => setTempDisableMode('custom')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${tempDisableMode === 'custom' ? 'bg-amber-500 text-navy-950 font-black' : 'text-slate-400'}`}
              >
                Custom Days
              </button>
              <button
                onClick={() => setTempDisableMode('date')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${tempDisableMode === 'date' ? 'bg-amber-500 text-navy-950 font-black' : 'text-slate-400'}`}
              >
                Specific Date
              </button>
            </div>

            {/* Presets Grid */}
            {tempDisableMode === 'preset' && (
              <div className="grid grid-cols-3 gap-2">
                {DISABLE_PRESETS.map(preset => (
                  <button
                    key={preset.days}
                    onClick={() => setTempPresetDays(preset.days)}
                    className={`p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      tempPresetDays === preset.days
                        ? 'bg-amber-500 text-navy-950 border-amber-400 shadow-glow-amber'
                        : 'bg-navy-950 text-slate-300 border-white/10 hover:border-amber-500/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {/* Custom Days Input */}
            {tempDisableMode === 'custom' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Enter Number of Days:</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={tempCustomDays}
                    onChange={(e) => setTempCustomDays(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500 font-bold"
                  />
                  <span className="absolute right-4 top-3 text-xs text-slate-400 font-bold">Days</span>
                </div>
              </div>
            )}

            {/* Specific Date Picker */}
            {tempDisableMode === 'date' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Disabled Until End of Date:</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={tempSelectedDate}
                  onChange={(e) => setTempSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setTempDisableStudent(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyTemporaryDisable}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 text-xs font-black transition-all shadow-glow-amber"
              >
                {submittingAction ? 'Applying...' : 'Apply Temporary Lock'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: VIEW / EDIT INITIAL FORM MODAL                   */}
      {/* ========================================================= */}
      {formModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-navy-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Student Initial Coaching Form</h3>
                  <p className="text-xs text-slate-400">{formModalStudent.name} • {formModalStudent.rollNumber || 'No Roll'}</p>
                </div>
              </div>
              <button
                onClick={() => setFormModalStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Your Name (as entered in form):</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">How many hours will you study in coaching?</label>
                <div className="relative mt-1.5">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="16"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  <span className="absolute right-4 top-2.5 text-xs text-slate-400 font-bold">Hours / Day</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">When will your coaching holiday be?</label>
                <select
                  value={formHoliday}
                  onChange={(e) => setFormHoliday(e.target.value)}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {formModalStudent.coachingStudyInitialForm?.submittedAt && (
                <div className="text-[11px] text-slate-500 italic">
                  Submitted at: {new Date(formModalStudent.coachingStudyInitialForm.submittedAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setFormModalStudent(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInitialForm}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-glow-indigo flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{submittingAction ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EDIT RECORD MODAL                                */}
      {/* ========================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-navy-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Edit Coaching Entry</h3>
                  <p className="text-xs text-slate-400">{editingRecord.studentName} ({editingRecord.dateDisplay || editingRecord.dateKey})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Subject Name:</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Study Time:</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="16"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 font-bold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Hours</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="5"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 font-bold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Mins</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed">
                Study time and milestone points will be automatically recalculated on student profile & daily stats.
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecordEdit}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-glow-indigo flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{submittingAction ? 'Updating...' : 'Save Changes'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION DIALOG                       */}
      {/* ========================================================= */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-navy-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Coaching Record?</h3>
                <p className="text-xs text-slate-400">Irreversible action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this coaching entry for <strong className="text-white">{deletingRecord.studentName}</strong>?
            </p>

            <div className="p-3.5 rounded-2xl bg-navy-950 border border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-white font-bold">{deletingRecord.dateDisplay || deletingRecord.dateKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subject:</span>
                <span className="text-white font-bold">{deletingRecord.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hours to deduct:</span>
                <span className="text-rose-400 font-bold">-{Number(deletingRecord.hours || 0).toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Points to deduct:</span>
                <span className="text-rose-400 font-bold">-{deletingRecord.pointsEarned || 0} PTS</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-glow-rose"
              >
                {submittingAction ? 'Deleting...' : 'Delete & Deduct'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
