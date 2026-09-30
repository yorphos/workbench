import { resolve } from "node:path";
import { migrateReview } from "../vendor/foundation/creation/runtime.js";
migrateReview(process.env.DATA_DIR || resolve(".data"));
console.log("Account workspace schema 1 ready.");
