import {
  seed,
  normalize,
  starterFiles,
  componentSource,
  recipes,
  graphic,
  recipeCSS,
  patternHTML,
} from "../shared/recipes.js";
import { readFileSync } from "node:fs";
import { zipSync } from "fflate";
import {
  defaultTheme,
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
  extras: (data) => {
    const files = starterFiles(data);
    files["src/fonts/dm-sans.ttf"] = new Uint8Array(
      readFileSync(
        new URL("../vendor/professional/web/fonts/font-0.ttf", import.meta.url),
      ),
    );
    files["src/fonts/OFL.txt"] = new Uint8Array(
      readFileSync(
        new URL(
          "../vendor/professional/web/fonts/dmsans-OFL.txt",
          import.meta.url,
        ),
      ),
    );
    files["src/recipe.css"] = new TextEncoder().encode(
      new TextDecoder().decode(files["src/recipe.css"]) +
        '\n@font-face{font-family:"DM Sans";src:url(./fonts/dm-sans.ttf) format("truetype");font-weight:100 900;font-style:normal}',
    );
    return files;
  },
  registry: (id) => {
    const source = componentSource(id);
    return source
      ? {
          $schema: "https://ui.shadcn.com/schema/registry-item.json",
          name: id,
          type: "registry:block",
          title: recipes.find((r) => r.id === id).name,
          dependencies: ["react", "react-dom"],
          files: [
            {
              path: `registry/${id}/Recipe.tsx`,
              type: "registry:file",
              target: `components/workbench/${id}/Recipe.tsx`,
              content: source,
            },
            {
              path: `registry/${id}/recipe.css`,
              type: "registry:file",
              target: `components/workbench/${id}/recipe.css`,
              content: recipeCSS,
            },
          ],
        }
      : null;
  },
  export(p, format) {
    const d = p.data;
    if (format === "starter")
      return {
        body: Buffer.from(zipSync(this.extras(d))),
        mime: "application/zip",
        name: "interface-starter.zip",
      };
    if (format === "css")
      return { body: themeCSS(d.theme), mime: "text/css", name: "theme.css" };
    if (format === "svg")
      return { body: graphic(d), mime: "image/svg+xml", name: "release.svg" };
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
