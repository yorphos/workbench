import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  migrateReview,
  ReviewStore,
  verifiedAccount,
} from "../vendor/foundation/creation/runtime.js";
const a = verifiedAccount({
    subject: "fixture-a",
    email: "yorphos@gmail.com",
    role: "member",
  }),
  b = verifiedAccount({
    subject: "fixture-b",
    email: "b@invalid.test",
    role: "admin",
  });
test("actual account-owned create, review, conflict and recovery paths", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "scaffold-contract-"));
  migrateReview(directory);
  const store = new ReviewStore(directory);
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const created = store.apply(a, "create", {
    operationId: "create-one",
    name: "Original",
    details: "Source",
  });
  assert.equal(store.list(b).length, 0);
  assert.throws(() => store.get(b, created.record.id), /unavailable/);
  assert.equal(
    store.apply(a, "create", {
      operationId: "create-one",
      name: "Original",
      details: "Source",
    }).record.id,
    created.record.id,
  );
  assert.throws(
    () =>
      store.apply(a, "create", {
        operationId: "create-one",
        name: "Changed",
        details: "Source",
      }),
    /conflicts/,
  );
  const proposed = store.apply(a, "propose", {
    operationId: "proposal-one",
    id: created.record.id,
    revision: 1,
    name: "Reviewed",
    details: "Proposed",
  });
  assert.equal(proposed.record.name, "Original");
  assert.equal(proposed.record.proposal.name, "Reviewed");
  assert.throws(
    () =>
      store.apply(a, "accept", {
        operationId: "stale-one",
        id: created.record.id,
        revision: 1,
      }),
    /changed/,
  );
  const applied = store.apply(a, "accept", {
    operationId: "accept-one",
    id: created.record.id,
    revision: 2,
  });
  assert.equal(applied.record.name, "Reviewed");
  assert.equal(applied.record.revision, 3);
  assert.equal(store.receipts(b).length, 0);
  assert.equal(store.receipts(a)[0].delivery, "No external delivery");
});
