import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  increment, 
  serverTimestamp, 
  Timestamp, 
  orderBy, 
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getDateKey, formatDate, formatTimerTime, formatHours } from '../../utils/helpers';
import { STREAM_LABELS } from '../../utils/levelSystem';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';
import { 
  Target, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Flame, 
  RotateCcw, 
  Plus, 
  Minus, 
  Search, 
  AlertTriangle, 
  Calendar, 
  User, 
  History, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  FileText, 
  Check, 
  X,
  BookOpen,
  Award,
  SlidersHorizontal,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';

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

export default function AdminTargetStrikeManagement() {
  const { currentUser, adminDesignation, isOwner } = useAuth();
  const { isEyeCare } = useTheme();

  // Top Tab Navigation
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'audit_logs'

  // Student Search State
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Targets State for Selected Student
  const [studentTargets, setStudentTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetStatusFilter, setTargetStatusFilter] = useState('all'); // 'all', 'pending', 'half_completed', 'completed', 'missed'

  // Study Sessions for Selected Student (for Timer Context)
  const [studentSessions, setStudentSessions] = useState([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [auditFilter, setAuditFilter] = useState('all'); // 'all', 'target_update', 'points_adjust', 'strike_modify', 'timer_add'

  // Modals State
  const [activeManageTarget, setActiveManageTarget] = useState(null);
  const [targetNewStatus, setTargetNewStatus] = useState('completed'); // 'completed', 'half_completed', 'pending', 'missed'
  const [targetPointsMode, setTargetPointsMode] = useState('auto'); // 'auto' | 'custom'
  const [targetCustomPoints, setTargetCustomPoints] = useState('10');
  const [targetReason, setTargetReason] = useState('Target not saved due to website/server glitch; study verified');
  const [glitchProtection, setGlitchProtection] = useState(true);
  const [submittingTarget, setSubmittingTarget] = useState(false);

  // Standalone Points Adjustment Modal
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [standalonePointsAction, setStandalonePointsAction] = useState('add'); // 'add' | 'deduct'
  const [standalonePointsAmount, setStandalonePointsAmount] = useState('10');
  const [standalonePointsReason, setStandalonePointsReason] = useState('');
  const [submittingPoints, setSubmittingPoints] = useState(false);

  // Strike & Streak Modal
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [strikeActionType, setStrikeActionType] = useState('remove'); // 'add' | 'remove' | 'set_custom' | 'restore_streak'
  const [strikeCustomValue, setStrikeCustomValue] = useState('0');
  const [strikeReason, setStrikeReason] = useState('Removed unfair strike caused by technical website glitch');
  const [submittingStrike, setSubmittingStrike] = useState(false);

  // Step 1: Quick Timer Hour Recovery Form
  const [showTimerRecoverCard, setShowTimerRecoverCard] = useState(false);
  const [timerDate, setTimerDate] = useState(() => getDateKey(new Date()));
  const [timerSubject, setTimerSubject] = useState('');
  const [timerHours, setTimerHours] = useState('2');
  const [timerMinutes, setTimerMinutes] = useState('0');
  const [timerReason, setTimerReason] = useState('Recover lost timer session due to server glitch');
  const [submittingTimer, setSubmittingTimer] = useState(false);

  // Confirmation Modal
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  // 1. Fetch Students List
  useEffect(() => {
    const qUsers = query(collection(db, 'users'));
    const unsub = onSnapshot(qUsers, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setStudents(list);
      setLoadingStudents(false);
    }, (err) => {
      console.error("Error loading students:", err);
      setLoadingStudents(false);
    });
    return () => unsub();
  }, []);

  // Sync selectedStudent updates if student data changes in Firestore
  useEffect(() => {
    if (!selectedStudent) return;
    const fresh = students.find(s => s.id === selectedStudent.id);
    if (fresh) setSelectedStudent(fresh);
  }, [students]);

  // 2. Fetch Targets for Selected Student
  useEffect(() => {
    if (!selectedStudent?.id) {
      setStudentTargets([]);
      return;
    }
    setLoadingTargets(true);
    const qT = query(collection(db, 'targets'), where('uid', '==', selectedStudent.id));
    const unsub = onSnapshot(qT, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : (a.date?.toDate ? a.date.toDate() : new Date(a.date || 0));
        const dbDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.date?.toDate ? b.date.toDate() : new Date(b.date || 0));
        return dbDate - da;
      });
      setStudentTargets(docs);
      setLoadingTargets(false);
    }, (err) => {
      console.error("Error loading targets:", err);
      setLoadingTargets(false);
    });
    return () => unsub();
  }, [selectedStudent?.id]);

  // 3. Fetch Sessions for Selected Student
  useEffect(() => {
    if (!selectedStudent?.id) {
      setStudentSessions([]);
      return;
    }
    const qS = query(collection(db, 'studySessions'), where('uid', '==', selectedStudent.id));
    const unsub = onSnapshot(qS, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudentSessions(docs);
    });
    return () => unsub();
  }, [selectedStudent?.id]);

  // 4. Fetch Audit Logs
  useEffect(() => {
    setLoadingLogs(true);
    const qLogs = query(
      collection(db, 'adminTargetStrikeLogs'),
      orderBy('createdAt', 'desc'),
      limit(150)
    );
    const unsub = onSnapshot(qLogs, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAuditLogs(docs);
      setLoadingLogs(false);
    }, (err) => {
      console.error("Error loading audit logs:", err);
      setLoadingLogs(false);
    });
    return () => unsub();
  }, []);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return students.filter(s => {
      const name = (s.name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const roll = String(s.rollNumber || '').toLowerCase();
      const phone = String(s.phoneNumber || '').toLowerCase();
      return name.includes(q) || email.includes(q) || roll.includes(q) || phone.includes(q);
    }).slice(0, 10);
  }, [students, searchQuery]);

  // Fallback Stream Subjects for Quick Timer
  const streamInfo = useMemo(() => resolveStudentStream(selectedStudent), [selectedStudent]);
  const fallbackSubjects = useMemo(() => getFallbackSubjects(streamInfo.course, streamInfo.level), [streamInfo]);

  useEffect(() => {
    if (fallbackSubjects.length > 0 && !timerSubject) {
      setTimerSubject(fallbackSubjects[0]);
    }
  }, [fallbackSubjects]);

  // Target Filtered List
  const filteredTargets = useMemo(() => {
    return studentTargets.filter(t => {
      const status = t.status || (t.completed ? 'completed' : 'pending');
      if (targetStatusFilter === 'all') return true;
      if (targetStatusFilter === 'completed') return status === 'completed' || t.completed === true;
      if (targetStatusFilter === 'half_completed') return status === 'half_completed';
      if (targetStatusFilter === 'missed') return status === 'missed' || t.targetPenaltyApplied;
      if (targetStatusFilter === 'pending') return status === 'pending' && !t.completed && status !== 'half_completed' && status !== 'missed';
      return true;
    });
  }, [studentTargets, targetStatusFilter]);

  // Helper to calculate target points difference
  const calculatePointsForTargetStatus = (status, customPoints) => {
    if (targetPointsMode === 'custom') {
      return parseInt(customPoints, 10) || 0;
    }
    if (status === 'completed') return 10;
    if (status === 'half_completed') return 5;
    if (status === 'missed') return -3;
    return 0; // pending
  };

  // -------------------------------------------------------------
  // ACTION 1: Quick Add Study Timer Session (Step 1)
  // -------------------------------------------------------------
  const handleQuickAddStudyHours = async () => {
    if (!selectedStudent) return;
    const hours = parseFloat(timerHours) || 0;
    const mins = parseFloat(timerMinutes) || 0;
    const totalSecs = Math.round((hours * 3600) + (mins * 60));

    if (totalSecs <= 0) {
      toast.error("Please enter a valid study duration greater than 0 minutes.");
      return;
    }
    if (!timerReason.trim()) {
      toast.error("Please enter a reason for adding manual study hours.");
      return;
    }

    setPendingConfirmation({
      title: "Add Study Timer Session",
      message: `You are adding ${hours}h ${mins}m of study time for ${selectedStudent.name || 'Student'} on ${timerDate}. This will update their total study hours and daily stats. Continue?`,
      action: async () => {
        setSubmittingTimer(true);
        try {
          const adminName = adminDesignation || currentUser?.displayName || currentUser?.email || 'Admin';
          const adminUid = currentUser?.uid || 'admin';
          const targetDateObj = new Date(`${timerDate}T12:00:00`);
          const targetTimestamp = Timestamp.fromDate(targetDateObj);

          // 1. Add studySession
          await addDoc(collection(db, 'studySessions'), {
            uid: selectedStudent.id,
            studentName: selectedStudent.name || 'Student',
            rollNumber: selectedStudent.rollNumber || '',
            course: streamInfo.course,
            level: streamInfo.level,
            stream: streamInfo.id,
            subject: timerSubject,
            duration: totalSecs,
            maxFocusSecs: totalSecs,
            dateKey: timerDate,
            date: targetTimestamp,
            source: 'target_glitch_recovery',
            isManualAdjustment: true,
            adjustedBy: adminUid,
            adjustedByName: adminName,
            adjustmentReason: timerReason.trim(),
            createdAt: serverTimestamp()
          });

          // 2. Update user doc study hours
          await setDoc(doc(db, 'users', selectedStudent.id), {
            studyHours: increment(totalSecs / 3600),
            lastActiveAt: serverTimestamp()
          }, { merge: true });

          // 3. Update daily study stats
          const statRef = doc(db, 'studyDailyStats', `${selectedStudent.id}_${timerDate}`);
          const statSnap = await getDoc(statRef);
          let prevSecs = 0;
          let completedMilestones = [];
          if (statSnap.exists()) {
            const sData = statSnap.data();
            prevSecs = Number(sData.totalStudySeconds) || 0;
            completedMilestones = Array.isArray(sData.completedMilestones) ? [...sData.completedMilestones] : [];
          }
          const newTotal = prevSecs + totalSecs;
          const fullHours = Math.floor(newTotal / 3600);
          for (let h = 1; h <= fullHours; h++) {
            if (!completedMilestones.includes(h)) completedMilestones.push(h);
          }
          await setDoc(statRef, {
            studentId: selectedStudent.id,
            date: timerDate,
            totalStudySeconds: newTotal,
            completedFullHours: fullHours,
            completedMilestones,
            hasManualAdjustment: true,
            updatedAt: serverTimestamp()
          }, { merge: true });

          // 4. Audit Log
          await addDoc(collection(db, 'adminTargetStrikeLogs'), {
            actionType: 'timer_add',
            studentId: selectedStudent.id,
            studentName: selectedStudent.name || 'Student',
            studentEmail: selectedStudent.email || '',
            rollNumber: selectedStudent.rollNumber || '',
            subject: timerSubject,
            durationSeconds: totalSecs,
            durationFormatted: `${hours}h ${mins}m`,
            studyDate: timerDate,
            reason: timerReason.trim(),
            adminEmail: currentUser?.email || '',
            adminName,
            createdAt: serverTimestamp()
          });

          toast.success(`Successfully added ${hours}h ${mins}m study time!`);
          setShowTimerRecoverCard(false);
          setTimerHours('2');
          setTimerMinutes('0');
        } catch (err) {
          console.error("Error adding study hours:", err);
          toast.error("Failed to add study hours: " + err.message);
        } finally {
          setSubmittingTimer(false);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // ACTION 2: Manage Target (Step 2)
  // -------------------------------------------------------------
  const handleOpenManageTarget = (target) => {
    setActiveManageTarget(target);
    const currStatus = target.status || (target.completed ? 'completed' : 'pending');
    setTargetNewStatus(currStatus === 'pending' ? 'completed' : currStatus);
    setTargetPointsMode('auto');
    setTargetCustomPoints('10');
    setTargetReason('Target completion and points recovered due to verified technical glitch');
    setGlitchProtection(true);
  };

  const handleConfirmTargetChanges = async () => {
    if (!activeManageTarget || !selectedStudent) return;
    if (!targetReason.trim()) {
      toast.error("Please enter a reason for adjusting this target.");
      return;
    }

    const previousStatus = activeManageTarget.status || (activeManageTarget.completed ? 'completed' : 'pending');
    const previousPoints = Number(activeManageTarget.awardedPoints || (previousStatus === 'completed' ? 10 : (previousStatus === 'half_completed' ? 5 : (previousStatus === 'missed' ? -3 : 0))));
    const newPoints = calculatePointsForTargetStatus(targetNewStatus, targetCustomPoints);
    const pointsDelta = newPoints - previousPoints;

    setPendingConfirmation({
      title: "Confirm Target Adjustment",
      message: `You are adjusting Target "${activeManageTarget.title}".
Status: ${previousStatus.toUpperCase()} ➜ ${targetNewStatus.toUpperCase()}
Points Change: ${pointsDelta >= 0 ? `+${pointsDelta}` : pointsDelta} PTS (Prev: ${previousPoints}, New: ${newPoints})
Reason: "${targetReason.trim()}"

This action will be permanently recorded in the Admin Audit Log. Continue?`,
      action: async () => {
        setSubmittingTarget(true);
        try {
          const adminName = adminDesignation || currentUser?.displayName || currentUser?.email || 'Admin';
          const batch = writeBatch(db);
          const targetRef = doc(db, 'targets', activeManageTarget.id);
          const userRef = doc(db, 'users', selectedStudent.id);
          const txRef = doc(collection(db, 'pointTransactions'));

          // 1. Update Target Document
          const isCompleted = targetNewStatus === 'completed';
          const isHalf = targetNewStatus === 'half_completed';
          const isMissed = targetNewStatus === 'missed';

          batch.update(targetRef, {
            status: targetNewStatus,
            completed: isCompleted || isHalf,
            targetRewardGranted: isCompleted || isHalf,
            targetPenaltyApplied: isMissed && !glitchProtection,
            glitchProtected: glitchProtection,
            awardedPoints: newPoints,
            lastAdjustedBy: currentUser?.email || 'admin',
            lastAdjustedByName: adminName,
            adjustmentReason: targetReason.trim(),
            adjustedAt: serverTimestamp(),
            ...(isCompleted || isHalf ? { completedAt: serverTimestamp() } : {})
          });

          // 2. Adjust User Points if difference exists
          if (pointsDelta !== 0) {
            batch.update(userRef, {
              points: increment(pointsDelta),
              lastActiveAt: serverTimestamp()
            });

            // Add transaction record
            batch.set(txRef, {
              studentId: selectedStudent.id,
              amount: pointsDelta,
              type: pointsDelta >= 0 ? 'admin_target_award' : 'admin_target_deduction',
              reason: `Admin Target Recovery: ${targetReason.trim()} (${adminName})`,
              sourceId: activeManageTarget.id,
              targetTitle: activeManageTarget.title || 'Target',
              subject: activeManageTarget.subject || 'General Study',
              date: getDateKey(new Date()),
              adjustedBy: currentUser?.email || 'admin',
              createdAt: serverTimestamp()
            });
          }

          // Commit batch
          await batch.commit();

          // 3. Log into Audit Log
          await addDoc(collection(db, 'adminTargetStrikeLogs'), {
            actionType: 'target_update',
            studentId: selectedStudent.id,
            studentName: selectedStudent.name || 'Student',
            studentEmail: selectedStudent.email || '',
            rollNumber: selectedStudent.rollNumber || '',
            targetId: activeManageTarget.id,
            targetTitle: activeManageTarget.title || '',
            targetSubject: activeManageTarget.subject || '',
            previousStatus,
            newStatus: targetNewStatus,
            previousPoints,
            newPoints,
            pointsDelta,
            glitchProtected: glitchProtection,
            reason: targetReason.trim(),
            adminEmail: currentUser?.email || '',
            adminName,
            createdAt: serverTimestamp()
          });

          toast.success("Target updated & points synchronized successfully!");
          setActiveManageTarget(null);
        } catch (err) {
          console.error("Error managing target:", err);
          toast.error("Failed to update target: " + err.message);
        } finally {
          setSubmittingTarget(false);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // ACTION 3: Standalone Points Adjustment (Step 3)
  // -------------------------------------------------------------
  const handleConfirmStandalonePoints = async () => {
    if (!selectedStudent) return;
    const num = parseInt(standalonePointsAmount, 10) || 0;
    if (num <= 0) {
      toast.error("Please enter a points amount greater than 0.");
      return;
    }
    if (!standalonePointsReason.trim()) {
      toast.error("Please provide a reason for manual points adjustment.");
      return;
    }

    const delta = standalonePointsAction === 'add' ? num : -num;

    setPendingConfirmation({
      title: "Confirm Manual Points Adjustment",
      message: `You are about to ${standalonePointsAction === 'add' ? 'ADD' : 'DEDUCT'} ${Math.abs(delta)} Points ${standalonePointsAction === 'add' ? 'to' : 'from'} ${selectedStudent.name || 'Student'}.
Reason: "${standalonePointsReason.trim()}"
Continue?`,
      action: async () => {
        setSubmittingPoints(true);
        try {
          const adminName = adminDesignation || currentUser?.displayName || currentUser?.email || 'Admin';
          const userRef = doc(db, 'users', selectedStudent.id);

          await updateDoc(userRef, {
            points: increment(delta),
            lastActiveAt: serverTimestamp()
          });

          // Log in pointTransactions
          await addDoc(collection(db, 'pointTransactions'), {
            studentId: selectedStudent.id,
            amount: delta,
            type: delta >= 0 ? 'manual_addition' : 'manual_deduction',
            reason: `Admin Points Adjustment: ${standalonePointsReason.trim()} (${adminName})`,
            date: getDateKey(new Date()),
            source: 'admin_manual_adjustment',
            adjustedBy: currentUser?.email || 'admin',
            adjustedByName: adminName,
            createdAt: serverTimestamp()
          });

          // Log in Audit Log
          await addDoc(collection(db, 'adminTargetStrikeLogs'), {
            actionType: 'points_adjust',
            studentId: selectedStudent.id,
            studentName: selectedStudent.name || 'Student',
            studentEmail: selectedStudent.email || '',
            rollNumber: selectedStudent.rollNumber || '',
            pointsDelta: delta,
            reason: standalonePointsReason.trim(),
            adminEmail: currentUser?.email || '',
            adminName,
            createdAt: serverTimestamp()
          });

          toast.success(`Successfully ${delta >= 0 ? 'added' : 'deducted'} ${Math.abs(delta)} points!`);
          setShowPointsModal(false);
          setStandalonePointsAmount('10');
          setStandalonePointsReason('');
        } catch (err) {
          console.error("Error adjusting points:", err);
          toast.error("Failed to adjust points: " + err.message);
        } finally {
          setSubmittingPoints(false);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // ACTION 4: Strike & Streak Management (Step 4)
  // -------------------------------------------------------------
  const handleConfirmStrikeAction = async () => {
    if (!selectedStudent) return;
    if (!strikeReason.trim()) {
      toast.error("Please provide a reason/note for this strike action.");
      return;
    }

    const currentStrikes = Number(selectedStudent.strikes || selectedStudent.strikesCount || 0);
    const currentStreak = Number(selectedStudent.streak || 0);

    let newStrikes = currentStrikes;
    let newStreak = currentStreak;
    let descriptionText = '';

    if (strikeActionType === 'add') {
      newStrikes = currentStrikes + 1;
      descriptionText = `Add 1 Strike (Current: ${currentStrikes} ➜ New: ${newStrikes})`;
    } else if (strikeActionType === 'remove') {
      newStrikes = Math.max(0, currentStrikes - 1);
      descriptionText = `Remove 1 Strike (Current: ${currentStrikes} ➜ New: ${newStrikes})`;
    } else if (strikeActionType === 'set_custom') {
      const val = parseInt(strikeCustomValue, 10);
      if (isNaN(val) || val < 0) {
        toast.error("Please enter a valid non-negative strike count.");
        return;
      }
      newStrikes = val;
      descriptionText = `Set Strike Count to ${newStrikes} (Prev: ${currentStrikes})`;
    } else if (strikeActionType === 'restore_streak') {
      const val = parseInt(strikeCustomValue, 10);
      if (isNaN(val) || val < 0) {
        toast.error("Please enter a valid streak count (in days).");
        return;
      }
      newStreak = val;
      descriptionText = `Restore/Set Study Streak to ${newStreak} Days (Prev: ${currentStreak} Days)`;
    }

    setPendingConfirmation({
      title: "Confirm Strike / Streak Action",
      message: `You are about to execute: ${descriptionText} for ${selectedStudent.name || 'Student'}.
Reason: "${strikeReason.trim()}"
Continue?`,
      action: async () => {
        setSubmittingStrike(true);
        try {
          const adminName = adminDesignation || currentUser?.displayName || currentUser?.email || 'Admin';
          const userRef = doc(db, 'users', selectedStudent.id);

          const updates = {
            lastActiveAt: serverTimestamp()
          };

          if (strikeActionType === 'restore_streak') {
            updates.streak = newStreak;
          } else {
            updates.strikes = newStrikes;
            updates.strikesCount = newStrikes;
          }

          await updateDoc(userRef, updates);

          // Add to Audit Log
          await addDoc(collection(db, 'adminTargetStrikeLogs'), {
            actionType: 'strike_modify',
            studentId: selectedStudent.id,
            studentName: selectedStudent.name || 'Student',
            studentEmail: selectedStudent.email || '',
            rollNumber: selectedStudent.rollNumber || '',
            strikeActionType,
            previousStrikes: currentStrikes,
            newStrikes,
            previousStreak: currentStreak,
            newStreak,
            description: descriptionText,
            reason: strikeReason.trim(),
            adminEmail: currentUser?.email || '',
            adminName,
            createdAt: serverTimestamp()
          });

          toast.success("Strike & streak status updated successfully!");
          setShowStrikeModal(false);
          setStrikeReason('');
        } catch (err) {
          console.error("Error modifying strikes:", err);
          toast.error("Failed to modify strikes: " + err.message);
        } finally {
          setSubmittingStrike(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-2xl ${
        isEyeCare 
          ? 'bg-gradient-to-r from-navy-950 via-purple-950/40 to-slate-900 border-purple-500/30 text-white' 
          : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-blue-200 text-slate-900'
      }`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span>Glitch Recovery & Student Dispute Resolution</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Target & Strike <span className="gold-gradient-text">Recovery System</span>
            </h1>
            <p className="text-xs sm:text-sm opacity-80 max-w-2xl leading-relaxed">
              Manually recover lost study timer hours, complete broken targets, adjust student points, and clear unfair disciplinary strikes caused by server or browser glitches.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-navy-900/60 p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'manage'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Student Recovery</span>
            </button>
            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'audit_logs'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit History ({auditLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'manage' && (
        <div className="space-y-6">

          {/* 1. Student Search Card */}
          <div className={`p-6 rounded-3xl border shadow-xl relative ${
            isEyeCare ? 'bg-navy-900/80 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <h2 className="text-base font-black flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-purple-400" />
              <span>Search & Select Student</span>
            </h2>

            <div className="relative max-w-2xl">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Roll Number, Gmail/Email, or Student Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm font-semibold focus:outline-none ${
                  isEyeCare 
                    ? 'bg-navy-950 border-white/10 text-white focus:border-purple-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              />

              {filteredStudents.length > 0 && searchQuery.trim() && (
                <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-2xl z-30 max-h-72 overflow-y-auto divide-y ${
                  isEyeCare ? 'bg-navy-900 border-white/10 divide-white/5 text-white' : 'bg-white border-slate-200 divide-slate-100 text-slate-900'
                }`}>
                  {filteredStudents.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setSelectedStudent(st);
                        setSearchQuery('');
                      }}
                      className="w-full p-3.5 text-left flex items-center justify-between hover:bg-purple-500/10 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-black flex items-center gap-2">
                          <span>{st.name || 'Unnamed Student'}</span>
                          {st.rollNumber && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Roll: {st.rollNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{st.email}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-400">
                          {st.course || 'CA'} {st.level || 'Foundation'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Students Pills if none selected */}
            {!selectedStudent && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <span className="text-xs text-slate-400 block mb-2 font-bold uppercase tracking-wider">Quick Select Recent Students:</span>
                <div className="flex flex-wrap gap-2">
                  {students.slice(0, 6).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        isEyeCare 
                          ? 'bg-navy-950/70 border-white/10 text-slate-300 hover:border-purple-400 hover:text-white' 
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {s.name || s.email?.split('@')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Student Profile Banner & Action Hub */}
          {selectedStudent ? (
            <div className="space-y-6">
              
              {/* Student Overview Card */}
              <div className={`p-6 rounded-3xl border shadow-xl ${
                isEyeCare ? 'bg-navy-900/90 border-white/10' : 'bg-white border-blue-200'
              }`}>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                      {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : 'S'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-black">{selectedStudent.name || 'Student'}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {streamInfo.label}
                        </span>
                        {selectedStudent.rollNumber && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Roll #{selectedStudent.rollNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>{selectedStudent.email}</span>
                        <span>•</span>
                        <span>Attempt: <strong className="text-slate-200">{selectedStudent.attempt || 'Jan 27'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Student Stats Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                    <div className="p-3 rounded-2xl bg-navy-950/80 border border-white/5 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Points</div>
                      <div className="text-base font-black text-gold-400 flex items-center justify-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>{selectedStudent.points || 0} PTS</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-navy-950/80 border border-white/5 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Study Hours</div>
                      <div className="text-base font-black text-sky-400 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatHours(selectedStudent.studyHours || 0)}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-navy-950/80 border border-white/5 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Study Streak</div>
                      <div className="text-base font-black text-amber-400 flex items-center justify-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{selectedStudent.streak || 0}d</span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-2xl border text-center ${
                      (selectedStudent.strikes || 0) > 0 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                        : 'bg-navy-950/80 border-white/5 text-slate-300'
                    }`}>
                      <div className="text-[10px] font-bold uppercase tracking-wider">Strikes</div>
                      <div className="text-base font-black flex items-center justify-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{selectedStudent.strikes || selectedStudent.strikesCount || 0}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Quick Action Toolbar */}
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTimerRecoverCard(prev => !prev)}
                      className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{showTimerRecoverCard ? 'Hide Timer Adder' : '1. Add/Fix Study Hours'}</span>
                    </button>

                    <button
                      onClick={() => setShowPointsModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>2. Adjust Extra Points</span>
                    </button>

                    <button
                      onClick={() => setShowStrikeModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>3. Strike / Streak Control</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Deselect Student</span>
                  </button>
                </div>
              </div>

              {/* Step 1 Quick Timer Adder Card (Collapsible) */}
              {showTimerRecoverCard && (
                <div className={`p-6 rounded-3xl border shadow-xl relative animate-in fade-in duration-200 ${
                  isEyeCare ? 'bg-navy-900/90 border-purple-500/30' : 'bg-purple-50/50 border-purple-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-400" />
                      <h3 className="text-base font-black">Step 1: Add Lost Study Hours (Timer Correction)</h3>
                    </div>
                    <button onClick={() => setShowTimerRecoverCard(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">
                    If this student's timer crashed or was not recorded, add their verified study duration here so it reflects in their stats and enables target completion.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={timerDate}
                        max={getDateKey(new Date())}
                        onChange={(e) => setTimerDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Subject
                      </label>
                      <select
                        value={timerSubject}
                        onChange={(e) => setTimerSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold"
                      >
                        {fallbackSubjects.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={timerHours}
                        onChange={(e) => setTimerHours(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Minutes
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={timerMinutes}
                        onChange={(e) => setTimerMinutes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Reason / Note
                    </label>
                    <input
                      type="text"
                      value={timerReason}
                      onChange={(e) => setTimerReason(e.target.value)}
                      placeholder="e.g. Timer sync failed due to network glitch"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTimerRecoverCard(false)}
                      className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingTimer}
                      onClick={handleQuickAddStudyHours}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
                    >
                      {submittingTimer ? 'Adding...' : 'Confirm & Save Study Hours'}
                    </button>
                  </div>
                </div>
              )}

              {/* Target Management Section (Step 2) */}
              <div className={`p-6 rounded-3xl border shadow-xl ${
                isEyeCare ? 'bg-navy-900/80 border-white/10' : 'bg-white border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-400" />
                      <span>Step 2: Student Target Management ({studentTargets.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage pending, half-done, or missed targets. Award points and protect the student from penalties caused by glitches.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-navy-950 p-1.5 rounded-2xl border border-white/10">
                    {[
                      { id: 'all', label: `All (${studentTargets.length})` },
                      { id: 'pending', label: 'Pending' },
                      { id: 'half_completed', label: 'Half Done' },
                      { id: 'completed', label: 'Completed' },
                      { id: 'missed', label: 'Missed' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setTargetStatusFilter(f.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          targetStatusFilter === f.id
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingTargets ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                    <span>Loading student targets...</span>
                  </div>
                ) : filteredTargets.length === 0 ? (
                  <EmptyState
                    icon={Target}
                    title="No Targets Found"
                    description={`No targets found matching status "${targetStatusFilter}" for ${selectedStudent.name}.`}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTargets.map((t) => {
                      const status = t.status || (t.completed ? 'completed' : 'pending');
                      const isCompleted = status === 'completed' || t.completed === true;
                      const isHalf = status === 'half_completed';
                      const isMissed = status === 'missed' || t.targetPenaltyApplied;
                      const isPending = !isCompleted && !isHalf && !isMissed;

                      return (
                        <div
                          key={t.id}
                          className={`p-5 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${
                            isEyeCare ? 'bg-navy-950/70 border-white/5 hover:border-white/15' : 'bg-slate-50 border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                {t.subject || 'Subject'} {t.targetDate ? `• ${t.targetDate}` : ''}
                              </span>
                              <h4 className="text-sm font-black text-white">{t.title}</h4>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                              isCompleted 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                : isHalf
                                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                                : isMissed
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            }`}>
                              {isCompleted ? '✓ Completed' : isHalf ? '◐ Half Done' : isMissed ? '✕ Missed' : '⏳ Pending'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                            <div>
                              Target Hours: <strong className="text-white">{t.targetHours || t.targetValue || 2.0}h</strong>
                            </div>
                            <div className="font-bold">
                              Points: <span className={t.awardedPoints > 0 ? 'text-emerald-400' : t.awardedPoints < 0 ? 'text-rose-400' : 'text-slate-400'}>
                                {t.awardedPoints ? (t.awardedPoints > 0 ? `+${t.awardedPoints}` : t.awardedPoints) : (isCompleted ? '+10' : isHalf ? '+5' : isMissed ? '-3' : '0')} PTS
                              </span>
                            </div>
                          </div>

                          {t.glitchProtected && (
                            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-300 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>Glitch recovery applied: Student protected from penalty.</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenManageTarget(t)}
                            className="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Manage Target & Status</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className={`p-12 rounded-3xl border text-center space-y-4 ${
              isEyeCare ? 'bg-navy-900/40 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <Search className="w-12 h-12 mx-auto text-purple-400 opacity-60" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Student Selected</h3>
                <p className="text-xs max-w-md mx-auto opacity-80">
                  Search above by roll number, student name, or email to view their target status, fix lost timer sessions, and manage strikes.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. Audit History & Logs View */}
      {activeTab === 'audit_logs' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-6 ${
          isEyeCare ? 'bg-navy-900/80 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <span>Admin Target & Strike Audit Log</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Every change made to targets, points, strikes, or timers is permanently logged for complete audit trail.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-xs text-white font-bold"
              >
                <option value="all">All Action Types</option>
                <option value="target_update">Target Updates</option>
                <option value="points_adjust">Points Adjustments</option>
                <option value="strike_modify">Strike / Streak Actions</option>
                <option value="timer_add">Timer Additions</option>
              </select>
            </div>
          </div>

          {loadingLogs ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
              <span>Loading audit trail...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Audit Records"
              description="No manual adjustments have been performed yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Date (IST)</th>
                    <th className="py-3 px-3">Student</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Details</th>
                    <th className="py-3 px-3">Points Delta</th>
                    <th className="py-3 px-3">Admin</th>
                    <th className="py-3 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs
                    .filter(log => auditFilter === 'all' || log.actionType === auditFilter)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-purple-500/5 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {log.createdAt ? formatDate(log.createdAt) : 'Just now'}
                        </td>
                        <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                          <div>{log.studentName}</div>
                          {log.rollNumber && <div className="text-[10px] text-purple-300 font-mono">Roll #{log.rollNumber}</div>}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            log.actionType === 'target_update'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : log.actionType === 'strike_modify'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : log.actionType === 'timer_add'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                          }`}>
                            {log.actionType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-xs">
                          {log.actionType === 'target_update' && (
                            <div>
                              <strong className="text-white">{log.targetTitle}</strong>: {log.previousStatus} ➜ <span className="text-emerald-400 font-bold">{log.newStatus}</span>
                            </div>
                          )}
                          {log.actionType === 'strike_modify' && (
                            <div>{log.description}</div>
                          )}
                          {log.actionType === 'timer_add' && (
                            <div>Added {log.durationFormatted} ({log.subject}) on {log.studyDate}</div>
                          )}
                          {log.actionType === 'points_adjust' && (
                            <div>Manual Points {log.pointsDelta >= 0 ? `+${log.pointsDelta}` : log.pointsDelta} PTS</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-black whitespace-nowrap">
                          {log.pointsDelta !== undefined && log.pointsDelta !== null ? (
                            <span className={log.pointsDelta > 0 ? 'text-emerald-400' : log.pointsDelta < 0 ? 'text-rose-400' : 'text-slate-400'}>
                              {log.pointsDelta > 0 ? `+${log.pointsDelta}` : log.pointsDelta} PTS
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          <div className="font-semibold">{log.adminName}</div>
                          <div className="text-[10px] text-slate-500">{log.adminEmail}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-400 italic max-w-sm">
                          "{log.reason}"
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Manage Target & Award Points */}
      {activeManageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/40 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Glitch Recovery & Points
                </span>
                <h3 className="text-lg font-black text-white">Manage Student Target</h3>
                <p className="text-xs text-slate-300 mt-1 font-semibold">{activeManageTarget.title}</p>
              </div>
              <button onClick={() => setActiveManageTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-navy-950 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Subject:</span>
                <span className="font-bold text-white">{activeManageTarget.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-bold uppercase text-amber-400">{activeManageTarget.status || 'pending'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Value:</span>
                <span className="font-bold text-white">{activeManageTarget.targetHours || activeManageTarget.targetValue || 2.0} Hours</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Select New Target Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'completed', label: '✓ Completed (+10 pts)', col: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' },
                    { id: 'half_completed', label: '◐ Half Done (+5 pts)', col: 'border-sky-500/50 bg-sky-500/10 text-sky-300' },
                    { id: 'pending', label: '⏳ Keep Pending (0 pts)', col: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
                    { id: 'missed', label: '✕ Missed (-3 pts)', col: 'border-rose-500/50 bg-rose-500/10 text-rose-300' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTargetNewStatus(s.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        targetNewStatus === s.id ? `${s.col} ring-2 ring-purple-500` : 'border-white/10 bg-navy-950 text-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Points Mode */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Points Calculation
                  </label>
                  <div className="flex gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setTargetPointsMode('auto')}
                      className={`px-2 py-0.5 rounded-lg ${targetPointsMode === 'auto' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                    >
                      Rule Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetPointsMode('custom')}
                      className={`px-2 py-0.5 rounded-lg ${targetPointsMode === 'custom' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                    >
                      Custom PTS
                    </button>
                  </div>
                </div>

                {targetPointsMode === 'custom' ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={targetCustomPoints}
                      onChange={(e) => setTargetCustomPoints(e.target.value)}
                      placeholder="e.g. 10 or 5 or 0"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold"
                    />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
                    <span>Award for {targetNewStatus}:</span>
                    <strong className="text-sm font-black text-white">
                      {calculatePointsForTargetStatus(targetNewStatus, targetCustomPoints)} PTS
                    </strong>
                  </div>
                )}
              </div>

              {/* Glitch Protection Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-navy-950 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={glitchProtection}
                  onChange={(e) => setGlitchProtection(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">Shield from Unfair Strike / Penalty</span>
                  <span className="text-slate-400 text-[11px]">
                    Protects student from missed target penalties or automatic negative point evaluator deductions.
                  </span>
                </div>
              </label>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Reason / Audit Note (Required)
                </label>
                <textarea
                  rows={2}
                  value={targetReason}
                  onChange={(e) => setTargetReason(e.target.value)}
                  placeholder="e.g. Student timer was not saved due to website glitch; verified through notes"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveManageTarget(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingTarget}
                onClick={handleConfirmTargetChanges}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md disabled:opacity-50"
              >
                {submittingTarget ? 'Applying...' : 'Apply Target Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Standalone Points Adjustment */}
      {showPointsModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/40 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-gold-400 uppercase tracking-wider block">
                  Step 2: Manual Points Control
                </span>
                <h3 className="text-lg font-black text-white">Adjust Student Points</h3>
                <p className="text-xs text-slate-300 mt-1">For {selectedStudent.name || 'Student'}</p>
              </div>
              <button onClick={() => setShowPointsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStandalonePointsAction('add')}
                  className={`p-3 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    standalonePointsAction === 'add'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-navy-950 border-white/10 text-slate-400'
                  }`}
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add Points (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStandalonePointsAction('deduct')}
                  className={`p-3 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    standalonePointsAction === 'deduct'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-navy-950 border-white/10 text-slate-400'
                  }`}
                >
                  <Minus className="w-4 h-4 text-rose-400" />
                  <span>Deduct Points (-)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Points Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={standalonePointsAmount}
                  onChange={(e) => setStandalonePointsAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white font-black text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Reason / Note (Required)
                </label>
                <textarea
                  rows={2}
                  value={standalonePointsReason}
                  onChange={(e) => setStandalonePointsReason(e.target.value)}
                  placeholder="e.g. Compensated 10 points for lost study session on Friday"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowPointsModal(false)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingPoints}
                onClick={handleConfirmStandalonePoints}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-black shadow-md disabled:opacity-50"
              >
                {submittingPoints ? 'Processing...' : 'Apply Points'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Strike & Streak Management */}
      {showStrikeModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/40 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                  Step 3: Strike & Streak Control
                </span>
                <h3 className="text-lg font-black text-white">Strike / Streak Management</h3>
                <p className="text-xs text-slate-300 mt-1">For {selectedStudent.name || 'Student'}</p>
              </div>
              <button onClick={() => setShowStrikeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-navy-950 border border-white/10 text-xs">
              <div>
                <span className="text-slate-400 block">Current Strike Count:</span>
                <span className="text-base font-black text-rose-400">
                  {selectedStudent.strikes || selectedStudent.strikesCount || 0} Strikes
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Current Study Streak:</span>
                <span className="text-base font-black text-amber-400">
                  {selectedStudent.streak || 0} Days
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Select Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStrikeActionType('remove');
                      setStrikeReason('Removed unfair strike caused by technical website glitch');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      strikeActionType === 'remove'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-navy-950 border-white/10 text-slate-400'
                    }`}
                  >
                    Remove Strike (-1)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStrikeActionType('add');
                      setStrikeReason('Discipline / missed study targets without exemption');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      strikeActionType === 'add'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-navy-950 border-white/10 text-slate-400'
                    }`}
                  >
                    Add Strike (+1)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStrikeActionType('set_custom');
                      setStrikeCustomValue('0');
                      setStrikeReason('Reset strike count to 0 after dispute review');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      strikeActionType === 'set_custom'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-navy-950 border-white/10 text-slate-400'
                    }`}
                  >
                    Set Strike Count
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStrikeActionType('restore_streak');
                      setStrikeCustomValue(String((selectedStudent.streak || 0) + 1));
                      setStrikeReason('Restored broken streak lost due to website downtime');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      strikeActionType === 'restore_streak'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-navy-950 border-white/10 text-slate-400'
                    }`}
                  >
                    Restore Study Streak
                  </button>
                </div>
              </div>

              {(strikeActionType === 'set_custom' || strikeActionType === 'restore_streak') && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    {strikeActionType === 'restore_streak' ? 'New Streak Days' : 'New Strike Count'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={strikeCustomValue}
                    onChange={(e) => setStrikeCustomValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white font-bold text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Reason / Note (Required)
                </label>
                <textarea
                  rows={2}
                  value={strikeReason}
                  onChange={(e) => setStrikeReason(e.target.value)}
                  placeholder="e.g. Cleared false strike after student submitted glitch video"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowStrikeModal(false)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingStrike}
                onClick={handleConfirmStrikeAction}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-black shadow-md disabled:opacity-50"
              >
                {submittingStrike ? 'Updating...' : 'Execute Strike Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP MODAL */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/50 max-w-md w-full shadow-2xl space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">{pendingConfirmation.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line text-left bg-navy-950/70 p-3.5 rounded-2xl border border-white/5 font-mono">
                {pendingConfirmation.message}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingConfirmation(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const act = pendingConfirmation.action;
                  setPendingConfirmation(null);
                  if (act) await act();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black shadow-lg hover:brightness-110"
              >
                Yes, Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
