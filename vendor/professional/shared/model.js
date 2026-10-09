import {pipLanguage} from "./pip-language.js";
const palette=mode=>{const p=Object.fromEntries(Object.entries(pipLanguage[mode]).map(([k,v])=>[k,/^#[0-9a-f]{3}$/i.test(v)?"#"+[...v.slice(1)].map(c=>c+c).join(""):v]));return {background:p["--pf-surface"],surface:p["--pf-surface-raised"],text:p["--pf-text"],muted:p["--pf-muted"],accent:p["--pf-accent"],accentText:p["--pf-accent-ink"],border:p["--pf-border"]};};
export const defaultTheme={name:"Pip v2 · paper & ink",font:"Noto Sans",size:14,spacing:20,radius:14,light:palette("light"),dark:palette("dark")};
export function text(v, max = 12000) {
  if (typeof v !== "string" || v.length > max)
    throw new Error("Invalid or oversized text.");
  return v;
}
export function theme(v = {}) {
  const t = { ...defaultTheme, ...v };
  for (const mode of ["light", "dark"]) {
    t[mode] = Object.fromEntries(
      Object.entries(defaultTheme[mode]).map(([key, value]) => [
        key,
        v[mode]?.[key] ?? value,
      ]),
    );
    for (const value of Object.values(t[mode]))
      if (!/^#[\da-f]{6}$/i.test(value))
        throw new Error("Colors must use six-digit hex.");
  }
  for (const key of ["size", "spacing", "radius"])
    if (!Number.isFinite(t[key]) || t[key] < 0 || t[key] > 64)
      throw new Error("Invalid theme dimensions.");
  t.name = text(t.name, 120);
  if (!["Noto Sans", "DM Sans", "system-ui", "Georgia"].includes(t.font))
    throw new Error("Unsupported font.");
  return t;
}
export function themeCSS(value) {
  const t = theme(value);
  return ["light", "dark"]
    .map(
      (mode) =>
        `${mode === "light" ? ":root" : '[data-theme="dark"]'} {\n${Object.entries(
          t[mode],
        )
          .map(
            ([k, v]) =>
              `  --kit-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}: ${v};`,
          )
          .join(
            "\n",
          )}\n  --kit-font: ${t.font === "DM Sans" ? '"DM Sans", sans-serif' : t.font};\n  --kit-size: ${t.size}px;\n  --kit-space: ${t.spacing}px;\n  --kit-radius: ${t.radius}px;\n}`,
    )
    .join("\n");
}
export function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
      .join(",") +
    "}"
  );
}
export function escapeHTML(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export function safeURL(v) {
  if (!v) return "";
  const u = new URL(text(v, 2000));
  if (u.protocol !== "https:" && u.protocol !== "http:")
    throw new Error("Use an HTTP or HTTPS link.");
  return u.href;
}
export function contrast(a, b) {
  const luminance = (c) => {
    const rgb = c
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export const printCSS = `*{box-sizing:border-box}body{margin:0;padding:40px;background:var(--kit-background);color:var(--kit-text);font:var(--kit-size)/1.6 var(--kit-font);font-synthesis:none}h1,h2,h3{line-height:1.15;letter-spacing:-.025em;font-weight:550}h1{font-size:42px}h2{font-size:28px}a{color:var(--kit-accent)}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid var(--kit-border);padding:12px;text-align:left}blockquote,.callout{padding:16px;border-left:4px solid var(--kit-accent);background:var(--kit-surface);border-radius:14px}pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:16px;background:var(--kit-surface)}img{max-width:100%}.slide{min-height:720px;padding:64px;break-after:page}.slide:last-child{break-after:auto}@page{size:A4;margin:15mm}@media print{body{padding:0;background:white}h1,h2,h3{break-after:avoid}tr,figure{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
export function documentHTML(title, body, t = defaultTheme, {appearance="light",fontCSS=""}={}) {
  if(!["light","dark","system"].includes(appearance))throw new TypeError("Invalid document appearance");
  return `<!doctype html><html lang="en" data-theme="${appearance}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)}</title><style>${fontCSS}${themeCSS(t)}${printCSS}</style></head><body>${body}</body></html>`;
}
