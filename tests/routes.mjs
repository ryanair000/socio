import fs from "node:fs";
import path from "node:path";

const manifestPath = path.resolve(".next/server/app-paths-manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.error("Missing App Router manifest. Run the production build first.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expected = [
  "/page",
  "/login/page",
  "/api/auth/route",
  "/api/logout/route",
  "/api/uploads/route",
  "/api/posts/route",
  "/api/posts/[id]/route",
  "/api/posts/[id]/retry/route",
  "/api/connections/route",
];

const missing = expected.filter((route) => !manifest[route]);
if (missing.length) {
  console.error(`Missing production routes: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`Verified ${expected.length} focused production routes.`);
