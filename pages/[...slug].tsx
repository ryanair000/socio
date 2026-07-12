import Head from "next/head";
import type { GetStaticPaths, GetStaticProps } from "next";
import { routes, type RouteProps } from "../components/socio/ui";
import { Login, Onboarding } from "../components/socio/views-auth";
import {
  Campaigns,
  ContentBoard,
  Dashboard,
  Planner,
} from "../components/socio/views-planning";
import { Approval, Studio } from "../components/socio/views-creative";
import {
  Assets,
  Products,
  Publishing,
} from "../components/socio/views-publishing";
import { Analytics, Engagement } from "../components/socio/views-growth";
import { Automations, Team } from "../components/socio/views-admin";
import { SettingsView } from "../components/socio/views-settings";

function App({ route }: RouteProps) {
  const r = route.replace(/^\//, "");
  let view: React.ReactNode;
  if (r === "login") view = <Login />;
  else if (r === "onboarding/workspace") view = <Onboarding step="workspace" />;
  else if (r === "onboarding/connections")
    view = <Onboarding step="connections" />;
  else if (r === "dashboard") view = <Dashboard />;
  else if (r === "planner") view = <Planner />;
  else if (r === "campaigns") view = <Campaigns />;
  else if (r === "content") view = <ContentBoard />;
  else if (r.startsWith("studio")) view = <Studio />;
  else if (r.startsWith("approvals")) view = <Approval />;
  else if (r.startsWith("publishing")) view = <Publishing />;
  else if (r === "assets") view = <Assets />;
  else if (r === "products") view = <Products />;
  else if (r === "engagement") view = <Engagement />;
  else if (r === "analytics") view = <Analytics />;
  else if (r === "automations") view = <Automations />;
  else if (r.startsWith("automations/")) view = <Automations builder />;
  else if (r === "team") view = <Team />;
  else if (r === "settings/integrations")
    view = <SettingsView kind="integrations" />;
  else if (r === "settings/brand") view = <SettingsView kind="brand" />;
  else if (r === "settings/notifications")
    view = <SettingsView kind="notifications" />;
  else view = <Dashboard />;
  return (
    <>
      <Head>
        <title>Socio — Social Media Operations</title>
        <meta
          name="description"
          content="Plan, create, approve, publish and measure social media content."
        />
      </Head>
      {view}
    </>
  );
}
export default App;
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: routes.map((route) => ({ params: { slug: route.split("/") } })),
  fallback: false,
});
export const getStaticProps: GetStaticProps = async (c) => ({
  props: { route: ((c.params?.slug as string[]) || ["login"]).join("/") },
});
