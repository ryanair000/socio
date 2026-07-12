import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

export const routerPush = vi.fn();

afterEach(() => {
  cleanup();
  routerPush.mockReset();
  window.localStorage.clear();
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
