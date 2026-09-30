import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import manifest from "../capabilities.json" with { type: "json" };
import { serviceIdentity } from "../vendor/professional/server/identity.js";
import {
  verifyDelegation,
  validateInput,
  inputDigest,
} from "../vendor/professional/server/agent-access.js";
import {
  Problem,
  requireThat,
} from "../vendor/professional/server/workspaces.js";
import { validateBlueprint } from "../vendor/professional/creation/blueprint.js";
import { seed } from "../shared/recipes.js";
export const capabilities = manifest.capabilities;
export function migrateAgent(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS workbench_schema(id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL)",
  );
  const version =
    db.prepare("SELECT version FROM workbench_schema WHERE id=1").get()
      ?.version || 0;
  requireThat(
    [0, 1].includes(version),
    500,
    "Unsupported Workbench agent schema.",
  );
  if (version === 0)
    db.exec(
      "BEGIN;CREATE TABLE IF NOT EXISTS workbench_operations(account TEXT NOT NULL,id TEXT NOT NULL,workspace TEXT NOT NULL,issuer TEXT NOT NULL,client TEXT NOT NULL,capability TEXT NOT NULL,digest TEXT NOT NULL,status TEXT NOT NULL,result TEXT,PRIMARY KEY(account,id));INSERT INTO workbench_schema VALUES(1,1);COMMIT;",
    );
}
const result = (status, data, operationId) => ({
  ...(operationId ? { operationId } : {}),
  status,
  resultJson: JSON.stringify(data),
});
export function agentRouteFor(config, { env = process.env } = {}) {
  return async ({
    req,
    res,
    path,
    method,
    url,
    store,
    renders,
    json,
    normalize,
  }) => {
    const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
      req.socket.remoteAddress,
    );
    requireThat(loopback, 403, "Agent entry requires the local gateway.");
    const capability = capabilities.find(
      (c) => c.transport.path === path && c.transport.method === method,
    );
    requireThat(capability, 404, "Tool unavailable.");
    const service = serviceIdentity(req.headers, {
      service: "workbench",
      method,
      path,
      scope: [capability.auth.scope],
      allow: capability.auth.allowedCallers,
      trust: (() => {
        try {
          return JSON.parse(env.ECOSYSTEM_TRUST_KEYS || "{}");
        } catch {
          return {};
        }
      })(),
    });
    requireThat(service, 401, "Service identity required.");
    let input;
    if (method === "GET") {
      input = Object.fromEntries(url.searchParams);
      if ("offset" in input && /^\d+$/.test(input.offset))
        input.offset = Number(input.offset);
    } else {
      requireThat(
        /^application\/json(?:;|$)/i.test(req.headers["content-type"] || ""),
        415,
        "Use JSON.",
      );
      let bytes = 0,
        chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        requireThat(bytes <= 256 * 1024, 413, "Tool input too large.");
        chunks.push(chunk);
      }
      try {
        input = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        throw new Problem(400, "Invalid tool JSON.");
      }
    }
    validateInput(capability.agent.inputSchema, input);
    requireThat(
      store.db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type='table' AND name='workbench_operations'",
        )
        .get(),
      503,
      "Run the explicit Workbench agent migration.",
    );
    const authority = () =>
      verifyDelegation(
        req.headers,
        {
          callerService: service.service,
          audience: "workbench",
          capability,
          method,
          path,
          input,
        },
        env,
      );
    const grant = authority();
    const resolveOwner = (owner) => {
      try {
        const path = env.WORKBENCH_AGENT_ACCOUNTS_FILE;
        requireThat(
          path && statSync(path).isFile() && statSync(path).size <= 65536,
          403,
          "Owner binding required.",
        );
        const bindings = JSON.parse(readFileSync(path, "utf8"));
        requireThat(
          bindings.schemaVersion === 1 &&
            bindings.owners &&
            Object.hasOwn(bindings.owners, owner) &&
            /^[a-f0-9]{64}$/.test(bindings.owners[owner]),
          403,
          "Owner binding required.",
        );
        return bindings.owners[owner];
      } catch {
        throw new Problem(403, "Install a verified owner account binding.");
      }
    };
    const accountId = resolveOwner(grant.owner);
    const a = store.db
      .prepare("SELECT * FROM accounts WHERE id=?")
      .get(accountId);
    requireThat(
      a && a.issuer === "https://accounts.google.com",
      403,
      "Verified owner account required.",
    );
    const dispatchAuthority = () => {
      const g = authority();
      requireThat(
        resolveOwner(g.owner) === a.id,
        403,
        "Owner binding changed before dispatch.",
      );
      return g;
    };
    store.edit(a, input.workspace);
    const scopedProject = (id) => {
      const p = store.project(a, id, true);
      requireThat(p.workspace === input.workspace, 404, "Project unavailable.");
      return p;
    };
    const journal = () =>
      store.db
        .prepare(
          "SELECT * FROM workbench_operations WHERE account=? AND id=? AND workspace=?",
        )
        .get(a.id, input.operationId, input.workspace);
    if (capability.id === "workbench:operations.status") {
      const entry = journal();
      requireThat(
        entry &&
          entry.issuer === service.service &&
          entry.client === grant.client,
        404,
        "Operation unavailable.",
      );
      const data = entry.result
        ? JSON.parse(entry.result)
        : {
            recovery:
              "Outcome unavailable. Review retained state before a new operation.",
          };
      if (data.job) data.job = renders.get(a, data.job.id);
      if (data.project) scopedProject(data.project.id);
      return json(
        res,
        result(
          entry.status === "completed" && data.job
            ? data.job.status === "ready"
              ? "completed"
              : data.job.status
            : entry.status,
          data,
          input.operationId,
        ),
      );
    }
    if (capability.id === "workbench:projects.inspect") {
      const p = scopedProject(input.project);
      return json(
        res,
        result("completed", {
          project: p,
          validation: validateBlueprint(p.data.blueprint),
        }),
      );
    }
    if (capability.id === "workbench:artifacts.read") {
      const f = store.db
        .prepare(
          "SELECT id,project,mime,name,bytes FROM files WHERE id=? AND account=? AND workspace=?",
        )
        .get(input.file, a.id, input.workspace);
      requireThat(f, 404, "Artifact unavailable.");
      scopedProject(f.project);
      requireThat(
        ["application/json", "text/plain", "text/css", "text/html"].includes(
          f.mime,
        ),
        422,
        "Binary archives stay in the authenticated download flow; use the CLI for app creation.",
      );
      const bytes = Buffer.from(f.bytes),
        chunk = bytes.subarray(input.offset, input.offset + 48000);
      return json(
        res,
        result("completed", {
          id: f.id,
          name: f.name,
          mime: f.mime,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          bytes: bytes.length,
          offset: input.offset,
          nextOffset: input.offset + chunk.length,
          encoding: "base64",
          content: chunk.toString("base64"),
        }),
      );
    }
    const prior = journal(),
      digest = inputDigest(input);
    if (prior) {
      requireThat(
        prior.issuer === service.service &&
          prior.client === grant.client &&
          prior.capability === capability.id &&
          prior.digest === digest,
        409,
        "Operation identity conflicts.",
      );
      return json(
        res,
        result(
          prior.status,
          prior.result
            ? JSON.parse(prior.result)
            : { recovery: "Do not replay an uncertain operation." },
          input.operationId,
        ),
      );
    }
    let p, blueprint;
    if (input.project) {
      p = scopedProject(input.project);
      requireThat(
        p.revision === input.revision,
        409,
        "Review the current project revision.",
      );
    }
    if (input.blueprintJson) {
      try {
        blueprint = JSON.parse(input.blueprintJson);
      } catch {
        throw new Problem(400, "Invalid blueprint JSON.");
      }
      const report = validateBlueprint(blueprint);
      requireThat(
        report.valid,
        422,
        [...report.errors, ...report.unresolved].join(" "),
      );
    }
    // Pure preparation precedes the transaction; grant and source state are checked again at dispatch.
    let output;
    if (input.format) output = await config.export(p, input.format);
    const createEntry = () =>
      store.db
        .prepare(
          "INSERT INTO workbench_operations VALUES(?,?,?,?,?,?,?,'claimed',NULL)",
        )
        .run(
          a.id,
          input.operationId,
          input.workspace,
          service.service,
          grant.client,
          capability.id,
          digest,
        );
    const complete = (data) => {
      store.db
        .prepare(
          "UPDATE workbench_operations SET status='completed',result=? WHERE account=? AND id=?",
        )
        .run(JSON.stringify(data), a.id, input.operationId);
      return data;
    };
    let data;
    if (capability.id === "workbench:jobs.cancel") {
      const j = renders.get(a, input.job);
      const owned = store.db
        .prepare("SELECT workspace FROM jobs WHERE id=? AND account=?")
        .get(j.id, a.id);
      requireThat(
        owned?.workspace === input.workspace,
        404,
        "Job unavailable.",
      );
      dispatchAuthority();
      store.transaction(createEntry);
      try {
        const job = await renders.cancel(a, j.id);
        data = complete({ job });
      } catch (e) {
        store.db
          .prepare(
            "UPDATE workbench_operations SET status='uncertain' WHERE account=? AND id=?",
          )
          .run(a.id, input.operationId);
        throw e;
      }
    } else
      data = store.transaction(() => {
        dispatchAuthority();
        store.edit(a, input.workspace);
        if (p) {
          const latest = scopedProject(p.id);
          requireThat(
            latest.revision === input.revision,
            409,
            "Project changed before dispatch.",
          );
        }
        createEntry();
        let data;
        if (capability.id === "workbench:projects.create")
          data = {
            project: store.create(
              a,
              input.workspace,
              normalize({
                ...seed(blueprint.product.name),
                blueprint,
                theme: blueprint.theme,
              }),
            ),
          };
        else if (capability.id === "workbench:projects.update")
          data = {
            project: store.update(
              a,
              p.id,
              input.revision,
              normalize({ ...p.data, blueprint, theme: blueprint.theme }),
            ),
          };
        else if (["png", "pdf"].includes(input.format))
          data = {
            job: renders.add(a, p, input.format, output.body, output.name),
            sourceRevision: p.revision,
            foundation: blueprint?.foundation || p.data.blueprint.foundation,
          };
        else {
          requireThat(output?.body, 422, "Export unavailable.");
          const bytes = Buffer.from(output.body);
          requireThat(
            bytes.length <= 20 * 1024 * 1024,
            413,
            "Artifact exceeds the file bound.",
          );
          const file = store.file(a, p, output.name, output.mime, bytes);
          data = {
            artifact: {
              id: file.id,
              bytes: bytes.length,
              sha256: createHash("sha256").update(bytes).digest("hex"),
              mime: output.mime,
              name: output.name,
              downloadPath: "/api/files/" + file.id,
            },
            sourceRevision: p.revision,
            foundation: p.data.blueprint.foundation,
          };
        }
        return complete(data);
      });
    return json(res, result("completed", data, input.operationId));
  };
}
