import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

export const routerPush = vi.fn();
export const fetchMock = vi.fn();

const integrationHealth = {
  source: "SMMPRO",
  graphVersion: "v20.0",
  services: {
    openai: { configured: true, healthy: true },
    telegram: {
      configured: true,
      healthy: true,
      allowedChatCount: 2,
      webhookSecretConfigured: true,
    },
    metaApp: { configured: true, healthy: true },
    auth: { configured: true, healthy: true },
  },
  accounts: [
    {
      id: "chezahub",
      name: "ChezaHub",
      facebook: { configured: true, healthy: true, label: "ChezaHub Page" },
      instagram: { configured: true, healthy: true, label: "@chezahub" },
    },
    {
      id: "jengasites",
      name: "JengaSites",
      facebook: { configured: true, healthy: true, label: "JengaSites Page" },
      instagram: { configured: true, healthy: true, label: "@jengasites" },
    },
  ],
};

function response(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

beforeEach(() => {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/auth")) return response({ success: true });
    if (url.includes("/api/integrations/status")) return response(integrationHealth);
    if (url.includes("/api/generate")) {
      return response({ caption: "Generated caption from SMMPRO." });
    }
    if (url.includes("/api/publish")) {
      return response({
        success: true,
        results: [
          { target: "ChezaHub Facebook", status: "Success", id: "fb-1" },
          { target: "ChezaHub Instagram", status: "Success", id: "ig-1" },
        ],
      });
    }
    return response({ success: true });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  routerPush.mockReset();
  fetchMock.mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

vi.mock("next/router", () => ({
  useRouter: () => ({
    push: routerPush,
    pathname: "/",
    query: {},
    asPath: "/",
  }),
}));

vi.mock("next/head", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : href.pathname} {...props}>
      {children}
    </a>
  ),
}));
