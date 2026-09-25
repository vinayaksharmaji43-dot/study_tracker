import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Clock, CheckCircle, AlertTriangle, ArrowLeft, Send } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function QuizAttempt({ quiz, attemptId, onClose }) {
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    fetchAttempt();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchAttempt = async () => {
    try {
      const docRef = doc(db, 'quizAttempts', attemptId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setAttempt(data);
        setAnswers(data.answers || {});
        
        // Calculate remaining time based on server start time
        if (data.status === 'in_progress' && data.startTime) {
           const startMs = data.startTime.toMillis();
           const limitMs = data.timeLimit * 60 * 1000;
           const expiryMs = startMs + limitMs;
           
           // We need to calculate how much time is left relative to current actual time
           // For robust implementation, we'd ideally get server time offset, but Date.now() is close enough for client side display
           // However, if the time is already passed, submit it.
           const now = Date.now();
           const leftMs = expiryMs - now;
           
           if (leftMs <= 0) {
             handleAutoSubmit(data, docRef, data.answers || {});
           } else {
             setRemainingSeconds(Math.floor(leftMs / 1000));
             startTimer(expiryMs, data, docRef);
           }
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load quiz attempt.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (expiryMs, currentAttempt, docRef) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
       const now = Date.now();
       const leftMs = expiryMs - now;
       
       if (leftMs <= 0) {
         clearInterval(timerRef.current);
         setRemainingSeconds(0);
         // Grab latest answers from state ref ideally, but we will pass the answers we have
         handleAutoSubmit(currentAttempt, docRef, answers);
       } else {
         setRemainingSeconds(Math.floor(leftMs / 1000));
       }
    }, 1000);
  };

  // Keep ref to answers so timer auto-submit uses latest answers
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const handleAutoSubmit = async (att, docRef, finalAnswers = answersRef.current) => {
    if (att.status !== 'in_progress') return;
    await performSubmit(att, docRef, finalAnswers, 'auto_submitted');
  };

  const handleManualSubmit = async () => {
    if (attempt.status !== 'in_progress') return;
    const docRef = doc(db, 'quizAttempts', attemptId);
    await performSubmit(attempt, docRef, answers, 'submitted');
  };

  const performSubmit = async (att, docRef, finalAnswers, finalStatus) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
       // Calculate score
       let score = 0;
       quiz.questions.forEach((q, idx) => {
          if (finalAnswers[q.id] === q.correctOption) {
             score++;
          }
       });

       const payload = {
          status: finalStatus,
          submissionTime: serverTimestamp(),
          answers: finalAnswers,
          score
       };

       await updateDoc(docRef, payload);
       
       // Update local state to show result immediately
       setAttempt(prev => ({ ...prev, ...payload, submissionTime: { toMillis: () => Date.now() } }));
       setShowConfirm(false);
    } catch (err) {
       console.error("Submit error", err);
       alert("Failed to submit quiz. Please try again.");
    } finally {
       setSubmitting(false);
    }
  };

  const handleSelectOption = async (qId, optIdx) => {
    if (attempt?.status !== 'in_progress' || submitting) return;
    
    const newAnswers = { ...answers, [qId]: optIdx };
    setAnswers(newAnswers);
    
    // Optionally auto-save answers to avoid loss on refresh
    try {
      const docRef = doc(db, 'quizAttempts', attemptId);
      await updateDoc(docRef, { answers: newAnswers });
    } catch (e) {
      console.warn("Failed to auto-save answer", e);
    }
  };

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return "--:--";
    if (secs <= 0) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <LoadingSpinner />;
  if (!attempt) return null;

  const isFinished = attempt.status !== 'in_progress';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Quiz Header - Sticky */}
      <div className="sticky top-20 z-40 p-4 sm:p-6 rounded-3xl glass-card border border-white/10 flex flex-wrap gap-4 items-center justify-between shadow-xl backdrop-blur-xl">
         <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
               <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div>
               <h2 className="text-xl font-bold text-white">{quiz.title}</h2>
               <div className="text-xs font-semibold text-slate-400 mt-1">{quiz.subject} {quiz.chapter && `- ${quiz.chapter}`}</div>
            </div>
         </div>

         {!isFinished ? (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${remainingSeconds < 60 ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : 'bg-navy-900/80 border-white/10 text-emerald-400'}`}>
               <Clock className="w-5 h-5" />
               <span className="text-xl font-mono font-black tracking-widest">{formatTime(remainingSeconds)}</span>
            </div>
         ) : (
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 font-bold">
               <CheckCircle className="w-5 h-5" />
               Quiz Completed
            </div>
         )}
      </div>

      {/* Result Card */}
      {isFinished && (
         <div className="p-8 rounded-3xl bg-navy-900 border border-emerald-500/30 text-center space-y-4">
            <h3 className="text-2xl font-black text-white">Your Score</h3>
            <div className="text-5xl font-mono font-black text-emerald-400">
               {attempt.score} <span className="text-2xl text-slate-500">/ {quiz.questions.length}</span>
            </div>
            <p className="text-slate-400 text-sm font-semibold">
               {attempt.status === 'auto_submitted' ? 'Time expired. Automatically submitted.' : 'Successfully submitted.'}
            </p>
         </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
         {quiz.questions.map((q, qIdx) => {
            const selectedOpt = answers[q.id];
            const isCorrect = isFinished && selectedOpt === q.correctOption;
            const isWrong = isFinished && selectedOpt !== undefined && selectedOpt !== q.correctOption;
            const missed = isFinished && selectedOpt === undefined;

            let borderClass = "border-white/10";
            if (isFinished) {
               if (isCorrect) borderClass = "border-emerald-500/50 bg-emerald-500/5";
               else if (isWrong) borderClass = "border-red-500/50 bg-red-500/5";
               else if (missed) borderClass = "border-amber-500/50 bg-amber-500/5";
            }

            return (
               <div key={q.id} className={`p-6 rounded-3xl glass-card border ${borderClass} space-y-6 transition-colors`}>
                  <div className="flex gap-4">
                     <div className="w-8 h-8 rounded-full bg-royal-500/20 text-royal-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {qIdx + 1}
                     </div>
                     <h3 className="text-base font-bold text-slate-200 mt-1 whitespace-pre-wrap">{q.text}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-12">
                     {[0, 1, 2, 3].map((optIdx) => {
                        const isSelected = selectedOpt === optIdx;
                        const isActualCorrect = isFinished && q.correctOption === optIdx;
                        
                        let optClass = "border-white/10 hover:border-white/30 bg-navy-900/50";
                        if (isSelected && !isFinished) optClass = "border-royal-500 bg-royal-500/20 shadow-glow-royal";
                        
                        if (isFinished) {
                           if (isActualCorrect) {
                              optClass = "border-emerald-500 bg-emerald-500/20 text-emerald-300"; // Highlight correct
                           } else if (isSelected && !isActualCorrect) {
                              optClass = "border-red-500 bg-red-500/20 text-red-300"; // Highlight wrong choice
                           } else {
                              optClass = "border-white/5 bg-navy-900/30 opacity-50";
                           }
                        }

                        return (
                           <button
                              key={optIdx}
                              onClick={() => handleSelectOption(q.id, optIdx)}
                              disabled={isFinished || submitting}
                              className={`p-4 rounded-xl border flex items-start gap-3 text-left transition-all ${optClass} ${!isFinished && !submitting ? 'cursor-pointer' : 'cursor-default'}`}
                           >
                              <div className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-royal-400 bg-royal-400 text-navy-950' : 'border-slate-500'}`}>
                                 {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                              </div>
                              <span className="text-sm font-semibold">{q.options[optIdx]}</span>
                           </button>
                        );
                     })}
                  </div>
                  
                  {/* Feedback for finished state */}
                  {isFinished && (
                     <div className="pl-12 pt-2">
                        {isCorrect && <div className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Correct Answer</div>}
                        {isWrong && <div className="text-xs font-bold text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Incorrect Answer. Correct option was {String.fromCharCode(65 + q.correctOption)}</div>}
                        {missed && <div className="text-xs font-bold text-amber-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Not Attempted. Correct option was {String.fromCharCode(65 + q.correctOption)}</div>}
                     </div>
                  )}
               </div>
            );
         })}
      </div>

      {/* Footer Submit Button */}
      {!isFinished && (
         <div className="pt-8 pb-12 flex justify-center">
            <button
               onClick={() => setShowConfirm(true)}
               disabled={submitting}
               className="px-8 py-4 rounded-2xl bg-royal-600 hover:bg-royal-500 text-white font-black text-lg transition-all shadow-glow-royal flex items-center gap-3 disabled:opacity-50"
            >
               {submitting ? 'Submitting...' : 'Submit Quiz'}
               <Send className="w-5 h-5" />
            </button>
         </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
            <div className="glass-card p-8 rounded-3xl border border-white/10 max-w-md w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
               <div className="w-16 h-16 mx-auto rounded-full bg-royal-500/20 text-royal-400 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-white mb-2">Submit Quiz?</h3>
                  <p className="text-sm text-slate-300">
                     Are you sure you want to submit this quiz? You won't be able to change your answers after submission.
                  </p>
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setShowConfirm(false)} className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 transition-colors">
                     Cancel
                  </button>
                  <button onClick={handleManualSubmit} disabled={submitting} className="w-full py-3 rounded-xl bg-royal-600 hover:bg-royal-500 text-white text-sm font-black transition-colors disabled:opacity-50 shadow-glow-royal">
                     {submitting ? 'Submitting...' : 'Yes, Submit'}
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
