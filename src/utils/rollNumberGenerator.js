import { runTransaction, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Automatically generates a unique Roll Number using:
 * Name + Course + Level + Unique Sequence Number
 * e.g., ARYANCAFND01
 */
export async function generateRollNumber(name, course, level) {
  // 1. Clean the name: uppercase, remove spaces, remove special characters
  const rawName = name || 'STUDENT';
  const cleanName = rawName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 10) || 'STUDENT';

  // 2. Format course code
  let courseCode = 'CA';
  if (course && course.toUpperCase().includes('CMA')) {
    courseCode = 'CMA';
  }

  // 3. Format level code
  let levelCode = 'FND';
  if (level && level.toUpperCase().includes('INTER')) {
    levelCode = 'INT';
  }

  const prefix = `${cleanName}${courseCode}${levelCode}`;

  // 4. Generate unique sequence number using transaction
  const counterRef = doc(db, 'metadata', `rollCounter_${courseCode}_${levelCode}`);

  try {
    const seqNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newCount = 1;
      if (counterDoc.exists()) {
        newCount = (counterDoc.data().count || 0) + 1;
      }
      transaction.set(counterRef, { count: newCount }, { merge: true });
      return newCount;
    });

    // Pad sequence number with leading zeros, e.g., 01, 02
    const formattedSeq = seqNumber.toString().padStart(2, '0');
    return `${prefix}${formattedSeq}`;
  } catch (err) {
    console.error("Error generating roll number:", err);
    // Fallback if transaction fails
    const fallbackSeq = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefix}${fallbackSeq}`;
  }
}
