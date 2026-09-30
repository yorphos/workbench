import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import {
  StudioStore,
  migrate,
  accountContext,
} from "../vendor/professional/server/workspaces.js";
import { packKit, readKit } from "../vendor/professional/server/kits.js";
import {
  dispatch,
  sendPreview,
  mailConnection,
  publicAddress,
} from "../vendor/professional/server/mail.js";
import { RenderQueue } from "../vendor/professional/server/render.js";
import { createStudio } from "../vendor/professional/server/app.js";
import { config } from "../server/config.js";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
const secret = randomBytes(32).toString("hex");
const headers = (subject = "qa-a", email = "yorphos@gmail.com") => ({
  "x-portfolio-secret": secret,
  "x-portfolio-user": subject,
  "x-portfolio-email": email,
  "x-portfolio-role": "member",
});
const a = accountContext(headers(), secret),
  b = accountContext(headers("qa-b", "fixture-b@invalid.test"), secret),
  c = accountContext(headers("qa-c", "fixture-client@invalid.test"), secret);
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "yrp-" + config.id + "-"));
  migrate(directory);
  const store = new StudioStore(directory);
  store.account(a);
  store.account(b);
  store.account(c);
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { directory, store };
}
test("identity uses immutable verified subject and rejects forged credentials", () => {
  assert.equal(accountContext(headers(), "wrong"), null);
  assert.equal(
    accountContext(headers("qa-a", "updated@invalid.test"), secret).id,
    a.id,
  );
  assert.notEqual(
    accountContext(headers("different", "yorphos@gmail.com"), secret).id,
    a.id,
  );
});
test("separate accounts and admin roles never confer foreign workspace ownership", (t) => {
  const { store } = fixture(t);
  const wa = store.workspace(a, "Account A"),
    wb = store.workspace(b, "Account B");
  const p = store.create(
    a,
    wa.id,
    config.normalize(config.seed("Private project")),
  );
  assert.equal(store.workspaces(b).length, 1);
  assert.equal(store.workspaces(b)[0].id, wb.id);
  assert.throws(
    () => store.project({ ...b, role: "admin" }, p.id),
    /unavailable/,
  );
  assert.throws(() => store.projects(b, wa.id), /unavailable/);
});
test("named invitations, revision checks, revocation and ownership transfer", (t) => {
  const { store } = fixture(t),
    w = store.workspace(a, "Team"),
    p = store.create(a, w.id, config.normalize(config.seed("Team work")));
  const i = store.invitation(a, w.id, { email: b.email, role: "editor" });
  assert.throws(() => store.acceptInvite(c, i.id), /unavailable/);
  store.acceptInvite(b, i.id);
  const edited = store.update(
    b,
    p.id,
    1,
    config.normalize({ ...p.data, name: "Edited" }),
  );
  assert.equal(edited.revision, 2);
  assert.throws(() => store.update(a, p.id, 1, p.data), /changed/);
  assert.throws(
    () => store.invitation(b, w.id, { email: c.email, role: "editor" }),
    /unavailable/,
  );
  store.transfer(a, w.id, b.id);
  assert.equal(store.role(b, w.id), "owner");
  assert.equal(store.role(a, w.id), "editor");
  store.revoke(b, w.id, { account: a.id });
  assert.throws(() => store.project(a, p.id), /unavailable/);
});
test("client review is explicit, snapshot-bound, and revoked access closes reads", (t) => {
  const { store } = fixture(t),
    w = store.workspace(a, "Review"),
    p = store.create(a, w.id, config.normalize(config.seed("Review work"))),
    s = store.publish(a, p.id, 1, config.publicView(p.data));
  assert.throws(() => store.snapshot(c, s.id), /unavailable/);
  const i = store.invitation(a, w.id, {
    email: c.email,
    role: "reviewer",
    project: p.id,
    canAccept: true,
  });
  store.acceptInvite(c, i.id);
  assert.throws(() => store.update(c, p.id, 1, p.data), /unavailable/);
  const receipt = store.review(
    c,
    s.id,
    "I accept the exact displayed proposal.",
    "acceptance",
  );
  assert.equal(receipt.data.digest, s.digest);
  assert.equal(receipt.data.revision, 1);
  store.update(a, p.id, 1, config.normalize({ ...p.data, name: "New scope" }));
  assert.throws(() => store.review(c, s.id, "Approve", "approved"), /stale/);
  store.revoke(a, w.id, { account: c.id });
  assert.throws(() => store.snapshot(c, s.id), /unavailable/);
});
test("owner approval is not client proposal acceptance", (t) => {
  const { store } = fixture(t),
    w = store.workspace(a, "Review"),
    p = store.create(a, w.id, config.normalize(config.seed())),
    s = store.publish(a, p.id, 1);
  assert.throws(
    () => store.review(a, s.id, "Accept", "acceptance"),
    /designated/,
  );
});
test("project kits round-trip and reject altered content, versions and traversal", (t) => {
  const p = { revision: 4, data: config.normalize(config.seed("Portable")) },
    bytes = packKit(config.id, p);
  assert.equal(readKit(bytes).data.name, "Portable");
  const files = unzipSync(bytes);
  files["project.json"] = strToU8(
    JSON.stringify({ ...p.data, name: "Tampered" }),
  );
  assert.throws(() => readKit(zipSync(files)), /checksums/);
  const malicious = zipSync({
    "manifest.json": strToU8("{}"),
    "project.json": strToU8("{}"),
    "../escape": strToU8("x"),
  });
  assert.throws(() => readKit(malicious), /Unsafe/);
});
test("encrypted SMTP connections are scoped to the creating account", (t) => {
  const { store } = fixture(t);
  const connection = store.saveConnection(
    a,
    mailConnection({
      label: "Fixture",
      host: "smtp.invalid.test",
      port: 587,
      user: a.email,
      password: "fixture-only-password",
      from: a.email,
    }),
  );
  assert.equal(
    store.connection(a, connection.id).password,
    "fixture-only-password",
  );
  assert.throws(() => store.connection(b, connection.id), /unavailable/);
  assert(
    !store.db
      .prepare("SELECT secret FROM connections")
      .get()
      .secret.includes("fixture-only-password"),
  );
  assert.deepEqual(store.connections(b), []);
  assert(!publicAddress("127.0.0.1"));
  assert(!publicAddress("::ffff:10.0.0.1"));
  assert(!publicAddress("fd00::1"));
  assert(publicAddress("8.8.8.8"));
});
test("SMTP acceptance is recorded and a reviewed send cannot be replayed", async (t) => {
  const { store } = fixture(t),
    w = store.workspace(a, "Mail"),
    p = store.create(a, w.id, config.normalize(config.seed("Send test"))),
    connection = store.saveConnection(a, {
      label: "Fixture",
      host: "smtp.invalid.test",
      port: 587,
      user: a.email,
      password: "synthetic",
      from: a.email,
    });
  let calls = 0;
  const factory = async () => ({
    sendMail: async () => {
      calls++;
      return {
        accepted: [b.email],
        rejected: [],
        messageId: "fixture-receipt",
      };
    },
    close() {},
  });
  const preview = sendPreview(a, p, connection.id, [b.email], {
    subject: "Test",
    html: "<p>Test</p>",
    text: "Test",
  });
  await assert.rejects(
    dispatch(store, a, p, preview, "stale", factory),
    /changed/,
  );
  const sent = await dispatch(store, a, p, preview, preview.digest, factory);
  assert.equal(sent.status, "accepted_by_server");
  assert.equal(
    (await dispatch(store, a, p, preview, preview.digest, factory)).duplicate,
    true,
  );
  assert.equal(calls, 1);
  assert.equal(
    JSON.parse(store.db.prepare("SELECT data FROM sends").get().data).messageId,
    "fixture-receipt",
  );
});
test("ambiguous SMTP interruption remains uncertain and is never replayed", async (t) => {
  const { store } = fixture(t),
    w = store.workspace(a, "Mail"),
    p = store.create(a, w.id, config.normalize(config.seed())),
    connection = store.saveConnection(a, {
      label: "Fixture",
      host: "smtp.invalid.test",
      port: 587,
      user: a.email,
      password: "synthetic",
      from: a.email,
    });
  let calls = 0;
  const factory = async () => ({
    sendMail: async () => {
      calls++;
      throw Object.assign(new Error("Connection lost after DATA"), {
        code: "ECONNECTION",
        command: "DATA",
      });
    },
    close() {},
  });
  const preview = sendPreview(a, p, connection.id, [b.email], {
    subject: "Ambiguous",
    html: "<p>Test</p>",
    text: "Test",
  });
  assert.equal(
    (await dispatch(store, a, p, preview, preview.digest, factory)).status,
    "uncertain",
  );
  assert.equal(
    (await dispatch(store, a, p, preview, preview.digest, factory)).status,
    "uncertain",
  );
  assert.equal(calls, 1);
});
test("HTTP boundary denies anonymous private data, origin forgery and foreign records", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "yrp-api-"));
  migrate(directory);
  const server = createStudio(config, {
    directory,
    secret,
    base: "/" + config.id + "/",
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const prefix = origin + "/" + config.id + "/";
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  const call = (
    path,
    method = "GET",
    data,
    identity = headers(),
    badOrigin = false,
  ) =>
    fetch(prefix + path, {
      method,
      headers: {
        ...identity,
        Origin: badOrigin ? "https://attacker.invalid" : origin,
        "Content-Type": "application/json",
        "X-Studio-Request": "1",
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  assert.equal((await call("api/session", "GET", undefined, {})).status, 401);
  assert.equal((await call("healthz", "GET", undefined, {})).status, 200);
  assert.equal(
    (await call("api/workspaces", "POST", { name: "Bad" }, headers(), true))
      .status,
    403,
  );
  const w = await (
    await call("api/workspaces", "POST", { name: "HTTP workspace" })
  ).json();
  const p = await (
    await call(
      "api/workspaces/" + w.id + "/projects",
      "POST",
      config.seed("HTTP private"),
    )
  ).json();
  assert.equal(
    (
      await call(
        "api/projects/" + p.id,
        "GET",
        undefined,
        headers("qa-b", b.email),
      )
    ).status,
    404,
  );
  assert.equal(
    (await call("api/projects/" + p.id, "PUT", { revision: 0, data: p.data }))
      .status,
    409,
  );
  assert.equal(
    (
      await call("api/projects/" + p.id + "/publish", "POST", {
        revision: p.revision,
      })
    ).status,
    200,
  );
});

test("kit assets are checksummed, private on import, and credential-free", (t) => {
  const { store } = fixture(t),
    w = store.workspace(a, "Assets"),
    p = store.create(a, w.id, config.seed("Materials"));
  const f = store.file(
    a,
    p,
    "evidence.txt",
    "text/plain",
    Buffer.from("source evidence"),
    true,
  );
  const kit = packKit(config.id, p, {}, [store.getFile(a, f.id)]),
    imported = readKit(kit);
  assert.equal(imported.attachments[0].bytes.toString(), "source evidence");
  assert.equal(JSON.stringify(imported.manifest).includes(a.id), false);
  const files = unzipSync(kit);
  files["attachments/0.bin"] = strToU8("changed");
  assert.throws(() => readKit(zipSync(files)), /checksums/);
  assert.throws(() => store.getFile(b, f.id), /unavailable/);
});
test("private files stay hidden from clients until explicitly shared", (t) => {
  const { store } = fixture(t),
    w = store.workspace(a, "Team"),
    p = store.create(a, w.id, config.seed("Project"));
  store.publish(a, p.id, p.revision, config.publicView(p.data));
  const invitation = store.invitation(a, w.id, {
    email: c.email,
    role: "reviewer",
    project: p.id,
  });
  store.acceptInvite(c, invitation.id);
  const f = store.file(
    a,
    p,
    "private.txt",
    "text/plain",
    Buffer.from("internal"),
  );
  assert.equal(store.files(c, p.id).length, 0);
  assert.throws(() => store.getFile(c, f.id), /unavailable/);
  store.db.prepare("UPDATE files SET shared=1 WHERE id=?").run(f.id);
  assert.equal(store.getFile(c, f.id).bytes.length, 8);
  store.revoke(a, w.id, { account: c.id });
  assert.throws(() => store.getFile(c, f.id), /unavailable/);
});
test("database and matching keys restore together; missing keys fail closed", (t) => {
  const { directory, store } = fixture(t),
    w = store.workspace(a, "Recovery"),
    p = store.create(a, w.id, config.seed("Preserved"));
  const saved = store.saveConnection(
    a,
    mailConnection({
      label: "fixture",
      host: "smtp.invalid.test",
      port: 587,
      user: "qa",
      password: "synthetic",
      from: a.email,
    }),
  );
  const restored = mkdtempSync(join(tmpdir(), "yrp-restore-"));
  t.after(() => rmSync(restored, { recursive: true, force: true }));
  store.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  cpSync(directory, restored, {
    recursive: true,
    filter: (source) => !source.startsWith(restored),
  });
  const copy = new StudioStore(restored);
  assert.equal(copy.project(a, p.id).data.name, "Preserved");
  assert.equal(copy.connection(a, saved.id).password, "synthetic");
  copy.close();
  rmSync(join(directory, "keys", a.id + ".key"));
  assert.throws(() => store.connection(a, saved.id), /missing/);
  assert.throws(
    () =>
      store.saveConnection(
        a,
        mailConnection({
          label: "other",
          host: "smtp.invalid.test",
          port: 587,
          user: "qa",
          password: "new",
          from: a.email,
        }),
      ),
    /missing/,
  );
});
test("render queue generates a real PDF and isolates outputs", async (t) => {
  const { store } = fixture(t),
    w = store.workspace(a, "Rendering"),
    p = store.create(a, w.id, config.seed("Rendered"));
  const queue = new RenderQueue(store);
  t.after(() => queue.close());
  const output = await config.export(p, "pdf");
  const j = queue.add(a, p, "pdf", output.body, "publication.pdf");
  const deadline = Date.now() + 30000;
  let result;
  do {
    await new Promise((r) => setTimeout(r, 50));
    result = queue.get(a, j.id);
  } while (
    ["queued", "running"].includes(result.status) &&
    Date.now() < deadline
  );
  assert.equal(result.status, "ready");
  const file = store.getFile(a, result.file);
  assert.equal(Buffer.from(file.bytes).subarray(0, 5).toString(), "%PDF-");
  assert.throws(() => queue.get(b, j.id), /unavailable/);
  await queue.close();
});
