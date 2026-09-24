import { useEffect, useRef, useState, type RefObject } from "react";
import type { BarcodeFormat } from "barcode-detector/ponyfill";

/**
 * Minimal shape of the Barcode Detection API, which TypeScript's DOM lib does
 * not declare yet. Only Chromium on Android, macOS and ChromeOS ships a working
 * one — Windows Chrome, Firefox and every iOS browser do not — so the native
 * detector is a fast path, not something the scanner can rely on.
 */
type DetectedBarcode = { rawValue: string };

type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

/** QR for the tickets and tags; the 1D formats for casket tag barcodes. */
const FORMATS = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "itf",
];

const DETECT_INTERVAL_MS = 250;

export type CameraState =
  | "idle"
  | "starting"
  | "on"
  | "denied"
  | "busy"
  | "none"
  | "insecure"
  | "unsupported";

/**
 * The browser's own detector when it can read QR codes, otherwise the zxing
 * build of the same API. The fallback is imported lazily so pages that never
 * scan don't pay for it; it fetches its WebAssembly decoder on first use.
 */
async function createDetector(): Promise<BarcodeDetectorLike | null> {
  const native = (window as unknown as Record<string, unknown>).BarcodeDetector;
  if (typeof native === "function") {
    const Native = native as BarcodeDetectorConstructor;
    try {
      // Some platforms expose the constructor but support no formats at all.
      const supported = (await Native.getSupportedFormats?.()) ?? [];
      if (supported.includes("qr_code")) {
        return new Native({
          formats: FORMATS.filter((format) => supported.includes(format)),
        });
      }
    } catch {
      // Fall through to the bundled detector.
    }
  }

  try {
    const { BarcodeDetector } = await import("barcode-detector/ponyfill");
    return new BarcodeDetector({ formats: FORMATS as BarcodeFormat[] });
  } catch {
    return null;
  }
}

/** Maps a getUserMedia rejection onto what the operator can do about it. */
function failureState(error: unknown): CameraState {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "none";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "denied";
}

/**
 * Runs the rear camera and reports the codes it sees, for as long as `active`
 * stays true. Turning `active` off releases the camera, so a screen that has
 * accepted a code should drop it rather than leave the device light on.
 *
 * The caller owns `videoRef` and hands it in — returning a ref from a hook
 * makes the React compiler treat every field on the result as ref access.
 */
export function useCodeScanner({
  videoRef,
  active,
  onCode,
}: {
  /** The <video> element showing the camera preview. */
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  onCode: (value: string) => void;
}): { camera: CameraState; retry: () => void } {
  const [state, setState] = useState<CameraState>("idle");
  // Bumped by retry() to rerun the effect after the operator fixes a failure.
  const [attempt, setAttempt] = useState(0);

  // Held in a ref so a new callback identity never restarts the camera.
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  });

  useEffect(() => {
    // Nothing to set here when inactive: the cleanup below reports "idle"
    // when the camera is torn down, and the initial value already is.
    if (!active) return;

    const videoEl = videoRef.current;

    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const start = async () => {
      // Browsers only expose the camera on https or localhost; on a plain-http
      // LAN address mediaDevices is simply missing.
      if (!window.isSecureContext) {
        setState("insecure");
        return;
      }
      if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
        setState("none");
        return;
      }

      setState("starting");

      // Loaded alongside the permission prompt rather than after it, so the
      // first frame can be read as soon as the picture is up.
      const detectorReady = createDetector();

      let opened: MediaStream;
      try {
        opened = await navigator.mediaDevices.getUserMedia({
          // Rear camera on phones; desktops just get their only camera.
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (error) {
        if (!cancelled) setState(failureState(error));
        return;
      }

      const video = videoRef.current;
      if (cancelled || !video) {
        // Unmounted while permission was pending — don't leak the camera.
        opened.getTracks().forEach((track) => track.stop());
        return;
      }

      stream = opened;
      video.srcObject = opened;
      try {
        await video.play();
      } catch {
        // Autoplay can reject even though the stream is live; the loop below
        // waits on readyState, so scanning still works.
      }
      if (cancelled) return;

      const detector = await detectorReady;
      if (cancelled) return;
      if (!detector) {
        setState("unsupported");
        return;
      }
      setState("on");

      // A chained timeout rather than an interval: the wasm decoder can take
      // longer than one tick, and overlapping detects would pile up.
      const tick = async () => {
        const current = videoRef.current;
        if (current && current.readyState >= current.HAVE_CURRENT_DATA) {
          try {
            const codes = await detector.detect(current);
            const value = codes.find((code) => code.rawValue)?.rawValue;
            if (value && !cancelled) onCodeRef.current(value);
          } catch {
            // A single dropped frame is not worth surfacing; keep scanning.
          }
        }
        if (!cancelled) timer = setTimeout(tick, DETECT_INTERVAL_MS);
      };
      timer = setTimeout(tick, DETECT_INTERVAL_MS);
    };

    void start();

    // Releasing the tracks is what turns the device light off.
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (videoEl) videoEl.srcObject = null;
      setState("idle");
    };
  }, [active, attempt, videoRef]);

  return { camera: state, retry: () => setAttempt((n) => n + 1) };
}

/** Failures the operator can fix and then try the camera again. */
export function canRetryCamera(state: CameraState): boolean {
  return state === "denied" || state === "busy";
}

/** What to tell the operator when the viewfinder cannot show a live picture. */
export function cameraMessage(state: CameraState): string {
  switch (state) {
    case "denied":
      return "Camera access was blocked. Allow it in the browser's site settings, or enter the code below.";
    case "busy":
      return "The camera is in use by another app. Close it and try again, or enter the code below.";
    case "none":
      return "No camera on this device. Enter the code below.";
    case "insecure":
      return "The camera only works over HTTPS. Open the app from its https:// address, or enter the code below.";
    case "unsupported":
      return "The code reader could not load. Check the connection, or enter the code below.";
    default:
      return "Starting camera…";
  }
}
