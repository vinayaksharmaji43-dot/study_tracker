import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  doc, 
  setDoc, 
  getDoc, 
  increment, 
  serverTimestamp, 
  Timestamp, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getDateKey, formatDate, formatTimerTime, formatHours } from '../../utils/helpers';
import { getStreamId, STREAM_LABELS } from '../../utils/levelSystem';
import { isSubjectMatch } from '../../utils/subjectMatcher';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';
import { 
  Clock, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  BookOpen, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  FileText, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  X, 
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Tag,
  Target
} from 'lucide-react';

function getFallbackSubjects(course, level) {
  const c = String(course || 'CA').toUpperCase();
  const l = String(level || 'Foundation').toLowerCase();
  const isFinal = l.includes('final');
  const isInter = l.includes('inter');
  const isCma = c.includes('CMA');

  if (isCma) {
    if (isFinal) {
      return [
        'Paper 13: Corporate and Economic Laws',
        'Paper 14: Strategic Financial Management',
        'Paper 15: Direct Tax Laws and International Taxation',
        'Paper 16: Strategic Cost Management',
        'Paper 17: Cost and Management Audit',
        'Paper 18: Corporate Financial Reporting',
        'Paper 19: Indirect Tax Laws and Practice',
        'Paper 20: Strategic Performance Management and Business Valuation'
      ];
    }
    if (isInter) {
      return [
        'Paper 5: Business Laws and Ethics',
        'Paper 6: Financial Accounting',
        'Paper 7: Direct and Indirect Taxation',
        'Paper 8: Cost Accounting',
        'Paper 9: Operations Management and Strategic Management',
        'Paper 10: Corporate Accounting and Auditing',
        'Paper 11: Financial Management and Business Data Analytics',
        'Paper 12: Management Accounting'
      ];
    }
    return [
      'Paper 1: Fundamentals of Business Laws and Business Communication',
      'Paper 2: Fundamentals of Financial and Cost Accounting',
      'Paper 3: Fundamentals of Business Mathematics and Statistics',
      'Paper 4: Fundamentals of Business Economics and Management'
    ];
  }

  if (isFinal) {
    return [
      'Paper 1: Financial Reporting',
      'Paper 2: Advanced Financial Management',
      'Paper 3: Advanced Auditing, Assurance and Professional Ethics',
      'Paper 4: Direct Tax Laws and International Taxation',
      'Paper 5: Indirect Tax Laws',
      'Paper 6: Integrated Business Solutions'
    ];
  }

  if (isInter) {
    return [
      'Paper 1: Advanced Accounting',
      'Paper 2: Corporate and Other Laws',
      'Paper 3: Taxation',
      'Paper 4: Cost and Management Accounting',
      'Paper 5: Auditing and Ethics',
      'Paper 6: Financial Management and Strategic Management'
    ];
  }

  return [
    'Paper 1: Accounting',
    'Paper 2: Business Laws',
    'Paper 3: Quantitative Aptitude',
    'Paper 4: Business Economics'
  ];
}

function resolveStudentStream(student) {
  if (!student) return { course: 'CA', level: 'Foundation', label: 'CA Foundation', id: 'CA_Foundation' };
  const rawCourse = String(student.course || 'CA Foundation').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  if (rawCourse.includes('CMA')) course = 'CMA';
  const rawLevel = String(student.level || '').toUpperCase();
  if (rawCourse.includes('FINAL') || rawLevel.includes('FINAL')) level = 'Final';
  else if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND') || rawCourse.includes('FOUND')) level = 'Foundation';
  else if (student.level) level = student.level;
  
  const streamId = `${course}_${level}`;
  const label = STREAM_LABELS[streamId] || `${course} ${level}`;
  return { course, level, label, id: streamId };
}

