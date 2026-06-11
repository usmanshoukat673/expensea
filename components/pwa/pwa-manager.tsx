'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCcw, ShieldCheck, Smartphone, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const INSTALL_DISMISSED_KEY = 'expensea:pwa-install-dismissed-at';
const INSTALL_DISMISS_DAYS = 14;

function isRecentlyDismissed() {
  const value = window.localStorage.getItem(INSTALL_DISMISSED_KEY);
  if (!value) return false;

  const dismissedAt = Number(value);
  if (!Number.isFinite(dismissedAt)) return false;

  return Date.now() - dismissedAt < INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandaloneDisplay() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

function getInstallHelpText() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'Use Safari Share, then Add to Home Screen to install Expensea.';
  }

  return 'Use your browser install action from the address bar or menu to add Expensea to this device.';
}

function supportsNativeInstallPrompt() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isChromium = /chrome|chromium|crios|edg\//.test(userAgent);

  return isChromium && !isIos;
}

function getManualInstallSteps() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return ['Tap the Share button in Safari.', 'Choose Add to Home Screen.', 'Confirm Add to install Expensea.'];
  }

  if (userAgent.includes('android')) {
    return ['Open the browser menu.', 'Choose Install app or Add to Home screen.', 'Confirm Install to add Expensea.'];
  }

  return ['Look for the install icon in the address bar.', 'Or open the browser menu.', 'Choose Install Expensea or Install app.'];
}

function PwaBanner({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[80] mx-auto max-w-xl rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg md:bottom-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

function InstallPopup({
  installEvent,
  installHelpText,
  registrationError,
  showManualSteps,
  onInstall,
  onDismiss,
}: {
  installEvent: BeforeInstallPromptEvent | null;
  installHelpText: string;
  registrationError: boolean;
  showManualSteps: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  const installText = installEvent
    ? 'Install Expensea on this device for a faster, app-like workspace.'
    : installHelpText;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="expensea-install-title"
        className="relative w-full max-w-lg rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl sm:p-6"
      >
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onDismiss}
          aria-label="Dismiss install prompt"
          className="absolute right-3 top-3"
        >
          <X aria-hidden="true" />
        </Button>

        <div className="flex items-start gap-4 pr-8">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-foreground shadow-sm">
            EX
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Progressive Web App</p>
            <h2 id="expensea-install-title" className="mt-1 text-2xl font-semibold leading-tight">
              Install Expensea
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{installText}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <Smartphone className="size-4 text-accent" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">App-like</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Launches from your home screen without browser chrome.</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <WifiOff className="size-4 text-accent" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">Offline aware</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Shows a clear offline state and keeps static assets ready.</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">Secure data</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Private financial data is not blindly cached.</p>
          </div>
        </div>

        {registrationError && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50">
            Offline support will retry automatically when Expensea reloads.
          </div>
        )}

        {showManualSteps && !installEvent && (
          <div className="mt-4 rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium">Install from your browser</p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              {getManualInstallSteps().map((step) => (
                <li key={step} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
            Works on desktop, Android, and supported iOS browsers.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onDismiss}>
              Later
            </Button>
            <Button
              variant={installEvent ? 'default' : 'outline'}
              onClick={onInstall}
              title={installEvent ? 'Install Expensea' : installHelpText}
            >
              <Download aria-hidden="true" />
              {installEvent ? 'Install now' : showManualSteps ? 'Show steps' : 'How to install'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function OfflinePopup() {
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-background/70 px-4 py-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-md sm:flex sm:items-center sm:justify-center sm:py-6">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="expensea-offline-title"
        className="mx-auto my-auto w-full max-w-sm overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
      >
        <div className="border-b border-border bg-muted/35 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
              EX
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none">Expensea</p>
              <p className="mt-1 text-xs text-muted-foreground">Connection status</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full border border-amber-500/25 bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-950/70 dark:text-amber-300">
              <WifiOff className="size-6" aria-hidden="true" />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Connection lost
            </p>
            <h2 id="expensea-offline-title" className="mt-1 text-xl font-semibold leading-tight">
              You're offline
            </h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Expensea needs a connection for live expenses, reports, and team updates.
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            <div className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Check your connection</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Use Wi-Fi or mobile data, then retry.</p>
              </div>
            </div>
          </div>

          <Button className="mt-4 h-9 w-full" onClick={() => window.location.reload()}>
            <RefreshCcw aria-hidden="true" />
            Retry connection
          </Button>
        </div>
      </section>
    </div>
  );
}

export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [registrationError, setRegistrationError] = useState(false);
  const [installHelpText, setInstallHelpText] = useState('');
  const [showManualSteps, setShowManualSteps] = useState(false);

  useEffect(() => {
    setIsOffline(!window.navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isStandaloneDisplay() || isRecentlyDismissed()) return;

    setInstallHelpText(getInstallHelpText());

    if (supportsNativeInstallPrompt()) {
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setShowInstall(true);
    }, 1200);

    return () => window.clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      if (isStandaloneDisplay() || isRecentlyDismissed()) {
        return;
      }

      setInstallEvent(event as BeforeInstallPromptEvent);
      setInstallHelpText('Expensea is ready to install in this browser.');
      setShowManualSteps(false);
      setShowInstall(true);
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setShowInstall(false);
      window.localStorage.removeItem(INSTALL_DISMISSED_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        setRegistrationError(false);

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(worker);
            }
          });
        });
      })
      .catch(() => {
        setRegistrationError(true);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!installEvent) {
      setShowManualSteps(true);
      return;
    }

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      setInstallEvent(null);
      setShowInstall(false);

      if (choice.outcome === 'dismissed') {
        window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
      }
    } catch {
      setInstallEvent(null);
      setInstallHelpText('Chrome could not open the install prompt. Use the address bar install icon or browser menu.');
      setShowManualSteps(true);
    }
  }, [installEvent]);

  const dismissInstall = useCallback(() => {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setShowInstall(false);
  }, []);

  const refreshForUpdate = useCallback(() => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  }, [waitingWorker]);

  return (
    <>
      {isOffline && (
        <OfflinePopup />
      )}

      {!isOffline && waitingWorker && (
        <PwaBanner>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">New version available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Refresh when you're ready to use the latest Expensea update.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={refreshForUpdate}>
                <RefreshCcw aria-hidden="true" />
                Refresh
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setWaitingWorker(null)}>
                Later
              </Button>
            </div>
          </div>
        </PwaBanner>
      )}

      {!isOffline && showInstall && !waitingWorker && (
        <InstallPopup
          installEvent={installEvent}
          installHelpText={installHelpText}
          registrationError={registrationError}
          showManualSteps={showManualSteps}
          onInstall={installApp}
          onDismiss={dismissInstall}
        />
      )}
    </>
  );
}
