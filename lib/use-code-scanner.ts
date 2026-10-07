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
  detect(
    source: HTMLVideoElement | HTMLCanvasElement,
  ): Promise<DetectedBarcode[]>;
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

/** Ceiling for zoom — past this the picture is too grainy to read anyway. */
const MAX_ZOOM = 5;

/**
 * How far the viewfinder can zoom. `hardware` means the camera itself zooms
 * (Chrome on Android exposes this); otherwise the zoom is digital — the
 * screen scales the preview with `transform: scale(level)` and the detector
 * reads the same centre crop, so what the operator frames is what is read.
 */
export type ZoomControl = {
  level: number;
  min: number;
  max: number;
  hardware: boolean;
  set: (level: number) => void;
};

/** Zoom range the camera track reports, when it can zoom at all. */
type ZoomCapability = { min: number; max: number };

function trackZoom(track: MediaStreamTrack | undefined): ZoomCapability | null {
  const caps = track?.getCapabilities?.() as
    | (MediaTrackCapabilities & { zoom?: ZoomCapability })
    | undefined;
  const zoom = caps?.zoom;
  if (!zoom || typeof zoom.max !== "number" || zoom.max <= zoom.min) return null;
  return zoom;
}

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
}): { camera: CameraState; retry: () => void; zoom: ZoomControl | null } {
  const [state, setState] = useState<CameraState>("idle");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hardwareZoom, setHardwareZoom] = useState<ZoomCapability | null>(null);
  // Read by the detect loop and by set(), which outlive a single render.
  const zoomRef = useRef({ level: 1, hardware: false });
  const trackRef = useRef<MediaStreamTrack | null>(null);
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

      // Each camera start begins unzoomed.
      const track = opened.getVideoTracks()[0];
      const hardware = trackZoom(track);
      trackRef.current = track ?? null;
      zoomRef.current = { level: hardware?.min ?? 1, hardware: !!hardware };
      setHardwareZoom(hardware);
      setZoomLevel(hardware?.min ?? 1);
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

      // Digital zoom reads the centre crop, scaled back up to full size.
      const canvas = document.createElement("canvas");
      const frameFor = (current: HTMLVideoElement) => {
        const { level, hardware } = zoomRef.current;
        const w = current.videoWidth;
        const h = current.videoHeight;
        const ctx = level > 1 && !hardware && w && h ? canvas.getContext("2d") : null;
        if (!ctx) return current;
        canvas.width = w;
        canvas.height = h;
        const sw = w / level;
        const sh = h / level;
        ctx.drawImage(current, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, w, h);
        return canvas;
      };

      // A chained timeout rather than an interval: the wasm decoder can take
      // longer than one tick, and overlapping detects would pile up.
      const tick = async () => {
        const current = videoRef.current;
        if (current && current.readyState >= current.HAVE_CURRENT_DATA) {
          try {
            const codes = await detector.detect(frameFor(current));
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
      trackRef.current = null;
      zoomRef.current = { level: 1, hardware: false };
      if (videoEl) videoEl.srcObject = null;
      setState("idle");
      setZoomLevel(1);
      setHardwareZoom(null);
    };
  }, [active, attempt, videoRef]);

  const min = hardwareZoom?.min ?? 1;
  const max = Math.min(hardwareZoom?.max ?? MAX_ZOOM, MAX_ZOOM);
  const setZoom = (next: number) => {
    const level = Math.round(Math.min(max, Math.max(min, next)) * 10) / 10;
    zoomRef.current = { ...zoomRef.current, level };
    setZoomLevel(level);
    if (zoomRef.current.hardware) {
      const constraint = { zoom: level } as MediaTrackConstraintSet;
      // A rejected constraint just leaves the lens where it was.
      trackRef.current?.applyConstraints({ advanced: [constraint] }).catch(() => {});
    }
  };

  return {
    camera: state,
    retry: () => setAttempt((n) => n + 1),
    zoom:
      state === "on"
        ? { level: zoomLevel, min, max, hardware: !!hardwareZoom, set: setZoom }
        : null,
  };
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
