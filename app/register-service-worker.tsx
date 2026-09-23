"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the app installable.
 *
 * Renders nothing. It lives at the root so the worker is in place before the
 * user reaches a page that offers the install — Chrome only fires
 * `beforeinstallprompt` once a worker with a fetch handler is controlling the
 * page.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Dev serves modules Turbopack rewrites on every edit; a worker caching
    // navigations on top of that only causes confusion.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // An unregistered worker only costs the install prompt, so there is
          // nothing here worth interrupting the user over.
        });
    };

    // Registering after load keeps the worker off the critical path.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
