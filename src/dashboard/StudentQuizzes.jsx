import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  BrainCircuit, 
  Clock, 
  Layers, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Crown, 
  Sparkles, 
  Search, 
  BookOpen, 
  Award, 
  Check, 
  X, 
  ExternalLink, 
  Headphones, 
  Mail, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import QuizAttempt from './QuizAttempt';

export default function StudentQuizzes({ setActiveTab }) {
  const { currentUser, userProfile } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeQuizId, setActiveQuizId] = useState(null);

  // Tabs: 'free' | 'paid'
  const [quizTypeTab, setQuizTypeTab] = useState('free');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Modal for Unauthorized Paid Quiz
  const [paywallQuiz, setPaywallQuiz] = useState(null);

  // Check if current student has access to Paid quizzes
  const hasPaidAccess = Boolean(
    userProfile?.role === 'admin' ||
    userProfile?.paidQuizAccess === true ||
    userProfile?.isPaid === true ||
    userProfile?.isPro === true ||
    userProfile?.plan === 'paid'
  );

  // Real-time listener for Quizzes created/updated/deleted from Admin Panel
  useEffect(() => {
    const qQuery = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribeQuizzes = onSnapshot(qQuery, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter out explicitly deactivated quizzes
      data = data.filter(q => q.active !== false);
      setQuizzes(data);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to quizzes:", err);
      setLoading(false);
    });

    return () => unsubscribeQuizzes();
  }, []);

  // Real-time listener for current user's quiz attempts
  useEffect(() => {
    if (!currentUser?.uid) return;

    const attemptsQuery = query(
      collection(db, 'quizAttempts'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribeAttempts = onSnapshot(attemptsQuery, (snap) => {
      const userAttempts = {};
      snap.docs.forEach(d => {
        const att = d.data();
        userAttempts[att.quizId] = { id: d.id, ...att };
      });
      setAttempts(userAttempts);
    }, (err) => {
      // Fallback if composite index isn't created: fetch all attempts and filter in memory
      console.warn("Attempts query index notice, falling back to local filter:", err);
      fetchAttemptsFallback();
    });

    return () => unsubscribeAttempts();
  }, [currentUser]);

  const fetchAttemptsFallback = async () => {
    try {
      const snap = await getDocs(collection(db, 'quizAttempts'));
      const userAttempts = {};
      snap.docs.forEach(d => {
        const att = d.data();
        if (att.userId === currentUser.uid) {
          userAttempts[att.quizId] = { id: d.id, ...att };
        }
      });
      setAttempts(userAttempts);
    } catch (e) {
      console.error("Failed to fetch fallback attempts:", e);
    }
  };

  const handleStartQuiz = async (quiz) => {
    // If paid quiz and user is not authorized, trigger payment/unlock modal
    const isQuizPaid = Boolean(quiz.isPaid || quiz.accessType === 'paid');
    if (isQuizPaid && !hasPaidAccess) {
      setPaywallQuiz(quiz);
      return;
    }

    try {
      const existingAttempt = attempts[quiz.id];
      if (existingAttempt) {
        if (existingAttempt.status === 'in_progress') {
          setActiveQuizId(quiz.id);
          return;
        } else {
          alert('You have already completed this quiz.');
          return;
        }
      }

      // Create new attempt
      const attemptRef = doc(collection(db, 'quizAttempts'));
      const payload = {
        quizId: quiz.id,
        userId: currentUser.uid,
        startTime: serverTimestamp(),
        timeLimit: quiz.timeLimit || 30,
        status: 'in_progress',
        answers: {},
        score: 0
      };
      await setDoc(attemptRef, payload);

      setAttempts(prev => ({
        ...prev,
        [quiz.id]: {
          id: attemptRef.id,
          ...payload,
          startTime: { toMillis: () => Date.now() }
        }
      }));
      setActiveQuizId(quiz.id);
    } catch (err) {
      console.error(err);
      alert('Failed to start quiz. Please try again.');
    }
  };

  const handleQuizClose = () => {
    setActiveQuizId(null);
  };

  if (loading) return <LoadingSpinner />;

  if (activeQuizId) {
    const quiz = quizzes.find(q => q.id === activeQuizId);
    const attempt = attempts[activeQuizId];
    return <QuizAttempt quiz={quiz} attemptId={attempt?.id} onClose={handleQuizClose} />;
  }

  // Filter quizzes by Free vs Paid
  const freeQuizzes = quizzes.filter(q => !q.isPaid && q.accessType !== 'paid');
  const paidQuizzes = quizzes.filter(q => q.isPaid || q.accessType === 'paid');

  const currentList = quizTypeTab === 'free' ? freeQuizzes : paidQuizzes;

  // Extract unique subjects for filtering
  const subjects = ['all', ...new Set(quizzes.map(q => q.subject).filter(Boolean))];

  // Apply search & subject filter
  const filteredQuizzes = currentList.filter(q => {
    const matchesSearch = 
      (q.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.chapter || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = selectedSubject === 'all' || q.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Calculate statistics for header cards
  const completedCount = Object.values(attempts).filter(
    a => a.status === 'submitted' || a.status === 'auto_submitted'
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
              <BrainCircuit className="w-4 h-4 text-royal-400" />
              <span>Interactive Evaluation Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Quiz Test Series
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Sharpen your speed, accuracy, and syllabus retention with real-time timed test papers.
              Select from Free Chapter Tests or Exclusive Paid Test Series.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-navy-900/80 border border-white/10 text-center">
              <div className="text-xs font-semibold text-slate-400">Free Quizzes</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">{freeQuizzes.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-navy-900/80 border border-white/10 text-center">
              <div className="text-xs font-semibold text-slate-400">Paid Quizzes</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">{paidQuizzes.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-navy-900/80 border border-white/10 text-center">
              <div className="text-xs font-semibold text-slate-400">Completed</div>
              <div className="text-xl font-black text-royal-400 mt-0.5">{completedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs (Free Quiz vs Paid Quiz) & Filter Toolbar */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl border border-white/10 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Main 2 Tabs: Free Quiz vs Paid Quiz */}
          <div className="flex items-center p-1.5 bg-navy-900/90 rounded-2xl border border-white/10 max-w-md w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setQuizTypeTab('free')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all duration-200 ${
                quizTypeTab === 'free'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-glow-emerald scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Free Quiz</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                quizTypeTab === 'free' ? 'bg-navy-950/50 text-white' : 'bg-white/10 text-slate-400'
              }`}>
                {freeQuizzes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuizTypeTab('paid')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all duration-200 ${
                quizTypeTab === 'paid'
                  ? 'bg-gradient-to-r from-amber-500 to-gold-500 text-navy-950 shadow-glow-gold scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-900" />
              <span>Paid Quiz</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                quizTypeTab === 'paid' ? 'bg-navy-950/20 text-navy-950' : 'bg-white/10 text-slate-400'
              }`}>
                {paidQuizzes.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-grow sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search quiz, subject, chapter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-royal-500/50 transition-all font-medium"
            />
          </div>
        </div>

        {/* Subject Filter Pills */}
        {subjects.length > 2 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Subject:</span>
            {subjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 capitalize ${
                  selectedSubject === sub
                    ? 'bg-royal-600 text-white border border-royal-400/40 shadow-glow-blue'
                    : 'bg-navy-900/50 text-slate-400 hover:text-white border border-white/5 hover:border-white/20'
                }`}
              >
                {sub === 'all' ? 'All Subjects' : sub}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Quiz Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.map((q) => {
          const attempt = attempts[q.id];
          const isCompleted = attempt && (attempt.status === 'submitted' || attempt.status === 'auto_submitted');
          const isInProgress = attempt && attempt.status === 'in_progress';
          const isPaid = Boolean(q.isPaid || q.accessType === 'paid');
          const isLockedForStudent = isPaid && !hasPaidAccess;

          return (
            <div 
              key={q.id} 
              className={`glass-card p-6 rounded-3xl border flex flex-col h-full transition-all duration-300 relative group overflow-hidden ${
                isPaid 
                  ? 'border-amber-500/30 hover:border-amber-400/60 bg-gradient-to-b from-amber-500/[0.04] to-transparent' 
                  : 'border-white/10 hover:border-royal-500/40 bg-navy-900/40'
              } ${isCompleted ? 'border-emerald-500/30' : ''}`}
            >
              {/* Subtle Ambient Card Glow */}
              {isPaid && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-colors" />
              )}

              <div className="flex-grow space-y-4 relative z-10">
                
                {/* Badge Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-gold-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5 shadow-glow-gold">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>Paid Quiz</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>Free Quiz</span>
                      </span>
                    )}

                    {isLockedForStudent && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-rose-400" />
                        <span>Locked</span>
                      </span>
                    )}

                    {isPaid && hasPaidAccess && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Unlocked</span>
                      </span>
                    )}
                  </div>

                  {isCompleted && (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </div>
                  )}

                  {isInProgress && (
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>In Progress</span>
                    </div>
                  )}
                </div>

                {/* Quiz Title */}
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-royal-300 transition-colors line-clamp-2">
                    {q.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                    <BookOpen className="w-3.5 h-3.5 text-royal-400 shrink-0" />
                    <span className="truncate">{q.subject} {q.chapter && `• ${q.chapter}`}</span>
                  </div>
                </div>

                {/* Metrics Pill Strip */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-navy-950/60 border border-white/5 px-2.5 py-1.5 rounded-xl">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{q.timeLimit || 30} Mins</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-navy-950/60 border border-white/5 px-2.5 py-1.5 rounded-xl">
                    <Layers className="w-3.5 h-3.5 text-royal-400" />
                    <span>{q.questions?.length || 0} Questions</span>
                  </div>
                </div>

                {/* Completed Score Strip */}
                {isCompleted && attempt.score !== undefined && (
                  <div className="mt-3 p-3 rounded-2xl bg-navy-950/80 border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Score</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-emerald-400">{attempt.score}</span>
                      <span className="text-xs font-bold text-slate-500">/ {q.questions?.length || 0}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold ml-1">
                        {Math.round(((attempt.score || 0) / (q.questions?.length || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                )}

              </div>

              {/* Action Button Footer */}
              <div className="pt-5 border-t border-white/10 mt-5 relative z-10">
                {isCompleted ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-sm cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Test Completed</span>
                  </button>
                ) : isInProgress ? (
                  <button
                    onClick={() => handleStartQuiz(q)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-navy-950 font-black transition-all text-sm shadow-glow-amber flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-navy-950" />
                    <span>Resume Quiz</span>
                  </button>
                ) : isLockedForStudent ? (
                  <button
                    onClick={() => setPaywallQuiz(q)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-gold-500/20 hover:from-amber-500/30 hover:to-gold-500/30 text-amber-300 font-bold border border-amber-500/40 text-sm transition-all flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Unlock Paid Quiz</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartQuiz(q)}
                    className={`w-full py-3 rounded-xl font-black transition-all text-sm flex items-center justify-center gap-2 shadow-lg ${
                      isPaid
                        ? 'bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-400 hover:to-gold-400 text-navy-950 shadow-glow-gold'
                        : 'bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white shadow-glow-blue'
                    }`}
                  >
                    <span>Start Quiz</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          );
        })}

        {filteredQuizzes.length === 0 && (
          <div className="col-span-full py-16 text-center border border-white/5 border-dashed rounded-3xl bg-navy-900/30 flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-navy-900/80 border border-white/10 flex items-center justify-center text-slate-500">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">
              {quizTypeTab === 'free' ? 'No Free Quizzes Found' : 'No Paid Quizzes Found'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchQuery || selectedSubject !== 'all'
                ? 'Try clearing the search or subject filter to view all available quizzes.'
                : 'Quizzes created in the Admin Panel will automatically appear here in real-time.'}
            </p>
          </div>
        )}
      </div>

      {/* Paid Quiz Access Paywall / Unlock Modal */}
      {paywallQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-amber-500/40 max-w-md w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6 relative">
            
            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-glow-gold">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Premium Test Series</h3>
                  <p className="text-xs text-amber-400 font-semibold">Exclusive Paid Access</p>
                </div>
              </div>
              <button 
                onClick={() => setPaywallQuiz(null)}
                className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quiz Info Banner */}
            <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 space-y-1 relative z-10">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Selected Test Paper</div>
              <div className="text-sm font-bold text-white">{paywallQuiz.title}</div>
              <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                <span>{paywallQuiz.subject}</span>
                <span>•</span>
                <span>{paywallQuiz.questions?.length || 0} Questions</span>
                <span>•</span>
                <span>{paywallQuiz.timeLimit || 30} Mins</span>
              </div>
            </div>

            {/* Premium Perks */}
            <div className="space-y-3 relative z-10">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Included With Paid Access</div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Curated ICAI / ICMAI exam-pattern questions & case scenarios</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Comprehensive step-by-step explanations & answer keys</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Performance accuracy metrics & national peer rankings</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct faculty guidance & doubt resolution</span>
                </div>
              </div>
            </div>

            {/* Unlock Access / Contact Support Actions */}
            <div className="space-y-3 pt-2 relative z-10">
              <a
                href="https://t.me/ca_success_blueprint_support"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-400 hover:to-gold-400 text-navy-950 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-glow-gold"
              >
                <span>Unlock via Telegram Support</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <a
                href="mailto:casuccessblueprint@gmail.com?subject=Paid Quiz Access Request"
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-royal-400" />
                <span>Email Support (casuccessblueprint@gmail.com)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setPaywallQuiz(null);
                  if (setActiveTab) setActiveTab('support');
                }}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white font-bold transition-colors text-center"
              >
                Need help? Open Student Support Desk
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
