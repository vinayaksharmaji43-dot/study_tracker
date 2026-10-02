import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

import AdminOverview from './tabs/AdminOverview';
import AdminStudents from './tabs/AdminStudents';
import AdminSyllabus from './tabs/AdminSyllabus';
import AdminSyllabusManager from './tabs/AdminSyllabusManager';
import AdminChaptersUnits from './tabs/AdminChaptersUnits';
import AdminRevisionManager from './tabs/AdminRevisionManager';
import AdminAnalytics from './tabs/AdminAnalytics';
import AdminLeaderboard from './tabs/AdminLeaderboard';
import AdminTargets from './tabs/AdminTargets';
import AdminSessions from './tabs/AdminSessions';
import AdminNotes from './tabs/AdminNotes';
import AdminDoubts from './tabs/AdminDoubts';
import AdminAnnouncements from './tabs/AdminAnnouncements';
import AdminFeedback from './tabs/AdminFeedback';
import AdminCourses from './tabs/AdminCourses';
import AdminSettings from './tabs/AdminSettings';
import AdminStudyGroups from './tabs/AdminStudyGroups';
import AdminWritingPractice from './tabs/AdminWritingPractice';
import AdminWeeklyMissions from './tabs/AdminWeeklyMissions';
import AdminTimerSubjects from './tabs/AdminTimerSubjects';
import AdminMentorSessions from './tabs/AdminMentorSessions';
import AdminDevices from './tabs/AdminDevices';
import AdminTests from './tabs/AdminTests';
import AdminLevels from './tabs/AdminLevels';
import AdminDiscipline from './tabs/AdminDiscipline';
import AdminSectionLocks from './tabs/AdminSectionLocks';
import AdminWebcamStudy from './tabs/AdminWebcamStudy';
import AdminMotivation from './tabs/AdminMotivation';
import AdminLevelGifts from './tabs/AdminLevelGifts';
import AdminPrivacySecurity from './tabs/AdminPrivacySecurity';
import AdminQuizzes from './tabs/AdminQuizzes';
import AdminCoachingStudy from './tabs/AdminCoachingStudy';
import AdminDeleteStudent from './tabs/AdminDeleteStudent';
import AdminPremiumAccess from './tabs/AdminPremiumAccess';
import AdminStreamRequests from './tabs/AdminStreamRequests';
import AdminManagement from './tabs/AdminManagement';
import AdminPushNotifications from './tabs/AdminPushNotifications';

import { 
  LayoutDashboard,  
  Users, 
  Lock, 
  BookOpenCheck,
  BookOpen,
  Layers,
  TrendingUp, 
  GraduationCap,
  Trophy, 
  Target, 
  Clock, 
  FileText, 
  HelpCircle, 
  Megaphone,
  MessageSquare, 
  Calendar, 
  Settings, 
  LogOut,
  ChevronRight,
  Shield,
  ShieldCheck,
  PenLine,
  Flag,
  Video,
  MonitorSmartphone,
  Award,
  ShieldAlert,
  Sparkles,
  Gift,
  RotateCcw,
  BrainCircuit,
  UserX,
  Crown,
  Bell
} from 'lucide-react';


