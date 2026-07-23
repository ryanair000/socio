import { spawnSync } from "node:child_process";
import path from "node:path";

const vitestCli = path.resolve("node_modules", "vitest", "vitest.mjs");
for (const project of ["node", "ui"]) {
  const result = spawnSync(
    process.execPath,
    [vitestCli, "run", `--project=${project}`],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    },
  );
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
