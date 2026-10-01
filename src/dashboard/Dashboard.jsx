import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Overview from '../dashboard/Overview';
import Syllabus from '../dashboard/Syllabus';
import Revision from '../dashboard/Revision';
import Leaderboard from '../dashboard/Leaderboard';
import StudyTimer from '../dashboard/StudyTimer';
import Targets from '../dashboard/Targets';
import Notes from '../dashboard/Notes';
import Doubts from '../dashboard/Doubts';
import Profile from '../dashboard/Profile';
import WritingPractice from '../dashboard/WritingPractice';
import WeeklyMissions from '../dashboard/WeeklyMissions';
import MentorSession from '../dashboard/MentorSession';
import Calendar from '../dashboard/Calendar';
import Announcements from '../dashboard/Announcements';
import OverallLeaderboard from '../dashboard/OverallLeaderboard';
import WebcamStudy from '../dashboard/WebcamStudy';
import StudentQuizzes from '../dashboard/StudentQuizzes';
import Products from '../dashboard/Products';

import { 
  ShoppingBag,
  LayoutDashboard, 
  BookOpenCheck,
  Trophy, 
  Medal,
  Clock, 
  Target, 
  Flag,
  FileText, 
  HelpCircle, 
  User, 
  LogOut,
  ChevronRight,
  Sparkles,
  PenLine,
  Video,
  Headphones,
  Calendar as CalendarIcon,
  Megaphone,
  MessageSquare,
  Lock,
  RotateCcw,
  BrainCircuit
} from 'lucide-react';
import SupportModal from '../components/SupportModal';
import Support from '../dashboard/Support';
import FeedbackModal from '../components/FeedbackModal';
import SectionMaintenanceModal, { SectionMaintenancePlaceholder } from '../components/SectionMaintenanceModal';
import { useSectionLocks } from '../hooks/useSectionLocks';
import { getSectionById } from '../config/dashboardSections';

import CountdownWidget from '../components/CountdownWidget';
import useDailyEvaluator from '../hooks/useDailyEvaluator';
import LevelUpModal from '../components/LevelUpModal';
import ErrorBoundary from '../components/ErrorBoundary';
import MandatoryProfileModal from '../components/MandatoryProfileModal';
import usePremiumAccess from '../hooks/usePremiumAccess';
import ProBadge from '../components/ProBadge';
import PremiumLockScreen from '../components/PremiumLockScreen';
import TrialExpiredBanner from '../components/TrialExpiredBanner';
import TrialExpiredModal from '../components/TrialExpiredModal';
import { useTheme } from '../contexts/ThemeContext';

