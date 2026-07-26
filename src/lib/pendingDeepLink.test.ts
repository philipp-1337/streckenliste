import { describe, expect, test } from "bun:test";
import { PENDING_DEEP_LINK_MAX_AGE_MS, toRouterPath } from "./pendingDeepLink";

describe("toRouterPath", () => {
  test("nimmt relative Pfade", () => {
    expect(toRouterPath("/?eintrag=abc", "https://app.example")).toBe("/?eintrag=abc");
  });

  test("nimmt absolute Same-Origin-URLs und kürzt auf den Pfad", () => {
    expect(toRouterPath("https://app.example/?eintrag=abc", "https://app.example")).toBe("/?eintrag=abc");
  });

  test("lehnt fremde Origins ab", () => {
    expect(toRouterPath("https://evil.example/?eintrag=abc", "https://app.example")).toBeNull();
  });

  test("lehnt unbrauchbare Werte ab", () => {
    expect(toRouterPath("", "https://app.example")).toBeNull();
    expect(toRouterPath("javascript:alert(1)", "https://app.example")).toBeNull();
  });

  test("erhält den Hash", () => {
    expect(toRouterPath("/stats#top", "https://app.example")).toBe("/stats#top");
  });
});

describe("PENDING_DEEP_LINK_MAX_AGE_MS", () => {
  test("ist fünf Minuten", () => {
    expect(PENDING_DEEP_LINK_MAX_AGE_MS).toBe(5 * 60 * 1000);
  });
});
