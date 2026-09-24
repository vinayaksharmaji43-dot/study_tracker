// Motivation System Configuration and Priority Resolution

export const DEFAULT_AUTOMATIC_QUOTES = [
  'Discipline is choosing what you want most over what you want now.',
  'Consistency beats intensity when intensity fades away.',
  'Small daily wins are the real foundation of greatness.',
  'Your future self will thank you for the hours you protect today.',
  'Study with intention, and progress will become visible.',
  'Success is built one focused session at a time.'
];

export const TARGET_STREAMS = [
  { id: 'all', label: 'All Streams' },
  { id: 'CA Foundation', label: 'CA Foundation' },
  { id: 'CA Intermediate', label: 'CA Intermediate' },
  { id: 'CMA Foundation', label: 'CMA Foundation' },
  { id: 'CMA Intermediate', label: 'CMA Intermediate' }
];

export const MOTIVATION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours

/**
 * Normalizes userProfile into one of the 4 canonical streams:
 * - CA Foundation
 * - CA Intermediate
 * - CMA Foundation
 * - CMA Intermediate
 */
export function getStudentStream(userProfile) {
  if (!userProfile) return 'CA Foundation';

  const course = String(userProfile.course || '').trim();
  const level = String(userProfile.level || '').trim();

  // If already standard format
  if (course === 'CA Foundation' || course === 'CA Intermediate' || course === 'CMA Foundation' || course === 'CMA Intermediate') {
    return course;
  }

  const isCMA = course.toUpperCase().includes('CMA');
  const isInter = course.toUpperCase().includes('INTER') || level.toUpperCase().includes('INTER');

  if (isCMA) {
    return isInter ? 'CMA Intermediate' : 'CMA Foundation';
  } else {
    return isInter ? 'CA Intermediate' : 'CA Foundation';
  }
}

/**
 * Extracts milliseconds timestamp safely from Firestore Timestamp or JS Date
 */
export function parseTimestampMs(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value.toMillis && typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates the exact expiration timestamp for a manual motivation
 */
export function getMotivationExpiresAtMs(motivation) {
  if (!motivation) return 0;

  // 1. Direct expiresAt
  const expiresAtMs = parseTimestampMs(motivation.expiresAt) || motivation.expiresAtMs;
  if (expiresAtMs) return expiresAtMs;

  // 2. CreatedAt + 24 hours
  const createdAtMs = parseTimestampMs(motivation.createdAt) || motivation.createdAtMs;
  if (createdAtMs) return createdAtMs + MOTIVATION_DURATION_MS;

  return 0;
}

/**
 * Checks whether a manual motivation is currently active and within its 24-hour window
 */
export function isMotivationActive(motivation, currentTimeMs = Date.now()) {
  if (!motivation) return false;
  if (motivation.active === false) return false;

  const expiresAtMs = getMotivationExpiresAtMs(motivation);
  if (!expiresAtMs) {
    // If pending server timestamp resolution, treat as active
    return true;
  }

  return currentTimeMs < expiresAtMs;
}

/**
 * Returns human-readable remaining time until expiration
 */
export function getRemainingTime(motivation, currentTimeMs = Date.now()) {
  const expiresAtMs = getMotivationExpiresAtMs(motivation);
  if (!expiresAtMs) {
    return { expired: false, hours: 24, mins: 0, secs: 0, text: '24h left', progressPct: 100 };
  }

  const diffMs = expiresAtMs - currentTimeMs;
  if (diffMs <= 0) {
    return { expired: true, hours: 0, mins: 0, secs: 0, text: 'Expired', progressPct: 0 };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const progressPct = Math.max(0, Math.min(100, Math.round((diffMs / MOTIVATION_DURATION_MS) * 100)));

  let text = '';
  if (hours > 0) {
    text = `${hours}h ${mins}m left`;
  } else if (mins > 0) {
    text = `${mins}m ${secs}s left`;
  } else {
    text = `${secs}s left`;
  }

  return {
    expired: false,
    hours,
    mins,
    secs,
    text,
    progressPct
  };
}

/**
 * Resolves the effective motivation for a student based on the strict priority:
 * 1. Specific Stream manual motivation (if active & not expired)
 * 2. All Streams manual motivation (if active & not expired)
 * 3. Automatic rotating motivation (fallback)
 */
export function resolveEffectiveMotivation(manualMotivations = [], userProfile = null, currentTimeMs = Date.now()) {
  const studentStream = getStudentStream(userProfile);

  // Filter only active & non-expired motivations
  const activeMotivations = (manualMotivations || []).filter(m => isMotivationActive(m, currentTimeMs));

  // Sort descending by creation time (newest first)
  activeMotivations.sort((a, b) => {
    const timeA = parseTimestampMs(a.createdAt) || a.createdAtMs || 0;
    const timeB = parseTimestampMs(b.createdAt) || b.createdAtMs || 0;
    return timeB - timeA;
  });

  // Priority 1: Specific Stream match
  const specificMatch = activeMotivations.find(m => {
    const target = String(m.targetStream || '').trim();
    return target === studentStream;
  });

  if (specificMatch) {
    return {
      type: 'manual_specific',
      text: specificMatch.text,
      author: specificMatch.author || 'Mentor MADHAV',
      targetStream: specificMatch.targetStream,
      isManual: true,
      remainingTime: getRemainingTime(specificMatch, currentTimeMs),
      motivation: specificMatch
    };
  }

  // Priority 2: All Streams match
  const allMatch = activeMotivations.find(m => {
    const target = String(m.targetStream || '').trim().toLowerCase();
    return target === 'all' || target === 'all streams';
  });

  if (allMatch) {
    return {
      type: 'manual_all',
      text: allMatch.text,
      author: allMatch.author || 'Mentor MADHAV',
      targetStream: 'All Streams',
      isManual: true,
      remainingTime: getRemainingTime(allMatch, currentTimeMs),
      motivation: allMatch
    };
  }

  // Priority 3: Fallback to existing Automatic Rotating Daily Motivation
  const motivationIndex = new Date(currentTimeMs).getDate() % DEFAULT_AUTOMATIC_QUOTES.length;
  return {
    type: 'automatic',
    text: DEFAULT_AUTOMATIC_QUOTES[motivationIndex],
    author: 'Mentor MADHAV',
    targetStream: 'Automatic',
    isManual: false,
    remainingTime: null,
    motivation: null
  };
}
