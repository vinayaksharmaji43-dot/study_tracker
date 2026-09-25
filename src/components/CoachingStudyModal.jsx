import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getDateKey } from '../utils/helpers';
import { 
  GraduationCap, 
  Lock, 
  Send, 
  Clock, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Plus, 
  ExternalLink, 
  ShieldCheck, 
  Award,
  Zap,
  Info
} from 'lucide-react';

const TELEGRAM_URL = 'https://t.me/Ca_success_blueprint_support';
const TELEGRAM_HANDLE = '@Ca_success_blueprint_support';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export default function CoachingStudyModal({ isOpen, onClose, subjects = [] }) {
  const { currentUser, userProfile } = useAuth();

  // Modal View: 'gate' | 'initial_form' | 'daily_entry' | 'view_initial_info'
  const [modalView, setModalView] = useState('gate');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Initial Form State
  const [initialName, setInitialName] = useState('');
  const [initialHours, setInitialHours] = useState('');
  const [initialHoliday, setInitialHoliday] = useState('Sunday');

  // Daily Entry State
  const todayKey = getDateKey(new Date());
  const [entrySubject, setEntrySubject] = useState(subjects[0] || 'Accounting');
  const [entryHours, setEntryHours] = useState('2');
  const [entryMinutes, setEntryMinutes] = useState('0');

  // Today's coaching entries listener
  const [todayEntries, setTodayEntries] = useState([]);

  useEffect(() => {
    if (subjects.length > 0 && !entrySubject) {
      setEntrySubject(subjects[0]);
    }
  }, [subjects, entrySubject]);

  useEffect(() => {
    if (userProfile?.name) {
      setInitialName(userProfile.name);
    }
  }, [userProfile]);

  // Real-time listener for current student's coaching entries today
  useEffect(() => {
    if (!currentUser?.uid || !isOpen) return;

    const q = query(
      collection(db, 'coachingStudyEntries'),
      where('uid', '==', currentUser.uid),
      where('dateKey', '==', todayKey),
      where('status', '==', 'Active')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTodayEntries(docs);
    }, (err) => console.error("Error fetching today coaching entries:", err));

    return () => unsub();
  }, [currentUser, isOpen, todayKey]);

  // Check Access Priority Rules
  const hasAdminApproval = Boolean(userProfile?.coachingStudyAccess === true);

  const disabledUntilDate = userProfile?.coachingStudyDisabledUntil 
    ? new Date(userProfile.coachingStudyDisabledUntil) 
    : null;
  const isTemporarilyDisabled = Boolean(disabledUntilDate && disabledUntilDate.getTime() > Date.now());

  const isSunday = new Date().getDay() === 0;

  const hasSubmittedInitialForm = Boolean(userProfile?.coachingStudyInitialForm?.locked);

  // Set appropriate view whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setSuccessToast('');

    // Priority 1: No Admin Approval
    if (!hasAdminApproval) {
      setModalView('gate_unapproved');
      return;
    }

    // Priority 2: Admin Approved + Temporary Disable Active
    if (isTemporarilyDisabled) {
      setModalView('gate_disabled');
      return;
    }

    // Priority 3: Sunday
    if (isSunday) {
      setModalView('gate_sunday');
      return;
    }

    // Priority 4: Active! Check if initial form is done
    if (!hasSubmittedInitialForm) {
      setModalView('initial_form');
    } else {
      setModalView('daily_entry');
    }
  }, [isOpen, hasAdminApproval, isTemporarilyDisabled, isSunday, hasSubmittedInitialForm]);

  if (!isOpen) return null;

  // Handle Initial Form Submission
  const handleSaveInitialForm = async (e) => {
    e.preventDefault();
    if (!initialName.trim()) return setErrorMsg('Please enter your name.');
    if (!initialHours.trim() || Number(initialHours) <= 0) return setErrorMsg('Please enter valid planned coaching hours.');

    try {
      setSubmitting(true);
      setErrorMsg('');

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        'coachingStudyInitialForm': {
          name: initialName.trim(),
          hoursPlanned: initialHours.trim(),
          holidayDay: initialHoliday,
          submittedAt: new Date().toISOString(),
          locked: true
        }
      });

      setSuccessToast('Coaching profile setup completed! You can now log your daily coaching study.');
      setModalView('daily_entry');
    } catch (err) {
      console.error("Error saving coaching initial form:", err);
      setErrorMsg('Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Daily Coaching Entry Submission
  const handleSaveDailyEntry = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const hoursNum = parseFloat(entryHours) || 0;
    const minsNum = parseFloat(entryMinutes) || 0;
    const totalDurationHours = hoursNum + (minsNum / 60);
    const durationSeconds = Math.round(totalDurationHours * 3600);

    if (durationSeconds <= 0) {
      return setErrorMsg('Please enter a valid study time greater than 0.');
    }

    if (totalDurationHours > 16) {
      return setErrorMsg('Coaching study hours cannot exceed 16 hours in a single session.');
    }

    // Anti-duplication check: Check if same subject with same hours was submitted today
    const isDuplicate = todayEntries.some(
      entry => entry.subject?.toLowerCase() === entrySubject?.toLowerCase() && 
               entry.durationSeconds === durationSeconds
    );

    if (isDuplicate) {
      return setErrorMsg(`An identical Coaching Study entry of ${totalDurationHours.toFixed(1)}h for ${entrySubject} has already been logged today.`);
    }

    try {
      setSubmitting(true);

      const now = new Date();
      const dateDisplay = new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(now);

      // Perform atomic transaction: add entry, update studyDailyStats, user studyHours, and calculate milestone points
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', currentUser.uid);
        const statRef = doc(db, 'studyDailyStats', `${currentUser.uid}_${todayKey}`);

        const statDoc = await transaction.get(statRef);
        let prevTotalSecs = 0;
        let completedMilestones = [];

        if (statDoc.exists()) {
          prevTotalSecs = statDoc.data().totalStudySeconds || 0;
          completedMilestones = statDoc.data().completedMilestones || [];
        }

        const newTotalSecs = prevTotalSecs + durationSeconds;
        const newFullHours = Math.floor(newTotalSecs / 3600);

        let earned = 0;
        let newlyUnlocked = [];

        // Milestone Rule: 6th hour = +5 PTS, 7th hour and above = +2 PTS each
        for (let h = 1; h <= newFullHours; h++) {
          if (!completedMilestones.includes(h)) {
            newlyUnlocked.push(h);
            completedMilestones.push(h);
            if (h === 6) earned += 5;
            if (h >= 7) earned += 2;
          }
        }

        // 1. Update daily study statistics
        transaction.set(statRef, {
          studentId: currentUser.uid,
          date: todayKey,
          totalStudySeconds: newTotalSecs,
          coachingStudySeconds: increment(durationSeconds),
          completedFullHours: newFullHours,
          dailyStudyPoints: increment(earned),
          completedMilestones
        }, { merge: true });

        // 2. Update user profile study hours & points
        const userUpdates = {
          studyHours: increment(totalDurationHours),
          coachingStudyHours: increment(totalDurationHours)
        };
        if (earned > 0) {
          userUpdates.points = increment(earned);

          // Add pointTransaction
          const txRef = doc(collection(db, 'pointTransactions'));
          transaction.set(txRef, {
            studentId: currentUser.uid,
            amount: earned,
            type: 'reward',
            reason: `Coaching Study Milestones: ${newlyUnlocked.join(', ')} Hours`,
            sourceId: `coaching_${todayKey}_${Date.now()}`,
            date: todayKey,
            createdAt: serverTimestamp()
          });
        }
        transaction.update(userRef, userUpdates);

        // 3. Create studySession record (so it reflects in sessions & streaks)
        const sessionRef = doc(collection(db, 'studySessions'));
        transaction.set(sessionRef, {
          uid: currentUser.uid,
          subject: entrySubject,
          duration: durationSeconds,
          maxFocusSecs: durationSeconds,
          course: userProfile?.course || 'CA Foundation',
          source: 'coaching',
          dateKey: todayKey,
          date: serverTimestamp()
        });

        // 4. Create dedicated coachingStudyEntry document
        const coachingRef = doc(collection(db, 'coachingStudyEntries'));
        transaction.set(coachingRef, {
          uid: currentUser.uid,
          studentName: userProfile?.name || currentUser.email,
          rollNumber: userProfile?.rollNumber || 'N/A',
          course: userProfile?.course || 'CA Foundation',
          dateKey: todayKey,
          dateDisplay,
          subject: entrySubject,
          hours: totalDurationHours,
          durationSeconds,
          studyTimeAddedFormatted: `+${totalDurationHours.toFixed(1)} Hours`,
          pointsEarned: earned,
          milestonesUnlocked: newlyUnlocked,
          status: 'Active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      setSuccessToast(`+${totalDurationHours.toFixed(1)} Hours of Coaching Study added to today's Study Time successfully!`);
      setEntryHours('2');
      setEntryMinutes('0');
      setTimeout(() => setSuccessToast(''), 6000);
    } catch (err) {
      console.error("Error saving daily coaching entry:", err);
      setErrorMsg('Failed to log coaching entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const initialForm = userProfile?.coachingStudyInitialForm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6 relative">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-glow-emerald">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Coaching Study</span>
                {hasAdminApproval && !isTemporarilyDisabled && !isSunday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Log verified offline/online coaching classroom study hours</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successToast && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 1: NOT APPROVED BY ADMIN */}
        {/* ========================================================================= */}
        {modalView === 'gate_unapproved' && (
          <div className="py-6 text-center space-y-6 relative z-10">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center shadow-glow-amber">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-black text-white">Approval Required</h3>
              <p className="text-sm font-semibold text-amber-300 leading-relaxed">
                Coaching Study access is available only after Admin approval.
              </p>
              <p className="text-xs text-slate-400">
                Please contact the platform administrator to verify your coaching enrollment and unlock this feature.
              </p>
            </div>

            <div className="pt-2">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-royal-600 hover:from-sky-400 hover:to-royal-500 text-white font-bold text-sm shadow-glow-blue transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Contact Admin on Telegram</span>
                <ExternalLink className="w-3.5 h-3.5 text-sky-200" />
              </a>
              <div className="text-[11px] text-slate-500 font-mono mt-2">
                {TELEGRAM_HANDLE}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 2: TEMPORARILY DISABLED BY ADMIN */}
        {/* ========================================================================= */}
        {modalView === 'gate_disabled' && (
          <div className="py-6 text-center space-y-6 relative z-10">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-black text-white">Temporarily Disabled</h3>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono font-bold text-sm">
                Admin Disabled Until: {new Intl.DateTimeFormat('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }).format(disabledUntilDate)}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                Your Coaching Study button is currently locked by the administrator. All previous historical study records remain safe.
                Access will automatically restore after the scheduled period.
              </p>
            </div>

            <div className="pt-2">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-sky-400 border border-sky-500/30 text-xs font-bold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Contact Admin on Telegram</span>
              </a>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 3: SUNDAY RESTRICTION */}
        {/* ========================================================================= */}
        {modalView === 'gate_sunday' && (
          <div className="py-6 text-center space-y-6 relative z-10">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 mx-auto flex items-center justify-center">
              <Calendar className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-black text-white">Sunday Rest Day</h3>
              <p className="text-sm font-bold text-indigo-300">
                Coaching Study is unavailable on Sundays.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                As per platform study policy, Coaching Study entries are paused on Sundays. 
                The feature will automatically unlock on Monday morning for your normal study logging.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 4: FIRST-TIME COACHING STUDY FORM (LOCKABLE) */}
        {/* ========================================================================= */}
        {modalView === 'initial_form' && (
          <form onSubmit={handleSaveInitialForm} className="space-y-5 relative z-10">
            <div className="p-4 rounded-2xl bg-royal-500/10 border border-royal-500/30 text-xs text-royal-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-royal-400 shrink-0 mt-0.5" />
              <div>
                <strong>First-Time Verification:</strong> Please complete your coaching schedule details below. Once submitted, these details are locked for student editing.
              </div>
            </div>

            {/* Field 1: Your Name */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Your Name
              </label>
              <input
                type="text"
                required
                value={initialName}
                onChange={(e) => setInitialName(e.target.value)}
                placeholder="e.g. Aryan Sharma"
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Field 2: How many hours will you study in coaching? */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                How many hours will you study in coaching?
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="16"
                required
                value={initialHours}
                onChange={(e) => setInitialHours(e.target.value)}
                placeholder="e.g. 3.5"
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Field 3: When will your coaching holiday be? */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                When will your coaching holiday be?
              </label>
              <select
                value={initialHoliday}
                onChange={(e) => setInitialHoliday(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-navy-950 font-black text-sm shadow-glow-emerald transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? 'Locking & Saving...' : 'Save & Lock Schedule'}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* CASE 5: DAILY COACHING STUDY ENTRY (ACTIVE STATE) */}
        {/* ========================================================================= */}
        {modalView === 'daily_entry' && (
          <div className="space-y-6 relative z-10">
            
            {/* Locked Profile Snapshot (View Only) */}
            {initialForm && (
              <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400">Schedule:</span>
                  <strong className="text-white">{initialForm.hoursPlanned}h planned</strong>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Off:</span>
                  <strong className="text-amber-300">{initialForm.holidayDay}</strong>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Locked by Admin
                </span>
              </div>
            )}

            {/* Daily Entry Form */}
            <form onSubmit={handleSaveDailyEntry} className="space-y-4 p-5 rounded-2xl bg-navy-900/60 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Today's Coaching Study Entry</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Date (Auto Today) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Date (Today)
                  </label>
                  <div className="px-4 py-2.5 rounded-xl bg-navy-950 border border-white/5 text-white font-mono text-xs flex items-center justify-between">
                    <span>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Live</span>
                  </div>
                </div>

                {/* Subject Picker */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Subject Studied
                  </label>
                  <select
                    value={entrySubject}
                    onChange={(e) => setEntrySubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Study Time Inputs: Hours & Minutes */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Classroom Study Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="16"
                      value={entryHours}
                      onChange={(e) => setEntryHours(e.target.value)}
                      placeholder="Hours"
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold pointer-events-none">
                      Hrs
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="5"
                      value={entryMinutes}
                      onChange={(e) => setEntryMinutes(e.target.value)}
                      placeholder="Minutes"
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold pointer-events-none">
                      Mins
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-navy-950 font-black text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Adding Study Time...' : '+ Add Coaching Study to Timer'}
              </button>
            </form>

            {/* Today's Logged Coaching Entries */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider">Today's Logged Coaching</span>
                <span className="font-mono text-emerald-400 font-bold">
                  Total: {todayEntries.reduce((sum, e) => sum + (e.hours || 0), 0).toFixed(1)}h
                </span>
              </div>

              {todayEntries.length === 0 ? (
                <div className="p-4 rounded-xl bg-navy-900/40 border border-white/5 text-center text-xs text-slate-500">
                  No coaching entries added yet today. Use the form above to add your coaching hours.
                </div>
              ) : (
                <div className="space-y-2">
                  {todayEntries.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3.5 rounded-xl bg-navy-900/80 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{item.subject}</div>
                          <div className="text-[11px] text-slate-400">
                            Added: <strong className="text-emerald-400">{item.studyTimeAddedFormatted || `${item.hours}h`}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.pointsEarned > 0 && (
                          <span className="px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 font-mono font-bold text-[10px] border border-gold-500/30">
                            +{item.pointsEarned} PTS
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          ✓ Synced
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
