import { resolve } from "node:path";
import { createReviewServer } from "../vendor/foundation/creation/runtime.js";
import { integrationIdentity } from "../vendor/foundation/server/identity.js";
const host = process.env.HOST || "127.0.0.1";
if (!["127.0.0.1", "::1", "localhost"].includes(host))
  throw new Error("Application HTTP must bind to loopback.");
createReviewServer({
  directory: process.env.DATA_DIR || resolve(".data"),
  base: process.env.BASE_PATH || "/",
  secret: process.env.APP_AUTH_PROXY_SECRET,
  identity: integrationIdentity,
  dist: resolve("dist"),
  publicURL: process.env.PUBLIC_URL || "",
  service: __PRODUCT_ID__,
}).listen(Number(process.env.PORT || 4199), host);
