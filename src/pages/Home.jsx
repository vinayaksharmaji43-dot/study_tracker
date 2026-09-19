import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpenCheck, 
  Trophy, 
  Target, 
  Clock, 
  Flag, 
  Video, 
  CheckCircle2, 
  ChevronRight, 
  PenLine,
  LayoutDashboard,
  Menu,
  X,
  Sparkles,
  BarChart3,
  Award,
  FileText,
  HelpCircle,
  TrendingUp
} from 'lucide-react';

// Custom Navbar for Public Home Page
function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt="CA & CMA Success Blueprint Logo" 
              className="h-10 sm:h-12 w-auto object-contain rounded-xl group-hover:scale-105 transition-transform duration-300 shadow-md" 
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">How it Works</a>
            <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Log In</Link>
            <Link 
              to="/register" 
              className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white text-sm font-bold shadow-lg shadow-royal-600/20 transition-all hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg text-slate-400 hover:text-white">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-navy-900 border-b border-white/5 px-4 pt-2 pb-6 space-y-4 shadow-2xl absolute w-full">
          <a href="#features" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-base font-medium text-slate-300 hover:text-white">Features</a>
          <a href="#how-it-works" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-base font-medium text-slate-300 hover:text-white">How it Works</a>
          <div className="h-px bg-white/5 my-2"></div>
          <Link to="/login" className="block px-4 py-2 text-base font-medium text-slate-300 hover:text-white">Log In</Link>
          <Link to="/register" className="block w-full text-center mt-2 px-5 py-3 rounded-xl bg-royal-600 text-white font-bold">
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 font-sans selection:bg-royal-500/30 selection:text-white">
      <PublicNavbar />

      <main className="pt-20">
        
        {/* HERO SECTION */}
        <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
          {/* Subtle Premium Background Elements */}
          <div className="absolute top-0 inset-x-0 h-full w-full opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
          <div className="absolute top-1/4 -right-64 w-[600px] h-[600px] bg-royal-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-64 w-[600px] h-[600px] bg-navy-800/50 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
              
              {/* Hero Text */}
              <div className="space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-royal-500/10 border border-royal-500/20 text-royal-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Premium Productivity Engine</span>
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                  Build Your <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-royal-400 to-sky-400">
                    CA/CMA Success Blueprint
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  Plan your studies, track your progress, build consistency and stay focused throughout your CA/CMA preparation.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <Link 
                    to="/register" 
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold shadow-[0_8px_30px_rgba(37,99,235,0.2)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Get Started</span>
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                  <a 
                    href="#features" 
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-navy-900 border border-white/10 hover:bg-white/5 text-white font-bold transition-colors flex items-center justify-center"
                  >
                    Explore Features
                  </a>
                </div>
              </div>

              {/* Hero Visual Mockup */}
              <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                <div className="absolute inset-0 bg-gradient-to-tr from-royal-500/20 to-transparent blur-2xl rounded-3xl"></div>
                <div className="relative rounded-2xl bg-navy-900 border border-white/10 shadow-2xl p-6 space-y-4 transform lg:rotate-1 hover:rotate-0 transition-transform duration-500 ease-out">
                  
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-royal-500 to-navy-800 p-[2px]">
                        <div className="w-full h-full bg-navy-950 rounded-full flex items-center justify-center text-sm font-bold">CA</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Dashboard Preview</div>
                        <div className="text-xs text-slate-400">Foundation • May 2027</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                      <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                      <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-navy-950 border border-white/5">
                      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-royal-400"/> Study Time</div>
                      <div className="text-xl font-black text-white">7h 24m</div>
                    </div>
                    <div className="p-4 rounded-xl bg-navy-950 border border-white/5">
                      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-emerald-400"/> Daily Target</div>
                      <div className="text-xl font-black text-white">80%</div>
                    </div>
                    <div className="p-4 rounded-xl bg-navy-950 border border-white/5">
                      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><BookOpenCheck className="w-3.5 h-3.5 text-purple-400"/> Syllabus</div>
                      <div className="text-xl font-black text-white">64%</div>
                    </div>
                    <div className="p-4 rounded-xl bg-navy-950 border border-white/5">
                      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-gold-400"/> Current Streak</div>
                      <div className="text-xl font-black text-white">12 Days</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-royal-600/10 border border-royal-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-royal-500/20 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-royal-400"/></div>
                      <div className="text-sm font-bold text-slate-200">Consistency is Key</div>
                    </div>
                    <div className="text-xs font-bold text-royal-400">Keep Going</div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-y border-white/5 bg-navy-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 text-sm font-semibold text-slate-400">
              <span className="flex items-center gap-2"><BookOpenCheck className="w-4 h-4 text-royal-400" /> Structured Preparation</span>
              <span className="hidden sm:inline text-white/10">•</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-400" /> Study Time Tracking</span>
              <span className="hidden md:inline text-white/10">•</span>
              <span className="flex items-center gap-2"><Target className="w-4 h-4 text-rose-400" /> Daily Targets</span>
              <span className="hidden lg:inline text-white/10">•</span>
              <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-400" /> Progress Analytics</span>
              <span className="hidden sm:inline text-white/10">•</span>
              <span className="flex items-center gap-2"><Trophy className="w-4 h-4 text-gold-400" /> Leaderboards</span>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-24 bg-navy-950 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-royal-400 uppercase">Engineered for Academic Excellence</h2>
              <h3 className="text-3xl sm:text-4xl font-black text-white">Powerful Dashboard Features</h3>
              <p className="text-slate-400 text-base">Everything you need to systematically complete your CA/CMA syllabus without distractions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Trophy, title: 'Live Leaderboard', desc: 'Compete through genuine study hours and points. Real-time updates with zero fake entries.', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { icon: Target, title: 'Self-Managed Hub', desc: 'Create your own daily study goals, manage subject targets, and earn points upon completion.', color: 'text-gold-400', bg: 'bg-gold-500/10' },
                { icon: Clock, title: 'Study Timer', desc: 'Track real study sessions and subject-wise time with auto-saving to your profile.', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { icon: FileText, title: 'Notes & Resources', desc: 'Access admin-controlled educational resources, study PDFs, and academic summaries.', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { icon: HelpCircle, title: 'Academic Doubts', desc: 'Ask subject questions directly and receive verified admin and faculty answers.', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { icon: TrendingUp, title: 'Progress Analytics', desc: 'Monitor your actual study performance, study streaks, and points history accurately.', color: 'text-sky-400', bg: 'bg-sky-500/10' }
              ].map((f, i) => (
                <div key={i} className="p-6 rounded-2xl bg-navy-900 border border-white/5 hover:border-white/10 transition-colors group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.bg} ${f.color}`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-navy-900/30 border-y border-white/5 relative overflow-hidden">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-royal-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-royal-400 uppercase">Simple 3-Step Process</h2>
              <h3 className="text-3xl sm:text-4xl font-black text-white">How CA/CMA Blueprint Works</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Desktop Connecting Line */}
              <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-royal-500/30 to-transparent"></div>

              {[
                { step: '01', title: 'Register Account', desc: 'Create your account, choose between CA Foundation or CMA, and select your exam attempt.' },
                { step: '02', title: 'Build Your Blueprint', desc: 'Set daily study targets, organize your subjects, and plan your preparation schedule.' },
                { step: '03', title: 'Study & Track', desc: 'Use the timer, complete targets, earn points, and monitor your rank on the live leaderboard.' }
              ].map((s, i) => (
                <div key={i} className="relative z-10 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-navy-950 border border-royal-500/20 text-royal-400 flex items-center justify-center text-xl font-black shadow-lg">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-bold text-white">{s.title}</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GAMIFICATION PREVIEW */}
        <section className="py-24 bg-navy-950 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.15]">
                  Turn Consistency Into A Rewarding Habit
                </h2>
                <p className="text-lg text-slate-400 leading-relaxed">
                  The platform utilizes a structured point and streak system to keep you motivated. As you study and complete tasks, you naturally progress and rank up.
                </p>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  UI PREVIEW EXAMPLES ONLY
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-navy-900 border border-white/5 flex flex-col gap-2">
                  <div className="text-xs font-bold text-slate-400 uppercase">🔥 Streak</div>
                  <div className="text-2xl font-black text-white">12 Days</div>
                </div>
                <div className="p-5 rounded-2xl bg-navy-900 border border-white/5 flex flex-col gap-2">
                  <div className="text-xs font-bold text-slate-400 uppercase">⚡ Level</div>
                  <div className="text-2xl font-black text-white">Focused</div>
                </div>
                <div className="p-5 rounded-2xl bg-navy-900 border border-white/5 flex flex-col gap-2">
                  <div className="text-xs font-bold text-slate-400 uppercase">🏆 Points</div>
                  <div className="text-2xl font-black text-white">1,240</div>
                </div>
                <div className="p-5 rounded-2xl bg-navy-900 border border-white/5 flex flex-col gap-2">
                  <div className="text-xs font-bold text-slate-400 uppercase">📈 Progress</div>
                  <div className="text-2xl font-black text-white">68%</div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 bg-navy-900/30 border-t border-white/5">
          <div className="max-w-3xl mx-auto px-4 text-center space-y-8">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Your preparation deserves a blueprint.
            </h2>
            <p className="text-slate-300 text-lg max-w-xl mx-auto">
              Join our disciplined CA and CMA aspirant community today and stay ahead.
            </p>
            <Link 
              to="/register" 
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-navy-950 font-black shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              Create Your Account
            </Link>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-navy-950 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="h-8 w-auto opacity-80" />
                <span className="text-xl font-bold text-white tracking-tight">CA/CMA Blueprint</span>
              </div>
              <div className="text-sm text-slate-500">Academic & Productivity Dashboard</div>
            </div>
            
            <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-slate-600">
            &copy; {new Date().getFullYear()} CA/CMA Blueprint. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
