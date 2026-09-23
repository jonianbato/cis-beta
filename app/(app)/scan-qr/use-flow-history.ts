"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Routes the browser's back action through the flow's own `back`, so the
 * kit page header's back button (which calls `window.history.back()`) steps
 * back one screen instead of leaving the page.
 *
 * While the flow is open one guard entry sits on the history stack. Popping it
 * runs `back`; if that leaves the operator still inside the flow, a fresh guard
 * is pushed. Returning home from inside the flow drops the guard again, so the
 * history stack ends up as it was before the flow opened.
 */
export function useFlowHistory(inFlow: boolean, back: () => void) {
  const backRef = useRef(back);
  const guardUp = useRef(false);
  // Bumped on every pop so the effect re-runs and re-arms the guard.
  const [pops, setPops] = useState(0);

  useEffect(() => {
    backRef.current = back;
  });

  useEffect(() => {
    if (!inFlow) {
      if (guardUp.current) {
        guardUp.current = false;
        window.history.back();
      }
      return;
    }

    if (!guardUp.current) {
      window.history.pushState(null, "");
      guardUp.current = true;
    }

    const onPop = () => {
      guardUp.current = false;
      setPops((n) => n + 1);
      backRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [inFlow, pops]);
}
