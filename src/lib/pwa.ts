import { useState, useEffect, useCallback } from "react";

// BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Hook to handle PWA install prompt and service worker registration.
 * Returns whether the app is installable and a function to trigger install.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        setSwRegistered(true);
        console.log("[PWA] Service worker registered:", reg.scope);

        // Check for updates periodically
        setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000); // Every hour
      } catch (err) {
        console.warn("[PWA] SW registration failed:", err);
      }
    };

    registerSW();
  }, []);

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Check if already installed
  useEffect(() => {
    const checkInstalled = () => {
      // iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      if (isStandalone) {
        setIsInstalled(true);
        setIsInstallable(false);
      }

      // Android/Chrome
      if (isIOS) {
        // iOS doesn't fire beforeinstallprompt, show manual install hint
        setIsInstallable(!isStandalone);
      }
    };

    checkInstalled();
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, []);

  return { isInstallable, isInstalled, swRegistered, install, dismiss };
}

/**
 * Get platform-specific install instructions.
 */
export function getInstallInstructions(): { platform: string; steps: string[] } {
  const ua = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(ua)) {
    return {
      platform: "iOS",
      steps: [
        "Tap the Share button (square with arrow) in Safari",
        "Scroll down and tap 'Add to Home Screen'",
        "Tap 'Add' to confirm",
      ],
    };
  }

  if (/Android/.test(ua)) {
    return {
      platform: "Android",
      steps: [
        "Tap the menu (⋮) in Chrome",
        "Tap 'Add to Home screen' or 'Install app'",
        "Tap 'Add' to confirm",
      ],
    };
  }

  return {
    platform: "Desktop",
    steps: [
      "Click the install icon in the address bar",
      "Or click the menu → 'Install Alice'",
    ],
  };
}
