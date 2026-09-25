import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Sparkles, 
  Send, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowLeft, 
  BookOpen, 
  Award, 
  BrainCircuit, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  Zap, 
  X,
  ChevronRight,
  Flame,
  Star
} from 'lucide-react';

const TELEGRAM_HANDLE = '@ca_success_blueprint_support';
const TELEGRAM_URL = 'https://t.me/ca_success_blueprint_support';
const SUPPORT_HOURS = 'Support available from 8:00 AM to 9:00 PM';

export const PRODUCTS_CATALOG = [
  {
    id: 'premium_hand_notes',
    title: 'Premium Hand Notes',
    tagline: 'High-Yield Handwritten Summaries & Formula Sheets',
    badge: '🔒 Premium Product',
    category: 'Revision Material',
    icon: BookOpen,
    theme: {
      gradient: 'from-amber-500 via-orange-500 to-amber-600',
      glow: 'shadow-[0_0_35px_rgba(245,158,11,0.2)]',
      border: 'border-amber-500/30',
      hoverBorder: 'hover:border-amber-400/80',
      cardBg: 'from-amber-950/20 via-navy-900/90 to-navy-950/90',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      buttonBg: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-navy-950 shadow-glow-amber'
    },
    description: 'Concise hand-crafted revision notes, visual flowcharts, and high-weightage formula sheets meticulously written by top rankers for rapid last-day recall.',
    features: [
      'Chapter-wise concept flowcharts & memory diagrams',
      'Crucial section numbers, formulas & case law summaries',
      'High-weightage topic breakdowns with exam tips',
      'Engineered specifically for rapid 1-day pre-exam recall'
    ],
    actionText: 'Contact Admin to Purchase',
    locked: true
  },
  {
    id: 'test_series',
    title: 'Test Series',
    tagline: 'ICAI & ICMAI Pattern Exam Simulations',
    badge: '🔒 Premium Product',
    category: 'Exam Practice',
    icon: Award,
    theme: {
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      glow: 'shadow-[0_0_35px_rgba(16,185,129,0.2)]',
      border: 'border-emerald-500/30',
      hoverBorder: 'hover:border-emerald-400/80',
      cardBg: 'from-emerald-950/20 via-navy-900/90 to-navy-950/90',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      buttonBg: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 shadow-glow-emerald'
    },
    description: 'Exam-simulated mock test papers curated in strict compliance with official institute examination standards, step-wise marking rubrics, and detailed solutions.',
    features: [
      'Chapter-wise unit tests & full-syllabus grand mocks',
      'Strict step-by-step marking rubrics & model solutions',
      'Structured presentation guidelines & answer format keys',
      'Time-management strategy drills for 3-hour papers'
    ],
    actionText: 'Contact Admin to Purchase',
    locked: true
  },
  {
    id: 'premium_quiz',
    title: 'Premium Quiz',
    tagline: 'Advanced Case-Scenario & Conceptual MCQ Series',
    badge: '🔒 Premium Product',
    category: 'Assessment',
    icon: BrainCircuit,
    theme: {
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
      glow: 'shadow-[0_0_35px_rgba(168,85,247,0.2)]',
      border: 'border-purple-500/30',
      hoverBorder: 'hover:border-purple-400/80',
      cardBg: 'from-purple-950/20 via-navy-900/90 to-navy-950/90',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      buttonBg: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-glow-purple'
    },
    description: 'Timer-based high-difficulty MCQ question bank with intricate case scenarios, instant conceptual explanations, and negative marking drills.',
    features: [
      'In-depth case scenarios & concept-testing MCQ banks',
      'Instant rationale with textbook chapter references',
      'Strict examination timer & negative marking simulation',
      'Speed, accuracy, and topic-wise mastery analytics'
    ],
    actionText: 'Contact Admin to Purchase',
    locked: true
  }
];

