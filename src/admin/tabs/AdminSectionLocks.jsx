import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Edit3, 
  X, 
  Check, 
  Wrench,
  LayoutDashboard,
  Megaphone,
  Calendar,
  BookOpenCheck,
  Trophy,
  Clock,
  Video,
  PenLine,
  Flag,
  Target,
  FileText,
  HelpCircle,
  User,
  Info
} from 'lucide-react';
import { DASHBOARD_SECTIONS, DEFAULT_MAINTENANCE_MESSAGE } from '../../config/dashboardSections';
import { useSectionLocks } from '../../hooks/useSectionLocks';

// Dynamic icon mapper for section cards
const ICON_MAP = {
  LayoutDashboard,
  Megaphone,
  Calendar,
  BookOpenCheck,
  Trophy,
  Clock,
  Video,
  PenLine,
  Flag,
  Target,
  FileText,
  HelpCircle,
  User,
  Layers
};

export default function AdminSectionLocks() {
  const { 
    locks, 
    loading, 
    isSectionLocked, 
    getSectionLock, 
    toggleSectionLock, 
    setSectionLock,
    setBulkSectionLocks 
  } = useSectionLocks();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'locked', 'unlocked'
  const [editingReasonSection, setEditingReasonSection] = useState(null);
  const [customReasonText, setCustomReasonText] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(null); // 'lock_all' | 'unlock_all' | null
  const [togglingId, setTogglingId] = useState(null);

  const notify = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 3500);
  };

  const handleToggle = async (section) => {
    try {
      setTogglingId(section.id);
      const isCurrentlyLocked = isSectionLocked(section.id);
      await toggleSectionLock(section.id);
      notify(`${section.label} is now ${isCurrentlyLocked ? '🔓 Unlocked' : '🔒 Locked'}`);
    } catch (err) {
      console.error('Failed to toggle lock:', err);
      alert('Failed to update section lock. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveReason = async (e) => {
    e.preventDefault();
    if (!editingReasonSection) return;

    try {
      await setSectionLock(editingReasonSection.id, true, customReasonText.trim());
      notify(`Custom maintenance message saved for ${editingReasonSection.label}`);
      setEditingReasonSection(null);
    } catch (err) {
      console.error('Failed to save reason:', err);
      alert('Failed to save reason. Please try again.');
    }
  };

  const openReasonEditor = (section) => {
    const currentLock = getSectionLock(section.id);
    setEditingReasonSection(section);
    setCustomReasonText(currentLock?.reason || DEFAULT_MAINTENANCE_MESSAGE);
  };

  const handleBulkAction = async () => {
    if (!showBulkConfirmModal) return;
    try {
      if (showBulkConfirmModal === 'lock_all') {
        await setBulkSectionLocks(true);
        notify('🔒 All dashboard sections have been Locked.');
      } else {
        await setBulkSectionLocks(false);
        notify('🔓 All dashboard sections have been Unlocked.');
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      alert('Failed to execute bulk action.');
    } finally {
      setShowBulkConfirmModal(null);
    }
  };

  // Stats calculation
  const totalSections = DASHBOARD_SECTIONS.length;
  const lockedCount = DASHBOARD_SECTIONS.filter(s => isSectionLocked(s.id)).length;
  const unlockedCount = totalSections - lockedCount;

  // Filtered sections
  const filteredSections = DASHBOARD_SECTIONS.filter(s => {
    const matchesSearch = s.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const isLocked = isSectionLocked(s.id);
    if (!matchesSearch) return false;

    if (filter === 'locked') return isLocked;
    if (filter === 'unlocked') return !isLocked;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            <Lock className="w-3.5 h-3.5" />
            <span>Real-Time Maintenance & Guard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Section Access <span className="gold-gradient-text">Control</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Lock or unlock any student dashboard section in real-time. Locked sections immediately display a maintenance screen to students without requiring code redeployment.
          </p>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center gap-3 text-white text-sm font-bold animate-in slide-in-from-top duration-300 shadow-glow-emerald">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Stats & Quick Actions Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl glass-card border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Sections</div>
            <div className="text-2xl font-black text-white mt-0.5">{totalSections}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-slate-300">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl glass-card border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Active (Unlocked)</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">{unlockedCount}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Unlock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl glass-card border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">Maintenance (Locked)</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{lockedCount}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl glass-card border border-white/5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dashboard sections..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {[
            { id: 'all', label: `All (${totalSections})` },
            { id: 'unlocked', label: `Unlocked (${unlockedCount})` },
            { id: 'locked', label: `Locked (${lockedCount})` }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filter === f.id
                  ? 'bg-amber-500 text-navy-950 font-black shadow-md'
                  : 'bg-navy-900 text-slate-400 border border-white/5 hover:bg-navy-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Bulk Emergency Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowBulkConfirmModal('unlock_all')}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Unlock all dashboard sections"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock All</span>
          </button>

          <button
            onClick={() => setShowBulkConfirmModal('lock_all')}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Lock all dashboard sections"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock All</span>
          </button>
        </div>
      </div>

      {/* Sections List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span>Synchronizing section locks...</span>
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm glass-card rounded-3xl border border-white/5">
          No sections match your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSections.map((section) => {
            const isLocked = isSectionLocked(section.id);
            const lockInfo = getSectionLock(section.id);
            const Icon = ICON_MAP[section.iconName] || Layers;
            const isToggling = togglingId === section.id;

            return (
              <div
                key={section.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  isLocked 
                    ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.06)]' 
                    : 'bg-navy-900 border-white/5 hover:border-white/15'
                }`}
              >
                <div>
                  {/* Card Header: Icon, Name, Category & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isLocked 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-white/5 text-slate-300 border border-white/10'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{section.label}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-navy-950 text-slate-400 border border-white/5">
                            {section.id}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{section.category}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
                      isLocked 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {isLocked ? (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>🔒 Locked</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" />
                          <span>🔓 Unlocked</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section Description */}
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                    {section.description}
                  </p>

                  {/* Maintenance Reason Preview (if locked) */}
                  {isLocked && (
                    <div className="p-3 rounded-2xl bg-navy-950/80 border border-amber-500/20 mb-4 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          <span>Active Maintenance Notice:</span>
                        </span>
                        <button
                          onClick={() => openReasonEditor(section)}
                          className="hover:underline flex items-center gap-0.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 italic">
                        "{lockInfo?.reason || DEFAULT_MAINTENANCE_MESSAGE}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Action Controls */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    {isLocked ? (
                      <span className="text-amber-400/90 font-medium">Students blocked from opening</span>
                    ) : (
                      <span className="text-emerald-400/90 font-medium">Normal student access</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isLocked && (
                      <button
                        onClick={() => openReasonEditor(section)}
                        className="p-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
                        title="Edit Maintenance Message"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Simple Lock / Unlock Toggle Button */}
                    <button
                      onClick={() => handleToggle(section)}
                      disabled={isToggling}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        isLocked
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 shadow-sm'
                          : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 shadow-sm'
                      }`}
                    >
                      {isToggling ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlock Section</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock Section</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Maintenance Message Modal */}
      {editingReasonSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl glass-card border border-amber-500/30 bg-navy-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Edit Maintenance Notice</h3>
              </div>
              <button
                onClick={() => setEditingReasonSection(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Set the message students will see when they click on <strong className="text-white">{editingReasonSection.label}</strong>.
            </p>

            <form onSubmit={handleSaveReason} className="space-y-4">
              <textarea
                rows={4}
                required
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                placeholder="Enter custom maintenance note for students..."
                className="w-full p-3.5 rounded-2xl bg-navy-950 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/50 transition-colors leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCustomReasonText(DEFAULT_MAINTENANCE_MESSAGE)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReasonSection(null)}
                  className="px-4 py-2 rounded-xl bg-navy-800 text-slate-300 text-xs font-bold hover:bg-navy-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 text-xs font-black shadow-md cursor-pointer"
                >
                  Save Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl bg-navy-900 border border-amber-500/40 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {showBulkConfirmModal === 'lock_all' ? 'Lock All Sections?' : 'Unlock All Sections?'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {showBulkConfirmModal === 'lock_all'
                  ? 'All student dashboard sections will immediately be placed under maintenance mode.'
                  : 'All student dashboard sections will immediately be accessible to all students.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowBulkConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAction}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  showBulkConfirmModal === 'lock_all'
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-navy-950'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
