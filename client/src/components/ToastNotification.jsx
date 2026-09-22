import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

/**
 * ToastNotification – lightweight slide-in toast for queue confirmations.
 *
 * Props:
 *   message  – string to display
 *   show     – boolean; set to true to trigger the toast
 *   onDone   – callback fired after the toast auto-dismisses (lets parent reset `show`)
 *   duration – ms to keep toast visible (default 2500)
 */
export default function ToastNotification({ message, show, onDone, duration = 2500 }) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!show) return;

    setVisible(true);
    setAnimating(true);

    const hideTimer = setTimeout(() => {
      setAnimating(false);
    }, duration);

    const removeTimer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration + 300); // wait for fade-out transition

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [show, duration, onDone]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed z-50 transition-all duration-300 ease-out

        /* Mobile: bottom-center */
        bottom-5 left-1/2 -translate-x-1/2
        w-[calc(100vw-2rem)] max-w-sm

        /* Desktop: bottom-right */
        sm:left-auto sm:right-5 sm:translate-x-0 sm:w-auto sm:max-w-xs

        ${animating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl">
        {/* Icon */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={18} className="text-emerald-600" />
        </span>

        {/* Text */}
        <p className="flex-1 text-sm font-bold text-slate-800 leading-snug">
          {message}
        </p>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => {
            setAnimating(false);
            setTimeout(() => { setVisible(false); onDone?.(); }, 300);
          }}
          aria-label="Dismiss notification"
          className="ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-emerald-100"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{
            animation: animating
              ? `toast-shrink ${duration}ms linear forwards`
              : 'none'
          }}
        />
      </div>

      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  );
}
