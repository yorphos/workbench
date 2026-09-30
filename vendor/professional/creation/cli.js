import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createBlueprint,
  validateBlueprint,
  getCatalog,
  upgradeBlueprint,
} from "./blueprint.js";
import {
  verifyCreationRelease,
  profileFiles,
  planScaffold,
  writeScaffold,
  planAdoption,
  adoptScaffoldRelease,
} from "./scaffold.js";
export async function runCLI(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv,
    args = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (
      !/^--[a-z-]+$/.test(rest[i]) ||
      !rest[i + 1] ||
      Object.hasOwn(args, rest[i].slice(2))
    )
      throw new Error("Use named argument/value pairs.");
    args[rest[i].slice(2)] = rest[i + 1];
  }
  const allowed = {
    catalog: [],
    inspect: ["recipe"],
    blueprint: ["name", "recipe"],
    validate: ["blueprint"],
    plan: ["blueprint"],
    scaffold: ["blueprint", "out"],
    preview: ["blueprint", "out", "screen", "state"],
    adoption: ["target"],
    adopt: ["target", "plan-digest"],
    upgrade: ["blueprint"],
  };
  if (
    !Object.hasOwn(allowed, command) ||
    Object.keys(args).some((key) => !allowed[command].includes(key))
  )
    throw new Error(
      "Commands: catalog, inspect, blueprint, validate, plan, scaffold, preview, adoption, adopt, upgrade.",
    );
  verifyCreationRelease();
  const catalog = getCatalog();
  const blueprint = () => {
    if (!args.blueprint) throw new Error("Supply --blueprint <file>.");
    const text = readFileSync(resolve(args.blueprint), "utf8");
    if (Buffer.byteLength(text) > 256 * 1024)
      throw new Error("Blueprint exceeds the input bound.");
    return JSON.parse(text);
  };
  if (command === "catalog")
    return {
      schemaVersion: 1,
      foundationVersion: catalog.foundationVersion,
      sourceDigest: catalog.sourceDigest,
      runtimeProfiles: catalog.runtimeProfiles,
      recipes: catalog.recipes.map(
        ({ id, title, version, states, requiredCallbacks, status }) => ({
          id,
          title,
          version,
          states,
          requiredCallbacks,
          status,
        }),
      ),
    };
  if (command === "inspect") {
    const recipe = catalog.recipes.find((r) => r.id === args.recipe);
    if (!recipe) throw new Error("Recipe unavailable.");
    return {
      ...recipe,
      foundationVersion: catalog.foundationVersion,
      sourceDigest: catalog.sourceDigest,
      propsContract: profileFiles()["creation/ui.d.ts"].toString(),
      requiredChecks: [
        "actual domain callback",
        "account and revision rejection",
        "keyboard and responsive flow",
      ],
      fixtureEffects: "none",
    };
  }
  if (command === "blueprint")
    return createBlueprint(
      args.name || "Review desk",
      args.recipe || "list-detail",
    );
  if (command === "upgrade") return upgradeBlueprint(blueprint());
  if (command === "adopt") {
    if (!args.target) throw new Error("Supply --target <app-directory>.");
    return adoptScaffoldRelease(args.target, args["plan-digest"]);
  }
  if (command === "validate") return validateBlueprint(blueprint());
  if (command === "plan") return planScaffold(blueprint());
  if (command === "scaffold") {
    if (!args.out) throw new Error("Supply --out <empty-directory>.");
    return writeScaffold(blueprint(), args.out);
  }
  if (command === "adoption") {
    if (!args.target) throw new Error("Supply --target <app-directory>.");
    return planAdoption(args.target);
  }
  if (command === "preview") {
    if (!args.out || !args.out.endsWith(".html"))
      throw new Error("Supply a new .html --out file.");
    const output = resolve(args.out);
    if (existsSync(output)) throw new Error("Preview output already exists.");
    const { previewBlueprint } = await import("./preview.js");
    const result = previewBlueprint(blueprint(), {
      ...(args.screen ? { screenId: args.screen } : {}),
      state: args.state || "ready",
    });
    writeFileSync(output, result.html, { flag: "wx" });
    return {
      path: output,
      evidence: result.evidence,
      bytes: Buffer.byteLength(result.html),
      interactive: false,
    };
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const result = await runCLI();
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (result.valid === false) process.exitCode = 2;
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: e.message }) + "\n");
    process.exitCode = 2;
  }
}
