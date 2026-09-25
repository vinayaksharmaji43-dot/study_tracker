import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatHours } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  Trash2, 
  Search, 
  AlertTriangle, 
  UserX, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  User, 
  Mail, 
  Hash, 
  BookOpen, 
  Calendar, 
  Clock, 
  Award, 
  Lock,
  RefreshCw,
  AlertOctagon
} from 'lucide-react';

export default function AdminDeleteStudent() {
  const { currentUser, userProfile } = useAuth();

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Student for Deletion
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState('');
  
  // Success Message
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch registered students in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(list);
      setLoadingStudents(false);
    }, (err) => {
      console.error("Error loading students for deletion tool:", err);
      setLoadingStudents(false);
    });

    return () => unsub();
  }, []);

  // 2. Search match calculation (by email or roll number)
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    return students.filter(s => {
      const email = (s.email || '').toLowerCase();
      const roll = (s.rollNumber || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      // Match Gmail/Email or Roll Number (or fallback student name)
      return email.includes(term) || roll.includes(term) || name.includes(term);
    });
  }, [students, searchTerm]);

  // Handle Select Student
  const handleSelectStudent = (student) => {
    if (student.role === 'admin') {
      alert("⚠️ Administrator accounts cannot be deleted through this tool for security reasons.");
      return;
    }
    setSelectedStudent(student);
    setConfirmationInput('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Helper to batch delete documents from a query in chunks of 400
  const deleteQueryDocsInBatches = async (q, collectionName) => {
    try {
      const snap = await getDocs(q);
      if (snap.empty) return 0;

      let count = 0;
      const docs = snap.docs;
      const CHUNK_SIZE = 400;

      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        chunk.forEach((docSnap) => {
          batch.delete(docSnap.ref);
          count++;
        });
        await batch.commit();
      }
      return count;
    } catch (err) {
      console.warn(`Could not delete from ${collectionName}:`, err);
      return 0;
    }
  };

  // 3. Execute Complete Student Data Deletion
  const handlePermanentDeletion = async () => {
    if (!selectedStudent) return;
    
    // Safety check 1: Confirm text
    if (confirmationInput.trim() !== 'DELETE') {
      setErrorMessage("Please type 'DELETE' in the confirmation box to proceed.");
      return;
    }

    // Safety check 2: Prevent deleting admins
    if (selectedStudent.role === 'admin') {
      setErrorMessage("Administrator accounts cannot be deleted.");
      return;
    }

    const studentUid = selectedStudent.id || selectedStudent.uid;
    if (!studentUid) {
      setErrorMessage("Invalid student record. Missing unique User ID.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');
    setDeletionProgress('Initializing permanent deletion protocol...');

    try {
      // 1. Delete Study Sessions
      setDeletionProgress('Removing study timer records...');
      await deleteQueryDocsInBatches(query(collection(db, 'studySessions'), where('uid', '==', studentUid)), 'studySessions (uid)');
      await deleteQueryDocsInBatches(query(collection(db, 'studySessions'), where('studentId', '==', studentUid)), 'studySessions (studentId)');

      // 2. Delete Active Study Session indicator (Currently Studying)
      setDeletionProgress('Clearing live study session status...');
      try {
        await deleteDoc(doc(db, 'activeStudySessions', studentUid));
      } catch (e) {
        /* Ignore if not exists */
      }

      // 3. Delete Daily Stats
      setDeletionProgress('Removing daily study statistics & milestone records...');
      await deleteQueryDocsInBatches(query(collection(db, 'studyDailyStats'), where('studentId', '==', studentUid)), 'studyDailyStats');

      // 4. Delete Point Transactions
      setDeletionProgress('Removing points ledger & history...');
      await deleteQueryDocsInBatches(query(collection(db, 'pointTransactions'), where('studentId', '==', studentUid)), 'pointTransactions');

      // 5. Delete Targets
      setDeletionProgress('Removing self-managed daily targets...');
      await deleteQueryDocsInBatches(query(collection(db, 'targets'), where('uid', '==', studentUid)), 'targets');

      // 6. Delete Coaching Study Entries
      setDeletionProgress('Removing coaching study records...');
      await deleteQueryDocsInBatches(query(collection(db, 'coachingStudyEntries'), where('uid', '==', studentUid)), 'coachingStudyEntries');

      // 7. Delete Test records
      setDeletionProgress('Removing test submissions & test records...');
      await deleteQueryDocsInBatches(query(collection(db, 'studentTests'), where('studentId', '==', studentUid)), 'studentTests');

      // 8. Delete Quiz Attempts / Results
      setDeletionProgress('Removing quiz evaluation results...');
      await deleteQueryDocsInBatches(query(collection(db, 'quizAttempts'), where('studentId', '==', studentUid)), 'quizAttempts (studentId)');
      await deleteQueryDocsInBatches(query(collection(db, 'quizAttempts'), where('uid', '==', studentUid)), 'quizAttempts (uid)');

      // 9. Delete Syllabus / Chapter Progress
      setDeletionProgress('Removing syllabus & chapter completions...');
      await deleteQueryDocsInBatches(query(collection(db, 'chapterCompletions'), where('studentId', '==', studentUid)), 'chapterCompletions');

      // 10. Delete Writing Practice Submissions & Evaluations
      setDeletionProgress('Removing writing practice records...');
      await deleteQueryDocsInBatches(query(collection(db, 'writingPracticeSubmissions'), where('studentId', '==', studentUid)), 'writingPracticeSubmissions (studentId)');
      await deleteQueryDocsInBatches(query(collection(db, 'writingPracticeSubmissions'), where('uid', '==', studentUid)), 'writingPracticeSubmissions (uid)');
      await deleteQueryDocsInBatches(query(collection(db, 'writingPracticeEvaluations'), where('studentId', '==', studentUid)), 'writingPracticeEvaluations');

      // 11. Delete Weekly Missions Data
      setDeletionProgress('Removing weekly mission submissions & progress...');
      await deleteQueryDocsInBatches(query(collection(db, 'weeklyMissionSubmissions'), where('studentId', '==', studentUid)), 'weeklyMissionSubmissions');
      await deleteQueryDocsInBatches(query(collection(db, 'weeklyMissionProgress'), where('studentId', '==', studentUid)), 'weeklyMissionProgress');

      // 12. Delete Announcement Reads
      setDeletionProgress('Removing announcement read receipts...');
      await deleteQueryDocsInBatches(query(collection(db, 'announcementReads'), where('studentId', '==', studentUid)), 'announcementReads');

      // 13. Delete Academic Doubts
      setDeletionProgress('Removing academic doubts & queries...');
      await deleteQueryDocsInBatches(query(collection(db, 'doubts'), where('studentId', '==', studentUid)), 'doubts (studentId)');
      await deleteQueryDocsInBatches(query(collection(db, 'doubts'), where('uid', '==', studentUid)), 'doubts (uid)');

      // 14. Delete Feedbacks
      setDeletionProgress('Removing student feedback entries...');
      await deleteQueryDocsInBatches(query(collection(db, 'feedbacks'), where('studentId', '==', studentUid)), 'feedbacks (studentId)');
      await deleteQueryDocsInBatches(query(collection(db, 'feedbacks'), where('uid', '==', studentUid)), 'feedbacks (uid)');

      // 15. Delete Warnings & Device Alerts
      setDeletionProgress('Removing student warnings and device logs...');
      await deleteQueryDocsInBatches(query(collection(db, 'warnings'), where('studentId', '==', studentUid)), 'warnings (studentId)');
      await deleteQueryDocsInBatches(query(collection(db, 'warnings'), where('targetUid', '==', studentUid)), 'warnings (targetUid)');
      await deleteQueryDocsInBatches(query(collection(db, 'deviceAlerts'), where('userId', '==', studentUid)), 'deviceAlerts');

      // 16. Delete Day Offs records subcollection
      setDeletionProgress('Removing student day-offs records...');
      await deleteQueryDocsInBatches(collection(db, 'dayOffs', studentUid, 'records'), 'dayOffs/records');
      try {
        await deleteDoc(doc(db, 'dayOffs', studentUid));
      } catch (e) {
        /* Ignore */
      }

      // 17. Delete Level History subcollection
      setDeletionProgress('Removing level & badge history...');
      await deleteQueryDocsInBatches(collection(db, 'users', studentUid, 'levelHistory'), 'users/levelHistory');

      // 18. Store Deletion Tombstone in `deletedAccounts/{uid}` (Security safeguard)
      setDeletionProgress('Registering deleted account security block...');
      try {
        await setDoc(doc(db, 'deletedAccounts', studentUid), {
          uid: studentUid,
          email: selectedStudent.email || 'N/A',
          rollNumber: selectedStudent.rollNumber || 'N/A',
          name: selectedStudent.name || 'N/A',
          deletedAt: serverTimestamp(),
          deletedByAdmin: currentUser?.email || 'Admin',
          status: 'permanently_deleted'
        });
      } catch (e) {
        console.warn("Could not save tombstone:", e);
      }

      // 19. Record Audit Log
      try {
        const auditRef = doc(collection(db, 'auditLogs'));
        await setDoc(auditRef, {
          action: 'PERMANENT_STUDENT_DELETION',
          studentUid,
          studentName: selectedStudent.name || 'N/A',
          studentEmail: selectedStudent.email || 'N/A',
          studentRoll: selectedStudent.rollNumber || 'N/A',
          performedBy: currentUser?.email || 'Admin',
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.warn("Could not write audit log:", e);
      }

      // 20. Finally Delete the Core Profile Document: `users/{studentUid}`
      setDeletionProgress('Deleting user core profile document...');
      await deleteDoc(doc(db, 'users', studentUid));

      // Reset state and show success message
      setSuccessMessage("Student data has been permanently deleted successfully.");
      setSelectedStudent(null);
      setConfirmationInput('');
      setSearchTerm('');
      setDeletionProgress('');
    } catch (err) {
      console.error("Critical error during student deletion:", err);
      setErrorMessage(`Failed to complete deletion: ${err.message}. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-950/80 via-navy-900 to-red-950/80 border border-rose-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
              <UserX className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  Delete Student Database
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  Admin Only
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Permanently purge all website data, study sessions, points, target logs, and profile records for a specific student using their Gmail or Roll Number.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-5 rounded-3xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-between gap-4 shadow-glow-emerald animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-navy-950 flex items-center justify-center shrink-0 font-black">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Success!</h4>
              <p className="text-xs text-emerald-300 font-semibold mt-0.5">{successMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="p-1.5 rounded-xl hover:bg-emerald-500/20 text-emerald-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification Alert */}
      {errorMessage && (
        <div className="p-5 rounded-3xl bg-rose-500/20 border border-rose-500/50 text-rose-200 flex items-center justify-between gap-4 shadow-glow-rose animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />
            <p className="text-xs sm:text-sm font-bold">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="p-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: STUDENT SEARCH & MATCHING                      */}
      {/* ========================================================= */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl border border-white/10 shadow-xl space-y-5">
        
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-rose-400" />
            <span>Identify Student</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Search for the student by their registered Gmail address or unique Roll Number.
          </p>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter Student Gmail or Roll Number"
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-navy-950 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-medium transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-3.5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Display */}
        {searchTerm.trim().length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span>Matching Students ({searchResults.length})</span>
              <span>Select student to review deletion details</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-6 rounded-2xl bg-navy-950/60 border border-white/5 text-center text-xs text-slate-400">
                No registered student matches <strong className="text-white">"{searchTerm}"</strong>. Check the spelling or roll number.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {searchResults.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                  const isSuspended = student.banned;
                  const isAdmin = student.role === 'admin';

                  return (
                    <div
                      key={student.id}
                      onClick={() => !isAdmin && handleSelectStudent(student)}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                        isAdmin
                          ? 'bg-navy-950/40 border-white/5 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-rose-500/20 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-1 ring-rose-500'
                          : 'bg-navy-950/80 border-white/10 hover:border-rose-500/50 hover:bg-navy-900 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          isAdmin 
                            ? 'bg-gold-500/20 text-gold-400' 
                            : 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white'
                        }`}>
                          {(student.name || 'S').charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm truncate">{student.name || 'Unnamed Student'}</span>
                            {isAdmin && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-gold-500/20 text-gold-400 border border-gold-500/30">
                                ADMIN
                              </span>
                            )}
                            {isSuspended && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                BANNED
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-slate-400 truncate">{student.email}</div>
                          
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className="font-mono font-bold text-gold-400">
                              {student.rollNumber || 'No Roll'}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-indigo-300 font-semibold truncate">
                              {student.course || 'CA'} • {student.level || 'Foundation'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAdmin}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) handleSelectStudent(student);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                          isAdmin
                            ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                            : isSelected
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* SECTION 2: CONFIRMATION & PERMANENT DELETION WORKSPACE    */}
      {/* ========================================================= */}
      {selectedStudent && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-rose-500/40 bg-gradient-to-b from-[#190c17] via-navy-950 to-navy-900 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          
          {/* Header Warning Title */}
          <div className="flex items-start justify-between gap-4 border-b border-rose-500/20 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Step 2: Review Student & Confirm Deletion
                </h3>
                <p className="text-xs text-rose-300 font-semibold mt-0.5">
                  Permanent Destructive Action • Irreversible
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Cancel Selection"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Explicit Warning Callout */}
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs sm:text-sm font-bold flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              “Warning: This action will permanently delete this student's saved website data. This action cannot be undone.”
            </p>
          </div>

          {/* Student Detailed Identification Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5 rounded-2xl bg-navy-950/80 border border-white/10 text-xs">
            
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Name</span>
              <span className="text-sm font-black text-white block">{selectedStudent.name || 'N/A'}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gmail / Email</span>
              <span className="text-sm font-black text-indigo-300 block truncate">{selectedStudent.email || 'N/A'}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Roll Number</span>
              <span className="text-sm font-mono font-black text-gold-400 block">{selectedStudent.rollNumber || 'N/A'}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Course / Stream</span>
              <span className="text-xs font-bold text-white block">
                {selectedStudent.course || 'CA'} • {selectedStudent.level || 'Foundation'} {selectedStudent.attempt ? `(${selectedStudent.attempt})` : ''}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Status</span>
              <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                selectedStudent.banned ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {selectedStudent.banned ? '⛔ Suspended / Banned' : '✅ Active Student'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique User ID (UID)</span>
              <span className="text-[11px] font-mono text-slate-400 block truncate" title={selectedStudent.id}>
                {selectedStudent.id}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Study Hours Logged</span>
              <span className="text-xs font-bold text-white block">
                {Number(selectedStudent.studyHours || 0).toFixed(1)} hrs
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Points Earned</span>
              <span className="text-xs font-black text-gold-400 block">
                {selectedStudent.points || 0} PTS
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Heard About Us</span>
              <span className="text-xs font-bold text-purple-300 block">
                {selectedStudent.referralSource || 'Not Specified'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Joined Date</span>
              <span className="text-xs font-medium text-slate-300 block">
                {selectedStudent.createdAt ? formatDate(selectedStudent.createdAt) : 'N/A'}
              </span>
            </div>

          </div>

          {/* Scope of Deletion Checklist */}
          <div className="space-y-2 text-xs text-slate-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              The following database records linked to UID ({selectedStudent.id}) will be completely erased:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> User profile & credentials
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Study timer sessions & history
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Daily stats & streak records
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Points ledger & transactions
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Daily subject targets
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Coaching study logs
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Test papers & scores
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Quiz attempts & evaluations
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Syllabus chapter completions
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Writing practice submissions
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Weekly mission data
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-rose-400">•</span> Day offs, doubts & feedbacks
              </div>
            </div>
          </div>

          {/* Safety Word Input */}
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
            <label className="text-xs font-bold text-white block">
              To confirm, type <strong className="text-rose-400 underline underline-offset-2">DELETE</strong> in the box below:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              disabled={isDeleting}
              className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-rose-500/40 text-white text-sm font-bold tracking-wider focus:outline-none focus:border-rose-400 placeholder:text-slate-600"
            />
          </div>

          {/* Deletion Progress Indicator */}
          {isDeleting && (
            <div className="p-4 rounded-2xl bg-navy-950 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300 font-bold animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
              <span>{deletionProgress || 'Deleting student database...'}</span>
            </div>
          )}

          {/* Final Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setSelectedStudent(null);
                setConfirmationInput('');
              }}
              className="w-full sm:w-1/3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={confirmationInput.trim() !== 'DELETE' || isDeleting}
              onClick={handlePermanentDeletion}
              className={`w-full sm:w-2/3 py-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
                confirmationInput.trim() === 'DELETE' && !isDeleting
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-glow-rose cursor-pointer animate-pulse'
                  : 'bg-navy-950 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting Student Database...' : 'Permanently Delete Student'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
