import {
  readFileSync,
  existsSync,
  readdirSync,
  lstatSync,
  mkdirSync,
  writeFileSync,
  realpathSync,
  unlinkSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import profile from "./profile.json" with { type: "json" };
import { getCatalog, validateBlueprint } from "./blueprint.js";
import { appThemeCSS } from "./theme.js";
const here = dirname(fileURLToPath(import.meta.url)),
  sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function profileFiles() {
  return Object.fromEntries(
    Object.entries(profile.files).map(([target, source]) => {
      const local = resolve(here, "..", target),
        canonical = resolve(here, "../..", source);
      const path = existsSync(local) ? local : canonical;
      if (!existsSync(path)) throw new Error("Missing release file: " + target);
      return [target, readFileSync(path)];
    }),
  );
}
export function verifyCreationRelease() {
  const catalog = getCatalog(),
    files = profileFiles();
  for (const [name, checksum] of Object.entries(catalog.sources))
    if (!files[name] || sha(files[name]) !== checksum)
      throw new Error("Creation release file changed: " + name);
  return catalog;
}
export function buildScaffold(blueprint) {
  const validation = validateBlueprint(blueprint);
  if (!validation.valid)
    throw new Error(
      "Blueprint cannot be generated: " +
        [...validation.errors, ...validation.unresolved].join(" "),
    );
  const catalog = verifyCreationRelease(),
    sources = profileFiles(),
    files = {};
  for (const [name, bytes] of Object.entries(sources))
    files["vendor/foundation/" + name] = bytes;
  files["vendor/foundation/foundation.json"] = Buffer.from(
    JSON.stringify(
      {
        package: "@yrp/app-foundation",
        version: catalog.foundationVersion,
        profile: profile.id,
        files: Object.fromEntries(
          Object.entries(sources)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, bytes]) => [name, sha(bytes)]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  const substitutions = {
    __PRODUCT_ID__: JSON.stringify(blueprint.product.id),
    __PRODUCT_NAME__: JSON.stringify(blueprint.product.name),
  };
  for (const [name, bytes] of Object.entries(sources))
    if (name.startsWith("creation/template/")) {
      const target = name.slice("creation/template/".length);
      if (target === "package-lock.json") continue;
      let content = bytes.toString("utf8");
      for (const [token, value] of Object.entries(substitutions))
        content = content.split(token).join(value);
      files[target] = Buffer.from(content);
    }
  files["app-blueprint.json"] = Buffer.from(
    JSON.stringify(blueprint, null, 2) + "\n",
  );
  files["src/theme.css"] = Buffer.from(appThemeCSS(blueprint.theme) + "\n");
  const pkg = {
    name: blueprint.product.id,
    version: "0.1.0",
    private: true,
    type: "module",
    engines: { node: ">=24" },
    scripts: {
      dev: "vite --host 127.0.0.1",
      build: "tsc --noEmit && vite build",
      start: "node server/index.ts",
      "db:migrate": "node scripts/migrate.ts",
      test: "node --test tests/contracts.test.ts",
      "test:browser": "playwright test",
      workbench: "node vendor/foundation/creation/cli.js",
    },
    dependencies: { ...catalog.dependencies },
    devDependencies: {
      "@types/node": "24.13.4",
      "@types/react": "19.3.0",
      "@types/react-dom": "19.2.3",
      "@vitejs/plugin-react": "4.7.0",
      "@playwright/test": "1.63.0",
      typescript: "5.9.3",
      vite: "6.4.3",
    },
  };
  files["package.json"] = Buffer.from(JSON.stringify(pkg, null, 2) + "\n");
  const lock = JSON.parse(sources["creation/template/package-lock.json"]);
  lock.name = pkg.name;
  lock.version = pkg.version;
  lock.packages[""].name = pkg.name;
  lock.packages[""].version = pkg.version;
  files["package-lock.json"] = Buffer.from(
    JSON.stringify(lock, null, 2) + "\n",
  );
  files["README.md"] = Buffer.from(
    "# " +
      blueprint.product.name +
      "\n\nAn independent Foundation app generated from a reviewed Workbench blueprint. The initial domain adapter is an account-owned review desk; replace its domain code for your product. It is not a finished implementation of an arbitrary brief.\n\nRun `npm ci`, `npm run db:migrate`, `npm test`, and `BASE_PATH=/pilot/ npm run build`. Runtime requires the same BASE_PATH. Run `npm run test:browser` for isolated synthetic A/B flows. Production requires the existing verified Google gateway and a private per-app APP_AUTH_PROXY_SECRET; no development identity fallback is installed.\n\nAgent entry: `npm run workbench -- catalog`, `npm run workbench -- inspect --recipe change-review`, `npm run workbench -- validate --blueprint app-blueprint.json`. Managed sources are in vendor/foundation; product domain and layout stay app-owned.\n\nFoundation " +
      catalog.foundationVersion +
      "; catalog " +
      catalog.sourceDigest +
      ". Local DM Sans retains its OFL notice. Source and selected Foundation profile are MIT.\n",
  );
  files["AGENTS.md"] = Buffer.from(
    "# " +
      blueprint.product.name +
      "\n\nRead README.md and RUNBOOK.md. This is an independent React/TypeScript/Vite and Node 24 app. Use the installed Workbench CLI to inspect compatible recipe contracts before creating controls. Human and agent actions share ReviewStore handlers. Keep immutable verified Google account identity, account-owned queries/jobs/settings, revision checks, idempotency and explicit review. Admin status grants no foreign ownership.\n\nChange app domain code and callbacks, not vendor/foundation. Use canonical Foundation releases and reviewed receipt updates for shared changes. Inspect app-blueprint.json and the selected recipe contract on demand; do not dump the entire catalog into each prompt. Missing adapters must be implemented explicitly.\n\nRun npm test, npm run build, and npm run test:browser. QA uses fresh synthetic stores/keys and yorphos@gmail.com as the only human test identity; never production sessions/data. Native loops, paid effects, publication and deployment require their app-owned authorization.\n",
  );
  files["RUNBOOK.md"] = Buffer.from(
    "# Operations\n\nUse Node 24. HOST is loopback; PORT defaults to 4199; BASE_PATH is set at build and runtime; PUBLIC_URL identifies the deployed origin; DATA_DIR owns workspace.sqlite. Production private API requires the controller Google gate and a per-app proxy credential outside the checkout.\n\nRun db:migrate explicitly before startup. Schema 1 creates account-owned records, operation receipts and settings. Back up the complete DATA_DIR while writers are stopped before schema changes. Never run migrations in UI tests against production. Restore matching data with a compatible source release. Health /healthz is read-only JSON. No provider connections, paid jobs or outbound messaging are configured by this scaffold.\n\nUse the existing controller prepare → verify → apply → actual URL workflow when enrolling an authorized app. deployment.json is a contract proposal, not installed host configuration. Browser fixtures are isolated synthetic identities and cannot prove real Google consent.\n",
  );
  files["RUNNER.toml"] = Buffer.from(
    'version = 1\nnotes = "Independent Node 24 app. Runtime requires a verified Google gateway and explicit migration."\n\n[setup]\ncommands = [["npm", "ci"]]\n\n[validation]\nfocused = [["npm", "run", "build"]]\ncanonical = [["npm", "test"], ["npm", "run", "build"]]\noptional = [["npm", "run", "test:browser"]]\n\n[runtime]\nprofile = "node"\nstart = ["npm", "start"]\nport_env = "PORT"\ndata_dir_env = "DATA_DIR"\nhealth_path = "/healthz"\n',
  );
  files["deployment.json"] = Buffer.from(
    JSON.stringify(
      {
        id: blueprint.product.id,
        display_name: blueprint.product.name,
        category: "Work",
        runtime: "process",
        host: "127.0.0.1",
        path: "/" + blueprint.product.id + "/",
        port: 4199,
        health: "/healthz",
        data: "DATA_DIR",
        prepare: [
          ["npm", "ci"],
          ["npm", "run", "db:migrate"],
          ["npm", "run", "build"],
        ],
        command: ["node", "server/index.ts"],
        access: "google",
        private_routes: ["/api/"],
        streaming: false,
        uploads: false,
        repository: "Set the independent repository before enrollment.",
      },
      null,
      2,
    ) + "\n",
  );
  files["LICENSE"] = sources.LICENSE;
  return files;
}
export function planScaffold(blueprint) {
  const files = buildScaffold(blueprint);
  return {
    schemaVersion: 1,
    product: blueprint.product.id,
    foundation: blueprint.foundation,
    domainAdapter: blueprint.domain.adapter,
    files: Object.entries(files)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, bytes]) => ({
        path,
        bytes: bytes.length,
        sha256: sha(bytes),
      })),
    domainActions: ["create", "propose", "accept", "discard", "settings"],
    unresolved: [],
  };
}
export function writeScaffold(blueprint, target) {
  target = resolve(target);
  if (
    existsSync(target) &&
    (lstatSync(target).isSymbolicLink() || readdirSync(target).length)
  )
    throw new Error("Scaffold target must be an empty, ordinary directory.");
  const files = buildScaffold(blueprint);
  mkdirSync(target, { recursive: true });
  for (const [path, bytes] of Object.entries(files)) {
    const destination = join(target, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, bytes, { flag: "wx" });
  }
  return { ...planScaffold(blueprint), target: realpathSync(target) };
}
export function planAdoption(target) {
  target = resolve(target);
  const root = join(target, "vendor/foundation");
  if (lstatSync(root).isSymbolicLink())
    throw new Error("Managed bundle must be an ordinary directory.");
  const raw = readFileSync(join(root, "foundation.json"), "utf8");
  if (raw.length > 256 * 1024) throw new Error("Oversized release receipt.");
  const receipt = JSON.parse(raw);
  if (
    receipt.profile !== profile.id ||
    !receipt.files ||
    typeof receipt.files !== "object"
  )
    throw new Error("An explicit profile migration is required.");
  const sources = profileFiles(),
    changed = [];
  for (const [name, checksum] of Object.entries(receipt.files)) {
    if (
      !/^[A-Za-z0-9_.\/-]+$/.test(name) ||
      name.startsWith("/") ||
      name.split("/").some((p) => p === ".." || p === ".") ||
      typeof checksum !== "string" ||
      !/^[a-f0-9]{64}$/.test(checksum)
    )
      throw new Error("Invalid release receipt.");
    const path = join(root, name);
    if (
      !existsSync(path) ||
      lstatSync(path).isSymbolicLink() ||
      !realpathSync(path).startsWith(realpathSync(root) + "/") ||
      sha(readFileSync(path)) !== checksum
    )
      throw new Error("Managed bundle was edited: " + name);
  }
  for (const [name, bytes] of Object.entries(sources)) {
    const path = join(root, name);
    let parent = dirname(path);
    while (parent !== root) {
      if (existsSync(parent) && lstatSync(parent).isSymbolicLink())
        throw new Error("Managed path contains a symlink.");
      parent = dirname(parent);
    }
    if (existsSync(path) && !Object.hasOwn(receipt.files, name))
      throw new Error("Unmanaged file would be overwritten: " + name);
    if (receipt.files[name] !== sha(bytes))
      changed.push({
        path: "vendor/foundation/" + name,
        sha256: sha(bytes),
        bytes: bytes.length,
      });
  }
  const removed = Object.keys(receipt.files).filter(
      (name) => !Object.hasOwn(sources, name),
    ),
    pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf8")),
    dependencyChanges = Object.entries(getCatalog().dependencies)
      .filter(([name, version]) => pkg.dependencies?.[name] !== version)
      .map(([name, version]) => ({
        name,
        from: pkg.dependencies?.[name] || null,
        to: version,
      }));
  const plan = {
    target,
    from: receipt.version,
    to: getCatalog().foundationVersion,
    changes: changed,
    removed,
    dependencyChanges,
    domainFilesChanged: [],
    requiresBlueprintReview: true,
  };
  return { ...plan, planDigest: sha(JSON.stringify(plan)) };
}
export function adoptScaffoldRelease(target, expectedPlanDigest) {
  const plan = planAdoption(target);
  if (!expectedPlanDigest || plan.planDigest !== expectedPlanDigest)
    throw new Error("Review the exact adoption plan before applying it.");
  if (plan.dependencyChanges.length)
    throw new Error(
      "Review dependency migration before adopting this release.",
    );
  const root = join(resolve(target), "vendor/foundation"),
    sources = profileFiles();
  for (const name of plan.removed) unlinkSync(join(root, name));
  for (const [name, bytes] of Object.entries(sources)) {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
  writeFileSync(
    join(root, "foundation.json"),
    JSON.stringify(
      {
        package: "@yrp/app-foundation",
        version: getCatalog().foundationVersion,
        profile: profile.id,
        files: Object.fromEntries(
          Object.entries(sources)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, bytes]) => [name, sha(bytes)]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  return { ...plan, applied: true, blueprintChanged: false };
}
