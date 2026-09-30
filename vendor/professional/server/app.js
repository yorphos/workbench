import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  StudioStore,
  accountContext,
  Problem,
  requireThat,
  hash,
} from "./workspaces.js";
import { packKit, readKit } from "./kits.js";
import { mailConnection, sendPreview, dispatch } from "./mail.js";
import { RenderQueue } from "./render.js";
import { text, documentHTML, escapeHTML } from "../shared/model.js";
const MIME = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
async function body(req) {
  requireThat(
    (req.headers["content-type"] || "").startsWith("application/json"),
    415,
    "Use JSON for this request.",
  );
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    requireThat(size <= 30 * 1024 * 1024, 413, "Request exceeds 30 MB.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new Problem(400, "Invalid JSON.");
  }
}
export function createStudio(
  config,
  {
    directory = process.env.DATA_DIR || resolve(".data"),
    secret = process.env.APP_AUTH_PROXY_SECRET,
    publicURL = process.env.PUBLIC_URL,
    base = process.env.BASE_PATH || "/",
    transportFactory = null,
  } = {},
) {
  const normalize = (value) => {
    try {
      return config.normalize(value);
    } catch (e) {
      throw new Problem(400, e.message);
    }
  };
  const store = new StudioStore(directory),
    renders = new RenderQueue(store),
    dist = resolve("dist");
  const json = (res, data, status = 200) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(data));
  };
  const binary = (res, bytes, mime, name) => {
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    res.end(bytes);
  };
  const projected = (a, p) => {
    if (store.role(a, p.workspace)) return { ...p, permission: "editor" };
    const s = store.snapshots(a, p.id)[0];
    return s
      ? {
          ...p,
          data: config.publicView(s.data),
          revision: s.revision,
          permission: "reviewer",
          canAccept: !!store.db
            .prepare(
              "SELECT 1 FROM grants WHERE project=? AND account=? AND can_accept=1",
            )
            .get(p.id, a.id),
        }
      : null;
  };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let path = decodeURIComponent(url.pathname);
      requireThat(!path.includes("\0"), 400, "Invalid path.");
      if (base !== "/" && path.startsWith(base))
        path = "/" + path.slice(base.length);
      const method = req.method;
      if (path === "/healthz" && ["GET", "HEAD"].includes(method))
        return json(res, { ok: true, service: config.id });
      const isPublic =
        path === "/" ||
        path === "/docs" ||
        path.startsWith("/docs/") ||
        path === "/recipes" ||
        path.startsWith("/recipes/") ||
        path === "/demo" ||
        path.startsWith("/demo/") ||
        path.startsWith("/assets/") ||
        path.startsWith("/r/");
      if (isPublic) {
        requireThat(["GET", "HEAD"].includes(method), 405, "Read-only route.");
        if (path.startsWith("/r/")) {
          const id = path.slice(3).replace(/\.json$/, "");
          const recipe = config.registry?.(id);
          requireThat(recipe, 404, "Recipe unavailable.");
          return json(res, recipe);
        }
        let file = path.startsWith("/assets/")
          ? resolve(dist, "." + path)
          : join(dist, "index.html");
        requireThat(
          file.startsWith(dist + "/") && existsSync(file),
          404,
          "Page unavailable. Run npm run build.",
        );
        res.writeHead(200, {
          "Content-Type": MIME[extname(file)] || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'",
        });
        return res.end(method === "HEAD" ? undefined : readFileSync(file));
      }
      const a = accountContext(req.headers, secret);
      requireThat(a, 401, "Sign in with Google to open your workspace.");
      store.account(a);
      if (!["GET", "HEAD"].includes(method)) {
        const origin = req.headers.origin;
        const expected = new URL(publicURL || `http://${req.headers.host}`)
          .origin;
        requireThat(
          origin === expected && req.headers["x-studio-request"] === "1",
          403,
          "Use the same-origin application to make changes.",
        );
      }
      if (path === "/app" || path.startsWith("/app/")) {
        requireThat(["GET", "HEAD"].includes(method), 405, "Read-only page.");
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        });
        return res.end(readFileSync(join(dist, "index.html")));
      }
      if (path === "/api/session" && method === "GET")
        return json(res, {
          account: { id: a.id, email: a.email },
          workspaces: store.workspaces(a),
          connections: store.connections(a),
          attempts: store.db
            .prepare(
              "SELECT id,project,status,data,created FROM sends WHERE account=? ORDER BY created DESC LIMIT 50",
            )
            .all(a.id)
            .map((v) => ({ ...v, data: JSON.parse(v.data) })),
        });
      if (path === "/api/workspaces" && method === "POST") {
        const b = await body(req);
        return json(res, store.workspace(a, b.name), 201);
      }
      let match;
      if (
        (match = path.match(/^\/api\/workspaces\/([^/]+)$/)) &&
        method === "GET"
      )
        return json(
          res,
          store
            .projects(a, match[1])
            .map((p) => projected(a, p))
            .filter(Boolean),
        );
      if (
        (match = path.match(/^\/api\/workspaces\/([^/]+)\/projects$/)) &&
        method === "POST"
      ) {
        const b = await body(req);
        return json(res, store.create(a, match[1], normalize(b)), 201);
      }
      if (
        (match = path.match(/^\/api\/workspaces\/([^/]+)\/import$/)) &&
        method === "POST"
      ) {
        const b = await body(req),
          kit = readKit(Buffer.from(text(b.bytes, 28 * 1024 * 1024), "base64"));
        const imported = normalize(config.importKit(kit));
        return json(
          res,
          store.transaction(() => {
            const p = store.create(a, match[1], imported);
            for (const f of kit.attachments)
              store.file(a, p, f.name, f.mime, f.bytes, false);
            return p;
          }),
          201,
        );
      }
      if ((match = path.match(/^\/api\/workspaces\/([^/]+)\/team$/))) {
        if (method === "GET") return json(res, store.team(a, match[1]));
        if (method === "DELETE")
          return json(res, store.revoke(a, match[1], await body(req)));
      }
      if (
        (match = path.match(/^\/api\/workspaces\/([^/]+)\/transfer$/)) &&
        method === "POST"
      )
        return json(
          res,
          store.transfer(a, match[1], (await body(req)).account),
        );
      if (
        (match = path.match(/^\/api\/workspaces\/([^/]+)\/invitations$/)) &&
        method === "POST"
      )
        return json(res, store.invitation(a, match[1], await body(req)), 201);
      if (
        (match = path.match(/^\/api\/invitations\/([^/]+)$/)) &&
        method === "GET"
      )
        return json(res, store.invitationRead(a, match[1]));
      if (
        (match = path.match(/^\/api\/invitations\/([^/]+)\/accept$/)) &&
        method === "POST"
      )
        return json(res, store.acceptInvite(a, match[1]));
      if ((match = path.match(/^\/api\/projects\/([^/]+)$/))) {
        if (method === "GET") {
          const p = store.project(a, match[1]),
            view = projected(a, p);
          requireThat(view, 404, "No published revision available.");
          return json(res, {
            ...view,
            history: store.snapshots(a, p.id),
            comments: store.comments(a, p.id),
            events: store.events(a, p.id),
            files: store.files(a, p.id),
          });
        }
        if (method === "PUT") {
          const b = await body(req);
          return json(
            res,
            store.update(a, match[1], b.revision, normalize(b.data)),
          );
        }
      }
      if (
        (match = path.match(/^\/api\/projects\/([^/]+)\/duplicate$/)) &&
        method === "POST"
      ) {
        const p = store.project(a, match[1], true);
        return json(
          res,
          store.create(
            a,
            p.workspace,
            normalize({ ...p.data, name: p.data.name + " — copy" }),
          ),
          201,
        );
      }
      if (
        (match = path.match(/^\/api\/projects\/([^/]+)\/publish$/)) &&
        method === "POST"
      ) {
        const b = await body(req);
        const p = store.project(a, match[1], true);
        return json(
          res,
          store.publish(a, p.id, b.revision, config.publicView(p.data)),
        );
      }
      if (
        (match = path.match(/^\/api\/projects\/([^/]+)\/comments$/)) &&
        method === "POST"
      ) {
        const b = await body(req);
        return json(
          res,
          store.comment(a, match[1], b.revision, b.body, b.anchor),
        );
      }
      if (
        (match = path.match(/^\/api\/snapshots\/([^/]+)\/review$/)) &&
        method === "POST"
      ) {
        const b = await body(req);
        requireThat(
          ["approved", "changes_requested", "acceptance"].includes(b.kind),
          400,
          "Choose a review outcome.",
        );
        requireThat(
          b.kind !== "acceptance" || config.id === "fieldwork",
          400,
          "Proposal acceptance belongs in Fieldwork.",
        );
        requireThat(
          b.kind !== "acceptance" ||
            (typeof b.name === "string" &&
              b.name.trim().length > 1 &&
              b.confirm === true),
          400,
          "Type your name and explicitly confirm acceptance.",
        );
        return json(res, store.review(a, match[1], b.body, b.kind, b.name));
      }
      if (
        (match = path.match(/^\/api\/projects\/([^/]+)\/files$/)) &&
        method === "POST"
      ) {
        const b = await body(req),
          p = store.project(a, match[1], true);
        requireThat(
          [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
            "text/plain",
            "application/zip",
            "application/json",
          ].includes(b.mime),
          400,
          "Unsupported attachment type.",
        );
        return json(
          res,
          store.file(
            a,
            p,
            b.name,
            b.mime,
            Buffer.from(text(b.bytes, 28 * 1024 * 1024), "base64"),
            b.shared === true,
          ),
          201,
        );
      }
      if ((match = path.match(/^\/api\/files\/([^/]+)$/)) && method === "GET") {
        const f = store.getFile(a, match[1]);
        return binary(res, f.bytes, f.mime, f.name);
      }
      if ((match = path.match(/^\/api\/files\/([^/]+)$/)) && method === "PUT") {
        const f = store.getFile(a, match[1]);
        store.project(a, f.project, true);
        const b = await body(req);
        requireThat(
          typeof b.shared === "boolean",
          400,
          "Choose file visibility.",
        );
        store.db
          .prepare("UPDATE files SET shared=? WHERE id=?")
          .run(b.shared ? 1 : 0, f.id);
        return json(res, { ok: true });
      }
      if (
        (match = path.match(/^\/api\/projects\/([^/]+)\/export$/)) &&
        method === "POST"
      ) {
        const b = await body(req),
          original = store.project(a, match[1]),
          p = projected(a, original);
        requireThat(p, 404, "Revision unavailable.");
        requireThat(
          p.revision === b.revision,
          409,
          "Export the latest reviewed revision.",
        );
        if (b.format === "kit") {
          store.edit(a, p.workspace);
          return binary(
            res,
            packKit(
              config.id,
              p,
              config.extras?.(p.data) || {},
              store.files(a, p.id).map((f) => store.getFile(a, f.id)),
            ),
            "application/zip",
            config.id + "-project.yrp-kit.zip",
          );
        }
        const output = await config.export(p, b.format);
        if (
          output?.body &&
          output.body.includes?.("</head>") &&
          !b.format.startsWith("email-")
        ) {
          const font = readFileSync(
            new URL("../web/fonts/font-0.ttf", import.meta.url),
          ).toString("base64");
          output.body = output.body.replace(
            "</head>",
            `<style>@font-face{font-family:"DM Sans";src:url(data:font/ttf;base64,${font}) format("truetype");font-weight:100 900;font-style:normal}</style></head>`,
          );
        }
        requireThat(output, 400, "Unsupported output format.");
        if (["pdf", "png"].includes(b.format))
          return json(
            res,
            renders.add(a, p, b.format, output.body, output.name),
            202,
          );
        return binary(res, output.body, output.mime, output.name);
      }
      if ((match = path.match(/^\/api\/jobs\/([^/]+)$/)) && method === "GET")
        return json(res, renders.get(a, match[1]));
      if (
        (match = path.match(/^\/api\/jobs\/([^/]+)\/cancel$/)) &&
        method === "POST"
      )
        return json(res, await renders.cancel(a, match[1]));
      if (path === "/api/connections" && method === "POST")
        return json(
          res,
          store.saveConnection(a, mailConnection(await body(req))),
          201,
        );
      if (
        (match = path.match(/^\/api\/connections\/([^/]+)$/)) &&
        method === "DELETE"
      )
        return json(res, store.deleteConnection(a, match[1]));
      if (
        ["/api/mail/preview", "/api/mail/send"].includes(path) &&
        method === "POST"
      ) {
        const b = await body(req),
          p = store.project(a, b.projectId, true);
        requireThat(
          p.revision === b.revision,
          409,
          "The project changed. Review the email again.",
        );
        store.connection(a, b.connectionId);
        let message = await config.email(
          p.data,
          publicURL || `http://${req.headers.host}${base}`,
        );
        if (b.invitationId) {
          const i = store.invitationRead(a, b.invitationId);
          requireThat(
            i.workspace === p.workspace && !i.revoked && !i.accepted && i.expires > new Date().toISOString(),
            400,
            "Invitation unavailable.",
          );
          requireThat(
            b.to?.length === 1 && b.to[0] === i.email,
            400,
            "Invitation must go to its named recipient.",
          );
          const href =
            (publicURL || `http://${req.headers.host}${base}`) +
            "app?invite=" +
            encodeURIComponent(i.id);
          message = {
            subject: `Invitation to ${config.name}`,
            html: documentHTML(
              "You are invited",
              `<h1>You are invited</h1><p>Open your invitation and sign in as ${escapeHTML(i.email)}.</p><p><a href="${escapeHTML(href)}">Open invitation</a></p>`,
            ),
            text: `Open ${href} and sign in as ${i.email}.`,
          };
        }
        const ids = b.attachmentIds || [];
        requireThat(
          (Array.isArray(ids) && ids.length <= 10 && !b.invitationId) ||
            (Array.isArray(ids) && ids.length === 0),
          400,
          "Choose up to 10 project attachments.",
        );
        const attachments = ids.map((id) => {
          const f = store.getFile(a, id);
          requireThat(f.project === p.id, 404, "Attachment unavailable.");
          return {
            id: f.id,
            name: f.name,
            mime: f.mime,
            size: f.bytes.length,
            digest: hash(f.bytes),
          };
        });
        requireThat(
          attachments.reduce((n, f) => n + f.size, 0) <= 20 * 1024 * 1024,
          413,
          "Mail attachments exceed 20 MB.",
        );
        message = { ...message, attachments };
        const preview = sendPreview(a, p, b.connectionId, b.to, message);
        preview.from = store.connection(a, b.connectionId).from;
        if (b.retryOf) {
          const prior = store.db
            .prepare(
              "SELECT * FROM sends WHERE id=? AND account=? AND project=?",
            )
            .get(b.retryOf, a.id, p.id);
          requireThat(
            prior?.status === "failed",
            409,
            "Only a confirmed failed attempt may be retried.",
          );
          const count = JSON.parse(prior.data).retryCount || 0;
          requireThat(
            count < 2,
            429,
            "The retry limit was reached. Check the connection before composing a new message.",
          );
          preview.digest = hash({ digest: preview.digest, retryOf: prior.id });
          preview.retryOf = prior.id;
          preview.retryCount = count + 1;
        }
        if (path.endsWith("/preview")) return json(res, preview);
        requireThat(
          b.confirm === true,
          400,
          "Review and confirm this email before sending.",
        );
        return json(
          res,
          await dispatch(store, a, p, preview, b.digest, transportFactory),
        );
      }
      if (path === "/api/mail/attempts" && method === "GET")
        return json(
          res,
          store.db
            .prepare(
              "SELECT id,project,status,data,created FROM sends WHERE account=? ORDER BY created DESC",
            )
            .all(a.id)
            .map((v) => ({ ...v, data: JSON.parse(v.data) })),
        );
      throw new Problem(404, "Route unavailable.");
    } catch (e) {
      if (!res.headersSent)
        json(
          res,
          {
            error:
              e instanceof Problem || e instanceof SyntaxError
                ? e.message
                : e.message?.startsWith("Invalid")
                  ? e.message
                  : "The request could not be completed.",
          },
          e.status || (e instanceof SyntaxError ? 400 : 500),
        );
      else res.end();
    }
  });
  server.studio = { store, renders };
  const close = server.close.bind(server);
  server.close = (callback) => {
    close((error) => {
      renders.close().then(() => {
        store.close();
        callback?.(error);
      });
    });
    return server;
  };
  return server;
}
export function launch(config) {
  const host = process.env.HOST || "127.0.0.1";
  requireThat(
    ["127.0.0.1", "::1", "localhost"].includes(host),
    500,
    "Bind to loopback.",
  );
  createStudio(config).listen(
    Number(process.env.PORT || config.port),
    host,
    () => console.log(`${config.name} ready on loopback.`),
  );
}
