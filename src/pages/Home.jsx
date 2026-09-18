import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  BookOpen, 
  Trophy, 
  Target, 
  Clock, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  ChevronRight, 
  Calculator, 
  Calendar,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Star,
  MessageSquare,
  Mail,
  Send
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  // Feedback State
  const [feedbacks, setFeedbacks] = useState([]);
  const [fbName, setFbName] = useState('');
  const [fbRating, setFbRating] = useState(0);
  const [fbHover, setFbHover] = useState(0);
  const [fbText, setFbText] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!fbRating || !fbText.trim() || !fbName.trim()) {
      alert('Please fill all fields and select a star rating.');
      return;
    }
    try {
      setFbSubmitting(true);
      await addDoc(collection(db, 'feedbacks'), {
        name: fbName.trim(),
        rating: fbRating,
        text: fbText.trim(),
        createdAt: serverTimestamp()
      });
      setFbName(''); setFbRating(0); setFbText(''); setFbSuccess(true);
      setTimeout(() => setFbSuccess(false), 3000);
    } catch (err) {
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setFbSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-violet-500 selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
          {/* Background Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] bg-cyan-400/15 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[420px] h-[420px] bg-violet-500/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-[280px] h-[280px] bg-orange-400/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Hero Text */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left transition-all duration-500">
                
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 text-xs sm:text-sm font-semibold shadow-glow-blue">
                  <Sparkles className="w-4 h-4" />
                  <span>The Ultimate CA & CMA Academic Productivity Engine</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
                  Build Your <br className="hidden sm:inline" />
                  <span className="gold-gradient-text">CA/CMA Success Blueprint</span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  Plan your studies, track your progress, build consistency and stay focused throughout your CA/CMA preparation.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Link
                    to="/register"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-violet-500 to-orange-400 hover:from-cyan-300 hover:via-violet-400 hover:to-orange-300 text-white font-bold text-base shadow-[0_0_30px_rgba(34,211,238,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>

                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-card hover:bg-white/10 text-slate-200 font-bold text-base border border-white/10 transition-all duration-200 flex items-center justify-center"
                  >
                    Login
                  </Link>
                </div>

                {/* Hero Badges */}
                <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10 max-w-md mx-auto lg:mx-0">
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white">Real-Time</div>
                    <div className="text-xs text-slate-400 font-medium">Study Timer</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-cyan-300">Verified</div>
                    <div className="text-xs text-slate-400 font-medium">Leaderboard</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-orange-300">100%</div>
                    <div className="text-xs text-slate-400 font-medium">Authentic Stats</div>
                  </div>
                </div>

              </div>

              {/* Right Column: Premium Study Themed Graphic */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Outer Glass Container */}
                  <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-white/15 shadow-2xl overflow-hidden hover:scale-[1.01] transition-transform duration-300">
                    {/* Glowing background inside card */}
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gold-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -left-10 -top-10 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

                    {/* Interactive Mock Academic Dashboard Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-200">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">CA Foundation • Jan 2027</div>
                          <div className="text-xs text-amber-300 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                            Preparation Active
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-xs font-bold">
                        950 PTS
                      </div>
                    </div>

                    {/* Visual Floating Cards */}
                    <div className="space-y-4">
                      {/* Timer Widget Mock */}
                      <div className="p-4 rounded-2xl bg-navy-900/80 border border-cyan-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-200">
                            <Clock className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Current Session</div>
                            <div className="text-sm font-bold text-white">Paper 1: Accounting</div>
                          </div>
                        </div>
                        <div className="text-lg font-mono font-bold text-cyan-300">
                          02:45:10
                        </div>
                      </div>

                      {/* Calculator & Targets Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/10 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center">
                            <Calculator className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Daily Target</div>
                            <div className="text-xs font-bold text-white">6.5 / 8.0 Hours</div>
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/10 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Live Rank</div>
                            <div className="text-xs font-bold text-white">Rank #1</div>
                          </div>
                        </div>
                      </div>

                      {/* Subject Progress Bars */}
                      <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/10 space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">Business Laws syllabus</span>
                          <span className="text-gold-400 font-bold">78% Complete</span>
                        </div>
                        <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-white/5">
                          <div className="bg-gradient-to-r from-cyan-400 via-violet-500 to-orange-400 h-full rounded-full w-[78%]"></div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* COURSE SECTION */}
        <section id="courses" className="py-20 relative bg-navy-900/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-cyan-300 uppercase">Targeted Academic Preparation</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Choose Your Preparation Path</h3>
              <p className="text-slate-400 text-base">Select your exact course and exam attempt to customize your dashboard analytics and subject structure.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              
              {/* CA Card */}
              <div className="p-8 rounded-3xl glass-card border border-violet-500/30 relative overflow-hidden group shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl group-hover:bg-violet-600/20 transition-all pointer-events-none"></div>
                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-200 mb-6 shadow-glow-violet">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">CA Foundation &<br />CA Intermediate</h4>
                <p className="text-slate-400 text-sm mb-6">Complete blueprint for ICAI CA Foundation & Intermediate aspirants. Track study sessions and build subject mastery.</p>

                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Available Exam Attempts:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-navy-950/80 border border-violet-500/30 flex items-center gap-2 text-sm font-semibold text-white">
                      <Calendar className="w-4 h-4 text-amber-300" />
                      <span>January 2027</span>
                    </div>
                    <div className="p-3 rounded-xl bg-navy-950/80 border border-violet-500/30 flex items-center gap-2 text-sm font-semibold text-white">
                      <Calendar className="w-4 h-4 text-amber-300" />
                      <span>May / Sep 2027</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    to="/register?course=CA"
                    className="inline-flex items-center gap-2 text-sm font-bold text-violet-300 group-hover:text-violet-200 transition-colors"
                  >
                    <span>Enroll for CA</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* CMA Card */}
              <div className="p-8 rounded-3xl glass-card border border-amber-400/30 relative overflow-hidden group shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-6 shadow-glow-gold">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h4 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">CMA Foundation &<br />CMA Intermediate</h4>
                <p className="text-slate-400 text-sm mb-6">Dedicated preparation path for CMA Foundation & Intermediate students. Track study sessions and build subject mastery.</p>

                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Exam Attempts:</div>
                  <div className="p-3 rounded-xl bg-navy-950/80 border border-amber-400/30 text-sm font-semibold text-amber-300 flex items-center justify-between">
                    <span>Flexible / Configurable Attempts</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-medium">Ready</span>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    to="/register?course=CMA"
                    className="inline-flex items-center gap-2 text-sm font-bold text-amber-300 group-hover:text-amber-200 transition-colors"
                  >
                    <span>Enroll for CMA</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-orange-300 uppercase">Engineered for Academic Excellence</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Powerful Dashboard Features</h3>
              <p className="text-slate-400 text-base">Everything you need to systematically complete your CA/CMA syllabus without distractions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Feature 1: Live Leaderboard */}
              <div className="p-6 rounded-2xl glass-card glass-card-hover border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center">
                  <Trophy className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Live Leaderboard</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Compete through genuine study hours and points. Real-time updates with zero fake entries.
                </p>
              </div>

              {/* Feature 2: Self-Managed Hub */}
              <div className="p-6 rounded-2xl glass-card glass-card-hover border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Self-Managed Hub</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Create your own daily study goals, manage subject targets, and earn points upon completion.
                </p>
              </div>

              {/* Feature 3: Study Timer */}
              <div className="p-6 rounded-2xl glass-card glass-card-hover border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Study Timer</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Track real study sessions and subject-wise time with auto-saving to your profile.
                </p>
              </div>

              {/* Feature 4: Notes */}
              <div className="p-6 rounded-2xl glass-card glass-card-hover border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Notes & Resources</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Access admin-controlled educational resources, study PDFs, and academic summaries.
                </p>
              </div>

              {/* Feature 5: Academic Doubts */}
              <div className="p-6 rounded-2xl glass-card glass-card-hover border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Academic Doubts</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ask subject questions directly and receive verified admin and faculty answers.
                </p>
              </div>

              {/* Feature 6: Progress Tracking */}
              <div className="p-6 rounded-2xl glass-card glass-card-hover border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Progress Analytics</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Monitor your actual study performance, study streaks, and points history accurately.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-navy-900/40 border-t border-white/5 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-cyan-300 uppercase">Simple 3-Step Process</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white">How CA/CMA Blueprint Works</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Step 1 */}
              <div className="p-8 rounded-3xl glass-card border border-white/10 relative hover:border-gold-500/30 transition-all duration-300">
                <div className="text-4xl font-black gold-gradient-text mb-4">01</div>
                <h4 className="text-xl font-bold text-white mb-2">Register Account</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Create your account, choose between CA Foundation or CMA, and select your exam attempt.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-8 rounded-3xl glass-card border border-white/10 relative hover:border-gold-500/30 transition-all duration-300">
                <div className="text-4xl font-black gold-gradient-text mb-4">02</div>
                <h4 className="text-xl font-bold text-white mb-2">Build Your Blueprint</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Set daily study targets, organize your subjects, and plan your preparation schedule.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-8 rounded-3xl glass-card border border-white/10 relative hover:border-gold-500/30 transition-all duration-300">
                <div className="text-4xl font-black gold-gradient-text mb-4">03</div>
                <h4 className="text-xl font-bold text-white mb-2">Study & Track</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Use the timer, complete targets, earn points, and monitor your rank on the live leaderboard.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-900/40 via-navy-950 to-orange-900/30"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Your preparation deserves a blueprint.
            </h2>
            <p className="text-slate-300 text-lg max-w-xl mx-auto">
              Start tracking your actual study hours and build your consistency today.
            </p>
            <div className="pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-black text-lg shadow-glow-gold hover:scale-105 transition-all duration-200"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* =========== FEEDBACK SECTION =========== */}
      <section id="feedback" className="py-24 bg-navy-900/50 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold">
              <Star className="w-4 h-4 fill-gold-400 text-gold-400" /> Student Feedback
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">What Students Say</h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">Real reviews from CA & CMA aspirants using this platform daily.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Submit Feedback Form */}
            <div className="p-8 rounded-3xl glass-card border border-gold-500/20 shadow-xl space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gold-400" /> Leave Your Feedback
              </h3>
              {fbSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold text-center">
                  ✅ Thank you! Your feedback has been submitted.
                </div>
              )}
              <form onSubmit={handleFeedbackSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={fbName}
                    onChange={e => setFbName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-gold-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Your Rating</label>
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFbRating(star)}
                        onMouseEnter={() => setFbHover(star)}
                        onMouseLeave={() => setFbHover(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${(fbHover || fbRating) >= star ? 'fill-gold-400 text-gold-400' : 'text-slate-600'}`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-bold text-slate-300">
                      {(fbHover || fbRating) > 0 ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][(fbHover || fbRating)] : 'Select rating'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Review</label>
                  <textarea
                    rows="4"
                    required
                    value={fbText}
                    onChange={e => setFbText(e.target.value)}
                    placeholder="Share your experience with CA/CMA Blueprint..."
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-gold-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={fbSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-navy-950 font-black text-sm shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02]"
                >
                  {fbSubmitting ? 'Submitting...' : '⭐ Submit Feedback'}
                </button>
              </form>
            </div>

            {/* Live Feedback Cards */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {feedbacks.length === 0 ? (
                <div className="p-8 rounded-3xl glass-card border border-white/5 text-center text-slate-400 text-sm">
                  No reviews yet. Be the first to share your feedback!
                </div>
              ) : (
                feedbacks.map(f => (
                  <div key={f.id} className="p-5 rounded-2xl glass-card border border-white/10 hover:border-gold-500/20 transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 font-black text-sm flex items-center justify-center border border-gold-500/20">
                          {f.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{f.name}</div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${f.rating >= s ? 'fill-gold-400 text-gold-400' : 'text-slate-600'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">"{f.text}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========== CONTACT US SECTION =========== */}
      <section id="contact" className="py-20 bg-navy-950 border-t border-white/5 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              <Mail className="w-3.5 h-3.5" /> Contact Us
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Get In Touch</h2>
            <p className="text-slate-400 text-base">Have a question or need support? Reach out to us directly.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
            {/* Gmail */}
            <a
              href="mailto:casuccessblueprint@gmail.com"
              className="group flex items-center gap-4 p-6 rounded-2xl glass-card border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Us</div>
                <div className="text-sm font-bold text-white group-hover:text-red-300 transition-colors break-all">casuccessblueprint@gmail.com</div>
              </div>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/919509351975"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 p-6 rounded-2xl glass-card border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Send className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">WhatsApp</div>
                <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Chat on WhatsApp</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
