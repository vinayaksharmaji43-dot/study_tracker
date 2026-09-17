import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, User, Mail, Phone, Lock, GraduationCap, Calendar, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialCourse = searchParams.get('course') || 'CA Foundation';

  const [cmaOptions, setCmaOptions] = useState(['June 2027', 'December 2027']);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    course: initialCourse,
    attempt: initialCourse === 'CA Foundation' ? 'January 2027' : 'June 2027',
    terms: false
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCourseSettings() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'courses'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.cmaAttempts && Array.isArray(data.cmaAttempts) && data.cmaAttempts.length > 0) {
            setCmaOptions(data.cmaAttempts);
            if (formData.course === 'CMA' && !data.cmaAttempts.includes(formData.attempt)) {
              setFormData(prev => ({ ...prev, attempt: data.cmaAttempts[0] }));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching course settings:", err);
      }
    }
    loadCourseSettings();
  }, []);

  // Update attempt when course changes
  const handleCourseChange = (selectedCourse) => {
    setFormData(prev => ({
      ...prev,
      course: selectedCourse,
      attempt: selectedCourse === 'CA Foundation' ? 'January 2027' : (cmaOptions[0] || 'June 2027')
    }));
  };

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
    if (!formData.course) {
      return setError('Please select your course.');
    }
    if (formData.course === 'CA Foundation' && !formData.attempt) {
      return setError('Please select your CA Foundation exam attempt.');
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
        course: formData.course,
        attempt: formData.attempt
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
          <img src="/logo.png" alt="CA & CMA Success Blueprint Logo" className="h-14 sm:h-16 w-auto object-contain rounded-2xl group-hover:scale-105 transition-transform duration-300 shadow-lg" />
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

            {/* COURSE SELECTION */}
            <div className="pt-2 border-t border-white/10">
              <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-3">
                Select Your Course
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCourseChange('CA Foundation')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    formData.course === 'CA Foundation'
                      ? 'bg-royal-600/30 border-royal-500 text-white shadow-glow-blue'
                      : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-royal-400" />
                    <span className="font-bold text-sm">CA Foundation</span>
                  </div>
                  {formData.course === 'CA Foundation' && <CheckCircle className="w-4 h-4 text-royal-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleCourseChange('CMA')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    formData.course === 'CMA'
                      ? 'bg-gold-500/20 border-gold-500 text-white shadow-glow-gold'
                      : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-gold-400" />
                    <span className="font-bold text-sm">CMA</span>
                  </div>
                  {formData.course === 'CMA' && <CheckCircle className="w-4 h-4 text-gold-400" />}
                </button>
              </div>
            </div>

            {/* ATTEMPT SELECTION (Dynamic based on course) */}
            {formData.course === 'CA Foundation' && (
              <div className="animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Your Attempt
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, attempt: 'January 2027' })}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
                      formData.attempt === 'January 2027'
                        ? 'bg-royal-500/20 border-royal-500 text-white'
                        : 'bg-navy-900/50 border-white/10 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gold-400" />
                      January 2027
                    </span>
                    {formData.attempt === 'January 2027' && <CheckCircle className="w-4 h-4 text-royal-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, attempt: 'September 2027' })}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
                      formData.attempt === 'September 2027'
                        ? 'bg-royal-500/20 border-royal-500 text-white'
                        : 'bg-navy-900/50 border-white/10 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gold-400" />
                      September 2027
                    </span>
                    {formData.attempt === 'September 2027' && <CheckCircle className="w-4 h-4 text-royal-400" />}
                  </button>
                </div>
              </div>
            )}

            {formData.course === 'CMA' && (
              <div className="animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Your CMA Exam Attempt
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {cmaOptions.map((att) => (
                    <button
                      key={att}
                      type="button"
                      onClick={() => setFormData({ ...formData, attempt: att })}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
                        formData.attempt === att
                          ? 'bg-gold-500/20 border-gold-500 text-white shadow-glow-gold'
                          : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gold-400" />
                        {att}
                      </span>
                      {formData.attempt === att && <CheckCircle className="w-4 h-4 text-gold-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
