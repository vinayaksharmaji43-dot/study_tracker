import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getDateKey, formatExactTime } from '../utils/helpers';

/**
 * Centrally logs any administrative action performed on a student.
 * 
 * Required Action Fields:
 * - Student ID
 * - Student Name
 * - Admin ID
 * - Admin Name
 * - Action Type
 * - Previous Value
 * - New Value
 * - Added / Delta
 * - Reason
 * - Date
 * - Exact Time
 */
export async function logAdminAction(db, {
  studentId,
  studentName,
  studentEmail = '',
  adminId,
  adminName,
  adminEmail = '',
  actionType,
  previousValue = 'N/A',
  newValue = 'N/A',
  added = null,
  reason = '',
  metadata = {}
}) {
  if (!db || !studentId) {
    console.warn("logAdminAction missing db or studentId");
    return null;
  }

  const now = new Date();
  const dateStr = getDateKey(now);
  const exactTimeStr = formatExactTime(now);

  const record = {
    studentId: String(studentId),
    studentName: studentName || 'Student',
    studentEmail: studentEmail || '',
    adminId: adminId || 'admin',
    adminName: adminName || 'Admin',
    adminEmail: adminEmail || '',
    actionType: actionType || 'Admin Modification',
    previousValue: previousValue !== undefined ? String(previousValue) : 'N/A',
    newValue: newValue !== undefined ? String(newValue) : 'N/A',
    added: added !== null && added !== undefined ? String(added) : null,
    reason: (reason || 'No reason specified').trim(),
    date: dateStr,
    exactTime: exactTimeStr,
    createdAt: serverTimestamp(),
    metadata: metadata || {}
  };

  try {
    const docRef = await addDoc(collection(db, 'adminActionHistory'), record);
    return { id: docRef.id, ...record };
  } catch (err) {
    console.error("Failed to log admin action:", err);
    return null;
  }
}

/**
 * Subscribes to real-time action history for a specific student.
 */
export function subscribeStudentActionHistory(db, studentId, onUpdate, onError) {
  if (!db || !studentId) return () => {};

  const q = query(
    collection(db, 'adminActionHistory'),
    where('studentId', '==', String(studentId))
  );

  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.date || 0).getTime());
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.date || 0).getTime());
        return tb - ta;
      });
      onUpdate(docs);
    },
    (err) => {
      console.warn("Error subscribing to student action history:", err);
      if (onError) onError(err);
    }
  );
}
