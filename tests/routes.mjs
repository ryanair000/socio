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
  "/imports/page",
  "/api/auth/route",
  "/api/logout/route",
  "/api/uploads/route",
  "/api/captions/route",
  "/api/posts/route",
  "/api/posts/[id]/route",
  "/api/posts/[id]/retry/route",
  "/api/posts/[id]/publish-now/route",
  "/api/posts/[id]/approve/route",
  "/api/posts/[id]/cancel/route",
  "/api/posts/[id]/duplicate/route",
  "/api/import/week1/route",
  "/api/imports/route",
  "/api/imports/[id]/route",
  "/api/imports/[id]/approve/route",
  "/api/imports/[id]/commit/route",
  "/api/imports/[id]/schedule/route",
  "/api/imports/[id]/cancel/route",
  "/api/skill/imports/route",
  "/api/skill/imports/[id]/route",
  "/api/skill/imports/[id]/[action]/route",
  "/api/skill-key/route",
  "/api/mcp/route",
  "/api/cron/publish-due/route",
  "/api/connections/route",
];

const missing = expected.filter((route) => !manifest[route]);
if (missing.length) {
  console.error(`Missing production routes: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`Verified ${expected.length} focused production routes.`);
