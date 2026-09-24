export function formatTimerTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatHours(hoursOrSeconds, isSeconds = false) {
  const hours = isSeconds ? hoursOrSeconds / 3600 : hoursOrSeconds;
  if (!hours || isNaN(hours)) return '0.0h';
  return `${hours.toFixed(1)}h`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function getDateKey(date = new Date()) {
  const value = date?.toDate ? date.toDate() : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthKey(date = new Date()) {
  return getDateKey(date).slice(0, 7);
}

export function calculateStreak(sessions = [], protectedDates = []) {
  if (!sessions || sessions.length === 0) return 0;
  
  // Aggregate durations per date
  const dailyDurations = {};
  sessions.forEach(s => {
    if (!s.date) return;
    const d = s.date.toDate ? s.date.toDate() : new Date(s.date);
    const dateKey = getDateKey(d);
    const duration = Number(s.duration) || 0;
    dailyDurations[dateKey] = (dailyDurations[dateKey] || 0) + duration;
  });

  // A study day is one where total duration >= 14400 seconds (4 hours)
  const validStudyDates = Object.keys(dailyDurations).filter(k => dailyDurations[k] >= 14400);
  
  if (validStudyDates.length === 0) return 0;

  const protectedDateSet = new Set(protectedDates);
  let streak = 0;
  const studyDateSet = new Set(validStudyDates);
  const currentDate = new Date();

  // Move over today's protected rest days, or the usual one-day grace period.
  while (protectedDateSet.has(getDateKey(currentDate))) {
    currentDate.setDate(currentDate.getDate() - 1);
  }
  if (!studyDateSet.has(getDateKey(currentDate))) {
    currentDate.setDate(currentDate.getDate() - 1);
  }
  if (!studyDateSet.has(getDateKey(currentDate))) return 0;

  while (true) {
    const currentDateKey = getDateKey(currentDate);
    if (studyDateSet.has(currentDateKey)) {
      streak++;
    } else if (!protectedDateSet.has(currentDateKey)) {
      break;
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

export function calculateDailyPoints(hours) {
  if (!hours || hours < 6) return 0;
  return 5 + Math.floor(hours - 6) * 2;
}

