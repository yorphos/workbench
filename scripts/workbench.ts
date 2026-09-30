import { runCLI } from "../vendor/professional/creation/cli.js";
try {
  const result = await runCLI();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.valid === false) process.exitCode = 2;
} catch (e) {
  process.stderr.write(JSON.stringify({ error: e.message }) + "\n");
  process.exitCode = 2;
}
