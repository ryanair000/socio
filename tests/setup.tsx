import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

export const fetchMock = vi.fn();
export const uploadMock = vi.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ posts: [] }),
  });
  uploadMock.mockImplementation(async (pathname: string) => ({
    url: `https://store.public.blob.vercel-storage.com/${encodeURIComponent(pathname)}`,
    downloadUrl: "",
    pathname,
    contentType: "image/jpeg",
    contentDisposition: "inline",
  }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  uploadMock.mockReset();
  vi.unstubAllGlobals();
});

vi.mock("@vercel/blob/client", () => ({
  upload: (...args: unknown[]) => uploadMock(...args),
}));
