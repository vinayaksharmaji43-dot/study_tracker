import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, User, Mail, Phone, Lock, GraduationCap, Calendar, CheckCircle, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialParam = searchParams.get('course') || '';
  
  const initialCourse = initialParam.includes('CMA') ? 'CMA' : (initialParam.includes('CA') ? 'CA' : '');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: false
  });

  // Selected Course progressive state
  const [selectedCourse, setSelectedCourse] = useState(initialCourse); // 'CA' | 'CMA' | ''
  const [selectedLevel, setSelectedLevel] = useState('');   // 'Foundation' | 'Intermediate' | ''
  const [selectedAttempt, setSelectedAttempt] = useState(''); // 'Jan 27' | 'May 27' | 'Sep 27' | 'June 27' | 'Dec 27' | ''

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { currentUser, isAdmin, loading, register } = useAuth();
  const navigate = useNavigate();

  // Redirect already authenticated users to Dashboard/Admin
  useEffect(() => {
    if (!loading && currentUser) {
      const redirectPath = isAdmin ? '/admin' : '/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser, isAdmin, loading, navigate]);

  if (loading || currentUser) {
    return <LoadingSpinner fullScreen text="Redirecting to Dashboard..." />;
  }

  // Handlers for progressive course selection
  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setSelectedLevel('');
    setSelectedAttempt('');
  };

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    setSelectedAttempt('');
  };

  const handleResetCourseSelection = () => {
    setSelectedCourse('');
    setSelectedLevel('');
    setSelectedAttempt('');
  };

  // Available attempt options based on course selection
  const attemptOptions = selectedCourse === 'CA'
    ? ['Jan 27', 'May 27', 'Sep 27']
    : selectedCourse === 'CMA'
      ? ['Dec 26', 'June 27', 'Dec 27']
      : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field Validations
    if (!formData.name.trim()) {
      return setError('Please enter your full name.');
    }
    if (!formData.email.trim()) {
      return setError('Please enter a valid email address.');
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      return setError('Please enter a valid 10-digit mobile phone number.');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (!selectedCourse) {
      return setError('Please select your course (CA or CMA).');
    }
    if (!selectedLevel) {
      return setError('Please select your level (Foundation or Intermediate).');
    }
    if (!selectedAttempt) {
      return setError('Please select your exam attempt.');
    }
    if (!formData.terms) {
      return setError('You must agree to the terms and conditions to proceed.');
    }

    try {
      setSubmitting(true);
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        course: selectedCourse,
        level: selectedLevel,
        attempt: selectedAttempt
      });
      navigate('/dashboard');
    } catch (err) {
      console.error("Registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 z-10">
        <Link to="/" className="inline-flex items-center justify-center group">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="CA & CMA Success Blueprint Logo" className="h-14 sm:h-16 w-auto object-contain rounded-2xl group-hover:scale-105 transition-transform duration-300 shadow-lg" />
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Create Your Account</h2>
        <p className="text-sm text-slate-400">Join CA/CMA Blueprint and structure your preparation.</p>
      </div>

      {/* Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10 px-4 animate-in fade-in duration-300">
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Gmail / Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="student@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            {/* Mobile Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mobile Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number (e.g. 9876543210)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SELECTED COURSE SECTION (PROGRESSIVE SELECTION) */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider">
                  Selected Course
                </label>
                {(selectedCourse || selectedLevel || selectedAttempt) && (
                  <button
                    type="button"
                    onClick={handleResetCourseSelection}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white underline transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                )}
              </div>

              {/* STEP 1 — COURSE (CA / CMA) */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-2">Select Course:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCourseSelect('CA')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedCourse === 'CA'
                        ? 'bg-royal-600/30 border-royal-500 text-white shadow-glow-blue'
                        : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-royal-400" />
                      <span className="font-bold text-sm">CA</span>
                    </div>
                    {selectedCourse === 'CA' && <CheckCircle className="w-4 h-4 text-royal-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCourseSelect('CMA')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedCourse === 'CMA'
                        ? 'bg-gold-500/20 border-gold-500 text-white shadow-glow-gold'
                        : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-4 h-4 text-gold-400" />
                      <span className="font-bold text-sm">CMA</span>
                    </div>
                    {selectedCourse === 'CMA' && <CheckCircle className="w-4 h-4 text-gold-400" />}
                  </button>
                </div>
              </div>

              {/* STEP 2 — LEVEL (Foundation / Intermediate) - Visible after Course select */}
              {selectedCourse && (
                <div className="animate-in fade-in duration-200 pt-1">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2">Select Level:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleLevelSelect('Foundation')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        selectedLevel === 'Foundation'
                          ? selectedCourse === 'CA'
                            ? 'bg-royal-600/30 border-royal-500 text-white shadow-glow-blue'
                            : 'bg-gold-500/20 border-gold-500 text-white shadow-glow-gold'
                          : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="font-bold text-xs sm:text-sm">Foundation</span>
                      {selectedLevel === 'Foundation' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLevelSelect('Intermediate')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        selectedLevel === 'Intermediate'
                          ? selectedCourse === 'CA'
                            ? 'bg-royal-600/30 border-royal-500 text-white shadow-glow-blue'
                            : 'bg-gold-500/20 border-gold-500 text-white shadow-glow-gold'
                          : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="font-bold text-xs sm:text-sm">Intermediate</span>
                      {selectedLevel === 'Intermediate' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — ATTEMPT (Jan 27 / May 27 / Sep 27 or Dec 26 / June 27 / Dec 27) - Visible after Level select */}
              {selectedCourse && selectedLevel && (
                <div className="animate-in fade-in duration-200 pt-1">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2">Select Attempt:</div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {attemptOptions.map((att) => (
                      <button
                        key={att}
                        type="button"
                        onClick={() => setSelectedAttempt(att)}
                        className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          selectedAttempt === att
                            ? selectedCourse === 'CA'
                              ? 'bg-royal-500/20 border-royal-500 text-white shadow-glow-blue'
                              : 'bg-gold-500/20 border-gold-500 text-white shadow-glow-gold'
                            : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                        <span>{att}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Terms Checkbox */}
            <div className="flex items-center pt-2">
              <input
                id="terms"
                type="checkbox"
                required
                checked={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-navy-900 text-royal-600 focus:ring-royal-500 cursor-pointer"
              />
              <label htmlFor="terms" className="ml-2 text-xs text-slate-300 cursor-pointer">
                I agree to the <span className="text-royal-400 hover:underline">Terms of Service</span> and <span className="text-royal-400 hover:underline">Privacy Policy</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white font-bold text-base shadow-glow-blue hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

          </form>

          {/* Login Link */}
          <div className="text-center pt-4 border-t border-white/10 text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-royal-400 hover:text-royal-300 hover:underline">
              Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
