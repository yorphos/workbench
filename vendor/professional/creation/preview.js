import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Recipe } from "./ui.js";
import { recipeFixture } from "./fixture.js";
import { validateBlueprint } from "./blueprint.js";
import { verifyCreationRelease, profileFiles } from "./scaffold.js";
import { appThemeCSS } from "./theme.js";
import { escapeHTML } from "../shared/model.js";
import { createHash } from "node:crypto";
export function previewBlueprint(
  blueprint,
  { screenId = blueprint.screens[0].id, state = "ready" } = {},
) {
  const report = validateBlueprint(blueprint);
  if (!report.valid)
    throw new Error([...report.errors, ...report.unresolved].join(" "));
  const catalog = verifyCreationRelease(),
    screen = blueprint.screens.find((s) => s.id === screenId);
  if (
    !screen ||
    !catalog.recipes.find((r) => r.id === screen.recipe)?.states.includes(state)
  )
    throw new Error("Unavailable screen or state.");
  const files = profileFiles(),
    fonts = [400, 500, 600, 700]
      .map(
        (weight, i) =>
          '@font-face{font-family:"DM Sans";font-style:normal;font-weight:' +
          weight +
          ";src:url(data:font/ttf;base64," +
          files["web/fonts/font-" + i + ".ttf"].toString("base64") +
          ') format("truetype")}',
      )
      .join("\n");
  const blueprintDigest = createHash("sha256")
      .update(JSON.stringify(blueprint))
      .digest("hex"),
    fixture = recipeFixture(state),
    fixtureDigest = createHash("sha256")
      .update(JSON.stringify(fixture))
      .digest("hex");
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; font-src data:; img-src data:"><title>' +
    escapeHTML(screen.title) +
    "</title><style>" +
    files["web/tokens.css"].toString() +
    fonts +
    appThemeCSS(blueprint.theme) +
    files["creation/ui.css"].toString() +
    'body{margin:0;padding:24px}small{display:block;margin-top:20px}</style></head><body class="pf-app">' +
    renderToStaticMarkup(
      React.createElement(Recipe, {
        ...fixture,
        recipe: screen.recipe,
        title: screen.title,
        description: screen.description,
      }),
    ) +
    "<small>Fictional state fixture · " +
    escapeHTML(state) +
    " · Foundation " +
    escapeHTML(catalog.foundationVersion) +
    '</small><script type="application/json" id="preview-evidence">' +
    JSON.stringify({
      schemaVersion: 1,
      blueprintDigest,
      fixtureDigest,
      foundation: blueprint.foundation,
      recipe: screen.recipe,
      recipeVersion: screen.recipeVersion,
      state,
    }).replace(/</g, "\\u003c") +
    '</script><meta name="font-license" content="' +
    escapeHTML(files["web/fonts/dmsans-OFL.txt"].toString()) +
    '"></body></html>';
  return {
    html,
    evidence: {
      schemaVersion: 1,
      blueprintDigest,
      fixtureDigest,
      foundation: blueprint.foundation,
      recipe: screen.recipe,
      recipeVersion: screen.recipeVersion,
      state,
    },
  };
}