export default function AdminDashboard() {
  const { userProfile, currentUser, logout, isOwner, hasPermission, adminDesignation } = useAuth();
  const { isEyeCare } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(() => searchParams.get('tab') || 'overview');
  const [pendingDoubtsCount, setPendingDoubtsCount] = useState(0);

  const TAB_PERMISSIONS = {
    overview: 'view_dashboard',
    admin_management: 'manage_admins',
    doubts: 'view_doubts',
    students: 'view_students',
    stream_requests: 'edit_students',
    premium_access: 'manage_premium',
    section_locks: 'manage_access_locks',
    discipline: 'manage_discipline',
    syllabus: 'manage_syllabus',
    syllabus_manager: 'manage_syllabus',
    chapters_units: 'manage_units',
    revision_manager: 'manage_revision',
    analytics: 'view_dashboard',
    leaderboard: 'view_dashboard',
    targets: 'view_dashboard',
    coaching_study: 'manage_coaching',
    tests: 'manage_tests',
    levels: 'manage_levels',
    level_gifts: 'manage_levels',
    writing_practice: 'manage_writing',
    missions: 'view_dashboard',
    sessions: 'view_dashboard',
    webcam_study: 'manage_webcam',
    mentor_sessions: 'manage_webcam',
    timer_subjects: 'manage_courses',
    notes: 'view_dashboard',
    announcements: 'view_announcements',
    push_notifications: 'view_announcements',
    motivation: 'view_dashboard',
    feedback: 'view_dashboard',
    study_groups: 'view_dashboard',
    courses: 'manage_courses',
    devices: 'view_students',
    settings: 'manage_admins',
    privacy: 'manage_admins',
    quizzes: 'create_quiz',
    delete_student: 'delete_students'
  };

  const canAccessTab = (tabId) => {
    if (isOwner) return true;
    if (tabId === 'admin_management' || tabId === 'settings' || tabId === 'privacy') {
      return isOwner;
    }
    const reqPerm = TAB_PERMISSIONS[tabId];
    if (!reqPerm) return true;
    return typeof hasPermission === 'function' ? hasPermission(reqPerm) : true;
  };

  const setActiveTab = (tabId) => {
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

  useEffect(() => {
    const q = query(collection(db, 'doubts'));
    const unsub = onSnapshot(q, (snapshot) => {
      const count = snapshot.docs.filter(d => {
        const data = d.data();
        const st = (data.status || '').toLowerCase().trim();
        return (st === 'new' || st === 'in review' || st === 'open') && !data.reply;
      }).length;
      setPendingDoubtsCount(count);
    }, (err) => console.error("Error listening to pending doubts count:", err));

    return () => unsub();
  }, []);

  const rawNavItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    ...(isOwner ? [{ id: 'admin_management', label: '🛡️ Admin Management', icon: ShieldCheck }] : []),
    { id: 'doubts', label: 'Doubt Management', icon: HelpCircle, badge: pendingDoubtsCount },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'stream_requests', label: '🎓 Stream Change Requests', icon: GraduationCap },
    { id: 'premium_access', label: '👑 Premium / Pro Access', icon: Crown },
    { id: 'section_locks', label: 'Section Access Control', icon: Lock },
    { id: 'discipline', label: 'Inactive / Discipline', icon: ShieldAlert },
    { id: 'syllabus', label: 'Student Progress', icon: BookOpenCheck },
    { id: 'syllabus_manager', label: 'Manage Syllabus', icon: Layers },
    { id: 'chapters_units', label: 'Chapters & Units', icon: BookOpen },
    { id: 'revision_manager', label: 'Revision Management', icon: RotateCcw },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'coaching_study', label: 'Coaching Study', icon: GraduationCap },
    { id: 'tests', label: 'Test Papers', icon: FileText },
    { id: 'levels', label: 'Levels & Badges', icon: Award },
    { id: 'level_gifts', label: 'Level Gifts', icon: Gift },
    { id: 'writing_practice', label: 'Writing Practice', icon: PenLine },
    { id: 'missions', label: 'Weekly Missions', icon: Flag },
    { id: 'sessions', label: 'Study Sessions', icon: Clock },
    { id: 'webcam_study', label: '🎥 Webcam Study Settings', icon: Video },
    { id: 'mentor_sessions', label: 'Mentor Sessions', icon: Video },
    { id: 'timer_subjects', label: 'Timer Subjects', icon: Clock },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'push_notifications', label: '🔔 Push Notifications', icon: Bell },
    { id: 'motivation', label: 'Motivation', icon: Sparkles },
    { id: 'feedback', label: 'Student Feedback', icon: MessageSquare },
    { id: 'study_groups', label: 'Study Groups', icon: Users },
    { id: 'courses', label: '🎯 Exam Dates & Courses', icon: Calendar },
    { id: 'devices', label: 'Device Activity', icon: MonitorSmartphone },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'quizzes', label: 'Manage Quizzes', icon: BrainCircuit },
    { id: 'delete_student', label: 'Delete Student Database', icon: UserX },
  ];

  const navItems = rawNavItems.filter(item => canAccessTab(item.id));

  return (
    <div className={`min-h-screen lg:h-screen lg:overflow-hidden flex flex-col selection:bg-emerald-500 selection:text-white ${isEyeCare ? 'bg-navy-950 text-slate-100' : 'bg-[#f0f7ff] text-slate-900 dashboard-theme-light'}`}>
      <Navbar />

      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        
        {/* Main Admin Layout: Sidebar + Workspace Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start lg:items-stretch lg:h-full lg:min-h-0">
          
          {/* Admin Sidebar Navigation (Desktop - Independent Scroll Container) */}
          <aside className="hidden lg:flex lg:flex-col lg:col-span-3 lg:h-full lg:min-h-0 lg:overflow-hidden">
            <div 
              className={`p-4 rounded-3xl space-y-2 shadow-xl border flex flex-col h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar ${
                isEyeCare ? 'glass-card border-emerald-500/30' : 'bg-white border-2 border-blue-200/90'
              }`}
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              
              {/* Admin Snapshot Header */}
              <div className={`p-4 rounded-2xl border space-y-1 mb-2 shrink-0 ${isEyeCare ? 'bg-navy-900/80 border-white/5' : 'bg-blue-50/80 border-blue-100'}`}>
                <div className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isEyeCare ? 'text-emerald-400' : 'text-blue-700'}`}>
                  {isOwner ? <Crown className="w-4 h-4 text-gold-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                  <span>{isOwner ? 'Super Admin / Owner' : (adminDesignation || 'Admin')}</span>
                </div>
                <div className={`text-sm font-extrabold truncate ${isEyeCare ? 'text-white' : 'text-slate-900'}`}>
                  {userProfile?.name || currentUser?.email}
                </div>
                <div className={`text-xs font-semibold ${isEyeCare ? 'text-slate-400' : 'text-slate-600'}`}>
                  {currentUser?.email}
                </div>
              </div>

              {/* Nav Items List */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? (isEyeCare ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-glow-emerald' : 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-500')
                          : (isEyeCare ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent' : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-transparent font-bold')
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? (isEyeCare ? 'text-emerald-400' : 'text-white') : (isEyeCare ? 'text-slate-400' : 'text-slate-600')}`} />
                        <span className="font-bold">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.badge > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-navy-950 font-black text-[10px] shadow-sm animate-pulse">
                            {item.badge} New
                          </span>
                        )}
                        {isActive && <ChevronRight className={`w-3.5 h-3.5 ${isEyeCare ? 'text-emerald-400' : 'text-white'}`} />}
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={logout}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors cursor-pointer ${isEyeCare ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50 font-bold'}`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>

            </div>
          </aside>

          {/* Mobile Drawer Bar */}
          <div className={`lg:hidden col-span-1 p-2 rounded-2xl border flex overflow-x-auto space-x-2 scrollbar-none ${isEyeCare ? 'glass-card border-white/10' : 'bg-white border-2 border-blue-200/90 shadow-sm'}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? (isEyeCare ? 'bg-emerald-600 text-white shadow-glow-emerald' : 'bg-blue-600 text-white shadow-sm font-bold')
                      : (isEyeCare ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50 font-bold')
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-navy-950 font-black text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Workspace Tab Rendering - Independent Scroll Container */}
          <main 
            className="col-span-1 lg:col-span-9 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain custom-scrollbar space-y-6 lg:pr-2"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {!canAccessTab(activeTab) ? (
              <div className="p-8 sm:p-12 rounded-3xl glass-card border border-red-500/40 text-center space-y-6 max-w-2xl mx-auto my-12 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-red-500/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center shadow-lg shadow-red-500/10">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">Access Denied: Permission Required</h2>
                  <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                    You do not have the required permission to access the <strong>{rawNavItems.find(n => n.id === activeTab)?.label || activeTab}</strong> section.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/5 text-xs text-slate-400 space-y-1 max-w-md mx-auto">
                  <div>Required Permission: <code className="text-amber-400 font-bold">{TAB_PERMISSIONS[activeTab] || 'Super Admin / Owner'}</code></div>
                  <div>Your Assigned Title: <strong className="text-sky-300">{adminDesignation || 'Admin'}</strong></div>
                </div>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg"
                >
                  Return to Dashboard Overview
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && <AdminOverview setActiveTab={setActiveTab} />}
                {activeTab === 'admin_management' && <AdminManagement />}
                {activeTab === 'students' && <AdminStudents />}
                {activeTab === 'stream_requests' && <AdminStreamRequests />}
                {activeTab === 'premium_access' && <AdminPremiumAccess />}
                {activeTab === 'section_locks' && <AdminSectionLocks />}
                {activeTab === 'discipline' && <AdminDiscipline />}
                {activeTab === 'syllabus' && <AdminSyllabus />}
                {activeTab === 'syllabus_manager' && <AdminSyllabusManager />}
                {activeTab === 'chapters_units' && <AdminChaptersUnits />}
                {activeTab === 'revision_manager' && <AdminRevisionManager />}
                {activeTab === 'analytics' && <AdminAnalytics />}
                {activeTab === 'leaderboard' && <AdminLeaderboard />}
                {activeTab === 'targets' && <AdminTargets />}
                {activeTab === 'coaching_study' && <AdminCoachingStudy />}
                {activeTab === 'tests' && <AdminTests />}
                {activeTab === 'levels' && <AdminLevels />}
                {activeTab === 'level_gifts' && <AdminLevelGifts />}
                {activeTab === 'writing_practice' && <AdminWritingPractice />}
                { activeTab === 'missions' && <AdminWeeklyMissions /> }
                { activeTab === 'sessions' && <AdminSessions /> }
                { activeTab === 'webcam_study' && <AdminWebcamStudy /> }
                { activeTab === 'mentor_sessions' && <AdminMentorSessions /> }
                { activeTab === 'timer_subjects' && <AdminTimerSubjects /> }
                { activeTab === 'notes' && <AdminNotes /> }
                {activeTab === 'doubts' && <AdminDoubts />}
                {activeTab === 'announcements' && <AdminAnnouncements />}
                {activeTab === 'push_notifications' && <AdminPushNotifications />}
                {activeTab === 'motivation' && <AdminMotivation />}
                {activeTab === 'feedback' && <AdminFeedback />}
                {activeTab === 'study_groups' && <AdminStudyGroups />}
                {activeTab === 'courses' && <AdminCourses />}
                {activeTab === 'devices' && <AdminDevices />}
                {activeTab === 'settings' && <AdminSettings />}
                {activeTab === 'privacy' && <AdminPrivacySecurity />}
                {activeTab === 'quizzes' && <AdminQuizzes />}
                {activeTab === 'delete_student' && <AdminDeleteStudent />}
              </>
            )}

            {/* Footer */}
            <Footer />
          </main>

        </div>

      </div>

    </div>
  );
}
