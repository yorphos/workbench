import { agentRouteFor } from "./agent.js";
import {
  starterFiles,
  patternHTML,
  registry,
  projectBlueprint,
} from "./creation.js";
import { buildScaffold } from "../vendor/professional/creation/scaffold.js";
import { seed, normalize, recipes, graphic } from "../shared/recipes.js";
import { embedSVGFonts } from "../vendor/professional/server/fonts.js";
import { zipSync } from "fflate";
import {
  themeCSS,
  documentHTML,
  escapeHTML,
} from "../vendor/professional/shared/model.js";
export const config = {
  id: "workbench",
  name: "Workbench",
  port: 8175,
  normalize,
  seed,
  publicView: normalize,
  importKit: (kit) =>
    normalize({
      ...seed(kit.data.name || kit.manifest.projectName),
      ...kit.data,
      notes:
        kit.data.notes ||
        "Imported project identity. Source: " + kit.manifest.app,
    }),
  extras: starterFiles,
  registry,
  export(p, format) {
    const d = p.data;
    if (format === "application")
      return {
        body: Buffer.from(zipSync(buildScaffold(projectBlueprint(d)))),
        mime: "application/zip",
        name: "application.zip",
      };
    if (format === "blueprint")
      return {
        body: JSON.stringify(projectBlueprint(d), null, 2),
        mime: "application/json",
        name: "app-blueprint.json",
      };
    if (format === "starter")
      return {
        body: Buffer.from(zipSync(this.extras(d))),
        mime: "application/zip",
        name: "interface-starter.zip",
      };
    if (format === "css")
      return { body: themeCSS(d.theme), mime: "text/css", name: "theme.css" };
    if (format === "svg")
      return {
        body: embedSVGFonts(graphic(d)),
        mime: "image/svg+xml",
        name: "release.svg",
      };
    if (format === "png")
      return {
        body:
          d.graphic === "screenshot"
            ? patternHTML(d)
            : documentHTML(d.name, graphic(d), d.theme).replace(
                "</style>",
                "body{padding:0;margin:0}svg{display:block}</style>",
              ),
        name: "release.png",
      };
    if (format === "html" || format === "pdf")
      return {
        body: documentHTML(
          d.name,
          `<h1>${escapeHTML(d.title)}</h1><p>${escapeHTML(d.description)}</p><h2>Semantic theme</h2><pre>${escapeHTML(themeCSS(d.theme))}</pre><h2>Patterns and states</h2><p>${escapeHTML(recipes.map((r) => r.name).join(", "))}</p><p>Loading, empty, error, ready, running, stopped, awaiting review, and completed are explicit props in each exported recipe. Use application state to drive them.</p><h2>Implementation notes</h2><p>${escapeHTML(d.notes)}</p>`,
          d.theme,
        ),
        mime: "text/html",
        name: "style-guide." + format,
      };
    return null;
  },
  email(data, url) {
    return {
      subject: data.title,
      html: documentHTML(
        data.title,
        `<h1>${escapeHTML(data.title)}</h1><p>${escapeHTML(data.description)}</p><p>Review the project in Workbench: ${escapeHTML(url)}</p>`,
        data.theme,
      ),
      text: data.title + "\n" + data.description + "\n" + url,
    };
  },
};

config.agentRoute = agentRouteFor(config);
config.onOpen = (store) => {
  if (
    store.db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='workbench_operations'",
      )
      .get()
  )
    store.db
      .prepare(
        "UPDATE workbench_operations SET status='uncertain' WHERE status='claimed'",
      )
      .run();
};
