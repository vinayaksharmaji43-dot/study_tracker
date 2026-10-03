import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  getDateKey, 
  formatDate, 
  formatExactTime, 
  formatHours, 
  formatTimerTime, 
  formatTabAwayTime 
} from '../../utils/helpers';
import { getStreamId, STREAM_OPTIONS, STREAM_LABELS } from '../../utils/levelSystem';
import { isSubjectMatch } from '../../utils/subjectMatcher';
import { syncDailyPointsAndEligibility } from '../../services/pointsService';
import { logAdminAction, subscribeStudentActionHistory } from '../../services/adminActionLogger';
import ProBadge from '../../components/ProBadge';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';
import { 
  User, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Target, 
  Award, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  CheckCircle2, 
  X, 
  Plus, 
  Minus, 
  Search, 
  Calendar, 
  RefreshCw, 
  Sliders, 
  Zap, 
  Eye, 
  EyeOff, 
  LogOut, 
  ChevronRight, 
  History, 
  Flame, 
  ArrowRight, 
  BookOpen, 
  Lock, 
  Sparkles, 
  Filter, 
  FileText,
  RotateCcw,
  Check
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'adjustment', label: 'Adjustment', icon: Sliders },
  { id: 'targets', label: 'Targets', icon: Target },
  { id: 'points', label: 'Points', icon: Award },
  { id: 'strike', label: 'Strike', icon: AlertTriangle },
  { id: 'recovery', label: 'Recovery', icon: ShieldCheck },
  { id: 'timer', label: 'Study Timer', icon: Clock },
  { id: 'history', label: 'History', icon: History }
];

