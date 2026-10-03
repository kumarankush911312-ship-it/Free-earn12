import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface ThreeDSplashScreenProps {
  onComplete: () => void;
  autoCloseDelayMs?: number;
}

export const ThreeDSplashScreen: React.FC<ThreeDSplashScreenProps> = ({
  onComplete,
  autoCloseDelayMs = 2800,
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('✨ Initializing 3D Experience...');
  const [isExiting, setIsExiting] = useState(false);
  
  // Interactive 3D tilt angles based on mouse or touch
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle interactive 3D parallax on pointer movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: -(y * 30), // rotateX tilt
      y: x * 30,    // rotateY tilt
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !e.touches[0]) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width - 0.5;
    const y = (touch.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: -(y * 25),
      y: x * 25,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Progress animation and text phases
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / (autoCloseDelayMs - 400)) * 100));
      setProgress(pct);

      if (pct < 30) {
        setStatusText('✨ Loading 3D Environment & Assets...');
      } else if (pct < 65) {
        setStatusText('🛡️ Verifying 1-Phone-1-Account Security...');
      } else if (pct < 95) {
        setStatusText('💎 Loading Instant UPI & Daily Bonuses...');
      } else {
        setStatusText('🚀 Welcome to Free Earn!');
      }

      if (pct >= 100) {
        clearInterval(interval);
        handleTriggerExit();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [autoCloseDelayMs]);

  const handleTriggerExit = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 650); // Matches 3D exit zoom transition duration
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseLeave={handlePointerLeave}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 bg-slate-950 text-white select-none overflow-hidden transition-all duration-700 ease-out ${
        isExiting
          ? 'opacity-0 scale-125 filter blur-sm pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Deep Space Background with Animated Ambient Starfield */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] bg-emerald-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* 3D Perspective Horizon Grid (Virtual Floor) */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[45vh] opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: 'rotateX(75deg) translateY(120px) scale(1.6)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1), transparent)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1), transparent)',
        }}
      />

      {/* Top Floating Badge Bar */}
      <div 
        className="w-full max-w-sm flex items-center justify-between z-20 pt-4"
        style={{
          transform: `translateZ(40px) rotateX(${tilt.x * 0.3}deg) rotateY(${tilt.y * 0.3}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-indigo-500/30 backdrop-blur-md shadow-lg shadow-indigo-950/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-200">
            3D Secure Engine
          </span>
        </div>

        <button
          onClick={handleTriggerExit}
          className="px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-xs font-bold text-slate-300 border border-slate-700/60 backdrop-blur-md transition-all flex items-center space-x-1"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* CENTER 3D STAGE: Rotating 3D Emblem & Orbiting Floating Assets */}
      <div 
        className="relative my-auto flex flex-col items-center justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.12s ease-out',
        }}
      >
        {/* Orbiting 3D Mini Coin 1 (Front Left) */}
        <div 
          className="absolute -left-16 -top-8 w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/40 animate-float-slow pointer-events-none"
          style={{
            transform: 'translateZ(90px) rotateZ(-12deg) rotateY(20deg)',
          }}
        >
          <div className="w-full h-full bg-slate-900/40 rounded-[14px] flex items-center justify-center backdrop-blur-sm border border-yellow-200/50">
            <span className="font-black text-amber-200 text-lg">₹</span>
          </div>
        </div>

        {/* Orbiting 3D Diamond / Gem (Top Right) */}
        <div 
          className="absolute -right-14 -top-12 w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-200 p-0.5 shadow-lg shadow-emerald-500/40 animate-bounce-subtle pointer-events-none"
          style={{
            transform: 'translateZ(110px) rotateZ(25deg) rotateX(15deg)',
          }}
        >
          <div className="w-full h-full bg-slate-950/50 rounded-[10px] flex items-center justify-center backdrop-blur-sm border border-emerald-300/40">
            <Sparkles className="w-6 h-6 text-emerald-300" />
          </div>
        </div>

        {/* Orbiting 3D Mini Badge (Bottom Right) */}
        <div 
          className="absolute -right-12 bottom-6 w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-400 p-0.5 shadow-xl shadow-purple-600/40 pointer-events-none"
          style={{
            transform: 'translateZ(70px) rotateZ(-18deg)',
          }}
        >
          <div className="w-full h-full bg-slate-900/60 rounded-[14px] flex items-center justify-center border border-purple-300/40">
            <Zap className="w-5 h-5 text-purple-200" />
          </div>
        </div>

        {/* PRIMARY 3D APP ICON BADGE */}
        <div
          className="relative w-40 h-40 sm:w-48 sm:h-48 group cursor-pointer active:scale-95 transition-transform duration-200"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateZ(60px)',
          }}
          onClick={handleTriggerExit}
        >
          {/* Volumetric Radial Aura Glow Behind Icon */}
          <div className="absolute inset-0 rounded-[48px] bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 blur-2xl opacity-60 animate-pulse" />

          {/* 3D Extruded Base Slices (Gives true 3D thickness) */}
          <div 
            className="absolute inset-0 rounded-[44px] bg-slate-900 border-2 border-indigo-500/20 shadow-2xl shadow-indigo-950"
            style={{ transform: 'translateZ(-20px)' }}
          />
          <div 
            className="absolute inset-0 rounded-[44px] bg-indigo-950/80 border border-purple-500/30"
            style={{ transform: 'translateZ(-10px)' }}
          />

          {/* Front High-Gloss Glass Face */}
          <div 
            className="relative w-full h-full rounded-[44px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-1 border-2 border-indigo-400/40 shadow-2xl shadow-indigo-600/40 flex items-center justify-center overflow-hidden"
            style={{ transform: 'translateZ(20px)' }}
          >
            {/* Specular Diagonal Reflection Sheen */}
            <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/15 to-transparent rotate-45 pointer-events-none animate-shimmer" />

            {/* Central 3D Embossed Gold Coin */}
            <div 
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 p-1.5 shadow-2xl shadow-amber-500/50 flex items-center justify-center animate-spin-slow-subtle"
              style={{
                transform: 'translateZ(35px)',
                boxShadow: '0 20px 35px -5px rgba(234, 179, 8, 0.45), inset 0 3px 6px rgba(255,255,255,0.8), inset 0 -4px 8px rgba(0,0,0,0.6)',
              }}
            >
              {/* Coin Inner Bevel Ring */}
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 p-1 flex items-center justify-center border border-amber-300/80">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                  
                  {/* Subtle Coin Specular Highlight */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />

                  {/* Embossed ₹ Symbol with 3D drop */}
                  <span 
                    className="font-black text-amber-950 text-4xl sm:text-5xl tracking-tighter drop-shadow-[0_2px_2px_rgba(254,240,138,0.9)]"
                    style={{
                      textShadow: '0 2px 0 #FEF08A, 0 -1px 2px #713F12',
                    }}
                  >
                    ₹
                  </span>

                  <span className="text-[9px] font-black text-amber-950 tracking-widest uppercase -mt-1 opacity-90">
                    FREE EARN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Dynamic Typographic Branding */}
        <div 
          className="mt-8 text-center space-y-2"
          style={{
            transform: 'translateZ(45px)',
          }}
        >
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-extrabold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Premium Earning Experience</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-purple-200">
            FREE EARN
          </h1>
          <p className="text-xs text-indigo-200/90 font-medium">
            Earn Smart. Earn Daily. Instant UPI & Bank Payouts.
          </p>
        </div>
      </div>

      {/* BOTTOM CONTROLS & 3D PROGRESS ENGINE */}
      <div 
        className="w-full max-w-sm space-y-3.5 z-20 pb-4"
        style={{
          transform: `translateZ(30px) rotateX(${tilt.x * 0.2}deg) rotateY(${tilt.y * 0.2}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Status text with animated pulse dot */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
          <span className="flex items-center space-x-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
            <span className="truncate">{statusText}</span>
          </span>
          <span className="font-mono font-bold text-indigo-400 text-xs shrink-0 ml-2">
            {progress}%
          </span>
        </div>

        {/* 3D Glowing Progress Bar */}
        <div className="relative w-full h-3 bg-slate-900/90 rounded-full border border-indigo-900/60 p-0.5 shadow-inner overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-100 ease-out relative shadow-lg shadow-indigo-500/50"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer sweep along progress bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* Interactive Tap to Enter Button */}
        <button
          onClick={handleTriggerExit}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/40 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
        >
          <span>Tap to Enter Free Earn</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Trust Badges */}
        <div className="flex items-center justify-center space-x-4 text-[10px] text-slate-400 pt-1">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>1-Phone-1-Account Protected</span>
          </span>
          <span>•</span>
          <span className="text-slate-400">100% Real Rewards</span>
        </div>
      </div>
    </div>
  );
};
