import { redirect } from "next/navigation";
import { ImportManager } from "@/components/import-manager";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  if (!(await getSession())) redirect("/login");
  return <ImportManager />;
}
