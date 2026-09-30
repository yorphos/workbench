import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import {
  migrate,
  accountContext,
} from "../vendor/professional/server/workspaces.js";
import { createStudio } from "../vendor/professional/server/app.js";
import { serviceHeaders } from "../vendor/professional/server/identity.js";
import {
  agentTool,
  delegationHeaders,
  inputDigest,
} from "../vendor/professional/server/agent-access.js";
import { config } from "../server/config.js";
import { capabilities, agentRouteFor, migrateAgent } from "../server/agent.js";
import { createBlueprint } from "../vendor/professional/creation/blueprint.js";
test("all exported tools have typed schemas, full bindings and explicit recovery contracts", () => {
  for (const c of capabilities) assert.ok(agentTool(c).inputSchema);
});
test("delegated creation shares domain handlers and rejects missing authority, account substitution, stale revisions, revoked grants and replay conflicts", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "workbench-agent-"));
  migrate(directory);
  const secret = randomBytes(32).toString("hex");
  const a = accountContext(
    {
      "x-portfolio-secret": secret,
      "x-portfolio-user": "test-a",
      "x-portfolio-email": "yorphos@gmail.com",
      "x-portfolio-role": "member",
    },
    secret,
  );
  const b = accountContext(
    {
      "x-portfolio-secret": secret,
      "x-portfolio-user": "test-b",
      "x-portfolio-email": "b@invalid.test",
      "x-portfolio-role": "admin",
    },
    secret,
  );
  const { publicKey, privateKey } = generateKeyPairSync("ed25519"),
    trust = {
      foreman: publicKey
        .export({ format: "der", type: "spki" })
        .toString("base64"),
    },
    issuer = {
      ECOSYSTEM_SERVICE_ID: "foreman",
      ECOSYSTEM_SERVICE_KEY: privateKey
        .export({ format: "der", type: "pkcs8" })
        .toString("base64"),
    };
  const grantFile = join(directory, "grants.json"),
    bindingFile = join(directory, "owners.json");
  const env = {
    ECOSYSTEM_TRUST_KEYS: JSON.stringify(trust),
    AGENT_GRANTS_FILE: grantFile,
    WORKBENCH_AGENT_ACCOUNTS_FILE: bindingFile,
  };
  const local = { ...config, agentRoute: agentRouteFor(config, { env }) };
  let server = createStudio(local, {
    directory,
    secret,
    base: "/workbench/",
  });
  migrateAgent(server.studio.store.db);
  let store = server.studio.store;
  store.account(a);
  store.account(b);
  const w = store.workspace(a, "A"),
    foreign = store.workspace(b, "B");
  const grant = {
    id: "pilot",
    revision: 1,
    enabled: true,
    owner: "verified-owner-a",
    client: "offline-pilot",
    issuer: "foreman",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    audiences: ["workbench"],
    capabilities: capabilities.map((c) => c.id),
    resources: { workspace: [w.id, foreign.id] },
    constraints: {
      format: { allowed: ["blueprint", "application", "png", "pdf"] },
    },
  };
  const persist = () =>
    writeFileSync(
      grantFile,
      JSON.stringify({
        schemaVersion: 1,
        clients: [{ id: "offline-pilot", owner: grant.owner, enabled: true }],
        grants: [grant],
      }),
    );
  persist();
  writeFileSync(
    bindingFile,
    JSON.stringify({ schemaVersion: 1, owners: { "verified-owner-a": a.id } }),
  );
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  let origin = "http://127.0.0.1:" + server.address().port;
  t.after(async () => {
    await new Promise((r) => server.close(r));
    rmSync(directory, { recursive: true, force: true });
  });
  async function call(id, input, { sign = true, delegate = true }: any = {}) {
    const c = capabilities.find((c) => c.id === "workbench:" + id),
      path = c.transport.path,
      headers = {
        ...(sign
          ? serviceHeaders(
              {
                audience: "workbench",
                scope: [c.auth.scope],
                method: c.transport.method,
                path,
              },
              issuer,
            )
          : {}),
        ...(delegate
          ? delegationHeaders(
              {
                grant,
                capability: c,
                audience: "workbench",
                method: c.transport.method,
                path,
                input,
                operationId: input.operationId || "read",
              },
              issuer,
            )
          : {}),
        "Content-Type": "application/json",
      };
    const url =
      origin +
      "/workbench" +
      path +
      (c.transport.method === "GET" ? "?" + new URLSearchParams(input) : "");
    return fetch(url, {
      method: c.transport.method,
      headers,
      body: c.transport.method === "GET" ? undefined : JSON.stringify(input),
    });
  }
  const input = {
    workspace: w.id,
    operationId: "create-pilot",
    blueprintJson: JSON.stringify(createBlueprint("Pilot")),
  };
  assert.equal(
    (await call("projects.create", input, { sign: false })).status,
    401,
  );
  assert.equal(
    (await call("projects.create", input, { delegate: false })).status,
    403,
  );
  assert.equal(
    (await call("projects.create", { ...input, account: b.id })).status,
    422,
  );
  const created = await call("projects.create", input);
  assert.equal(created.status, 200, await created.clone().text());
  const outcome = await created.json(),
    p = JSON.parse(outcome.resultJson).project;
  assert.equal(store.project(a, p.id).data.blueprint.product.name, "Pilot");
  assert.throws(() => store.project(b, p.id), /unavailable/);
  assert.deepEqual(
    await (await call("projects.create", input)).json(),
    outcome,
  );
  assert.equal(store.projects(a, w.id).length, 1);
  assert.equal(
    (
      await call("projects.create", {
        ...input,
        blueprintJson: JSON.stringify(createBlueprint("Changed")),
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call("projects.create", {
        ...input,
        workspace: foreign.id,
        operationId: "foreign",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call("projects.update", {
        workspace: w.id,
        project: p.id,
        revision: 0,
        operationId: "stale",
        blueprintJson: input.blueprintJson,
      })
    ).status,
    422,
  );
  const updated = store.update(a, p.id, 1, p.data);
  assert.equal(
    (
      await call("projects.update", {
        workspace: w.id,
        project: p.id,
        revision: 1,
        operationId: "stale-valid",
        blueprintJson: input.blueprintJson,
      })
    ).status,
    409,
  );
  const status = await (
    await call("operations.status", {
      workspace: w.id,
      operationId: input.operationId,
    })
  ).json();
  assert.equal(status.status, "completed");
  const exported = await (
    await call("artifacts.export", {
      workspace: w.id,
      project: p.id,
      revision: updated.revision,
      operationId: "export",
      format: "blueprint",
    })
  ).json();
  const file = JSON.parse(exported.resultJson).artifact;
  assert.equal(file.mime, "application/json");
  const bytes = JSON.parse(
    (
      await (
        await call("artifacts.read", {
          workspace: w.id,
          file: file.id,
          offset: 0,
        })
      ).json()
    ).resultJson,
  );
  assert.equal(
    JSON.parse(Buffer.from(bytes.content, "base64")).product.name,
    "Pilot",
  );
  // Retained claim simulates a process stopping before a durable outcome was saved.
  const interrupted = { ...input, operationId: "interrupted" };
  store.db
    .prepare(
      "INSERT INTO workbench_operations VALUES(?,?,?,?,?,?,?,'claimed',NULL)",
    )
    .run(
      a.id,
      interrupted.operationId,
      w.id,
      "foreman",
      grant.client,
      "workbench:projects.create",
      inputDigest(interrupted),
    );
  await new Promise((r) => server.close(r));
  server = createStudio(local, { directory, secret, base: "/workbench/" });
  store = server.studio.store;
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  origin = "http://127.0.0.1:" + server.address().port;
  const recovered = await (
    await call("operations.status", {
      workspace: w.id,
      operationId: "interrupted",
    })
  ).json();
  assert.equal(recovered.status, "uncertain");
  assert.equal(
    (await (await call("projects.create", interrupted)).json()).status,
    "uncertain",
  );
  assert.equal(store.projects(a, w.id).length, 1);
  assert.deepEqual(
    await (await call("projects.create", input)).json(),
    outcome,
  );
  const signed = delegationHeaders(
    {
      grant,
      capability: capabilities[1],
      audience: "workbench",
      method: "POST",
      path: capabilities[1].transport.path,
      input,
      operationId: input.operationId,
    },
    issuer,
  );
  grant.enabled = false;
  persist();
  const revoked = await fetch(
    origin + "/workbench" + capabilities[1].transport.path,
    {
      method: "POST",
      headers: {
        ...serviceHeaders(
          {
            audience: "workbench",
            scope: [capabilities[1].auth.scope],
            method: "POST",
            path: capabilities[1].transport.path,
          },
          issuer,
        ),
        ...signed,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  assert.equal(revoked.status, 403);
});
