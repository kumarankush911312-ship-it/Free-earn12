/**
 * Free Earn - Earn Smart. Earn Daily.
 * Complete Modern Android + Web Responsive Rewards & Earning Application
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { EarnView } from './views/EarnView';
import { WalletView } from './views/WalletView';
import { TeamView } from './views/TeamView';
import { ProfileView } from './views/ProfileView';
import { AdminView } from './views/AdminView';
import { AdminPortalView } from './views/AdminPortalView';
import { AuthView } from './views/AuthView';
import { AuthModal } from './components/AuthModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { RewardedAdModal } from './components/RewardedAdModal';
import { FaqModal, TermsModal, ContactSupportModal } from './components/SupportModals';
import { ThreeDSplashScreen } from './components/ThreeDSplashScreen';
import { LandingPageView } from './views/LandingPageView';
import { Wifi, Battery, Sparkles } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab, isPhoneFrame, authLoading, user, settings } = useApp();

  const [viewMode, setViewMode] = useState<'landing' | 'app'>(() => {
    try {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        hash.includes('app') ||
        hash.includes('wallet') ||
        hash.includes('earn') ||
        hash.includes('team') ||
        hash.includes('profile') ||
        search.includes('view=app')
      ) {
        return 'app';
      }
      if (hash.includes('landing') || search.includes('view=landing')) {
        return 'landing';
      }
    } catch {}
    return 'landing';
  });

  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [inviteBanner, setInviteBanner] = useState<string | null>(null);

  // Check URL for referral parameter (/r/CODE, ?ref=CODE, or #/?ref=CODE)
  React.useEffect(() => {
    const parseRef = () => {
      let ref: string | null = null;

      // 1. Check path /r/CODE or /ref/CODE
      const path = window.location.pathname;
      if (path.startsWith('/r/')) {
        ref = path.substring(3).split('/')[0].split('?')[0];
      } else if (path.startsWith('/ref/')) {
        ref = path.substring(5).split('/')[0].split('?')[0];
      }

      // 2. Check search params ?ref=CODE
      if (!ref) {
        const searchParams = new URLSearchParams(window.location.search);
        ref = searchParams.get('ref');
      }

      // 3. Check hash #/r/CODE or #/?ref=CODE
      if (!ref) {
        const hash = window.location.hash;
        if (hash.startsWith('#/r/') || hash.startsWith('#/ref/')) {
          ref = hash.replace(/^#(?:(?:\/r\/)|(?:\/ref\/))/, '').split('?')[0];
        } else if (hash.includes('ref=')) {
          const hashQuery = hash.split('?')[1];
          if (hashQuery) {
            const hashParams = new URLSearchParams(hashQuery);
            ref = hashParams.get('ref');
          }
        }
      }

      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        localStorage.setItem('freeearn_pending_ref', cleanRef);
        setInviteBanner(`🎁 Referral Code ${cleanRef} applied! Register to get +50 Free Coins bonus.`);
      }
    };

    parseRef();
    window.addEventListener('hashchange', parseRef);
    window.addEventListener('popstate', parseRef);
    return () => {
      window.removeEventListener('hashchange', parseRef);
      window.removeEventListener('popstate', parseRef);
    };
  }, []);

  // Two-way synchronization between URL and activeTab / viewMode
  React.useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes('admin') || path.startsWith('/admin') || search.includes('admin')) {
        if (activeTab !== 'admin') setActiveTab('admin');
      } else if (hash.includes('landing') || search.includes('view=landing')) {
        setViewMode('landing');
      } else if (hash.includes('app') || search.includes('view=app')) {
        setViewMode('app');
      } else if (hash.includes('wallet')) {
        setViewMode('app');
        if (activeTab !== 'wallet') setActiveTab('wallet');
      } else if (hash.includes('earn')) {
        setViewMode('app');
        if (activeTab !== 'earn') setActiveTab('earn');
      } else if (hash.includes('team')) {
        setViewMode('app');
        if (activeTab !== 'team') setActiveTab('team');
      } else if (hash.includes('profile')) {
        setViewMode('app');
        if (activeTab !== 'profile') setActiveTab('profile');
      } else if (activeTab === 'admin') {
        setActiveTab('home');
      }
    };
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('popstate', handleRoute);
    };
  }, [activeTab, setActiveTab]);

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Standalone Full-Screen Dedicated Admin Portal Mode (Direct personal link - bypasses user app & splash)
  const isDirectAdminUrl = () => {
    try {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      return hash.includes('admin') || path.includes('admin') || search.includes('admin');
    } catch {
      return false;
    }
  };

  if (activeTab === 'admin' || isDirectAdminUrl()) {
    return <AdminPortalView />;
  }

  // Maintenance Mode (Controlled via Admin Panel)
  if (settings.maintenanceMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
          <Sparkles className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">App Under Scheduled Maintenance</h1>
        <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          {settings.maintenanceMessage ||
            'Free Earn is currently undergoing scheduled optimization. All user coin balances and pending payouts are 100% safe. We will be back online shortly!'}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href={`https://wa.me/${(settings.supportWhatsapp || '+919113124207').replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all"
          >
            <span>Contact WhatsApp Support</span>
          </a>
          <a href="/#admin" className="text-xs text-slate-500 hover:text-slate-400 underline py-2">
            Admin Portal Access
          </a>
        </div>
      </div>
    );
  }

  // Landing Page Mode (Public Modern Showcase for Smart Earn)
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPageView
          onGetStarted={() => {
            setViewMode('app');
          }}
          onOpenPrivacyModal={() => setTermsModalOpen(true)}
          onOpenTermsModal={() => setTermsModalOpen(true)}
          onOpenContactModal={() => setContactModalOpen(true)}
        />
        {/* Modals available on landing page */}
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        <FaqModal isOpen={faqModalOpen} onClose={() => setFaqModalOpen(false)} />
        <TermsModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
        <ContactSupportModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
        />
      </>
    );
  }

  // 3D Cinematic Opening Screen when user opens app
  if (showSplash) {
    return <ThreeDSplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // If no user profile exists, require Register or Login first!
  if (!user) {
    return <AuthView onBackToLanding={() => setViewMode('landing')} />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView
            onOpenAd={() => setAdModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        );
      case 'earn':
        return (
          <EarnView
            onOpenAd={() => setAdModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        );
      case 'wallet':
        return <WalletView onOpenAuth={() => setAuthModalOpen(true)} />;
      case 'team':
        return <TeamView onOpenAuth={() => setAuthModalOpen(true)} />;
      case 'profile':
        return (
          <ProfileView
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenFaq={() => setFaqModalOpen(true)}
            onOpenTerms={() => setTermsModalOpen(true)}
            onOpenContact={() => setContactModalOpen(true)}
            onOpenLanding={() => setViewMode('landing')}
          />
        );
      default:
        return (
          <HomeView
            onOpenAd={() => setAdModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background radial glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-indigo-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Main Container: Android Phone Frame or Responsive Full Width */}
      <div
        className={`w-full transition-all duration-300 flex flex-col ${
          isPhoneFrame
            ? 'max-w-[430px] my-6 rounded-[48px] border-[10px] border-slate-800 shadow-2xl shadow-indigo-950/80 bg-slate-950 overflow-hidden min-h-[880px] relative ring-1 ring-slate-700/50'
            : 'max-w-2xl min-h-screen'
        }`}
      >
        {/* Android Simulated Status Bar (Shown in Phone Mockup) */}
        {isPhoneFrame && (
          <div className="bg-slate-950 px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400 select-none z-50">
            <span>{currentTime}</span>

            {/* Front Camera Punch-hole */}
            <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
            </div>

            <div className="flex items-center space-x-1.5">
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Global App Header */}
        <Header
          onOpenNotifications={() => setNotifDrawerOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onViewLanding={() => setViewMode('landing')}
        />

        {/* View Content Area */}
        <main className="flex-1 px-4 pt-4 max-w-xl mx-auto w-full">
          {/* Active Referral Invite Banner */}
          {inviteBanner && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-slate-900 border border-purple-500/50 flex items-center justify-between gap-2 shadow-lg shadow-purple-950/60 animate-in fade-in">
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-base">🎁</span>
                <span className="text-white font-medium">{inviteBanner}</span>
              </div>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shrink-0 shadow-md transition-all hover:scale-105"
              >
                Register
              </button>
            </div>
          )}
          {renderActiveView()}
        </main>

        {/* Bottom Navigation */}
        <BottomNav />

        {/* Android Gesture Bar */}
        {isPhoneFrame && (
          <div className="fixed bottom-1 left-0 right-0 flex justify-center pointer-events-none pb-1">
            <div className="w-32 h-1 bg-slate-700/60 rounded-full" />
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <NotificationDrawer
        isOpen={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
      />
      <RewardedAdModal isOpen={adModalOpen} onClose={() => setAdModalOpen(false)} />
      <FaqModal isOpen={faqModalOpen} onClose={() => setFaqModalOpen(false)} />
      <TermsModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
      <ContactSupportModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
