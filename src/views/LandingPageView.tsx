import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Smartphone,
  Wallet,
  Gift,
  Users,
  Bell,
  Clock,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FileText,
  Mail,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  Award,
  Lock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Menu,
  X,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LandingPageViewProps {
  onGetStarted: () => void;
  onOpenPrivacyModal?: () => void;
  onOpenTermsModal?: () => void;
  onOpenContactModal?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onGetStarted,
  onOpenPrivacyModal,
  onOpenTermsModal,
  onOpenContactModal,
}) => {
  const { settings, user } = useApp();

  // Navigation & UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'tasks' | 'wallet' | 'referral' | 'notifications'>('tasks');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [referralCount, setReferralCount] = useState<number>(5);

  // Local Modal fallbacks if not passed
  const [localModal, setLocalModal] = useState<'privacy' | 'terms' | 'contact' | 'fairplay' | null>(null);

  const handleCopyLink = () => {
    const url = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // FAQ items with honest, transparent answers
  const faqs = [
    {
      q: 'Is Smart Earn free to use?',
      a: 'Yes, 100% free. Smart Earn never asks for registration fees, subscription charges, or deposit payments. Anyone with a smartphone or browser can create an account and participate in eligible activities.',
    },
    {
      q: 'Are earnings guaranteed?',
      a: 'No. Smart Earn is strictly an activity-based promotional rewards application. Rewards depend entirely on completing verified sponsor tasks, video check-ins, or referral goals. We never promise guaranteed income, salary, or fixed returns.',
    },
    {
      q: 'How do coins convert to real currency?',
      a: `Smart Earn uses a transparent conversion formula: 100 Coins = ${settings?.currencySymbol || '₹'}${((100 / (settings?.coinToCurrencyRatio || 100))).toFixed(2)}. When your verified balance reaches the minimum threshold (${settings?.minWithdrawalCoins || 1000} Coins), you can request a direct transfer to your UPI ID or Bank account.`,
    },
    {
      q: 'What is the minimum withdrawal amount?',
      a: `The current minimum withdrawal requirement is ${settings?.minWithdrawalCoins || 1000} Coins (${settings?.currencySymbol || '₹'}${(((settings?.minWithdrawalCoins || 1000) / (settings?.coinToCurrencyRatio || 100))).toFixed(2)}). Keeping this threshold ensures fast automated processing without excessive banking transaction costs.`,
    },
    {
      q: 'Why does Smart Earn have a "One Device, One Account" rule?',
      a: 'To safeguard our sponsor network and ensure fair reward distribution for honest users, each device is cryptographically bound to one account. Running emulators, VPNs, or multi-account bots violates our Fair Play policy and leads to automatic account restrictions.',
    },
    {
      q: 'How long do withdrawal requests take to process?',
      a: 'Most approved withdrawal requests are processed within 2 to 24 business hours directly through automated UPI rails or NEFT/IMPS bank transfers.',
    },
    {
      q: 'How does task verification work?',
      a: 'When you submit proof for an eligible sponsor activity (such as an order ID or registration screenshot), our automated verification system and review team cross-check completion with partner logs. Once approved, coins reflect immediately in your wallet ledger.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Dynamic Purple/Blue Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-purple-900/25 via-indigo-900/15 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-[30%] -left-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-[60%] -right-48 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* =========================================================================
          SECTION 1: HEADER
         ========================================================================= */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-950/80 border-b border-indigo-900/30 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400 group-hover:text-purple-300 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-purple-200 group-hover:to-blue-200 transition-all">
                  Smart Earn
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Android & Web
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Earn Smart. Earn Daily.</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-white hover:text-purple-300 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white hover:text-purple-300 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('referral')}
              className="hover:text-white hover:text-purple-300 transition-colors cursor-pointer"
            >
              Referral
            </button>
            <button
              onClick={() => scrollToSection('trust-safety')}
              className="hover:text-white hover:text-purple-300 transition-colors cursor-pointer"
            >
              Trust & Safety
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-white hover:text-purple-300 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyLink}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-indigo-900/50 hover:border-purple-500/50 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Copy App URL"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share App'}</span>
            </button>

            <button
              onClick={onGetStarted}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 hover:shadow-purple-600/40 hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              <span>{user ? 'Open App' : 'Get Started'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Sheet */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950/95 border-b border-indigo-900/40 px-4 pt-3 pb-6 space-y-3 backdrop-blur-2xl">
            <div className="flex flex-col space-y-3 text-sm font-medium text-slate-200 pt-2">
              <button
                onClick={() => scrollToSection('features')}
                className="text-left py-2 px-3 rounded-lg hover:bg-slate-900 transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left py-2 px-3 rounded-lg hover:bg-slate-900 transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('referral')}
                className="text-left py-2 px-3 rounded-lg hover:bg-slate-900 transition-colors"
              >
                Referral Program
              </button>
              <button
                onClick={() => scrollToSection('trust-safety')}
                className="text-left py-2 px-3 rounded-lg hover:bg-slate-900 transition-colors"
              >
                Trust & Safety
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-left py-2 px-3 rounded-lg hover:bg-slate-900 transition-colors"
              >
                FAQ
              </button>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                onClick={onGetStarted}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-center text-sm shadow-md"
              >
                {user ? 'Open Dashboard' : 'Get Started Now'}
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-semibold flex items-center justify-center space-x-2 border border-slate-800"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'App Link Copied' : 'Copy App Link'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1 relative z-10">
        {/* =========================================================================
            SECTION 2: HERO SECTION
           ========================================================================= */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Top Tagline Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-slate-900 border border-purple-500/30 text-purple-300 text-xs font-medium mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Transparent Rewards & Verified Daily Micro-Tasks</span>
            </div>

            {/* Hero Main Heading */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight mb-4">
              Smart Earn
            </h1>

            {/* Secondary Punchline */}
            <h2 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-indigo-200 to-blue-300 mb-6">
              Earn Smart. Earn Daily.
            </h2>

            {/* Honest, realistic description */}
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 mb-8 leading-relaxed">
              Complete eligible daily micro-tasks, participate in verified activities, invite friends, and claim activity points redeemable for real rewards via UPI and Bank transfer according to transparent app rules. No misleading promises, no deposit required.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-base shadow-xl shadow-indigo-600/30 hover:shadow-purple-600/40 hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => scrollToSection('features')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-900/60 hover:border-purple-500/50 text-slate-200 hover:text-white font-bold text-base transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Explore Features</span>
                <ChevronDown className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Trust Pillars Bar */}
            <div className="pt-4 border-t border-indigo-950/60 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/40 border border-indigo-950/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">100% Free to Join</span>
              </div>
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/40 border border-indigo-950/40">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Clear Coin Valuation</span>
              </div>
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/40 border border-indigo-950/40">
                <Wallet className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Direct UPI & Bank</span>
              </div>
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/40 border border-indigo-950/40">
                <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">One Device Fair Play</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: APP PREVIEW & INTERACTIVE MOCKUP SECTION
           ========================================================================= */}
        <section className="py-16 bg-slate-900/40 border-y border-indigo-900/30 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Live App Preview</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
                Experience Smart Earn on Mobile & Web
              </h3>
              <p className="text-sm sm:text-base text-slate-400">
                Explore key screens of our mobile-first rewards interface before joining. Switch tabs below to preview actual workflows.
              </p>

              {/* Interactive Screen Tab Controls */}
              <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
                <button
                  onClick={() => setActivePreviewTab('tasks')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePreviewTab === 'tasks'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Daily Tasks
                </button>
                <button
                  onClick={() => setActivePreviewTab('wallet')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePreviewTab === 'wallet'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Wallet & Payouts
                </button>
                <button
                  onClick={() => setActivePreviewTab('referral')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePreviewTab === 'referral'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Referral Hub
                </button>
                <button
                  onClick={() => setActivePreviewTab('notifications')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePreviewTab === 'notifications'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Notifications
                </button>
              </div>
            </div>

            {/* Android Device Mockup Frame */}
            <div className="max-w-[380px] sm:max-w-[410px] mx-auto">
              <div className="relative rounded-[44px] p-3.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-2xl shadow-purple-950/60 border border-slate-600/50">
                {/* Screen Bezel */}
                <div className="rounded-[36px] bg-slate-950 overflow-hidden border border-slate-800 min-h-[580px] flex flex-col relative text-slate-100">
                  {/* Status Bar */}
                  <div className="px-5 pt-3 pb-2 flex items-center justify-between text-[11px] font-semibold text-slate-400 border-b border-slate-900/60">
                    <span>09:41</span>
                    {/* Punch hole camera */}
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px]">5G</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                  </div>

                  {/* Mockup In-App Header */}
                  <div className="px-4 py-3 bg-slate-900/80 border-b border-indigo-950/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Smart Earn</div>
                        <div className="text-[9px] text-purple-300">Earn Smart. Earn Daily.</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-purple-500/30">
                      <Wallet className="w-3 h-3 text-amber-400" />
                      <span className="text-[11px] font-bold text-amber-300">1,250 Coins</span>
                    </div>
                  </div>

                  {/* Mockup Screen Content Based On Selected Tab */}
                  <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    {activePreviewTab === 'tasks' && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        {/* Daily Check-in streak card */}
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white">Daily Check-in Streak</span>
                            <span className="text-[10px] text-purple-300 font-bold">+25 Coins</span>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                              <div
                                key={i}
                                className={`py-1 rounded-md ${
                                  i < 4 ? 'bg-purple-600 text-white font-bold' : 'bg-slate-900 text-slate-500'
                                }`}
                              >
                                {d}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Sample Tasks */}
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Verified Tasks Available
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                              📲
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">Partner App Test</div>
                              <div className="text-[10px] text-slate-400">Install and sign in 1 time</div>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-purple-600/30 text-purple-300 font-bold text-[11px] border border-purple-500/40">
                            +200 Coins
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                              📝
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">Sponsored Quick Survey</div>
                              <div className="text-[10px] text-slate-400">Share your opinion (3 min)</div>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-purple-600/30 text-purple-300 font-bold text-[11px] border border-purple-500/40">
                            +120 Coins
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                              ▶️
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">Watch Rewarded Clip</div>
                              <div className="text-[10px] text-slate-400">30-second verified sponsor video</div>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-purple-600/30 text-purple-300 font-bold text-[11px] border border-purple-500/40">
                            +30 Coins
                          </span>
                        </div>
                      </div>
                    )}

                    {activePreviewTab === 'wallet' && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        {/* Balance Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-950 via-purple-950 to-slate-900 border border-purple-500/40">
                          <div className="text-[11px] text-slate-300 font-medium">Available Balance</div>
                          <div className="flex items-baseline space-x-2 mt-1">
                            <span className="text-2xl font-black text-white">1,250</span>
                            <span className="text-xs text-purple-300 font-bold">Coins ≈ ₹12.50</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-2">
                            Min. Withdrawal: 1,000 Coins (₹10.00)
                          </div>
                        </div>

                        {/* Payout Options */}
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Payout Options
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-white">
                            <span>UPI Direct Transfer</span>
                            <span className="text-[10px] text-emerald-400">Fast & Zero Fee</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                            example@okhdfcbank
                          </div>
                          <button
                            onClick={onGetStarted}
                            className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs"
                          >
                            Withdraw ₹12.50
                          </button>
                        </div>

                        {/* Recent History Preview */}
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
                          <div>
                            <div className="font-bold text-white">Survey #189 Credit</div>
                            <div className="text-[9px] text-slate-500">Today, 08:30 AM</div>
                          </div>
                          <span className="text-emerald-400 font-bold">+120 Coins</span>
                        </div>
                      </div>
                    )}

                    {activePreviewTab === 'referral' && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        {/* Referral Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/30 text-center">
                          <Gift className="w-8 h-8 text-purple-400 mx-auto mb-1.5" />
                          <div className="text-xs font-bold text-white">Invite Friends, Earn Together</div>
                          <p className="text-[10px] text-slate-300 mt-1">
                            Your friend gets +50 Coins welcome bonus. You receive +100 Coins upon their first verified activity!
                          </p>

                          {/* Code Display */}
                          <div className="mt-3 p-2 rounded-xl bg-slate-950 border border-purple-500/40 flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-purple-300 tracking-wider">SMART2026</span>
                            <span className="text-[10px] text-indigo-400 font-bold">Tap to Copy</span>
                          </div>
                        </div>

                        {/* Referral Breakdown */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span>Total Invited</span>
                            <span className="font-bold text-white">4 Friends</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Bonus Earned</span>
                            <span className="font-bold text-purple-300">400 Coins</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePreviewTab === 'notifications' && (
                      <div className="space-y-2.5 animate-in fade-in duration-200">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Recent Activity Alerts
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-white">Task Approved</div>
                            <div className="text-[10px] text-slate-400">+200 Coins added to your wallet for App Test.</div>
                            <div className="text-[9px] text-slate-500 mt-1">10 mins ago</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-2.5">
                          <Wallet className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-white">Withdrawal Successful</div>
                            <div className="text-[10px] text-slate-400">₹25.00 transferred to UPI: user@oksbi</div>
                            <div className="text-[9px] text-slate-500 mt-1">Yesterday, 04:15 PM</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-2.5">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-white">Daily Streak Ready</div>
                            <div className="text-[10px] text-slate-400">Claim your Day 4 check-in reward now!</div>
                            <div className="text-[9px] text-slate-500 mt-1">Today, 06:00 AM</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mockup Bottom Navigation */}
                  <div className="px-6 py-2.5 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-slate-500 text-[9px] font-semibold">
                    <span className="text-purple-400 flex flex-col items-center">
                      <span>⚡</span>Home
                    </span>
                    <span className="flex flex-col items-center">
                      <span>🎯</span>Tasks
                    </span>
                    <span className="flex flex-col items-center">
                      <span>👛</span>Wallet
                    </span>
                    <span className="flex flex-col items-center">
                      <span>👥</span>Team
                    </span>
                  </div>

                  {/* Android gesture line */}
                  <div className="pb-1.5 flex justify-center bg-slate-950">
                    <div className="w-24 h-1 bg-slate-800 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Underline CTA */}
            <div className="text-center mt-8">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center space-x-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer group"
              >
                <span>Launch the live application experience</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: FEATURES SECTION
           ========================================================================= */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Core Capabilities</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Designed for Convenience and Transparency
            </h3>
            <p className="text-base text-slate-400">
              Everything in Smart Earn is built with clear guidelines, immediate accounting, and zero misleading gimmicks.
            </p>
          </div>

          {/* 6 Clean Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Daily Tasks */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-indigo-900/40 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2.5">Daily Tasks</h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Engage with vetted sponsor activities, quick opinion surveys, app testing, and daily check-in streaks with precise completion guidelines.
              </p>
              <div className="text-xs text-purple-400 font-semibold flex items-center space-x-1">
                <span>Verified partner tracking</span>
              </div>
            </div>

            {/* Feature 2: Rewards */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-indigo-900/40 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2.5">Transparent Rewards</h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                100 Coins = {settings?.currencySymbol || '₹'}1.00. No tricky exchange rate shifts, expiring tokens, or arbitrary coin decay rules.
              </p>
              <div className="text-xs text-indigo-400 font-semibold flex items-center space-x-1">
                <span>Direct point-to-rupee valuation</span>
              </div>
            </div>

            {/* Feature 3: Referral Program */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-indigo-900/40 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2.5">Referral Program</h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Share your personal code with genuine friends. When they register and complete their initial verified task, you both receive bonus coins.
              </p>
              <div className="text-xs text-blue-400 font-semibold flex items-center space-x-1">
                <span>Tiered community bonuses</span>
              </div>
            </div>

            {/* Feature 4: Wallet */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-indigo-900/40 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2.5">Secure Wallet</h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Keep real-time tabs on your pending and approved balances. Request payouts straight to your UPI ID or Bank account without fees.
              </p>
              <div className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                <span>Direct UPI / NEFT payouts</span>
              </div>
            </div>

            {/* Feature 5: Transaction History */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-indigo-900/40 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2.5">Transaction History</h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Every credit, daily streak bonus, referral reward, and withdrawal request is permanently logged with unique timestamps and reference IDs.
              </p>
              <div className="text-xs text-amber-400 font-semibold flex items-center space-x-1">
                <span>Auditable ledger transparency</span>
              </div>
            </div>

            {/* Feature 6: Notifications */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-indigo-900/40 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/15 text-pink-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2.5">Instant Notifications</h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Receive prompt alerts when task proofs are approved, withdrawal disbursements are issued, or special community bonus events begin.
              </p>
              <div className="text-xs text-pink-400 font-semibold flex items-center space-x-1">
                <span>Real-time status updates</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: “HOW IT WORKS” (3 CLEAR STEPS)
           ========================================================================= */}
        <section id="how-it-works" className="py-20 bg-slate-900/50 border-y border-indigo-900/30 scroll-mt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Step-by-Step Flow</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                How It Works
              </h3>
              <p className="text-base text-slate-400">
                Getting started with Smart Earn takes less than a minute. Follow these 3 straightforward steps:
              </p>
            </div>

            {/* 3 Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="relative p-8 rounded-3xl bg-slate-950 border border-indigo-900/50 flex flex-col items-start group">
                <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center font-black text-xl mb-6 group-hover:scale-110 transition-transform">
                  1
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Create an account</h4>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  Sign up with your phone number or email in seconds. No joining fees, credit cards, or upfront investments are ever required.
                </p>
                <div className="mt-auto text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Instant access</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative p-8 rounded-3xl bg-slate-950 border border-indigo-900/50 flex flex-col items-start group">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-black text-xl mb-6 group-hover:scale-110 transition-transform">
                  2
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Complete eligible activities</h4>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  Choose from daily streak check-ins, verified partner app trials, rewarded video views, or surveys. Follow the clear task guidelines to submit proof.
                </p>
                <div className="mt-auto text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Automated tracking</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative p-8 rounded-3xl bg-slate-950 border border-indigo-900/50 flex flex-col items-start group">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 flex items-center justify-center font-black text-xl mb-6 group-hover:scale-110 transition-transform">
                  3
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Receive rewards according to rules</h4>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  Accumulate verified coins in your in-app wallet. Once you reach the minimum payout threshold, request a direct withdrawal via UPI or Bank transfer.
                </p>
                <div className="mt-auto text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Direct UPI / Bank transfer</span>
                </div>
              </div>
            </div>

            {/* Steps CTA */}
            <div className="mt-12 text-center">
              <button
                onClick={onGetStarted}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-105 cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Ready to start? Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 6: REFERRAL SECTION
           ========================================================================= */}
        <section id="referral" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Description & Rules */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>Fair Community Growth</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Honest, Tier-Based Referral System
              </h3>
              <p className="text-slate-300 text-base leading-relaxed">
                Smart Earn rewards genuine word-of-mouth recommendations. When you invite real colleagues or friends, both parties benefit under clear, abuse-resistant rules.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    🎁
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Your Friend Gets a Welcome Bonus</h5>
                    <p className="text-xs text-slate-400 mt-1">
                      Applying your code gives your friend +50 bonus coins instantly upon verified account creation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    🤝
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">You Earn on Verified Milestones</h5>
                    <p className="text-xs text-slate-400 mt-1">
                      When your referred friend completes their first verified task, you receive a +100 Coins reward, plus recurring community level points.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    🛡️
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Strict Anti-Fraud Protection</h5>
                    <p className="text-xs text-slate-400 mt-1">
                      Self-referrals on the same physical phone or through proxy networks are rejected by our device fingerprinting system to protect legitimate rewards.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onGetStarted}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-105 cursor-pointer inline-flex items-center space-x-2"
                >
                  <span>Get Your Referral Code Inside the App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column: Interactive Referral Calculator Card */}
            <div className="lg:col-span-5">
              <div className="p-7 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 border border-purple-500/30 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
                  <div>
                    <h4 className="text-base font-bold text-white">Referral Reward Calculator</h4>
                    <p className="text-xs text-slate-400">Estimate potential rewards with active friends</p>
                  </div>
                  <Gift className="w-6 h-6 text-purple-400" />
                </div>

                <div className="py-6 space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                      <span>Friends Invited</span>
                      <span className="text-purple-300 font-extrabold text-sm">{referralCount} Friends</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      value={referralCount}
                      onChange={(e) => setReferralCount(parseInt(e.target.value) || 1)}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>1 friend</span>
                      <span>12 friends</span>
                      <span>25 friends</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-900/60 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Milestone Bonus (100 coins/ea):</span>
                      <span className="font-bold text-white">{referralCount * 100} Coins</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Estimated Value:</span>
                      <span className="font-bold text-emerald-400">
                        {settings?.currencySymbol || '₹'}
                        {((referralCount * 100) / (settings?.coinToCurrencyRatio || 100)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-slate-900">
                      <span className="text-slate-400">Unlocked Community Tier:</span>
                      <span className="font-bold text-purple-300">
                        {referralCount >= 15 ? 'Diamond' : referralCount >= 10 ? 'Gold' : referralCount >= 5 ? 'Silver' : 'Bronze'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    *Rewards are credited after each referee verifies their unique device and completes at least one eligible sponsored activity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 7: TRUST & SAFETY SECTION
           ========================================================================= */}
        <section id="trust-safety" className="py-20 bg-slate-900/40 border-y border-indigo-900/30 scroll-mt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Security & Fair Play</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Trust & Safety Built In
              </h3>
              <p className="text-base text-slate-400">
                We believe trust is earned through clear conduct, protected personal data, and reliable user support.
              </p>
            </div>

            {/* 4 Trust Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pillar 1: Secure authentication */}
              <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-900/40 flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Secure Authentication</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Cryptographically hashed passwords, device session tokens, and encrypted communications prevent unauthorized account takeovers.
                </p>
              </div>

              {/* Pillar 2: Transparent reward rules */}
              <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-900/40 flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Transparent Reward Rules</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Coin valuations, minimum payout criteria, and submission verification requirements are openly published with zero surprise fees.
                </p>
              </div>

              {/* Pillar 3: Privacy-focused design */}
              <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-900/40 flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Privacy-Focused Design</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We request only the minimum data required to verify payouts. We never sell your personal contact details to third-party telemarketers.
                </p>
              </div>

              {/* Pillar 4: Customer support */}
              <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-900/40 flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Responsive Customer Support</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Real assistance via WhatsApp helpline and email support. Dedicated dispute resolution for task verifications or payout questions.
                </p>
              </div>
            </div>

            {/* Fair Play Notice Card */}
            <div className="mt-10 p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Fair Play Commitment</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Our strict policy against bots and spoofing guarantees honest payouts for active, authentic users.
                  </p>
                </div>
              </div>
              <button
                onClick={() => (onOpenTermsModal ? onOpenTermsModal() : setLocalModal('terms'))}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-indigo-700/50 hover:border-purple-400 text-xs font-bold text-white shrink-0 cursor-pointer"
              >
                Read Fair Play Terms
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 8: FAQ SECTION
           ========================================================================= */}
        <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto scroll-mt-20">
          <div className="text-center mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Got Questions?</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Frequently Asked Questions
            </h3>
            <p className="text-base text-slate-400">
              Honest answers to the most common questions about Smart Earn.
            </p>
          </div>

          {/* Accordion List */}
          <div className="space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl transition-all border ${
                    isOpen
                      ? 'bg-slate-900/90 border-purple-500/40 shadow-lg shadow-purple-950/20'
                      : 'bg-slate-900/40 border-indigo-950/60 hover:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between cursor-pointer focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-sm sm:text-base text-white pr-4">{faq.q}</span>
                    <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-400' : ''}`}
                      />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3 animate-in fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center text-xs text-slate-400">
            Have a different question?{' '}
            <button
              onClick={() => (onOpenContactModal ? onOpenContactModal() : setLocalModal('contact'))}
              className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
            >
              Reach out to our support team
            </button>
          </div>
        </section>

        {/* =========================================================================
            SECTION 9: DOWNLOAD / GET STARTED CTA SECTION
           ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="relative rounded-[36px] p-8 sm:p-14 overflow-hidden bg-gradient-to-tr from-purple-900 via-indigo-900 to-slate-950 border border-purple-500/40 shadow-2xl shadow-indigo-950/70 text-center">
            {/* Ambient Inner Lighting */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-950/60 border border-purple-400/40 text-purple-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Join Free in 30 Seconds</span>
              </div>

              <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Ready to Start Earning Daily Rewards?
              </h3>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                Experience Smart Earn on your Android device or modern web browser. No fees, no setup delays, and direct UPI or Bank withdrawals.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-extrabold text-sm sm:text-base shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{user ? 'Open Smart Earn App' : 'Get Started Now'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-purple-400/30 text-white font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'App URL Copied' : 'Copy Web App Link'}</span>
                </button>
              </div>

              <div className="pt-4 text-xs text-slate-300 font-medium">
                100% Free · No Financial Investment · Standard Rules Apply
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          SECTION 10: FOOTER
         ========================================================================= */}
      <footer className="bg-slate-950 border-t border-indigo-950/60 pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white">Smart Earn</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Earn Smart. Earn Daily. A verified, transparent rewards application for Android and the modern web.
            </p>
            <div className="text-[11px] text-slate-500">
              Version 3.2.0 · Live Production Build
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Quick Navigation</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors cursor-pointer">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('referral')} className="hover:text-white transition-colors cursor-pointer">
                  Referral System
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('trust-safety')} className="hover:text-white transition-colors cursor-pointer">
                  Trust & Safety
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Policies */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Legal & Governance</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => (onOpenPrivacyModal ? onOpenPrivacyModal() : setLocalModal('privacy'))}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => (onOpenTermsModal ? onOpenTermsModal() : setLocalModal('terms'))}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => setLocalModal('fairplay')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Fair Play Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => (onOpenContactModal ? onOpenContactModal() : setLocalModal('contact'))}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Dispute Resolution
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Support & Contact */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Customer Support</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={`mailto:${settings?.supportEmail || 'support@smartearn.app'}`}
                  className="hover:text-white transition-colors flex items-center space-x-2"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{settings?.supportEmail || 'support@smartearn.app'}</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${(settings?.supportWhatsapp || '+919113124207').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center space-x-2"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp: {settings?.supportWhatsapp || '+91 91131 24207'}</span>
                </a>
              </li>
              <li className="pt-1">
                <button
                  onClick={() => (onOpenContactModal ? onOpenContactModal() : setLocalModal('contact'))}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Open Support Ticket
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Honest Mandatory Disclaimer */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900/80 text-[11px] leading-relaxed text-slate-300">
          <p className="mb-3">
            <strong>Honest Disclosure & Platform Disclaimer:</strong> Smart Earn is an independent rewards and engagement platform. We provide promotional points for verified sponsor engagements, voluntary surveys, and partner activities. We do not offer investment schemes, work-from-home employment contracts, or guaranteed income promises. Rewards are subject to compliance with platform fair play guidelines and verified completion of eligible sponsor activities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between text-slate-400 pt-2 border-t border-slate-950">
            <span>© {new Date().getFullYear()} Smart Earn. All rights reserved.</span>
            <span className="mt-2 sm:mt-0">Built with genuine rewards architecture for Android & Web.</span>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          LOCAL MODAL FALLBACKS (If triggered from landing page)
         ========================================================================= */}
      {localModal === 'privacy' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg max-h-[85vh] bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col text-slate-300">
            <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
              <div className="flex items-center space-x-2.5">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Privacy Policy</h3>
              </div>
              <button onClick={() => setLocalModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs leading-relaxed">
              <p>
                Smart Earn respects your privacy. We collect minimal device identifiers and contact details solely to manage your coin ledger and fulfill requested UPI/Bank payouts.
              </p>
              <h5 className="font-bold text-white">1. Data Collected</h5>
              <p>Mobile number, email address, device identification hash (for one-account integrity), and transaction ledger data.</p>
              <h5 className="font-bold text-white">2. Data Security</h5>
              <p>All communication is secured via industry standard TLS encryption. We do not sell user phone numbers or emails to third-party telemarketers.</p>
              <h5 className="font-bold text-white">3. User Rights</h5>
              <p>Users may request account deletion and transaction data erasure by contacting support.</p>
            </div>
          </div>
        </div>
      )}

      {localModal === 'fairplay' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg max-h-[85vh] bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col text-slate-300">
            <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
              <div className="flex items-center space-x-2.5">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Fair Play & Anti-Fraud Policy</h3>
              </div>
              <button onClick={() => setLocalModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs leading-relaxed">
              <p>
                Smart Earn maintains a level playing field for all community members and sponsor partners.
              </p>
              <h5 className="font-bold text-white">1. Single Account Policy</h5>
              <p>Each user is strictly entitled to one account per physical device and telephone number.</p>
              <h5 className="font-bold text-white">2. Prohibited Technologies</h5>
              <p>Use of Android emulators, VPNs, proxies, automated click scripts, or bot farms is prohibited and triggers automatic account forfeiture.</p>
              <h5 className="font-bold text-white">3. Legitimate Task Proofs</h5>
              <p>Task submissions must reflect genuine human completion. Uploading fabricated screenshots or fraudulent transaction IDs results in immediate task rejection.</p>
            </div>
          </div>
        </div>
      )}

      {localModal === 'terms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg max-h-[85vh] bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col text-slate-300">
            <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Terms & Conditions</h3>
              </div>
              <button onClick={() => setLocalModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs leading-relaxed">
              <h5 className="font-bold text-white">1. Service Nature</h5>
              <p>Smart Earn is an entertainment and promotional reward application. Coin balances do not constitute bank deposits, shares, or securities.</p>
              <h5 className="font-bold text-white">2. Payout Processing</h5>
              <p>Withdrawals require achieving the verified minimum threshold ({settings?.minWithdrawalCoins || 1000} Coins) and supplying valid UPI or Bank credentials.</p>
              <h5 className="font-bold text-white">3. Limitation of Liability</h5>
              <p>We are not responsible for delays caused by third-party UPI or banking rail failures or incorrect beneficiary details entered by users.</p>
            </div>
          </div>
        </div>
      )}

      {localModal === 'contact' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col text-slate-300">
            <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
              <div className="flex items-center space-x-2.5">
                <Mail className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Contact & Support</h3>
              </div>
              <button onClick={() => setLocalModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <a
                href={`mailto:${settings?.supportEmail || 'support@smartearn.app'}`}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3 hover:border-indigo-500 transition-colors"
              >
                <Mail className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="font-bold text-white">Email Helpdesk</div>
                  <div className="text-slate-400">{settings?.supportEmail || 'support@smartearn.app'}</div>
                </div>
              </a>

              <a
                href={`https://wa.me/${(settings?.supportWhatsapp || '+919113124207').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3 hover:border-emerald-500 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-bold text-white">WhatsApp Fast Support</div>
                  <div className="text-slate-400">{settings?.supportWhatsapp || '+91 91131 24207'}</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
