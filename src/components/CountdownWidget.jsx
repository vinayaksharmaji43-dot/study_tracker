import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import WebcamStudyModal from './WebcamStudyModal';
import { getStreamId } from '../utils/levelSystem';
import { subscribeExamDates, calculateDaysLeft } from '../utils/examDateService';

export default function CountdownWidget({ setActiveTab }) {
  const { userProfile } = useAuth();
  const { isEyeCare } = useTheme();
  const [examDatesMap, setExamDatesMap] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [displayTitle, setDisplayTitle] = useState('');
  const [hasPassed, setHasPassed] = useState(false);
  const [isToday, setIsToday] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);

  // 1. Subscribe to realtime exam dates from Firestore settings/examDates
  useEffect(() => {
    const unsub = subscribeExamDates((data) => {
      setExamDatesMap(data || {});
    });
    return () => unsub();
  }, []);

  // 2. Compute dynamic Days Left based on student stream & current date
  useEffect(() => {
    if (!userProfile || !examDatesMap) return;

    // Resolve student stream (CA_Foundation, CA_Intermediate, CMA_Foundation, CMA_Intermediate, etc.)
    const streamId = getStreamId(userProfile.course, userProfile.level);
    const streamData = examDatesMap[streamId] || 
      Object.values(examDatesMap).find(s => s.streamId?.toLowerCase() === streamId.toLowerCase()) || 
      null;

    let targetDateStr = streamData?.examDate || '';
    let streamLabel = streamData?.streamName || '';

    if (!streamLabel) {
      const isCMA = String(userProfile.course || '').toUpperCase().includes('CMA');
      const isInter = String(userProfile.level || userProfile.course || '').toUpperCase().includes('INTER');
      streamLabel = isCMA ? (isInter ? 'CMA Intermediate' : 'CMA Foundation') : (isInter ? 'CA Intermediate' : 'CA Foundation');
    }

    if (!targetDateStr) {
      setDaysLeft(null);
      return;
    }

    const calc = calculateDaysLeft(targetDateStr);

    if (calc.daysLeft === null) {
      setDaysLeft(null);
      return;
    }

    setDaysLeft(calc.daysLeft);
    setHasPassed(calc.isPassed);
    setIsToday(calc.isToday);

    const cycleInfo = streamData?.examCycle ? ` • ${streamData.examCycle}` : (calc.formattedDate ? ` • ${calc.formattedDate}` : '');
    setDisplayTitle(`${streamLabel}${cycleInfo}`);
  }, [userProfile, examDatesMap]);

  if (daysLeft === null && !hasPassed) return null; // Do not render if unable to map

  return (
    <>
      <div className={`w-full relative overflow-hidden rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 shadow-md group ${
        isEyeCare
          ? 'glass-card border border-gold-500/30 shadow-[0_0_20px_rgba(251,191,36,0.1)]'
          : 'bg-white border border-blue-200/90 shadow-[0_4px_25px_-5px_rgba(37,99,235,0.08)]'
      }`}>
        
        {/* Background glow */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
          isEyeCare ? 'bg-gold-500/10 group-hover:bg-gold-500/20' : 'bg-blue-500/5 group-hover:bg-blue-500/10'
        }`} />
        <div className={`absolute bottom-0 left-0 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
          isEyeCare ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-blue-600/5 group-hover:bg-blue-600/10'
        }`} />

        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto text-center sm:text-left justify-center sm:justify-start">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
            isEyeCare 
              ? 'bg-gold-500/20 border-gold-500/40 text-gold-400' 
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-xs font-black uppercase tracking-wider mb-0.5 ${
              isEyeCare ? 'text-slate-400' : 'text-blue-700'
            }`}>
              Exam Target
            </div>
            <div className={`text-base font-extrabold flex items-center justify-center sm:justify-start gap-2 ${
              isEyeCare ? 'text-white' : 'text-slate-900'
            }`}>
              {displayTitle} 
            </div>
          </div>
        </div>

        {/* Right side: Days Left area + 🎥 Webcam Study Button */}
        <div className="flex items-center gap-3 relative z-10 shrink-0 w-full sm:w-auto justify-center sm:justify-end flex-wrap">
          
          {/* Days Left Card */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
            isEyeCare 
              ? 'bg-navy-950/80 border-white/10' 
              : 'bg-blue-50/90 border-blue-200 shadow-sm'
          }`}>
            <Clock className={`w-4 h-4 ${hasPassed ? 'text-slate-400' : isEyeCare ? 'text-gold-400 animate-pulse' : 'text-blue-700 animate-pulse'}`} />
            <div className="flex items-baseline gap-1.5">
              {hasPassed ? (
                <span className={`text-sm font-bold ${isEyeCare ? 'text-slate-400' : 'text-slate-700'}`}>Exam Completed</span>
              ) : isToday ? (
                <>
                  <span className={`text-2xl font-black font-mono ${
                    isEyeCare 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400' 
                      : 'text-emerald-700'
                  }`}>
                    0
                  </span>
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    isEyeCare ? 'text-emerald-400' : 'text-emerald-800'
                  }`}>
                    Days Left (Today!)
                  </span>
                </>
              ) : (
                <>
                  <span className={`text-2xl font-black font-mono ${
                    isEyeCare 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-300' 
                      : 'text-blue-700'
                  }`}>
                    {daysLeft}
                  </span>
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    isEyeCare ? 'text-gold-400/80' : 'text-blue-900'
                  }`}>
                    Days Left
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 🎥 Webcam Study Button */}
          <button
            onClick={() => setShowWebcamModal(true)}
            className={`px-4 py-2.5 rounded-xl text-white font-black text-xs transition-all duration-200 flex items-center gap-2 shadow-md cursor-pointer border ${
              isEyeCare
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500/50'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 border-blue-500'
            }`}
            title="Join Live Webcam Study Hall"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <Video className="w-4 h-4 text-white" />
            <span>Webcam Study</span>
          </button>
        </div>
        
      </div>

      {/* Webcam Study Modal */}
      <WebcamStudyModal
        isOpen={showWebcamModal}
        onClose={() => setShowWebcamModal(false)}
        onNavigateToTimer={() => setActiveTab?.('timer')}
        onNavigateToWebcamSection={() => setActiveTab?.('webcam_study')}
      />
    </>
  );
}
