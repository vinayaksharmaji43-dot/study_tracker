import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import WebcamStudyModal from './WebcamStudyModal';

export default function CountdownWidget({ setActiveTab }) {
  const { userProfile } = useAuth();
  const [daysLeft, setDaysLeft] = useState(null);
  const [targetDateStr, setTargetDateStr] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [hasPassed, setHasPassed] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    // Normalize course and attempt
    const course = (userProfile.course || '').toUpperCase();
    let level = userProfile.level || '';
    if (course.includes('FOUNDATION')) {
        level = 'Foundation';
    } else if (course.includes('INTERMEDIATE')) {
        level = 'Intermediate';
    }
    const isCA = course.includes('CA') && !course.includes('CMA');
    const isCMA = course.includes('CMA');
    const attempt = (userProfile.attempt || '').toLowerCase(); // e.g. "jan 2027", "jan 27", "may 2027"

    let targetDate = null;
    let attemptDisplay = userProfile.attempt;

    // Helper to check if attempt string contains a month
    const hasMonth = (month) => attempt.includes(month);
    
    // CA Logic
    if (isCA) {
      if (hasMonth('jan')) targetDate = new Date('2027-01-01T00:00:00');
      else if (hasMonth('may')) targetDate = new Date('2027-04-30T00:00:00');
      else if (hasMonth('sep')) targetDate = new Date('2027-08-31T00:00:00');
    } 
    // CMA Logic
    else if (isCMA) {
      if (hasMonth('jun')) targetDate = new Date('2027-05-01T00:00:00');
      else if (hasMonth('dec')) {
        if (attempt.includes('26')) {
          targetDate = new Date('2026-11-30T00:00:00');
        } else {
          targetDate = new Date('2027-11-30T00:00:00');
        }
      }
    }

    if (targetDate) {
      // Calculate Days Left
      const today = new Date();
      // Reset hours to purely compare dates
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        setHasPassed(true);
        setDaysLeft(0);
      } else {
        setHasPassed(false);
        setDaysLeft(diffDays);
      }

      // Format display string e.g. CA Foundation • Jan 2027, CMA Intermediate • Dec 2026
      const formatAttempt = (att) => {
          if(!att) return '';
          let a = att;
          if (a.includes('26')) {
            a = a.replace('26', '2026');
          } else if (a.includes('27')) {
            a = a.replace('27', '2027');
          } else if (!a.includes('2026') && !a.includes('2027')) {
            a += ' 2027';
          }
          return a.charAt(0).toUpperCase() + a.slice(1);
      };
      
      const cleanCourse = isCMA ? `CMA ${level}` : `CA ${level}`;
      setDisplayTitle(`${cleanCourse} • ${formatAttempt(userProfile.attempt)}`);
      
      // Keep track of the actual target date for tooltips or logs
      setTargetDateStr(targetDate.toDateString());
    } else {
      setDaysLeft(null);
    }
  }, [userProfile]);

  if (daysLeft === null) return null; // Do not render if unable to map

  return (
    <>
      <div className="w-full relative overflow-hidden rounded-2xl glass-card border border-gold-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(251,191,36,0.1)] group">
        
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-gold-500/20 transition-all duration-500" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />

        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto text-center sm:text-left justify-center sm:justify-start">
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Exam Target</div>
            <div className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              {displayTitle} 
            </div>
          </div>
        </div>

        {/* Right side: Days Left area + 🎥 Webcam Study Button */}
        <div className="flex items-center gap-3 relative z-10 shrink-0 w-full sm:w-auto justify-center sm:justify-end flex-wrap">
          
          {/* Days Left Card */}
          <div className="flex items-center gap-3 bg-navy-950/50 px-4 py-2 rounded-xl border border-white/5">
            <Clock className={`w-4 h-4 ${hasPassed ? 'text-slate-400' : 'text-gold-400 animate-pulse'}`} />
            <div className="flex items-baseline gap-1.5">
              {hasPassed ? (
                <span className="text-lg font-black text-slate-300">Exam Date Passed</span>
              ) : (
                <>
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-300 font-mono">
                    {daysLeft}
                  </span>
                  <span className="text-sm font-bold text-gold-400/80">Days Left</span>
                </>
              )}
            </div>
          </div>

          {/* 🎥 Webcam Study Button */}
          <button
            onClick={() => setShowWebcamModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white font-bold text-xs transition-all duration-300 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 cursor-pointer"
            title="Join Live Webcam Study Hall"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Video className="w-4 h-4 text-emerald-400" />
            <span>🎥 Webcam Study</span>
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
