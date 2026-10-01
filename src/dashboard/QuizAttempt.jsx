import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Clock, CheckCircle, AlertTriangle, ArrowLeft, Send, Award, HelpCircle, XCircle } from 'lucide-react';
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
           const startMs = data.startTime.toMillis ? data.startTime.toMillis() : new Date(data.startTime).getTime();
           const limitMs = (data.timeLimit || 30) * 60 * 1000;
           const expiryMs = startMs + limitMs;
           
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
         handleAutoSubmit(currentAttempt, docRef, answersRef.current);
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
       // Calculate score with question-wise positive marks and negative marks
       let totalScore = 0;
       let maxMarks = 0;
       let correctCount = 0;
       let wrongCount = 0;
       let unattemptedCount = 0;
       let totalNegativeDeduction = 0;

       (quiz.questions || []).forEach((q) => {
          const qMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
          const qNeg = q.negativeMarks !== undefined && q.negativeMarks !== null ? Math.max(0, Number(q.negativeMarks)) : 0;
          maxMarks += qMarks;

          const ans = finalAnswers[q.id];
          const isAnswered = ans !== undefined && ans !== null && ans !== '';

          if (!isAnswered) {
             // Unanswered: 0 marks, NO negative deduction
             unattemptedCount++;
          } else if (Number(ans) === Number(q.correctOption)) {
             // Correct answer
             totalScore += qMarks;
             correctCount++;
          } else {
             // Incorrect answer: deduct negative marks
             totalScore -= qNeg;
             totalNegativeDeduction += qNeg;
             wrongCount++;
          }
       });

       const finalScore = Number(totalScore.toFixed(2));
       const formattedMaxMarks = Number(maxMarks.toFixed(2));
       const formattedNegativeDeduction = Number(totalNegativeDeduction.toFixed(2));

       const payload = {
          status: finalStatus,
          submissionTime: serverTimestamp(),
          answers: finalAnswers,
          score: finalScore,
          totalMarks: formattedMaxMarks,
          correctCount,
          wrongCount,
          unattemptedCount,
          negativeDeduction: formattedNegativeDeduction
       };

       await updateDoc(docRef, payload);
       
       // Update local state to show result immediately
       setAttempt(prev => ({ 
         ...prev, 
         ...payload, 
         submissionTime: { toMillis: () => Date.now() } 
       }));
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
    
    // Auto-save answers to avoid loss on accidental refresh
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

  // Compute breakdown for display (handles legacy attempts gracefully)
  let displayCorrect = attempt.correctCount;
  let displayWrong = attempt.wrongCount;
  let displayUnattempted = attempt.unattemptedCount;
  let displayNegativeDeduction = attempt.negativeDeduction;
  let maxPossibleMarks = attempt.totalMarks;

  if (displayCorrect === undefined || displayWrong === undefined || maxPossibleMarks === undefined) {
    let c = 0, w = 0, u = 0, neg = 0, maxM = 0;
    (quiz?.questions || []).forEach(q => {
      const qMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
      const qNeg = q.negativeMarks !== undefined && q.negativeMarks !== null ? Math.max(0, Number(q.negativeMarks)) : 0;
      maxM += qMarks;

      const ans = (attempt.answers || answers)[q.id];
      if (ans === undefined || ans === null || ans === '') {
        u++;
      } else if (Number(ans) === Number(q.correctOption)) {
        c++;
      } else {
        w++;
        neg += qNeg;
      }
    });
    displayCorrect = c;
    displayWrong = w;
    displayUnattempted = u;
    displayNegativeDeduction = Number(neg.toFixed(2));
    maxPossibleMarks = Number(maxM.toFixed(2));
  }

  const answeredCount = (quiz.questions || []).filter(q => answers[q.id] !== undefined && answers[q.id] !== null).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Quiz Header - Sticky */}
      <div className="sticky top-20 z-40 p-4 sm:p-6 rounded-3xl glass-card border border-white/10 flex flex-wrap gap-4 items-center justify-between shadow-xl backdrop-blur-xl">
         <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors cursor-pointer"
              title="Return to quizzes"
            >
               <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div>
               <h2 className="text-xl sm:text-2xl font-black text-white">{quiz.title}</h2>
               <div className="text-xs font-semibold text-slate-400 mt-0.5">
                 {quiz.subject} {quiz.chapter && `• ${quiz.chapter}`}
               </div>
            </div>
         </div>

         {!isFinished ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Answered</span>
                <span className="text-xs font-black text-emerald-400">{answeredCount} of {quiz.questions?.length || 0}</span>
              </div>
              <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border ${remainingSeconds < 60 ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : 'bg-navy-900/90 border-white/10 text-emerald-400'}`}>
                 <Clock className="w-5 h-5" />
                 <span className="text-xl font-mono font-black tracking-widest">{formatTime(remainingSeconds)}</span>
              </div>
            </div>
         ) : (
            <div className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 font-black text-sm">
               <CheckCircle className="w-4 h-4 text-emerald-400" />
               <span>Quiz Completed</span>
            </div>
         )}
      </div>

      {/* Result Card with Negative Marking Breakdown */}
      {isFinished && (
         <div className="p-6 sm:p-8 rounded-3xl bg-navy-900/90 border border-emerald-500/30 space-y-6 shadow-2xl">
            <div className="text-center space-y-1">
               <h3 className="text-2xl sm:text-3xl font-black text-white">Quiz Evaluation & Analysis</h3>
               <p className="text-slate-400 text-xs font-semibold">
                  {attempt.status === 'auto_submitted' ? 'Time expired. Automatically submitted.' : 'Test completed and submitted.'}
               </p>
            </div>

            {/* Big Score Box */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="p-5 rounded-2xl bg-navy-950/80 border border-white/10 text-center min-w-[200px]">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Final Score
                </span>
                <div className="text-4xl sm:text-5xl font-mono font-black text-emerald-400">
                   {attempt.score !== undefined ? attempt.score : 0} 
                   <span className="text-xl text-slate-500 font-normal"> / {maxPossibleMarks || (quiz.questions?.length || 0)}</span>
                </div>
              </div>
            </div>

            {/* Detailed Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Correct</span>
                <div className="text-2xl font-black text-emerald-300 mt-0.5">{displayCorrect}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">Incorrect</span>
                <div className="text-2xl font-black text-red-300 mt-0.5">{displayWrong}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Negative Marks</span>
                <div className="text-2xl font-black text-rose-300 mt-0.5">
                  {displayNegativeDeduction > 0 ? `-${displayNegativeDeduction}` : '0'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Unanswered</span>
                <div className="text-2xl font-black text-amber-300 mt-0.5">{displayUnattempted}</div>
              </div>
            </div>

            {/* Note on Scoring */}
            <p className="text-center text-xs text-slate-400 italic">
              * Negative marks were deducted solely for incorrect answers. Unanswered questions did not receive any penalty.
            </p>
         </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
         {(quiz.questions || []).map((q, qIdx) => {
            const selectedOpt = answers[q.id];
            const isAnswered = selectedOpt !== undefined && selectedOpt !== null && selectedOpt !== '';
            const isCorrect = isFinished && isAnswered && Number(selectedOpt) === Number(q.correctOption);
            const isWrong = isFinished && isAnswered && Number(selectedOpt) !== Number(q.correctOption);
            const missed = isFinished && !isAnswered;

            const qMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
            const qNeg = q.negativeMarks !== undefined && q.negativeMarks !== null ? Math.max(0, Number(q.negativeMarks)) : 0;

            let borderClass = "border-white/10";
            if (isFinished) {
               if (isCorrect) borderClass = "border-emerald-500/50 bg-emerald-500/5";
               else if (isWrong) borderClass = "border-red-500/50 bg-red-500/5";
               else if (missed) borderClass = "border-amber-500/30 bg-amber-500/5";
            }

            return (
               <div key={q.id} className={`p-6 sm:p-7 rounded-3xl glass-card border ${borderClass} space-y-5 transition-colors shadow-lg`}>
                  
                  {/* Question Header: Number, Marks, Negative Tag */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-royal-500/20 text-royal-400 flex items-center justify-center font-black text-sm shrink-0">
                           {qIdx + 1}
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                           Question {qIdx + 1}
                        </span>
                     </div>

                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-navy-950/80 border border-white/10 text-emerald-400">
                           +{qMarks} Marks
                        </span>

                        {qNeg > 0 ? (
                           <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                              Negative: -{qNeg}
                           </span>
                        ) : (
                           <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-400 border border-white/5">
                              No Negative Marking
                           </span>
                        )}
                     </div>
                  </div>

                  {/* Question Text */}
                  <div className="pl-1 sm:pl-2">
                     <h3 className="text-base sm:text-lg font-bold text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {q.text}
                     </h3>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pl-1 sm:pl-2">
                     {[0, 1, 2, 3].map((optIdx) => {
                        const isSelected = Number(selectedOpt) === optIdx;
                        const isActualCorrect = isFinished && Number(q.correctOption) === optIdx;
                        
                        let optClass = "border-white/10 hover:border-white/30 bg-navy-900/50 text-slate-200";
                        if (isSelected && !isFinished) {
                          optClass = "border-royal-500 bg-royal-500/20 shadow-glow-royal text-white";
                        }
                        
                        if (isFinished) {
                           if (isActualCorrect) {
                              optClass = "border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40";
                           } else if (isSelected && !isActualCorrect) {
                              optClass = "border-red-500 bg-red-500/20 text-red-300 ring-1 ring-red-500/40";
                           } else {
                              optClass = "border-white/5 bg-navy-900/30 opacity-50 text-slate-400";
                           }
                        }

                        return (
                           <button
                              key={optIdx}
                              onClick={() => handleSelectOption(q.id, optIdx)}
                              disabled={isFinished || submitting}
                              className={`p-4 rounded-2xl border flex items-start gap-3.5 text-left transition-all ${optClass} ${!isFinished && !submitting ? 'cursor-pointer hover:bg-navy-900/80' : 'cursor-default'}`}
                           >
                              <div className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected 
                                  ? 'border-royal-400 bg-royal-400 text-navy-950' 
                                  : isActualCorrect
                                    ? 'border-emerald-400 bg-emerald-400 text-navy-950'
                                    : 'border-slate-500'
                              }`}>
                                 {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                              </div>
                              <div className="flex-grow">
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                   Option {String.fromCharCode(65 + optIdx)}
                                 </span>
                                 <span className="text-sm font-semibold">{q.options[optIdx]}</span>
                              </div>
                           </button>
                        );
                     })}
                  </div>
                  
                  {/* Detailed Feedback row when quiz is completed */}
                  {isFinished && (
                     <div className="pl-1 sm:pl-2 pt-2 border-t border-white/5">
                        {isCorrect && (
                           <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0"/> 
                              <span>Correct Answer (+{qMarks} marks awarded)</span>
                           </div>
                        )}
                        {isWrong && (
                           <div className="text-xs font-bold text-red-400 flex items-center gap-2 flex-wrap">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0"/> 
                              <span>
                                 Incorrect Answer {qNeg > 0 ? `(-${qNeg} negative marks deducted)` : '(0 marks)'}. 
                                 Correct option was <strong>Option {String.fromCharCode(65 + Number(q.correctOption))}</strong>.
                              </span>
                           </div>
                        )}
                        {missed && (
                           <div className="text-xs font-bold text-amber-400 flex items-center gap-2 flex-wrap">
                              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0"/> 
                              <span>
                                 Not Attempted (0 marks, no negative deduction). 
                                 Correct option was <strong>Option {String.fromCharCode(65 + Number(q.correctOption))}</strong>.
                              </span>
                           </div>
                        )}
                     </div>
                  )}

               </div>
            );
         })}
      </div>

      {/* Footer Submit Button */}
      {!isFinished && (
         <div className="pt-6 pb-12 flex justify-center">
            <button
               onClick={() => setShowConfirm(true)}
               disabled={submitting}
               className="px-10 py-4 rounded-2xl bg-royal-600 hover:bg-royal-500 text-white font-black text-lg transition-all shadow-glow-royal flex items-center gap-3 disabled:opacity-50 cursor-pointer hover:scale-[1.02]"
            >
               <Send className="w-5 h-5" />
               <span>{submitting ? 'Submitting Test...' : 'Submit Test'}</span>
            </button>
         </div>
      )}

      {/* Submission Confirmation Modal */}
      {showConfirm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 max-w-md w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
               <div className="w-16 h-16 mx-auto rounded-2xl bg-royal-500/20 text-royal-400 flex items-center justify-center shadow-glow-royal">
                  <AlertTriangle className="w-8 h-8" />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Submit Your Test?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                     You have answered <strong className="text-emerald-400 font-bold">{answeredCount}</strong> of <strong className="text-white font-bold">{quiz.questions?.length || 0}</strong> questions.
                     Once submitted, negative marking will be applied to any incorrect answers. Unanswered questions will not receive negative marks.
                  </p>
               </div>
               <div className="flex gap-3">
                  <button 
                     onClick={() => setShowConfirm(false)} 
                     className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-colors cursor-pointer"
                  >
                     Keep Solving
                  </button>
                  <button 
                     onClick={handleManualSubmit} 
                     disabled={submitting} 
                     className="w-full py-3 rounded-xl bg-royal-600 hover:bg-royal-500 text-white text-sm font-black transition-colors disabled:opacity-50 shadow-glow-royal cursor-pointer"
                  >
                     {submitting ? 'Submitting...' : 'Yes, Submit Test'}
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
