import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, addDoc, doc, getDoc, increment, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatTimerTime, formatDate, getDateKey, getMonthKey, calculateDailyPoints } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  CheckCircle2,
  Calendar, 
  ShieldCheck, 
  X, 
  Zap, 
  AlertTriangle, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  GraduationCap,
  Lock,
  Sparkles
} from 'lucide-react';
import CoachingStudyModal from '../components/CoachingStudyModal';
import { isSubjectMatch, calculateTargetProgress } from '../utils/subjectMatcher';
import { useTheme } from '../contexts/ThemeContext';
import { 
  calculateDailyTimerPoints, 
  isDailyTargetEligible, 
  calculateCombinedDailyStudy, 
  syncDailyPointsAndEligibility 
} from '../services/pointsService';

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
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

  // Default CA Foundation
  return [
    'Paper 1: Accounting',
    'Paper 2: Business Laws',
    'Paper 3: Quantitative Aptitude',
    'Paper 4: Business Economics'
  ];
}

function parseStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', attempt: '' };
  const rawCourse = String(userProfile.course || 'CA Foundation').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  
  if (rawCourse.includes('CMA')) course = 'CMA';
  
  const rawLevel = String(userProfile.level || '').toUpperCase();
  if (rawCourse.includes('FINAL') || rawLevel.includes('FINAL')) level = 'Final';
  else if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND') || rawCourse.includes('FOUND')) level = 'Foundation';
  else if (userProfile.level) level = userProfile.level; 
  
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

function getSessionStream(session, defaultStream = 'CA Foundation') {
  if (!session) return defaultStream;
  const courseStr = String(session.course || '').trim();
  const levelStr = String(session.level || '').trim();
  const streamStr = String(session.stream || '').trim();

  if (courseStr.toLowerCase().includes('cma')) {
    if (courseStr.toLowerCase().includes('final') || levelStr.toLowerCase().includes('final')) return 'CMA Final';
    if (courseStr.toLowerCase().includes('inter') || levelStr.toLowerCase().includes('inter')) return 'CMA Intermediate';
    return 'CMA Foundation';
  } else if (courseStr.toLowerCase().includes('ca')) {
    if (courseStr.toLowerCase().includes('final') || levelStr.toLowerCase().includes('final')) return 'CA Final';
    if (courseStr.toLowerCase().includes('inter') || levelStr.toLowerCase().includes('inter')) return 'CA Intermediate';
    return 'CA Foundation';
  }

  if (streamStr) {
    const s = streamStr.toLowerCase();
    if (s.includes('cma_final') || s.includes('cma final')) return 'CMA Final';
    if (s.includes('cma_intermediate') || s.includes('cma_inter') || s.includes('cma inter')) return 'CMA Intermediate';
    if (s.includes('cma_foundation') || s.includes('cma foundation')) return 'CMA Foundation';
    if (s.includes('ca_final') || s.includes('ca final')) return 'CA Final';
    if (s.includes('ca_intermediate') || s.includes('ca_inter') || s.includes('ca inter')) return 'CA Intermediate';
    if (s.includes('ca_foundation') || s.includes('ca foundation')) return 'CA Foundation';
  }

  const sub = String(session.subject || '').toLowerCase();
  if (sub.includes('advanced accounting') || sub.includes('cost and management') || sub.includes('strategic management') || sub.includes('corporate and other laws')) {
    return 'CA Intermediate';
  }
  if (sub.includes('financial reporting') || sub.includes('advanced auditing') || sub.includes('integrated business')) {
    return 'CA Final';
  }
  if (sub.includes('corporate financial reporting') || sub.includes('strategic financial management')) {
    return 'CMA Final';
  }
  if (sub.includes('business laws and ethics') || sub.includes('direct taxation') || sub.includes('cost accounting')) {
    return 'CMA Intermediate';
  }
  if (sub.includes('quantitative aptitude') || sub.includes('business economics') || sub.includes('accounting') || sub.includes('business law') || sub.includes('law')) {
    return defaultStream || 'CA Foundation';
  }

  return defaultStream || 'CA Foundation';
}

function getSubjectBadge(subject = '') {
  if (!subject) return 'SUB';
  const clean = String(subject).trim();
  
  const paperMatch = clean.match(/^Paper\s*(\d+)/i);
  if (paperMatch) {
    return `P${paperMatch[1]}`;
  }
  
  const upper = clean.toUpperCase();
  if (upper.includes('ACCOUNTING') || upper.includes('ACCOUNTS')) return 'ACC';
  if (upper.includes('LAW')) return 'LAW';
  if (upper.includes('TAX')) return 'TAX';
  if (upper.includes('AUDIT')) return 'AUD';
  if (upper.includes('COST')) return 'COST';
  if (upper.includes('MATH') || upper.includes('QUANT') || upper.includes('STAT')) return 'QA';
  if (upper.includes('ECONOM')) return 'ECO';
  if (upper.includes('FINANC') || upper.includes('FM')) return 'FM';
  
  return clean.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'SUB';
}

