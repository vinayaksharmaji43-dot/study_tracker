import React, { useState } from 'react';
import { 
  MoreVertical,
  X,
  Clock,
  PenLine,
  Flag,
  Video,
  LayoutDashboard,
  BookOpenCheck,
  Trophy,
  Medal,
  Target,
  FileText,
  HelpCircle,
  User,
  Crown,
  Headphones,
  Calendar as CalendarIcon
} from 'lucide-react';
import SupportModal from './SupportModal';

export default function MobileMenuFAB({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'syllabus', label: 'Syllabus', icon: BookOpenCheck },
    { id: 'timer', label: 'Study Timer', icon: Clock },
    { id: 'writing', label: 'Writing Practice', icon: PenLine },
    { id: 'missions', label: 'Weekly Mission', icon: Flag },
    { id: 'mentor', label: 'Mentor Session', icon: Video },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'overall_leaderboard', label: 'All Students', icon: Medal },
    { id: 'targets', label: 'Daily Target', icon: Target },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'doubts', label: 'Doubts', icon: HelpCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const quickJoinItems = [
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
    { id: 'timer', label: 'Study Timer', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/20' },
    { id: 'writing', label: 'Writing Practice', icon: PenLine, color: 'text-purple-400', bg: 'bg-purple-400/20' },
    { id: 'mentor', label: 'Mentor Session', icon: Video, color: 'text-sky-400', bg: 'bg-sky-400/20' }
  ];

  const handleNav = (id) => {
    setActiveTab(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-emerald-500 text-navy-950 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 transition-transform"
        >
          <MoreVertical className="w-7 h-7" />
        </button>
      </div>

      {/* Background Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-navy-950/80 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bottom Sheet Menu */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[101] bg-navy-900 border-t border-white/10 rounded-t-3xl transition-transform duration-300 ease-out transform md:hidden ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } max-h-[85vh] overflow-y-auto custom-scrollbar`}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Menu</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Join */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>⚡ Quick Join</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickJoinItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-navy-950 border border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* All Features */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Features</h3>
            <div className="grid grid-cols-1 gap-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl text-sm font-semibold transition-colors ${
                      isActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-transparent text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSupportModal(true);
                }}
                className="flex items-center gap-3 w-full p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-sky-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-bold shadow-sm hover:opacity-95"
              >
                <Headphones className="w-5 h-5 text-emerald-400" />
                <div className="flex-1 text-left">Help & Student Support</div>
                <span className="text-[10px] font-black uppercase bg-emerald-500 text-navy-950 px-2 py-0.5 rounded-md">24/7</span>
              </button>

              <button
                disabled
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-transparent text-gold-400/70 border border-gold-500/10 text-sm font-semibold"
              >
                <Crown className="w-5 h-5" />
                <div className="flex-1 text-left">Premium</div>
                <span className="text-[9px] font-bold uppercase bg-gold-500/20 px-2 py-0.5 rounded-md">Coming Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Support Modal */}
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </>
  );
}