export default function Dashboard() {
  const { userProfile, currentUser, logout, levelInfo, isAdmin } = useAuth();
  const { isEyeCare } = useTheme();
  const { isSectionLocked, getMaintenanceMessage } = useSectionLocks();
  const {
    isPro,
    isTrialActive,
    isTrialExpired,
    daysRemaining,
    isProfileCompleted,
    canShowTrialExpiredUI,
    isSectionAccessible,
    toggleAdminSimulateExpired,
    isSimulatingExpired
  } = usePremiumAccess();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(() => {
    return searchParams.get('tab') || 'overview';
  });
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [maintenanceModalData, setMaintenanceModalData] = useState(null);
  const [adminOverrideTab, setAdminOverrideTab] = useState(null);

  // Sync tab with URL search parameter with Section Lock Interception
  const setActiveTab = (tabId, bypassLock = false) => {
    if (isSectionLocked(tabId) && !bypassLock && adminOverrideTab !== tabId) {
      const sectionInfo = getSectionById(tabId);
      setMaintenanceModalData({
        sectionId: tabId,
        sectionTitle: sectionInfo?.label || 'Section',
        message: getMaintenanceMessage(tabId)
      });
      return;
    }

    setActiveTabState(tabId);
    if (tabId === 'overview') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tab');
      setSearchParams(nextParams, { replace: true });
    } else {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', tabId);
      setSearchParams(nextParams, { replace: true });
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTabState(tabParam);
    }
  }, [searchParams]);

  // Run the daily evaluator when Dashboard mounts
  useDailyEvaluator(currentUser);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'syllabus', label: 'Syllabus & Progress', icon: BookOpenCheck },
    { id: 'revision', label: 'Revision', icon: RotateCcw },
    { id: 'leaderboard', label: 'Live Leaderboard', icon: Trophy },
    { id: 'overall_leaderboard', label: '🏆 All Students', icon: Medal },
    { id: 'timer', label: 'Study Timer', icon: Clock },
    { id: 'webcam_study', label: 'Webcam Study', icon: Video },
    { id: 'mentor', label: 'Mentor Session', icon: Video },
    { id: 'quiz', label: 'Quiz', icon: BrainCircuit },
    { id: 'writing', label: 'Writing Practice', icon: PenLine },
    { id: 'missions', label: 'Weekly Mission', icon: Flag },
    { id: 'targets', label: 'Daily Target and Test', icon: Target },
    { id: 'notes', label: 'Notes & Resources', icon: FileText },
    { id: 'doubts', label: 'Doubt & Guidance', icon: HelpCircle },
    { id: 'product', label: 'Product', icon: ShoppingBag, isSpecial: true },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className={`min-h-screen flex flex-col relative transition-colors duration-300 ${
      isEyeCare 
        ? 'bg-[#000000] text-slate-100 selection:bg-emerald-500 selection:text-white' 
        : 'bg-[#f0f7ff] text-slate-900 selection:bg-blue-600 selection:text-white dashboard-theme-light'
    }`}>
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        !isProfileCompleted ? 'pointer-events-none select-none filter blur-sm opacity-40' : ''
      }`}>
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Exam Countdown Banner */}
        <CountdownWidget setActiveTab={setActiveTab} />

        {/* 12-Day Trial Expired Banner (Shown only after Name+Phone form is complete) */}
        <TrialExpiredBanner setActiveTab={setActiveTab} />

        {/* Main Dashboard Layout: Sidebar + View Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 space-y-4">
            <div className={`p-4 rounded-3xl space-y-2 shadow-xl border transition-colors ${
              isEyeCare 
                ? 'glass-card border-white/10' 
                : 'bg-white border-blue-200/80 shadow-[0_4px_25px_-5px_rgba(37,99,235,0.08)]'
            }`}>
              
              {/* User Snapshot Header */}
              <div className={`p-4 rounded-2xl border space-y-1.5 mb-2 transition-colors ${
                isEyeCare 
                  ? 'bg-navy-900/80 border-white/5' 
                  : 'bg-blue-50/80 border-blue-100 text-slate-900'
              }`}>
                <div className="text-sm font-bold truncate flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`truncate ${isEyeCare ? 'text-white' : 'text-slate-900 font-extrabold'}`}>
                      {userProfile?.name || currentUser?.email}
                    </span>
                    {isPro && <ProBadge size="sm" />}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-bold border shrink-0 ${
                    isEyeCare ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`} title={`Level ${levelInfo?.currentLevelNumber}: ${levelInfo?.currentLevelName}`}>
                    {levelInfo?.badge} {levelInfo?.currentLevelName}
                  </span>
                </div>
                <div className={`text-xs font-semibold flex items-center justify-between gap-1.5 pt-0.5 ${
                  isEyeCare ? 'text-gold-400' : 'text-blue-700'
                }`}>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isEyeCare ? 'bg-emerald-500' : 'bg-blue-600'}`}></span>
                    <span className="truncate">{userProfile?.course || 'CA Foundation'}</span>
                    {userProfile?.attempt ? ` • ${userProfile.attempt}` : ''}
                  </div>
                  {!isPro && !isAdmin && (
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                      canShowTrialExpiredUI 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                        : (isEyeCare ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-100 text-blue-700 border-blue-200')
                    }`}>
                      {canShowTrialExpiredUI ? 'Trial Expired' : `${daysRemaining}d Trial`}
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={toggleAdminSimulateExpired}
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border transition-all cursor-pointer shrink-0 ${
                        isSimulatingExpired
                          ? 'bg-rose-500/25 border-rose-500/40 text-rose-300 shadow-glow-rose'
                          : isEyeCare 
                            ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            : 'bg-blue-100/60 border-blue-200 text-blue-700 hover:bg-blue-200'
                      }`}
                      title="Test student trial expired view as administrator"
                    >
                      {isSimulatingExpired ? '🔴 Exit Test' : '👁️ Test Expired'}
                    </button>
                  )}
                </div>
              </div>

              {/* Nav Items List */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isMaintenanceLocked = isSectionLocked(item.id);
                  const isTrialLocked = canShowTrialExpiredUI && !isSectionAccessible(item.id);
                  const isLocked = isMaintenanceLocked || isTrialLocked;
                  const isProduct = item.id === 'product';

                  if (isProduct) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer my-1.5 ${
                          isActive
                            ? isEyeCare
                              ? 'bg-gradient-to-r from-amber-500/25 via-purple-500/25 to-amber-500/25 border border-amber-400/60 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                              : 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-500'
                            : isEyeCare
                              ? 'bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border border-amber-500/30 text-amber-300 hover:border-amber-400/60'
                              : 'bg-blue-50/70 border border-blue-200 text-blue-800 hover:bg-blue-100/80 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <ShoppingBag className={`w-5 h-5 ${isActive ? (isEyeCare ? 'text-amber-400' : 'text-white') : (isEyeCare ? 'text-amber-400/90' : 'text-blue-700')}`} />
                          <span className={`tracking-wide font-black ${
                            isActive ? (isEyeCare ? 'text-amber-300' : 'text-white') : (isEyeCare ? 'text-amber-300' : 'text-blue-900')
                          }`}>
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 shadow-sm ${
                            isEyeCare ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : (isActive ? 'bg-blue-700 text-white border-blue-400' : 'bg-blue-100 text-blue-700 border-blue-200')
                          }`}>
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Store</span>
                          </span>
                          {isActive && <ChevronRight className={`w-4 h-4 ${isEyeCare ? 'text-amber-400' : 'text-white'}`} />}
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? isEyeCare
                            ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                            : 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-500'
                          : isLocked
                            ? isEyeCare
                              ? 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/5 border border-transparent'
                              : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent font-semibold'
                            : isEyeCare
                              ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                              : 'text-slate-800 hover:text-blue-700 hover:bg-blue-50 border border-transparent font-bold'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${
                          isActive 
                            ? 'text-white' 
                            : isLocked 
                              ? (isEyeCare ? 'text-amber-400/80' : 'text-slate-500') 
                              : (isEyeCare ? 'text-slate-400' : 'text-slate-600')
                        }`} />
                        <span className="font-bold">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isTrialLocked ? (
                          <span title="Free Trial Expired - Premium Required" className={`px-1.5 py-0.5 rounded-md border text-[10px] font-black flex items-center gap-1 ${
                            isEyeCare ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                            <Lock className="w-3 h-3" />
                            <span>PRO</span>
                          </span>
                        ) : isMaintenanceLocked ? (
                          <span title="Under Maintenance" className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : null}
                        {isActive && <ChevronRight className={`w-4 h-4 ${isEyeCare ? 'text-blue-300' : 'text-white'}`} />}
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Support & Logout Buttons */}
              <div className={`pt-2 border-t space-y-1 ${isEyeCare ? 'border-white/10' : 'border-blue-100'}`}>
                <button
                  onClick={() => { setActiveTab('support'); if(typeof setMobileMenuOpen === 'function'){setMobileMenuOpen(false);} }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold border transition-all cursor-pointer ${
                    isEyeCare 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' 
                      : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Headphones className={`w-5 h-5 ${isEyeCare ? 'text-emerald-400' : 'text-blue-600'}`} />
                    <span>Help & Support</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    isEyeCare ? 'bg-emerald-500 text-navy-950' : 'bg-blue-600 text-white'
                  }`}>8 AM - 9 PM</span>
                </button>

                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold text-royal-300 bg-royal-500/10 border border-royal-500/20 hover:bg-royal-500/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-4 h-4 text-royal-400" />
                    <span>Give Feedback</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-gold-400">Review</span>
                </button>

                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Log Out</span>
                </button>
              </div>

            </div>
          </aside>

          {/* Mobile/Tablet Horizontal Quick Navigation Tabs */}
          <div className="lg:hidden col-span-1 -mt-2 mb-2">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 px-1 custom-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isProduct = item.id === 'product';
                const isMaintenanceLocked = isSectionLocked(item.id);
                const isTrialLocked = canShowTrialExpiredUI && !isSectionAccessible(item.id);
                const isLocked = isMaintenanceLocked || isTrialLocked;

                if (isProduct) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shrink-0 cursor-pointer shadow-sm ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500 via-purple-500 to-amber-500 text-white border border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                          : 'bg-gradient-to-r from-amber-500/25 via-purple-500/20 to-amber-500/25 text-amber-300 border border-amber-400/50 hover:border-amber-300 hover:text-white'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Product 🛍️</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-glow-emerald'
                        : isLocked
                          ? 'bg-navy-900/80 text-slate-400 border border-amber-500/20 hover:text-white'
                          : 'bg-navy-900/80 text-slate-300 border border-white/10 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {isTrialLocked && (
                      <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30">
                        PRO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Dashboard Workspace View */}
          <main className="col-span-1 lg:col-span-9 space-y-6">
            {/* 12-Day Trial Expired Lock Screen Guard */}
            {canShowTrialExpiredUI && !isSectionAccessible(activeTab) ? (
              <PremiumLockScreen
                sectionTitle={navItems.find(n => n.id === activeTab)?.label || 'This Section'}
                setActiveTab={setActiveTab}
              />
            ) : isSectionLocked(activeTab) && adminOverrideTab !== activeTab ? (
              <SectionMaintenancePlaceholder
                sectionTitle={getSectionById(activeTab)?.label}
                customMessage={getMaintenanceMessage(activeTab)}
                onReturn={() => setActiveTab('overview')}
                isAdmin={isAdmin}
                onAdminOverride={() => setAdminOverrideTab(activeTab)}
              />
            ) : (
              <ErrorBoundary key={activeTab} fallbackMessage={`Failed to load the ${activeTab} section. Please try again.`}>
                {activeTab === 'overview' && <Overview setActiveTab={setActiveTab} />}
                {activeTab === 'announcements' && <Announcements />}
                {activeTab === 'calendar' && <Calendar />}
                {activeTab === 'syllabus' && <Syllabus />}
                {activeTab === 'revision' && <Revision />}
                {activeTab === 'leaderboard' && <Leaderboard />}
                {activeTab === 'overall_leaderboard' && <OverallLeaderboard />}
                {activeTab === 'timer' && <StudyTimer setActiveTab={setActiveTab} />}
                {activeTab === 'webcam_study' && <WebcamStudy setActiveTab={setActiveTab} />}
                {activeTab === 'mentor' && <MentorSession />}
                {(activeTab === 'quiz' || activeTab === 'quizzes') && <StudentQuizzes setActiveTab={setActiveTab} />}
                {activeTab === 'writing' && <WritingPractice />}
                {activeTab === 'missions' && <WeeklyMissions />}
                {activeTab === 'targets' && <Targets setActiveTab={setActiveTab} />}
                {activeTab === 'notes' && <Notes />}
                {activeTab === 'doubts' && <Doubts />}
                {(activeTab === 'product' || activeTab === 'products') && <Products setActiveTab={setActiveTab} />}
                {activeTab === 'profile' && <Profile />}
                {activeTab === 'support' && <Support setActiveTab={setActiveTab} />}
              </ErrorBoundary>
            )}
          </main>

        </div>

      </div>

      <Footer />
      </div>

      {/* Global Section Maintenance Modal */}
      <SectionMaintenanceModal
        isOpen={Boolean(maintenanceModalData)}
        onClose={() => setMaintenanceModalData(null)}
        sectionTitle={maintenanceModalData?.sectionTitle}
        customMessage={maintenanceModalData?.message}
        isAdmin={isAdmin}
        onAdminOverride={() => {
          if (maintenanceModalData?.sectionId) {
            setAdminOverrideTab(maintenanceModalData.sectionId);
            setActiveTab(maintenanceModalData.sectionId, true);
          }
        }}
      />

      {/* Global Level Up Modal */}
      <LevelUpModal />

      {/* Global Support Modal */}
      <SupportModal 
        isOpen={showSupportModal} 
        onClose={() => setShowSupportModal(false)} 
        onOpenFeedback={() => setShowFeedbackModal(true)}
      />

      {/* Global Feedback Modal */}
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />

      {/* Mandatory Profile Information Modal (Dashboard Only) */}
      <MandatoryProfileModal />

      {/* 12-Day Free Trial Expired Modal (Pops up strictly after mandatory profile completion) */}
      <TrialExpiredModal setActiveTab={setActiveTab} />
    </div>
  );
}
