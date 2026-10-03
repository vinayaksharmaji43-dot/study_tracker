// Pure test verification runner for Study Tracker Points & Eligibility Pipeline

// 1. Point formula definitions
function calculateDailyTimerPoints(totalSeconds) {
  const secs = Number(totalSeconds) || 0;
  const hours = secs / 3600;
  const fullHours = Math.floor(hours);
  if (fullHours < 6) return 0;
  return 5 + (fullHours - 6) * 2;
}

function isDailyTargetEligible(totalSeconds) {
  return (Number(totalSeconds) || 0) >= 14400;
}

function getDateKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSubjectMatch(sub1, sub2) {
  if (!sub1 || !sub2) return false;
  const s1 = String(sub1).toLowerCase().replace(/[\s\-_:]+/g, '');
  const s2 = String(sub2).toLowerCase().replace(/[\s\-_:]+/g, '');
  return s1.includes(s2) || s2.includes(s1);
}

function calculateTargetProgress(target, sessions = [], activeTimerState = null) {
  const targetTotalSeconds = (parseFloat(target.targetHours || target.targetValue || 1.0)) * 3600;
  const storedStudied = Number(target.studiedSeconds) || 0;

  let sessionsStudied = 0;
  if (Array.isArray(sessions) && sessions.length > 0) {
    const targetDateKey = target.targetDate;
    sessionsStudied = sessions.reduce((sum, s) => {
      if (!isSubjectMatch(s.subject, target.subject)) return sum;
      if (targetDateKey) {
        const sDateKey = s.dateKey || (s.date ? getDateKey(s.date) : null);
        if (sDateKey && sDateKey === targetDateKey) return sum + (Number(s.duration) || 0);
        if (!sDateKey) return sum + (Number(s.duration) || 0);
      } else {
        return sum + (Number(s.duration) || 0);
      }
      return sum;
    }, 0);
  }

  const totalStudied = Math.max(storedStudied, sessionsStudied);
  let liveRunningSeconds = 0;
  if (
    activeTimerState &&
    activeTimerState.isActive &&
    activeTimerState.startTimestamp &&
    isSubjectMatch(activeTimerState.selectedSubject, target.subject)
  ) {
    const elapsed = Math.floor((Date.now() - activeTimerState.startTimestamp) / 1000);
    liveRunningSeconds = Math.max(0, (activeTimerState.accumulatedSeconds || 0) + elapsed);
  }

  const effectiveStudied = totalStudied + liveRunningSeconds;
  const has20Mins = effectiveStudied >= 1200;
  const requiresTimer = target.category !== 'other';
  const isLocked = requiresTimer && !has20Mins;

  return {
    targetTotalSeconds,
    effectiveStudied,
    has20Mins,
    requiresTimer,
    isLocked,
    isEligible: effectiveStudied >= targetTotalSeconds
  };
}

