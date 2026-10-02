/**
 * Whether the family pages show their demo aids: one-tap sample codes on the
 * scan steps, and Restart demo on the service home (which the server action
 * honours too).
 *
 * Always on in development. A deployed demo turns them on with
 * NEXT_PUBLIC_SHOW_DEMO_CODES=true; anywhere without it they stay hidden, so
 * a family never sees them on a real deployment. NEXT_PUBLIC_ variables are
 * inlined at build time, so a change needs a redeploy.
 */
export const SHOW_DEMO_TOOLS =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_SHOW_DEMO_CODES === "true";
