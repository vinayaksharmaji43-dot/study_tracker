import React from 'react';
import { Link } from 'react-router-dom';
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
  GraduationCap
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
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
              
              {/* CA Foundation Card */}
              <div className="p-8 rounded-3xl glass-card border border-violet-500/30 relative overflow-hidden group shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl group-hover:bg-violet-600/20 transition-all pointer-events-none"></div>
                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-200 mb-6 shadow-glow-violet">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">CA Foundation</h4>
                <p className="text-slate-400 text-sm mb-6">Complete blueprint for ICAI CA Foundation aspirants. Includes Accounting, Business Laws, Quantitative Aptitude & Economics.</p>

                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Available Exam Attempts:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-navy-950/80 border border-violet-500/30 flex items-center gap-2 text-sm font-semibold text-white">
                      <Calendar className="w-4 h-4 text-amber-300" />
                      <span>January 2027</span>
                    </div>
                    <div className="p-3 rounded-xl bg-navy-950/80 border border-violet-500/30 flex items-center gap-2 text-sm font-semibold text-white">
                      <Calendar className="w-4 h-4 text-amber-300" />
                      <span>September 2027</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    to="/register?course=CA Foundation"
                    className="inline-flex items-center gap-2 text-sm font-bold text-violet-300 group-hover:text-violet-200 transition-colors"
                  >
                    <span>Enroll for CA Foundation</span>
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
                <h4 className="text-2xl font-bold text-white mb-2">CMA Preparation</h4>
                <p className="text-slate-400 text-sm mb-6">Dedicated preparation path for Cost and Management Accountant students. Track study sessions and build subject mastery.</p>

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

      <Footer />
    </div>
  );
}
