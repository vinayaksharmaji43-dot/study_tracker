import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

import AdminOverview from './tabs/AdminOverview';
import AdminStudents from './tabs/AdminStudents';
import AdminSyllabus from './tabs/AdminSyllabus';
import AdminSyllabusManager from './tabs/AdminSyllabusManager';
import AdminAnalytics from './tabs/AdminAnalytics';
import AdminLeaderboard from './tabs/AdminLeaderboard';
import AdminTargets from './tabs/AdminTargets';
import AdminSessions from './tabs/AdminSessions';
import AdminNotes from './tabs/AdminNotes';
import AdminDoubts from './tabs/AdminDoubts';
import AdminAnnouncements from './tabs/AdminAnnouncements';
import AdminCourses from './tabs/AdminCourses';
import AdminSettings from './tabs/AdminSettings';
import AdminWritingPractice from './tabs/AdminWritingPractice';

import { 
  LayoutDashboard, 
  Users, 
  BookOpenCheck,
  Layers,
  TrendingUp, 
  Trophy, 
  Target, 
  Clock, 
  FileText, 
  HelpCircle, 
  Megaphone, 
  Calendar, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  PenLine
} from 'lucide-react';

export default function AdminDashboard() {
  const { userProfile, currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'syllabus', label: 'Student Progress', icon: BookOpenCheck },
    { id: 'syllabus_manager', label: 'Manage Syllabus', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'writing_practice', label: 'Writing Practice', icon: PenLine },
    { id: 'sessions', label: 'Study Sessions', icon: Clock },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'doubts', label: 'Doubts', icon: HelpCircle },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'courses', label: 'Courses & Attempts', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      <Navbar />

      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Main Admin Layout: Sidebar + Workspace Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Admin Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 space-y-4">
            <div className="p-4 rounded-3xl glass-card border border-emerald-500/30 space-y-2 shadow-xl">
              
              {/* Admin Snapshot Header */}
              <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 space-y-1 mb-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  <span>Admin Panel</span>
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {userProfile?.name || currentUser?.email}
                </div>
                <div className="text-[11px] text-slate-400">
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
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-glow-emerald'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>

            </div>
          </aside>

          {/* Mobile Drawer Bar */}
          <div className="lg:hidden col-span-1 glass-card p-2 rounded-2xl border border-white/10 flex overflow-x-auto space-x-2 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-glow-emerald'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Workspace Tab Rendering */}
          <main className="col-span-1 lg:col-span-9 space-y-6">
            {activeTab === 'overview' && <AdminOverview setActiveTab={setActiveTab} />}
            {activeTab === 'students' && <AdminStudents />}
            {activeTab === 'syllabus' && <AdminSyllabus />}
            {activeTab === 'syllabus_manager' && <AdminSyllabusManager />}
            {activeTab === 'analytics' && <AdminAnalytics />}
            {activeTab === 'leaderboard' && <AdminLeaderboard />}
            {activeTab === 'targets' && <AdminTargets />}
            {activeTab === 'writing_practice' && <AdminWritingPractice />}
            {activeTab === 'sessions' && <AdminSessions />}
            {activeTab === 'notes' && <AdminNotes />}
            {activeTab === 'doubts' && <AdminDoubts />}
            {activeTab === 'announcements' && <AdminAnnouncements />}
            {activeTab === 'courses' && <AdminCourses />}
            {activeTab === 'settings' && <AdminSettings />}
          </main>

        </div>

      </div>

      <Footer />
    </div>
  );
}
