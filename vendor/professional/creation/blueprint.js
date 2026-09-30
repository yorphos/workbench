import catalog from "./catalog.json" with { type: "json" };
import { defaultTheme, theme } from "../shared/model.js";
import { blueprintSchema } from "./blueprint-schema.js";
export { blueprintSchema };
import validator from "./blueprint-validator.js";
export const domainBindings = {
  onSignIn: "account.signIn",
  onSave: "settings.save",
  onCreate: "records.create",
  onSelect: "records.select",
  onQuery: "records.query",
  onSort: "records.sort",
  onAccept: "records.accept",
  onDiscard: "records.discard",
  onNavigate: "navigation.open",
};
export function createBlueprint(
  name = "Review desk",
  recipe = "list-detail",
  projectTheme = defaultTheme,
) {
  const id =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "review-desk";
  return {
    schemaVersion: 1,
    product: { id: /^[a-z]/.test(id) ? id : "app-" + id, name, mark: "◈" },
    foundation: {
      version: catalog.foundationVersion,
      catalogDigest: catalog.sourceDigest,
    },
    runtime: {
      frontend: "react",
      backend: "node24",
      persistence: "sqlite",
      auth: "google",
    },
    domain: { adapter: "review-records-v1" },
    screens: [
      {
        id: "overview",
        path: "/",
        recipe,
        recipeVersion: 1,
        title: name,
        description:
          "Create an item, propose a revision and review its changes.",
        states: ["ready", "loading", "empty", "error", "stale"],
      },
      {
        id: "create",
        path: "/create",
        recipe: "multi-step",
        recipeVersion: 1,
        title: "Create an item",
        description: "Save a new account-owned record.",
        states: ["ready", "error"],
      },
      {
        id: "review",
        path: "/review",
        recipe: "change-review",
        recipeVersion: 1,
        title: "Review changes",
        description: "Accept or discard the exact proposed revision.",
        states: ["ready", "awaiting_review", "stale", "error"],
      },
      {
        id: "receipt",
        path: "/receipt",
        recipe: "outcome-receipt",
        recipeVersion: 1,
        title: "Outcome and evidence",
        description: "Saved results are distinct from external delivery.",
        states: ["ready", "empty"],
      },
    ],
    bindings: { ...domainBindings },
    theme: structuredClone(projectTheme),
  };
}
export function validateBlueprint(value, currentCatalog = catalog) {
  const errors = [];
  if (!validator(value))
    return {
      valid: false,
      errors: validator.errors.map(
        (e) => (e.instancePath || "/") + " " + e.message,
      ),
      unresolved: [],
      foundationVersion: currentCatalog.foundationVersion,
    };
  if (!/^[a-z][a-z0-9-]{0,59}$/.test(value.product.id))
    errors.push("product.id must be a lowercase application slug.");
  if (
    value.foundation.version !== currentCatalog.foundationVersion ||
    value.foundation.catalogDigest !== currentCatalog.sourceDigest
  )
    errors.push(
      "The blueprint pins a different Foundation catalog. Review an explicit upgrade before exporting.",
    );
  const unresolved = [];
  if (
    value.runtime.frontend !== "react" ||
    value.runtime.backend !== "node24" ||
    value.runtime.persistence !== "sqlite" ||
    value.runtime.auth !== "google"
  )
    unresolved.push(
      "This release generates only React / Node 24 / account-owned SQLite / Google integration. Supply a reviewed runtime adapter for this profile.",
    );
  if (value.runtime.persistence !== "device" && value.runtime.auth === "device")
    errors.push("Hosted persistence requires verified account integration.");
  if (value.domain.adapter !== "review-records-v1")
    unresolved.push(
      "The selected domain adapter is not available in this release.",
    );
  const ids = new Set(),
    paths = new Set();
  for (const screen of value.screens) {
    if (
      !/^[a-z][a-z0-9-]{0,59}$/.test(screen.id) ||
      !/^\/(?:[a-z][a-z0-9-]*)?$/.test(screen.path) ||
      ids.has(screen.id) ||
      paths.has(screen.path)
    )
      errors.push("Screen IDs and paths must be unique safe routes.");
    ids.add(screen.id);
    paths.add(screen.path);
    const recipe = currentCatalog.recipes.find((r) => r.id === screen.recipe);
    if (!recipe || recipe.version !== screen.recipeVersion) {
      errors.push("Unavailable recipe version: " + screen.recipe);
      continue;
    }
    if (screen.states.some((state) => !recipe.states.includes(state)))
      errors.push("Unsupported state in " + screen.id + ".");
    for (const callback of recipe.requiredCallbacks)
      if (value.bindings[callback] !== domainBindings[callback])
        unresolved.push(
          screen.id + ": bind " + callback + " to the declared domain adapter.",
        );
  }
  if (!paths.has("/")) errors.push("A blueprint needs a root screen.");
  for (const [callback, binding] of Object.entries(value.bindings))
    if (domainBindings[callback] !== binding)
      unresolved.push("Unsupported domain callback: " + callback + ".");
  try {
    theme(value.theme);
  } catch (e) {
    errors.push(e.message);
  }
  return {
    valid: errors.length === 0 && unresolved.length === 0,
    errors,
    unresolved: [...new Set(unresolved)],
    foundationVersion: currentCatalog.foundationVersion,
  };
}
export function upgradeBlueprint(value) {
  return {
    ...structuredClone(value),
    foundation: {
      version: catalog.foundationVersion,
      catalogDigest: catalog.sourceDigest,
    },
  };
}
export function getCatalog() {
  return structuredClone(catalog);
}