export default function Products({ setActiveTab }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (selectedProduct) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedProduct]);

  const copyTelegram = () => {
    navigator.clipboard.writeText(TELEGRAM_HANDLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [
    { id: 'all', label: 'All Products' },
    { id: 'Revision Material', label: 'Hand Notes' },
    { id: 'Exam Practice', label: 'Test Series' },
    { id: 'Assessment', label: 'MCQ Quizzes' }
  ];

  const displayedProducts = activeCategory === 'all' 
    ? PRODUCTS_CATALOG 
    : PRODUCTS_CATALOG.filter(p => p.category === activeCategory);

  return (
    <div className="relative min-h-[85vh] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-hidden bg-gradient-to-b from-[#090618] via-[#0d0a24] to-[#070512] text-slate-100 rounded-3xl animate-in fade-in duration-300">
      
      {/* Ambient Radial Auroras */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button
          onClick={() => setActiveTab && setActiveTab('overview')}
          className="self-start px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        {/* Live Support Hours Chip */}
        <div className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-sm">
          <Clock className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{SUPPORT_HOURS}</span>
        </div>
      </div>

      {/* Hero Showcase Header */}
      <div className="relative z-10 text-center max-w-3xl mx-auto space-y-4 mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-widest shadow-glow-gold animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Exclusive Student Store</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Premium{' '}
          <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
            Academic Products
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          Meticulously crafted study material, verified handwritten notes, full-scale exam test series, and conceptual case quizzes engineered to maximize your marks.
        </p>

        {/* Categories Bar */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pt-3 pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-glow-indigo'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-12">
        {displayedProducts.map((product) => {
          const Icon = product.icon;
          return (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className={`group relative rounded-3xl bg-gradient-to-b ${product.theme.cardBg} border ${product.theme.border} ${product.theme.hoverBorder} ${product.theme.glow} transition-all duration-300 hover:-translate-y-2 p-6 sm:p-7 flex flex-col justify-between cursor-pointer overflow-hidden backdrop-blur-xl shadow-2xl`}
            >
              {/* Background Glow Element */}
              <div className={`absolute top-0 right-0 w-44 h-44 bg-gradient-to-br ${product.theme.gradient} opacity-10 rounded-full blur-3xl pointer-events-none group-hover:opacity-20 transition-opacity`} />
              
              <div className="space-y-5 relative z-10">
                {/* Card Top: Category & Lock Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {product.category}
                  </span>
                  
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${product.theme.badgeBg}`}>
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Premium Product</span>
                  </span>
                </div>

                {/* Icon & Title */}
                <div className="space-y-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg group-hover:scale-105 transition-transform duration-300 ${product.theme.iconBg}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-200 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">
                      {product.tagline}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {product.description}
                </p>

                {/* Features List */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Product Highlights:
                  </span>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {product.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 relative z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProduct(product);
                  }}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer group/btn ${product.theme.buttonBg}`}
                >
                  <Lock className="w-4 h-4 shrink-0 group-hover/btn:scale-110 transition-transform" />
                  <span>{product.actionText}</span>
                  <ChevronRight className="w-4 h-4 shrink-0 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="relative z-10 max-w-4xl mx-auto p-5 sm:p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Direct Administrator Access</h4>
            <p className="text-xs text-slate-400">All premium enrollments are handled with personalized guidance on Telegram.</p>
          </div>
        </div>

        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-navy-950 font-black text-xs flex items-center gap-2 transition-all shadow-glow-blue shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Telegram Support</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* ========================================================= */}
      {/* PURCHASE / CONTACT ADMIN MODAL                            */}
      {/* ========================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-gradient-to-b from-[#15112e] via-navy-900 to-navy-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-6 animate-in zoom-in-95 duration-200">
            
            {/* Top Amber Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  This is a Premium Product
                </h3>
                <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                  Exclusive access & personalized delivery
                </p>
              </div>
            </div>

            {/* Selected Product Pill */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg">🔒</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{selectedProduct.title}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">{selectedProduct.category}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                Locked
              </span>
            </div>

            {/* Message Body */}
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-slate-200 font-semibold leading-relaxed">
                To purchase or get access, please contact Admin on Telegram.
              </p>

              {/* Telegram ID Box with Copy */}
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telegram Admin</div>
                    <div className="text-sm font-mono font-black text-white truncate">
                      {TELEGRAM_HANDLE}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyTelegram}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                  title="Copy Telegram ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Redirect Button */}
            <div className="space-y-2.5 pt-1">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-glow-blue cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Contact Admin on Telegram</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
              </a>

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Support Hours Footer */}
            <div className="text-center pt-2 border-t border-white/5 text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{SUPPORT_HOURS}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
