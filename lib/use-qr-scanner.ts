import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

/**
 * Minimal shape of the Barcode Detection API, which TypeScript's DOM lib does
 * not declare yet. Chromium ships it; Firefox and desktop Safari do not, so
 * every entry point below has to cope with the constructor being absent.
 */
type DetectedBarcode = { rawValue: string };

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource | Blob): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

function getBarcodeDetectorConstructor(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as Record<string, unknown>).BarcodeDetector;
  return typeof ctor === "function"
    ? (ctor as BarcodeDetectorConstructor)
    : null;
}

function subscribeToNothing(): () => void {
  // Whether the browser can scan is fixed for the life of the page.
  return () => {};
}

function getScannerSupport(): boolean {
  return (
    getBarcodeDetectorConstructor() !== null &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

function getUnknownSupport(): null {
  return null;
}

export type QrScannerStatus = "idle" | "starting" | "scanning";

export type QrScanner = {
  status: QrScannerStatus;
  /** `null` until the capability probe runs on the client. */
  isSupported: boolean | null;
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Decodes a still image — the only path that works without a camera. */
  scanImage: (file: File) => Promise<void>;
};

/** Turns a getUserMedia rejection into something worth showing the user. */
function describeCameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow it in your browser's site settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is already in use by another app.";
  }
  return "The camera could not be started. Please try again.";
}

/**
 * Drives a QR scan off the device camera.
 *
 * The caller owns `videoRef` and hands it in — returning a ref from a hook
 * makes the React compiler treat every field on the result as ref access.
 *
 * Scanning stops as soon as a code is read: the caller decides what happens
 * next, and leaving the camera running would fire `onScan` on every frame.
 */
export function useQrScanner({
  videoRef,
  onScan,
}: {
  /** The <video> element showing the camera preview. */
  videoRef: RefObject<HTMLVideoElement | null>;
  onScan: (value: string) => void;
}): QrScanner {
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  // Held in a ref so a new callback identity never restarts the camera.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  const [status, setStatus] = useState<QrScannerStatus>("idle");
  // Read through useSyncExternalStore so the server renders the "unknown"
  // snapshot and hydration stays identical; the capability never changes, so
  // the subscription is a no-op.
  const isSupported = useSyncExternalStore<boolean | null>(
    subscribeToNothing,
    getScannerSupport,
    getUnknownSupport,
  );
  const [error, setError] = useState<string | null>(null);

  const getDetector = useCallback((): BarcodeDetectorLike | null => {
    if (detectorRef.current) return detectorRef.current;
    const Detector = getBarcodeDetectorConstructor();
    if (!Detector) return null;
    try {
      detectorRef.current = new Detector({ formats: ["qr_code"] });
    } catch {
      // Some builds reject the format list; fall back to the defaults.
      detectorRef.current = new Detector();
    }
    return detectorRef.current;
  }, []);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, [videoRef]);

  const start = useCallback(async () => {
    if (streamRef.current || status === "starting") return;

    const detector = getDetector();
    if (!detector) {
      setError("This browser cannot scan QR codes from the camera.");
      return;
    }

    setError(null);
    setStatus("starting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Rear camera on phones; desktops just get their only camera.
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch (cause) {
      setError(describeCameraError(cause));
      setStatus("idle");
      return;
    }

    const video = videoRef.current;
    if (!video) {
      // Unmounted while permission was pending — don't leak the camera.
      stream.getTracks().forEach((track) => track.stop());
      setStatus("idle");
      return;
    }

    streamRef.current = stream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // Autoplay can reject even though the stream is live; the frame loop
      // below waits on readyState, so scanning still works.
    }
    setStatus("scanning");

    const tick = async () => {
      frameRef.current = null;
      const current = videoRef.current;
      if (!streamRef.current || !current) return;

      if (current.readyState >= current.HAVE_CURRENT_DATA) {
        try {
          const codes = await detector.detect(current);
          const value = codes.find((code) => code.rawValue)?.rawValue;
          if (value) {
            stop();
            onScanRef.current(value);
            return;
          }
        } catch {
          // A single dropped frame is not worth surfacing; keep scanning.
        }
      }

      if (streamRef.current) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [getDetector, status, stop, videoRef]);

  const scanImage = useCallback(
    async (file: File) => {
      const detector = getDetector();
      if (!detector) {
        setError("This browser cannot read QR codes from images.");
        return;
      }

      setError(null);
      try {
        const codes = await detector.detect(file);
        const value = codes.find((code) => code.rawValue)?.rawValue;
        if (!value) {
          setError("No QR code was found in that image.");
          return;
        }
        stop();
        onScanRef.current(value);
      } catch {
        setError("That image could not be read.");
      }
    },
    [getDetector, stop],
  );

  // Releasing the camera on unmount is what turns the device light off.
  useEffect(() => stop, [stop]);

  return {
    status,
    isSupported,
    error,
    start: () => void start(),
    stop,
    scanImage,
  };
}
