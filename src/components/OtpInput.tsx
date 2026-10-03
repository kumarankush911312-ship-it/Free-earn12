import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Clock, KeyRound } from 'lucide-react';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  countdownSeconds?: number;
  onResend?: () => Promise<void> | void;
  disabled?: boolean;
  error?: string | null;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  countdownSeconds = 30,
  onResend,
  disabled = false,
  error,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(countdownSeconds);
  const [isResending, setIsResending] = useState<boolean>(false);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Reset timer when countdownSeconds prop changes
  useEffect(() => {
    setTimeLeft(countdownSeconds);
  }, [countdownSeconds]);

  // Split value into array of length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChange = (index: number, val: string) => {
    if (disabled) return;

    // Filter only digits
    const cleaned = val.replace(/[^0-9]/g, '');

    if (cleaned.length > 1) {
      // User pasted multiple characters into a single box
      handlePastedDigits(cleaned);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned.slice(-1); // Take latest char
    const newOtp = newDigits.join('');
    onChange(newOtp);

    // Auto-advance to next box if digit was typed
    if (cleaned && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger complete if full length reached
    if (newOtp.length === length && onComplete) {
      onComplete(newOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current is empty, backspace into previous box
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        const newOtp = newDigits.join('');
        onChange(newOtp);
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    handlePastedDigits(pasteData);
  };

  const handlePastedDigits = (pasted: string) => {
    const cleaned = pasted.replace(/[^0-9]/g, '').slice(0, length);
    if (!cleaned) return;

    onChange(cleaned);

    // Focus last filled box or next empty box
    const nextIndex = Math.min(cleaned.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    if (cleaned.length === length && onComplete) {
      onComplete(cleaned);
    }
  };

  const handleResendClick = async () => {
    if (timeLeft > 0 || isResending || !onResend) return;

    try {
      setIsResending(true);
      await onResend();
      setTimeLeft(countdownSeconds);
      // Clear OTP and refocus first input
      onChange('');
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3.5">
      {/* 6 Digit Input Boxes */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {Array.from({ length }).map((_, index) => {
          const isFilled = !!digits[index];
          const isFocused = document.activeElement === inputRefs.current[index];

          return (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[index] || ''}
              disabled={disabled}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono rounded-2xl border-2 transition-all outline-none ${
                error
                  ? 'border-rose-500/80 bg-rose-950/20 text-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30'
                  : isFilled
                  ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'border-indigo-900/60 bg-slate-950 text-white hover:border-indigo-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 shadow-inner'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          );
        })}
      </div>

      {/* Error Message if present */}
      {error && (
        <p className="text-center text-xs font-semibold text-rose-400 animate-in fade-in">
          {error}
        </p>
      )}

      {/* Countdown Timer & Resend Controls */}
      <div className="flex items-center justify-between pt-1 px-1 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          {timeLeft > 0 ? (
            <span>
              Resend code in <strong className="text-indigo-300 font-mono">{formatTimer(timeLeft)}</strong>
            </span>
          ) : (
            <span className="text-slate-400 font-medium">Didn't receive code?</span>
          )}
        </div>

        {onResend && (
          <button
            type="button"
            onClick={handleResendClick}
            disabled={timeLeft > 0 || isResending || disabled}
            className={`font-bold flex items-center space-x-1 transition-all ${
              timeLeft > 0 || isResending || disabled
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
