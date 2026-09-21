// 35-Level Stream-Specific Gamification System Utility

export const DEFAULT_35_LEVELS = [
  { levelNumber: 1, levelName: 'Seed', badge: '🌱', requiredPoints: 0 },
  { levelNumber: 2, levelName: 'Bronze I', badge: '🥉', requiredPoints: 100 },
  { levelNumber: 3, levelName: 'Bronze II', badge: '🥉', requiredPoints: 200 },
  { levelNumber: 4, levelName: 'Bronze III', badge: '🥉', requiredPoints: 350 },
  { levelNumber: 5, levelName: 'Shield Bearer', badge: '🛡️', requiredPoints: 500 },
  { levelNumber: 6, levelName: 'Target Hitter', badge: '🎯', requiredPoints: 700 },
  { levelNumber: 7, levelName: 'Silver I', badge: '🥈', requiredPoints: 900 },
  { levelNumber: 8, levelName: 'Silver II', badge: '🥈', requiredPoints: 1150 },
  { levelNumber: 9, levelName: 'Silver III', badge: '🥈', requiredPoints: 1400 },
  { levelNumber: 10, levelName: 'Concept Clearer', badge: '🧠', requiredPoints: 1700 },
  { levelNumber: 11, levelName: 'Bookworm', badge: '📚', requiredPoints: 2050 },
  { levelNumber: 12, levelName: 'Gold I', badge: '🥇', requiredPoints: 2450 },
  { levelNumber: 13, levelName: 'Gold II', badge: '🥇', requiredPoints: 2900 },
  { levelNumber: 14, levelName: 'Gold III', badge: '🥇', requiredPoints: 3400 },
  { levelNumber: 15, levelName: 'Gladiator', badge: '⚔️', requiredPoints: 3950 },
  { levelNumber: 16, levelName: 'Platinum I', badge: '💎', requiredPoints: 4550 },
  { levelNumber: 17, levelName: 'Platinum II', badge: '💎', requiredPoints: 5200 },
  { levelNumber: 18, levelName: 'Platinum III', badge: '💎', requiredPoints: 5900 },
  { levelNumber: 19, levelName: 'Fire Starter', badge: '🔥', requiredPoints: 6650 },
  { levelNumber: 20, levelName: 'Rising Star', badge: '🌟', requiredPoints: 7500 },
  { levelNumber: 21, levelName: 'Champion I', badge: '🏆', requiredPoints: 8400 },
  { levelNumber: 22, levelName: 'Champion II', badge: '🏆', requiredPoints: 9350 },
  { levelNumber: 23, levelName: 'Champion III', badge: '🏆', requiredPoints: 10400 },
  { levelNumber: 24, levelName: 'Speedster', badge: '⚡', requiredPoints: 11550 },
  { levelNumber: 25, levelName: 'Royal Scholar', badge: '👑', requiredPoints: 12800 },
  { levelNumber: 26, levelName: 'Visionary I', badge: '🔮', requiredPoints: 14150 },
  { levelNumber: 27, levelName: 'Visionary II', badge: '🔮', requiredPoints: 15600 },
  { levelNumber: 28, levelName: 'Visionary III', badge: '🔮', requiredPoints: 17150 },
  { levelNumber: 29, levelName: 'Galaxy Thinker', badge: '🌌', requiredPoints: 18800 },
  { levelNumber: 30, levelName: 'Dragon Slayer', badge: '🐉', requiredPoints: 20550 },
  { levelNumber: 31, levelName: 'CA/CMA Knight', badge: '🎓', requiredPoints: 22400 },
  { levelNumber: 32, levelName: 'Commander', badge: '🎖️', requiredPoints: 24350 },
  { levelNumber: 33, levelName: 'Hall of Famer', badge: '🏛️', requiredPoints: 26400 },
  { levelNumber: 34, levelName: 'Legend', badge: '🌟', requiredPoints: 28550 },
  { levelNumber: 35, levelName: 'Ultimate Blueprint Master', badge: '🚀', requiredPoints: 30800 }
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
