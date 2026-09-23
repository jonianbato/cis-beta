import { useCallback, useSyncExternalStore } from "react";
import {
  INSTALL_PROMPT_EVENT,
  INSTALL_PROMPT_GLOBAL,
} from "./install-prompt-script";

/**
 * `beforeinstallprompt`, which the DOM lib does not declare. Chromium fires
 * it; Safari and Firefox never do, which is why the iOS path below exists.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "osp-install-dismissed";

/** Runs in the browser bundle, so the UA check is real there and false on the server. */
const IS_IOS =
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

/** Only Safari can add to the home screen; the other iOS browsers cannot. */
const IS_IOS_SAFARI =
  IS_IOS && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

function getStashedPrompt(): BeforeInstallPromptEvent | null {
  return (
    (window as unknown as Record<string, unknown>)[INSTALL_PROMPT_GLOBAL] as
      | BeforeInstallPromptEvent
      | null
  ) ?? null;
}

function clearStashedPrompt(): void {
  (window as unknown as Record<string, unknown>)[INSTALL_PROMPT_GLOBAL] = null;
  window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
}

/**
 * The inline script stashes the event and announces it; this subscribes to
 * that announcement rather than to `beforeinstallprompt` itself, which has
 * usually already fired by the time React runs.
 */
function subscribeToPrompt(onChange: () => void): () => void {
  window.addEventListener(INSTALL_PROMPT_EVENT, onChange);
  return () => window.removeEventListener(INSTALL_PROMPT_EVENT, onChange);
}

/** A boolean keeps the snapshot stable; the event itself is read on demand. */
function getHasPrompt(): boolean {
  return getStashedPrompt() !== null;
}

function getHasPromptOnServer(): boolean {
  return false;
}

function subscribeToDisplayMode(onChange: () => void): () => void {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getIsInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari never matches the media query; it sets this instead.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Assume installed until the client says otherwise, so a user who already
 * installed never sees the banner flash during hydration.
 */
function getIsInstalledOnServer(): boolean {
  return true;
}

const dismissListeners = new Set<() => void>();

function subscribeToDismissal(onChange: () => void): () => void {
  dismissListeners.add(onChange);
  return () => {
    dismissListeners.delete(onChange);
  };
}

function getIsDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Private mode or blocked storage: treat it as not dismissed.
    return false;
  }
}

function getIsDismissedOnServer(): boolean {
  return true;
}

export type InstallPrompt = {
  /** True once there is something to show — a real prompt, or iOS instructions. */
  canShow: boolean;
  /** iOS cannot be prompted; the UI has to explain Share → Add to Home Screen. */
  needsIosInstructions: boolean;
  /** Fires Chrome's install dialog. No-op where there is no deferred prompt. */
  install: () => void;
  dismiss: () => void;
};

/**
 * Drives the in-app install affordance.
 *
 * Chromium hands over a `beforeinstallprompt` event that must be replayed from
 * a user gesture; it is single-use, so it is dropped once spent. iOS Safari
 * has no equivalent API, so there the hook reports that the UI should show
 * Add-to-Home-Screen instructions instead.
 */
export function useInstallPrompt(): InstallPrompt {
  const hasPrompt = useSyncExternalStore(
    subscribeToPrompt,
    getHasPrompt,
    getHasPromptOnServer,
  );
  const isInstalled = useSyncExternalStore(
    subscribeToDisplayMode,
    getIsInstalled,
    getIsInstalledOnServer,
  );
  const isDismissed = useSyncExternalStore(
    subscribeToDismissal,
    getIsDismissed,
    getIsDismissedOnServer,
  );

  const install = useCallback(() => {
    const promptEvent = getStashedPrompt();
    if (!promptEvent) return;
    void (async () => {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      // Chrome allows each event to be prompted once; a declined install gets
      // a fresh event on the next visit.
      clearStashedPrompt();
    })();
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage unavailable: the banner still goes away for this page load.
    }
    dismissListeners.forEach((listener) => listener());
  }, []);

  const needsIosInstructions = IS_IOS_SAFARI && !hasPrompt;

  return {
    canShow:
      !isInstalled && !isDismissed && (hasPrompt || needsIosInstructions),
    needsIosInstructions,
    install,
    dismiss,
  };
}
