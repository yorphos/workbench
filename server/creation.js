import { strToU8 } from "fflate";
import { normalize, componentSource, recipes } from "../shared/recipes.js";
import {
  createBlueprint,
  blueprintSchema,
  getCatalog,
} from "../vendor/professional/creation/blueprint.js";
import { previewBlueprint } from "../vendor/professional/creation/preview.js";
import {
  buildScaffold,
  profileFiles,
} from "../vendor/professional/creation/scaffold.js";
export function projectBlueprint(value) {
  const d = normalize(value);
  return { ...d.blueprint, theme: d.theme };
}
export function patternHTML(value,options={}) {
  const d = normalize(value),
    b = createBlueprint(d.name, "list-detail", d.theme);
  b.screens[0] = {
    ...b.screens[0],
    recipe: d.recipe,
    title: d.title,
    description: d.description,
  };
  return previewBlueprint(b, { state: d.state,appearance:options.appearance||"light" }).html;
}
export function starterFiles(value) {
  const d = normalize(value),
    files = buildScaffold(createBlueprint(d.name, "list-detail", d.theme));
  for (const name of [
    "server/index.ts",
    "scripts/migrate.ts",
    "scripts/fixture.ts",
    "tests/contracts.test.ts",
    "tests/workflow.spec.ts",
    "playwright.config.ts",
    "deployment.json",
    "RUNNER.toml",
    ".env.example",
  ])
    delete files[name];
  const pkg = JSON.parse(files["package.json"]);
  pkg.scripts = {
    dev: "vite --host 127.0.0.1",
    build: "tsc --noEmit && vite build",
  };
  files["package.json"] = strToU8(JSON.stringify(pkg, null, 2));
  files["src/Recipe.tsx"] = strToU8(
    componentSource(d.recipe)
      .replace("./creation/ui.js", "../vendor/foundation/creation/ui.js")
      .replace("./creation/ui.js", "../vendor/foundation/creation/ui.js"),
  );
  files["src/main.tsx"] = strToU8(
    `import React from 'react';import {createRoot} from 'react-dom/client';import {Recipe} from '../vendor/foundation/creation/ui.js';import {recipeFixture} from '../vendor/foundation/creation/fixture.js';import '../vendor/foundation/web/foundation.css';import '../vendor/foundation/creation/ui.css';import '../vendor/foundation/web/pip-ui.css';import '../vendor/foundation/web/pip-fonts.css';import '../vendor/foundation/web/pip-components.css';import './theme.css';const trace=()=>document.getElementById('trace')!.textContent='Fixture callback requested; no application effect was applied.';createRoot(document.getElementById('root')!).render(<main className="pf-app"><Recipe {...recipeFixture(${JSON.stringify(d.state)})} state={${JSON.stringify(d.state)}} recipe={${JSON.stringify(d.recipe)}} title={${JSON.stringify(d.title)}} description={${JSON.stringify(d.description)}} onCreate={trace} onAccept={trace} onDiscard={trace} onSave={trace} onSignIn={trace} onSelect={trace} onNavigate={trace}/><p id="trace" role="status">Fictional interface demo. Domain callbacks need an application adapter.</p></main>);`,
  );
  files["README.md"] = strToU8(
    "# " +
      d.name +
      "\n\nInterface demo only; fixture callbacks do not save, accept, send or sign in. Run npm ci and npm run build. Use the separate Application export for account-owned records and real review actions. Canonical Pip v2 components, MIT sources and Noto Sans/DM Sans OFL notices are retained.\n",
  );
  return files;
}
export function registry(id) {
  if (id === "catalog") return getCatalog();
  if (id === "blueprint-schema") return blueprintSchema;
  const r = recipes.find((r) => r.id === id);
  if (!r) return null;
  const source = profileFiles(),
    names = [
      "creation/ui.js",
      "creation/ui.d.ts",
      "creation/ui.css",
      "web/tokens.css",
      "web/pip-ui.css",
      "web/pip-components.css",
      "web/fonts/NotoSans-LICENSE.txt",
      "web/fonts.css",
      "web/fonts/dmsans-OFL.txt",
    ];
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: id,
    type: "registry:block",
    title: r.name,
    description:
      "Canonical Foundation recipe. Pass recipe=" +
      id +
      " and implement its declared callbacks. Import tokens.css, fonts.css and ui.css once in your application.",
    dependencies: ["react@19.2.8", "react-dom@19.2.8"],
    files: names
      .map((name) => ({
        path: "registry/" + id + "/" + name,
        type: "registry:file",
        target: "components/workbench/" + name,
        content:
          name === "web/fonts.css"
            ? [400, 500, 600, 700]
                .map(
                  (weight, i) =>
                    '@font-face{font-family:"DM Sans";font-style:normal;font-weight:' +
                    weight +
                    ";src:url(data:font/ttf;base64," +
                    source["web/fonts/font-" + i + ".ttf"].toString("base64") +
                    ') format("truetype")}',
                )
                .join("\n")+'@font-face{font-family:"Noto Sans";font-weight:100 900;src:url(data:font/ttf;base64,'+source["web/fonts/NotoSans-Regular.ttf"].toString("base64")+') format("truetype")} .pip-ui{--pip-font-display:"Noto Sans",system-ui,sans-serif}'
            : source[name].toString(),
      }))
      .filter((f) => f.content !== undefined),
  };
}

export function publicFontCSS(){const files=profileFiles();return '@font-face{font-family:"Noto Sans";font-weight:100 900;src:url(data:font/ttf;base64,'+files["web/fonts/NotoSans-Regular.ttf"].toString("base64")+') format("truetype")}';}

export function publicFontLicense(){return profileFiles()["web/fonts/NotoSans-LICENSE.txt"].toString();}
