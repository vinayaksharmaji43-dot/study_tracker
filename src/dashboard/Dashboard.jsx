import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Overview from '../dashboard/Overview';
import Syllabus from '../dashboard/Syllabus';
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

import { 
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
  Lock
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

export default function Dashboard() {
  const { userProfile, currentUser, logout, levelInfo, isAdmin } = useAuth();
  const { isSectionLocked, getMaintenanceMessage } = useSectionLocks();

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
    { id: 'leaderboard', label: 'Live Leaderboard', icon: Trophy },
    { id: 'overall_leaderboard', label: '🏆 All Students', icon: Medal },
    { id: 'timer', label: 'Study Timer', icon: Clock },
    { id: 'webcam_study', label: 'Webcam Study', icon: Video },
    { id: 'mentor', label: 'Mentor Session', icon: Video },
    { id: 'writing', label: 'Writing Practice', icon: PenLine },
    { id: 'missions', label: 'Weekly Mission', icon: Flag },
    { id: 'targets', label: 'Self-Managed Hub', icon: Target },
    { id: 'notes', label: 'Notes & Resources', icon: FileText },
    { id: 'doubts', label: 'Academic Doubts', icon: HelpCircle },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Exam Countdown Banner */}
        <CountdownWidget setActiveTab={setActiveTab} />

        {/* Main Dashboard Layout: Sidebar + View Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 space-y-4">
            <div className="p-4 rounded-3xl glass-card border border-white/10 space-y-2 shadow-xl">
              
              {/* User Snapshot Header */}
              <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 space-y-1 mb-2">
                <div className="text-sm font-bold text-white truncate flex items-center justify-between gap-1">
                  <span className="truncate">{userProfile?.name || currentUser?.email}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-gold-500/20 text-gold-300 font-bold border border-gold-500/30 shrink-0" title={`Level ${levelInfo?.currentLevelNumber}: ${levelInfo?.currentLevelName}`}>
                    {levelInfo?.badge} {levelInfo?.currentLevelName}
                  </span>
                </div>
                <div className="text-xs font-semibold text-gold-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{userProfile?.course || 'CA Foundation'}</span>
                  {userProfile?.attempt ? ` • ${userProfile.attempt}` : ''}
                </div>
              </div>

              {/* Nav Items List */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isLocked = isSectionLocked(item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-glow-emerald'
                          : isLocked
                            ? 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/5 border border-transparent'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : isLocked ? 'text-amber-400/80' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isLocked && (
                          <span title="Under Maintenance" className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Support & Logout Buttons */}
              <div className="pt-2 border-t border-white/10 space-y-1">
                <button
                  onClick={() => { setActiveTab('support'); if(typeof setMobileMenuOpen === 'function'){setMobileMenuOpen(false);} }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Headphones className="w-5 h-5 text-emerald-400" />
                    <span>Help & Support</span>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-emerald-500 text-navy-950 px-2 py-0.5 rounded-md">24/7</span>
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

          {/* Main Dashboard Workspace View */}
          <main className="col-span-1 lg:col-span-9 space-y-6">
            {/* Security Guard: If activeTab is locked and student directly accessed it, render maintenance placeholder */}
            {isSectionLocked(activeTab) && adminOverrideTab !== activeTab ? (
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
                {activeTab === 'leaderboard' && <Leaderboard />}
                {activeTab === 'overall_leaderboard' && <OverallLeaderboard />}
                {activeTab === 'timer' && <StudyTimer setActiveTab={setActiveTab} />}
                {activeTab === 'webcam_study' && <WebcamStudy setActiveTab={setActiveTab} />}
                {activeTab === 'mentor' && <MentorSession />}
                {activeTab === 'writing' && <WritingPractice />}
                {activeTab === 'missions' && <WeeklyMissions />}
                {activeTab === 'targets' && <Targets setActiveTab={setActiveTab} />}
                {activeTab === 'notes' && <Notes />}
                {activeTab === 'doubts' && <Doubts />}
                {activeTab === 'profile' && <Profile />}
                {activeTab === 'support' && <Support setActiveTab={setActiveTab} />}
              </ErrorBoundary>
            )}
          </main>

        </div>

      </div>

      <Footer />

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
    </div>
  );
}
