/**
 * Subject normalization and matching utility for accurate timer & target linkage.
 */

export function normalizeSubjectName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/^paper\s*\d+\s*[:\-–]?\s*/i, '') // removes 'Paper 1:', 'Paper 2 -', etc.
    .replace(/^p\d+\s*[:\-–]?\s*/i, '')        // removes 'P1:', 'P2 -'
    .replace(/[^a-z0-9]/g, '');                // remove whitespace, symbols
}

export function isSubjectMatch(subject1, subject2) {
  if (!subject1 || !subject2) return false;
  const s1 = String(subject1).trim().toLowerCase();
  const s2 = String(subject2).trim().toLowerCase();
  
  if (s1 === s2) return true;

  const n1 = normalizeSubjectName(s1);
  const n2 = normalizeSubjectName(s2);

  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // Substring matching with minimum meaningful length
  if (n1.length >= 4 && n2.length >= 4) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  return false;
}

export function formatDurationHuman(totalSeconds) {
  const secs = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Calculates accurate target progress based on:
 * 1. Target's stored studiedSeconds in Firestore
 * 2. Saved studySessions matching this subject recorded on/after target creation
 * 3. Active running timer for this subject (if currently in progress)
 */
export function calculateTargetProgress(target, sessions = [], activeTimerState = null) {
  const targetTotalSeconds = (parseFloat(target.targetValue || target.targetHours) || 1.0) * 3600;
  
  // 1. Stored studiedSeconds on the target document
  const storedStudied = Number(target.studiedSeconds) || 0;

  // 2. Sum recorded studySessions matching subject
  let sessionsStudied = 0;
  if (Array.isArray(sessions) && sessions.length > 0) {
    const targetDateKey = target.targetDate;
    const targetCreatedAt = target.createdAt?.toDate ? target.createdAt.toDate() : (targetDateKey ? new Date(targetDateKey + 'T00:00:00') : null);

    sessionsStudied = sessions.reduce((sum, s) => {
      if (!isSubjectMatch(s.subject, target.subject)) return sum;
      
      // Ensure session is on or after target creation
      if (targetCreatedAt && s.date) {
        const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
        // Include sessions from the same date or later (give 2 hours buffer for same-day start)
        if (sDate < new Date(targetCreatedAt.getTime() - 2 * 3600 * 1000)) {
          return sum;
        }
      }
      return sum + (Number(s.duration) || 0);
    }, 0);
  }

  // Use maximum of stored vs calculated sessions to guarantee no loss
  let totalStudied = Math.max(storedStudied, sessionsStudied);

  // 3. Add live running timer seconds if active for this subject
  let liveRunningSeconds = 0;
  if (
    activeTimerState &&
    activeTimerState.isActive &&
    activeTimerState.startTimestamp &&
    isSubjectMatch(activeTimerState.selectedSubject, target.subject)
  ) {
    const now = Date.now();
    const elapsed = Math.floor((now - activeTimerState.startTimestamp) / 1000);
    liveRunningSeconds = Math.max(0, (activeTimerState.accumulatedSeconds || 0) + elapsed);
  }

  const effectiveStudied = totalStudied + liveRunningSeconds;
  const isEligible = effectiveStudied >= targetTotalSeconds;
  const remainingSeconds = Math.max(0, targetTotalSeconds - effectiveStudied);
  const progressPct = Math.min(100, Math.round((effectiveStudied / targetTotalSeconds) * 100));

  return {
    targetTotalSeconds,
    effectiveStudied,
    storedStudied,
    liveRunningSeconds,
    isEligible,
    remainingSeconds,
    progressPct,
    studiedHuman: formatDurationHuman(effectiveStudied),
    targetHuman: formatDurationHuman(targetTotalSeconds),
    remainingHuman: formatDurationHuman(remainingSeconds)
  };
}
