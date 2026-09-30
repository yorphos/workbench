import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { resolve, join, extname } from "node:path";
export class AppProblem extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const demand = (ok, status, message) => {
  if (!ok) throw new AppProblem(status, message);
};
const bounded = (v, max) => {
  demand(typeof v === "string" && v.length <= max, 400, "Invalid text.");
  return v;
};
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function verifiedAccount(identity) {
  demand(
    identity && typeof identity.subject === "string" && identity.subject,
    401,
    "Verified account required.",
  );
  return {
    ...identity,
    issuer: "https://accounts.google.com",
    id: createHash("sha256")
      .update("https://accounts.google.com\0" + identity.subject)
      .digest("hex"),
  };
}
export function migrateReview(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, "workspace.sqlite"),
    db = new DatabaseSync(path);
  try {
    const version = db.prepare("PRAGMA user_version").get().user_version;
    demand(
      version === 0 || version === 1,
      500,
      "Unsupported workspace schema.",
    );
    if (version === 0)
      db.exec(
        "BEGIN;CREATE TABLE records(id TEXT PRIMARY KEY,account TEXT NOT NULL,revision INTEGER NOT NULL,name TEXT NOT NULL,details TEXT NOT NULL,proposal TEXT,status TEXT NOT NULL,updated TEXT NOT NULL);CREATE INDEX records_account ON records(account);CREATE TABLE operations(account TEXT NOT NULL,id TEXT NOT NULL,digest TEXT NOT NULL,result TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(account,id));CREATE TABLE settings(account TEXT PRIMARY KEY,revision INTEGER NOT NULL,name TEXT NOT NULL,details TEXT NOT NULL);PRAGMA user_version=1;COMMIT;",
      );
  } finally {
    db.close();
  }
  chmodSync(path, 0o600);
}
export class ReviewStore {
  constructor(directory) {
    this.db = new DatabaseSync(join(directory, "workspace.sqlite"));
    this.db.exec("PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;");
    demand(
      this.db.prepare("PRAGMA user_version").get().user_version === 1,
      500,
      "Run the explicit database migration first.",
    );
  }
  actor(a) {
    demand(a && /^[a-f0-9]{64}$/.test(a.id), 401, "Verified account required.");
  }
  unpack(r) {
    return r
      ? { ...r, proposal: r.proposal ? JSON.parse(r.proposal) : null }
      : null;
  }
  list(a) {
    this.actor(a);
    return this.db
      .prepare(
        "SELECT * FROM records WHERE account=? ORDER BY updated DESC LIMIT 100",
      )
      .all(a.id)
      .map((r) => this.unpack(r));
  }
  get(a, id) {
    this.actor(a);
    const r = this.db
      .prepare("SELECT * FROM records WHERE account=? AND id=?")
      .get(a.id, id);
    demand(r, 404, "Item unavailable.");
    return this.unpack(r);
  }
  preferences(a) {
    this.actor(a);
    return (
      this.db
        .prepare("SELECT revision,name,details FROM settings WHERE account=?")
        .get(a.id) || { revision: 0, name: "", details: "" }
    );
  }
  receipts(a) {
    this.actor(a);
    return this.db
      .prepare(
        "SELECT result FROM operations WHERE account=? ORDER BY created DESC LIMIT 20",
      )
      .all(a.id)
      .map((r) => JSON.parse(r.result).receipt);
  }
  apply(a, action, input) {
    this.actor(a);
    const fields = {
      create: ["operationId", "name", "details"],
      propose: ["operationId", "id", "revision", "name", "details"],
      accept: ["operationId", "id", "revision"],
      discard: ["operationId", "id", "revision"],
      settings: ["operationId", "revision", "name", "details"],
    }[action];
    demand(
      input &&
        typeof input === "object" &&
        !Array.isArray(input) &&
        fields &&
        Object.keys(input).every((key) => fields.includes(key)),
      400,
      "Unsupported action fields.",
    );
    const operationId = bounded(input.operationId, 128);
    demand(
      /^[A-Za-z0-9_-]{1,128}$/.test(operationId),
      400,
      "Operation identity required.",
    );
    const binding = digest({ action, input }),
      prior = this.db
        .prepare("SELECT * FROM operations WHERE account=? AND id=?")
        .get(a.id, operationId);
    if (prior) {
      demand(
        prior.digest === binding,
        409,
        "Operation identity conflicts with different input.",
      );
      return JSON.parse(prior.result);
    }
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const now = new Date().toISOString();
      let record = null,
        revision;
      if (action === "create") {
        const name = bounded(input.name, 120).trim(),
          details = bounded(input.details || "", 4000);
        demand(name, 400, "Name the item.");
        const id = randomUUID();
        this.db
          .prepare("INSERT INTO records VALUES(?,?,1,?,?,NULL,'draft',?)")
          .run(id, a.id, name, details, now);
        record = this.get(a, id);
        revision = 1;
      } else if (action === "settings") {
        const old = this.preferences(a);
        demand(
          input.revision === old.revision,
          409,
          "Settings changed. Reload before saving.",
        );
        const name = bounded(input.name, 120),
          details = bounded(input.details || "", 4000);
        revision = old.revision + 1;
        this.db
          .prepare(
            "INSERT INTO settings VALUES(?,?,?,?) ON CONFLICT(account) DO UPDATE SET revision=excluded.revision,name=excluded.name,details=excluded.details",
          )
          .run(a.id, revision, name, details);
      } else {
        const old = this.get(a, bounded(input.id, 100));
        demand(
          input.revision === old.revision,
          409,
          "The item changed. Reload its revision.",
        );
        revision = old.revision + 1;
        if (action === "propose") {
          const name = bounded(input.name, 120).trim(),
            details = bounded(input.details || "", 4000);
          demand(name, 400, "Name the proposed item.");
          const proposal = {
            name,
            details,
            sourceRevision: old.revision,
            digest: digest({ name, details }),
          };
          this.db
            .prepare(
              "UPDATE records SET proposal=?,status='in_review',revision=?,updated=? WHERE account=? AND id=?",
            )
            .run(JSON.stringify(proposal), revision, now, a.id, old.id);
        } else if (action === "accept" || action === "discard") {
          demand(
            old.status === "in_review" && old.proposal,
            409,
            "There is no current proposal to review.",
          );
          if (action === "accept")
            this.db
              .prepare(
                "UPDATE records SET name=?,details=?,proposal=NULL,status='accepted',revision=?,updated=? WHERE account=? AND id=?",
              )
              .run(
                old.proposal.name,
                old.proposal.details,
                revision,
                now,
                a.id,
                old.id,
              );
          else
            this.db
              .prepare(
                "UPDATE records SET proposal=NULL,status='draft',revision=?,updated=? WHERE account=? AND id=?",
              )
              .run(revision, now, a.id, old.id);
        } else throw new AppProblem(400, "Unsupported action.");
        record = this.get(a, old.id);
      }
      const result = {
        record,
        receipt: {
          operationId,
          outcome:
            action === "accept"
              ? "Reviewed changes applied"
              : action === "discard"
                ? "Original retained"
                : action === "propose"
                  ? "Proposal saved for review"
                  : "Changes saved",
          revision,
          evidence: record
            ? digest({
                id: record.id,
                revision: record.revision,
                name: record.name,
                details: record.details,
                proposal: record.proposal,
              })
            : binding,
          delivery: "No external delivery",
          created: now,
          status: "completed",
        },
      };
      this.db
        .prepare("INSERT INTO operations VALUES(?,?,?,?,?)")
        .run(a.id, operationId, binding, JSON.stringify(result), now);
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
const mime = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".html": "text/html",
};
export function createReviewServer({
  directory,
  base = "/",
  secret,
  identity,
  dist,
  publicURL = "",
  service = "review-desk",
}) {
  demand(
    typeof identity === "function",
    500,
    "Supply the trusted identity adapter.",
  );
  const store = new ReviewStore(directory);
  base =
    "/" + base.split("/").filter(Boolean).join("/") + (base === "/" ? "" : "/");
  const server = createServer(async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost"),
        path =
          base !== "/" && url.pathname.startsWith(base)
            ? "/" + url.pathname.slice(base.length)
            : url.pathname;
      if (path === "/healthz" && ["GET", "HEAD"].includes(req.method))
        return json(200, { ok: true, service });
      if (path.startsWith("/api/")) {
        const verified = identity(req.headers, secret);
        demand(verified, 401, "Sign in through the Google gateway.");
        const a = verifiedAccount(verified);
        if (req.method === "GET") {
          if (path === "/api/session")
            return json(200, {
              account: { id: a.id, email: a.email },
              records: store.list(a),
              settings: store.preferences(a),
              receipts: store.receipts(a),
            });
          if (path.startsWith("/api/records/"))
            return json(200, store.get(a, decodeURIComponent(path.slice(13))));
          throw new AppProblem(404, "Route unavailable.");
        }
        demand(req.method === "POST", 405, "Use POST for an action.");
        demand(
          req.headers["x-app-account"] === a.id,
          409,
          "Account changed. Refresh before acting.",
        );
        demand(
          req.headers["x-studio-request"] === "1" &&
            /^application\/json(?:;|$)/i.test(
              req.headers["content-type"] || "",
            ),
          403,
          "Use the same-origin application action.",
        );
        const origin = publicURL
          ? new URL(publicURL).origin
          : "http://" + req.headers.host;
        demand(
          req.headers.origin === origin,
          403,
          "Same-origin action required.",
        );
        let size = 0,
          parts = [];
        for await (const chunk of req) {
          size += chunk.length;
          demand(size <= 256 * 1024, 413, "Action input too large.");
          parts.push(chunk);
        }
        const input = JSON.parse(Buffer.concat(parts).toString("utf8"));
        const match = path.match(
          /^\/api\/actions\/(create|propose|accept|discard|settings)$/,
        );
        demand(match, 404, "Action unavailable.");
        return json(200, store.apply(a, match[1], input));
      }
      demand(["GET", "HEAD"].includes(req.method), 405, "Read-only page.");
      let file;
      if (path.startsWith("/assets/")) {
        file = resolve(dist, "." + path);
        demand(
          file.startsWith(resolve(dist) + "/assets/"),
          404,
          "Asset unavailable.",
        );
      } else {
        demand(
          !extname(path) && !path.includes(".."),
          404,
          "Page unavailable.",
        );
        file = join(dist, "index.html");
      }
      demand(existsSync(file), 404, "Build the application first.");
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
      });
      res.end(req.method === "HEAD" ? undefined : readFileSync(file));
    } catch (e) {
      if (!res.headersSent)
        json(e.status || (e instanceof SyntaxError ? 400 : 500), {
          error:
            e.status || e instanceof SyntaxError
              ? e.message
              : "The request could not be completed.",
        });
      else res.end();
    }
  });
  const close = server.close.bind(server);
  server.close = (cb) =>
    close((e) => {
      store.close();
      cb?.(e);
    });
  server.store = store;
  return server;
}
