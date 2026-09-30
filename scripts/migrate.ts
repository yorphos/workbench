import { DatabaseSync } from "node:sqlite";
import { migrateAgent } from "../server/agent.js";
import { migrate } from "../vendor/professional/server/workspaces.js";
import { resolve } from "node:path";
migrate(process.env.DATA_DIR || resolve(".data"));
console.log("Studio schema version 1 ready.");

const db = new DatabaseSync(
  (process.env.DATA_DIR || ".data") + "/studio.sqlite",
);
migrateAgent(db);
db.close();
