import {
  defaultTheme,
  theme,
  text,
  escapeHTML,
} from "../vendor/professional/shared/model.js";
import {
  createBlueprint,
  getCatalog,
} from "../vendor/professional/creation/blueprint.js";
import {validateFormBlueprint} from '../vendor/professional/creation/form-blueprints.js';
const catalog = getCatalog();
export const recipes = catalog.recipes.map((r) => ({
  ...r,
  name: r.title,
  description:
    "Foundation " +
    catalog.foundationVersion +
    " · " +
    r.requiredCallbacks.join(", "),
}));
export const states = catalog.recipes[0].states;
export function seed(name = "Untitled interface") {
  return {
    name,
    theme: structuredClone(defaultTheme),
    recipe: "change-review",
    title: "Review your next release",
    description: "A few thoughtful changes, ready for a closer look.",
    state: "ready",
    notes:
      "Inspect callback contracts and verify real domain effects before shipping.",
    graphic: "social",
    blueprint: createBlueprint(name),
    blueprintScreen: "overview",
    formBlueprint: null,
  };
}
export function normalize(v) {
  const x = { ...seed(), ...v };
  for (const [key, max] of Object.entries({
    name: 120,
    title: 200,
    description: 3000,
    notes: 12000,
  }))
    x[key] = text(x[key], max);
  x.theme = theme(x.theme);
  if (
    !recipes.some((r) => r.id === x.recipe) ||
    !states.includes(x.state) ||
    !["social", "release", "screenshot"].includes(x.graphic)
  )
    throw new Error("Invalid recipe, state, or graphic.");
  if (
    !x.blueprint ||
    typeof x.blueprint !== "object" ||
    Array.isArray(x.blueprint) ||
    JSON.stringify(x.blueprint).length > 50000
  )
    throw new Error("Invalid or oversized blueprint.");
  if (typeof x.blueprintScreen !== "string" || !/^[a-z][a-z0-9-]{0,59}$/.test(x.blueprintScreen))
    throw new Error("Invalid blueprint preview screen.");
  if(x.formBlueprint!==null&&!validateFormBlueprint(x.formBlueprint).valid)
    throw new Error('Invalid shared-form blueprint.');
  return Object.fromEntries(
    [
      "name",
      "theme",
      "recipe",
      "title",
      "description",
      "state",
      "notes",
      "graphic",
      "blueprint",
      "blueprintScreen",
      "formBlueprint",
    ].map((k) => [k, x[k]]),
  );
}
export function componentSource(id) {
  return recipes.some((r) => r.id === id)
    ? `// Same canonical implementation used by Workbench and application exports.
export {Recipe as default} from './creation/ui.js';
export type {RecipeProps,RecipeState} from './creation/ui.js';
// Required callbacks: ${recipes.find((r) => r.id === id).requiredCallbacks.join(", ") || "state and receipt supplied by your app"}.
// Pass recipe="${id}"; never treat a fixture callback as a completed effect.
`
    : null;
}
export function graphic(data,appearance="light") {
  if(!["system","light","dark"].includes(appearance))throw new TypeError("Invalid graphic appearance");
  const d = normalize(data),
    height = d.graphic === "release" ? 1080 : 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="1200" height="${height}" fill="${d.theme[appearance==="dark"?"dark":"light"].background}"/><rect x="50" y="50" width="1100" height="${height - 100}" rx="24" fill="${d.theme[appearance==="dark"?"dark":"light"].surface}"/><path d="M85 100h80v14H85zm0 30h50v14H85z" fill="${d.theme[appearance==="dark"?"dark":"light"].accent}"/><text x="85" y="220" font-family="${d.theme.font}" font-size="22" fill="${d.theme[appearance==="dark"?"dark":"light"].muted}">${escapeHTML(d.name.slice(0, 55))}</text><foreignObject x="85" y="250" width="1010" height="250"><div xmlns="http://www.w3.org/1999/xhtml" style="font:700 64px/1.1 ${d.theme.font};color:${d.theme[appearance==="dark"?"dark":"light"].text};overflow-wrap:anywhere">${escapeHTML(d.title)}</div></foreignObject><text x="85" y="${height - 95}" font-family="${d.theme.font}" font-size="20" fill="${d.theme[appearance==="dark"?"dark":"light"].muted}">${escapeHTML(d.description.slice(0, 80))}</text></svg>`;
}
