import fs from "node:fs";
import path from "node:path";

const cases = {
  "": "Welcome back",
  login: "Welcome back",
  "onboarding/workspace": "Create your workspace",
  "onboarding/connections": "Connect your channels",
  dashboard: "Good evening, Boss",
  planner: "Weekly Planner",
  campaigns: "Campaign Manager",
  content: "Content Board",
  "studio/post-1": "Creative Studio",
  "approvals/post-1": "Review: Spider-Man 2 Best Region Deal",
  "publishing/job-1": "Publishing Job #PUB-2841",
  assets: "Asset Library",
  products: "Product Feed",
  engagement: "Engagement Inbox",
  analytics: "Analytics & Attribution",
  automations: "Automations",
  "automations/rule-1": "Automation Rule Builder",
  team: "Team & Roles",
  "settings/integrations": "Integrations & Token Health",
  "settings/brand": "Brand Settings",
  "settings/notifications": "Notification Preferences",
};

const failures = [];
const output = path.resolve("out");
for (const [route, heading] of Object.entries(cases)) {
  const file = route
    ? path.join(output, route, "index.html")
    : path.join(output, "index.html");
  if (!fs.existsSync(file)) {
    failures.push(`${route || "/"}: missing ${file}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  if (
    !html.includes(heading.replace("&", "&amp;")) &&
    !html.includes(heading)
  ) {
    failures.push(`${route || "/"}: missing heading ${heading}`);
  }
  if (!html.includes("Socio — Social Media Operations")) {
    failures.push(`${route || "/"}: missing page title`);
  }
  if (html.includes("APP_CONTENT") || html.includes("APP_TEST_")) {
    failures.push(`${route || "/"}: unresolved template placeholder`);
  }
}

const allHtml = Object.keys(cases)
  .map((route) => {
    const file = route
      ? path.join(output, route, "index.html")
      : path.join(output, "index.html");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  })
  .join("\n");
const links = [...allHtml.matchAll(/href="\/(?!_next)([^"?#]*)/g)].map(
  (match) => match[1].replace(/\/$/, ""),
);
for (const link of new Set(links)) {
  if (!link) continue;
  const target = path.join(output, link, "index.html");
  if (!fs.existsSync(target)) failures.push(`broken internal route: /${link}`);
}

if (failures.length) {
  console.error(`Route verification failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(
  `Verified ${Object.keys(cases).length} static routes and ${new Set(links).size} internal links.`,
);
