import { createServer, request } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import {
  migrateReview,
  createReviewServer,
} from "../vendor/foundation/creation/runtime.js";
import { integrationIdentity } from "../vendor/foundation/server/identity.js";
if (process.env.NODE_ENV === "production")
  throw new Error("The fixture is never a production sign-in mode.");
const directory = mkdtempSync(join(tmpdir(), "foundation-pilot-")),
  secret = randomBytes(32).toString("hex"),
  port = Number(process.env.PORT || 4199),
  base = process.env.BASE_PATH || "/pilot/";
migrateReview(directory);
const backend = createReviewServer({
  directory,
  secret,
  identity: integrationIdentity,
  base,
  dist: resolve("dist"),
  service: __PRODUCT_ID__,
  publicURL: "http://127.0.0.1:" + port + base,
});
backend.listen(0, "127.0.0.1", () => {
  const backendPort = (backend.address() as any).port;
  const proxy = createServer((req, res) => {
    const selected =
      (req.headers.cookie || "").match(
        /(?:^|;\s*)qa_account=(a|b|admin)(?:;|$)/,
      )?.[1] || "a";
    const headers = {
      ...req.headers,
      "x-portfolio-secret": secret,
      "x-portfolio-user": "pilot-fixture-" + selected,
      "x-portfolio-email":
        selected === "a"
          ? "yorphos@gmail.com"
          : "fixture-" + selected + "@invalid.test",
      "x-portfolio-role": selected === "admin" ? "admin" : "member",
    };
    delete headers["x-portfolio-service"];
    delete headers["x-portfolio-delegation"];
    const upstream = request(
      {
        host: "127.0.0.1",
        port: backendPort,
        path: req.url,
        method: req.method,
        headers,
      },
      (response) => {
        res.writeHead(response.statusCode || 500, response.headers);
        response.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.statusCode = 502;
      res.end();
    });
    req.pipe(upstream);
  }).listen(port, "127.0.0.1", () =>
    console.log("Isolated fixture ready on loopback."),
  );
  const stop = () =>
    proxy.close(() =>
      backend.close(() => {
        rmSync(directory, { recursive: true, force: true });
        process.exit(0);
      }),
    );
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
});
