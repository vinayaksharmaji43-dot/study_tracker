import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
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
  TrendingUp,
  Star,
  MessageSquare,
  Mail,
  Youtube,
  Send
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
            <a href="#feedback" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Reviews</a>
            <a href="#contact" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Contact</a>
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
          <a href="#feedback" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-base font-medium text-slate-300 hover:text-white">Reviews</a>
          <a href="#contact" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-base font-medium text-slate-300 hover:text-white">Contact</a>
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
    <div className="min-h-screen bg-navy-950 text-slate-100 font-sans selection:bg-royal-500/30 selection:text-white">
      <PublicNavbar />

      <main className="pt-20">
        
        {/* HERO SECTION */}
        <section className="relative pt-10 pb-14 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
          {/* Subtle Premium Background Elements */}
          <div className="absolute top-0 inset-x-0 h-full w-full opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
          <div className="absolute top-1/4 -right-64 w-[600px] h-[600px] bg-royal-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-64 w-[600px] h-[600px] bg-navy-800/50 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-8 items-center">
              
              {/* Hero Text */}
              <div className="space-y-5 sm:space-y-8 text-center lg:text-left">
                {/* Stream Pills */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <Sparkles className="w-3.5 h-3.5 text-royal-400" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-royal-400">Premium Productivity Engine</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center lg:justify-start">
                    {[
                      { label: 'CA Foundation', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
                      { label: 'CA Intermediate', color: 'text-royal-400', bg: 'bg-royal-500/10', border: 'border-royal-500/20' },
                      { label: 'CMA Foundation', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                      { label: 'CMA Intermediate', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    ].map((s, i) => (
                      <span key={i} className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border ${s.bg} ${s.border} ${s.color} tracking-wide`}>
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
                
                <h1 className="text-[2rem] sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                  Build Your{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-royal-400 to-sky-400">
                    CA/CMA Success Blueprint
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Plan your studies, track your progress, build consistency and stay focused throughout your CA/CMA preparation.
                </p>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
                  <Link 
                    to="/register" 
                    className="px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold shadow-[0_8px_30px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span>Get Started</span>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>
                  <a 
                    href="#features" 
                    className="px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-navy-900 border border-white/10 hover:bg-white/5 text-white font-bold transition-colors flex items-center justify-center text-sm sm:text-base"
                  >
                    Explore Features
                  </a>
                </div>
              </div>

              {/* Hero Visual Mockup — hidden on very small phones, shown from sm upward */}
              <div className="relative mx-auto w-full max-w-sm sm:max-w-lg lg:max-w-none hidden sm:block">
                <div className="absolute inset-0 bg-gradient-to-tr from-royal-500/20 to-transparent blur-2xl rounded-3xl"></div>
                <div className="relative rounded-2xl bg-navy-900 border border-white/10 shadow-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 transform lg:rotate-1 hover:rotate-0 transition-transform duration-500 ease-out">
                  
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 sm:pb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-royal-500 to-navy-800 p-[2px]">
                        <div className="w-full h-full bg-navy-950 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">CA</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white">Dashboard Preview</div>
                        <div className="text-[10px] sm:text-xs text-slate-400">Foundation • May 2027</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-700"></div>
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-700"></div>
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-700"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="p-3 sm:p-4 rounded-xl bg-navy-950 border border-white/5">
                      <div className="text-[10px] sm:text-xs text-slate-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-royal-400"/> Study Time</div>
                      <div className="text-lg sm:text-xl font-black text-white">7h 24m</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-navy-950 border border-white/5">
                      <div className="text-[10px] sm:text-xs text-slate-400 mb-1 flex items-center gap-1"><Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400"/> Daily Target</div>
                      <div className="text-lg sm:text-xl font-black text-white">80%</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-navy-950 border border-white/5">
                      <div className="text-[10px] sm:text-xs text-slate-400 mb-1 flex items-center gap-1"><BookOpenCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400"/> Syllabus</div>
                      <div className="text-lg sm:text-xl font-black text-white">64%</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-navy-950 border border-white/5">
                      <div className="text-[10px] sm:text-xs text-slate-400 mb-1 flex items-center gap-1"><Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold-400"/> Streak</div>
                      <div className="text-lg sm:text-xl font-black text-white">12 Days</div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 rounded-xl bg-royal-600/10 border border-royal-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-royal-500/20 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-royal-400"/></div>
                      <div className="text-xs sm:text-sm font-bold text-slate-200">Consistency is Key</div>
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-royal-400">Keep Going</div>
                  </div>

                </div>
              </div>

              {/* Mobile-only compact stats strip (replaces the full mockup card on tiny phones) */}
              <div className="sm:hidden grid grid-cols-2 gap-3">
                {[
                  { icon: Clock, label: 'Study Time', val: '7h 24m', c: 'text-royal-400' },
                  { icon: Target, label: 'Daily Target', val: '80%', c: 'text-emerald-400' },
                  { icon: BookOpenCheck, label: 'Syllabus', val: '64%', c: 'text-purple-400' },
                  { icon: Award, label: 'Streak', val: '12 Days', c: 'text-gold-400' },
                ].map((s, i) => (
                  <div key={i} className="p-3 rounded-xl bg-navy-900 border border-white/10 flex items-center gap-3">
                    <s.icon className={`w-5 h-5 ${s.c} shrink-0`} />
                    <div>
                      <div className="text-[10px] text-slate-400">{s.label}</div>
                      <div className="text-sm font-black text-white">{s.val}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-y border-white/5 bg-gradient-to-r from-transparent via-navy-900/50 to-transparent py-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-royal-900/20 via-transparent to-transparent pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4">
              {[
                { label: 'Structured Preparation', icon: BookOpenCheck, color: 'text-royal-400', bg: 'bg-royal-500/10', border: 'border-royal-500/20', shadow: 'hover:shadow-royal-500/10' },
                { label: 'Study Time Tracking', icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', shadow: 'hover:shadow-emerald-500/10' },
                { label: 'Daily Targets', icon: Target, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', shadow: 'hover:shadow-rose-500/10' },
                { label: 'Progress Analytics', icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', shadow: 'hover:shadow-purple-500/10' },
                { label: 'Leaderboards', icon: Trophy, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/20', shadow: 'hover:shadow-gold-500/10' }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-navy-950/80 backdrop-blur-sm border ${item.border} hover:-translate-y-1 transition-all duration-300 cursor-default shadow-lg ${item.shadow}`}
                >
                  <div className={`p-1.5 rounded-xl ${item.bg}`}>
                    <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-200">{item.label}</span>
                </div>
              ))}
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

        {/* FEEDBACK SECTION */}
        <section id="feedback" className="py-24 bg-navy-950 border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-royal-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-14 space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-royal-500/10 border border-royal-500/30 text-royal-300 text-xs font-bold">
                <Star className="w-4 h-4 fill-royal-400 text-royal-400" /> Student Feedback
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">What Students Say</h2>
              <p className="text-slate-400 text-base max-w-xl mx-auto">Real reviews from CA & CMA aspirants using this platform daily.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Submit Feedback Form */}
              <div className="p-8 rounded-3xl bg-navy-900 border border-white/5 shadow-xl space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-royal-400" /> Leave Your Feedback
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
                      className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500/50"
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
                      className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-royal-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={fbSubmitting}
                    className="w-full py-3.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-black text-sm shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02]"
                  >
                    {fbSubmitting ? 'Submitting...' : '⭐ Submit Feedback'}
                  </button>
                </form>
              </div>

              {/* Live Feedback Cards */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {feedbacks.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-navy-900 border border-white/5 text-center text-slate-400 text-sm">
                    No reviews yet. Be the first to share your feedback!
                  </div>
                ) : (
                  feedbacks.map(f => (
                    <div key={f.id} className="p-5 rounded-2xl bg-navy-900 border border-white/10 hover:border-royal-500/20 transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-royal-500/20 flex items-center justify-center text-royal-400 font-bold">
                            {f.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{f.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString() : 'Recent'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < f.rating ? 'fill-gold-400 text-gold-400' : 'text-slate-600'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed italic">"{f.text}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT US SECTION */}
        <section id="contact" className="py-20 bg-navy-900/30 border-t border-white/5 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                <Mail className="w-3.5 h-3.5" /> Contact & Socials
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Get In Touch</h2>
              <p className="text-slate-400 text-base">Have a question or need support? Reach out to us or join our community.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Gmail */}
              <a
                href="mailto:casuccessblueprint@gmail.com"
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-navy-950 border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Us</div>
                  <div className="text-sm font-bold text-white group-hover:text-red-300 transition-colors break-all">casuccessblueprint<br/>@gmail.com</div>
                </div>
              </a>

              {/* Telegram */}
              <a
                href="https://t.me/Ca_foundation_help"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-navy-950 border border-white/10 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Telegram</div>
                  <div className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">Join Our Channel</div>
                </div>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com/@casuccessblueprint"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-navy-950 border border-white/10 hover:border-red-600/40 hover:bg-red-600/5 transition-all text-center sm:col-span-2 lg:col-span-1"
              >
                <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-600/20 group-hover:scale-110 transition-transform">
                  <Youtube className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">YouTube</div>
                  <div className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">Watch Tutorials</div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 bg-navy-950 border-t border-white/5">
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
