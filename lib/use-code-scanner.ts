import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Minimal shape of the Barcode Detection API, which TypeScript's DOM lib does
 * not declare yet. Chromium ships it; Firefox and desktop Safari do not, so
 * the hook has to cope with the constructor being absent.
 */
type DetectedBarcode = { rawValue: string };

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource | Blob): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

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

const DETECT_INTERVAL_MS = 400;

export type CameraState =
  | "idle"
  | "starting"
  | "on"
  | "denied"
  | "none"
  | "unsupported";

function createDetector(): BarcodeDetectorLike | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as Record<string, unknown>).BarcodeDetector;
  if (typeof ctor !== "function") return null;
  const Detector = ctor as BarcodeDetectorConstructor;
  try {
    return new Detector({ formats: FORMATS });
  } catch {
    // Some builds reject the format list; fall back to the defaults.
    return new Detector();
  }
}

/**
 * Runs the rear camera and reports the codes it sees, for as long as `active`
 * stays true.
 *
 * The caller owns `videoRef` and hands it in — returning a ref from a hook
 * makes the React compiler treat every field on the result as ref access.
 *
 * Unlike a one-shot scanner this keeps the preview and the detection loop
 * running, because the flow stays on the same screen after a read: `paused`
 * suppresses detection once a code has been accepted, without dropping the
 * stream and making the viewfinder flicker.
 */
export function useCodeScanner({
  videoRef,
  active,
  paused,
  onCode,
}: {
  /** The <video> element showing the camera preview. */
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  /** Keeps the preview up but stops reading frames. */
  paused: boolean;
  onCode: (value: string) => void;
}): CameraState {
  const [state, setState] = useState<CameraState>("idle");

  // Held in refs so a new callback identity never restarts the camera.
  const onCodeRef = useRef(onCode);
  const pausedRef = useRef(paused);
  useEffect(() => {
    onCodeRef.current = onCode;
    pausedRef.current = paused;
  });

  useEffect(() => {
    // Nothing to set here when inactive: the cleanup below reports "idle"
    // when the camera is torn down, and the initial value already is.
    if (!active) return;

    const videoEl = videoRef.current;

    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const start = async () => {
      if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
        setState("none");
        return;
      }

      // Probed before the camera is touched: without a detector the preview
      // would be a live picture that can never read anything.
      const detector = createDetector();
      if (!detector) {
        setState("unsupported");
        return;
      }

      setState("starting");
      let opened: MediaStream;
      try {
        opened = await navigator.mediaDevices.getUserMedia({
          // Rear camera on phones; desktops just get their only camera.
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        if (!cancelled) setState("denied");
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
      setState("on");

      timer = setInterval(async () => {
        const current = videoRef.current;
        if (pausedRef.current || !current) return;
        if (current.readyState < current.HAVE_CURRENT_DATA) return;
        try {
          const codes = await detector.detect(current);
          const value = codes.find((code) => code.rawValue)?.rawValue;
          if (value) onCodeRef.current(value);
        } catch {
          // A single dropped frame is not worth surfacing; keep scanning.
        }
      }, DETECT_INTERVAL_MS);
    };

    void start();

    // Releasing the tracks is what turns the device light off.
    return () => {
      cancelled = true;
      if (timer !== null) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (videoEl) videoEl.srcObject = null;
      setState("idle");
    };
  }, [active, videoRef]);

  return state;
}

/** What to tell the operator when the viewfinder cannot show a live picture. */
export function cameraMessage(state: CameraState): string {
  switch (state) {
    case "denied":
      return "Camera access was blocked. Enter the code below.";
    case "none":
      return "No camera on this device. Enter the code below.";
    case "unsupported":
      return "This browser cannot read codes from the camera. Enter the code below.";
    default:
      return "Starting camera…";
  }
}
