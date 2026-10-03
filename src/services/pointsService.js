import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  increment, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getDateKey } from '../utils/helpers';
import { isSubjectMatch } from '../utils/subjectMatcher';

/**
 * Calculates genuine Study Timer Points based on verified study time.
 * 
 * Required Test Cases:
 * 3h 59m: 0 pts
 * 4h:     0 pts (Eligible for Daily Target points)
 * 5h:     0 pts (Eligible for Daily Target points)
 * 6h:     5 pts
 * 7h:     7 pts (5 + 2)
 * 8h:     9 pts (5 + 2 + 2)
 * 9h:     11 pts (5 + 2 + 2 + 2)
 * 10h:    13 pts (5 + 2 + 2 + 2 + 2)
 */
export function calculateDailyTimerPoints(totalSeconds) {
  const secs = Number(totalSeconds) || 0;
  const hours = secs / 3600;
  const fullHours = Math.floor(hours);
  if (fullHours < 6) return 0;
  return 5 + (fullHours - 6) * 2;
}

/**
 * Checks if total daily study time is eligible for Daily Target points.
 * Threshold: 4+ verified hours (14,400 seconds) across all subjects combined.
 */
export function isDailyTargetEligible(totalSeconds) {
  return (Number(totalSeconds) || 0) >= 14400;
}

/**
 * Helper to check if a session belongs to a given dateKey.
 */
export function isSessionOnDate(session, targetDateKey) {
  if (!session) return false;
  if (session.dateKey && session.dateKey === targetDateKey) return true;
  if (session.date) {
    const sDate = session.date.toDate ? session.date.toDate() : new Date(session.date);
    if (!isNaN(sDate.getTime()) && getDateKey(sDate) === targetDateKey) return true;
  }
  if (session.createdAt) {
    const cDate = session.createdAt.toDate ? session.createdAt.toDate() : new Date(session.createdAt);
    if (!isNaN(cDate.getTime()) && getDateKey(cDate) === targetDateKey) return true;
  }
  return false;
}

/**
 * Combines all study sessions across ALL subjects for a specific dateKey.
 * Includes active live timer if running today.
 */
