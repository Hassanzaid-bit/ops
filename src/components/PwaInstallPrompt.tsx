"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "qzone-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    if (isIos()) {
      setShowIosHelp(true);
      setHidden(false);
      return;
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setHidden(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-50 px-4 md:bottom-4 md:max-w-md md:px-0 md:pl-4">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Install Q Zone Field Ops
        </p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {showIosHelp
            ? "On iPhone: tap Share, then “Add to Home Screen” for quick field access."
            : "Add this app to your home screen for a full-screen technician experience."}
        </p>
        <div className="mt-3 flex gap-2">
          {!showIosHelp && deferred && (
            <button
              type="button"
              onClick={() => void install()}
              className="min-h-10 flex-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-ink)]"
            >
              Install app
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--ink-muted)]"
          >
            {showIosHelp && !deferred ? "Got it" : "Not now"}
          </button>
        </div>
      </div>
    </div>
  );
}
