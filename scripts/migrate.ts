import { migrate } from "../vendor/professional/server/workspaces.js";
import { resolve } from "node:path";
migrate(process.env.DATA_DIR || resolve(".data"));
console.log("Studio schema version 1 ready.");