export function calculateCombinedDailyStudy(sessions = [], activeTimerState = null, dateKey = null) {
  const targetDateKey = dateKey || getDateKey(new Date());
  
  // 1. Combine saved sessions across all subjects
  const daySessions = Array.isArray(sessions) ? sessions.filter(s => isSessionOnDate(s, targetDateKey)) : [];
  const savedSeconds = daySessions.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);

  // 2. Add live running timer seconds if active today
  let liveSeconds = 0;
  const todayKey = getDateKey(new Date());
  if (
    targetDateKey === todayKey &&
    activeTimerState &&
    activeTimerState.isActive &&
    activeTimerState.startTimestamp
  ) {
    const now = Date.now();
    const elapsed = Math.floor((now - activeTimerState.startTimestamp) / 1000);
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

/**
 * Reconciles and synchronizes today's points, timer milestones, and target eligibility
 * WITHOUT creating duplicate transactions.
 * 
 * Pipeline:
 * Verified Study Hours → Correct Study Timer Points → Correct Daily Target Eligibility → Correct Final Daily Points
 * 
 * Idempotency Guaranteed:
 * - Deterministic doc IDs: `${uid}_${dateKey}_timer_h${h}` & `${uid}_target_reward_${target.id}`
 * - Admin adjustments are preserved intact.
 * - Re-login, page refresh, and timer restarts will never duplicate points.
 */
export async function syncDailyPointsAndEligibility({
  db,
  uid,
  dateKey = null,
  sessions = [],
  targets = [],
  activeTimerState = null
}) {
  if (!db || !uid) return null;

  const targetDateKey = dateKey || getDateKey(new Date());
  const study = calculateCombinedDailyStudy(sessions, activeTimerState, targetDateKey);

  try {
    // 1. Fetch existing pointTransactions for this student
    const qTx = query(
      collection(db, 'pointTransactions'),
      where('studentId', '==', uid)
    );
    const txSnap = await getDocs(qTx);
    const existingTxDocs = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let pointsAdjustment = 0;
    const batch = writeBatch(db);
    let batchOperations = 0;

    // Filter transactions for this date
    const todayTransactions = existingTxDocs.filter(tx => tx.date === targetDateKey);

    // 2. Study Timer Milestones Reconciliation (Deterministic IDs)
    // Rule: < 6h: 0, 6h: 5, 7h+: +2 per additional hour
    const expectedMilestoneDocs = new Map(); // docId -> { hour, points }
    const completedMilestones = [];

    for (let h = 1; h <= study.fullHours; h++) {
      completedMilestones.push(h);
      if (h >= 6) {
        const expectedPoints = (h === 6) ? 5 : 2;
        const txDocId = `${uid}_${targetDateKey}_timer_h${h}`;
        expectedMilestoneDocs.set(txDocId, { hour: h, points: expectedPoints });
      }
    }

    // Existing timer transactions for today
    const existingTimerTx = todayTransactions.filter(tx => 
      tx.type === 'reward' && 
      (tx.milestoneHour || 
       (tx.reason && (tx.reason.includes('Milestone') || tx.reason.includes('Hours Completed'))) || 
       (tx.sourceId && tx.sourceId.includes('timer')))
    );

    // Track which expected milestones are already awarded
    const awardedMilestoneHours = new Set();
    for (const tx of existingTimerTx) {
      if (tx.milestoneHour) {
        awardedMilestoneHours.add(tx.milestoneHour);
      } else {
        const match = tx.reason?.match(/(\d+)\s*Hours?/i);
        if (match) awardedMilestoneHours.add(Number(match[1]));
      }
    }

    // Award any missing milestones that should be unlocked
    for (const [txDocId, info] of expectedMilestoneDocs.entries()) {
      const alreadyHasDoc = existingTxDocs.some(tx => tx.id === txDocId || tx.sourceId === txDocId);
      const alreadyAwardedHour = awardedMilestoneHours.has(info.hour);

      if (!alreadyHasDoc && !alreadyAwardedHour) {
        const txRef = doc(db, 'pointTransactions', txDocId);
        batch.set(txRef, {
          studentId: uid,
          amount: info.points,
          type: 'reward',
          reason: info.hour === 6 ? 'Study Milestone: 6 Hours Completed' : `Study Milestone: ${info.hour} Hours Completed`,
          sourceId: txDocId,
          milestoneHour: info.hour,
          date: targetDateKey,
          createdAt: serverTimestamp()
        });
        pointsAdjustment += info.points;
        batchOperations++;
      }
    }

    // Check for over-awarded timer points from older code:
    const totalExistingTimerPoints = existingTimerTx.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const expectedTotalTimerPoints = study.timerPoints;

    if (totalExistingTimerPoints > expectedTotalTimerPoints) {
      const excess = totalExistingTimerPoints - expectedTotalTimerPoints;
      let removedAmount = 0;

      for (const tx of existingTimerTx) {
        const isDeterministic = expectedMilestoneDocs.has(tx.id);
        if (!isDeterministic && removedAmount < excess) {
          const amt = Number(tx.amount) || 0;
          const toRemove = Math.min(amt, excess - removedAmount);
          batch.delete(doc(db, 'pointTransactions', tx.id));
          removedAmount += toRemove;
          pointsAdjustment -= toRemove;
          batchOperations++;
        }
      }
    }

    // 3. Process Daily Targets Eligibility & Points
    // Threshold: 4+ verified daily hours (14,400s)
    const dayTargets = Array.isArray(targets) 
      ? targets.filter(t => (t.targetDate === targetDateKey || isSessionOnDate(t, targetDateKey)))
      : [];

    for (const target of dayTargets) {
      const isCompleted = target.status === 'completed';
      const isHalfCompleted = target.status === 'half_completed';

      if (isCompleted || isHalfCompleted) {
        const targetRewardPoints = isCompleted ? 10 : 5;
        const rewardTxId = `${uid}_target_reward_${target.id}`;
        const existingRewardTx = existingTxDocs.find(
          tx => tx.id === rewardTxId || tx.sourceId === rewardTxId || (tx.sourceId === target.id && tx.amount > 0)
        );

        if (study.isTargetEligible) {
          // 4+ hours verified: Award target reward if not already awarded
          if (!existingRewardTx || !target.targetRewardGranted) {
            const txRef = doc(db, 'pointTransactions', rewardTxId);
            batch.set(txRef, {
              studentId: uid,
              amount: targetRewardPoints,
              type: 'reward',
              reason: isCompleted ? 'Daily Target Completed (>= 4 hrs verified)' : 'Daily Target Half Done (>= 4 hrs verified)',
              sourceId: rewardTxId,
              targetId: target.id,
              targetTitle: target.title || 'Daily Target',
              subject: target.subject || '',
              date: targetDateKey,
              createdAt: serverTimestamp()
            });

            const targetRef = doc(db, 'targets', target.id);
            batch.update(targetRef, {
              targetRewardGranted: true,
              eligibleAtStudyTime: study.totalSeconds,
              completed: true
            });

            if (!existingRewardTx) {
              pointsAdjustment += targetRewardPoints;
            }
            batchOperations++;
          }
        } else {
          // LESS THAN 4 HOURS: Daily Target points NOT allowed!
          if (existingRewardTx) {
            batch.delete(doc(db, 'pointTransactions', existingRewardTx.id));
            pointsAdjustment -= (Number(existingRewardTx.amount) || targetRewardPoints);
            batchOperations++;
          }
          if (target.targetRewardGranted) {
            const targetRef = doc(db, 'targets', target.id);
            batch.update(targetRef, {
              targetRewardGranted: false
            });
            batchOperations++;
          }
        }
      }
    }

    // 4. Update studyDailyStats record idempotently
    const statRef = doc(db, 'studyDailyStats', `${uid}_${targetDateKey}`);
    batch.set(statRef, {
      studentId: uid,
      date: targetDateKey,
      totalStudySeconds: study.savedSeconds, // verified saved time
      completedFullHours: study.fullHours,
      dailyStudyPoints: study.timerPoints,
      completedMilestones,
      targetPointsEligible: study.isTargetEligible,
      updatedAt: serverTimestamp()
    }, { merge: true });
    batchOperations++;

    // 5. Update user profile total points if adjustment needed
    // NOTE: Admin manual adjustments (manual_addition / manual_deduction) are untouched!
    if (pointsAdjustment !== 0) {
      const userRef = doc(db, 'users', uid);
      batch.update(userRef, {
        points: increment(pointsAdjustment),
        lastPointsSyncAt: serverTimestamp()
      });
      batchOperations++;
    }

    if (batchOperations > 0) {
      await batch.commit();
    }

    return {
      success: true,
      study,
      pointsAdjustment,
      completedMilestones
    };
  } catch (err) {
    console.error("Error in syncDailyPointsAndEligibility:", err);
    return { success: false, error: err };
  }
}
