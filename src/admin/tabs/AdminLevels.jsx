import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../../utils/levelSystem';
import EmptyState from '../../components/EmptyState';
import { 
  Award, ShieldCheck, Edit3, Save, RotateCcw, Sparkles, Check, AlertCircle, Layers, Crown
} from 'lucide-react';

const STREAMS = [
  { course: 'CA', level: 'Foundation', label: 'CA Foundation' },
  { course: 'CA', level: 'Intermediate', label: 'CA Intermediate' },
  { course: 'CMA', level: 'Foundation', label: 'CMA Foundation' },
  { course: 'CMA', level: 'Intermediate', label: 'CMA Intermediate' }
];

const LEVEL_NAMES_VERSION = 2;

export default function AdminLevels() {
  const [selectedStream, setSelectedStream] = useState(STREAMS[0]);
  const streamId = getStreamId(selectedStream.course, selectedStream.level);

  const [levelsList, setLevelsList] = useState(() => getDefaultStreamLevels(streamId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Modal State
  const [editLevel, setEditLevel] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editPoints, setEditPoints] = useState('');

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, 'levelConfigs', streamId);

    const unsub = onSnapshot(docRef, async (snap) => {
      if (snap.exists() && snap.data().levels?.length === 35) {
        const savedData = snap.data();
        const savedLevels = normalizeLevelConfig(savedData.levels, streamId);
        const defaults = getDefaultStreamLevels(streamId);
        const migratedLevels = savedLevels.map((level, index) => ({
          ...level,
          levelName: savedData.levelNamesVersion === LEVEL_NAMES_VERSION ? level.levelName : defaults[index].levelName,
          badge: savedData.levelNamesVersion === LEVEL_NAMES_VERSION ? level.badge : defaults[index].badge
        }));

        setLevelsList(migratedLevels);

        if (savedData.levelNamesVersion !== LEVEL_NAMES_VERSION) {
          try {
            await setDoc(docRef, {
              levels: migratedLevels,
              levelNamesVersion: LEVEL_NAMES_VERSION,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } catch (error) {
            console.error('Could not migrate level names and badges:', error);
          }
        }
      } else {
        setLevelsList(getDefaultStreamLevels(streamId));
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching levelConfigs:", err);
      setLevelsList(getDefaultStreamLevels(streamId));
      setLoading(false);
    });

    return () => unsub();
  }, [streamId]);

  const openEditModal = (lvl) => {
    setEditLevel(lvl);
    setEditName(lvl.levelName);
    setEditBadge(lvl.badge);
    setEditPoints(String(lvl.requiredPoints));
  };

  const handleSaveLevelEdit = (e) => {
    e.preventDefault();
    if (!editLevel) return;

    const reqPts = Math.max(0, parseInt(editPoints, 10) || 0);

    const updated = levelsList.map(l => {
      if (l.levelNumber === editLevel.levelNumber) {
        return {
          ...l,
          levelName: editName.trim(),
          badge: editBadge.trim(),
          requiredPoints: reqPts,
          active: l.active !== false,
          stream: streamId
        };
      }
      return l;
    });

    // Ensure sorted by requiredPoints
    updated.sort((a, b) => a.levelNumber - b.levelNumber);

    setLevelsList(updated);
    setEditLevel(null);
  };

  const handleSaveAllToFirestore = async () => {
    const normalizedLevels = normalizeLevelConfig(levelsList, streamId);
    const thresholdsValid = normalizedLevels[0].requiredPoints === 0 && normalizedLevels.every((level, index) => (
      level.levelNumber === index + 1 &&
      (index === 0 || level.requiredPoints >= normalizedLevels[index - 1].requiredPoints)
    ));

    if (!thresholdsValid) {
      alert('Level 1 must start at 0 XP and thresholds must increase or stay equal through Level 35.');
      return;
    }

    try {
      setSaving(true);
      setSuccessMsg('');

      const docRef = doc(db, 'levelConfigs', streamId);
      await setDoc(docRef, {
        stream: streamId,
        course: selectedStream.course,
        level: selectedStream.level,
        levels: normalizedLevels,
        updatedAt: serverTimestamp()
      });

      setSuccessMsg(`Successfully saved 35-level ladder for ${selectedStream.label}! Changes are live.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error saving levelConfigs:", err);
      alert("Failed to save level configuration to Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm(`Reset ${selectedStream.label} back to standard default 35 levels?`)) {
      setLevelsList(getDefaultStreamLevels(streamId));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-bold border border-gold-500/30">
              <Award className="w-3.5 h-3.5 text-gold-400" />
              <span>35-Level Gamification Ladder Manager</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Levels & Badges <span className="gold-gradient-text">Configuration</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Configure point thresholds, level titles, and badges for all 35 levels across CA and CMA streams.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all border border-white/10 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSaveAllToFirestore}
              disabled={saving}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-amber-400 hover:to-gold-500 text-navy-950 font-black text-sm shadow-glow-gold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
            >
              <Save className="w-5 h-5 stroke-[2.5]" />
              <span>{saving ? 'Saving...' : 'Save & Publish Levels'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stream Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {STREAMS.map(s => {
          const isActive = selectedStream.label === s.label;
          return (
            <button
              key={s.label}
              onClick={() => setSelectedStream(s)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-gold-500 text-navy-950 shadow-glow-gold font-black'
                  : 'bg-navy-900 border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {s.label} Ladder (35 Levels)
            </button>
          );
        })}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Box */}
      <div className="flex items-center justify-between p-4 rounded-2xl glass-card border border-white/10 text-xs font-bold text-slate-300">
        <div>
          Active Stream: <strong className="text-gold-400">{selectedStream.label}</strong>
        </div>
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-gold-400" />
          <span>Total Levels Configured: <strong className="text-white">35 / 35</strong></span>
        </div>
      </div>

      {/* 35-Level Table */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
        <div className="grid grid-cols-12 px-6 py-4 bg-navy-900/90 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2 text-center">Level #</div>
          <div className="col-span-2 text-center">Badge</div>
          <div className="col-span-4">Level Name</div>
          <div className="col-span-3 text-right">Required XP</div>
          <div className="col-span-1 text-center">Active</div>
        </div>

        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
          {levelsList.map((lvl) => (
            <div key={lvl.levelNumber} className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-white/5 transition-colors text-xs font-bold">
              <div className="col-span-2 text-center text-gold-400 font-mono text-sm">
                #{lvl.levelNumber}
              </div>

              <div className="col-span-2 text-center text-2xl">
                {lvl.badge}
              </div>

              <div className="col-span-4 text-white font-bold text-sm flex items-center gap-2">
                <span>{lvl.levelName}</span>
                {lvl.levelNumber === 35 && (
                  <span className="px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 text-[10px] font-black border border-gold-500/30">
                    MAX LEVEL
                  </span>
                )}
              </div>

              <div className="col-span-3 text-right font-mono font-bold text-emerald-400 text-sm">
                {lvl.requiredPoints} XP
              </div>

              <div className="col-span-1 text-center flex items-center justify-center gap-1">
                <button
                  onClick={() => setLevelsList(levelsList.map(item => item.levelNumber === lvl.levelNumber ? { ...item, active: item.active === false } : item))}
                  className={`px-1.5 py-1 rounded text-[9px] font-black ${lvl.active === false ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}
                  title="Toggle level availability"
                >
                  {lvl.active === false ? 'OFF' : 'ON'}
                </button>
                <button
                  onClick={() => openEditModal(lvl)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Edit Level"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT LEVEL MODAL */}
      {editLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-gold-500/30 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-gold-400" />
                <span>Edit Level {editLevel.levelNumber}</span>
              </h3>
              <button onClick={() => setEditLevel(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveLevelEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Level Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Badge Emoji / Icon</label>
                <input
                  type="text"
                  required
                  value={editBadge}
                  onChange={e => setEditBadge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-lg font-bold text-center focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Required Points (XP)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editPoints}
                  onChange={e => setEditPoints(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-gold-400 text-xs font-bold font-mono focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditLevel(null)} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold">Cancel</button>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-gold-500 hover:bg-amber-400 text-navy-950 font-black text-xs">Update Level</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
