import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, where, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BookOpen, Menu, X, LayoutDashboard, LogOut, User, ChevronRight, ShieldCheck, Bell, Megaphone, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function parseStream(userProfile) {
  const raw = (userProfile?.course || '').toUpperCase();
  const isCMA = raw.includes('CMA');
  const course = isCMA ? 'CMA' : 'CA';
  const level = raw.includes('FOUNDATION') ? 'Foundation' : 'Intermediate';
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser || isAdmin || !userProfile) return;

    const my = parseStream(userProfile);
    const qA = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubA = onSnapshot(qA, (snap) => {
      const allA = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeA = allA.filter(a => 
        a.published && (
          a.audienceType === 'all' || 
          (a.course === my.course && a.level === my.level && normalizeAttempt(a.attempt) === normalizeAttempt(my.attempt))
        )
      );
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
                  {/* Announcement Bell (Students Only) */}
                  {!isAdmin && isDashboardRoute && (
                    <button
                      onClick={() => setShowAnnouncements(true)}
                      className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors mr-1"
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
          <div className="flex md:hidden items-center space-x-3">
            {currentUser && !isAdmin && isDashboardRoute && (
              <button
                onClick={() => setShowAnnouncements(true)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {announcements.filter(a => !readIds.has(a.id)).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-navy-950 animate-pulse"></span>
                )}
              </button>
            )}
            {currentUser && (
              <Link
                to="/dashboard"
                className="p-2 rounded-xl bg-royal-600/20 text-royal-400 border border-royal-500/30"
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-navy-800 focus:outline-none"
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

      {/* Announcement Center Modal */}
      {showAnnouncements && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-navy-950/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-navy-900 h-full border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-navy-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Announcements</h2>
                  <p className="text-xs text-slate-400">Updates & Important Notices</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAnnouncements(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">No announcements yet</p>
                </div>
              ) : (
                announcements.map((a) => {
                  const isRead = readIds.has(a.id);
                  return (
                    <div 
                      key={a.id} 
                      onClick={() => handleMarkAsRead(a.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${isRead ? 'bg-navy-950/50 border-white/5 opacity-75' : 'bg-rose-500/5 border-rose-500/30 shadow-lg shadow-rose-500/5'}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {!isRead && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white uppercase tracking-wider">New</span>}
                            <span className="text-[10px] font-bold text-slate-400">
                              {a.createdAt?.toDate ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(a.createdAt.toDate()) : 'Recent'}
                            </span>
                          </div>
                          <h4 className={`text-sm font-bold ${isRead ? 'text-slate-200' : 'text-white'}`}>{a.title}</h4>
                        </div>
                        {isRead && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />}
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{a.message}</p>
                      
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500">
                          {a.audienceType === 'specific' ? `${a.course} ${a.level}` : 'All Streams'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          By Admin
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}
