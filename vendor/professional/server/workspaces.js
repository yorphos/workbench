import { DatabaseSync } from "node:sqlite";
import {
  createHash,
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { integrationIdentity } from "./identity.js";
import { canonical, text } from "../shared/model.js";
export class Problem extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const requireThat = (ok, status, message) => {
  if (!ok) throw new Problem(status, message);
};
export const hash = (v) =>
  createHash("sha256")
    .update(typeof v === "string" || ArrayBuffer.isView(v) ? v : canonical(v))
    .digest("hex");
export function accountContext(headers, secret) {
  const identity = integrationIdentity(headers, secret);
  if (!identity) return null;
  const issuer = "https://accounts.google.com";
  return { ...identity, issuer, id: hash(issuer + "\0" + identity.subject) };
}
const schema = `
CREATE TABLE accounts(id TEXT PRIMARY KEY,issuer TEXT NOT NULL,subject TEXT NOT NULL,email TEXT NOT NULL,UNIQUE(issuer,subject));
CREATE TABLE workspaces(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES accounts(id),name TEXT NOT NULL);
CREATE TABLE members(workspace TEXT NOT NULL REFERENCES workspaces(id),account TEXT NOT NULL REFERENCES accounts(id),role TEXT NOT NULL CHECK(role IN ('owner','editor')),PRIMARY KEY(workspace,account));
CREATE TABLE projects(id TEXT PRIMARY KEY,workspace TEXT NOT NULL REFERENCES workspaces(id),revision INTEGER NOT NULL,data TEXT NOT NULL,updated TEXT NOT NULL);
CREATE TABLE snapshots(id TEXT PRIMARY KEY,project TEXT NOT NULL REFERENCES projects(id),workspace TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,digest TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE grants(workspace TEXT NOT NULL,project TEXT NOT NULL REFERENCES projects(id),account TEXT NOT NULL REFERENCES accounts(id),can_accept INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(project,account));
CREATE TABLE invites(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,email TEXT NOT NULL,role TEXT NOT NULL,project TEXT,can_accept INTEGER NOT NULL DEFAULT 0,expires TEXT NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,accepted TEXT);
CREATE TABLE comments(id TEXT PRIMARY KEY,project TEXT NOT NULL,revision INTEGER NOT NULL,actor TEXT NOT NULL,body TEXT NOT NULL,anchor TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE events(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,project TEXT,actor TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE connections(id TEXT PRIMARY KEY,account TEXT NOT NULL REFERENCES accounts(id),label TEXT NOT NULL,secret TEXT NOT NULL);
CREATE TABLE files(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,project TEXT,account TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,shared INTEGER NOT NULL DEFAULT 0,bytes BLOB NOT NULL);
CREATE TABLE jobs(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,project TEXT NOT NULL,account TEXT NOT NULL,revision INTEGER NOT NULL,format TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,file TEXT,error TEXT,created TEXT NOT NULL);
CREATE TABLE sends(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,project TEXT,account TEXT NOT NULL,digest TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL,UNIQUE(account,digest));
PRAGMA user_version=1;`;
export function migrate(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, "studio.sqlite");
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys=ON;");
  const version = db.prepare("PRAGMA user_version").get().user_version;
  requireThat(
    version === 0 || version === 1,
    500,
    "Unsupported database version; restore a compatible release.",
  );
  if (version === 0) {
    db.exec("BEGIN");
    try {
      db.exec(schema);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  db.close();
  chmodSync(path, 0o600);
  return path;
}
const unpack = (row) =>
  row
    ? { ...row, ...("data" in row ? { data: JSON.parse(row.data) } : {}) }
    : null;
export class StudioStore {
  constructor(directory) {
    this.directory = directory;
    this.db = new DatabaseSync(join(directory, "studio.sqlite"));
    this.db.exec(
      "PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;",
    );
    requireThat(
      this.db.prepare("PRAGMA user_version").get().user_version === 1,
      500,
      "Run npm run db:migrate before starting.",
    );
    this.db
      .prepare(
        "UPDATE jobs SET status='interrupted',error='Server stopped during rendering.' WHERE status='running'",
      )
      .run();
    this.db
      .prepare("UPDATE sends SET status='uncertain' WHERE status='claimed'")
      .run();
  }
  close() {
    this.db.close();
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  account(a) {
    this.db
      .prepare(
        "INSERT INTO accounts VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email",
      )
      .run(a.id, a.issuer, a.subject, a.email);
    return a;
  }
  workspace(a, name) {
    name = text(name, 120).trim();
    requireThat(name, 400, "Name your workspace.");
    return this.transaction(() => {
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO workspaces VALUES(?,?,?)")
        .run(id, a.id, name);
      this.db
        .prepare("INSERT INTO members VALUES(?,?,?)")
        .run(id, a.id, "owner");
      return { id, owner: a.id, name, role: "owner" };
    });
  }
  workspaces(a) {
    return this.db
      .prepare(
        "SELECT DISTINCT w.*,COALESCE(m.role,'reviewer') AS role FROM workspaces w LEFT JOIN members m ON m.workspace=w.id AND m.account=? LEFT JOIN grants g ON g.workspace=w.id AND g.account=? WHERE m.account IS NOT NULL OR g.account IS NOT NULL",
      )
      .all(a.id, a.id);
  }
  role(a, workspace) {
    const row = this.db
      .prepare("SELECT role FROM members WHERE workspace=? AND account=?")
      .get(workspace, a.id);
    return row?.role || null;
  }
  edit(a, workspace, owner = false) {
    const role = this.role(a, workspace);
    requireThat(
      owner ? role === "owner" : !!role,
      404,
      "Workspace unavailable.",
    );
    return role;
  }
  canRead(a, p) {
    return (
      !!this.role(a, p.workspace) ||
      !!this.db
        .prepare("SELECT 1 FROM grants WHERE project=? AND account=?")
        .get(p.id, a.id)
    );
  }
  project(a, id, write = false) {
    const p = unpack(
      this.db.prepare("SELECT * FROM projects WHERE id=?").get(id),
    );
    requireThat(
      p && (write ? this.role(a, p.workspace) : this.canRead(a, p)),
      404,
      "Project unavailable.",
    );
    return p;
  }
  projects(a, workspace) {
    requireThat(
      this.workspaces(a).some((w) => w.id === workspace),
      404,
      "Workspace unavailable.",
    );
    return this.db
      .prepare("SELECT * FROM projects WHERE workspace=? ORDER BY updated DESC")
      .all(workspace)
      .map(unpack)
      .filter((p) => this.canRead(a, p));
  }
  create(a, workspace, data) {
    this.edit(a, workspace);
    const p = {
      id: randomUUID(),
      workspace,
      revision: 1,
      data,
      updated: new Date().toISOString(),
    };
    this.db
      .prepare("INSERT INTO projects VALUES(?,?,?,?,?)")
      .run(p.id, workspace, p.revision, JSON.stringify(data), p.updated);
    return p;
  }
  update(a, id, revision, data) {
    const p = this.project(a, id, true);
    requireThat(
      p.revision === revision,
      409,
      "This project changed. Reload and review your edits.",
    );
    const result = this.db
      .prepare(
        "UPDATE projects SET revision=revision+1,data=?,updated=? WHERE id=? AND revision=?",
      )
      .run(JSON.stringify(data), new Date().toISOString(), id, revision);
    requireThat(result.changes === 1, 409, "This project changed.");
    return this.project(a, id);
  }
  publish(a, id, revision, publishedData) {
    return this.transaction(() => {
      const p = this.project(a, id, true);
      requireThat(
        p.revision === revision,
        409,
        "Review the latest project before publishing.",
      );
      const s = {
        id: randomUUID(),
        project: id,
        workspace: p.workspace,
        revision,
        data: publishedData || p.data,
        digest: hash(publishedData || p.data),
        actor: a.id,
        created: new Date().toISOString(),
      };
      this.db
        .prepare("INSERT INTO snapshots VALUES(?,?,?,?,?,?,?,?)")
        .run(
          s.id,
          id,
          s.workspace,
          revision,
          JSON.stringify(s.data),
          s.digest,
          a.id,
          s.created,
        );
      return s;
    });
  }
  snapshots(a, id) {
    this.project(a, id);
    return this.db
      .prepare("SELECT * FROM snapshots WHERE project=? ORDER BY created DESC")
      .all(id)
      .map(unpack);
  }
  snapshot(a, id) {
    const s = unpack(
      this.db.prepare("SELECT * FROM snapshots WHERE id=?").get(id),
    );
    requireThat(s, 404, "Revision unavailable.");
    this.project(a, s.project);
    return s;
  }
  review(a, id, body, kind = "comment", signerName = a.email) {
    return this.transaction(() => {
      const s = this.snapshot(a, id),
        p = this.project(a, s.project);
      requireThat(
        p.revision === s.revision,
        409,
        "This review revision is stale. Ask for a new published revision.",
      );
      const allowed = !!this.db
        .prepare(
          "SELECT 1 FROM grants WHERE project=? AND account=? AND can_accept=1",
        )
        .get(p.id, a.id);
      requireThat(
        kind !== "acceptance" || allowed,
        403,
        "You are not a designated accepter.",
      );
      const consent = text(body, 5000).trim();
      requireThat(consent, 400, "Enter your review or explicit acceptance.");
      return this.event(a, p.workspace, p.id, kind, {
        snapshot: s.id,
        revision: s.revision,
        digest: s.digest,
        name: text(signerName, 180).trim() || a.email,
        email: a.email,
        consent,
      });
    });
  }
  comment(a, id, revision, body, anchor = "") {
    const p = this.project(a, id);
    if (!this.role(a, p.workspace))
      requireThat(
        this.snapshots(a, id).some((s) => s.revision === revision),
        404,
        "Published revision unavailable.",
      );
    requireThat(
      Number.isSafeInteger(revision) && revision > 0,
      400,
      "Choose a revision.",
    );
    body = text(body, 5000).trim();
    requireThat(body, 400, "Write a comment.");
    const c = {
      id: randomUUID(),
      project: id,
      revision,
      actor: a.email,
      body,
      anchor: text(anchor, 120),
      created: new Date().toISOString(),
    };
    this.db
      .prepare("INSERT INTO comments VALUES(?,?,?,?,?,?,?)")
      .run(c.id, id, revision, a.email, body, c.anchor, c.created);
    return c;
  }
  comments(a, id) {
    this.project(a, id);
    const published = new Set(this.snapshots(a, id).map((s) => s.revision));
    return this.db
      .prepare("SELECT * FROM comments WHERE project=? ORDER BY created")
      .all(id)
      .filter(
        (c) =>
          this.role(a, this.project(a, id).workspace) ||
          published.has(c.revision),
      );
  }
  event(a, workspace, project, kind, data) {
    const e = {
      id: randomUUID(),
      workspace,
      project,
      actor: a.id,
      kind,
      data,
      created: new Date().toISOString(),
    };
    this.db
      .prepare("INSERT INTO events VALUES(?,?,?,?,?,?,?)")
      .run(
        e.id,
        workspace,
        project,
        a.id,
        kind,
        JSON.stringify(data),
        e.created,
      );
    return e;
  }
  events(a, id) {
    const p = this.project(a, id);
    return this.db
      .prepare("SELECT * FROM events WHERE project=? ORDER BY created DESC")
      .all(id)
      .map(unpack)
      .filter(
        (e) =>
          this.role(a, p.workspace) ||
          ["acceptance", "approved", "changes_requested"].includes(e.kind),
      );
  }
  invitation(a, workspace, v) {
    this.edit(a, workspace, true);
    const email = text(v.email, 254).toLowerCase().trim();
    requireThat(/^[^\s@]+@[^\s@]+$/.test(email), 400, "Enter an email.");
    requireThat(
      ["editor", "reviewer"].includes(v.role),
      400,
      "Choose editor or reviewer.",
    );
    if (v.role === "reviewer")
      requireThat(
        this.project(a, v.project, true).workspace === workspace,
        404,
        "Project unavailable.",
      );
    const i = {
      id: randomUUID(),
      workspace,
      email,
      role: v.role,
      project: v.role === "reviewer" ? v.project : null,
      can_accept: v.canAccept === true ? 1 : 0,
      expires: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    this.db
      .prepare(
        "INSERT INTO invites(id,workspace,email,role,project,can_accept,expires) VALUES(?,?,?,?,?,?,?)",
      )
      .run(i.id, workspace, email, i.role, i.project, i.can_accept, i.expires);
    return i;
  }
  invitationRead(a, id) {
    const i = this.db.prepare("SELECT * FROM invites WHERE id=?").get(id);
    requireThat(
      i && (i.email === a.email || this.role(a, i.workspace) === "owner"),
      404,
      "Invitation unavailable.",
    );
    return i;
  }
  acceptInvite(a, id) {
    return this.transaction(() => {
      const i = this.invitationRead(a, id);
      requireThat(
        i.email === a.email &&
          !i.revoked &&
          !i.accepted &&
          i.expires > new Date().toISOString(),
        403,
        "Invitation expired, used, revoked, or addressed to someone else.",
      );
      if (i.role === "editor")
        this.db
          .prepare(
            "INSERT INTO members VALUES(?,?,'editor') ON CONFLICT DO NOTHING",
          )
          .run(i.workspace, a.id);
      else
        this.db
          .prepare(
            "INSERT INTO grants VALUES(?,?,?,?) ON CONFLICT(project,account) DO UPDATE SET can_accept=excluded.can_accept",
          )
          .run(i.workspace, i.project, a.id, i.can_accept);
      this.db.prepare("UPDATE invites SET accepted=? WHERE id=?").run(a.id, id);
      return { workspace: i.workspace };
    });
  }
  team(a, workspace) {
    this.edit(a, workspace, true);
    return {
      members: this.db
        .prepare(
          "SELECT m.*,a.email FROM members m JOIN accounts a ON a.id=m.account WHERE workspace=?",
        )
        .all(workspace),
      grants: this.db
        .prepare(
          "SELECT g.*,a.email FROM grants g JOIN accounts a ON a.id=g.account WHERE workspace=?",
        )
        .all(workspace),
      invitations: this.db
        .prepare("SELECT * FROM invites WHERE workspace=?")
        .all(workspace),
    };
  }
  revoke(a, workspace, v) {
    this.edit(a, workspace, true);
    return this.transaction(() => {
      if (v.invitation)
        this.db
          .prepare("UPDATE invites SET revoked=1 WHERE id=? AND workspace=?")
          .run(v.invitation, workspace);
      if (v.account) {
        requireThat(
          v.account !== a.id,
          400,
          "Transfer ownership before leaving.",
        );
        this.db
          .prepare("DELETE FROM members WHERE workspace=? AND account=?")
          .run(workspace, v.account);
        this.db
          .prepare("DELETE FROM grants WHERE workspace=? AND account=?")
          .run(workspace, v.account);
      }
      return { ok: true };
    });
  }
  transfer(a, workspace, target) {
    this.edit(a, workspace, true);
    requireThat(
      target !== a.id && this.role({ id: target }, workspace) === "editor",
      400,
      "Choose an existing editor.",
    );
    return this.transaction(() => {
      this.db
        .prepare(
          "UPDATE members SET role='editor' WHERE workspace=? AND account=?",
        )
        .run(workspace, a.id);
      this.db
        .prepare(
          "UPDATE members SET role='owner' WHERE workspace=? AND account=?",
        )
        .run(workspace, target);
      this.db
        .prepare("UPDATE workspaces SET owner=? WHERE id=?")
        .run(target, workspace);
      return { ok: true };
    });
  }
  key(account, create = false) {
    const path = join(this.directory, "keys", account + ".key");
    if (!existsSync(path)) {
      requireThat(
        create,
        500,
        "The matching account encryption key is missing. Restore it with the database.",
      );
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      writeFileSync(path, randomBytes(32), { mode: 0o600, flag: "wx" });
    }
    return readFileSync(path);
  }
  connections(a) {
    return this.db
      .prepare("SELECT id,label FROM connections WHERE account=?")
      .all(a.id);
  }
  saveConnection(a, v) {
    const id = randomUUID(),
      iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.key(
        a.id,
        !this.db.prepare("SELECT 1 FROM connections WHERE account=?").get(a.id),
      ),
      iv,
    );
    cipher.setAAD(Buffer.from(a.id + ":" + id));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(v)),
      cipher.final(),
    ]);
    this.db.prepare("INSERT INTO connections VALUES(?,?,?,?)").run(
      id,
      a.id,
      text(v.label, 120),
      JSON.stringify({
        iv: iv.toString("hex"),
        tag: cipher.getAuthTag().toString("hex"),
        value: encrypted.toString("hex"),
      }),
    );
    return { id, label: v.label };
  }
  connection(a, id) {
    const row = this.db
      .prepare("SELECT secret FROM connections WHERE id=? AND account=?")
      .get(id, a.id);
    requireThat(row, 404, "Mail connection unavailable.");
    const x = JSON.parse(row.secret),
      decipher = createDecipheriv(
        "aes-256-gcm",
        this.key(a.id),
        Buffer.from(x.iv, "hex"),
      );
    decipher.setAAD(Buffer.from(a.id + ":" + id));
    decipher.setAuthTag(Buffer.from(x.tag, "hex"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(x.value, "hex")),
        decipher.final(),
      ]).toString(),
    );
  }
  deleteConnection(a, id) {
    requireThat(
      this.db
        .prepare("DELETE FROM connections WHERE id=? AND account=?")
        .run(id, a.id).changes,
      404,
      "Mail connection unavailable.",
    );
    return { ok: true };
  }
  file(a, p, name, mime, bytes, shared = false) {
    requireThat(bytes.length <= 20 * 1024 * 1024, 413, "File exceeds 20 MB.");
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO files VALUES(?,?,?,?,?,?,?,?)")
      .run(
        id,
        p.workspace,
        p.id,
        a.id,
        text(name, 180),
        mime,
        shared ? 1 : 0,
        bytes,
      );
    return { id, name, mime };
  }
  files(a, id) {
    const p = this.project(a, id);
    return this.db
      .prepare(
        "SELECT id,name,mime,shared,length(bytes) AS size FROM files WHERE project=?",
      )
      .all(id)
      .filter((f) => this.role(a, p.workspace) || f.shared);
  }
  getFile(a, id) {
    const f = this.db.prepare("SELECT * FROM files WHERE id=?").get(id);
    requireThat(f, 404, "File unavailable.");
    const p = this.project(a, f.project);
    requireThat(
      this.role(a, p.workspace) || f.shared || f.account === a.id,
      404,
      "File unavailable.",
    );
    return f;
  }
}
