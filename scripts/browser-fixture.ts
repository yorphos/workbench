import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../vendor/professional/server/workspaces.js";
import { createStudio } from "../vendor/professional/server/app.js";
import { config } from "../server/config.js";
const directory = mkdtempSync(join(tmpdir(), "yrp-ui-" + config.id + "-"));
migrate(directory);
const server = createStudio(config, {
  directory,
  secret: "synthetic-browser-fixture-credential-".repeat(2),
  base: process.env.BASE_PATH || "/",
  transportFactory: async () => ({
    sendMail: async (message) => ({
      accepted: message.to,
      rejected: [],
      messageId: "synthetic-smtp-only",
    }),
    close() {},
  }),
});
server.listen(Number(process.env.PORT || 4196), "127.0.0.1");
const stop = () =>
  server.close(() => {
    rmSync(directory, { recursive: true, force: true });
    process.exit(0);
  });
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
