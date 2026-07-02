import { useState } from "react";
import { X, Download, Smartphone, Monitor, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePwaInstall, getInstallInstructions } from "@/lib/pwa";

interface PWAInstallBannerProps {
  className?: string;
}

export function PWAInstallBanner({ className }: PWAInstallBannerProps) {
  const { isInstallable, isInstalled, install, dismiss } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("alice.pwa-banner-dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (isInstalled || dismissed || !isInstallable) return null;

  const instructions = getInstallInstructions();

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    dismiss();
    try {
      localStorage.setItem("alice.pwa-banner-dismissed", "true");
    } catch {
      // ignore
    }
  };

  const PlatformIcon = instructions.platform === "iOS" ? Smartphone :
    instructions.platform === "Android" ? Smartphone : Monitor;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40",
        "bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl",
        "shadow-2xl shadow-black/40 backdrop-blur-xl",
        "p-4 alice-fade-in",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-purple-dark)] flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Install Alice
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
            Add Alice to your home screen for quick access — works like a native app!
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] text-white text-xs font-medium rounded-lg transition-colors"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors shrink-0 -mt-1 -mr-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Full-screen install dialog with platform-specific instructions.
 * Shown when user taps "Install" on iOS (no beforeinstallprompt).
 */
export function PWAInstallDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const instructions = getInstallInstructions();
  const PlatformIcon = instructions.platform === "iOS" ? Smartphone :
    instructions.platform === "Android" ? Smartphone : Monitor;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 alice-scale-in">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-purple-dark)] flex items-center justify-center shadow-lg shadow-[var(--accent-purple)]/20">
            <PlatformIcon className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] text-center">
          Install Alice on {instructions.platform}
        </h2>
        <div className="mt-4 space-y-3">
          {instructions.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent-glow)] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-[var(--accent-purple)]">
                  {i + 1}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{step}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] text-white text-sm font-medium rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
