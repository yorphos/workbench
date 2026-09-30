import { chromium } from "playwright";
import { randomUUID } from "node:crypto";
import { requireThat } from "./workspaces.js";
export class RenderQueue {
  constructor(store) {
    this.store = store;
    this.running = false;
    this.cancelled = new Set();
    this.context = null;
    this.active = null;
    this.closed = false;
    this.pump();
  }
  add(a, p, format, html, name) {
    requireThat(
      ["pdf", "png"].includes(format),
      400,
      "Unsupported render format.",
    );
    const waiting = this.store.db
      .prepare(
        "SELECT count(*) AS n FROM jobs WHERE account=? AND status IN ('queued','running')",
      )
      .get(a.id).n;
    requireThat(waiting < 3, 429, "Finish or cancel an existing export first.");
    const id = randomUUID();
    this.store.db
      .prepare(
        "INSERT INTO jobs(id,workspace,project,account,revision,format,status,payload,created) VALUES(?,?,?,?,?,?,'queued',?,?)",
      )
      .run(
        id,
        p.workspace,
        p.id,
        a.id,
        p.revision,
        format,
        JSON.stringify({ html, name }),
        new Date().toISOString(),
      );
    this.pump();
    return { id, status: "queued" };
  }
  get(a, id) {
    const j = this.store.db
      .prepare("SELECT * FROM jobs WHERE id=? AND account=?")
      .get(id, a.id);
    requireThat(j, 404, "Export unavailable.");
    this.store.project(a, j.project);
    return {
      id: j.id,
      status: j.status,
      revision: j.revision,
      file: j.file,
      error: j.error,
    };
  }
  async cancel(a, id) {
    this.get(a, id);
    this.cancelled.add(id);
    this.store.db
      .prepare(
        "UPDATE jobs SET status='cancelled' WHERE id=? AND status IN ('queued','running')",
      )
      .run(id);
    if (this.active === id) await this.context?.close().catch(() => {});
    return this.get(a, id);
  }
  async pump() {
    if (this.running || this.closed) return;
    this.running = true;
    try {
      let j;
      while (
        !this.closed &&
        (j = this.store.db
          .prepare(
            "SELECT * FROM jobs WHERE status='queued' ORDER BY created LIMIT 1",
          )
          .get())
      ) {
        this.active = j.id;
        this.store.db
          .prepare("UPDATE jobs SET status='running' WHERE id=?")
          .run(j.id);
        let browser;
        try {
          const payload = JSON.parse(j.payload);
          browser = await chromium.launch({ headless: true });
          this.context = await browser.newContext({
            viewport: { width: 1200, height: 630 },
          });
          await this.context.route("**/*", (route) => route.abort());
          const page = await this.context.newPage();
          page.setDefaultTimeout(30000);
          await page.setContent(payload.html, {
            waitUntil: "load",
            timeout: 30000,
          });
          await page.evaluate(() => document.fonts.ready);
          const bytes =
            j.format === "pdf"
              ? await page.pdf({
                  format: "A4",
                  printBackground: true,
                  preferCSSPageSize: true,
                  tagged: true,
                })
              : await page.screenshot({ type: "png", fullPage: true });
          if (!this.cancelled.has(j.id)) {
            const p = { id: j.project, workspace: j.workspace };
            const file = this.store.file(
              { id: j.account },
              p,
              payload.name,
              j.format === "pdf" ? "application/pdf" : "image/png",
              bytes,
            );
            this.store.db
              .prepare(
                "UPDATE jobs SET status='ready',file=? WHERE id=? AND status='running'",
              )
              .run(file.id, j.id);
          }
        } catch (e) {
          if (!this.cancelled.has(j.id))
            this.store.db
              .prepare(
                "UPDATE jobs SET status='failed',error='Rendering failed. Your source revision is preserved.' WHERE id=?",
              )
              .run(j.id);
        } finally {
          await browser?.close().catch(() => {});
          this.context = null;
          this.active = null;
        }
      }
    } finally {
      this.running = false;
    }
  }
  async close() {
    this.closed = true;
    await this.context?.close().catch(() => {});
    while (this.running)
      await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
