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
  Check,
  Clock,
  Target,
  Save,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { 
  subscribeExamDates, 
  saveStreamExamDate, 
  deleteStreamExamDate, 
  calculateDaysLeft, 
  formatExamDateDisplay, 
  DEFAULT_EXAM_STREAMS 
} from '../../utils/examDateService';

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
  const [activeTab, setActiveTab] = useState('exam_dates'); // 'exam_dates' | 'ca' | 'cma' | 'all'
  
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

  // ==========================================
  // Exam Date Management State & Handlers
  // ==========================================
  const [examDatesMap, setExamDatesMap] = useState({});
  const [examFormState, setExamFormState] = useState({});
  const [savingStreamId, setSavingStreamId] = useState(null);
  const [examSuccessMsg, setExamSuccessMsg] = useState('');
  const [examErrorMsg, setExamErrorMsg] = useState('');
  const [isExamDatesSynced, setIsExamDatesSynced] = useState(false);

  // Custom Stream Add Form State
  const [showAddCustomStream, setShowAddCustomStream] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [newStreamDate, setNewStreamDate] = useState('');
  const [newStreamCycle, setNewStreamCycle] = useState('');

  // Real-time listener for Exam Dates from Firestore settings/examDates
  useEffect(() => {
    const unsub = subscribeExamDates((data) => {
      setExamDatesMap(data || {});
      setExamFormState(prev => {
        const next = { ...prev };
        DEFAULT_EXAM_STREAMS.forEach(def => {
          if (!next[def.id]) {
            next[def.id] = {
              streamName: data?.[def.id]?.streamName || def.streamName,
              examDate: data?.[def.id]?.examDate || def.examDate,
              examCycle: data?.[def.id]?.examCycle || def.examCycle || ''
            };
          }
        });
        Object.keys(data || {}).forEach(k => {
          if (!next[k]) {
            next[k] = {
              streamName: data[k].streamName || '',
              examDate: data[k].examDate || '',
              examCycle: data[k].examCycle || ''
            };
          }
        });
        return next;
      });
      setIsExamDatesSynced(true);
    });

    return () => unsub();
  }, []);

  const handleExamFieldChange = (streamId, field, value) => {
    setExamFormState(prev => ({
      ...prev,
      [streamId]: {
        ...(prev[streamId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveExamDate = async (streamId) => {
    const formVals = examFormState[streamId] || {};
    const streamName = formVals.streamName || examDatesMap[streamId]?.streamName || streamId.replace('_', ' ');
    const examDate = formVals.examDate || examDatesMap[streamId]?.examDate || '';
    const examCycle = formVals.examCycle !== undefined ? formVals.examCycle : (examDatesMap[streamId]?.examCycle || '');

    if (!examDate) {
      setExamErrorMsg(`Please enter an exam date for ${streamName}.`);
      setTimeout(() => setExamErrorMsg(''), 4000);
      return;
    }

    setSavingStreamId(streamId);
    setExamErrorMsg('');
    try {
      await saveStreamExamDate(streamId, examDate, streamName, examCycle);
      const calc = calculateDaysLeft(examDate);
      setExamSuccessMsg(`✓ Saved ${streamName}! Live countdown: ${calc.status} (${calc.formattedDate})`);
      setTimeout(() => setExamSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to save exam date:', err);
      setExamErrorMsg('Failed to save exam date: ' + err.message);
      setTimeout(() => setExamErrorMsg(''), 5000);
    } finally {
      setSavingStreamId(null);
    }
  };

  const handleAddNewStream = async (e) => {
    e.preventDefault();
    const name = newStreamName.trim();
    if (!name || !newStreamDate) {
      setExamErrorMsg('Please provide both stream name and exam date.');
      setTimeout(() => setExamErrorMsg(''), 4000);
      return;
    }
    const cleanId = name.replace(/[^a-zA-Z0-9]/g, '_');
    setSavingStreamId(cleanId);
    try {
      await saveStreamExamDate(cleanId, newStreamDate, name, newStreamCycle.trim());
      setExamSuccessMsg(`✓ Successfully added ${name}!`);
      setNewStreamName('');
      setNewStreamDate('');
      setNewStreamCycle('');
      setShowAddCustomStream(false);
      setTimeout(() => setExamSuccessMsg(''), 5000);
    } catch (err) {
      setExamErrorMsg('Failed to add custom stream: ' + err.message);
      setTimeout(() => setExamErrorMsg(''), 5000);
    } finally {
      setSavingStreamId(null);
    }
  };

  const handleDeleteCustomStream = async (streamId, streamName) => {
    if (!window.confirm(`Are you sure you want to delete exam schedule for "${streamName}"?`)) {
      return;
    }
    try {
      await deleteStreamExamDate(streamId);
      setExamSuccessMsg(`Deleted stream "${streamName}".`);
      setTimeout(() => setExamSuccessMsg(''), 4000);
    } catch (err) {
      setExamErrorMsg('Failed to delete stream: ' + err.message);
    }
  };

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

  const getStreamTheme = (streamId) => {
    switch (streamId) {
      case 'CA_Foundation':
        return {
          icon: BookOpen,
          badgeBg: 'bg-sky-500/20',
          badgeBorder: 'border-sky-500/30',
          iconColor: 'text-sky-400',
          border: 'border-sky-500/30 hover:border-sky-500/60',
          bgGlow: 'bg-sky-500/10',
          btnBg: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500',
          tagText: 'text-sky-300'
        };
      case 'CA_Intermediate':
        return {
          icon: Layers,
          badgeBg: 'bg-royal-500/20',
          badgeBorder: 'border-royal-500/30',
          iconColor: 'text-royal-400',
          border: 'border-royal-500/30 hover:border-royal-500/60',
          bgGlow: 'bg-royal-500/10',
          btnBg: 'bg-gradient-to-r from-royal-600 to-indigo-600 hover:from-royal-500 hover:to-indigo-500',
          tagText: 'text-royal-300'
        };
      case 'CA_Final':
        return {
          icon: Crown,
          badgeBg: 'bg-purple-500/20',
          badgeBorder: 'border-purple-500/30',
          iconColor: 'text-purple-400',
          border: 'border-purple-500/30 hover:border-purple-500/60',
          bgGlow: 'bg-purple-500/10',
          btnBg: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
          tagText: 'text-purple-300'
        };
      case 'CMA_Foundation':
        return {
          icon: GraduationCap,
          badgeBg: 'bg-emerald-500/20',
          badgeBorder: 'border-emerald-500/30',
          iconColor: 'text-emerald-400',
          border: 'border-emerald-500/30 hover:border-emerald-500/60',
          bgGlow: 'bg-emerald-500/10',
          btnBg: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500',
          tagText: 'text-emerald-300'
        };
      case 'CMA_Intermediate':
        return {
          icon: Award,
          badgeBg: 'bg-amber-500/20',
          badgeBorder: 'border-amber-500/30',
          iconColor: 'text-amber-400',
          border: 'border-amber-500/30 hover:border-amber-500/60',
          bgGlow: 'bg-amber-500/10',
          btnBg: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500',
          tagText: 'text-amber-300'
        };
      case 'CMA_Final':
        return {
          icon: Crown,
          badgeBg: 'bg-gold-500/20',
          badgeBorder: 'border-gold-500/30',
          iconColor: 'text-gold-400',
          border: 'border-gold-500/30 hover:border-gold-500/60',
          bgGlow: 'bg-gold-500/10',
          btnBg: 'bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-400 hover:to-gold-400 text-navy-950',
          tagText: 'text-gold-300'
        };
      default:
        return {
          icon: Calendar,
          badgeBg: 'bg-blue-500/20',
          badgeBorder: 'border-blue-500/30',
          iconColor: 'text-blue-400',
          border: 'border-blue-500/30 hover:border-blue-500/60',
          bgGlow: 'bg-blue-500/10',
          btnBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
          tagText: 'text-blue-300'
        };
    }
  };

  const allStreamIds = Array.from(new Set([
    ...DEFAULT_EXAM_STREAMS.map(s => s.id),
    ...Object.keys(examDatesMap)
  ]));

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const renderExamDateCard = (streamId) => {
    const formVals = examFormState[streamId] || {};
    const streamMeta = DEFAULT_EXAM_STREAMS.find(s => s.id === streamId) || examDatesMap[streamId] || {};
    const streamName = formVals.streamName || streamMeta.streamName || streamId.replace('_', ' ');
    const examDate = formVals.examDate || '';
    const examCycle = formVals.examCycle || '';
    const isSaving = savingStreamId === streamId;
    const isDefaultStream = DEFAULT_EXAM_STREAMS.some(s => s.id === streamId);
    const theme = getStreamTheme(streamId);
    const IconComp = theme.icon;

    // Dynamic auto-calculated Days Left
    const calc = calculateDaysLeft(examDate);

    return (
      <div 
        key={streamId} 
        className={`p-6 sm:p-7 rounded-3xl glass-card border ${theme.border} space-y-6 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all duration-300`}
      >
        {/* Ambient Glow */}
        <div className={`absolute top-0 right-0 w-44 h-44 ${theme.bgGlow} rounded-full blur-3xl pointer-events-none`} />

        <div className="space-y-5 relative z-10">
          
          {/* Card Top: Icon, Stream Name, Badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className={`w-12 h-12 rounded-2xl ${theme.badgeBg} border ${theme.badgeBorder} flex items-center justify-center ${theme.iconColor} shadow-md`}>
                <IconComp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{streamName}</h3>
                <span className={`text-[11px] font-bold ${theme.tagText}`}>
                  {examCycle || 'Exam Cycle'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${theme.badgeBg} ${theme.tagText} border ${theme.badgeBorder}`}>
                Auto Daily
              </span>
              {!isDefaultStream && (
                <button
                  type="button"
                  onClick={() => handleDeleteCustomStream(streamId, streamName)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title={`Delete stream ${streamName}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Form Fields: Stream Name, Exam Date, Cycle */}
          <div className="space-y-3.5 pt-2 border-t border-white/10">
            
            {/* Stream Name Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Stream / Course Name
              </label>
              <input
                type="text"
                value={streamName}
                onChange={(e) => handleExamFieldChange(streamId, 'streamName', e.target.value)}
                placeholder="e.g. CA Foundation"
                className="w-full px-4 py-2.5 rounded-xl bg-navy-900/90 border border-white/10 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Exam Date Picker Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>First / Main Exam Date <span className="text-emerald-400">*</span></span>
                <span className="text-[10px] text-slate-400 normal-case">(YYYY-MM-DD)</span>
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => handleExamFieldChange(streamId, 'examDate', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-900/90 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
              />
            </div>

            {/* Exam Cycle / Label Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Exam Cycle / Month Label</span>
                <span className="text-[10px] text-slate-400 normal-case">(e.g. Jan 2027)</span>
              </label>
              <input
                type="text"
                value={examCycle}
                onChange={(e) => handleExamFieldChange(streamId, 'examCycle', e.target.value)}
                placeholder="e.g. January 2027, May 2027"
                className="w-full px-4 py-2.5 rounded-xl bg-navy-900/90 border border-white/10 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

          </div>

          {/* Dynamic Live Preview Box */}
          <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Live Student Preview
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                calc.isPassed 
                  ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50' 
                  : calc.isToday 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' 
                  : calc.daysLeft !== null 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-white/5 text-slate-400'
              }`}>
                {calc.isPassed ? 'Passed' : calc.isToday ? 'Today!' : calc.daysLeft !== null ? 'Live Active' : 'Not Set'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              {calc.daysLeft !== null && !calc.isPassed && !calc.isToday ? (
                <>
                  <span className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
                    {calc.daysLeft}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Days Left
                  </span>
                </>
              ) : calc.isToday ? (
                <>
                  <span className="text-3xl font-black font-mono text-emerald-400 animate-pulse">
                    0
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    Days Left (Exam is Today!)
                  </span>
                </>
              ) : calc.isPassed ? (
                <div className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Exam Completed (0 Days Left)</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-500">
                  Please select an exam date to calculate days left
                </span>
              )}
            </div>

            {calc.formattedDate && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-white/5">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Exam Target: <strong className="text-slate-200">{calc.formattedDate}</strong></span>
              </div>
            )}
          </div>

        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-white/10 relative z-10 flex items-center justify-between gap-3">
          <div className="text-[10px] text-slate-400">
            <span>Updates midnight daily</span>
          </div>

          <button
            type="button"
            onClick={() => handleSaveExamDate(streamId)}
            disabled={isSaving || !examDate}
            className={`px-5 py-2.5 rounded-xl ${theme.btnBg} font-black text-xs text-white transition-all flex items-center gap-2 shadow-lg cursor-pointer hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Exam Date</span>
              </>
            )}
          </button>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Automatic Days Left & Exam Master Config</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Exam Dates & <span className="gold-gradient-text">Days Left Management</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Set the first/main exam date for every stream (<strong>CA Foundation, CA Intermediate, CMA Foundation, CMA Intermediate, Final</strong>). The website dynamically calculates remaining days, decrements automatically every midnight, and handles exam day and completion.
            </p>
          </div>

          {/* Sync Status Badge + Today's Date */}
          <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 shrink-0 text-center sm:text-right space-y-2">
            <div className="flex items-center justify-center sm:justify-end gap-2 text-xs font-bold">
              <span className={`w-2.5 h-2.5 rounded-full ${isExamDatesSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={isExamDatesSynced ? 'text-emerald-400' : 'text-amber-400'}>
                {isExamDatesSynced ? 'Exam Dates Sync: Active' : 'Connecting...'}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              📅 Today: <span className="text-white font-bold">{todayFormatted}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Database: <code className="text-slate-300">settings/examDates</code>
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert for Exam Dates */}
      {examSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-glow-emerald">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{examSuccessMsg}</span>
        </div>
      )}

      {/* Error Notification Alert for Exam Dates */}
      {examErrorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{examErrorMsg}</span>
        </div>
      )}

      {/* Success Notification Alert for Attempts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-glow-emerald">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Alert for Attempts */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Course Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl glass-card border border-white/10">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          
          {/* 🎯 Exam Dates Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('exam_dates')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'exam_dates'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-300" />
            <span>🎯 Exam Dates (Auto Days Left)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold ml-1">
              Live Auto Calc
            </span>
          </button>

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
            <span>CA Attempts</span>
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
            <span>CMA Attempts</span>
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
                ? 'bg-purple-600 text-white shadow-glow-royal scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Views</span>
          </button>

        </div>

        {/* Quick Instructions Hint */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pr-3">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>Set the exam date once; website calculates days left automatically every day.</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* EXAM DATE MANAGEMENT SECTION (Auto Days Left for Streams) */}
      {/* ======================================================== */}
      {(activeTab === 'exam_dates' || activeTab === 'all') && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-6 rounded-full bg-emerald-500 inline-block" />
                <h2 className="text-xl font-black text-white">Stream-Wise Exam Date Management</h2>
              </div>
              <p className="text-xs text-slate-300">
                Enter the first/main exam date for each stream. The dashboard automatically calculates remaining days (<code className="text-emerald-400 font-mono">Days Left = Exam Date − Current Date</code>) and updates daily at midnight.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddCustomStream(!showAddCustomStream)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>{showAddCustomStream ? 'Cancel Add Stream' : 'Add Custom Stream'}</span>
            </button>
          </div>

          {/* Add Custom Stream Form Modal/Box */}
          {showAddCustomStream && (
            <form onSubmit={handleAddNewStream} className="p-6 rounded-3xl glass-card border border-emerald-500/40 bg-navy-950/90 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add New Exam Stream / Cycle</span>
                </h3>
                <span className="text-xs text-slate-400">Custom Stream Configuration</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Stream Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS Executive or CA Fastrack"
                    value={newStreamName}
                    onChange={(e) => setNewStreamName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    First Exam Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newStreamDate}
                    onChange={(e) => setNewStreamDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Exam Cycle / Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. June 2027"
                    value={newStreamCycle}
                    onChange={(e) => setNewStreamCycle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddCustomStream(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStreamId !== null}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Create Stream</span>
                </button>
              </div>
            </form>
          )}

          {/* Grid of Exam Date Cards for all Streams */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {allStreamIds.map(streamId => renderExamDateCard(streamId))}
          </div>

          {/* Architecture / How it Works Card */}
          <div className="p-6 rounded-3xl bg-navy-900/60 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-bold text-white">How the Automatic Days Left Engine Works</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Dynamic Midnight Math</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Formula is strictly: <code className="text-emerald-300 font-mono">Exam Date − Current Date</code>. Every midnight at 12:00 AM, the days automatically decrement (e.g., 92 → 91) without requiring any manual admin updates.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>2. Exam Day & Completion</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When the calendar date equals the exam date, it shows <strong>0 Days Left (Today!)</strong>. Once passed, it shows <strong>Exam Completed</strong>. Negative day numbers are never displayed.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-gold-400" />
                  <span>3. Instant Real-Time Sync</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When you save a new exam date here, student dashboards reflect the updated countdown in real-time. Each student sees the countdown for their specific enrolled course & level.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
