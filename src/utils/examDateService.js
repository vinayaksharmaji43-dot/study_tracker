import { doc, onSnapshot, setDoc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';

export const DEFAULT_EXAM_STREAMS = [
  {
    id: 'CA_Foundation',
    streamName: 'CA Foundation',
    course: 'CA',
    level: 'Foundation',
    examDate: '2027-01-03',
    examCycle: 'January 2027',
  },
  {
    id: 'CA_Intermediate',
    streamName: 'CA Intermediate',
    course: 'CA',
    level: 'Intermediate',
    examDate: '2027-01-05',
    examCycle: 'January 2027',
  },
  {
    id: 'CMA_Foundation',
    streamName: 'CMA Foundation',
    course: 'CMA',
    level: 'Foundation',
    examDate: '2027-06-15',
    examCycle: 'June 2027',
  },
  {
    id: 'CMA_Intermediate',
    streamName: 'CMA Intermediate',
    course: 'CMA',
    level: 'Intermediate',
    examDate: '2027-06-20',
    examCycle: 'June 2027',
  },
  {
    id: 'CA_Final',
    streamName: 'CA Final',
    course: 'CA',
    level: 'Final',
    examDate: '2027-05-02',
    examCycle: 'May 2027',
  },
  {
    id: 'CMA_Final',
    streamName: 'CMA Final',
    course: 'CMA',
    level: 'Final',
    examDate: '2027-06-25',
    examCycle: 'June 2027',
  }
];

/**
 * Calculates remaining calendar days between today and target exam date.
 * Returns { daysLeft, isPassed, isToday, status, formattedDate }
 */
export function calculateDaysLeft(examDateString) {
  if (!examDateString || typeof examDateString !== 'string') {
    return {
      daysLeft: null,
      isPassed: false,
      isToday: false,
      status: 'No Date Set',
      formattedDate: ''
    };
  }

  // Parse YYYY-MM-DD
  const parts = examDateString.trim().split('-');
  if (parts.length !== 3) {
    // Attempt standard JS Date parse
    const parsed = new Date(examDateString);
    if (isNaN(parsed.getTime())) {
      return {
        daysLeft: null,
        isPassed: false,
        isToday: false,
        status: 'Invalid Date',
        formattedDate: ''
      };
    }
    return calculateDaysLeftFromDate(parsed);
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return {
      daysLeft: null,
      isPassed: false,
      isToday: false,
      status: 'Invalid Date',
      formattedDate: ''
    };
  }

  // Target exam date at midnight local time
  const examDate = new Date(year, month - 1, day, 0, 0, 0, 0);

  // Today at midnight local time
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Exact calendar difference in days
  const diffMs = examDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = formatExamDateDisplay(examDateString);

  if (diffDays < 0) {
    return {
      daysLeft: 0,
      isPassed: true,
      isToday: false,
      status: 'Exam Completed',
      formattedDate
    };
  }

  if (diffDays === 0) {
    return {
      daysLeft: 0,
      isPassed: false,
      isToday: true,
      status: 'Exam is Today!',
      formattedDate
    };
  }

  return {
    daysLeft: diffDays,
    isPassed: false,
    isToday: false,
    status: `${diffDays} Days Left`,
    formattedDate
  };
}

function calculateDaysLeftFromDate(examDate) {
  examDate.setHours(0, 0, 0, 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const diffMs = examDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const formattedDate = examDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  if (diffDays < 0) {
    return { daysLeft: 0, isPassed: true, isToday: false, status: 'Exam Completed', formattedDate };
  }
  if (diffDays === 0) {
    return { daysLeft: 0, isPassed: false, isToday: true, status: 'Exam is Today!', formattedDate };
  }
  return { daysLeft: diffDays, isPassed: false, isToday: false, status: `${diffDays} Days Left`, formattedDate };
}

/**
 * Format YYYY-MM-DD into readable Indian date, e.g. "3 January 2027"
 */
export function formatExamDateDisplay(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-').map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return dateString;
}

/**
 * Subscribe to realtime exam dates from Firestore settings/examDates
 */
export function subscribeExamDates(callback) {
  const docRef = doc(db, 'settings', 'examDates');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data);
    } else {
      // Fallback to default config
      const initialMap = {};
      DEFAULT_EXAM_STREAMS.forEach(s => {
        initialMap[s.id] = {
          streamId: s.id,
          streamName: s.streamName,
          examDate: s.examDate,
          examCycle: s.examCycle || ''
        };
      });
      callback(initialMap);
    }
  }, (err) => {
    console.error('Error fetching examDates:', err);
    // Return defaults on error
    const initialMap = {};
    DEFAULT_EXAM_STREAMS.forEach(s => {
      initialMap[s.id] = {
        streamId: s.id,
        streamName: s.streamName,
        examDate: s.examDate,
        examCycle: s.examCycle || ''
      };
    });
    callback(initialMap);
  });
}

/**
 * Save or update exam date for a stream in Firestore settings/examDates
 */
export async function saveStreamExamDate(streamId, examDate, streamName = '', examCycle = '') {
  if (!streamId) throw new Error('Stream ID is required');
  const docRef = doc(db, 'settings', 'examDates');
  
  const payload = {
    [streamId]: {
      streamId,
      streamName: streamName || streamId.replace('_', ' '),
      examDate: examDate ? String(examDate).trim() : '',
      examCycle: examCycle ? String(examCycle).trim() : '',
      updatedAt: new Date().toISOString()
    }
  };

  await setDoc(docRef, payload, { merge: true });
}

/**
 * Delete a custom stream exam date from Firestore settings/examDates
 */
export async function deleteStreamExamDate(streamId) {
  if (!streamId) return;
  const docRef = doc(db, 'settings', 'examDates');
  await updateDoc(docRef, {
    [streamId]: deleteField()
  });
}
