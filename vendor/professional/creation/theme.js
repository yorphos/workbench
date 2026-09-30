import { theme } from "../shared/model.js";
export function appThemeVars(value, dark = false) {
  const t = theme(value),
    m = t[dark ? "dark" : "light"];
  return {
    "--pf-surface": m.background,
    "--pf-surface-raised": m.surface,
    "--pf-surface-muted": m.surface,
    "--pf-text": m.text,
    "--pf-muted": m.muted,
    "--pf-accent": m.accent,
    "--pf-accent-ink": m.accentText,
    "--pf-border": m.border,
    "--pf-focus": m.accent,
    "--pf-font-body": t.font === "DM Sans" ? '"DM Sans",sans-serif' : t.font,
    "--pf-radius-lg": t.radius + "px",
    "--pf-space-6": t.spacing + "px",
    "--pf-body-size": t.size + "px",
  };
}
export function appThemeCSS(value) {
  return ["light", "dark"]
    .map(
      (mode) =>
        ".pf-app" +
        (mode === "dark" ? '[data-pf-theme="dark"]' : "") +
        "{" +
        Object.entries(appThemeVars(value, mode === "dark"))
          .map(([key, value]) => key + ":" + value + ";")
          .join("") +
        "}",
    )
    .join("\n");
}
