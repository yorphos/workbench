import {
  theme,
  defaultTheme,
  themeCSS,
  escapeHTML,
  documentHTML,
  text,
} from "../vendor/professional/shared/model.js";
import { zipSync, strToU8 } from "fflate";
export const recipes = [
  ["sign-in", "Sign-in", "A clear beginning with accessible account controls."],
  [
    "settings",
    "Settings",
    "Connection details, unsaved changes, and safe defaults.",
  ],
  [
    "data-table",
    "Data table",
    "Readable rows, search, sorting, and empty results.",
  ],
  [
    "list-detail",
    "List & detail",
    "A focused queue with room to inspect each item.",
  ],
  [
    "navigation",
    "Navigation",
    "Responsive navigation that keeps its footer reachable.",
  ],
  [
    "multi-step",
    "Multi-step form",
    "Small steps with validation and a clear finish.",
  ],
  [
    "task-progress",
    "Task progress",
    "Progress, cancellation, interruption, and recovery.",
  ],
  [
    "change-review",
    "Change review",
    "Before and after, with an explicit decision.",
  ],
  [
    "outcome-receipt",
    "Outcome receipt",
    "What happened, when, and the evidence behind it.",
  ],
].map(([id, name, description]) => ({ id, name, description }));
export const states = [
  "ready",
  "loading",
  "empty",
  "error",
  "success",
  "disabled",
  "long",
  "stale",
];
export function seed(name = "Untitled interface") {
  return {
    name,
    theme: structuredClone(defaultTheme),
    recipe: "change-review",
    title: "Review your next release",
    description: "A few thoughtful changes, ready for a closer look.",
    state: "ready",
    notes: "Use the included state fixtures before shipping.",
    graphic: "social",
  };
}
export function normalize(v) {
  const x = { ...seed(), ...v };
  x.name = text(x.name, 120);
  x.title = text(x.title, 200);
  x.description = text(x.description, 3000);
  x.notes = text(x.notes, 12000);
  x.theme = theme(x.theme);
  if (
    !recipes.some((r) => r.id === x.recipe) ||
    !states.includes(x.state) ||
    !["social", "release", "screenshot"].includes(x.graphic)
  )
    throw new Error("Invalid recipe, state, or graphic.");
  return {
    name: x.name,
    title: x.title,
    description: x.description,
    notes: x.notes,
    theme: x.theme,
    recipe: x.recipe,
    state: x.state,
    graphic: x.graphic,
  };
}
const bodies = {
  "sign-in": `<form onSubmit={e=>{e.preventDefault();setNotice('Account handoff example. Connect your own authentication provider.')}}><label>Email<input type="email" required placeholder="you@example.com" /></label><button disabled={state==='disabled'}>Continue with your account</button><p>Authentication stays with your application.</p></form>`,
  settings: `<form onSubmit={e=>{e.preventDefault();setNotice('Settings saved in this example.')}}><label>Display name<input defaultValue="Studio team" required /></label><label>Notification preference<select><option>Important updates</option><option>All updates</option></select></label><label><input type="checkbox" defaultChecked /> Show detailed progress</label><button disabled={state==='disabled'}>Save settings</button></form>`,
  "data-table": `<><label>Find a project<input value={query} onChange={e=>setQuery(e.target.value)} /></label><table><caption>Example projects</caption><thead><tr><th><button onClick={()=>setReverse(!reverse)}>Project {reverse?'↓':'↑'}</button></th><th>Status</th></tr></thead><tbody>{(reverse?[...rows].reverse():rows).filter(r=>r.toLowerCase().includes(query.toLowerCase())).map(r=><tr key={r}><td>{r}</td><td>In review</td></tr>)}</tbody></table></>`,
  "list-detail": `<div className="split"><nav aria-label="Example queue">{rows.map(r=><button key={r} aria-current={selected===r?'true':undefined} onClick={()=>setSelected(r)}>{r}</button>)}</nav><section aria-label="Selected project"><h2>{selected}</h2><p>Review its scope, current revision, and outstanding decisions.</p></section></div>`,
  navigation: `<><button aria-expanded={open} onClick={()=>setOpen(!open)}>Menu</button>{open&&<nav aria-label="Workspace">{['Overview','Projects','Settings'].map(r=><button key={r} aria-current={selected===r?'page':undefined} onClick={()=>setSelected(r)}>{r}</button>)}</nav>}<p>Selected: {selected}</p></>`,
  "multi-step": `<form onSubmit={e=>{e.preventDefault();if(step<3)setStep(step+1);else setNotice('Your example project is ready.')}}><p>Step {step} of 3</p><label>{step===1?'Project name':step===2?'Primary audience':'Success criteria'}<input key={step} required /></label><div className="actions">{step>1&&<button type="button" onClick={()=>setStep(step-1)}>Back</button>}<button>{step===3?'Finish':'Continue'}</button></div></form>`,
  "task-progress": `<><progress max="100" value={state==='success'?100:60} aria-label="Task progress"/><p>Draft saved. Reviewing the remaining changes.</p><button disabled={state==='disabled'} onClick={()=>setNotice('Stopped. The saved draft is preserved.')}>Stop task</button><button onClick={()=>setNotice('Continuation requested in this local example.')}>Continue from saved work</button></>`,
  "change-review": `<><div className="split"><section><h2>Before</h2><p>Weekly update with unresolved notes.</p></section><section><h2>After</h2><p>A clear update with decisions and supporting links.</p></section></div><div className="actions"><button disabled={state==='disabled'} onClick={()=>setNotice('Changes accepted in this local example.')}>Accept changes</button><button onClick={()=>setNotice('Changes discarded. Original retained.')}>Keep original</button></div></>`,
  "outcome-receipt": `<dl><dt>Outcome</dt><dd>Changes saved</dd><dt>Revision</dt><dd>4 → 5</dd><dt>Evidence</dt><dd>Three reviewed sections</dd><dt>Delivery</dt><dd>No external delivery requested</dd></dl>`,
};
export const recipeCSS = `${themeCSS(defaultTheme)}*{box-sizing:border-box}body{margin:0;padding:32px;background:var(--kit-background);color:var(--kit-text);font:var(--kit-size)/1.6 var(--kit-font)}.recipe{max-width:780px;margin:auto;padding:32px;background:var(--kit-surface);border:1px solid var(--kit-border);border-radius:var(--kit-radius)}h1,h2{line-height:1.2}h2{font-size:18px}label{display:grid;gap:8px;margin:16px 0}input,select,button{font:inherit;border:1px solid var(--kit-border);border-radius:8px;padding:10px;min-height:44px}button{background:var(--kit-accent);color:var(--kit-accent-text);cursor:pointer}button:disabled{opacity:.5}.actions{display:flex;flex-wrap:wrap;gap:12px}.split{display:grid;grid-template-columns:1fr 1fr;gap:20px}.split section{padding:20px;background:var(--kit-background);border-radius:8px}table{width:100%;border-collapse:collapse}th,td{padding:12px;text-align:left;border-bottom:1px solid var(--kit-border)}progress{width:100%}nav{display:flex;flex-wrap:wrap;gap:8px}:focus-visible{outline:3px solid var(--kit-accent);outline-offset:3px}[role=alert]{padding:16px;border:1px solid currentColor}@media(max-width:600px){body,.recipe{padding:16px}.split{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto;transition:none}}`;
export function componentSource(id) {
  if (!bodies[id]) return null;
  return `import {useState} from 'react';\nimport './recipe.css';\nexport type RecipeState = ${states.map((v) => JSON.stringify(v)).join(" | ")};\nexport default function Recipe({title='A thoughtful workspace',description='An editable starting point.',state='ready'}:{title?:string;description?:string;state?:RecipeState}) {\n const [notice,setNotice]=useState(''),[query,setQuery]=useState(''),[reverse,setReverse]=useState(false),[selected,setSelected]=useState('Release plan'),[open,setOpen]=useState(true),[step,setStep]=useState(1);\n const rows=['Release plan','Research notes','Client handoff'];\n return <main className="recipe"><h1>{title}</h1><p>{state==='long'?description.repeat(8):description}</p>{state==='loading'?<p role="status">Loading your workspace…</p>:state==='empty'?<p>No items yet. Create your first project.</p>:state==='error'?<p role="alert">We couldn’t load this view. Your saved work is safe.</p>:<fieldset disabled={state==='disabled'} style={{border:0,padding:0,margin:0}}>${bodies[id]}</fieldset>}{state==='stale'&&<p role="alert">A newer revision is available. Reload before making changes.</p>}{state==='success'&&<p role="status">Changes saved.</p>}{notice&&<p role="status">{notice}</p>}</main>;\n}\n`;
}
export function starterFiles(data) {
  const d = normalize(data),
    content = componentSource(d.recipe);
  return {
    "package.json": strToU8(
      JSON.stringify(
        {
          name: "my-interface",
          version: "1.0.0",
          private: true,
          type: "module",
          scripts: {
            dev: "vite",
            build: "tsc --noEmit && vite build",
            "test:browser": "playwright test",
          },
          dependencies: { react: "19.2.8", "react-dom": "19.2.8" },
          devDependencies: {
            typescript: "5.9.3",
            vite: "6.4.3",
            "@vitejs/plugin-react": "4.7.0",
            "@types/react": "19.3.0",
            "@types/react-dom": "19.2.3",
            "@playwright/test": "1.63.0",
          },
        },
        null,
        2,
      ),
    ),
    "index.html": strToU8(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    ),
    "vite.config.ts": strToU8(
      "import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';export default defineConfig({plugins:[react()]});",
    ),
    "tsconfig.json": strToU8(
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          jsx: "react-jsx",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["src"],
      }),
    ),
    "src/main.tsx": strToU8(
      `import {createRoot} from 'react-dom/client';import Recipe from './Recipe';createRoot(document.getElementById('root')!).render(<Recipe title={${JSON.stringify(d.title)}} description={${JSON.stringify(d.description)}} state={${JSON.stringify(d.state)}}/>);`,
    ),
    "src/Recipe.tsx": strToU8(content),
    "src/recipe.css": strToU8(recipeCSS + "\n" + themeCSS(d.theme)),
    "tests/states.spec.ts": strToU8(
      "import {test,expect} from '@playwright/test';test('screen is usable on mobile',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});",
    ),
    "playwright.config.ts": strToU8(
      "import {defineConfig} from '@playwright/test';export default defineConfig({testDir:'tests',use:{baseURL:'http://127.0.0.1:4173'},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173'}});",
    ),
    "README.md": strToU8(
      `# ${d.name}\n\n${d.notes}\n\nRun npm install, npm run dev, npm run build. State examples: ${states.join(", ")}. Set the Recipe state prop to inspect each one. Run npx playwright install chromium and npm run test:browser.\n\nTheme uses ${d.theme.font}; self-host your licensed font or use its fallback. MIT source, by YRP.\n`,
    ),
    LICENSE: strToU8(
      "MIT License\nCopyright (c) 2026 YRP\nPermission is granted to use, copy, modify, merge, publish, distribute, sublicense and sell this software, with this notice retained. THE SOFTWARE IS PROVIDED AS IS WITHOUT WARRANTY OF ANY KIND.\n",
    ),
  };
}
export function graphic(data) {
  const d = normalize(data),
    height = d.graphic === "release" ? 1080 : 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="1200" height="${height}" fill="${d.theme.light.background}"/><rect x="50" y="50" width="1100" height="${height - 100}" rx="24" fill="${d.theme.light.surface}"/><path d="M85 100h80v14H85zm0 30h50v14H85z" fill="${d.theme.light.accent}"/><text x="85" y="220" font-family="${d.theme.font}" font-size="22" fill="${d.theme.light.muted}">${escapeHTML(d.name.slice(0, 55))}</text><foreignObject x="85" y="250" width="1010" height="250"><div xmlns="http://www.w3.org/1999/xhtml" style="font:700 64px/1.1 ${d.theme.font};color:${d.theme.light.text};overflow-wrap:anywhere">${escapeHTML(d.title)}</div></foreignObject><text x="85" y="${height - 95}" font-family="${d.theme.font}" font-size="20" fill="${d.theme.light.muted}">${escapeHTML(d.description.slice(0, 80))}</text></svg>`;
}

export function patternHTML(value) {
  const d = normalize(value),
    e = escapeHTML;
  const bodies = {
    "sign-in":
      '<label>Email<input type="email" placeholder="you@example.com"></label><button>Continue with your account</button><p>Authentication stays with your application.</p>',
    settings:
      '<label>Display name<input value="Studio team"></label><label>Notification preference<select><option>Important updates</option></select></label><button>Save settings</button>',
    "data-table":
      "<table><caption>Example projects</caption><thead><tr><th>Project</th><th>Status</th></tr></thead><tbody><tr><td>Northstar</td><td>In review</td></tr><tr><td>Field notes</td><td>Ready</td></tr></tbody></table>",
    "list-detail":
      '<div class="split"><nav><button>Northstar</button><button>Field notes</button></nav><section><h2>Northstar</h2><p>Review its scope, current revision, and outstanding decisions.</p></section></div>',
    navigation:
      "<nav><button>Overview</button><button>Projects</button><button>Settings</button></nav><p>Selected: Overview</p>",
    "multi-step":
      '<p>Step 1 of 3</p><label>Project name<input placeholder="Your next project"></label><button>Continue</button>',
    "task-progress":
      '<progress max="100" value="60"></progress><p>Draft saved. Reviewing the remaining changes.</p><button>Stop task</button>',
    "change-review":
      '<div class="split"><section><h2>Before</h2><p>Weekly update with unresolved notes.</p></section><section><h2>After</h2><p>A clear update with decisions and supporting links.</p></section></div><div class="actions"><button>Accept changes</button><button>Keep original</button></div>',
    "outcome-receipt":
      "<h2>Revision saved</h2><dl><dt>Outcome</dt><dd>Ready for review</dd><dt>Evidence</dt><dd>Saved source revision and checked content digest</dd></dl>",
  };
  const state = {
    loading: "Loading your materials…",
    empty: "No items yet. Create the first one.",
    error: "The request could not be completed. Your draft is preserved.",
    success: "Your changes are saved.",
    stale: "A newer revision is available. Review it before continuing.",
    disabled: "Controls are disabled while this revision is locked.",
    long: "A long explanation remains readable, wraps naturally, and preserves the next action.",
  }[d.state];
  return documentHTML(
    d.name,
    `<style>${recipeCSS}${themeCSS(d.theme)}</style><article class="recipe"><p>${e(recipes.find((r) => r.id === d.recipe).name)} / ${e(d.state)}</p><h1>${e(d.title)}</h1><p>${e(d.description)}</p>${state ? `<p role="status">${e(state)}</p>` : ""}${bodies[d.recipe]}</article>`,
    d.theme,
  );
}
