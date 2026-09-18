import React, { useState } from 'react';
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

import { 
  LayoutDashboard, 
  BookOpenCheck,
  Trophy, 
  Clock, 
  Target, 
  Flag,
  FileText, 
  HelpCircle, 
  User, 
  LogOut,
  ChevronRight,
  Sparkles,
  PenLine
} from 'lucide-react';

import CountdownWidget from '../components/CountdownWidget';

export default function Dashboard() {
  const { userProfile, currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'syllabus', label: 'Syllabus & Progress', icon: BookOpenCheck },
    { id: 'leaderboard', label: 'Live Leaderboard', icon: Trophy },
    { id: 'timer', label: 'Study Timer', icon: Clock },
    { id: 'writing', label: 'Writing Practice', icon: PenLine },
    { id: 'missions', label: 'Weekly Mission', icon: Flag },
    { id: 'targets', label: 'Self-Managed Hub', icon: Target },
    { id: 'notes', label: 'Notes & Resources', icon: FileText },
    { id: 'doubts', label: 'Academic Doubts', icon: HelpCircle },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      <Navbar />

      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Exam Countdown Banner */}
        <CountdownWidget />

        {/* Main Dashboard Layout: Sidebar + View Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 space-y-4">
            <div className="p-4 rounded-3xl glass-card border border-white/10 space-y-2 shadow-xl">
              
              {/* User Snapshot Header */}
              <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 space-y-1 mb-2">
                <div className="text-sm font-bold text-white truncate">
                  {userProfile?.name || currentUser?.email}
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

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-glow-emerald'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Log Out</span>
                </button>
              </div>

            </div>
          </aside>

          {/* Mobile Tab Bar */}
          <div className="lg:hidden col-span-1 glass-card p-2 rounded-2xl border border-white/10 flex overflow-x-auto space-x-2 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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

          {/* Main Dashboard Workspace View */}
          <main className="col-span-1 lg:col-span-9 space-y-6">
            {activeTab === 'overview' && <Overview setActiveTab={setActiveTab} />}
            {activeTab === 'syllabus' && <Syllabus />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'timer' && <StudyTimer />}
            {activeTab === 'writing' && <WritingPractice />}
            {activeTab === 'missions' && <WeeklyMissions />}
            {activeTab === 'targets' && <Targets />}
            {activeTab === 'notes' && <Notes />}
            {activeTab === 'doubts' && <Doubts />}
            {activeTab === 'profile' && <Profile />}
          </main>

        </div>

      </div>

      <Footer />
    </div>
  );
}