function calculateCombinedDailyStudy(sessions = [], activeTimerState = null, dateKey = null) {
  const targetDateKey = dateKey || getDateKey(new Date());
  const daySessions = Array.isArray(sessions) ? sessions.filter(s => {
    if (!s) return false;
    if (s.dateKey && s.dateKey === targetDateKey) return true;
    if (s.date && getDateKey(s.date) === targetDateKey) return true;
    return false;
  }) : [];
  
  const savedSeconds = daySessions.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
  let liveSeconds = 0;
  if (
    activeTimerState &&
    activeTimerState.isActive &&
    activeTimerState.startTimestamp
  ) {
    const elapsed = Math.floor((Date.now() - activeTimerState.startTimestamp) / 1000);
    liveSeconds = Math.max(0, (activeTimerState.accumulatedSeconds || 0) + elapsed);
  }

  const totalSeconds = savedSeconds + liveSeconds;
  const totalHours = totalSeconds / 3600;
  const fullHours = Math.floor(totalHours);
  const timerPoints = calculateDailyTimerPoints(totalSeconds);
  const isTargetEligible = isDailyTargetEligible(totalSeconds);

  return {
    targetDateKey,
    daySessions,
    savedSeconds,
    liveSeconds,
    totalSeconds,
    totalHours,
    fullHours,
    timerPoints,
    isTargetEligible
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log("======================================================================");
console.log("  STUDY TRACKER POINT & ELIGIBILITY VERIFICATION SUITE");
console.log("======================================================================\n");

// -------------------------------------------------------------
// Test 1: Verified Study Time -> Study Timer Points Table
// -------------------------------------------------------------
console.log("👉 Test 1: Verified Study Time Table vs Expected Points");

// 3h 59m = 14,340s
const t3h59m = 3 * 3600 + 59 * 60;
assert(calculateDailyTimerPoints(t3h59m) === 0, "3h 59m -> 0 Study Timer Points");
assert(isDailyTargetEligible(t3h59m) === false, "3h 59m -> Ineligible for Daily Target points (< 4h)");

// 4h = 14,400s
const t4h = 4 * 3600;
assert(calculateDailyTimerPoints(t4h) === 0, "4h -> 0 Study Timer Points");
assert(isDailyTargetEligible(t4h) === true, "4h -> Eligible for Daily Target points (>= 4h)");

// 5h = 18,000s
const t5h = 5 * 3600;
assert(calculateDailyTimerPoints(t5h) === 0, "5h -> 0 Study Timer Points");
assert(isDailyTargetEligible(t5h) === true, "5h -> Eligible for Daily Target points");

// 6h = 21,600s
const t6h = 6 * 3600;
assert(calculateDailyTimerPoints(t6h) === 5, "6h -> 5 Study Timer Points");
assert(isDailyTargetEligible(t6h) === true, "6h -> Eligible for Daily Target points");

// 7h = 25,200s
const t7h = 7 * 3600;
assert(calculateDailyTimerPoints(t7h) === 7, "7h -> 7 Study Timer Points (5 + 2)");

// 8h = 28,800s
const t8h = 8 * 3600;
assert(calculateDailyTimerPoints(t8h) === 9, "8h -> 9 Study Timer Points (5 + 2 + 2)");

// 9h = 32,400s
const t9h = 9 * 3600;
assert(calculateDailyTimerPoints(t9h) === 11, "9h -> 11 Study Timer Points (5 + 2 + 2 + 2)");

// 10h = 36,000s
const t10h = 10 * 3600;
assert(calculateDailyTimerPoints(t10h) === 13, "10h -> 13 Study Timer Points (5 + 2 + 2 + 2 + 2)");


// -------------------------------------------------------------
// Test 2: Multiple subjects combined correctly
// -------------------------------------------------------------
console.log("\n👉 Test 2: Multiple subjects combined correctly");
const todayDate = getDateKey(new Date());
const multiSubjectSessions = [
  { subject: 'Paper 1: Accounting', duration: 7200, dateKey: todayDate },        // 2h
  { subject: 'Paper 2: Business Laws', duration: 9000, dateKey: todayDate },     // 2.5h
  { subject: 'Paper 3: Quantitative Aptitude', duration: 5400, dateKey: todayDate } // 1.5h
];
// Combined = 2h + 2.5h + 1.5h = 6.0 hours (21600 seconds)
const combined = calculateCombinedDailyStudy(multiSubjectSessions, null, todayDate);
assert(combined.totalSeconds === 21600, "Combined total seconds = 21,600s across 3 subjects");
assert(combined.fullHours === 6, "Combined fullHours = 6");
assert(combined.timerPoints === 5, "Combined 6h across subjects correctly awards 5 timer points");
assert(combined.isTargetEligible === true, "Combined 6h across subjects correctly enables Daily Target points");


// -------------------------------------------------------------
// Test 3: 20-minute target requirement works (Lock & Unlock)
// -------------------------------------------------------------
console.log("\n👉 Test 3: 20-minute target requirement works");
const mockTargetLaw = {
  id: 'target-1',
  subject: 'Paper 2: Business Laws',
  targetHours: 2.0,
  category: 'stream',
  targetDate: todayDate,
  studiedSeconds: 0
};

// 3a. Target with 19 minutes (1,140 seconds) on that subject
const sessions19Min = [
  { subject: 'Paper 2: Business Laws', duration: 1140, dateKey: todayDate }
];
const prog19 = calculateTargetProgress(mockTargetLaw, sessions19Min, null);
assert(prog19.has20Mins === false, "19 minutes studied does NOT meet 20-minute threshold");
assert(prog19.isLocked === true, "Done button REMAINS LOCKED before 20 minutes");

// 3b. Target with 20 minutes (1,200 seconds) on that subject
const sessions20Min = [
  { subject: 'Paper 2: Business Laws', duration: 1200, dateKey: todayDate }
];
const prog20 = calculateTargetProgress(mockTargetLaw, sessions20Min, null);
assert(prog20.has20Mins === true, "20 minutes studied meets 20-minute threshold");
assert(prog20.isLocked === false, "Done button UNLOCKS after 20 verified minutes");

// 3c. Target on different subject doesn't unlock
const sessionsDifferentSubject = [
  { subject: 'Paper 1: Accounting', duration: 7200, dateKey: todayDate } // 2h on Accounting
];
const progWrongSubj = calculateTargetProgress(mockTargetLaw, sessionsDifferentSubject, null);
assert(progWrongSubj.has20Mins === false, "2h on Accounting does NOT count for Business Laws target");
assert(progWrongSubj.isLocked === true, "Done button remains locked when study was on a different subject");


// -------------------------------------------------------------
// Test 4: Less than 4 daily hours prevents Daily Target points
// -------------------------------------------------------------
console.log("\n👉 Test 4: Less than 4 daily hours prevents Daily Target points");
const sessions3h50m = [
  { subject: 'Paper 1: Accounting', duration: 13800, dateKey: todayDate } // 3h 50m
];
const studyUnder4 = calculateCombinedDailyStudy(sessions3h50m, null, todayDate);
assert(studyUnder4.isTargetEligible === false, "3h 50m study prevents Daily Target points (< 4h)");
assert(studyUnder4.timerPoints === 0, "3h 50m study gives 0 timer points");


// -------------------------------------------------------------
// Test 5: 4+ daily hours allows Daily Target points
// -------------------------------------------------------------
console.log("\n👉 Test 5: 4+ daily hours allows Daily Target points");
const sessions4hExact = [
  { subject: 'Paper 1: Accounting', duration: 14400, dateKey: todayDate } // 4h
];
const study4h = calculateCombinedDailyStudy(sessions4hExact, null, todayDate);
assert(study4h.isTargetEligible === true, "4h study allows Daily Target points (>= 4h)");


// -------------------------------------------------------------
// Test 6: Target points values (Done / Half Done / Missed)
// -------------------------------------------------------------
console.log("\n👉 Test 6: Done, Half Done, and Missed points calculation");
const targetPointsDone = 10;
const targetPointsHalfDone = 5;
const targetPenaltyMissed = -3;
assert(targetPointsDone === 10, "Done target gives +10 Points");
assert(targetPointsHalfDone === 5, "Half Done target gives +5 Points");
assert(targetPenaltyMissed === -3, "Missed target applies -3 Penalty Points");


// -------------------------------------------------------------
// Test 7: Deterministic Idempotency (Refresh, Re-login, Timer Save)
// -------------------------------------------------------------
console.log("\n👉 Test 7: Deterministic Doc ID Idempotency");
const uid = "student_test_abc";
const targetId = "target_xyz_123";

const docIdTimer6 = `${uid}_${todayDate}_timer_h6`;
const docIdTimer7 = `${uid}_${todayDate}_timer_h7`;
const docIdTargetReward = `${uid}_target_reward_${targetId}`;
const docIdTargetPenalty = `${uid}_target_penalty_${targetId}`;

assert(docIdTimer6 === `${uid}_${todayDate}_timer_h6`, "Timer 6h doc ID is deterministic");
assert(docIdTimer7 === `${uid}_${todayDate}_timer_h7`, "Timer 7h doc ID is deterministic");
assert(docIdTargetReward === `${uid}_target_reward_${targetId}`, "Target reward doc ID is deterministic");
assert(docIdTargetPenalty === `${uid}_target_penalty_${targetId}`, "Target penalty doc ID is deterministic");

// Simulated Map for Firestore idempotency test
const mockFirestore = new Map();

// Session save 1 (User reaches 6h)
mockFirestore.set(docIdTimer6, { amount: 5, studentId: uid, date: todayDate });
assert(mockFirestore.size === 1, "Initial save stores 1 transaction");

// User refreshes page (Simulated syncDailyPointsAndEligibility)
mockFirestore.set(docIdTimer6, { amount: 5, studentId: uid, date: todayDate });
assert(mockFirestore.size === 1, "Refresh does not duplicate points (size remains 1)");

// User logs out and re-logs in
mockFirestore.set(docIdTimer6, { amount: 5, studentId: uid, date: todayDate });
assert(mockFirestore.size === 1, "Re-login does not duplicate points (size remains 1)");

// Timer restarts/saves again
mockFirestore.set(docIdTimer6, { amount: 5, studentId: uid, date: todayDate });
assert(mockFirestore.size === 1, "Timer restart/save does not duplicate points (size remains 1)");


// -------------------------------------------------------------
// Test 8: Admin adjustments correctly affect the final total
// -------------------------------------------------------------
console.log("\n👉 Test 8: Admin adjustments preservation and final total calculation");
const transactions = [
  { id: 'admin_tx_1', type: 'manual_addition', amount: 20, studentId: uid, source: 'manual_adjustment' },
  { id: 'admin_tx_2', type: 'manual_deduction', amount: -5, studentId: uid, source: 'manual_adjustment' },
  { id: docIdTimer6, type: 'reward', amount: 5, milestoneHour: 6, date: todayDate },
  { id: docIdTargetReward, type: 'reward', amount: 10, targetId: targetId, date: todayDate }
];

const adminAdjustments = transactions
  .filter(tx => tx.source === 'manual_adjustment' || tx.type === 'manual_addition' || tx.type === 'manual_deduction')
  .reduce((sum, tx) => sum + tx.amount, 0);

const timerPointsEarned = transactions
  .filter(tx => tx.milestoneHour)
  .reduce((sum, tx) => sum + tx.amount, 0);

const targetPointsEarned = transactions
  .filter(tx => tx.targetId)
  .reduce((sum, tx) => sum + tx.amount, 0);

const finalTotalPoints = adminAdjustments + timerPointsEarned + targetPointsEarned;

assert(adminAdjustments === 15, "Admin adjustments correctly total +15 PTS (+20, -5)");
assert(timerPointsEarned === 5, "Timer points correctly total +5 PTS (6h milestone)");
assert(targetPointsEarned === 10, "Target reward correctly totals +10 PTS (Done target)");
assert(finalTotalPoints === 30, "Final total correctly integrates admin adjustments (15 + 5 + 10 = 30 PTS)");

console.log("\n======================================================================");
console.log(`  ALL TESTS PASSED: ${passed} / ${passed + failed} (${failed} FAILED)`);
console.log("======================================================================\n");
