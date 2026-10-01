import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Sparkles, 
  Award, 
  Crown, 
  Layers, 
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Check
} from 'lucide-react';

const DEFAULT_CONFIG = {
  ca: {
    foundation: ['January 2027', 'May 2027', 'September 2027'],
    intermediate: ['January 2027', 'May 2027', 'September 2027'],
    final: ['May 2027', 'November 2027']
  },
  cma: {
    foundation: ['June 2027', 'December 2027'],
    intermediate: ['June 2027', 'December 2027'],
    final: ['June 2027', 'December 2027']
  }
};

export default function AdminCourses() {
  const [activeTab, setActiveTab] = useState('ca'); // 'ca' | 'cma' | 'all'
  
  // CA Levels State
  const [caFoundation, setCaFoundation] = useState(DEFAULT_CONFIG.ca.foundation);
  const [caIntermediate, setCaIntermediate] = useState(DEFAULT_CONFIG.ca.intermediate);
  const [caFinal, setCaFinal] = useState(DEFAULT_CONFIG.ca.final);

  // CMA Levels State
  const [cmaFoundation, setCmaFoundation] = useState(DEFAULT_CONFIG.cma.foundation);
  const [cmaIntermediate, setCmaIntermediate] = useState(DEFAULT_CONFIG.cma.intermediate);
  const [cmaFinal, setCmaFinal] = useState(DEFAULT_CONFIG.cma.final);

  // Input states for adding new attempts to each level
  const [inputs, setInputs] = useState({
    ca_foundation: '',
    ca_intermediate: '',
    ca_final: '',
    cma_foundation: '',
    cma_intermediate: '',
    cma_final: ''
  });

  const [savingKey, setSavingKey] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSynced, setIsSynced] = useState(false);

  // Real-time listener from Firestore `settings/courses`
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'courses'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // 1. CA Foundation
        if (Array.isArray(data.caFoundationAttempts)) {
          setCaFoundation(data.caFoundationAttempts);
        } else if (Array.isArray(data.ca?.foundation)) {
          setCaFoundation(data.ca.foundation);
        }

        // 2. CA Intermediate
        if (Array.isArray(data.caIntermediateAttempts)) {
          setCaIntermediate(data.caIntermediateAttempts);
        } else if (Array.isArray(data.ca?.intermediate)) {
          setCaIntermediate(data.ca.intermediate);
        }

        // 3. CA Final
        if (Array.isArray(data.caFinalAttempts)) {
          setCaFinal(data.caFinalAttempts);
        } else if (Array.isArray(data.ca?.final)) {
          setCaFinal(data.ca.final);
        }

        // 4. CMA Foundation
        if (Array.isArray(data.cmaFoundationAttempts)) {
          setCmaFoundation(data.cmaFoundationAttempts);
        } else if (Array.isArray(data.cma?.foundation)) {
          setCmaFoundation(data.cma.foundation);
        } else if (Array.isArray(data.cmaAttempts)) {
          setCmaFoundation(data.cmaAttempts);
        }

        // 5. CMA Intermediate
        if (Array.isArray(data.cmaIntermediateAttempts)) {
          setCmaIntermediate(data.cmaIntermediateAttempts);
        } else if (Array.isArray(data.cma?.intermediate)) {
          setCmaIntermediate(data.cma.intermediate);
        }

        // 6. CMA Final
        if (Array.isArray(data.cmaFinalAttempts)) {
          setCmaFinal(data.cmaFinalAttempts);
        } else if (Array.isArray(data.cma?.final)) {
          setCmaFinal(data.cma.final);
        }
      }
      setIsSynced(true);
    }, (err) => {
      console.error("Courses configuration listener error:", err);
      setIsSynced(false);
    });

    return () => unsub();
  }, []);

  const getList = (courseKey, levelKey) => {
    if (courseKey === 'ca') {
      if (levelKey === 'foundation') return caFoundation;
      if (levelKey === 'intermediate') return caIntermediate;
      if (levelKey === 'final') return caFinal;
    } else {
      if (levelKey === 'foundation') return cmaFoundation;
      if (levelKey === 'intermediate') return cmaIntermediate;
      if (levelKey === 'final') return cmaFinal;
    }
    return [];
  };

  const handleInputChange = (courseKey, levelKey, value) => {
    const key = `${courseKey}_${levelKey}`;
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleAddAttempt = async (courseKey, levelKey, presetValue = null) => {
    const key = `${courseKey}_${levelKey}`;
    const valueToAdd = (presetValue || inputs[key] || '').trim();

    if (!valueToAdd) {
      setErrorMsg('Please enter an attempt name (e.g. May 2028).');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const currentList = getList(courseKey, levelKey);

    // Prevent duplicate attempt names (case-insensitive check)
    if (currentList.some(item => item.toLowerCase() === valueToAdd.toLowerCase())) {
      setErrorMsg(`"${valueToAdd}" is already configured for ${courseKey.toUpperCase()} ${levelKey.toUpperCase()}.`);
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const updatedList = [...currentList, valueToAdd];
    await persistCourseConfig(courseKey, levelKey, updatedList, `Added "${valueToAdd}" to ${courseKey.toUpperCase()} ${levelKey.toUpperCase()}`);
    setInputs(prev => ({ ...prev, [key]: '' }));
  };

  const handleRemoveAttempt = async (courseKey, levelKey, attemptToRemove) => {
    const courseTitle = courseKey.toUpperCase();
    const levelTitle = levelKey.charAt(0).toUpperCase() + levelKey.slice(1);

    if (!window.confirm(`Are you sure you want to remove "${attemptToRemove}" from ${courseTitle} ${levelTitle}?`)) {
      return;
    }

    const currentList = getList(courseKey, levelKey);
    const updatedList = currentList.filter(item => item !== attemptToRemove);

    await persistCourseConfig(courseKey, levelKey, updatedList, `Removed "${attemptToRemove}" from ${courseTitle} ${levelTitle}`);
  };

  const persistCourseConfig = async (courseKey, levelKey, updatedList, successNotice) => {
    const key = `${courseKey}_${levelKey}`;
    setSavingKey(key);
    setErrorMsg('');

    try {
      // Map keys to specific field names
      const fieldMap = {
        'ca_foundation': 'caFoundationAttempts',
        'ca_intermediate': 'caIntermediateAttempts',
        'ca_final': 'caFinalAttempts',
        'cma_foundation': 'cmaFoundationAttempts',
        'cma_intermediate': 'cmaIntermediateAttempts',
        'cma_final': 'cmaFinalAttempts'
      };

      const targetField = fieldMap[key];

      // Update both top-level and nested structure for compatibility
      const payload = {
        [targetField]: updatedList,
        [`${courseKey}.${levelKey}`]: updatedList
      };

      // Maintain legacy cmaAttempts / caAttempts lists for backward compatibility
      if (courseKey === 'cma') {
        const foundationList = levelKey === 'foundation' ? updatedList : cmaFoundation;
        const interList = levelKey === 'intermediate' ? updatedList : cmaIntermediate;
        const finalList = levelKey === 'final' ? updatedList : cmaFinal;
        payload.cmaAttempts = Array.from(new Set([...foundationList, ...interList, ...finalList]));
      } else {
        const foundationList = levelKey === 'foundation' ? updatedList : caFoundation;
        const interList = levelKey === 'intermediate' ? updatedList : caIntermediate;
        const finalList = levelKey === 'final' ? updatedList : caFinal;
        payload.caAttempts = Array.from(new Set([...foundationList, ...interList, ...finalList]));
      }

      await setDoc(doc(db, 'settings', 'courses'), payload, { merge: true });

      setSuccessMsg(successNotice);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error saving course attempt configuration:", err);
      setErrorMsg('Failed to save attempt configuration: ' + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  // Preset suggestions for rapid configuration
  const quickSuggestions = {
    ca: ['January 2028', 'May 2028', 'September 2028', 'November 2028'],
    cma: ['June 2028', 'December 2028', 'June 2029', 'December 2029']
  };

  // Helper renderer for a single level card
  const renderLevelCard = (courseKey, levelKey, title, subtitle, icon, theme) => {
    const list = getList(courseKey, levelKey);
    const key = `${courseKey}_${levelKey}`;
    const isSaving = savingKey === key;
    const inputValue = inputs[key] || '';
    const IconComponent = icon;

    return (
      <div className={`p-6 sm:p-7 rounded-3xl glass-card border ${theme.border} space-y-6 shadow-xl relative overflow-hidden flex flex-col justify-between`}>
        
        {/* Glow */}
        <div className={`absolute top-0 right-0 w-48 h-48 ${theme.bgGlow} rounded-full blur-3xl pointer-events-none`} />

        <div className="space-y-5 relative z-10">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className={`w-12 h-12 rounded-2xl ${theme.badgeBg} border ${theme.badgeBorder} flex items-center justify-center ${theme.iconColor} shadow-md`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{title}</h3>
                <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${theme.badgeBg} ${theme.textColor} border ${theme.badgeBorder}`}>
              {list.length} {list.length === 1 ? 'Attempt' : 'Attempts'}
            </span>
          </div>

          {/* Quick Add Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAddAttempt(courseKey, levelKey); }}
            className="space-y-2 pt-2 border-t border-white/10"
          >
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Add New Exam Attempt
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. May 2028 or Jan 2028"
                value={inputValue}
                onChange={(e) => handleInputChange(courseKey, levelKey, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-900/90 border border-white/10 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
              <button
                type="submit"
                disabled={isSaving || !inputValue.trim()}
                className={`px-4 py-2.5 rounded-xl ${theme.btnBg} ${theme.btnText} text-xs font-black transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.02] shadow-md`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Adding...' : 'Add'}</span>
              </button>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-semibold text-slate-400 shrink-0">Quick Add:</span>
              {quickSuggestions[courseKey].map((sug) => {
                const alreadyExists = list.some(item => item.toLowerCase() === sug.toLowerCase());
                if (alreadyExists) return null;

                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleAddAttempt(courseKey, levelKey, sug)}
                    disabled={isSaving}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold border border-white/5 transition-all shrink-0 cursor-pointer"
                  >
                    +{sug}
                  </button>
                );
              })}
            </div>
          </form>

          {/* Active Attempts List */}
          <div className="space-y-2.5 pt-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Configured Active Attempts</span>
              <span className="text-[10px] text-slate-400 normal-case">(Click trash icon to remove)</span>
            </div>

            {list.length === 0 ? (
              <div className="p-4 rounded-xl bg-navy-900/40 border border-white/5 text-center text-xs text-slate-400">
                No exam attempts configured yet. Add one above.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {list.map((att) => (
                  <div 
                    key={att} 
                    className="p-3 rounded-xl bg-navy-900/80 border border-white/10 flex items-center justify-between hover:border-white/20 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${theme.badgeBg} flex items-center justify-center ${theme.iconColor}`}>
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-white tracking-wide">
                        {att}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttempt(courseKey, levelKey, att)}
                        disabled={isSaving}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={`Remove ${att}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Level Footer Note */}
        <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 mt-4 flex items-center justify-between">
          <span>Synced with student streams & announcements</span>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
              <Calendar className="w-3.5 h-3.5 text-royal-400" />
              <span>Academic Stream & Attempt Master Config</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Courses & Exam <span className="gold-gradient-text">Attempts Configuration</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Configure and manage active examination attempts dynamically for <strong>CA Foundation, CA Intermediate, CA Final</strong>, and <strong>CMA Foundation, CMA Intermediate, CMA Final</strong>.
            </p>
          </div>

          {/* Sync Status Badge */}
          <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 shrink-0 text-center sm:text-right space-y-1">
            <div className="flex items-center justify-center sm:justify-end gap-2 text-xs font-bold">
              <span className={`w-2.5 h-2.5 rounded-full ${isSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={isSynced ? 'text-emerald-400' : 'text-amber-400'}>
                {isSynced ? 'Firestore Live Sync: Active' : 'Connecting to Firestore...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Database: <code className="text-slate-300">settings/courses</code>
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-glow-emerald">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Course Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl glass-card border border-white/10">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          
          {/* CA Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('ca')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ca'
                ? 'bg-gradient-to-r from-royal-600 to-sky-600 text-white shadow-glow-royal scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Chartered Accountancy (CA)</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold ml-1">
              3 Levels
            </span>
          </button>

          {/* CMA Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('cma')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'cma'
                ? 'bg-gradient-to-r from-amber-500 to-gold-500 text-navy-950 shadow-glow-gold scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Cost & Management (CMA)</span>
            <span className="px-2 py-0.5 rounded-full bg-navy-950/20 text-navy-950 text-[10px] font-extrabold ml-1">
              3 Levels
            </span>
          </button>

          {/* View All Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`hidden md:flex px-5 py-3 rounded-xl font-black text-xs sm:text-sm items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-emerald-500 text-navy-950 shadow-glow-emerald scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Courses View</span>
          </button>

        </div>

        {/* Quick Instructions Hint */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pr-3">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>Add or remove exam attempts for any level. Changes save immediately.</span>
        </div>
      </div>

      {/* CA SECTION (Foundation, Intermediate, Final) */}
      {(activeTab === 'ca' || activeTab === 'all') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 rounded-full bg-royal-500 inline-block" />
              <h2 className="text-xl font-black text-white">ICAI CA Examination Streams</h2>
            </div>
            <span className="text-xs font-bold text-royal-400">Foundation • Intermediate • Final</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. CA Foundation */}
            {renderLevelCard(
              'ca',
              'foundation',
              'CA Foundation',
              'Entry Level Examination Cycles',
              BookOpen,
              {
                border: 'border-sky-500/30 hover:border-sky-500/60',
                bgGlow: 'bg-sky-500/10',
                badgeBg: 'bg-sky-500/20',
                badgeBorder: 'border-sky-500/30',
                iconColor: 'text-sky-400',
                textColor: 'text-sky-300',
                btnBg: 'bg-sky-500 hover:bg-sky-400',
                btnText: 'text-navy-950'
              }
            )}

            {/* 2. CA Intermediate */}
            {renderLevelCard(
              'ca',
              'intermediate',
              'CA Intermediate',
              'Group 1 & Group 2 Cycles',
              Layers,
              {
                border: 'border-royal-500/30 hover:border-royal-500/60',
                bgGlow: 'bg-royal-500/10',
                badgeBg: 'bg-royal-500/20',
                badgeBorder: 'border-royal-500/30',
                iconColor: 'text-royal-400',
                textColor: 'text-royal-300',
                btnBg: 'bg-royal-600 hover:bg-royal-500',
                btnText: 'text-white'
              }
            )}

            {/* 3. CA Final */}
            {renderLevelCard(
              'ca',
              'final',
              'CA Final',
              'Final Level Exam Schedules',
              Crown,
              {
                border: 'border-purple-500/30 hover:border-purple-500/60',
                bgGlow: 'bg-purple-500/10',
                badgeBg: 'bg-purple-500/20',
                badgeBorder: 'border-purple-500/30',
                iconColor: 'text-purple-400',
                textColor: 'text-purple-300',
                btnBg: 'bg-purple-600 hover:bg-purple-500',
                btnText: 'text-white'
              }
            )}

          </div>
        </div>
      )}

      {/* CMA SECTION (Foundation, Intermediate, Final) */}
      {(activeTab === 'cma' || activeTab === 'all') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 rounded-full bg-gold-500 inline-block" />
              <h2 className="text-xl font-black text-white">ICMAI CMA Examination Streams</h2>
            </div>
            <span className="text-xs font-bold text-gold-400">Foundation • Intermediate • Final</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. CMA Foundation */}
            {renderLevelCard(
              'cma',
              'foundation',
              'CMA Foundation',
              'Foundation Exam Schedule',
              GraduationCap,
              {
                border: 'border-emerald-500/30 hover:border-emerald-500/60',
                bgGlow: 'bg-emerald-500/10',
                badgeBg: 'bg-emerald-500/20',
                badgeBorder: 'border-emerald-500/30',
                iconColor: 'text-emerald-400',
                textColor: 'text-emerald-300',
                btnBg: 'bg-emerald-500 hover:bg-emerald-400',
                btnText: 'text-navy-950'
              }
            )}

            {/* 2. CMA Intermediate */}
            {renderLevelCard(
              'cma',
              'intermediate',
              'CMA Intermediate',
              'Group 1 & 2 Examination Cycles',
              Award,
              {
                border: 'border-amber-500/30 hover:border-amber-500/60',
                bgGlow: 'bg-amber-500/10',
                badgeBg: 'bg-amber-500/20',
                badgeBorder: 'border-amber-500/30',
                iconColor: 'text-amber-400',
                textColor: 'text-amber-300',
                btnBg: 'bg-amber-500 hover:bg-amber-400',
                btnText: 'text-navy-950'
              }
            )}

            {/* 3. CMA Final */}
            {renderLevelCard(
              'cma',
              'final',
              'CMA Final',
              'Group 3 & 4 Exam Schedules',
              Crown,
              {
                border: 'border-gold-500/30 hover:border-gold-500/60',
                bgGlow: 'bg-gold-500/10',
                badgeBg: 'bg-gold-500/20',
                badgeBorder: 'border-gold-500/30',
                iconColor: 'text-gold-400',
                textColor: 'text-gold-300',
                btnBg: 'bg-gold-500 hover:bg-gold-400',
                btnText: 'text-navy-950'
              }
            )}

          </div>
        </div>
      )}

      {/* Master Configuration Summary Box */}
      <div className="p-6 rounded-3xl bg-navy-900/60 border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h4 className="text-base font-bold text-white">How This Configuration Works</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Whenever you add or delete an attempt for any level (Foundation, Intermediate, or Final in CA or CMA), 
          it is saved directly to the central Firestore settings. 
          Announcements, test paper audiences, and student registrations can immediately access and filter by these newly configured exam cycles.
        </p>
      </div>

    </div>
  );
}
