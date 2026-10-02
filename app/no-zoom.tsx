"use client";

import { useEffect } from "react";

/**
 * Stops pinch-zoom where the viewport meta cannot. iOS Safari has ignored
 * user-scalable=no since iOS 10 and pinches anyway; its non-standard gesture
 * events are the only way to cancel that. Elsewhere the viewport meta in
 * app/layout.tsx and `touch-action` in globals.css are enough, so this is a
 * no-op on browsers without the events.
 *
 * Renders nothing; mounted once in the root layout so every page gets it.
 */
export default function NoZoom() {
  useEffect(() => {
    const cancel = (event: Event) => event.preventDefault();
    const events = ["gesturestart", "gesturechange", "gestureend"];
    events.forEach((name) =>
      document.addEventListener(name, cancel, { passive: false }),
    );
    return () =>
      events.forEach((name) => document.removeEventListener(name, cancel));
  }, []);

  return null;
}
