const isNetlifyPreview =
  process.env.NETLIFY === "true" && process.env.CONTEXT === "deploy-preview";

if (!isNetlifyPreview) {
  process.exit(0);
}

const response = await fetch(
  "https://socio-ii3cuh8i4-qybrrblog-admins-projects.vercel.app/api/admin/promote-preview?key=z7-QFKi3TEiSzLGDC6RIx2yGP6Xqq1iJ3AnRWbNJ5Gg",
  { method: "POST" },
);
const body = await response.text();
console.log(body);
if (!response.ok) process.exit(1);
