import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recipes,
  states,
  seed,
  starterFiles,
  patternHTML,
} from "../shared/recipes.js";
import { config } from "../server/config.js";
import { strFromU8 } from "fflate";
test("every recipe has complete source, explicit states and a usable registry item", () => {
  for (const r of recipes) {
    const d = { ...seed(), recipe: r.id };
    const files = starterFiles(d);
    assert.match(strFromU8(files["src/Recipe.tsx"]), /export default/);
    const registry = config.registry(r.id);
    assert.equal(registry.files.length, 2);
    assert.equal(
      registry.files[0].target.replace(/Recipe.tsx$/, "recipe.css"),
      registry.files[1].target,
    );
    for (const state of states)
      assert.match(patternHTML({ ...d, state }), new RegExp(state));
  }
});
test("exported materials escape imported markup", () => {
  assert.match(
    patternHTML({ ...seed(), title: "<script>unsafe</script>" }),
    /&lt;script&gt;/,
  );
});