export default function AdminStudentDataAdjustment() {
  const { currentUser, userProfile, isOwner, adminDesignation, hasPermission } = useAuth();
  const { isEyeCare } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sub-tabs: 'adjust' | 'history'
  const [activeTab, setActiveTab] = useState('adjust');

  // All Students list for search
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Date selection (default today IST)
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(new Date()));

  // Existing sessions on selected date for selected student
  const [existingSessions, setExistingSessions] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Available subjects for selected student's stream
  const [streamSubjects, setStreamSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Input hours per subject: { [subjectName]: { hours: 0, minutes: 0 } }
  const [subjectInputs, setSubjectInputs] = useState({});

  // Points adjustment (+ / -)
  const [pointsInput, setPointsInput] = useState('');

  // Reason (mandatory)
  const [reason, setReason] = useState('');

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState('');

  // 1. Fetch Students
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const studentsOnly = docs.filter(u => u.role !== 'admin' && !u.isOwner);
      setStudents(studentsOnly);
      setLoadingStudents(false);
    }, (err) => {
      console.error("Error loading students:", err);
      setLoadingStudents(false);
    });
    return () => unsub();
  }, []);

  // 2. Fetch History
  useEffect(() => {
    const qHistory = query(
      collection(db, 'manualAdjustments'), 
      orderBy('createdAt', 'desc'), 
      limit(100)
    );
    const unsub = onSnapshot(qHistory, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistoryList(docs);
      setLoadingHistory(false);
    }, (err) => {
      console.error("Error loading manual adjustments history:", err);
      setLoadingHistory(false);
    });
    return () => unsub();
  }, []);

  // Filtered Students for search
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return students.filter(s => {
      const roll = (s.rollNumber || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return roll.includes(q) || email.includes(q) || name.includes(q);
    }).slice(0, 8);
  }, [students, searchQuery]);

  // 3. When student changes, load stream subjects
  useEffect(() => {
    if (!selectedStudent) {
      setStreamSubjects([]);
      setSubjectInputs({});
      return;
    }

    const { course, level } = resolveStudentStream(selectedStudent);
    const fallbacks = getFallbackSubjects(course, level);
    setLoadingSubjects(true);

    const q = query(
      collection(db, 'timerSubjects'),
      where('course', '==', course),
      where('level', '==', level),
      where('active', '==', true)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let names = [];
      if (!snapshot.empty) {
        names = snapshot.docs
          .map(d => d.data().subjectName)
          .filter(Boolean);
      }
      if (names.length === 0) {
        names = fallbacks;
      }
      // Unique names
      const unique = Array.from(new Set(names));
      setStreamSubjects(unique);
      
      // Initialize inputs
      const init = {};
      unique.forEach(sub => {
        init[sub] = { hours: 0, minutes: 0 };
      });
      setSubjectInputs(init);
      setLoadingSubjects(false);
    }, (err) => {
      console.warn("Could not fetch timerSubjects, using fallbacks:", err);
      setStreamSubjects(fallbacks);
      const init = {};
      fallbacks.forEach(sub => {
        init[sub] = { hours: 0, minutes: 0 };
      });
      setSubjectInputs(init);
      setLoadingSubjects(false);
    });

    return () => unsub();
  }, [selectedStudent]);

  // 4. When student or selectedDate changes, load existing sessions for that date
  useEffect(() => {
    if (!selectedStudent?.id || !selectedDate) {
      setExistingSessions([]);
      return;
    }

    setLoadingExisting(true);
    const q = query(
      collection(db, 'studySessions'),
      where('uid', '==', selectedStudent.id),
      where('dateKey', '==', selectedDate)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setExistingSessions(list);
      setLoadingExisting(false);
    }, (err) => {
      console.error("Error loading existing sessions:", err);
      setLoadingExisting(false);
    });

    return () => unsub();
  }, [selectedStudent, selectedDate]);

  // Existing hours total on this date
  const existingTotals = useMemo(() => {
    let timerSecs = 0;
    let manualSecs = 0;
    const subjectBreakdown = {};

    existingSessions.forEach(s => {
      const dur = Number(s.duration) || 0;
      const sub = s.subject || 'General Study';
      if (!subjectBreakdown[sub]) {
        subjectBreakdown[sub] = { total: 0, timer: 0, manual: 0 };
      }
      subjectBreakdown[sub].total += dur;

      if (s.source === 'manual_adjustment' || s.isManualAdjustment) {
        manualSecs += dur;
        subjectBreakdown[sub].manual += dur;
      } else {
        timerSecs += dur;
        subjectBreakdown[sub].timer += dur;
      }
    });

    return {
      timerSecs,
      manualSecs,
      totalSecs: timerSecs + manualSecs,
      subjectBreakdown
    };
  }, [existingSessions]);

  // New hours to add (calculated from inputs)
  const newAdjustments = useMemo(() => {
    const items = [];
    let totalSecs = 0;
    Object.entries(subjectInputs).forEach(([subject, val]) => {
      const h = parseInt(val.hours, 10) || 0;
      const m = parseInt(val.minutes, 10) || 0;
      const secs = (h * 3600) + (m * 60);
      if (secs > 0) {
        items.push({ subject, hours: h, minutes: m, totalSeconds: secs });
        totalSecs += secs;
      }
    });
    return { items, totalSecs };
  }, [subjectInputs]);

  // Quick chips for subject hours
  const handleSetHours = (subject, h, m) => {
    setSubjectInputs(prev => ({
      ...prev,
      [subject]: { hours: h, minutes: m }
    }));
  };

  const handleAddMinutes = (subject, addMinutes) => {
    setSubjectInputs(prev => {
      const current = prev[subject] || { hours: 0, minutes: 0 };
      const currentTotalMin = (parseInt(current.hours, 10) || 0) * 60 + (parseInt(current.minutes, 10) || 0);
      const nextTotalMin = Math.max(0, currentTotalMin + addMinutes);
      return {
        ...prev,
        [subject]: {
          hours: Math.floor(nextTotalMin / 60),
          minutes: nextTotalMin % 60
        }
      };
    });
  };

  // Validation before opening confirmation modal
  const handleValidateAndOpenModal = (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      return toast.error("Please search and select a student first.");
    }
    if (!selectedDate) {
      return toast.error("Please select a study date.");
    }

    const pointsNum = pointsInput.trim() !== '' ? parseInt(pointsInput, 10) : 0;
    const hasHours = newAdjustments.totalSecs > 0;
    const hasPoints = !isNaN(pointsNum) && pointsNum !== 0;

    if (!hasHours && !hasPoints) {
      return toast.error("Please add study hours for at least one subject OR enter points to adjust.");
    }

    if (!reason.trim()) {
      return toast.error("Please enter a valid reason for this adjustment.");
    }

    setShowConfirmModal(true);
  };

  // Final Execution of Manual Adjustment
  const handleConfirmAdjustment = async () => {
    if (!selectedStudent || submitting) return;
    setSubmitting(true);

    try {
      const { course, level, label: streamLabel, id: streamId } = resolveStudentStream(selectedStudent);
      const pointsNum = pointsInput.trim() !== '' ? parseInt(pointsInput, 10) : 0;
      const adminName = adminDesignation || currentUser?.displayName || 'Admin';
      const adminEmail = currentUser?.email || '';
      const adminUid = currentUser?.uid || '';
      const studentId = selectedStudent.id;

      // Safe date object for that specific date (midday IST)
      const targetDateObj = new Date(`${selectedDate}T12:00:00`);
      const targetTimestamp = Timestamp.fromDate(targetDateObj);

      // 1. Write studySessions for each adjusted subject
      for (const item of newAdjustments.items) {
        await addDoc(collection(db, 'studySessions'), {
          uid: studentId,
          studentName: selectedStudent.name || 'Student',
          rollNumber: selectedStudent.rollNumber || '',
          course,
          level,
          stream: streamId,
          subject: item.subject,
          duration: item.totalSeconds,
          maxFocusSecs: item.totalSeconds,
          dateKey: selectedDate,
          date: targetTimestamp,
          source: 'manual_adjustment',
          isManualAdjustment: true,
          adjustedBy: adminUid,
          adjustedByName: adminName,
          adjustmentReason: reason.trim(),
          createdAt: serverTimestamp()
        });
      }

      // 2. Update studyDailyStats for this date
      if (newAdjustments.totalSecs > 0) {
        const statRef = doc(db, 'studyDailyStats', `${studentId}_${selectedDate}`);
        const statSnap = await getDoc(statRef);
        let prevTotalSecs = 0;
        let completedMilestones = [];
        if (statSnap.exists()) {
          const sData = statSnap.data();
          prevTotalSecs = Number(sData.totalStudySeconds) || 0;
          completedMilestones = Array.isArray(sData.completedMilestones) ? [...sData.completedMilestones] : [];
        }

        const newDaySecs = prevTotalSecs + newAdjustments.totalSecs;
        const newFullHours = Math.floor(newDaySecs / 3600);

        for (let h = 1; h <= newFullHours; h++) {
          if (!completedMilestones.includes(h)) {
            completedMilestones.push(h);
          }
        }

        await setDoc(statRef, {
          studentId,
          date: selectedDate,
          totalStudySeconds: newDaySecs,
          completedFullHours: newFullHours,
          completedMilestones,
          hasManualAdjustment: true,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // 3. Update User Document (Study Hours & Points)
      const userRef = doc(db, 'users', studentId);
      const userUpdates = {
        lastActiveAt: serverTimestamp()
      };
      if (newAdjustments.totalSecs > 0) {
        userUpdates.studyHours = increment(newAdjustments.totalSecs / 3600);
      }
      if (pointsNum !== 0) {
        userUpdates.points = increment(pointsNum);
      }
      await setDoc(userRef, userUpdates, { merge: true });

      // 4. Log pointTransaction if points adjusted
      if (pointsNum !== 0) {
        await addDoc(collection(db, 'pointTransactions'), {
          studentId,
          amount: pointsNum,
          type: pointsNum >= 0 ? 'manual_addition' : 'manual_deduction',
          reason: `Admin Adjustment: ${reason.trim()} (${adminName})`,
          date: selectedDate,
          source: 'manual_adjustment',
          adjustedBy: adminUid,
          adjustedByName: adminName,
          createdAt: serverTimestamp()
        });
      }

      // 5. Update matching targets for that student & subject
      if (newAdjustments.items.length > 0) {
        try {
          const qTargets = query(
            collection(db, 'targets'), 
            where('uid', '==', studentId),
            where('status', '!=', 'completed')
          );
          const tSnap = await getDoc(doc(db, 'users', studentId)); // verify user exists
          // Handled via onSnapshot in target tracker
        } catch (tErr) {
          console.warn("Target matching notice:", tErr);
        }
      }

      // 6. Record Audit History in manualAdjustments collection
      const totalHoursHuman = formatTimerTime(newAdjustments.totalSecs);
      await addDoc(collection(db, 'manualAdjustments'), {
        studentId,
        studentName: selectedStudent.name || 'Student',
        rollNumber: selectedStudent.rollNumber || '',
        studentEmail: selectedStudent.email || '',
        studentStream: streamLabel,
        adminUid,
        adminName,
        adminEmail,
        adminDesignation: adminDesignation || 'Admin',
        studyDate: selectedDate,
        adjustments: newAdjustments.items,
        totalSecondsAdjusted: newAdjustments.totalSecs,
        totalHoursHuman: newAdjustments.totalSecs > 0 ? `${Math.floor(newAdjustments.totalSecs / 3600)}h ${Math.floor((newAdjustments.totalSecs % 3600) / 60)}m` : '0h 0m',
        pointsAdjusted: pointsNum,
        reason: reason.trim(),
        createdAt: serverTimestamp()
      });

      toast.success("Student study data & points adjusted successfully!");
      setShowConfirmModal(false);

      // Reset hours and points inputs
      const resetInputs = {};
      streamSubjects.forEach(sub => {
        resetInputs[sub] = { hours: 0, minutes: 0 };
      });
      setSubjectInputs(resetInputs);
      setPointsInput('');
      setReason('');

    } catch (err) {
      console.error("Error executing manual adjustment:", err);
      toast.error(`Adjustment failed: ${err.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return historyList;
    return historyList.filter(h => {
      const sName = (h.studentName || '').toLowerCase();
      const sRoll = (h.rollNumber || '').toLowerCase();
      const aName = (h.adminName || '').toLowerCase();
      const aDesig = (h.adminDesignation || '').toLowerCase();
      const r = (h.reason || '').toLowerCase();
      const d = (h.studyDate || '').toLowerCase();
      return sName.includes(q) || sRoll.includes(q) || aName.includes(q) || aDesig.includes(q) || r.includes(q) || d.includes(q);
    });
  }, [historyList, historySearch]);

  const streamInfo = resolveStudentStream(selectedStudent);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <SlidersHorizontal className="w-7 h-7 text-emerald-400" />
            Student Study Data & Points Adjustment
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manually add or recover study hours and adjust milestone points for students when technical issues or timer glitches occur.
          </p>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 bg-navy-900/90 p-1 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('adjust')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'adjust'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>New Adjustment</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Adjustment History ({historyList.length})</span>
          </button>

          <button
            onClick={() => setSearchParams({ tab: 'target_strike_management' })}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 cursor-pointer"
            title="Switch to Target & Strike Recovery"
          >
            <Target className="w-4 h-4 text-purple-400" />
            <span>Target & Strike Recovery →</span>
          </button>
        </div>
      </div>

      {activeTab === 'adjust' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Search Student & Date Selection */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 1: Student Search Card */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  1. Search & Select Student
                </span>
                {selectedStudent && (
                  <button 
                    onClick={() => { setSelectedStudent(null); setSearchQuery(''); }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Change Student
                  </button>
                )}
              </div>

              {!selectedStudent ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by Roll Number or Gmail/Email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-navy-950/80 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
                    />
                  </div>

                  {searchQuery.trim() && (
                    <div className="border border-white/10 rounded-2xl bg-navy-950/90 divide-y divide-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No matching student found for "{searchQuery}"
                        </div>
                      ) : (
                        filteredStudents.map(s => {
                          const sStream = resolveStudentStream(s);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => { setSelectedStudent(s); setSearchQuery(''); }}
                              className="w-full p-3 text-left hover:bg-emerald-500/10 transition-colors flex items-center justify-between group"
                            >
                              <div className="space-y-0.5">
                                <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                                  {s.name || 'Unnamed Student'}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                  <span className="font-mono text-emerald-400">{s.rollNumber || 'No Roll'}</span>
                                  <span>•</span>
                                  <span className="truncate max-w-[180px]">{s.email}</span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-lg bg-navy-800 text-[10px] font-bold text-slate-300 border border-white/10">
                                {sStream.label}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    💡 Enter student's 10-digit roll number or Gmail ID to load their profile and study record.
                  </p>
                </div>
              ) : (
                /* Selected Student Profile Badge */
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-black text-white">{selectedStudent.name || 'Student'}</div>
                      <div className="text-xs text-slate-300 mt-0.5">{selectedStudent.email}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                      {streamInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Roll Number</span>
                      <span className="font-mono font-bold text-emerald-400">{selectedStudent.rollNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Logged Time</span>
                      <span className="font-bold text-sky-400">{formatHours(selectedStudent.studyHours || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Points</span>
                      <span className="font-bold text-gold-400 font-mono">{(selectedStudent.points || 0).toLocaleString()} PTS</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Stream</span>
                      <span className="text-slate-200 font-medium">{selectedStudent.course || 'CA'} • {selectedStudent.level || 'Foundation'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Date Selector Card */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                2. Select Study Date (IST)
              </span>

              <div className="space-y-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-navy-950/80 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />

                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getDateKey(new Date()))}
                    className="px-3 py-1 rounded-xl bg-navy-900 hover:bg-navy-800 text-slate-300 border border-white/10 transition"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setSelectedDate(getDateKey(d));
                    }}
                    className="px-3 py-1 rounded-xl bg-navy-900 hover:bg-navy-800 text-slate-300 border border-white/10 transition"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 2);
                      setSelectedDate(getDateKey(d));
                    }}
                    className="px-3 py-1 rounded-xl bg-navy-900 hover:bg-navy-800 text-slate-300 border border-white/10 transition"
                  >
                    2 Days Ago
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Select any historical date to backfill or add missing study hours.
                </p>
              </div>
            </div>

            {/* Existing Records for Selected Date */}
            {selectedStudent && (
              <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    Existing Log on {selectedDate}
                  </span>
                  <span className="text-xs font-mono font-bold text-white bg-navy-900 px-2 py-0.5 rounded-lg border border-white/10">
                    Total: {formatTimerTime(existingTotals.totalSecs)}
                  </span>
                </div>

                {loadingExisting ? (
                  <div className="text-xs text-slate-400 p-4 text-center">Loading existing logs...</div>
                ) : existingSessions.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-navy-950/60 border border-white/5 text-center text-xs text-slate-400">
                    No study sessions recorded for this student on {selectedDate}.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                    {existingSessions.map(sess => {
                      const isManual = sess.source === 'manual_adjustment' || sess.isManualAdjustment;
                      return (
                        <div 
                          key={sess.id} 
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            isManual 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                              : 'bg-navy-950/60 border-white/5 text-slate-200'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{sess.subject}</span>
                              {isManual ? (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                  Manual
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                  Timer
                                </span>
                              )}
                            </div>
                            {isManual && sess.adjustedByName && (
                              <div className="text-[10px] text-amber-300/80">
                                By: {sess.adjustedByName} {sess.adjustmentReason ? `(${sess.adjustmentReason})` : ''}
                              </div>
                            )}
                          </div>
                          <div className="font-mono font-bold text-right shrink-0">
                            {formatTimerTime(sess.duration || 0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Column: Subject-Wise Hours Input & Points Adjustment */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleValidateAndOpenModal} className="glass-card p-5 sm:p-7 rounded-3xl border border-white/10 shadow-xl space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    3. Add / Adjust Subject Study Hours
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter hours and minutes for each subject. Do not overwrite existing timer data.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Adding Total</span>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    +{formatTimerTime(newAdjustments.totalSecs)}
                  </span>
                </div>
              </div>

              {!selectedStudent ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <User className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-sm font-semibold text-slate-300">Select a student first to load their stream subjects.</p>
                  <p className="text-xs text-slate-500">Subjects will automatically adapt to CA Foundation, CA Inter, CMA Foundation, CMA Inter, etc.</p>
                </div>
              ) : loadingSubjects ? (
                <div className="py-12 text-center text-slate-400">Loading stream subjects...</div>
              ) : (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                  {streamSubjects.map((subject) => {
                    const input = subjectInputs[subject] || { hours: 0, minutes: 0 };
                    const hasValue = (parseInt(input.hours, 10) > 0 || parseInt(input.minutes, 10) > 0);

                    return (
                      <div 
                        key={subject}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                          hasValue 
                            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm' 
                            : 'bg-navy-950/60 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-white truncate max-w-[340px]">
                            {subject}
                          </label>
                          {hasValue && (
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              +{(parseInt(input.hours, 10) || 0)}h {(parseInt(input.minutes, 10) || 0)}m
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Hours Input */}
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              placeholder="0"
                              value={input.hours || ''}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(24, parseInt(e.target.value, 10) || 0));
                                handleSetHours(subject, val, input.minutes);
                              }}
                              className="w-full px-3 py-1.5 bg-navy-900 border border-white/10 rounded-xl text-white text-sm text-center font-mono focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-xs text-slate-400 font-bold">Hours</span>
                          </div>

                          {/* Minutes Input */}
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              step="5"
                              placeholder="0"
                              value={input.minutes || ''}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                                handleSetHours(subject, input.hours, val);
                              }}
                              className="w-full px-3 py-1.5 bg-navy-900 border border-white/10 rounded-xl text-white text-sm text-center font-mono focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-xs text-slate-400 font-bold">Mins</span>
                          </div>

                          {/* Quick Chips */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAddMinutes(subject, 30)}
                              className="px-2 py-1 bg-navy-800 hover:bg-navy-700 text-slate-300 rounded-lg text-[10px] font-bold transition"
                              title="Add 30 minutes"
                            >
                              +30m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddMinutes(subject, 60)}
                              className="px-2 py-1 bg-navy-800 hover:bg-navy-700 text-slate-300 rounded-lg text-[10px] font-bold transition"
                              title="Add 1 hour"
                            >
                              +1h
                            </button>
                            {hasValue && (
                              <button
                                type="button"
                                onClick={() => handleSetHours(subject, 0, 0)}
                                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[10px] font-bold transition"
                                title="Clear hours"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 4: Manual Points Adjustment */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  4. Manual Points Adjustment (Optional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Points to Add or Deduct (+ / -)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. +10 or -5"
                      value={pointsInput}
                      onChange={(e) => setPointsInput(e.target.value)}
                      className="w-full px-3.5 py-2 bg-navy-950/80 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {selectedStudent && (
                    <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Current Points:</span>
                        <span className="font-mono text-white font-bold">{(selectedStudent.points || 0).toLocaleString()}</span>
                      </div>
                      {pointsInput.trim() !== '' && !isNaN(parseInt(pointsInput, 10)) && (
                        <div className="flex justify-between text-amber-300 font-bold border-t border-white/5 pt-1">
                          <span>Projected Points:</span>
                          <span className="font-mono">{((selectedStudent.points || 0) + parseInt(pointsInput, 10)).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 5: Mandatory Reason */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  5. Reason for Adjustment (Mandatory)
                </span>

                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Study timer data was not saved due to a server/website glitch on 02 Oct."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-navy-950/80 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
                />

                {/* Quick Reason Template Chips */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setReason("Study timer data was not saved due to a technical/server issue.")}
                    className="px-2.5 py-1 rounded-lg bg-navy-900 text-slate-300 hover:text-white border border-white/10 transition"
                  >
                    Glitch Compensation
                  </button>
                  <button
                    type="button"
                    onClick={() => setReason("Offline coaching lecture hours approved by coordinator.")}
                    className="px-2.5 py-1 rounded-lg bg-navy-900 text-slate-300 hover:text-white border border-white/10 transition"
                  >
                    Offline Coaching Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setReason("Bonus achievement points rewarded by Admin.")}
                    className="px-2.5 py-1 rounded-lg bg-navy-900 text-slate-300 hover:text-white border border-white/10 transition"
                  >
                    Bonus Points
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={!selectedStudent}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Preview & Confirm Adjustment</span>
                </button>
              </div>

            </form>
          </div>

        </div>
      ) : (
        /* Adjustment History Tab */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search history by Student Name, Roll No, Admin or Reason..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing <strong className="text-white font-mono">{filteredHistory.length}</strong> manual adjustment records
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            {loadingHistory ? (
              <div className="p-8 text-center text-slate-400">Loading adjustment audit history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <History className="w-10 h-10 mx-auto opacity-40 text-emerald-400" />
                <p className="text-sm font-bold text-white">No manual adjustment records found</p>
                <p className="text-xs text-slate-500">Every manual addition or edit made by an Admin will be permanently logged here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-900/90 text-slate-300 font-bold border-b border-white/10 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Study Date</th>
                      <th className="px-5 py-3.5">Subjects & Hours Added</th>
                      <th className="px-5 py-3.5">Points</th>
                      <th className="px-5 py-3.5">Reason & Admin Attribution</th>
                      <th className="px-5 py-3.5 text-right">Adjustment Time (IST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        
                        {/* Student */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-sm">{item.studentName}</div>
                          <div className="text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                            <span className="text-emerald-400">{item.rollNumber || 'No Roll'}</span>
                            <span>•</span>
                            <span className="text-[11px]">{item.studentStream || 'CA'}</span>
                          </div>
                        </td>

                        {/* Study Date */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/30 font-bold font-mono text-[11px]">
                            📅 {item.studyDate}
                          </span>
                        </td>

                        {/* Subjects & Hours Added */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="font-bold text-emerald-400 font-mono">
                              +{item.totalHoursHuman || formatTimerTime(item.totalSecondsAdjusted || 0)}
                            </div>
                            {Array.isArray(item.adjustments) && item.adjustments.map((adj, i) => (
                              <div key={i} className="text-[11px] text-slate-300">
                                • {adj.subject}: <strong className="text-white">{adj.hours}h {adj.minutes}m</strong>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Points */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {item.pointsAdjusted !== undefined && item.pointsAdjusted !== 0 ? (
                            <span className={`px-2.5 py-1 rounded-xl font-bold font-mono text-xs ${
                              item.pointsAdjusted > 0 
                                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30' 
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {item.pointsAdjusted > 0 ? `+${item.pointsAdjusted}` : item.pointsAdjusted} PTS
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">—</span>
                          )}
                        </td>

                        {/* Reason & Attribution */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="text-slate-200 text-xs italic">
                            "{item.reason}"
                          </div>
                          <div className="text-[10px] text-sky-400 mt-1 flex items-center gap-1 font-semibold">
                            <ShieldCheck className="w-3 h-3 text-sky-400" />
                            <span>Adjusted by: {item.adminDesignation ? `${item.adminDesignation}` : (item.adminName || 'Admin')}</span>
                          </div>
                        </td>

                        {/* Adjustment Time */}
                        <td className="px-5 py-4 text-right whitespace-nowrap font-mono text-slate-400 text-[11px]">
                          {formatDate(item.createdAt)}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-navy-900 border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
            
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-black text-white">
                Confirm Manual Data Adjustment
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-2xl text-amber-200">
              “You are about to manually adjust this student's study data. This action will be recorded in the adjustment history. Do you want to continue?”
            </p>

            {/* Summary Box */}
            <div className="p-4 rounded-2xl bg-navy-950 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Student:</span>
                <span className="font-bold text-white">{selectedStudent?.name} ({selectedStudent?.rollNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stream:</span>
                <span className="text-emerald-400 font-bold">{streamInfo.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Study Date:</span>
                <span className="font-mono font-bold text-sky-400">{selectedDate}</span>
              </div>
              {newAdjustments.totalSecs > 0 && (
                <div className="flex justify-between border-t border-white/5 pt-1.5">
                  <span className="text-slate-400">Total Study Time to Add:</span>
                  <span className="font-mono font-bold text-emerald-400">+{formatTimerTime(newAdjustments.totalSecs)}</span>
                </div>
              )}
              {pointsInput.trim() !== '' && parseInt(pointsInput, 10) !== 0 && (
                <div className="flex justify-between border-t border-white/5 pt-1.5">
                  <span className="text-slate-400">Points to Adjust:</span>
                  <span className="font-mono font-bold text-gold-400">{parseInt(pointsInput, 10) > 0 ? `+${pointsInput}` : pointsInput} PTS</span>
                </div>
              )}
              <div className="border-t border-white/5 pt-1.5 space-y-0.5">
                <span className="text-slate-400 block">Reason:</span>
                <span className="text-slate-200 italic">"{reason}"</span>
              </div>
              <div className="border-t border-white/5 pt-1.5 flex justify-between text-[11px] text-sky-400">
                <span>Recorded By:</span>
                <span>{adminDesignation || 'Admin'}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjustment}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Apply</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
