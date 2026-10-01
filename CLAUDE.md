@AGENTS.md

# Dark mode in every design

Every screen you create or update must ship a dark theme alongside the light
one — never a light-only palette, even when the source design shows only light.

- The kit's `ColorModeProvider` puts `class="dark"` on `<html>`. Define colors
  as CSS variables in `app/globals.css` under `:root` (light) and `.dark`
  (dark), and read them from a palette file — see `--scan-*` with
  `app/(app)/scanner/theme.ts`, and `--family-*` with
  `app/(family)/service/[token]/family-ui.tsx`.
- Dark values match the colors the app layout (`AppLayout` from `osp-ui-kit`)
  uses in dark mode — the kit's green dark palette: canvas `#0d1913`, surface
  `#13221b`, ink `#e9f7f0`, green `#2fbf6b`, hairlines as low-alpha white. Reuse
  the existing `.dark` values in `globals.css` before inventing new ones, so a
  page never shows a seam against the shell.
- No hard-coded hex in components except text and icons on a filled green or
  red (white in both modes).
- Check both modes in the browser before calling a design change done.
