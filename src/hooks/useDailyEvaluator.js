import { useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getDateKey } from '../utils/helpers';

export default function useDailyEvaluator(currentUser) {
  const evaluatedRef = useRef(false);

  useEffect(() => {
    if (!currentUser?.uid || evaluatedRef.current) return;
    
    const evaluatePastDays = async () => {
      try {
        evaluatedRef.current = true;
        const uid = currentUser.uid;
        const todayKey = getDateKey(new Date());

        // 1. Fetch Day Offs to know which days are exempt
        const dayOffsSnap = await getDocs(collection(db, 'dayOffs', uid, 'records'));
        const exemptDates = new Set(dayOffsSnap.docs.map(d => d.data().dateKey));

        // Create a batch
        let batch = writeBatch(db);
        let batchCount = 0;
        let pointsToDeduct = 0;

        const commitBatch = async () => {
          if (batchCount > 0) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        };

        // 2. Evaluate Missed Targets
        const qTargets = query(
          collection(db, 'targets'),
          where('uid', '==', uid)
        );
        const targetsSnap = await getDocs(qTargets);
        
        for (const targetDoc of targetsSnap.docs) {
          const tData = targetDoc.data();
          const targetDateKey = tData.targetDate || (tData.date?.toDate ? getDateKey(tData.date.toDate()) : null) || (tData.createdAt?.toDate ? getDateKey(tData.createdAt.toDate()) : null);
          
          if (!targetDateKey || targetDateKey >= todayKey) continue;
          if (tData.status === 'completed' || tData.targetPenaltyApplied) continue;

          // It's a past target, not completed, penalty not applied
          if (!exemptDates.has(targetDateKey)) {
            pointsToDeduct -= 3;
            
            // Record transaction
            const txRef = doc(collection(db, 'pointTransactions'));
            batch.set(txRef, {
              studentId: uid,
              amount: -3,
              type: 'penalty',
              reason: 'Daily Target Not Completed',
              sourceId: targetDoc.id,
              date: targetDateKey,
              createdAt: serverTimestamp()
            });
            batchCount++;
          }

          // Mark as penalty applied so we don't do it again
          batch.update(targetDoc.ref, { targetPenaltyApplied: true, status: 'pending' });
          batchCount++;
          if (batchCount > 400) await commitBatch();
        }

        // 3. Evaluate Low Study Days
        const qStats = query(
          collection(db, 'studyDailyStats'),
          where('studentId', '==', uid)
        );
        const statsSnap = await getDocs(qStats);

        for (const statDoc of statsSnap.docs) {
          const sData = statDoc.data();
          if (sData.date >= todayKey) continue;
          if (sData.lowStudyPenaltyApplied) continue;

          const totalSeconds = sData.totalStudySeconds || 0;
          if (totalSeconds < 14400) { // less than 4 hours
            if (!exemptDates.has(sData.date)) {
              pointsToDeduct -= 3;
              
              // Record transaction
              const txRef = doc(collection(db, 'pointTransactions'));
              batch.set(txRef, {
                studentId: uid,
                amount: -3,
                type: 'penalty',
                reason: 'Less Than 4 Hours Daily Study',
                sourceId: statDoc.id,
                date: sData.date,
                createdAt: serverTimestamp()
              });
              batchCount++;
            }
          }
          
          // Mark applied regardless of whether they had a day off, so we don't re-check
          batch.update(statDoc.ref, { lowStudyPenaltyApplied: true });
          batchCount++;
          if (batchCount > 400) await commitBatch();
        }

        // 4. Initialize today's studyDailyStats if it doesn't exist
        const todayStatRef = doc(db, 'studyDailyStats', `${uid}_${todayKey}`);
        const todayStatSnap = await getDocs(query(collection(db, 'studyDailyStats'), where('studentId', '==', uid), where('date', '==', todayKey)));
        if (todayStatSnap.empty) {
          batch.set(todayStatRef, {
            studentId: uid,
            date: todayKey,
            totalStudySeconds: 0,
            completedFullHours: 0,
            dailyStudyPoints: 0,
            lowStudyPenaltyApplied: false,
            completedMilestones: []
          });
          batchCount++;
        }

        // 5. Apply total deduction to user profile
        if (pointsToDeduct < 0) {
          const userRef = doc(db, 'users', uid);
          batch.update(userRef, {
            points: increment(pointsToDeduct),
            negativePoints: increment(Math.abs(pointsToDeduct))
          });
          batchCount++;
        }

        await commitBatch();

      } catch (err) {
        console.error("Error in daily evaluator:", err);
      }
    };

    evaluatePastDays();
  }, [currentUser]);
}
