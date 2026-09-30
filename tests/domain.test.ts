import { test } from "node:test";
import assert from "node:assert/strict";
import { recipes, states, seed, normalize } from "../shared/recipes.js";
import { starterFiles, patternHTML } from "../server/creation.js";
import { config } from "../server/config.js";
import { strFromU8, unzipSync } from "fflate";
import { getCatalog } from "../vendor/professional/creation/blueprint.js";
test("registry, preview and application export share released implementation and callbacks", () => {
  const catalog = getCatalog();
  for (const recipe of recipes) {
    const d = { ...seed(), recipe: recipe.id },
      demo = starterFiles(d),
      registry = config.registry(recipe.id);
    assert.match(
      strFromU8(demo["src/Recipe.tsx"]),
      /vendor\/foundation\/creation\/ui.js/,
    );
    const source = registry.files.find(
      (f) => f.target === "components/workbench/creation/ui.js",
    );
    assert.equal(
      source.content,
      strFromU8(demo["vendor/foundation/creation/ui.js"]),
    );
    assert.deepEqual(
      recipe.requiredCallbacks,
      catalog.recipes.find((r) => r.id === recipe.id).requiredCallbacks,
    );
    for (const state of states)
      assert.match(
        patternHTML({ ...d, state }),
        new RegExp('data-state="' + state + '"'),
      );
  }
  const artifact = config.export({ data: seed() }, "application"),
    files = unzipSync(artifact.body);
  assert.ok(files["package-lock.json"]);
  assert.ok(files["server/index.ts"]);
  assert.match(strFromU8(files["src/main.tsx"]), /act\(\s*["']propose["']/);
  assert.ok(files["vendor/foundation/web/fonts/dmsans-OFL.txt"]);
  assert.equal(config.registry("missing"), null);
});
test("imported markup is escaped and invalid blueprint drafts cannot become application exports", () => {
  assert.match(
    patternHTML({ ...seed(), title: "<script>unsafe</script>" }),
    /&lt;script&gt;/,
  );
  const data = normalize({ ...seed(), blueprint: { schemaVersion: 999 } });
  assert.throws(
    () => config.export({ data }, "application"),
    /Blueprint cannot be generated/,
  );
});
