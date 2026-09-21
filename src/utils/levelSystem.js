// 35-Level Stream-Specific Gamification System Utility

export const DEFAULT_35_LEVELS = [
  { levelNumber: 1, levelName: 'Beginner', badge: '🌱', requiredPoints: 0 },
  { levelNumber: 2, levelName: 'Starter', badge: '📘', requiredPoints: 100 },
  { levelNumber: 3, levelName: 'Learner', badge: '📚', requiredPoints: 200 },
  { levelNumber: 4, levelName: 'Explorer', badge: '🔎', requiredPoints: 350 },
  { levelNumber: 5, levelName: 'Focused', badge: '🎯', requiredPoints: 500 },
  { levelNumber: 6, levelName: 'Consistent', badge: '🔥', requiredPoints: 700 },
  { levelNumber: 7, levelName: 'Disciplined', badge: '⚡', requiredPoints: 900 },
  { levelNumber: 8, levelName: 'Dedicated', badge: '💪', requiredPoints: 1150 },
  { levelNumber: 9, levelName: 'Rising Star', badge: '⭐', requiredPoints: 1400 },
  { levelNumber: 10, levelName: 'Hard Worker', badge: '🧠', requiredPoints: 1700 },
  { levelNumber: 11, levelName: 'Study Warrior', badge: '🛡️', requiredPoints: 2050 },
  { levelNumber: 12, levelName: 'Goal Chaser', badge: '🏹', requiredPoints: 2450 },
  { levelNumber: 13, levelName: 'Focus Master', badge: '🎯', requiredPoints: 2900 },
  { levelNumber: 14, levelName: 'Consistency Pro', badge: '🔥', requiredPoints: 3400 },
  { levelNumber: 15, levelName: 'Knowledge Builder', badge: '📖', requiredPoints: 3950 },
  { levelNumber: 16, levelName: 'Determined', badge: '🚀', requiredPoints: 4550 },
  { levelNumber: 17, levelName: 'Progress Maker', badge: '📈', requiredPoints: 5200 },
  { levelNumber: 18, levelName: 'Study Leader', badge: '👑', requiredPoints: 5900 },
  { levelNumber: 19, levelName: 'High Achiever', badge: '🏆', requiredPoints: 6650 },
  { levelNumber: 20, levelName: 'Elite Learner', badge: '💎', requiredPoints: 7500 },
  { levelNumber: 21, levelName: 'Performance Pro', badge: '⚡', requiredPoints: 8400 },
  { levelNumber: 22, levelName: 'Master Mind', badge: '🧠', requiredPoints: 9350 },
  { levelNumber: 23, levelName: 'Power Learner', badge: '🔥', requiredPoints: 10400 },
  { levelNumber: 24, levelName: 'Unstoppable', badge: '🚀', requiredPoints: 11550 },
  { levelNumber: 25, levelName: 'Top Performer', badge: '🏅', requiredPoints: 12800 },
  { levelNumber: 26, levelName: 'Study Champion', badge: '🏆', requiredPoints: 14150 },
  { levelNumber: 27, levelName: 'Excellence', badge: '⚡', requiredPoints: 15600 },
  { levelNumber: 28, levelName: 'Elite Scholar', badge: '💎', requiredPoints: 17150 },
  { levelNumber: 29, levelName: 'Master Learner', badge: '👑', requiredPoints: 18800 },
  { levelNumber: 30, levelName: 'Legendary', badge: '🔥', requiredPoints: 20550 },
  { levelNumber: 31, levelName: 'Grand Scholar', badge: '👑', requiredPoints: 22400 },
  { levelNumber: 32, levelName: 'Ultimate Achiever', badge: '💎', requiredPoints: 24350 },
  { levelNumber: 33, levelName: 'Elite Master', badge: '⚡', requiredPoints: 26400 },
  { levelNumber: 34, levelName: 'Legend', badge: '🏆', requiredPoints: 28550 },
  { levelNumber: 35, levelName: 'Ultimate Master', badge: '👑', requiredPoints: 30800 }
];

export const LEVEL_STREAMS = ['CA_Foundation', 'CA_Intermediate', 'CMA_Foundation', 'CMA_Intermediate'];

export function getDefaultStreamLevels(streamId) {
  return DEFAULT_35_LEVELS.map(level => ({
    ...level,
    stream: streamId,
    active: true
  }));
}

export function normalizeLevelConfig(levels, streamId) {
  if (!Array.isArray(levels) || levels.length !== 35) {
    return getDefaultStreamLevels(streamId);
  }

  return levels
    .map((level, index) => ({
      ...getDefaultStreamLevels(streamId)[index],
      ...level,
      levelNumber: index + 1,
      stream: streamId,
      active: level.active !== false,
      requiredPoints: Math.max(0, Number(level.requiredPoints) || 0)
    }))
    .sort((a, b) => a.levelNumber - b.levelNumber);
}

export function getStreamId(userCourse, userLevel) {
  const c = (userCourse || 'CA').toUpperCase().includes('CMA') ? 'CMA' : 'CA';
  const l = (userLevel || 'Foundation').toLowerCase().includes('intermediate') ? 'Intermediate' : 'Foundation';
  return `${c}_${l}`;
}

export function calculateStudentLevel(userPoints = 0, streamConfig = null) {
  const points = Number(userPoints) || 0;
  const levels = normalizeLevelConfig(streamConfig, 'unknown');

  // Find the highest level achieved where points >= requiredPoints
  let currentLevelObj = levels[0];
  let nextLevelObj = levels[1] || null;

  for (let i = 0; i < levels.length; i++) {
    if (levels[i].active !== false && points >= levels[i].requiredPoints) {
      currentLevelObj = levels[i];
      nextLevelObj = levels[i + 1] || null;
    } else {
      break;
    }
  }

  const isMaxLevel = currentLevelObj.levelNumber === 35;
  const currentReq = currentLevelObj.requiredPoints;
  const nextReq = nextLevelObj ? nextLevelObj.requiredPoints : currentReq;

  const pointsInCurrentLevel = points - currentReq;
  const pointsNeededForNext = nextLevelObj ? (nextReq - currentReq) : 0;
  const pointsRemaining = nextLevelObj ? Math.max(0, nextReq - points) : 0;

  let progressPct = 100;
  if (!isMaxLevel && pointsNeededForNext > 0) {
    progressPct = Math.min(100, Math.max(0, (pointsInCurrentLevel / pointsNeededForNext) * 100));
  }

  return {
    currentLevelNumber: currentLevelObj.levelNumber,
    currentLevelName: currentLevelObj.levelName,
    badge: currentLevelObj.badge,
    currentLevelObj,
    nextLevelObj,
    isMaxLevel,
    totalPoints: points,
    pointsRemaining,
    progressPct: Number(progressPct.toFixed(1))
  };
}