export default function StudentManagementCenter({
  student: initialStudent,
  allStudents = [],
  initialTab = 'overview',
  onClose,
  onStudentUpdated
}) {
  const { currentUser, userProfile, isOwner, hasPermission } = useAuth();
  const { isEyeCare } = useTheme();

  // Permissions check
  const canEdit = isOwner || hasPermission('edit_students');

  // Currently managed student (always identified by unique internal student ID)
  const [currentStudent, setCurrentStudent] = useState(initialStudent);
  const studentUid = currentStudent?.id || currentStudent?.uid;

  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  // Subscribed collections for this student
  const [sessions, setSessions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [dayOffs, setDayOffs] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [streamSubjects, setStreamSubjects] = useState([]);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmType: 'danger', // 'danger' | 'primary'
    onConfirm: null
  });

  // Today key
  const todayKey = getDateKey();
  const currentMonthKey = todayKey.slice(0, 7);

  // 1. Sync student state with latest user record
  useEffect(() => {
    if (!studentUid) return;
    const unsub = onSnapshot(doc(db, 'users', studentUid), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, uid: snap.id, ...snap.data() };
        setCurrentStudent(data);
        if (onStudentUpdated) onStudentUpdated(data);
      }
    });
    return () => unsub();
  }, [studentUid]);

  // 2. Load student's studySessions
  useEffect(() => {
    if (!studentUid) return;
    const q = query(collection(db, 'studySessions'), where('uid', '==', studentUid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        const dbDate = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
        return dbDate - da;
      });
      setSessions(docs);
    });
    return () => unsub();
  }, [studentUid]);

  // 3. Load student's targets
  useEffect(() => {
    if (!studentUid) return;
    const q = query(collection(db, 'targets'), where('uid', '==', studentUid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.targetDate || '').localeCompare(a.targetDate || ''));
      setTargets(docs);
    });
    return () => unsub();
  }, [studentUid]);

  // 4. Load student's warnings/strikes
  useEffect(() => {
    if (!studentUid) return;
    const q = query(collection(db, 'warnings'), where('uid', '==', studentUid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dbDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dbDate - da;
      });
      setWarnings(docs);
    });
    return () => unsub();
  }, [studentUid]);

  // 5. Load student's Day Off records
  useEffect(() => {
    if (!studentUid) return;
    const dayOffQuery = collection(db, 'dayOffs', studentUid, 'records');
    const unsub = onSnapshot(dayOffQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDayOffs(docs);
    });
    return () => unsub();
  }, [studentUid]);

  // 6. Load student's live session presence
  useEffect(() => {
    if (!studentUid) return;
    const liveDocRef = doc(db, 'activeStudySessions', studentUid);
    const unsub = onSnapshot(liveDocRef, (snap) => {
      if (snap.exists() && snap.data()?.active) {
        setLiveSession({ id: snap.id, ...snap.data() });
      } else {
        setLiveSession(null);
      }
    });
    return () => unsub();
  }, [studentUid]);

  // 7. Subscribe to complete Admin Action History for this student
  useEffect(() => {
    if (!studentUid) return;
    const unsub = subscribeStudentActionHistory(db, studentUid, (historyDocs) => {
      setActionHistory(historyDocs);
    });
    return () => unsub();
  }, [studentUid]);

  // 8. Stream Subjects for Study Time Adjustment
  useEffect(() => {
    if (!currentStudent) return;
    const rawCourse = String(currentStudent.course || 'CA').toUpperCase();
    const isCma = rawCourse.includes('CMA');
    const course = isCma ? 'CMA' : 'CA';
    const level = currentStudent.level || (rawCourse.includes('INTER') ? 'Intermediate' : 'Foundation');

    const q = query(
      collection(db, 'timerSubjects'),
      where('course', '==', course),
      where('level', '==', level),
      where('active', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const names = snap.docs.map(d => d.data().subjectName).filter(Boolean);
        setStreamSubjects(Array.from(new Set(names)));
      } else {
        setStreamSubjects([
          'Accounting',
          'Business Laws',
          'Quantitative Aptitude',
          'Business Economics',
          'Taxation',
          'Cost and Management Accounting',
          'Audit and Ethics'
        ]);
      }
    });
    return () => unsub();
  }, [currentStudent?.course, currentStudent?.level]);

  // Filtered students for quick switcher search
  const searchedStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return [];
    return allStudents.filter(s => {
      const name = (s.name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const roll = (s.rollNumber || '').toLowerCase();
      return name.includes(q) || email.includes(q) || roll.includes(q);
    }).slice(0, 6);
  }, [allStudents, studentSearch]);

  // Current month day offs
  const studentMonthDayOffs = useMemo(() => {
    return dayOffs.filter(d => 
      (d.monthKey === currentMonthKey || (d.dateKey && d.dateKey.startsWith(currentMonthKey))) &&
      d.status === 'active'
    );
  }, [dayOffs, currentMonthKey]);

  const isTodayDayOffActive = useMemo(() => {
    return dayOffs.some(d => d.dateKey === todayKey && d.status === 'active');
  }, [dayOffs, todayKey]);

  // Centralized action logger shortcut
  const recordAction = async ({ actionType, previousValue, newValue, added, reason, metadata }) => {
    return await logAdminAction(db, {
      studentId: studentUid,
      studentName: currentStudent?.name || 'Student',
      studentEmail: currentStudent?.email || '',
      adminId: currentUser?.uid || 'admin',
      adminName: userProfile?.name || currentUser?.displayName || currentUser?.email || 'Admin',
      adminEmail: currentUser?.email || '',
      actionType,
      previousValue,
      newValue,
      added,
      reason,
      metadata
    });
  };

  // ==========================================
  // TAB 1: OVERVIEW ACTIONS
  // ==========================================
  const [isEditingStream, setIsEditingStream] = useState(false);
  const [newStreamChoice, setNewStreamChoice] = useState('');
  const [streamReason, setStreamReason] = useState('');

  const handleUpdateStream = async () => {
    if (!canEdit) return toast.error("Admin permission required.");
    if (!newStreamChoice) return toast.error("Please select a stream.");
    if (!streamReason.trim()) return toast.error("Please provide an audit reason.");

    const opt = STREAM_OPTIONS.find(o => o.id === newStreamChoice);
    if (!opt) return;

    const prevStream = `${currentStudent.course || ''} ${currentStudent.level || ''}`.trim() || 'CA Foundation';
    const newStream = opt.label;

    try {
      await updateDoc(doc(db, 'users', studentUid), {
        course: opt.course,
        level: opt.level,
        stream: opt.id,
        updatedAt: serverTimestamp()
      });

      await recordAction({
        actionType: 'Updated Stream',
        previousValue: prevStream,
        newValue: newStream,
        reason: streamReason
      });

      toast.success(`Stream updated to ${newStream}`);
      setIsEditingStream(false);
      setStreamReason('');
    } catch (err) {
      toast.error(`Failed to update stream: ${err.message}`);
    }
  };

  const handleTogglePro = async () => {
    if (!canEdit) return toast.error("Admin permission required.");
    const isPro = Boolean(currentStudent.isPro || currentStudent.proAccess);
    const actionText = isPro ? 'Revoke PRO Access' : 'Grant PRO Access';

    setConfirmModal({
      isOpen: true,
      title: `${actionText}?`,
      message: `Are you sure you want to ${actionText.toLowerCase()} for ${currentStudent.name}?`,
      confirmText: actionText,
      confirmType: isPro ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', studentUid), {
            isPro: !isPro,
            proAccess: !isPro,
            [isPro ? 'proRevokedAt' : 'proGrantedAt']: serverTimestamp()
          });

          await recordAction({
            actionType: isPro ? 'Revoked PRO Access' : 'Granted PRO Access',
            previousValue: isPro ? 'PRO Active' : 'Free Tier',
            newValue: !isPro ? 'PRO Active' : 'Free Tier',
            reason: `Admin manual toggle of PRO membership`
          });

          toast.success(`PRO status updated for ${currentStudent.name}`);
        } catch (err) {
          toast.error(`Failed: ${err.message}`);
        }
      }
    });
  };

  const handleForceLogout = async () => {
    if (!canEdit) return toast.error("Admin permission required.");
    setConfirmModal({
      isOpen: true,
      title: "Force Remote Logout?",
      message: `This will immediately invalidate the session for ${currentStudent.name} and force them to re-login.`,
      confirmText: "Confirm Remote Logout",
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', studentUid), {
            forceLogout: true,
            forceLoggedOutAt: serverTimestamp()
          });

          await recordAction({
            actionType: 'Force Logged Out',
            previousValue: 'Active Session',
            newValue: 'Session Terminated',
            reason: 'Admin forced remote logout'
          });

          toast.success(`Student ${currentStudent.name} has been remotely logged out.`);
        } catch (err) {
          toast.error(`Logout failed: ${err.message}`);
        }
      }
    });
  };

  // ==========================================
  // TAB 2: ADJUSTMENT ACTIONS (Study Time)
  // ==========================================
  const [adjustDate, setAdjustDate] = useState(todayKey);
  const [adjustSubjectInputs, setAdjustSubjectInputs] = useState({});
  const [adjustReason, setAdjustReason] = useState('');
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);

  const existingDateSessions = useMemo(() => {
    return sessions.filter(s => s.dateKey === adjustDate);
  }, [sessions, adjustDate]);

  const existingDateSeconds = useMemo(() => {
    return existingDateSessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  }, [existingDateSessions]);

  const additionalSeconds = useMemo(() => {
    return Object.values(adjustSubjectInputs).reduce((acc, inp) => {
      const h = Number(inp?.hours) || 0;
      const m = Number(inp?.minutes) || 0;
      return acc + (h * 3600) + (m * 60);
    }, 0);
  }, [adjustSubjectInputs]);

  const handleSubjectTimeChange = (sub, field, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setAdjustSubjectInputs(prev => ({
      ...prev,
      [sub]: {
        hours: field === 'hours' ? num : (prev[sub]?.hours || 0),
        minutes: field === 'minutes' ? num : (prev[sub]?.minutes || 0)
      }
    }));
  };

  const handleApplyAdjustment = async () => {
    if (!canEdit) return toast.error("Admin permission required.");
    if (additionalSeconds <= 0) return toast.error("Please add at least some study time.");
    if (!adjustReason.trim()) return toast.error("Please provide an adjustment reason.");

    setConfirmModal({
      isOpen: true,
      title: "Apply Study Time Adjustment?",
      message: `Add ${formatTimerTime(additionalSeconds)} to ${currentStudent.name} for date ${adjustDate}?`,
      confirmText: "Apply Time Adjustment",
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setIsApplyingAdjustment(true);

          for (const [subName, time] of Object.entries(adjustSubjectInputs)) {
            const dur = ((Number(time.hours) || 0) * 3600) + ((Number(time.minutes) || 0) * 60);
            if (dur > 0) {
              await addDoc(collection(db, 'studySessions'), {
                uid: studentUid,
                studentName: currentStudent.name || 'Student',
                rollNumber: currentStudent.rollNumber || '',
                subject: subName,
                duration: dur,
                maxFocusSecs: dur,
                course: currentStudent.course || 'CA',
                level: currentStudent.level || 'Foundation',
                dateKey: adjustDate,
                date: serverTimestamp(),
                source: 'admin_adjustment',
                isManualAdjustment: true,
                adjustedByAdmin: true,
                reason: adjustReason.trim()
              });
            }
          }

          // Recalculate daily stats and points
          await syncDailyPointsAndEligibility({
            db,
            uid: studentUid,
            dateKey: adjustDate,
            sessions: [
              ...sessions,
              { dateKey: adjustDate, duration: additionalSeconds }
            ],
            targets
          });

          await recordAction({
            actionType: 'Adjusted Study Time',
            previousValue: `${formatTimerTime(existingDateSeconds)} (${formatHours(existingDateSeconds, true)})`,
            newValue: `${formatTimerTime(existingDateSeconds + additionalSeconds)} (${formatHours(existingDateSeconds + additionalSeconds, true)})`,
            added: `+${formatTimerTime(additionalSeconds)}`,
            reason: adjustReason.trim(),
            metadata: { date: adjustDate, addedSeconds: additionalSeconds }
          });

          toast.success("Study time adjusted successfully!");
          setAdjustSubjectInputs({});
          setAdjustReason('');
        } catch (err) {
          toast.error(`Adjustment failed: ${err.message}`);
        } finally {
          setIsApplyingAdjustment(false);
        }
      }
    });
  };

  // ==========================================
  // TAB 3: TARGETS ACTIONS
  // ==========================================
  const [targetFilter, setTargetFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [newTargetSubject, setNewTargetSubject] = useState('');
  const [newTargetMinutes, setNewTargetMinutes] = useState(60);
  const [newTargetDate, setNewTargetDate] = useState(todayKey);
  const [newTargetReason, setNewTargetReason] = useState('');
  const [isCreatingTarget, setIsCreatingTarget] = useState(false);

  const filteredTargets = useMemo(() => {
    if (targetFilter === 'all') return targets;
    if (targetFilter === 'completed') return targets.filter(t => t.completed || t.status === 'completed');
    return targets.filter(t => !t.completed && t.status !== 'completed');
  }, [targets, targetFilter]);

  const handleToggleTargetStatus = async (target, makeComplete) => {
    if (!canEdit) return toast.error("Admin permission required.");
    const targetTitle = target.subject || target.title || 'Target';

    setConfirmModal({
      isOpen: true,
      title: makeComplete ? "Approve & Mark Target Completed?" : "Mark Target Pending?",
      message: `Change target "${targetTitle}" for ${currentStudent.name}?`,
      confirmText: makeComplete ? "Mark Completed" : "Mark Pending",
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          const targetRef = doc(db, 'targets', target.id);
          const pointsToAdd = makeComplete ? 10 : 0;

          await updateDoc(targetRef, {
            completed: makeComplete,
            status: makeComplete ? 'completed' : 'pending',
            completedAt: makeComplete ? serverTimestamp() : null,
            pointsAwarded: makeComplete ? pointsToAdd : 0,
            adminModified: true
          });

          // Sync points if completed
          if (makeComplete) {
            await updateDoc(doc(db, 'users', studentUid), {
              points: increment(pointsToAdd)
            });
          }

          await recordAction({
            actionType: makeComplete ? 'Approved Target' : 'Reset Target',
            previousValue: target.status || (target.completed ? 'completed' : 'pending'),
            newValue: makeComplete ? 'completed' : 'pending',
            added: makeComplete ? `+${pointsToAdd} PTS` : null,
            reason: `Admin updated target milestone: ${targetTitle}`
          });

          toast.success(`Target "${targetTitle}" updated!`);
        } catch (err) {
          toast.error(`Target update failed: ${err.message}`);
        }
      }
    });
  };

  const handleCreateTarget = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("Admin permission required.");
    if (!newTargetSubject) return toast.error("Please enter a target subject.");

    try {
      setIsCreatingTarget(true);
      await addDoc(collection(db, 'targets'), {
        uid: studentUid,
        subject: newTargetSubject.trim(),
        targetMinutes: Number(newTargetMinutes) || 60,
        studiedSeconds: 0,
        targetDate: newTargetDate,
        status: 'pending',
        completed: false,
        pointsAwarded: 0,
        createdAt: serverTimestamp(),
        assignedByAdmin: true
      });

      await recordAction({
        actionType: 'Assigned Target',
        previousValue: 'None',
        newValue: `${newTargetSubject} (${newTargetMinutes}m on ${newTargetDate})`,
        reason: newTargetReason.trim() || 'Admin manual target assignment'
      });

      toast.success("Target assigned successfully!");
      setNewTargetSubject('');
      setNewTargetReason('');
    } catch (err) {
      toast.error(`Failed to assign target: ${err.message}`);
    } finally {
      setIsCreatingTarget(false);
    }
  };

  // ==========================================
  // TAB 4: POINTS ACTIONS
  // ==========================================
  const [pointDeltaInput, setPointDeltaInput] = useState('50');
  const [pointDeltaSign, setPointDeltaSign] = useState('+');
  const [pointsReason, setPointsReason] = useState('');
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  const calculatedPointDelta = useMemo(() => {
    const raw = Math.abs(parseInt(pointDeltaInput, 10) || 0);
    return pointDeltaSign === '+' ? raw : -raw;
  }, [pointDeltaInput, pointDeltaSign]);

  const handleAdjustPoints = async () => {
    if (!canEdit) return toast.error("Admin permission required.");
    if (calculatedPointDelta === 0) return toast.error("Enter a valid points amount.");
    if (!pointsReason.trim()) return toast.error("Please specify a reason.");

    const prevPoints = Number(currentStudent.points) || 0;
    const newPoints = Math.max(0, prevPoints + calculatedPointDelta);

    setConfirmModal({
      isOpen: true,
      title: `${calculatedPointDelta > 0 ? 'Add' : 'Deduct'} Points?`,
      message: `Adjust points for ${currentStudent.name}: Previous: ${prevPoints} → New: ${newPoints} (${calculatedPointDelta > 0 ? '+' : ''}${calculatedPointDelta} PTS)?`,
      confirmText: "Confirm Points Adjustment",
      confirmType: calculatedPointDelta < 0 ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          setIsUpdatingPoints(true);
          await updateDoc(doc(db, 'users', studentUid), {
            points: newPoints
          });

          // Log in pointTransactions
          await addDoc(collection(db, 'pointTransactions'), {
            uid: studentUid,
            points: calculatedPointDelta,
            type: calculatedPointDelta > 0 ? 'admin_credit' : 'admin_debit',
            reason: pointsReason.trim(),
            adminId: currentUser?.uid,
            adminName: userProfile?.name || currentUser?.email,
            dateKey: todayKey,
            createdAt: serverTimestamp()
          });

          await recordAction({
            actionType: calculatedPointDelta > 0 ? 'Added Points' : 'Deducted Points',
            previousValue: `${prevPoints} PTS`,
            newValue: `${newPoints} PTS`,
            added: `${calculatedPointDelta > 0 ? '+' : ''}${calculatedPointDelta} PTS`,
            reason: pointsReason.trim()
          });

          toast.success(`Points adjusted to ${newPoints} PTS!`);
          setPointsReason('');
        } catch (err) {
          toast.error(`Points adjustment failed: ${err.message}`);
        } finally {
          setIsUpdatingPoints(false);
        }
      }
    });
  };

  // ==========================================
  // TAB 5: STRIKE / WARNING ACTIONS
  // ==========================================
  const [strikeReasonSelect, setStrikeReasonSelect] = useState('Studied less than 6 hours minimum requirement');
  const [strikeMessageInput, setStrikeMessageInput] = useState('');
  const [strikeActionType, setStrikeActionType] = useState('add_strike'); // 'warning_only' | 'add_strike' | 'strike_and_penalty'

  const handleIssueStrike = async () => {
    if (!canEdit) return toast.error("Admin permission required.");

    const prevStrikes = Number(currentStudent.strikeCount) || warnings.filter(w => w.status === 'active').length;
    const isAddingStrikeCount = strikeActionType !== 'warning_only';
    const newStrikes = isAddingStrikeCount ? prevStrikes + 1 : prevStrikes;

    setConfirmModal({
      isOpen: true,
      title: "Issue Official Strike / Warning?",
      message: `Target student: ${currentStudent.name}. Action: ${strikeActionType === 'warning_only' ? 'Warning Note' : 'Add 1 Strike'} with reason: "${strikeReasonSelect}"?`,
      confirmText: "Issue Strike",
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await addDoc(collection(db, 'warnings'), {
            uid: studentUid,
            reason: strikeReasonSelect,
            message: strikeMessageInput.trim(),
            status: 'active',
            actionType: strikeActionType,
            issuedBy: userProfile?.name || currentUser?.email || 'Admin',
            issuedByUid: currentUser?.uid,
            createdAt: serverTimestamp()
          });

          if (isAddingStrikeCount) {
            await updateDoc(doc(db, 'users', studentUid), {
              strikeCount: newStrikes
            });
          }

          if (strikeActionType === 'strike_and_penalty') {
            await updateDoc(doc(db, 'users', studentUid), {
              points: increment(-50)
            });
          }

          await recordAction({
            actionType: isAddingStrikeCount ? 'Issued Strike' : 'Issued Warning',
            previousValue: `${prevStrikes} Strikes`,
            newValue: `${newStrikes} Strikes`,
            added: isAddingStrikeCount ? '+1 Strike' : 'Warning Note',
            reason: strikeReasonSelect + (strikeMessageInput ? `: ${strikeMessageInput}` : '')
          });

          toast.success("Strike / Warning issued successfully.");
          setStrikeMessageInput('');
        } catch (err) {
          toast.error(`Strike issuance failed: ${err.message}`);
        }
      }
    });
  };

  const handleRevokeStrike = async (warn) => {
    if (!canEdit) return toast.error("Admin permission required.");
    const prevStrikes = Number(currentStudent.strikeCount) || 1;
    const newStrikes = Math.max(0, prevStrikes - 1);

    setConfirmModal({
      isOpen: true,
      title: "Revoke Strike?",
      message: `Revoke strike issued for "${warn.reason}"? Strike count will be reduced to ${newStrikes}.`,
      confirmText: "Revoke Strike",
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'warnings', warn.id), {
            status: 'resolved',
            resolvedAt: serverTimestamp(),
            resolvedBy: currentUser?.email
          });

          await updateDoc(doc(db, 'users', studentUid), {
            strikeCount: newStrikes
          });

          await recordAction({
            actionType: 'Revoked Strike',
            previousValue: `${prevStrikes} Strikes`,
            newValue: `${newStrikes} Strikes`,
            added: '-1 Strike',
            reason: `Admin revoked strike for: ${warn.reason}`
          });

          toast.success("Strike revoked.");
        } catch (err) {
          toast.error(`Revoke failed: ${err.message}`);
        }
      }
    });
  };

  // ==========================================
  // TAB 6: RECOVERY / DAY OFF ACTIONS
  // ==========================================
  const [recoveryDateInput, setRecoveryDateInput] = useState(todayKey);
  const [recoveryNoteInput, setRecoveryNoteInput] = useState('');

  const handleToggleDayOff = async (targetDateKey, shouldActivate) => {
    if (!canEdit) return toast.error("Admin permission required.");

    const targetRef = doc(db, 'dayOffs', studentUid, 'records', targetDateKey);
    const mKey = targetDateKey.slice(0, 7);

    try {
      if (shouldActivate) {
        const dayOffData = {
          uid: studentUid,
          studentName: currentStudent.name || '',
          studentEmail: currentStudent.email || '',
          course: currentStudent.course || '',
          level: currentStudent.level || '',
          dateKey: targetDateKey,
          monthKey: mKey,
          status: 'active',
          activatedByAdmin: true,
          adminEmail: currentUser?.email || 'admin',
          note: recoveryNoteInput.trim() || 'Turned ON by Admin',
          createdAt: serverTimestamp()
        };

        await setDoc(targetRef, dayOffData, { merge: true });

        // Update dayOffUsage counter
        try {
          await setDoc(doc(db, 'dayOffUsage', studentUid, 'months', mKey), {
            used: increment(1),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch {}

        await recordAction({
          actionType: 'Activated Day Off',
          previousValue: 'Working Day',
          newValue: 'Day Off Active',
          reason: recoveryNoteInput.trim() || 'Admin manual Day Off exemption',
          metadata: { date: targetDateKey }
        });

        toast.success(`Day Off turned ON for ${targetDateKey}`);
      } else {
        await deleteDoc(targetRef);

        try {
          await setDoc(doc(db, 'dayOffUsage', studentUid, 'months', mKey), {
            used: increment(-1),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch {}

        await recordAction({
          actionType: 'Cancelled Day Off',
          previousValue: 'Day Off Active',
          newValue: 'Working Day',
          reason: 'Admin cancelled Day Off',
          metadata: { date: targetDateKey }
        });

        toast.success(`Day Off removed for ${targetDateKey}`);
      }
      setRecoveryNoteInput('');
    } catch (err) {
      toast.error(`Day Off update failed: ${err.message}`);
    }
  };

  // ==========================================
  // TAB 7: STUDY TIMER ACTIONS
  // ==========================================
  const handleDeleteSession = async (session) => {
    if (!canEdit) return toast.error("Admin permission required.");
    setConfirmModal({
      isOpen: true,
      title: "Delete Recorded Study Session?",
      message: `Delete ${session.subject} session (${formatTimerTime(session.duration)}) recorded on ${session.dateKey || formatDate(session.date)}?`,
      confirmText: "Delete Session",
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'studySessions', session.id));

          await recordAction({
            actionType: 'Deleted Study Session',
            previousValue: `${session.subject} (${formatTimerTime(session.duration)})`,
            newValue: 'Session Deleted',
            added: `-${formatTimerTime(session.duration)}`,
            reason: `Admin deleted erroneous study session on ${session.dateKey}`
          });

          toast.success("Study session deleted.");
        } catch (err) {
          toast.error(`Deletion failed: ${err.message}`);
        }
      }
    });
  };

  // ==========================================
  // TAB 8: HISTORY FILTERING
  // ==========================================
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  const filteredHistory = useMemo(() => {
    if (historyTypeFilter === 'all') return actionHistory;
    return actionHistory.filter(h => {
      const type = (h.actionType || '').toLowerCase();
      if (historyTypeFilter === 'points') return type.includes('point');
      if (historyTypeFilter === 'strike') return type.includes('strike') || type.includes('warn');
      if (historyTypeFilter === 'target') return type.includes('target');
      if (historyTypeFilter === 'time') return type.includes('time') || type.includes('session');
      if (historyTypeFilter === 'dayoff') return type.includes('day off');
      if (historyTypeFilter === 'profile') return type.includes('stream') || type.includes('pro') || type.includes('logout');
      return true;
    });
  }, [actionHistory, historyTypeFilter]);

  if (!currentStudent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden animate-fade-in">
      <div className="glass-card w-full max-w-5xl h-[94vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-navy-950">
        
        {/* ======================================================== */}
        {/* TOP HEADER: STUDENT IDENTITY & QUICK SWITCHER */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-navy-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-500 p-0.5 shrink-0 shadow-glow-emerald">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center text-white font-black text-lg">
                {currentStudent.name ? currentStudent.name.charAt(0).toUpperCase() : 'S'}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  {currentStudent.name || 'Student'}
                </h2>
                {Boolean(currentStudent.isPro || currentStudent.proAccess) && <ProBadge size="sm" />}
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ID: {studentUid}
                </span>
                {liveSession && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black animate-pulse border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Studying Live</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                <span>{currentStudent.email || 'No email'}</span>
                <span>•</span>
                <span>Roll: {currentStudent.rollNumber || 'N/A'}</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">
                  {STREAM_LABELS[getStreamId(currentStudent.course, currentStudent.level)] || currentStudent.course || 'CA Foundation'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Student Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowStudentPicker(!showStudentPicker)}
                className="px-3 py-2 rounded-xl bg-navy-800 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 flex items-center gap-1.5"
                title="Switch Student"
              >
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Switch Student</span>
              </button>

              {showStudentPicker && (
                <div className="absolute right-0 top-12 w-72 bg-navy-900 border border-white/15 rounded-2xl p-3 shadow-2xl z-30 space-y-2">
                  <input
                    type="text"
                    placeholder="Search name, roll, email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-white/5">
                    {searchedStudents.map(s => (
                      <button
                        key={s.id || s.uid}
                        onClick={() => {
                          setCurrentStudent(s);
                          setShowStudentPicker(false);
                          setStudentSearch('');
                        }}
                        className="w-full p-2 text-left hover:bg-white/5 rounded-lg flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="truncate">
                          <div className="font-bold text-white truncate">{s.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{s.email}</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    ))}
                    {searchedStudents.length === 0 && studentSearch && (
                      <div className="text-[11px] text-slate-500 text-center py-2">No matching students</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Management Center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* NAVIGATION TABS BAR (8 DISTINCT TABS) */}
        {/* ======================================================== */}
        <div className="flex items-center gap-1 px-4 py-2 bg-navy-950 border-b border-white/10 overflow-x-auto custom-scrollbar shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-navy-950 font-black shadow-glow-amber'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-navy-950' : 'text-amber-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'strike' && Number(currentStudent.strikeCount) > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
                    {currentStudent.strikeCount}
                  </span>
                )}
                {tab.id === 'history' && actionHistory.length > 0 && (
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-navy-950 text-amber-300' : 'bg-white/10 text-slate-300'
                  }`}>
                    {actionHistory.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* MAIN BODY: ACTIVE TAB CONTENT */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-navy-950/50">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Quick Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-gold-400" />
                    <span>Total Points</span>
                  </div>
                  <div className="text-xl font-black text-gold-400 font-mono">
                    {currentStudent.points || 0} PTS
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Study Hours</span>
                  </div>
                  <div className="text-xl font-black text-white">
                    {formatHours(currentStudent.studyHours || 0)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Targets Done</span>
                  </div>
                  <div className="text-xl font-black text-cyan-300">
                    {targets.filter(t => t.completed).length} / {targets.length}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Active Strikes</span>
                  </div>
                  <div className="text-xl font-black text-rose-400 font-mono">
                    {currentStudent.strikeCount || warnings.filter(w => w.status === 'active').length || 0}
                  </div>
                </div>
              </div>

              {/* Stream & Core Settings Card */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Stream & Syllabus Configuration</span>
                  {!isEditingStream ? (
                    <button
                      onClick={() => {
                        setIsEditingStream(true);
                        setNewStreamChoice(getStreamId(currentStudent.course, currentStudent.level));
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
                    >
                      Change Stream
                    </button>
                  ) : null}
                </h3>

                {!isEditingStream ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-navy-950 border border-white/5">
                    <div>
                      <div className="text-xs text-slate-400">Current Stream & Level</div>
                      <div className="text-sm font-black text-emerald-400 mt-0.5">
                        {STREAM_LABELS[getStreamId(currentStudent.course, currentStudent.level)] || currentStudent.course || 'CA Foundation'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Exam Attempt</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {currentStudent.attempt || 'Not Specified'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-navy-950 border border-amber-500/40 space-y-3">
                    <label className="text-xs font-bold text-amber-300 block">
                      Select New Stream for Student
                    </label>
                    <select
                      value={newStreamChoice}
                      onChange={(e) => setNewStreamChoice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    >
                      {STREAM_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Audit Reason (e.g. Student passed foundation, moved to Inter)"
                      value={streamReason}
                      onChange={(e) => setStreamReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsEditingStream(false)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateStream}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 text-navy-950 text-xs font-black hover:bg-amber-400"
                      >
                        Confirm Stream Update
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Controls & Security */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white">Access & Account Control</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-navy-950 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">PRO Membership</div>
                      <div className="text-[11px] text-slate-400">
                        {currentStudent.isPro || currentStudent.proAccess ? 'Premium Access Active' : 'Standard Free Tier'}
                      </div>
                    </div>
                    <button
                      onClick={handleTogglePro}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        currentStudent.isPro || currentStudent.proAccess
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white'
                          : 'bg-amber-500 text-navy-950 hover:bg-amber-400'
                      }`}
                    >
                      {currentStudent.isPro || currentStudent.proAccess ? 'Revoke PRO' : 'Grant PRO'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-navy-950 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Remote Session</div>
                      <div className="text-[11px] text-slate-400">Force disconnect active login</div>
                    </div>
                    <button
                      onClick={handleForceLogout}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500 hover:text-white text-xs font-bold"
                    >
                      Remote Logout
                    </button>
                  </div>
                </div>
              </div>

              {/* Page Visibility / Tab Away Audit */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-rose-500/20 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-rose-400" />
                  <span>Tab Away & Visibility Monitoring</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Total time student switched tabs away from study timer:
                </p>
                <div className="text-lg font-mono font-black text-rose-300">
                  {formatTabAwayTime(currentStudent.totalTabAwayTime ?? (currentStudent.totalTabAwayTimeMs ? Math.floor(currentStudent.totalTabAwayTimeMs / 1000) : 0))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADJUSTMENT (STUDY TIME) */}
          {activeTab === 'adjustment' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-emerald-500/20 space-y-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-400" />
                    <span>Study Hours Adjustment & Data Recovery</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Manually add or recover study time per subject for any specific date when technical issues or device switches occur.
                  </p>
                </div>

                {/* Date Selector */}
                <div className="p-3.5 rounded-xl bg-navy-950 border border-white/5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Target Date:</span>
                    <input
                      type="date"
                      value={adjustDate}
                      onChange={(e) => setAdjustDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-navy-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="text-xs text-slate-300">
                    Existing Verified Time: <strong className="text-emerald-400">{formatTimerTime(existingDateSeconds)}</strong>
                  </div>
                </div>

                {/* Subject Time Inputs */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Add Time By Subject ({streamSubjects.length} subjects found)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {streamSubjects.map((sub) => {
                      const cur = adjustSubjectInputs[sub] || { hours: 0, minutes: 0 };
                      return (
                        <div key={sub} className="p-3.5 rounded-xl bg-navy-950/80 border border-white/5 space-y-2">
                          <div className="text-xs font-bold text-white truncate" title={sub}>
                            {sub}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-500 block">Hours</label>
                              <input
                                type="number"
                                min="0"
                                max="24"
                                value={cur.hours || ''}
                                placeholder="0"
                                onChange={(e) => handleSubjectTimeChange(sub, 'hours', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-navy-900 border border-white/10 text-white text-xs font-mono font-bold"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-500 block">Minutes</label>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={cur.minutes || ''}
                                placeholder="0"
                                onChange={(e) => handleSubjectTimeChange(sub, 'minutes', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-navy-900 border border-white/10 text-white text-xs font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Adjustment Preview & Reason */}
                <div className="p-4 rounded-xl bg-navy-950 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Time To Add:</span>
                    <span className="font-mono font-black text-amber-400 text-sm">
                      +{formatTimerTime(additionalSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">New Total For {adjustDate}:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      {formatTimerTime(existingDateSeconds + additionalSeconds)}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Audit Reason (Mandatory)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Timer stopped due to power cut, verified offline notes"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    disabled={additionalSeconds <= 0 || !adjustReason.trim() || isApplyingAdjustment}
                    onClick={handleApplyAdjustment}
                    className="w-full py-3 rounded-xl bg-emerald-500 text-navy-950 text-xs font-black shadow-glow-emerald hover:bg-emerald-400 disabled:opacity-50 transition-all"
                  >
                    {isApplyingAdjustment ? 'Applying...' : `Apply Adjustment (+${formatTimerTime(additionalSeconds)})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TARGETS */}
          {activeTab === 'targets' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Assign New Target Form */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span>Assign Target to Student</span>
                </h3>

                <form onSubmit={handleCreateTarget} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="text-[11px] text-slate-400 block mb-1">Subject / Target Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Accounting Chapter 3"
                      value={newTargetSubject}
                      onChange={(e) => setNewTargetSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[11px] text-slate-400 block mb-1">Target Date</label>
                    <input
                      type="date"
                      value={newTargetDate}
                      onChange={(e) => setNewTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-400 block mb-1">Minutes</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={newTargetMinutes}
                      onChange={(e) => setNewTargetMinutes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-end">
                    <button
                      type="submit"
                      disabled={isCreatingTarget || !newTargetSubject.trim()}
                      className="w-full py-2.5 rounded-xl bg-cyan-500 text-navy-950 text-xs font-black hover:bg-cyan-400 disabled:opacity-50"
                    >
                      Assign Target
                    </button>
                  </div>
                </form>
              </div>

              {/* Target List Header & Filters */}
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold text-slate-300">
                  Student's Targets ({targets.length})
                </div>
                <div className="flex items-center gap-1 bg-navy-900 p-1 rounded-xl border border-white/10">
                  {['all', 'pending', 'completed'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setTargetFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                        targetFilter === f
                          ? 'bg-amber-500 text-navy-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Targets List */}
              <div className="space-y-2">
                {filteredTargets.map((t) => {
                  const isDone = t.completed || t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <h4 className="text-xs font-bold text-white truncate">
                            {t.subject || t.title || 'Target'}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {isDone ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                          <span>Date: {t.targetDate || 'Today'}</span>
                          <span>Target: {t.targetMinutes || 60}m</span>
                          <span>Studied: {Math.floor((t.studiedSeconds || 0) / 60)}m</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleTargetStatus(t, !isDone)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                            isDone
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-navy-950'
                          }`}
                        >
                          {isDone ? 'Mark Pending' : 'Approve Completed'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredTargets.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500 italic">
                    No targets matching selected filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: POINTS */}
          {activeTab === 'points' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="p-6 rounded-3xl bg-navy-900/60 border border-gold-500/30 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs text-slate-400">Current Student Balance</span>
                    <div className="text-3xl font-black text-gold-400 font-mono mt-0.5">
                      {currentStudent.points || 0} PTS
                    </div>
                  </div>
                  <Award className="w-10 h-10 text-gold-400 opacity-80" />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-white block">
                    Choose Adjustment Operation
                  </label>
                  
                  {/* Plus / Minus selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPointDeltaSign('+')}
                      className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        pointDeltaSign === '+'
                          ? 'bg-emerald-500 text-navy-950 border-emerald-400 shadow-glow-emerald font-black'
                          : 'bg-navy-950 text-slate-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Credit Points (+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPointDeltaSign('-')}
                      className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        pointDeltaSign === '-'
                          ? 'bg-rose-500 text-white border-rose-400 shadow-glow-rose font-black'
                          : 'bg-navy-950 text-slate-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                      <span>Debit Points (-)</span>
                    </button>
                  </div>

                  {/* Preset amounts */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">Preset Points</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['10', '25', '50', '100'].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setPointDeltaInput(pts)}
                          className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                            pointDeltaInput === pts
                              ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                              : 'bg-navy-950 text-slate-300 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          {pointDeltaSign}{pts}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom points input */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Custom Points Amount
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={pointDeltaInput}
                      onChange={(e) => setPointDeltaInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white font-mono text-sm font-bold focus:outline-none focus:border-gold-400"
                    />
                  </div>

                  {/* Audit Reason */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Mandatory Audit Reason
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Approved manual bonus for offline quiz, compensated server downtime"
                      value={pointsReason}
                      onChange={(e) => setPointsReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-gold-400"
                    />
                  </div>

                  {/* Preview summary */}
                  <div className="p-3.5 rounded-xl bg-navy-950 border border-white/5 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Preview:</span>
                    <span className="font-mono font-bold text-white">
                      Previous: <strong className="text-slate-300">{currentStudent.points || 0}</strong> → Change:{' '}
                      <strong className={calculatedPointDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {calculatedPointDelta > 0 ? '+' : ''}{calculatedPointDelta}
                      </strong>{' '}
                      → New: <strong className="text-gold-400">{Math.max(0, (currentStudent.points || 0) + calculatedPointDelta)} PTS</strong>
                    </span>
                  </div>

                  <button
                    disabled={isUpdatingPoints || !pointsReason.trim() || calculatedPointDelta === 0}
                    onClick={handleAdjustPoints}
                    className="w-full py-3 rounded-xl bg-gold-500 text-navy-950 text-sm font-black shadow-glow-gold hover:bg-gold-400 disabled:opacity-50 transition-all"
                  >
                    {isUpdatingPoints ? 'Adjusting...' : 'Confirm Points Adjustment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STRIKE */}
          {activeTab === 'strike' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Issue Strike Card */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-rose-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    <span>Issue Official Strike / Warning</span>
                  </h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                    Active Strikes: {currentStudent.strikeCount || 0}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Strike Reason
                    </label>
                    <select
                      value={strikeReasonSelect}
                      onChange={(e) => setStrikeReasonSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-rose-400"
                    >
                      <option value="Studied less than 6 hours minimum requirement">⚠️ Studied less than 6 hours minimum requirement</option>
                      <option value="Unexcused absence without taking a Day Off">⚠️ Unexcused absence without taking a Day Off</option>
                      <option value="False session logging or manipulated timer">⚠️ False session logging or manipulated timer</option>
                      <option value="Inconsistent study streak & low weekly activity">⚠️ Inconsistent study streak & low weekly activity</option>
                      <option value="Academic discipline violation">⚠️ Academic discipline violation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Action Penalty
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'warning_only', label: 'Warning Note Only' },
                        { id: 'add_strike', label: 'Add Strike (+1 Strike)' },
                        { id: 'strike_and_penalty', label: 'Strike + Deduct 50 PTS' }
                      ].map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => setStrikeActionType(act.id)}
                          className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                            strikeActionType === act.id
                              ? 'bg-rose-500 text-white border-rose-400 shadow-glow-rose'
                              : 'bg-navy-950 text-slate-300 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Message / Direct Note for Student (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Please ensure 6 hours minimum daily study time is maintained"
                      value={strikeMessageInput}
                      onChange={(e) => setStrikeMessageInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <button
                    onClick={handleIssueStrike}
                    className="w-full py-2.5 rounded-xl bg-rose-500 text-white text-xs font-black shadow-glow-rose hover:bg-rose-400"
                  >
                    Issue Official Strike to Student
                  </button>
                </div>
              </div>

              {/* Active Strikes & Warnings History */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300">
                  Warnings & Strikes Records ({warnings.length})
                </div>
                {warnings.map((warn) => {
                  const isActive = warn.status === 'active';
                  return (
                    <div
                      key={warn.id}
                      className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isActive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isActive ? 'Active Strike' : 'Resolved'}
                          </span>
                          <span className="text-xs font-bold text-white">{warn.reason}</span>
                        </div>
                        {warn.message && (
                          <p className="text-xs text-slate-300 mt-1 italic">"{warn.message}"</p>
                        )}
                        <div className="text-[10px] text-slate-500 mt-1">
                          Issued by: {warn.issuedBy || 'Admin'} • Date: {formatDate(warn.createdAt)}
                        </div>
                      </div>

                      {isActive && (
                        <button
                          onClick={() => handleRevokeStrike(warn)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-navy-950 text-xs font-bold shrink-0"
                        >
                          Revoke Strike
                        </button>
                      )}
                    </div>
                  );
                })}
                {warnings.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500 italic">
                    No strikes or warnings issued for this student.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: RECOVERY / DAY OFF */}
          {activeTab === 'recovery' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <span>Day Off & Penalty Exemption Control</span>
                  </h3>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {studentMonthDayOffs.length} / 7 Used This Month
                  </span>
                </div>

                {/* Quick Today Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-navy-950 border border-white/5">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Today ({todayKey}):</span>
                      {isTodayDayOffActive ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] border border-emerald-500/30">
                          🟢 Day Off Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[11px] border border-white/10">
                          ⚪ Working / No Day Off
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isTodayDayOffActive ? 'Student is exempt from study penalties today.' : 'Student is expected to log study hours today.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleDayOff(todayKey, !isTodayDayOffActive)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      isTodayDayOffActive
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white'
                        : 'bg-emerald-500 text-navy-950 hover:bg-emerald-400 shadow-glow-emerald'
                    }`}
                  >
                    {isTodayDayOffActive ? <X className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{isTodayDayOffActive ? 'Turn Day Off OFF' : 'Turn Day Off ON'}</span>
                  </button>
                </div>

                {/* Custom Date Day Off Setting */}
                <div className="p-4 rounded-xl bg-navy-950 border border-white/5 space-y-3">
                  <div className="text-xs font-bold text-slate-300">
                    Set / Remove Day Off for Any Specific Date
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <input
                        type="date"
                        value={recoveryDateInput}
                        onChange={(e) => setRecoveryDateInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Admin note (e.g. Medical, Exam leave)"
                        value={recoveryNoteInput}
                        onChange={(e) => setRecoveryNoteInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      {(() => {
                        const isDateActive = dayOffs.some(d => d.dateKey === recoveryDateInput && d.status === 'active');
                        return (
                          <button
                            type="button"
                            onClick={() => handleToggleDayOff(recoveryDateInput, !isDateActive)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
                              isDateActive
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white'
                                : 'bg-amber-500 text-navy-950 font-black hover:bg-amber-400 shadow-glow-amber'
                            }`}
                          >
                            {isDateActive ? 'Turn OFF' : 'Turn ON'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Active Day Off Dates Chips */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-2">
                    Active Day Off Records ({studentMonthDayOffs.length} this month):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {studentMonthDayOffs.map(dayOff => (
                      <div
                        key={dayOff.dateKey}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold"
                      >
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>{dayOff.dateKey}</span>
                        {dayOff.activatedByAdmin && (
                          <span className="text-[10px] text-amber-200 bg-amber-500/20 px-1 rounded">Admin</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleDayOff(dayOff.dateKey, false)}
                          title={`Remove Day Off for ${dayOff.dateKey}`}
                          className="ml-1 hover:text-rose-400 text-slate-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {studentMonthDayOffs.length === 0 && (
                      <div className="text-xs text-slate-500 italic">No Day Offs active this month.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: STUDY TIMER */}
          {activeTab === 'timer' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Live Session Status */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-emerald-500/30 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${liveSession ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <div>
                    <div className="text-xs text-slate-400">Live Study Presence</div>
                    <div className="text-sm font-black text-white">
                      {liveSession ? (
                        <span className="text-emerald-400">
                          🟢 Currently Studying: <strong>{liveSession.subject || 'General Study'}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400">⚪ Timer is currently idle / not running</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Total Recorded Sessions</div>
                  <div className="text-sm font-black text-white">{sessions.length} sessions</div>
                </div>
              </div>

              {/* Study Sessions Table */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300">
                  Logged Study Sessions History ({sessions.length})
                </div>
                <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden bg-navy-900/40">
                  {sessions.slice(0, 30).map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-white/5 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate flex items-center gap-2">
                          <span>{sess.subject || 'General Study'}</span>
                          {sess.isManualAdjustment && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Admin Adjusted
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Date: {sess.dateKey || formatDate(sess.date)} • Duration: <strong className="text-emerald-400">{formatTimerTime(sess.duration)}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteSession(sess)}
                        title="Delete erroneous session"
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-[11px] font-bold shrink-0 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-500 italic">
                      No study sessions recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: HISTORY (COMPLETE ADMIN ACTION HISTORY) */}
          {activeTab === 'history' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-400" />
                    <span>Complete Admin Action History</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable audit trail for every administrative change made to this student's account.
                  </p>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1 bg-navy-900 p-1 rounded-xl border border-white/10 overflow-x-auto">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'points', label: 'Points' },
                    { id: 'strike', label: 'Strikes' },
                    { id: 'target', label: 'Targets' },
                    { id: 'time', label: 'Study Time' },
                    { id: 'dayoff', label: 'Day Off' },
                    { id: 'profile', label: 'Profile' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setHistoryTypeFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all shrink-0 ${
                        historyTypeFilter === f.id
                          ? 'bg-amber-500 text-navy-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Cards List */}
              <div className="space-y-3">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-navy-900/70 border border-white/10 space-y-3 hover:border-amber-500/30 transition-all shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-extrabold text-xs border border-amber-500/30">
                          {item.actionType}
                        </span>
                        <span className="text-xs text-slate-300">
                          Admin: <strong className="text-white">{item.adminName}</strong> ({item.adminEmail || item.adminId})
                        </span>
                      </div>

                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        <span className="text-amber-400 font-bold">{item.exactTime || formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Change Values Display (Previous -> Added -> New) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-navy-950 border border-white/5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Previous Value</span>
                        <span className="font-mono text-slate-300 font-semibold truncate block">
                          {item.previousValue || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Change / Added</span>
                        <span className="font-mono font-bold text-amber-400 truncate block">
                          {item.added || item.delta || 'Modified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">New Value</span>
                        <span className="font-mono font-bold text-emerald-400 truncate block">
                          {item.newValue || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-slate-300 flex items-start gap-2 bg-white/5 p-2.5 rounded-xl">
                      <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                      <span className="italic text-slate-200">{item.reason || 'No reason provided'}</span>
                    </div>
                  </div>
                ))}

                {filteredHistory.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <History className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="text-sm font-bold text-slate-400">No admin actions recorded yet</div>
                    <div className="text-xs text-slate-600">
                      Any point adjustments, strikes, target modifications, or day off changes will appear here automatically.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* BOTTOM FOOTER */}
        {/* ======================================================== */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-navy-900/90 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Active Student ID: <strong className="font-mono text-white">{studentUid}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-navy-800 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10"
          >
            Close Center
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* CONFIRMATION SAFETY MODAL */}
      {/* ======================================================== */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-white/15 max-w-md w-full space-y-4 bg-navy-950 shadow-2xl">
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>{confirmModal.title}</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                  confirmModal.confirmType === 'danger'
                    ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-glow-rose'
                    : 'bg-amber-500 text-navy-950 hover:bg-amber-400 shadow-glow-amber'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
