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
  Crown
} from 'lucide-react';


export default function AdminDashboard() {
  const { userProfile, currentUser, logout } = useAuth();
  const { isEyeCare } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(() => searchParams.get('tab') || 'overview');
  const [pendingDoubtsCount, setPendingDoubtsCount] = useState(0);

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

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
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
    { id: 'motivation', label: 'Motivation', icon: Sparkles },
    { id: 'feedback', label: 'Student Feedback', icon: MessageSquare },
    { id: 'study_groups', label: 'Study Groups', icon: Users },
    { id: 'courses', label: 'Courses & Attempts', icon: Calendar },
    { id: 'devices', label: 'Device Activity', icon: MonitorSmartphone },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'quizzes', label: 'Manage Quizzes', icon: BrainCircuit },
    { id: 'delete_student', label: 'Delete Student Database', icon: UserX },
  ];

  return (
    <div className={`min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white ${isEyeCare ? 'bg-navy-950 text-slate-100' : 'bg-[#f0f7ff] text-slate-900'}`}>
      <Navbar />

      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Main Admin Layout: Sidebar + Workspace Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Admin Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 space-y-4">
            <div className={`p-4 rounded-3xl space-y-2 shadow-xl border ${isEyeCare ? 'glass-card border-emerald-500/30' : 'bg-white border-2 border-blue-200/90'}`}>
              
              {/* Admin Snapshot Header */}
              <div className={`p-4 rounded-2xl border space-y-1 mb-2 ${isEyeCare ? 'bg-navy-900/80 border-white/5' : 'bg-blue-50/80 border-blue-100'}`}>
                <div className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isEyeCare ? 'text-emerald-400' : 'text-blue-700'}`}>
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  <span>Admin Panel</span>
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

          {/* Workspace Tab Rendering */}
          <main className="col-span-1 lg:col-span-9 space-y-6">
            {activeTab === 'overview' && <AdminOverview setActiveTab={setActiveTab} />}
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
            {activeTab === 'motivation' && <AdminMotivation />}
            {activeTab === 'feedback' && <AdminFeedback />}
            {activeTab === 'study_groups' && <AdminStudyGroups />}
            {activeTab === 'courses' && <AdminCourses />}
            {activeTab === 'devices' && <AdminDevices />}
            {activeTab === 'settings' && <AdminSettings />}
            {activeTab === 'privacy' && <AdminPrivacySecurity />}
            {activeTab === 'quizzes' && <AdminQuizzes />}
            {activeTab === 'delete_student' && <AdminDeleteStudent />}
          </main>

        </div>

      </div>

      <Footer />
    </div>
  );
}
