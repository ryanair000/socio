import { spawnSync } from "node:child_process";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(executable, ["vitest", "run"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "test",
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
