import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  Share2,
  Smartphone,
  Video,
  FileText,
  Flame,
  Coins,
  Send,
  ExternalLink,
} from 'lucide-react';

interface SocialVideoCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SocialVideoCreatorModal: React.FC<SocialVideoCreatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, settings } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'script' | 'caption'>('video');

  const totalDuration = 24; // 24 seconds vertical promo video
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const lastSpokenSceneRef = useRef<number>(-1);

  const referralCode = user?.referralCode || 'SE7K4P9X';
  const telegramUrl = settings.telegramChannelUrl || 'https://t.me/+gUbcV1SSrDQzMDNl';

  // Scene voiceover scripts in natural, energetic Hindi
  const sceneVoiceScripts = [
    {
      scene: 0,
      start: 0,
      end: 4.5,
      hindi: 'दोस्तों, क्या आप भी मोबाइल से डेली 500 से 1000 रुपए कमाना चाहते हैं बिना किसी इन्वेस्टमेंट के? फ्री अर्न ऐप डाउनलोड करें!',
      subtitle: 'मोबाइल से Daily ₹500 - ₹1000 कमाएं! 100% Free App 🚀',
    },
    {
      scene: 1,
      start: 4.5,
      end: 9.5,
      hindi: 'यहाँ सिर्फ 5 सेकंड के वीडियो ऐड्स देखकर कमाओ 5 कॉइन्स, और डेली 7 दिन के चेक इन से पाओ 100 फ्री कॉइन्स!',
      subtitle: '5-Second Video Ads = +5 Coins + 100 Streak Bonus! 🎬',
    },
    {
      scene: 2,
      start: 9.5,
      end: 14.5,
      hindi: 'गूगल पे टास्क पूरा करके पाओ सीधा 21 रुपए का इंस्टेंट बोनस और 450 कॉइन्स! फोनपे और भीम यूपीआई भी उपलब्ध हैं!',
      subtitle: 'Google Pay ₹21 Cash Bonus + 450 Coins Instant! ⚡',
    },
    {
      scene: 3,
      start: 14.5,
      end: 19.5,
      hindi: '100% रियल पेमेंट प्रूफ! मिनिमम विड्रॉल सिर्फ 5 रुपए से शुरू। डायरेक्ट गूगल पे, फोनपे, पेटीएम या बैंक में ट्रांसफर करें!',
      subtitle: '100% रियल पेमेंट! मिनिमम ₹5 डायरेक्ट UPI व बैंक ट्रांसफर! 💸',
    },
    {
      scene: 4,
      start: 19.5,
      end: 24.0,
      hindi: `अभी डाउनलोड करें! लिंक बायो और डिस्क्रिप्शन में है। रेफरल कोड ${referralCode} इस्तेमाल करें और टेलीग्राम चैनल जरूर जॉइन करें!`,
      subtitle: `अभी डाउनलोड करें! बायो में लिंक है | कोड: ${referralCode} 🔥`,
    },
  ];

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Default to Hindi or Indian English voice
      const hindiIdx = voices.findIndex(
        (v) => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
      );
      if (hindiIdx >= 0) {
        setSelectedVoiceIndex(hindiIdx);
      } else {
        const inIdx = voices.findIndex(
          (v) => v.lang.startsWith('en-IN') || v.name.toLowerCase().includes('india')
        );
        if (inIdx >= 0) setSelectedVoiceIndex(inIdx);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Speak current scene voiceover
  const speakScene = (sceneIndex: number) => {
    if (!isVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const scriptItem = sceneVoiceScripts[sceneIndex];
      if (!scriptItem) return;

      const utterance = new SpeechSynthesisUtterance(scriptItem.hindi);
      utterance.lang = 'hi-IN';
      utterance.rate = 1.05; // slightly faster energetic reel pace
      utterance.pitch = voiceGender === 'female' ? 1.15 : 0.85;

      if (availableVoices.length > 0 && availableVoices[selectedVoiceIndex]) {
        utterance.voice = availableVoices[selectedVoiceIndex];
      }

      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  // Synchronize speech with playback time
  useEffect(() => {
    if (!isOpen || !isPlaying || !isVoiceEnabled) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const t = currentTime;
    let activeScene = 0;
    if (t < 4.5) activeScene = 0;
    else if (t < 9.5) activeScene = 1;
    else if (t < 14.5) activeScene = 2;
    else if (t < 19.5) activeScene = 3;
    else activeScene = 4;

    if (activeScene !== lastSpokenSceneRef.current) {
      lastSpokenSceneRef.current = activeScene;
      speakScene(activeScene);
    }
  }, [currentTime, isOpen, isPlaying, isVoiceEnabled, voiceGender, selectedVoiceIndex]);

  // Audio synthesizer using Web Audio API for upbeat background music beat
  const playSoundEffect = (type: 'beat' | 'coin' | 'whoosh' | 'fanfare') => {
    if (isMuted) return;
    try {
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'suspended') return;

      const dest = audioDestinationRef.current;
      const now = ctx.currentTime;

      if (type === 'beat') {
        // Kick & Sub bass
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (dest) gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'coin') {
        // High sparkling bell chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.setValueAtTime(1318.51, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (dest) gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'whoosh') {
        // Whoosh filter sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (dest) gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'fanfare') {
        // Double triumphant chord
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.12, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          if (dest) gain.connect(dest);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.45);
        });
      }
    } catch {}
  };

  // Init audio context & audio destination stream
  useEffect(() => {
    if (isOpen) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          audioDestinationRef.current = ctx.createMediaStreamDestination();
        }
      } catch {}
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isOpen]);

  // Main playback timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.05;
        if (next >= totalDuration) {
          if (isRecording) {
            stopRecording();
          }
          lastSpokenSceneRef.current = -1; // reset speech scene tracker
          return 0; // Loop video
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying, isRecording]);

  // Rhythmic sound triggers synchronized with video beat
  useEffect(() => {
    if (!isOpen || !isPlaying || isMuted) return;
    const t = currentTime;

    // Beats every 0.5s
    const beatIndex = Math.floor(t * 2);
    if (Math.abs(t * 2 - beatIndex) < 0.06) {
      playSoundEffect('beat');
    }

    // Specific scene milestones
    if (
      Math.abs(t - 4.5) < 0.06 ||
      Math.abs(t - 9.5) < 0.06 ||
      Math.abs(t - 14.5) < 0.06 ||
      Math.abs(t - 19.5) < 0.06
    ) {
      playSoundEffect('whoosh');
    }
    if (Math.abs(t - 2) < 0.06 || Math.abs(t - 7) < 0.06 || Math.abs(t - 16.5) < 0.06) {
      playSoundEffect('coin');
    }
    if (Math.abs(t - 17.5) < 0.06) {
      playSoundEffect('fanfare');
    }
  }, [currentTime, isOpen, isPlaying, isMuted]);

  // Canvas 60FPS Video Rendering Engine (9:16 vertical resolution 540x960)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 540;
    const H = 960;
    canvas.width = W;
    canvas.height = H;

    const render = () => {
      const t = currentTime;
      ctx.clearRect(0, 0, W, H);

      // 1. Dynamic Animated Gradient Backdrop
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, `hsl(${230 + Math.sin(t * 0.5) * 20}, 70%, 10%)`);
      grad.addColorStop(0.5, `hsl(${280 + Math.cos(t * 0.5) * 25}, 65%, 8%)`);
      grad.addColorStop(1, `hsl(${340 + Math.sin(t * 0.5) * 15}, 65%, 12%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Starfield / Floating light dust
      for (let i = 0; i < 40; i++) {
        const seedX = (i * 97) % W;
        const seedY = (i * 131 + t * 45) % H;
        const radius = (Math.sin(i + t * 2) + 1.5) * 1.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (i % 5) * 0.1})`;
        ctx.beginPath();
        ctx.arc(seedX, seedY, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Neon ambient glow
      const glowGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 380);
      glowGrad.addColorStop(0, 'rgba(124, 58, 237, 0.25)');
      glowGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.12)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, H);

      // ================= SCENE 1: VIRAL HOOK (0.0s - 4.5s) =================
      if (t < 4.5) {
        const sceneT = t;
        const scale = Math.min(1, sceneT * 2.5);

        // Top Trending Badge
        ctx.save();
        ctx.translate(W / 2, 130);
        ctx.scale(scale, scale);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-140, -22, 280, 44, 22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef2f2';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 100% FREE NO INVESTMENT APP', 0, 6);
        ctx.restore();

        // Big Main Hook Headline
        ctx.save();
        ctx.translate(W / 2, 260);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
        ctx.shadowBlur = 25;
        ctx.fillText('MOBILE SE DAILY', 0, 0);

        ctx.fillStyle = '#facc15';
        ctx.font = '900 48px -apple-system, sans-serif';
        ctx.fillText('₹500 - ₹1,000', 0, 60);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 34px -apple-system, sans-serif';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.fillText('KAISE KAMAYEIN? 🚀', 0, 115);
        ctx.restore();

        // 3D Animated Gold Coin in Center
        const coinY = 520 + Math.sin(t * 6) * 15;
        const coinW = Math.abs(Math.cos(t * 3)) * 80 + 20;

        ctx.save();
        ctx.translate(W / 2, coinY);
        ctx.fillStyle = '#eab308';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.ellipse(0, 0, coinW, 80, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(0, 0, coinW * 0.8, 64, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#854d0e';
        ctx.font = '900 50px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₹', 0, 0);
        ctx.restore();

        // Subtitle Card
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(40, 660, W - 80, 90, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('App Name: FREE EARN', W / 2, 695);
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '600 15px -apple-system, sans-serif';
        ctx.fillText('✓ Direct UPI Transfer  ✓ Student & Housewife', W / 2, 725);
      }

      // ================= SCENE 2: ADS & DAILY BONUSES (4.5s - 9.5s) =================
      else if (t < 9.5) {
        const sceneT = t - 4.5;

        // Top Scene Header
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FEATURE 1: EARN BY WATCHING ADS', W / 2, 110);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px -apple-system, sans-serif';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 15;
        ctx.fillText('5-SECOND VIDEO ADS', W / 2, 155);

        // Feature Card 1: 5-Second Video Ads = 5 Coins
        ctx.save();
        ctx.translate(W / 2, 260);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(234, 179, 8, 0.4)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.roundRect(-210, -45, 420, 90, 22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = '900 22px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🎬 AdMob Short Videos', -180, -10);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.fillText('Har video ad par instant +5 Coins!', -180, 20);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(90, -22, 95, 44, 14);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 16px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+5 COINS', 137, 6);
        ctx.restore();

        // Feature Card 2: 7-Day Check-in Streak (+100 Coins)
        ctx.save();
        ctx.translate(W / 2, 385);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-210, -45, 420, 90, 22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a7f3d0';
        ctx.font = '900 22px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('📅 Daily 7-Day Check-In', -180, -10);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.fillText('Har roz login bonus +10 se +100 Coins', -180, 20);

        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.roundRect(70, -22, 115, 44, 14);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+100 STREAK', 127, 6);
        ctx.restore();

        // Feature Card 3: Mystery Lucky Box
        ctx.save();
        ctx.translate(W / 2, 510);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-210, -45, 420, 90, 22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e9d5ff';
        ctx.font = '900 22px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🎁 Lucky Mystery Box', -180, -10);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.fillText('Din me 1 baar Free Mystery Cash Box', -180, 20);

        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.roundRect(85, -22, 100, 44, 14);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 16px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FREE GIFT', 135, 6);
        ctx.restore();

        // Live Simulated Balance Counter Bar
        const currentCoins = Math.min(2500, Math.floor(sceneT * 600));
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(40, 640, W - 80, 100, 22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 13px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOUR LIVE EARNINGS BALANCE', W / 2, 672);

        ctx.fillStyle = '#facc15';
        ctx.font = '900 32px -apple-system, sans-serif';
        ctx.fillText(`⚡ ${currentCoins.toLocaleString()} COINS (₹${(currentCoins / 100).toFixed(2)})`, W / 2, 712);
      }

      // ================= SCENE 3: HIGH-PAYING TASKS (9.5s - 14.5s) =================
      else if (t < 14.5) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FEATURE 2: HIGH-PAYING TASKS', W / 2, 110);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px -apple-system, sans-serif';
        ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
        ctx.shadowBlur = 15;
        ctx.fillText('APP TASKS & LOOT DEALS', W / 2, 155);

        // Featured Task: Google Pay ₹21 Cash Bonus
        ctx.save();
        ctx.translate(W / 2, 280);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.roundRect(-215, -70, 430, 140, 24);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('FEATURED OFFER: GOOGLE PAY', -185, -35);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 24px -apple-system, sans-serif';
        ctx.fillText('Get ₹21 Instant UPI Cash', -185, -5);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 13px -apple-system, sans-serif';
        ctx.fillText('1st Payment pe ₹21 Bonus + 450 App Coins!', -185, 24);

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(-185, 36, 115, 26, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+450 COINS', -127, 54);
        ctx.restore();

        // Other Tasks: PhonePe, BHIM, Navi
        const subTasks = [
          { name: 'PhonePe UPI App', reward: '+400 Coins', color: '#8b5cf6' },
          { name: 'BHIM Official UPI', reward: '+350 Coins', color: '#10b981' },
          { name: 'Navi Investment App', reward: '+500 Coins', color: '#f59e0b' },
        ];

        subTasks.forEach((st, idx) => {
          const y = 440 + idx * 72;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(45, y, W - 90, 62, 16);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 17px -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(st.name, 70, y + 36);

          ctx.fillStyle = st.color;
          ctx.font = '900 17px -apple-system, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(st.reward, W - 70, y + 36);
        });

        // Bottom Banner
        ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(45, 680, W - 90, 65, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = '900 17px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('100+ NEW TASKS ADDED DAILY!', W / 2, 718);
      }

      // ================= SCENE 4: INSTANT UPI PAYMENT PROOF (14.5s - 19.5s) =================
      else if (t < 19.5) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FEATURE 3: 100% REAL PAYOUTS', W / 2, 110);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px -apple-system, sans-serif';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillText('INSTANT UPI WITHDRAWAL', W / 2, 155);

        // Big Green Checkmark Success Card
        ctx.save();
        ctx.translate(W / 2, 350);
        ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.roundRect(-215, -130, 430, 260, 28);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(0, -50, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 40px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', 0, -50);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 22px -apple-system, sans-serif';
        ctx.fillText('PAYMENT SUCCESSFUL!', 0, 15);

        ctx.fillStyle = '#6ee7b7';
        ctx.font = '900 44px -apple-system, sans-serif';
        ctx.fillText('₹500.00', 0, 68);

        ctx.fillStyle = '#a7f3d0';
        ctx.font = '600 14px -apple-system, sans-serif';
        ctx.fillText('Credited to Bank Account via UPI', 0, 102);
        ctx.restore();

        // Supported Payment Gateways
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SUPPORTED PAYMENT METHODS:', W / 2, 540);

        const paymentPills = ['Google Pay', 'PhonePe', 'Paytm UPI', 'Bank IMPS'];
        paymentPills.forEach((p, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const px = col === 0 ? W / 4 : (W * 3) / 4;
          const py = 575 + row * 50;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(px - 95, py - 18, 190, 38, 12);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f1f5f9';
          ctx.font = 'bold 14px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`⚡ ${p}`, px, py + 5);
        });

        // Min Withdrawal Note
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓ Minimum Withdrawal: Sirf ₹5 (500 Coins)!', W / 2, 710);
      }

      // ================= SCENE 5: CALL TO ACTION & REFERRAL (19.5s - 24s) =================
      else {
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DOWNLOAD & START EARNING TODAY', W / 2, 110);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 34px -apple-system, sans-serif';
        ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillText('DOWNLOAD FREE EARN', W / 2, 155);

        // Referral Code Card
        ctx.save();
        ctx.translate(W / 2, 280);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.roundRect(-215, -65, 430, 130, 26);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('USE REFERRAL CODE FOR +50 COINS BONUS:', 0, -30);

        ctx.fillStyle = '#fef08a';
        ctx.font = '900 38px monospace';
        ctx.fillText(referralCode, 0, 12);

        ctx.fillStyle = '#a7f3d0';
        ctx.font = '600 14px -apple-system, sans-serif';
        ctx.fillText('🎁 Get ₹50 Join Bonus Instantly', 0, 46);
        ctx.restore();

        // Telegram Community Card
        ctx.save();
        ctx.translate(W / 2, 440);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.2)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-215, -50, 430, 100, 22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 18px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✈️ OFFICIAL TELEGRAM CHANNEL', 0, -18);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px -apple-system, sans-serif';
        ctx.fillText('Daily Giveaway Codes & Instant Loot Deals!', 0, 10);

        ctx.fillStyle = '#7dd3fc';
        ctx.font = '600 12px font-mono';
        ctx.fillText('t.me/+gUbcV1SSrDQzMDNl', 0, 32);
        ctx.restore();

        // Big Download Pulsating Button
        const btnScale = 1 + Math.sin(t * 8) * 0.04;
        ctx.save();
        ctx.translate(W / 2, 590);
        ctx.scale(btnScale, btnScale);
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.roundRect(-190, -32, 380, 64, 32);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👉 LINK IN BIO & DESCRIPTION', 0, 0);
        ctx.restore();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 13px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Like, Share & Subscribe for Daily Earning Tricks! ❤️', W / 2, 690);
      }

      // ================= DYNAMIC KARAOKE SUBTITLE BANNER (WITH VOICE) =================
      let activeSub = sceneVoiceScripts[0].subtitle;
      if (t >= 4.5 && t < 9.5) activeSub = sceneVoiceScripts[1].subtitle;
      else if (t >= 9.5 && t < 14.5) activeSub = sceneVoiceScripts[2].subtitle;
      else if (t >= 14.5 && t < 19.5) activeSub = sceneVoiceScripts[3].subtitle;
      else if (t >= 19.5) activeSub = sceneVoiceScripts[4].subtitle;

      ctx.save();
      ctx.translate(W / 2, 855);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(250, 204, 21, 0.6)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(-245, -34, 490, 68, 22);
      ctx.fill();
      ctx.stroke();

      // Top audio voice indicator
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎙️ HINDI AI VOICEOVER PLAYING', 0, -12);

      // Main Subtitle Line
      ctx.fillStyle = '#fef08a';
      ctx.font = '900 16px -apple-system, sans-serif';
      ctx.fillText(activeSub, 0, 14);
      ctx.restore();

      // ================= TOP OVERLAY: LIVE WATERMARK & TIMER =================
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(25, 30, 130, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⚡ FREE EARN', 42, 53);

      // Duration countdown tag
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(W - 120, 30, 95, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${t.toFixed(1)}s / ${totalDuration}s`, W - 72, 53);

      // Bottom Progress Line
      const progressW = (t / totalDuration) * W;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, H - 8, W, 8);
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 10;
      ctx.fillRect(0, H - 8, progressW, 8);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, currentTime]);

  // Video Recording & Download with Audio Track
  const startRecording = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Resume AudioContext
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const canvasStream = canvas.captureStream(60);
      const audioTracks: MediaStreamTrack[] = [];

      // Add Web Audio output (beats, sound effects, chords)
      if (audioDestinationRef.current) {
        audioTracks.push(...audioDestinationRef.current.stream.getAudioTracks());
      }

      // If user enabled mic, capture mic audio so speech is baked in
      if (isMicEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioTracks.push(...micStream.getAudioTracks());
        } catch {
          console.warn('Microphone permission not granted, proceeding with canvas audio.');
        }
      }

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);

      recordedChunksRef.current = [];

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 3500000 });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);

        const a = document.createElement('a');
        a.href = url;
        a.download = `Free_Earn_Viral_Promo_Video_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setIsRecording(false);
        setCopyToast('🎬 Video with Voice & Sound downloaded successfully! Post it to Reels/Shorts.');
        setTimeout(() => setCopyToast(null), 4000);
      };

      // Restart from beginning for a clean 0 to 24s recording
      setCurrentTime(0);
      lastSpokenSceneRef.current = -1;
      setIsPlaying(true);
      setIsRecording(true);
      mediaRecorder.start();

      // Trigger scene 0 speech
      setTimeout(() => speakScene(0), 100);
    } catch (err: any) {
      alert('Video export could not start: ' + (err.message || 'Please use Chrome / Edge / Firefox'));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  if (!isOpen) return null;

  // Viral Script Text
  const viralScriptHindi = `🔥 VIRAL HINDI SCRIPT (0 to 24 SECONDS):

[0s - 4.5s] SCENE 1: HOOK
"दोस्तों, क्या आप भी अपने मोबाइल से डेली ₹500 से ₹1000 कमाना चाहते हैं बिना किसी इन्वेस्टमेंट के? फ्री अर्न ऐप डाउनलोड करें!"

[4.5s - 9.5s] SCENE 2: ADS & DAILY LOGIN
"यहाँ सिर्फ 5 सेकंड के वीडियो ऐड्स देखकर कमाओ 5 कॉइन्स, और डेली 7 दिन के चेक इन से पाओ 100 फ्री कॉइन्स!"

[9.5s - 14.5s] SCENE 3: HIGH-PAYING TASKS
"गूगल पे टास्क पूरा करके पाओ सीधा ₹21 का इंस्टेंट बोनस और 450 कॉइन्स! फोनपे और भीम यूपीआई टास्क भी उपलब्ध हैं!"

[14.5s - 19.5s] SCENE 4: PAYMENT PROOF
"100% रियल पेमेंट प्रूफ! मिनिमम विड्रॉल सिर्फ ₹5 से शुरू। डायरेक्ट गूगल पे, फोनपे, पेटीएम या बैंक में ट्रांसफर करें!"

[19.5s - 24.0s] SCENE 5: CALL TO ACTION
"अभी डाउनलोड करें! लिंक बायो और डिस्क्रिप्शन में है। मेरा रेफरल कोड [${referralCode}] इस्तेमाल करें और टेलीग्राम चैनल जरूर जॉइन करें!"`;

  // Viral Caption & Hashtags
  const viralCaption = `🔥 Daily ₹500 - ₹1,000 Free Earning App (100% Real Payment Proof) 🚀

Ghar baithe apne mobile se paise kamayein:
✅ 5-Second Video Ads dekh kar kamao (5 Coins per ad)
✅ Google Pay Offer: Instant ₹21 Cash Bonus
✅ Daily 7-Day Check-in & Mystery Box
✅ Minimum Withdrawal: Only ₹5 via UPI (GPay/PhonePe/Paytm)

📲 Download App Link: Bio me hai!
🎁 Use Referral Code: ${referralCode} (+50 Bonus Coins)
✈️ Official Telegram Channel: ${telegramUrl}

Save this reel & share with friends! ❤️

#FreeEarn #EarnMoneyOnline #OnlineEarning #DailyEarningApp #StudentEarning #WorkFromHome #PartTimeJob #PaytmCash #UPIEarning #ReelsIndia #ViralReel #InstagramReels #YouTubeShorts #LootOffer`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl bg-slate-900 border border-indigo-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg text-white">AI Social Media Video Studio (With Voice)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>VOICE ACTIVE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hindi Voiceover ke sath 9:16 vertical promo video player aur direct video download
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              onClose();
            }}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'video'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>9:16 Video Player & Voice Controls</span>
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'script'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Hindi Voiceover Script</span>
          </button>

          <button
            onClick={() => setActiveTab('caption')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'caption'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Captions & Viral Tags</span>
          </button>
        </div>

        {/* Tab 1: Video Player, Voice Controls & Exporter */}
        {activeTab === 'video' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left: 9:16 Canvas Stage */}
            <div className="md:col-span-6 flex flex-col items-center">
              <div className="relative w-full max-w-[270px] sm:max-w-[300px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-black">
                <canvas ref={canvasRef} className="w-full h-full object-contain" />

                {/* Recording indicator badge */}
                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-black border border-rose-400 shadow-lg animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span>REC ({currentTime.toFixed(1)}s / 24s)</span>
                  </div>
                )}
              </div>

              {/* Video Playback Controls */}
              <div className="w-full max-w-[300px] mt-3 flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setCurrentTime(0);
                    lastSpokenSceneRef.current = -1;
                    speakScene(0);
                  }}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>

                <span className="text-xs font-mono font-bold text-amber-300">
                  {currentTime.toFixed(1)}s / {totalDuration}s
                </span>
              </div>
            </div>

            {/* Right: Voice Settings & Video Export */}
            <div className="md:col-span-6 space-y-4">
              {/* Voice Settings Card */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-xs text-white">AI Hindi Voiceover Controls</h4>
                  </div>

                  <button
                    onClick={() => {
                      const next = !isVoiceEnabled;
                      setIsVoiceEnabled(next);
                      if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all ${
                      isVoiceEnabled
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isVoiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Voice Tone</label>
                    <select
                      value={voiceGender}
                      onChange={(e) => setVoiceGender(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="female">Female (मधुर आवाज़)</option>
                      <option value="male">Male (जोशीली आवाज़)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Test Voice</label>
                    <button
                      onClick={() => {
                        let activeScene = 0;
                        if (currentTime < 4.5) activeScene = 0;
                        else if (currentTime < 9.5) activeScene = 1;
                        else if (currentTime < 14.5) activeScene = 2;
                        else if (currentTime < 19.5) activeScene = 3;
                        else activeScene = 4;
                        speakScene(activeScene);
                        setCopyToast('🔊 Playing Hindi Voiceover...');
                        setTimeout(() => setCopyToast(null), 2500);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                    >
                      <span>▶ Test Voice Now</span>
                    </button>
                  </div>
                </div>

                {/* Mic Voiceover Option for Recording */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isMicEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-slate-400" />}
                    <div>
                      <div className="text-xs font-bold text-white">Record Mic Voice in Video</div>
                      <p className="text-[10px] text-slate-400">Apni aawaz video file ke sath record karein</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsMicEnabled(!isMicEnabled)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      isMicEnabled
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isMicEnabled ? 'MIC ON' : 'MIC OFF'}
                  </button>
                </div>
              </div>

              {/* Action Buttons: Download Video */}
              <div className="space-y-2.5">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-pink-600/30 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download 9:16 Video With Voice & Sound</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-xl shadow-rose-600/40 flex items-center justify-center space-x-2 animate-pulse"
                  >
                    <Pause className="w-5 h-5" />
                    <span>Stop Recording & Save Now ({currentTime.toFixed(1)}s)</span>
                  </button>
                )}

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  💡 Download button click karne par 24-second ka video voice, sound beat aur animated subtitles ke sath aapke device me download ho jayega.
                </p>
              </div>

              {/* Spoken Dialogues List */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300">Spoken Hindi Voice Lines:</div>
                <div className="space-y-2 text-[11px] max-h-48 overflow-y-auto pr-1">
                  {sceneVoiceScripts.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        currentTime >= s.start && currentTime < s.end
                          ? 'bg-pink-950/40 border-pink-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="text-pink-300">Scene {idx + 1} ({s.start}s - {s.end}s)</span>
                        {currentTime >= s.start && currentTime < s.end && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500 text-white animate-pulse">
                            SPEAKING NOW
                          </span>
                        )}
                      </div>
                      <p className="leading-snug">{s.hindi}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hindi Voiceover Script */}
        {activeTab === 'script' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Full Hindi Voiceover Script (Word-for-Word)</h4>
                <p className="text-xs text-slate-400">Agar aap apni aawaz me bolna chahte hain toh yeh script bol sakte hain:</p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(viralScriptHindi);
                  setCopyToast('Hindi voiceover script copied to clipboard!');
                  setTimeout(() => setCopyToast(null), 3000);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Script</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[55vh] overflow-y-auto">
              {viralScriptHindi}
            </div>
          </div>
        )}

        {/* Tab 3: Captions & Viral Tags */}
        {activeTab === 'caption' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Instagram Reels & YouTube Shorts Caption</h4>
                <p className="text-xs text-slate-400">Video post karte time yeh description aur trending hashtags copy karein:</p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(viralCaption);
                  setCopyToast('Caption & hashtags copied to clipboard!');
                  setTimeout(() => setCopyToast(null), 3000);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Caption & Tags</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-[55vh] overflow-y-auto select-all">
              {viralCaption}
            </div>
          </div>
        )}

        {/* Copy Toast Message */}
        {copyToast && (
          <div className="p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold text-center shadow-xl animate-fadeIn">
            {copyToast}
          </div>
        )}
      </div>
    </div>
  );
};
