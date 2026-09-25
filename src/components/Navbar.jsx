import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BookOpen, Menu, X, LayoutDashboard, LogOut, User, ChevronRight, ShieldCheck, Bell, Headphones, MoreVertical, Clock, PenLine, Flag, Video, BookOpenCheck, Trophy, Medal, Target, FileText, HelpCircle, Crown, Calendar as CalendarIcon, Megaphone, Lock, RotateCcw, BrainCircuit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SupportModal from './SupportModal';
import SectionMaintenanceModal from './SectionMaintenanceModal';
import { useSectionLocks } from '../hooks/useSectionLocks';
import { getSectionById } from '../config/dashboardSections';

function parseStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', attempt: '' };
  const rawCourse = String(userProfile.course || 'CA Foundation').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  
  if (rawCourse.includes('CMA')) course = 'CMA';
  
  const rawLevel = String(userProfile.level || '').toUpperCase();
  if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND') || rawCourse.includes('FOUND')) level = 'Foundation';
  else if (userProfile.level) level = userProfile.level; 
  
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

export default function Navbar({ activeTab, setActiveTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileActionMenuOpen, setMobileActionMenuOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [maintenanceModalData, setMaintenanceModalData] = useState(null);
  const actionMenuRef = useRef(null);
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { isSectionLocked, getMaintenanceMessage } = useSectionLocks();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const my = parseStream(userProfile);
    const qA = query(collection(db, 'announcements'));
    const unsubA = onSnapshot(qA, (snap) => {
      const allA = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeA = allA.filter(a => 
        a.published !== false && (isAdmin ||
          a.audienceType !== 'specific' || 
          (a.course === my.course && a.level === my.level && normalizeAttempt(a.attempt) === normalizeAttempt(my.attempt))
        )
      ).sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setAnnouncements(activeA);
    });

    const qR = query(collection(db, 'announcementReads'), where('studentId', '==', currentUser.uid));
    const unsubR = onSnapshot(qR, (snap) => {
      const ids = new Set(snap.docs.map(d => d.data().announcementId));
      setReadIds(ids);
    });

    return () => { unsubA(); unsubR(); };
  }, [currentUser, isAdmin, userProfile?.course, userProfile?.level, userProfile?.attempt]);

  const handleMarkAsRead = async (announcementId) => {
    if (readIds.has(announcementId) || !currentUser) return;
    try {
      const readRef = doc(db, 'announcementReads', `${currentUser.uid}_${announcementId}`);
      await setDoc(readRef, {
        studentId: currentUser.uid,
        announcementId,
        readAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  const handleAnnouncementClick = () => {
    if (isSectionLocked('announcements') && !isAdmin) {
      setMaintenanceModalData({
        sectionId: 'announcements',
        sectionTitle: 'Announcements',
        message: getMaintenanceMessage('announcements')
      });
      return;
    }

    if (isDashboardRoute && setActiveTab) {
      setActiveTab('announcements');
    } else {
      navigate('/dashboard?tab=announcements');
    }
  };

  const dashboardNavItems = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'syllabus', label: 'Syllabus', icon: BookOpenCheck },
    { id: 'revision', label: 'Revision', icon: RotateCcw },
    { id: 'timer', label: 'Study Timer', icon: Clock },
    { id: 'webcam_study', label: 'Webcam Study', icon: Video },
    { id: 'mentor', label: 'Mentor Session', icon: Video },
    { id: 'quiz', label: 'Quiz', icon: BrainCircuit },
    { id: 'writing', label: 'Writing Practice', icon: PenLine },
    { id: 'missions', label: 'Weekly Mission', icon: Flag },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'overall_leaderboard', label: 'All Students', icon: Medal },
    { id: 'targets', label: 'Daily Target', icon: Target },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'doubts', label: 'Doubts', icon: HelpCircle },
    { id: 'profile', label: 'Profile', icon: User }
  ];
  const quickJoinItems = [
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
    { id: 'timer', label: 'Study Timer', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/20' },
    { id: 'webcam_study', label: 'Webcam Study', icon: Video, color: 'text-rose-400', bg: 'bg-rose-400/20' },
    { id: 'writing', label: 'Writing Practice', icon: PenLine, color: 'text-purple-400', bg: 'bg-purple-400/20' },
    { id: 'mentor', label: 'Mentor Session', icon: Video, color: 'text-sky-400', bg: 'bg-sky-400/20' }
  ];

  useEffect(() => {
    if (!mobileActionMenuOpen && !mobileMenuOpen) return undefined;

    // Prevent background page from scrolling while mobile menu is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleOutsideClick = (event) => {
      if (!actionMenuRef.current?.contains(event.target)) setMobileActionMenuOpen(false);
    };
    const handleBack = () => {
      setMobileActionMenuOpen(false);
      setMobileMenuOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    window.addEventListener('popstate', handleBack);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('pointerdown', handleOutsideClick);
      window.removeEventListener('popstate', handleBack);
    };
  }, [mobileActionMenuOpen, mobileMenuOpen]);

  useEffect(() => {
    const openAnnouncementCenter = () => setActiveTab?.('announcements');
    window.addEventListener('open-announcement-center', openAnnouncementCenter);
    return () => window.removeEventListener('open-announcement-center', openAnnouncementCenter);
  }, []);

  const handleDashboardNav = (id) => {
    if (isSectionLocked(id)) {
      const sectionInfo = getSectionById(id);
      setMaintenanceModalData({
        sectionId: id,
        sectionTitle: sectionInfo?.label || 'Section',
        message: getMaintenanceMessage(id)
      });
      setMobileActionMenuOpen(false);
      return;
    }

    setActiveTab?.(id);
    setMobileActionMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 glass-nav transition-all duration-300">
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

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {!isDashboardRoute && (
              <>
                <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Home
                </Link>
                <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Features
                </a>
                <a href="#courses" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Courses
                </a>
                <a href="#how-it-works" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  How it Works
                </a>
                <a href="#feedback" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Reviews
                </a>
                <a href="#contact" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Contact
                </a>
              </>
            )}

            {currentUser ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gold-500/20 border border-gold-500/40 text-gold-400 hover:bg-gold-500 hover:text-navy-950 transition-all text-sm font-bold shadow-glow-gold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-royal-600/20 border border-royal-500/30 text-royal-400 hover:bg-royal-600/30 hover:text-white transition-all text-sm font-semibold shadow-glow-blue"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                
                <div className="flex items-center space-x-3 pl-2 border-l border-white/10">
                  {/* Support Button */}
                  <button
                    onClick={() => navigate('/dashboard?tab=support')}
                    title="Student Support & Help"
                    className="p-2 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5 text-xs font-bold border border-emerald-500/20 bg-emerald-500/5"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Support</span>
                  </button>

                  {/* Announcement Bell Icon */}
                  {currentUser && (
                    <button
                      onClick={handleAnnouncementClick}
                      className="relative p-2 rounded-xl bg-rose-500/10 border border-rose-400/25 text-rose-200 hover:bg-rose-500/20 hover:border-rose-300/45 hover:text-white transition-all mr-1 shadow-[0_0_14px_rgba(244,63,94,0.12)] cursor-pointer"
                      title="Announcements"
                      aria-label="Announcements"
                    >
                      <Bell className="w-5 h-5" />
                      {announcements.filter(a => !readIds.has(a.id)).length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-navy-950 animate-pulse"></span>
                      )}
                    </button>
                  )}

                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-white">{userProfile?.name || currentUser.email}</div>
                    <div className="text-[11px] text-gold-400 font-medium font-mono">
                      {isAdmin ? 'Administrator' : (userProfile?.rollNumber || userProfile?.course || 'Student')}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white text-sm font-bold shadow-glow-blue transition-all duration-200 hover:scale-[1.02]"
                >
                  <span>Get Started</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
            {currentUser && (
              <Link
                to="/dashboard"
                className="p-2.5 rounded-xl bg-royal-600/20 text-royal-300 border border-royal-500/30 shadow-[0_0_16px_rgba(99,102,241,0.16)]"
                aria-label="Dashboard home"
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
            )}
            {currentUser && (
              <button
                onClick={handleAnnouncementClick}
                className="relative p-2.5 rounded-xl bg-rose-500/10 border border-rose-400/25 text-rose-200 hover:bg-rose-500/20 hover:border-rose-300/45 hover:text-white transition-all duration-200 shadow-[0_0_14px_rgba(244,63,94,0.12)] cursor-pointer"
                aria-label="Open announcements"
                title="Announcements"
              >
                <Bell className="w-5 h-5" />
                {announcements.filter(a => !readIds.has(a.id)).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-navy-950 animate-pulse"></span>
                )}
              </button>
            )}
            {currentUser && isDashboardRoute && (
              <div className="relative" ref={actionMenuRef}>
                <button
                  onClick={() => {
                    setMobileActionMenuOpen(open => {
                      if (!open) setMobileMenuOpen(false);
                      return !open;
                    });
                  }}
                  className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${mobileActionMenuOpen ? 'bg-gold-500/20 border-gold-400/50 text-gold-300 shadow-[0_0_18px_rgba(245,158,11,0.24)] scale-105' : 'bg-violet-500/10 border-violet-400/30 text-violet-200 hover:bg-violet-500/20 hover:border-violet-300/50 hover:shadow-[0_0_16px_rgba(139,92,246,0.24)] hover:-translate-y-0.5'}`}
                  aria-label="Open dashboard menu"
                  aria-expanded={mobileActionMenuOpen}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {mobileActionMenuOpen && (
                  <>
                    {/* Deep dark backdrop preventing clicks & touch-scroll from passing to the background page */}
                    <div 
                      className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md transition-opacity"
                      onClick={() => setMobileActionMenuOpen(false)}
                      onTouchMove={(e) => e.preventDefault()}
                      aria-hidden="true"
                    />

                    {/* High-contrast, solid dark, scroll-contained mobile menu container */}
                    <div 
                      className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20.5rem,calc(100vw-1.25rem))] max-h-[min(82vh,calc(100dvh-5.5rem))] flex flex-col rounded-2xl border-2 border-violet-500/40 bg-[#090510] p-0 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(139,92,246,0.3)] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
                    >
                      {/* Fixed Top Header inside Menu */}
                      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0 bg-[#090510]">
                        <div>
                          <div className="text-sm font-black text-white">Dashboard Menu</div>
                          <div className="text-[10px] text-gold-400 font-extrabold uppercase tracking-[0.16em]">Quick access</div>
                        </div>
                        <button 
                          onClick={() => setMobileActionMenuOpen(false)} 
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer" 
                          aria-label="Close dashboard menu"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Smoothly Scrollable Options Area (Deep dark background with high-contrast buttons) */}
                      <div 
                        className="p-3.5 space-y-4 overflow-y-auto overscroll-contain flex-1 custom-scrollbar bg-[#090510]"
                        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
                      >
                        {/* Quick Join */}
                        <div className="space-y-2">
                          <div className="px-1 text-[11px] font-black uppercase tracking-wider text-gold-400">⚡ Quick Join</div>
                          <div className="grid grid-cols-2 gap-2">
                            {quickJoinItems.map(item => {
                              const Icon = item.icon;
                              const isLocked = isSectionLocked(item.id);
                              return (
                                <button 
                                  key={item.id} 
                                  onClick={() => handleDashboardNav(item.id)} 
                                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#140b22] hover:bg-[#1f1035] hover:border-violet-400/40 p-2.5 text-left transition-all duration-150 cursor-pointer shadow-sm group"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className={`p-1.5 rounded-lg ${item.bg} ${item.color} shrink-0`}>
                                      <Icon className="w-4 h-4" />
                                    </span>
                                    <span className="text-[12px] font-bold text-white group-hover:text-gold-300 truncate transition-colors">{item.label}</span>
                                  </div>
                                  {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* All Features */}
                        <div className="border-t border-white/10 pt-3.5 space-y-2">
                          <div className="px-1 text-[11px] font-black uppercase tracking-wider text-gold-400">✨ All Features</div>
                          <div className="space-y-1.5">
                            {dashboardNavItems.map(item => {
                              const Icon = item.icon;
                              const isActive = activeTab === item.id;
                              const isLocked = isSectionLocked(item.id);
                              return (
                                <button 
                                  key={item.id} 
                                  onClick={() => handleDashboardNav(item.id)} 
                                  className={`flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm ${
                                    isActive 
                                      ? 'bg-violet-600/35 text-violet-100 border border-violet-400/60 shadow-[0_0_12px_rgba(139,92,246,0.25)]' 
                                      : 'bg-[#140b22] hover:bg-[#1f1035] text-slate-100 hover:text-white border border-white/10 hover:border-violet-400/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 truncate">
                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-violet-300' : isLocked ? 'text-amber-400' : 'text-slate-300'}`} />
                                    <span className="truncate">{item.label}</span>
                                  </div>
                                  {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="pt-2 space-y-2">
                            <button 
                              onClick={() => { setMobileActionMenuOpen(false); navigate('/dashboard?tab=support'); }} 
                              className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-900/80 transition-all cursor-pointer shadow-sm"
                            >
                              <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="flex-1 text-left text-white font-bold">Help & Student Support</span>
                              <span className="text-[9px] font-black uppercase bg-emerald-500 text-navy-950 px-2 py-0.5 rounded shadow">24/7</span>
                            </button>
                            <div className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-gold-300 bg-gold-950/40 border border-gold-500/20 shadow-sm">
                              <Crown className="w-4 h-4 text-gold-400 shrink-0" />
                              <span className="flex-1 font-bold">Premium</span>
                              <span className="text-[9px] font-black uppercase bg-gold-500/20 text-gold-300 px-2 py-0.5 rounded border border-gold-500/30">Coming Soon</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(open => {
                  if (!open) setMobileActionMenuOpen(false);
                  return !open;
                });
              }}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-navy-800 focus:outline-none"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-card border-b border-white/10 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          {!isDashboardRoute && (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-navy-800"
              >
                Home
              </Link>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-navy-800"
              >
                Features
              </a>
              <a
                href="#courses"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-navy-800"
              >
                Courses
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-navy-800"
              >
                How It Works
              </a>
            </>
          )}

          <div className="pt-4 border-t border-white/10 space-y-2">
            {currentUser ? (
              <>
                <div className="px-3 py-2 bg-navy-900/50 rounded-xl mb-2">
                  <div className="text-sm font-semibold text-white">{userProfile?.name || currentUser.email}</div>
                  <div className="text-xs text-gold-400">{userProfile?.course} {userProfile?.attempt ? `• ${userProfile.attempt}` : ''}</div>
                </div>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-gold-500/20 border border-gold-500/40 text-gold-400 font-bold mb-2 shadow-glow-gold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-royal-600 text-white font-semibold"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 rounded-xl border border-slate-700 text-slate-200 font-semibold"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 rounded-xl bg-royal-600 text-white font-semibold shadow-glow-blue"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Support Modal */}
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {/* Section Maintenance Modal */}
      <SectionMaintenanceModal 
        isOpen={Boolean(maintenanceModalData)} 
        onClose={() => setMaintenanceModalData(null)}
        sectionTitle={maintenanceModalData?.sectionTitle}
        customMessage={maintenanceModalData?.message}
      />
    </nav>
  );
}
