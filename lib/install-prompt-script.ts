/**
 * Captures `beforeinstallprompt` before React exists.
 *
 * Chrome fires the event as soon as the page qualifies, which is routinely
 * earlier than hydration — a listener added in an effect misses it and the
 * install button never appears. This runs inline while the HTML is still
 * parsing, stashes the event, and tells React about it with a custom event.
 *
 * Injected as an inline <script> by app/layout.tsx. Keep it dependency-free
 * and ES5-ish: it runs unbundled and untranspiled.
 */
export const INSTALL_PROMPT_EVENT = "osp:installprompt";

export const INSTALL_PROMPT_GLOBAL = "__ospInstallPrompt";

export const INSTALL_PROMPT_SCRIPT = `
(function () {
  window.${INSTALL_PROMPT_GLOBAL} = null;
  function announce() {
    window.dispatchEvent(new Event(${JSON.stringify(INSTALL_PROMPT_EVENT)}));
  }
  window.addEventListener("beforeinstallprompt", function (event) {
    // Suppress Chrome's own mini-infobar so the app controls the offer.
    event.preventDefault();
    window.${INSTALL_PROMPT_GLOBAL} = event;
    announce();
  });
  window.addEventListener("appinstalled", function () {
    window.${INSTALL_PROMPT_GLOBAL} = null;
    announce();
  });
})();
`.trim();