export default function StudyTimer() {
  const { currentUser, userProfile } = useAuth();
  const { isEyeCare } = useTheme();
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    if (!userProfile) {
      setLoadingSubjects(false);
      return;
    }
    
    const { course: myCourse, level: myLevel, attempt: myAttemptRaw } = parseStream(userProfile);
    const myAttempt = normalizeAttempt(myAttemptRaw);
    const fallbacks = getFallbackSubjects(myCourse, myLevel);

    const q = query(
      collection(db, 'timerSubjects'),
      where('course', '==', myCourse),
      where('level', '==', myLevel),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let subjectNames = [];
      if (!snapshot.empty) {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter by attempt (All Attempts OR Specific Attempt)
        const attemptFiltered = data.filter(sub => 
          sub.allAttempts || normalizeAttempt(sub.attempt) === myAttempt
        );

        // Sort by order if available, else by name
        attemptFiltered.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
          return a.subjectName.localeCompare(b.subjectName);
        });

        subjectNames = attemptFiltered.map(sub => sub.subjectName).filter(Boolean);
      }

      // If no admin-created timerSubjects exist for this stream, use standard syllabus subjects
      if (subjectNames.length === 0) {
        subjectNames = fallbacks;
      }

      setSubjects(subjectNames);
      
      const quickSubject = sessionStorage.getItem('quick_timer_subject');
      if (quickSubject) {
        const match = subjectNames.find(s => isSubjectMatch(s, quickSubject));
        setSelectedSubject(match || quickSubject);
        sessionStorage.removeItem('quick_timer_subject');
      } else if (subjectNames.length > 0) {
        setSelectedSubject(prev => {
          if (prev && (subjectNames.includes(prev) || subjectNames.some(s => isSubjectMatch(s, prev)))) {
            return prev;
          }
          return subjectNames[0];
        });
      } else {
        setSelectedSubject(fallbacks[0] || 'General Study');
      }
      
      setLoadingSubjects(false);
    }, (error) => {
      console.warn("Could not query timerSubjects, using stream fallbacks:", error);
      setSubjects(fallbacks);
      setSelectedSubject(prev => prev || fallbacks[0]);
      setLoadingSubjects(false);
    });

    return () => unsubscribe();
  }, [userProfile?.course, userProfile?.level, userProfile?.attempt]);

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState(null);

  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showTimerDayModal, setShowTimerDayModal] = useState(false);
  const [timerDayDate, setTimerDayDate] = useState(() => new Date());
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [recentStreamFilter, setRecentStreamFilter] = useState('all');
  const [showAllRecentTimerSessions, setShowAllRecentTimerSessions] = useState(false);

  const { course: myCourseStr, level: myLevelStr } = parseStream(userProfile);
  const userStreamLabel = `${myCourseStr} ${myLevelStr}`;

  const availableStreams = useMemo(() => {
    const streamSet = new Set();
    if (userStreamLabel) streamSet.add(userStreamLabel);
    sessions.forEach(sess => {
      const st = getSessionStream(sess, userStreamLabel);
      if (st) streamSet.add(st);
    });
    return Array.from(streamSet);
  }, [sessions, userStreamLabel]);

  const filteredRecentSessions = useMemo(() => {
    if (recentStreamFilter === 'all') return sessions;
    const normalizedFilter = recentStreamFilter.toLowerCase().replace(/[\s_]+/g, '');
    return sessions.filter(sess => {
      const st = getSessionStream(sess, userStreamLabel);
      return st.toLowerCase().replace(/[\s_]+/g, '') === normalizedFilter;
    });
  }, [sessions, recentStreamFilter, userStreamLabel]);

  const todayKey = getDateKey(new Date());

  // Helper: check if session belongs to user stream without case/naming mismatch
  const isSessionMatchForStream = (sess) => {
    if (!sess) return false;
    // 1. Direct match with current subjects
    if (subjects.length > 0 && sess.subject) {
      if (subjects.some(sub => isSubjectMatch(sess.subject, sub))) return true;
    }
    // 2. Stream ID or course matching
    const { course: myCourse, level: myLevel } = parseStream(userProfile);
    const myStreamKey = `${myCourse}_${myLevel}`.toLowerCase();
    if (sess.stream && String(sess.stream).toLowerCase() === myStreamKey) return true;

    if (sess.course) {
      const c = String(sess.course).toLowerCase();
      const l = String(sess.level || '').toLowerCase();
      if (myCourse === 'CMA' && c.includes('cma')) {
        if (myLevel.toLowerCase().includes('inter') && (c.includes('inter') || l.includes('inter'))) return true;
        if (myLevel.toLowerCase().includes('found') && (c.includes('found') || l.includes('found'))) return true;
        if (myLevel.toLowerCase().includes('final') && (c.includes('final') || l.includes('final'))) return true;
      } else if (myCourse === 'CA' && !c.includes('cma')) {
        if (myLevel.toLowerCase().includes('inter') && (c.includes('inter') || l.includes('inter'))) return true;
        if (myLevel.toLowerCase().includes('found') && (c.includes('found') || l.includes('found') || (!c.includes('inter') && !c.includes('final')))) return true;
        if (myLevel.toLowerCase().includes('final') && (c.includes('final') || l.includes('final'))) return true;
      }
    }
    return true; // Default fallback: do not drop student's recorded study session
  };

  // Helper: check if session matches date even with pending Firestore serverTimestamp
  const isSessionForDate = (sess, targetKey) => {
    if (sess.dateKey && sess.dateKey === targetKey) return true;
    const sDate = sess.date?.toDate ? sess.date.toDate() : (sess.date ? new Date(sess.date) : null);
    if (sDate && getDateKey(sDate) === targetKey) return true;
    // Optimistic fallback for newly added session with pending serverTimestamp
    if (!sDate && !sess.dateKey && targetKey === todayKey) return true;
    return false;
  };

  // Only sessions for current stream (using subjects list) and for today
  const todayStreamSessions = useMemo(() => {
    return sessions.filter((sess) => {
      if (!isSessionForDate(sess, todayKey)) return false;
      return isSessionMatchForStream(sess);
    });
  }, [sessions, todayKey, subjects, userProfile?.course, userProfile?.level]);

  const todaySubjectTotals = useMemo(() => {
    const map = {};
    let totalSeconds = 0;
    todayStreamSessions.forEach((sess) => {
      const sub = (sess.subject || 'General Study').trim();
      const officialSub = subjects.find(s => isSubjectMatch(sub, s)) || sub;
      const dur = Number(sess.duration) || 0;
      if (!map[officialSub]) map[officialSub] = 0;
      map[officialSub] += dur;
      totalSeconds += dur;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return { list: sorted, totalSeconds };
  }, [todayStreamSessions, subjects]);

  const timerDayKey = getDateKey(timerDayDate);
  const timerDaySessions = useMemo(() => {
    return sessions.filter((sess) => {
      if (!isSessionForDate(sess, timerDayKey)) return false;
      return isSessionMatchForStream(sess);
    });
  }, [sessions, timerDayKey, subjects, userProfile?.course, userProfile?.level]);

  const timerDayTotals = useMemo(() => {
    const map = {};
    let totalSeconds = 0;
    timerDaySessions.forEach((sess) => {
      const sub = (sess.subject || 'General').trim();
      const officialSub = subjects.find(s => isSubjectMatch(sub, s)) || sub;
      const dur = Number(sess.duration) || 0;
      if (!map[officialSub]) map[officialSub] = 0;
      map[officialSub] += dur;
      totalSeconds += dur;
    });
    return { list: Object.entries(map).sort((a, b) => b[1] - a[1]), totalSeconds };
  }, [timerDaySessions, subjects]);

  const formatHm = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [autoStoppedAlert, setAutoStoppedAlert] = useState(false);
  const [dayOffs, setDayOffs] = useState([]);
  const [activeWarnings, setActiveWarnings] = useState([]);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [showDayOnModal, setShowDayOnModal] = useState(false);
  const [savingDayOff, setSavingDayOff] = useState(false);
  const [dayOffError, setDayOffError] = useState('');

  const [todayStats, setTodayStats] = useState(null);
  const [todayTarget, setTodayTarget] = useState(null);
  const [userTargets, setUserTargets] = useState([]);

  const intervalRef = useRef(null);
  const isAutoSavingRef = useRef(false);

  const storageKey = currentUser?.uid ? `study_timer_state_${currentUser.uid}` : null;

  // 1. Restore saved timer state from localStorage on component mount / user load
  useEffect(() => {
    if (!storageKey) return;

    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved.selectedSubject) {
          setSelectedSubject(saved.selectedSubject);
        }

        const savedAccumulated = saved.accumulatedSeconds || 0;

        if (saved.isActive && saved.startTimestamp) {
          const now = Date.now();
          const elapsed = savedAccumulated + Math.floor((now - saved.startTimestamp) / 1000);
          const originalDateKey = saved.startDateKey || getDateKey(new Date(saved.startTimestamp));

          if (elapsed >= 18000) {
            setSeconds(0);
            setAccumulatedSeconds(0);
            setStartTimestamp(null);
            setIsActive(false);
            localStorage.removeItem(storageKey);
            triggerAutoStop5Hours(18000, saved.selectedSubject, originalDateKey);
          } else {
            setAccumulatedSeconds(savedAccumulated);
            setStartTimestamp(saved.startTimestamp);
            setIsActive(true);
            setSeconds(elapsed);
          }
        } else {
          // Restore paused / idle state
          setAccumulatedSeconds(savedAccumulated);
          setStartTimestamp(null);
          setIsActive(false);
          setSeconds(savedAccumulated);
        }
      }
    } catch (e) {
      console.warn("Could not restore saved timer state:", e);
    }
  }, [storageKey]);

  // 2. Accurate timestamp-based timer tick with a 5-hour session limit
  useEffect(() => {
    if (isActive && startTimestamp) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const currentElapsed = accumulatedSeconds + Math.floor((now - startTimestamp) / 1000);
        const originalDateKey = getDateKey(new Date(startTimestamp));

        if (currentElapsed >= 18000) {
          clearInterval(intervalRef.current);
          setSeconds(0);
          setIsActive(false);
          setStartTimestamp(null);
          setAccumulatedSeconds(0);
          if (storageKey) localStorage.removeItem(storageKey);
          triggerAutoStop5Hours(18000, selectedSubject, originalDateKey);
        } else {
          setSeconds(currentElapsed);
          // Persist running state continuously to localStorage
          if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify({
              selectedSubject,
              isActive: true,
              accumulatedSeconds,
              startTimestamp,
              startDateKey: originalDateKey,
              lastTickTimestamp: now
            }));
          }
        }
      }, 500);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, startTimestamp, accumulatedSeconds, selectedSubject, storageKey]);

  // 3. Flush timer state immediately on page hide, tab switch, or navigation away
  useEffect(() => {
    if (!storageKey) return;

    const flushTimerState = () => {
      if (isActive && startTimestamp) {
        localStorage.setItem(storageKey, JSON.stringify({
          selectedSubject,
          isActive: true,
          accumulatedSeconds,
          startTimestamp,
          startDateKey: getDateKey(new Date(startTimestamp)),
          lastTickTimestamp: Date.now()
        }));
      } else if (accumulatedSeconds > 0) {
        localStorage.setItem(storageKey, JSON.stringify({
          selectedSubject,
          isActive: false,
          accumulatedSeconds,
          startTimestamp: null,
          startDateKey: todayKey,
          lastTickTimestamp: Date.now()
        }));
      }
    };

    window.addEventListener('beforeunload', flushTimerState);
    window.addEventListener('pagehide', flushTimerState);
    document.addEventListener('visibilitychange', flushTimerState);

    return () => {
      flushTimerState();
      window.removeEventListener('beforeunload', flushTimerState);
      window.removeEventListener('pagehide', flushTimerState);
      document.removeEventListener('visibilitychange', flushTimerState);
    };
  }, [storageKey, isActive, startTimestamp, accumulatedSeconds, selectedSubject, todayKey]);

  // Listen for programmatic start commands (e.g. from Webcam Study)
  useEffect(() => {
    const handleRemoteStart = (e) => {
      const { subject, startTimestamp: remoteStart, accumulatedSeconds: remoteAccumulated } = e.detail || {};
      if (subject) setSelectedSubject(subject);
      setStartTimestamp(remoteStart || Date.now());
      setAccumulatedSeconds(remoteAccumulated || 0);
      setIsActive(true);
      setSavedSuccess(false);
      setAutoStoppedAlert(false);
    };

    window.addEventListener('study-timer-start-command', handleRemoteStart);
    return () => window.removeEventListener('study-timer-start-command', handleRemoteStart);
  }, []);

  // Live Study Broadcast
  const secondsRef = useRef(seconds);
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return;

    const sessionRef = doc(db, 'activeStudySessions', currentUser.uid);
    let intervalId;

    const broadcastPresence = async () => {
      if (isActive) {
        try {
          const { course: parsedCourse, level: parsedLevel, attempt: parsedAttempt } = parseStream(userProfile);
          const course = userProfile.course || parsedCourse || 'CA';
          const level = userProfile.level || parsedLevel || 'Foundation';
          const attemptVal = userProfile.attempt || parsedAttempt || '';
          const currentContinuous = startTimestamp ? Math.floor((Date.now() - startTimestamp) / 1000) : 0;
          const currentFocusSecs = Math.max(currentContinuous, secondsRef.current || 0);

          await setDoc(sessionRef, {
            studentId: currentUser.uid,
            displayName: userProfile.name || currentUser.displayName || currentUser.email || 'Student',
            course,
            level,
            attempt: attemptVal,
            points: userProfile.points || 0,
            subject: selectedSubject || 'General Study',
            startedAt: Date.now() - ((secondsRef.current || 0) * 1000),
            lastUpdatedAt: Date.now(),
            maxFocusSecs: currentFocusSecs,
            active: true
          }, { merge: true });
        } catch (e) {
          console.warn("Failed to broadcast live session", e);
        }
      }
    };

    if (isActive) {
      broadcastPresence();
      intervalId = setInterval(broadcastPresence, 15000);
    } else {
      setDoc(sessionRef, { active: false, lastUpdatedAt: Date.now() }, { merge: true }).catch(() => {});
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, currentUser, userProfile, startTimestamp, selectedSubject]);

  // Real-time listener for study sessions
  useEffect(() => {
    if (!currentUser?.uid) return;
    const uid = currentUser.uid;
    const todayStr = getDateKey(new Date());

    const q = query(collection(db, 'studySessions'), where('uid', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dbDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dbDate - da;
      });
      setSessions(docs);
    });

    const qStats = query(collection(db, 'studyDailyStats'), where('studentId', '==', uid), where('date', '==', todayStr));
    const unsubStats = onSnapshot(qStats, (snap) => {
      if (!snap.empty) setTodayStats({ id: snap.docs[0].id, ...snap.docs[0].data() });
      else setTodayStats(null);
    });

    const qTarget = query(collection(db, 'targets'), where('uid', '==', uid));
    const unsubTarget = onSnapshot(qTarget, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUserTargets(docs);
      const today = docs.find(d => d.targetDate === todayStr);
      setTodayTarget(today || null);
    });

    return () => { unsubscribe(); unsubStats(); unsubTarget(); };
  }, [currentUser]);

  // Auto-sync daily study points and eligibility idempotently (no duplicate transactions)
  useEffect(() => {
    if (!currentUser?.uid || !sessions || sessions.length === 0) return;
    const todayStr = getDateKey(new Date());
    syncDailyPointsAndEligibility({
      db,
      uid: currentUser.uid,
      dateKey: todayStr,
      sessions,
      targets: userTargets,
      activeTimerState: null
    });
  }, [currentUser?.uid, sessions.length, userTargets.length]);

  // Auto-sync any offline or locally cached unsaved study sessions
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      const raw = localStorage.getItem('unsaved_study_sessions');
      if (!raw) return;
      const pending = JSON.parse(raw);
      if (Array.isArray(pending) && pending.length > 0) {
        (async () => {
          const remaining = [];
          for (const item of pending) {
            try {
              if (item.uid === currentUser.uid) {
                await addDoc(collection(db, 'studySessions'), {
                  ...item,
                  date: serverTimestamp(),
                  syncedFromOffline: true
                });
              } else {
                remaining.push(item);
              }
            } catch (syncErr) {
              console.warn("Could not sync pending session:", syncErr);
              remaining.push(item);
            }
          }
          if (remaining.length > 0) {
            localStorage.setItem('unsaved_study_sessions', JSON.stringify(remaining));
          } else {
            localStorage.removeItem('unsaved_study_sessions');
          }
        })();
      }
    } catch (e) {
      console.warn("Error checking unsaved_study_sessions:", e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const dayOffQuery = collection(db, 'dayOffs', currentUser.uid, 'records');

    return onSnapshot(dayOffQuery, (snapshot) => {
      setDayOffs(snapshot.docs
        .map(dayOffDoc => ({ id: dayOffDoc.id, ...dayOffDoc.data() }))
        .filter(dayOff => dayOff.monthKey === getMonthKey()));
    }, (error) => console.error('Day Off subscription error:', error));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const warningsQuery = query(
      collection(db, 'warnings'),
      where('uid', '==', currentUser.uid)
    );

    return onSnapshot(warningsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveWarnings(docs.filter(w => w.status === 'active'));
    }, (error) => console.error('Warnings subscription error:', error));
  }, [currentUser]);


  const currentMonthKey = getMonthKey();
  const todayDayOff = dayOffs.find(dayOff => dayOff.dateKey === todayKey && dayOff.status === 'active');
  const dayOffsUsed = dayOffs.filter(dayOff => dayOff.status === 'active').length;
  const remainingDayOffs = Math.max(0, 7 - dayOffsUsed);

  const handleConfirmDayOff = async () => {
    if (!currentUser?.uid || todayDayOff || dayOffsUsed >= 7) return;

    const now = new Date();
    const usageId = `${currentUser.uid}_${currentMonthKey}`;
    const dayOffData = {
      uid: currentUser.uid,
      studentName: userProfile?.name || currentUser.displayName || '',
      studentEmail: currentUser.email || '',
      course: userProfile?.course || '',
      level: userProfile?.level || '',
      dateKey: todayKey,
      monthKey: currentMonthKey,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      monthlyUsageId: usageId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      setSavingDayOff(true);
      setDayOffError('');

      // Direct write to the user's records collection - idempotent and resilient against transaction locks / quota exhaustion
      const dayOffRef = doc(db, 'dayOffs', currentUser.uid, 'records', todayKey);
      await setDoc(dayOffRef, dayOffData, { merge: true });

      // Update monthly usage tracking doc
      try {
        const usageRef = doc(db, 'dayOffUsage', currentUser.uid, 'months', currentMonthKey);
        await setDoc(usageRef, {
          uid: currentUser.uid,
          monthKey: currentMonthKey,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          used: dayOffsUsed + 1,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (usageErr) {
        console.warn('dayOffUsage sync notice:', usageErr);
      }

      setShowDayOffModal(false);
    } catch (error) {
      console.error('Error activating Day Off:', error);
      if (error?.code === 'resource-exhausted') {
        setDayOffError('Database is currently busy. Please wait a moment and try again.');
      } else {
        setDayOffError(error?.message || 'Failed to activate Day Off. Please try again.');
      }
    } finally {
      setSavingDayOff(false);
    }
  };

  const handleCancelDayOff = async () => {
    if (!currentUser?.uid || !todayDayOff) return;

    try {
      setSavingDayOff(true);
      setDayOffError('');

      const dayOffRef = doc(db, 'dayOffs', currentUser.uid, 'records', todayKey);
      await deleteDoc(dayOffRef);

      try {
        const usageRef = doc(db, 'dayOffUsage', currentUser.uid, 'months', currentMonthKey);
        await setDoc(usageRef, {
          used: Math.max(0, dayOffsUsed - 1),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (usageErr) {
        console.warn('dayOffUsage sync notice:', usageErr);
      }

      setShowDayOnModal(false);
    } catch (error) {
      console.error('Error deactivating Day Off:', error);
      if (error?.code === 'resource-exhausted') {
        setDayOffError('Database is currently busy. Please wait a moment and try again.');
      } else {
        setDayOffError(error?.message || 'Failed to turn Day On. Please try again.');
      }
    } finally {
      setSavingDayOff(false);
    }
  };

  // Helper function to save completed session to Firestore
  const [milestoneMessages, setMilestoneMessages] = useState([]);

  useEffect(() => {
    if (milestoneMessages.length > 0) {
      const timer = setTimeout(() => setMilestoneMessages([]), 8000);
      return () => clearTimeout(timer);
    }
  }, [milestoneMessages]);

  const getMilestoneMessage = (hours) => {
    switch (hours) {
      case 1: return "⏱️ 1 Hour Completed! Keep going — consistency wins.";
      case 2: return "🔥 2 Hours Done! You're building momentum.";
      case 3: return "💪 3 Hours Completed! Keep pushing.";
      case 4: return "🎯 4 Hours Done! Keep the consistency going.";
      case 5: return "🚀 5 Hours Completed! One more hour to unlock +5 points.";
      case 6: return "🏆 6 Hours Completed! +5 Points Unlocked!";
      case 7: return "⚡ 7 Hours Done! +2 Bonus Points Earned.";
      case 8: return "🔥 8 Hours Completed! Another +2 Bonus Points.";
      case 9: return "👑 9 Hours Done! Excellent consistency.";
      case 10: return "💎 10 Hours Completed! Amazing discipline.";
      default: return `🔥 ${hours} Hours Completed! Another +2 Bonus Points.`;
    }
  };

  const saveSessionToFirestore = async (durationSecs, targetSubject, customDateKey = null) => {
    if (!currentUser?.uid) return;
    const durationHours = durationSecs / 3600;
    const todayStr = customDateKey || getDateKey(new Date());
    const finalSubject = (targetSubject || selectedSubject || (subjects[0] || 'General Study')).trim();
    const { course: myCourse, level: myLevel } = parseStream(userProfile);
    const course = userProfile?.course || (myCourse === 'CMA' ? `CMA ${myLevel}` : `CA ${myLevel}`);
    const level = userProfile?.level || myLevel;
    const stream = userProfile?.stream || `${myCourse}_${myLevel}`;

    // 1. STEP 1: GUARANTEED SESSION PERSISTENCE FIRST
    // Save the core studySession record so the student's study time is permanently secured in the database
    await addDoc(collection(db, 'studySessions'), {
      uid: currentUser.uid,
      studentName: userProfile?.name || currentUser.displayName || 'Student',
      rollNumber: userProfile?.rollNumber || '',
      subject: finalSubject,
      duration: durationSecs,
      maxFocusSecs: durationSecs,
      course,
      level,
      stream,
      dateKey: todayStr,
      date: serverTimestamp(),
      source: 'timer'
    });

    // 2. STEP 2: INCREMENT TARGET STUDIED SECONDS FOR MATCHING SUBJECT
    try {
      const matchingTargets = userTargets.filter(t => 
        (t.status !== 'completed' && !t.completed) && isSubjectMatch(t.subject, finalSubject)
      );
      for (const t of matchingTargets) {
        const tRef = doc(db, 'targets', t.id);
        await updateDoc(tRef, {
          studiedSeconds: increment(durationSecs),
          lastStudiedAt: serverTimestamp()
        });
      }
    } catch (tErr) {
      console.warn("Could not update target studiedSeconds:", tErr);
    }

    // 3. STEP 3: UPDATE USER PROFILE STUDY HOURS
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        studyHours: increment(durationHours),
        lastActiveAt: serverTimestamp()
      }, { merge: true });
    } catch (uErr) {
      console.warn("Could not update user studyHours:", uErr);
    }

    // 4. STEP 4: RECONCILE STUDY POINTS, MILESTONES & TARGET ELIGIBILITY DETERMINISTICALLY
    try {
      const updatedSessions = [
        ...sessions,
        {
          uid: currentUser.uid,
          subject: finalSubject,
          duration: durationSecs,
          dateKey: todayStr,
          date: new Date()
        }
      ];

      const syncResult = await syncDailyPointsAndEligibility({
        db,
        uid: currentUser.uid,
        dateKey: todayStr,
        sessions: updatedSessions,
        targets: userTargets,
        activeTimerState: null
      });

      // 5. STEP 5: MILESTONE CELEBRATIONS
      if (syncResult?.completedMilestones) {
        const prevMilestones = todayStats?.completedMilestones || [];
        const newlyUnlocked = syncResult.completedMilestones.filter(h => !prevMilestones.includes(h) && h >= 6);
        if (newlyUnlocked.length > 0) {
          const msgs = newlyUnlocked.map(h => getMilestoneMessage(h));
          setMilestoneMessages(msgs);
        }
      }
    } catch (syncErr) {
      console.warn("Could not sync daily points and eligibility:", syncErr);
    }
  };

  // Auto-stop 5-hour limit handler
  const triggerAutoStop5Hours = async (durationSecs, subjectToSave, specificDateKey = null) => {
    if (isAutoSavingRef.current) return;
    isAutoSavingRef.current = true;

    try {
      await saveSessionToFirestore(durationSecs, subjectToSave || selectedSubject, specificDateKey);
      setAutoStoppedAlert(true);
      alert("5 hours completed! Timer automatically stopped. Press Start to continue studying.");
    } catch (e) {
      console.error("Error auto-saving 5 hour session:", e);
    } finally {
      isAutoSavingRef.current = false;
    }
  };

  // Handle Start / Resume Session
  const handleStart = async () => {
    const now = Date.now();
    let currentAccumulated = accumulatedSeconds;

    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          lastActiveAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('Could not update study activity:', error);
      }
    }

    if (seconds === 0) {
      currentAccumulated = 0;
      setAccumulatedSeconds(0);
    } else {
      currentAccumulated = seconds;
      setAccumulatedSeconds(seconds);
    }

    setStartTimestamp(now);
    setIsActive(true);
    setSavedSuccess(false);
    setAutoStoppedAlert(false);

    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedSubject,
        isActive: true,
        accumulatedSeconds: currentAccumulated,
        startTimestamp: now
      }));
    }
    window.dispatchEvent(new Event('study-timer-state-changed'));
  };

  // Handle Pause Session
  const handlePause = () => {
    const now = Date.now();
    let currentElapsed = seconds;
    if (startTimestamp) {
      currentElapsed = accumulatedSeconds + Math.floor((now - startTimestamp) / 1000);
    }

    setIsActive(false);
    setStartTimestamp(null);
    setAccumulatedSeconds(currentElapsed);
    setSeconds(currentElapsed);

    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedSubject,
        isActive: false,
        accumulatedSeconds: currentElapsed,
        startTimestamp: null
      }));
    }
    window.dispatchEvent(new Event('study-timer-state-changed'));
  };

  // Handle Subject Change
  const handleSubjectChange = (newSubject) => {
    setSelectedSubject(newSubject);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedSubject: newSubject,
        isActive,
        accumulatedSeconds,
        startTimestamp
      }));
    }
    window.dispatchEvent(new Event('study-timer-state-changed'));
  };

  // Handle Stop & Save Session
  const handleStopAndSave = async () => {
    let finalSeconds = seconds;
    if (isActive && startTimestamp) {
      finalSeconds = accumulatedSeconds + Math.floor((Date.now() - startTimestamp) / 1000);
    }

    if (finalSeconds < 5) {
      alert("Session is too short to save (minimum 5 seconds).");
      setIsActive(false);
      setStartTimestamp(null);
      setAccumulatedSeconds(0);
      setSeconds(0);
      if (storageKey) localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event('study-timer-state-changed'));
      return;
    }

    try {
      setSaving(true);
      setIsActive(false);

      const sessionDuration = Math.min(finalSeconds, 18000);
      await saveSessionToFirestore(sessionDuration, selectedSubject);

      setSeconds(0);
      setAccumulatedSeconds(0);
      setStartTimestamp(null);
      if (storageKey) localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event('study-timer-state-changed'));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving study session:", err);
      // Emergency Fallback: Guarantee session is never lost under any circumstance
      try {
        const finalSubject = (selectedSubject || (subjects[0] || 'General Study')).trim();
        const { course: myCourse, level: myLevel } = parseStream(userProfile);
        const course = userProfile?.course || (myCourse === 'CMA' ? `CMA ${myLevel}` : `CA ${myLevel}`);
        const level = userProfile?.level || myLevel;
        const stream = userProfile?.stream || `${myCourse}_${myLevel}`;
        const sessionDuration = Math.min(finalSeconds, 18000);

        await addDoc(collection(db, 'studySessions'), {
          uid: currentUser.uid,
          studentName: userProfile?.name || currentUser.displayName || 'Student',
          rollNumber: userProfile?.rollNumber || '',
          subject: finalSubject,
          duration: sessionDuration,
          maxFocusSecs: sessionDuration,
          course,
          level,
          stream,
          dateKey: getDateKey(new Date()),
          date: serverTimestamp(),
          source: 'timer',
          emergencyBackup: true
        });

        setSeconds(0);
        setAccumulatedSeconds(0);
        setStartTimestamp(null);
        if (storageKey) localStorage.removeItem(storageKey);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      } catch (emergencyErr) {
        console.error("Emergency save error:", emergencyErr);
        try {
          const finalSubject = (selectedSubject || (subjects[0] || 'General Study')).trim();
          const { course: myCourse, level: myLevel } = parseStream(userProfile);
          const course = userProfile?.course || (myCourse === 'CMA' ? `CMA ${myLevel}` : `CA ${myLevel}`);
          const level = userProfile?.level || myLevel;
          const stream = userProfile?.stream || `${myCourse}_${myLevel}`;
          const existing = JSON.parse(localStorage.getItem('unsaved_study_sessions') || '[]');
          existing.push({
            uid: currentUser.uid,
            studentName: userProfile?.name || currentUser.displayName || 'Student',
            rollNumber: userProfile?.rollNumber || '',
            subject: finalSubject,
            duration: Math.min(finalSeconds, 18000),
            maxFocusSecs: Math.min(finalSeconds, 18000),
            course,
            level,
            stream,
            dateKey: getDateKey(new Date()),
            date: new Date().toISOString(),
            source: 'timer'
          });
          localStorage.setItem('unsaved_study_sessions', JSON.stringify(existing));
        } catch (localErr) {
          console.error("Local storage backup error:", localErr);
        }
        setSeconds(0);
        setAccumulatedSeconds(0);
        setStartTimestamp(null);
        if (storageKey) localStorage.removeItem(storageKey);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } finally {
      setSaving(false);
    }
  };

  const activeSubjectTarget = userTargets.find(t => 
    (t.status !== 'completed' && !t.completed) && isSubjectMatch(t.subject, selectedSubject)
  );

  const activeSubjectProgress = activeSubjectTarget
    ? calculateTargetProgress(activeSubjectTarget, sessions, {
        isActive,
        startTimestamp,
        accumulatedSeconds,
        selectedSubject
      })
    : null;

  return (
    <div className="space-y-8">
      
      {/* Official Admin Warnings Alert if present */}
      {activeWarnings.length > 0 && (
        <div className="space-y-3">
          {activeWarnings.map((warn) => (
            <div key={warn.id} className="p-5 rounded-3xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start gap-4 shadow-xl">
              <AlertTriangle className="w-6 h-6 text-rose-400 mt-0.5 shrink-0 animate-pulse" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-300 uppercase tracking-wider">⚠️ Official Admin Warning</span>
                  <span className="text-[11px] text-rose-400/80">{formatDate(warn.issuedAt)}</span>
                </div>
                <div className="text-sm font-bold text-white">{warn.reason || 'Minimum study hour threshold not met'}</div>
                {warn.message && <div className="text-xs text-rose-200/90 bg-navy-950/40 p-2.5 rounded-xl border border-rose-500/20">{warn.message}</div>}
                <div className="text-xs text-rose-300 font-medium pt-1">
                  Please ensure you complete at least 6+ hours of study daily to fulfill target requirements.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact Daily Progress Area */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-3xl border flex flex-col gap-1 shadow-sm ${
          isEyeCare ? 'bg-navy-900 border-white/5' : 'bg-white border-2 border-blue-200'
        }`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${
            isEyeCare ? 'text-slate-400' : 'text-slate-600 font-black'
          }`}>Today's Study Time</span>
          <span className={`text-lg font-black ${
            isEyeCare ? 'text-white' : 'text-slate-950 font-black'
          }`}>{todayStats ? formatTimerTime(todayStats.totalStudySeconds) : '0h 00m 00s'}</span>
        </div>
        <div className={`p-4 rounded-3xl border flex flex-col gap-1 shadow-sm ${
          isEyeCare ? 'bg-navy-900 border-white/5' : 'bg-white border-2 border-blue-200'
        }`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${
            isEyeCare ? 'text-slate-400' : 'text-slate-600 font-black'
          }`}>Today's Points</span>
          <span className={`text-lg font-black ${
            isEyeCare ? 'text-emerald-400' : 'text-emerald-800 font-black'
          }`}>+{todayStats?.dailyStudyPoints || 0}</span>
          <span className={`text-[10px] font-bold ${
            isEyeCare ? 'text-slate-500' : 'text-blue-800'
          }`}>
            Next: {((todayStats?.completedFullHours || 0) + 1) === 6 ? '6 Hrs → +5' : ((todayStats?.completedFullHours || 0) + 1) > 6 ? `${(todayStats?.completedFullHours || 0) + 1} Hrs → +2` : '6 Hrs → +5'}
          </span>
        </div>
        <div className={`p-4 rounded-3xl border flex flex-col justify-between shadow-sm ${
          isEyeCare ? 'bg-navy-900 border-white/5' : 'bg-white border-2 border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-0.5">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${
              isEyeCare ? 'text-slate-400' : 'text-slate-600 font-black'
            }`}>Subject Target</span>
            {activeSubjectProgress && (
              <span className={`text-[10px] font-black ${activeSubjectProgress.isEligible ? (isEyeCare ? 'text-emerald-400' : 'text-emerald-800') : (isEyeCare ? 'text-gold-400' : 'text-blue-800')}`}>
                {activeSubjectProgress.progressPct}%
              </span>
            )}
          </div>
          {activeSubjectTarget ? (
            <div className="space-y-1">
              <span className={`text-sm font-bold truncate block ${
                isEyeCare ? 'text-white' : 'text-slate-950 font-black'
              }`} title={activeSubjectTarget.subject}>
                {activeSubjectTarget.targetValue || activeSubjectTarget.targetHours}h {activeSubjectTarget.subject}
              </span>
              <div className={`w-full h-1.5 rounded-full overflow-hidden border ${
                isEyeCare ? 'bg-navy-950 border-white/5' : 'bg-slate-200 border-slate-300'
              }`}>
                <div 
                  className={`h-full transition-all duration-300 ${activeSubjectProgress?.isEligible ? (isEyeCare ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-emerald-600') : (isEyeCare ? 'bg-gold-500' : 'bg-blue-600')}`}
                  style={{ width: `${activeSubjectProgress?.progressPct || 0}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold block truncate ${
                isEyeCare ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {activeSubjectProgress?.studiedHuman} / {activeSubjectProgress?.targetHuman} • {activeSubjectProgress?.isEligible ? '🎯 Target Met!' : `${activeSubjectProgress?.remainingHuman} left`}
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className={`text-sm font-bold truncate block ${
                isEyeCare ? 'text-slate-400' : 'text-slate-700'
              }`}>No Target for {selectedSubject || 'Subject'}</span>
              <span className={`text-[10px] font-semibold block ${
                isEyeCare ? 'text-slate-500' : 'text-slate-500'
              }`}>Set in Daily Target and Test</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-3xl border flex flex-col justify-between shadow-sm ${
          isEyeCare ? 'bg-navy-900 border-white/5' : 'bg-white border-2 border-blue-200'
        }`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${
            isEyeCare ? 'text-slate-400' : 'text-slate-600 font-black'
          }`}>Target Status</span>
          {activeSubjectTarget ? (
            <div className="space-y-0.5">
              <span className={`text-sm font-bold flex items-center gap-1.5 ${activeSubjectProgress?.isEligible ? (isEyeCare ? 'text-emerald-400' : 'text-emerald-800 font-black') : (isEyeCare ? 'text-amber-400' : 'text-amber-800 font-black')}`}>
                {activeSubjectProgress?.isEligible ? '🎯 Ready to Complete' : '⏳ In Progress'}
              </span>
              <span className={`text-[10px] font-semibold ${
                isEyeCare ? 'text-slate-400' : 'text-slate-600 font-bold'
              }`}>
                Reward: <strong className={isEyeCare ? 'text-emerald-400' : 'text-emerald-800 font-black'}>+3 Points</strong>
              </span>
            </div>
          ) : todayTarget ? (
            <div className="space-y-0.5">
              <span className={`text-sm font-bold ${todayTarget.status === 'completed' ? (isEyeCare ? 'text-emerald-400' : 'text-emerald-800 font-black') : (isEyeCare ? 'text-amber-400' : 'text-amber-800 font-black')}`}>
                {todayTarget.status === 'completed' ? '✅ Completed' : '⚠️ Pending'}
              </span>
              <span className={`text-[10px] font-semibold ${
                isEyeCare ? 'text-slate-500' : 'text-slate-600 font-bold'
              }`}>Reward: +3 Points</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className={`text-sm font-bold ${isEyeCare ? 'text-slate-500' : 'text-slate-500'}`}>-</span>
              <span className={`text-[10px] font-semibold ${isEyeCare ? 'text-slate-500' : 'text-slate-500'}`}>Reward: +3 Points</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
        isEyeCare ? 'glass-card border-royal-500/30' : 'bg-white border-2 border-blue-200 shadow-md'
      }`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
            isEyeCare ? 'bg-royal-500/20 text-royal-400 border-royal-500/30' : 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>Precision Session Tracker</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold ${
            isEyeCare ? 'text-white' : 'text-slate-950 font-black'
          }`}>
            Academic <span className={isEyeCare ? 'gold-gradient-text' : 'text-blue-700'}>Study Timer</span>
          </h1>
          <p className={`text-sm max-w-2xl ${
            isEyeCare ? 'text-slate-300' : 'text-slate-700 font-medium'
          }`}>
            Select your subject, start the stopwatch, and log real study hours to gain verified points.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            onClick={() => setShowCoachingModal(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-black flex items-center gap-2.5 transition-all shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] cursor-pointer group"
          >
            <GraduationCap className="w-5 h-5 text-indigo-200 group-hover:scale-110 transition-transform" />
            <span>Coaching Study</span>
            {userProfile?.coachingStudyAccess ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Access Approved"></span>
            ) : (
              <Lock className="w-3.5 h-3.5 text-indigo-200 ml-0.5 opacity-80" />
            )}
          </button>
        </div>
      </div>

      {/* 🎓 COACHING STUDY TIME TRACKER CARD */}
      <div 
        onClick={() => setShowCoachingModal(true)}
        className={`p-4 sm:p-5 rounded-3xl border shadow-xl transition-all cursor-pointer group relative overflow-hidden ${
          isEyeCare 
            ? 'bg-gradient-to-r from-indigo-950/70 via-navy-900 to-purple-950/70 border-indigo-500/30 hover:border-indigo-500/60' 
            : 'bg-white border-2 border-indigo-200 shadow-md hover:border-indigo-400'
        }`}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-glow-indigo group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base font-black transition-colors ${
                  isEyeCare ? 'text-white group-hover:text-indigo-200' : 'text-slate-950 group-hover:text-indigo-700'
                }`}>
                  Coaching Study Time Tracker
                </h3>
                {userProfile?.coachingStudyAccess ? (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                    isEyeCare ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                  </span>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                    isEyeCare ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    <Lock className="w-2.5 h-2.5" /> Approval Required
                  </span>
                )}
              </div>
              <p className={`text-xs mt-1 max-w-xl ${
                isEyeCare ? 'text-slate-300' : 'text-slate-700 font-medium'
              }`}>
                Log your offline coaching lectures directly into daily study hours & earn milestone points.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <span className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-glow-indigo">
              <span>Log Coaching Study</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Timer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Timer Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`p-8 rounded-3xl border text-center space-y-8 relative overflow-hidden shadow-2xl ${
            isEyeCare ? 'glass-card border-white/10' : 'bg-white border-2 border-blue-200 shadow-md'
          }`}>
            
            {/* Subject Selector */}
            <div className="space-y-2 max-w-md mx-auto">
              <label className={`block text-xs font-bold uppercase tracking-wider ${
                isEyeCare ? 'text-slate-400' : 'text-slate-700 font-black'
              }`}>
                Select Subject for Timer Session
              </label>
              {loadingSubjects ? (
                <div className={`w-full py-3.5 px-4 rounded-2xl border text-sm ${
                  isEyeCare ? 'bg-navy-900 border-white/15 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600 font-bold'
                }`}>
                  Loading subjects...
                </div>
              ) : subjects.length > 0 ? (
                <select
                  value={selectedSubject}
                  disabled={isActive}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className={`w-full py-3.5 px-4 rounded-2xl border font-bold text-sm focus:outline-none cursor-pointer disabled:opacity-60 ${
                    isEyeCare 
                      ? 'bg-navy-900 border-white/15 text-white focus:border-royal-500' 
                      : 'bg-white border-2 border-blue-300 text-slate-950 focus:border-blue-600 shadow-sm'
                  }`}
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-sm">
                  No subjects are currently available for your stream.
                </div>
              )}
            </div>

            {/* Timer Clock Display */}
            <div className="py-6">
              <div className="inline-block relative">
                {/* Glowing Ring */}
                <div className={`absolute -inset-6 rounded-full blur-2xl transition-all duration-500 ${
                  isActive ? (isEyeCare ? 'bg-royal-500/25 scale-105' : 'bg-blue-500/20 scale-105') : 'bg-transparent'
                }`} />

                <div className={`relative z-10 font-mono text-6xl sm:text-7xl font-black tracking-tight drop-shadow-sm ${
                  isEyeCare ? 'text-white' : 'text-slate-950 font-black'
                }`}>
                  {formatTimerTime(seconds)}
                </div>
                <div className={`text-xs mt-2 font-bold ${
                  isEyeCare ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {isActive ? 'Session Active — Time Recording...' : seconds > 0 ? 'Session Paused' : 'Ready to Start'}
                </div>
              </div>
            </div>

            {/* 5-Hour Auto Stop Alert */}
            {autoStoppedAlert && (
              <div className="p-4 rounded-xl bg-gold-500/20 border border-gold-500/40 text-gold-300 text-sm font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-300">
                <CheckCircle className="w-5 h-5 text-gold-400" />
                <span>5 hours completed! Study Timer has been automatically stopped.</span>
              </div>
            )}

            {/* Milestone Messages */}
            {milestoneMessages.length > 0 && (
              <div className="space-y-2 mb-2">
                {milestoneMessages.map((msg, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-sm font-semibold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Success Toast */}
            {savedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-300">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Session saved! Study hours and points updated.</span>
              </div>
            )}

            {/* Timer Control Buttons */}
            <div className={`flex flex-wrap items-center justify-center gap-4 pt-4 border-t ${
              isEyeCare ? 'border-white/10' : 'border-slate-200'
            }`}>
              {!isActive ? (
                <button
                  onClick={handleStart}
                  disabled={Boolean(todayDayOff) || subjects.length === 0}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base shadow-md hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>{seconds > 0 ? 'Resume Session' : 'Start Session'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-base shadow-md hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Pause className="w-5 h-5 fill-slate-950" />
                  <span>Pause Session</span>
                </button>
              )}

              {seconds > 0 && (
                <button
                  onClick={handleStopAndSave}
                  disabled={saving}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-base shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Square className="w-5 h-5 fill-white" />
                  <span>{saving ? 'Saving...' : 'Stop & Save'}</span>
                </button>
              )}
            </div>

            {/* Your Timer Day Button */}
            <div className={`pt-5 border-t text-center ${
              isEyeCare ? 'border-white/10' : 'border-slate-200'
            }`}>
              <button
                onClick={() => setShowTimerDayModal(true)}
                className={`w-full py-4 rounded-2xl border font-bold text-sm sm:text-base hover:scale-[1.02] transition-all flex items-center justify-center gap-2 ${
                  isEyeCare 
                    ? 'bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600/30 hover:to-purple-500/30 border-purple-500/30 text-purple-300' 
                    : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900 font-extrabold'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Your Timer Day</span>
              </button>
            </div>

            <div className={`pt-5 border-t text-left ${
              isEyeCare ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl p-4 border ${
                isEyeCare ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50/80 border-amber-300'
              }`}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <div className={`text-sm font-black ${isEyeCare ? 'text-white' : 'text-slate-950'}`}>{todayDayOff ? 'Day Off Active' : 'Day Off'}</div>
                    <div className={`text-xs mt-1 font-semibold ${isEyeCare ? 'text-slate-300' : 'text-slate-700'}`}>
                      {todayDayOff ? "You're all set for today. No study penalty will be applied." : `${dayOffsUsed}/7 used this month`}
                    </div>
                    {todayDayOff && <div className="text-xs text-amber-600 font-bold mt-1">Day Offs used this month: {dayOffsUsed}/7</div>}
                  </div>
                </div>
                {todayDayOff ? (
                  <button
                    onClick={() => { setDayOffError(''); setShowDayOnModal(true); }}
                    className={`shrink-0 px-4 py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all ${
                      isEyeCare
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Turn Day On</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setDayOffError(''); setShowDayOffModal(true); }}
                    disabled={dayOffsUsed >= 7 || isActive}
                    className={`shrink-0 px-4 py-2.5 rounded-xl border text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isEyeCare
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                    }`}
                  >
                    {dayOffsUsed >= 7 ? 'Monthly limit reached (7/7)' : 'Take Day Off'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Today's Daily Study Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
            isEyeCare ? 'glass-card border-white/10' : 'bg-white border-2 border-blue-200 shadow-md'
          }`}>
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
             <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isEyeCare ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                         <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                         <h3 className={`text-lg font-black leading-tight ${
                           isEyeCare ? 'text-white' : 'text-slate-950 font-black'
                         }`}>Today's Study</h3>
                         <span className={`text-[11px] font-black tracking-wider uppercase ${
                           isEyeCare ? 'text-emerald-400' : 'text-blue-700'
                         }`}>
                           {userProfile?.course || 'CA'} {userProfile?.level || 'Foundation'}
                         </span>
                      </div>
                   </div>
                </div>

                <div className={`p-5 rounded-2xl border text-center space-y-1 ${
                  isEyeCare ? 'bg-navy-900/60 border-white/5' : 'bg-blue-50/80 border-2 border-blue-200'
                }`}>
                   <div className={`text-3xl font-black font-mono ${
                     isEyeCare ? 'text-white' : 'text-blue-900 font-black'
                   }`}>{formatHm(todaySubjectTotals.totalSeconds)}</div>
                   <div className={`text-[10px] font-black uppercase tracking-wider ${
                     isEyeCare ? 'text-slate-400' : 'text-blue-800'
                   }`}>Total Stream Study Time</div>
                </div>

                <div className="pt-2">
                   <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                     isEyeCare ? 'text-slate-400' : 'text-slate-700 font-black'
                   }`}>Subjects Studied</h4>
                   {todaySubjectTotals.list.length === 0 ? (
                      <div className={`py-8 text-center text-sm border rounded-2xl ${
                        isEyeCare ? 'text-slate-500 border-white/5 bg-white/5' : 'text-slate-600 border-slate-200 bg-slate-50 font-semibold'
                      }`}>
                         You haven't recorded any sessions for today yet.
                      </div>
                   ) : (
                      <div className="space-y-3">
                         {todaySubjectTotals.list.map(([sub, dur]) => (
                            <div key={sub} className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                              isEyeCare ? 'bg-navy-900/50 border-white/5' : 'bg-slate-50 border-slate-200'
                            }`}>
                               <div className={`font-bold text-sm truncate pr-4 ${
                                 isEyeCare ? 'text-slate-300' : 'text-slate-900 font-bold'
                               }`}>{sub.split(':')[0]}</div>
                               <div className={`font-mono font-black text-sm shrink-0 ${
                                 isEyeCare ? 'text-emerald-400' : 'text-emerald-800 font-black'
                               }`}>{formatHm(dur)}</div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Recent Study Sessions Card */}
          <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl space-y-4 ${
            isEyeCare ? 'glass-card border-white/10' : 'bg-white border-2 border-blue-200 shadow-md'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${isEyeCare ? 'text-emerald-400' : 'text-blue-600'}`} />
                <h3 className={`text-base font-black ${isEyeCare ? 'text-white' : 'text-slate-950 font-black'}`}>
                  Recent Study Sessions
                </h3>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isEyeCare ? 'bg-white/10 text-slate-300 border border-white/10' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {filteredRecentSessions.length} Logs
              </span>
            </div>

            {/* Stream Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => { setRecentStreamFilter('all'); setShowAllRecentTimerSessions(false); }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  recentStreamFilter === 'all'
                    ? (isEyeCare ? 'bg-emerald-500 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                    : (isEyeCare ? 'bg-navy-900/80 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200')
                }`}
              >
                All Streams
              </button>
              {availableStreams.map((st) => {
                const isSelected = recentStreamFilter.toLowerCase().replace(/[\s_]+/g, '') === st.toLowerCase().replace(/[\s_]+/g, '');
                return (
                  <button
                    key={st}
                    onClick={() => { setRecentStreamFilter(st); setShowAllRecentTimerSessions(false); }}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? (isEyeCare ? 'bg-emerald-500 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                        : (isEyeCare ? 'bg-navy-900/80 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200')
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>

            {filteredRecentSessions.length === 0 ? (
              <div className={`p-6 text-center text-sm border rounded-2xl ${
                isEyeCare ? 'text-slate-500 border-white/5 bg-white/5' : 'text-slate-600 border-slate-200 bg-slate-50 font-semibold'
              }`}>
                {recentStreamFilter === 'all'
                  ? 'No study sessions recorded yet. Start the stopwatch above to log your time!'
                  : `No recorded study sessions found for ${recentStreamFilter}.`}
              </div>
            ) : (
              <div className={`rounded-2xl border divide-y overflow-hidden ${
                isEyeCare ? 'border-white/10 divide-white/5 bg-navy-900/40' : 'border-slate-200 divide-slate-100 bg-white'
              }`}>
                {(showAllRecentTimerSessions ? filteredRecentSessions : filteredRecentSessions.slice(0, 5)).map((sess) => {
                  const streamTag = getSessionStream(sess, userStreamLabel);
                  return (
                    <div key={sess.id} className={`p-3.5 flex items-center justify-between transition-colors ${
                      isEyeCare ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}>
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 ${
                          isEyeCare ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {getSubjectBadge(sess.subject)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-bold truncate ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
                              {sess.subject}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isEyeCare ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {streamTag}
                            </span>
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isEyeCare ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatDate(sess.date)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <div className={`text-xs font-mono font-bold ${isEyeCare ? 'text-emerald-400' : 'text-blue-700'}`}>
                          {formatTimerTime(sess.duration)}
                        </div>
                        <div className={`text-[10px] font-bold ${isEyeCare ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          ✓ Verified
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredRecentSessions.length > 5 && (
                  <div className={`p-2.5 text-center border-t ${isEyeCare ? 'border-white/5 bg-navy-950/40' : 'border-slate-100 bg-slate-50'}`}>
                    <button
                      onClick={() => setShowAllRecentTimerSessions(!showAllRecentTimerSessions)}
                      className={`text-xs font-bold transition-colors cursor-pointer ${
                        isEyeCare ? 'text-emerald-400 hover:text-emerald-300' : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      {showAllRecentTimerSessions ? 'Show Less ↑' : `Show All ${filteredRecentSessions.length} Sessions (${filteredRecentSessions.length - 5} More) ↓`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Your Timer Day Modal */}
      {showTimerDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200 ${
            isEyeCare ? 'glass-card border-purple-500/30' : 'bg-white border-2 border-purple-300'
          }`}>
            <div className={`sticky top-0 backdrop-blur-md z-10 border-b ${
              isEyeCare ? 'bg-navy-900/95 border-white/10' : 'bg-white/95 border-slate-200'
            }`}>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-black flex items-center gap-2 ${
                    isEyeCare ? 'text-white' : 'text-slate-950'
                  }`}>
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Your Timer Day
                  </h2>
                  <p className={`text-[11px] font-bold uppercase tracking-wider mt-1 ${
                    isEyeCare ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {userProfile?.course || 'CA'} {userProfile?.level || 'Foundation'}
                  </p>
                </div>
                <button onClick={() => setShowTimerDayModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date Navigation */}
              <div className="px-6 pb-4 flex items-center justify-between">
                <button 
                  onClick={() => setTimerDayDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 1); return nd; })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                >
                  ← Prev Day
                </button>
                <div className={`text-sm font-black ${isEyeCare ? 'text-gold-400' : 'text-blue-700'}`}>
                  {timerDayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <button 
                  onClick={() => setTimerDayDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 1); return nd; })}
                  disabled={getDateKey(timerDayDate) >= getDateKey(new Date())}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next Day →
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className={`p-5 rounded-2xl border text-center ${
                isEyeCare ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'
              }`}>
                <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${
                  isEyeCare ? 'text-purple-300' : 'text-purple-900'
                }`}>Total Study</div>
                <div className={`text-3xl font-black font-mono ${
                  isEyeCare ? 'text-white' : 'text-purple-950'
                }`}>{formatHm(timerDayTotals.totalSeconds)}</div>
              </div>

              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                  isEyeCare ? 'text-slate-400' : 'text-slate-700'
                }`}>Subject-wise Study</h4>
                {timerDayTotals.list.length === 0 ? (
                  <div className={`p-8 text-center text-sm border rounded-2xl ${
                    isEyeCare ? 'text-slate-500 border-white/5 bg-navy-900/50' : 'text-slate-600 border-slate-200 bg-slate-50 font-semibold'
                  }`}>
                    No study sessions recorded for this day.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timerDayTotals.list.map(([sub, dur]) => (
                      <div key={sub} className={`flex flex-col p-4 rounded-2xl border ${
                        isEyeCare ? 'bg-navy-900/80 border-white/5' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className={`font-bold text-sm ${isEyeCare ? 'text-white' : 'text-slate-950 font-bold'}`}>{sub}</span>
                        </div>
                        <div className={`font-mono font-bold text-sm ${
                          isEyeCare ? 'text-emerald-400' : 'text-emerald-800 font-black'
                        }`}>
                          {formatHm(dur)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules Section */}
      <div className={`mt-8 p-6 sm:p-8 rounded-3xl border space-y-6 ${
        isEyeCare ? 'bg-navy-900 border-white/5' : 'bg-white border-2 border-blue-200 shadow-md'
      }`}>
        <h2 className={`text-xl font-extrabold flex items-center gap-2 ${
          isEyeCare ? 'text-white' : 'text-slate-950 font-black'
        }`}>
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          Study Timer Rules & Points System
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rewards */}
          <div className="space-y-4">
            <h3 className={`text-sm font-black flex items-center gap-2 ${
              isEyeCare ? 'text-emerald-400' : 'text-emerald-800'
            }`}>
              <CheckCircle className="w-4 h-4" />
              Positive Points (Rewards)
            </h3>
            <ul className={`space-y-3 text-sm ${
              isEyeCare ? 'text-slate-300' : 'text-slate-700 font-medium'
            }`}>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span><strong>6 Hours Complete:</strong> +5 Points (One-time daily milestone)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span><strong>7+ Hours:</strong> +2 Points per additional hour</span>
              </li>
              <li className={`flex items-start gap-2 text-xs mt-2 ${
                isEyeCare ? 'text-slate-400' : 'text-slate-600 font-medium'
              }`}>
                Note: Milestones (1-5 hours) give no points, only messages. Each timer session auto-stops at 5 hours; press Start again to continue. Streaks grow only on days with 4+ hours studied.
              </li>
            </ul>
          </div>
          
          {/* Penalties */}
          <div className="space-y-4">
            <h3 className={`text-sm font-black flex items-center gap-2 ${
              isEyeCare ? 'text-rose-400' : 'text-rose-800'
            }`}>
              <AlertTriangle className="w-4 h-4" />
              Negative Points (Penalties)
            </h3>
            <ul className={`space-y-3 text-sm ${
              isEyeCare ? 'text-slate-300' : 'text-slate-700 font-medium'
            }`}>
              <li className="flex items-start gap-2">
                <span className="text-rose-600 mt-0.5">•</span>
                <span><strong>Missed Target:</strong> -3 Points per incomplete past target</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-600 mt-0.5">•</span>
                <span><strong>Low Study Day:</strong> -3 Points if you study less than 4 hours in a day</span>
              </li>
              <li className={`flex items-start gap-2 text-xs mt-2 ${
                isEyeCare ? 'text-slate-400' : 'text-slate-600 font-medium'
              }`}>
                Note: Penalties are checked and applied automatically when you log in the next day.
              </li>
            </ul>
          </div>

          {/* Exemptions */}
          <div className="space-y-4">
            <h3 className={`text-sm font-black flex items-center gap-2 ${
              isEyeCare ? 'text-amber-400' : 'text-amber-800'
            }`}>
              <ShieldCheck className="w-4 h-4" />
              Exemptions (Day Off)
            </h3>
            <ul className={`space-y-3 text-sm ${
              isEyeCare ? 'text-slate-300' : 'text-slate-700 font-medium'
            }`}>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span><strong>No Penalty:</strong> If you mark a Day Off, you will not receive penalties for missed targets or low study hours.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span><strong>Monthly Limit:</strong> You are allowed a maximum of 7 Day Offs per month.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>


      {showDayOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-amber-500/30 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Take a Day Off?</h2>
                <p className="text-sm text-slate-300 mt-2">You won't be penalized for not studying today. You have {remainingDayOffs} Day Offs remaining this month.</p>
              </div>
              <button onClick={() => setShowDayOffModal(false)} className="text-slate-400 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            {dayOffError && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{dayOffError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowDayOffModal(false)} className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancel</button>
              <button onClick={handleConfirmDayOff} disabled={savingDayOff} className="w-full py-3 rounded-xl bg-amber-500 text-navy-950 text-sm font-black hover:bg-amber-400 disabled:opacity-50">{savingDayOff ? 'Confirming...' : 'Confirm Day Off'}</button>
            </div>
          </div>
        </div>
      )}

      {showDayOnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Turn Day On?
                </h2>
                <p className="text-sm text-slate-300 mt-2">This will cancel your Day Off for today, restore 1 Day Off back to your monthly quota, and allow you to record your study sessions.</p>
              </div>
              <button onClick={() => setShowDayOnModal(false)} className="text-slate-400 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            {dayOffError && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{dayOffError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowDayOnModal(false)} className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Keep Day Off</button>
              <button onClick={handleCancelDayOff} disabled={savingDayOff} className="w-full py-3 rounded-xl bg-emerald-500 text-navy-950 text-sm font-black hover:bg-emerald-400 disabled:opacity-50">{savingDayOff ? 'Turning Day On...' : 'Confirm Day On'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Coaching Study Modal */}
      <CoachingStudyModal 
        isOpen={showCoachingModal} 
        onClose={() => setShowCoachingModal(false)} 
        subjects={subjects} 
      />

    </div>
  );
}
