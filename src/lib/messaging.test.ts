import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const mockGetToken = mock(() => Promise.resolve("fresh-token"));
const mockDeleteToken = mock(() => Promise.resolve());
const mockIsSupported = mock(() => Promise.resolve(true));

mock.module("firebase/messaging", () => ({
  getMessaging: () => ({}),
  getToken: mockGetToken,
  deleteToken: mockDeleteToken,
  isSupported: mockIsSupported,
}));

mock.module("../firebase", () => ({
  app: {},
  auth: {},
  db: {},
  functions: {},
  perf: {},
  analytics: null,
  VAPID_PUBLIC_KEY: "test-vapid-key",
}));

const {
  canOfferPushActivation,
  detectPushPlatform,
  getCurrentPushToken,
  isStandalonePwa,
  waitForServiceWorkerReady,
} = await import("./messaging");

const setUserAgent = (value: string) => {
  Object.defineProperty(globalThis.navigator, "userAgent", {
    value,
    configurable: true,
  });
};

beforeEach(() => {
  mockGetToken.mockClear();
  mockDeleteToken.mockClear();
  mockIsSupported.mockClear();
  mockIsSupported.mockImplementation(() => Promise.resolve(true));
  mockGetToken.mockImplementation(() => Promise.resolve("fresh-token"));
  // Bun stellt navigator bereit, aber kein window. Ohne diesen Stub greift in
  // isStandalonePwa() die SSR-Schutzabfrage und die Funktion liefert immer
  // false. globalThis als window, damit Overrides von matchMedia unten greifen.
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "Notification", {
    value: { permission: "granted" },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis.navigator, "serviceWorker", {
    value: { ready: Promise.resolve({}) },
    configurable: true,
  });
  Object.defineProperty(globalThis, "matchMedia", {
    value: () => ({ matches: false }),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis.navigator, "standalone", {
    value: undefined,
    configurable: true,
  });
});

afterEach(() => {
  mock.restore();
});

describe("detectPushPlatform", () => {
  test("erkennt iOS, Android und Desktop", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    expect(detectPushPlatform()).toBe("ios");
    setUserAgent("Mozilla/5.0 (Linux; Android 14)");
    expect(detectPushPlatform()).toBe("android");
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(detectPushPlatform()).toBe("desktop");
  });
});

describe("canOfferPushActivation", () => {
  test("ohne Push-Unterstützung immer false", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(canOfferPushActivation(false)).toBe(false);
  });

  // iOS gibt die Push-API nur in der installierten Home-Screen-App frei.
  test("iOS nur als installierte PWA", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    expect(canOfferPushActivation(true)).toBe(false);

    Object.defineProperty(globalThis, "matchMedia", {
      value: (query: string) => ({ matches: query === "(display-mode: standalone)" }),
      configurable: true,
      writable: true,
    });
    expect(canOfferPushActivation(true)).toBe(true);
  });

  test("Desktop auch im normalen Tab", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(canOfferPushActivation(true)).toBe(true);
  });
});

describe("isStandalonePwa", () => {
  test("erkennt das iOS-standalone-Flag", () => {
    Object.defineProperty(globalThis.navigator, "standalone", {
      value: true,
      configurable: true,
    });
    expect(isStandalonePwa()).toBe(true);
  });

  test("im normalen Tab false", () => {
    expect(isStandalonePwa()).toBe(false);
  });
});

describe("waitForServiceWorkerReady", () => {
  test("liefert die Registrierung", async () => {
    await expect(waitForServiceWorkerReady()).resolves.toEqual({});
  });

  // navigator.serviceWorker.ready löst nie auf, wenn kein aktiver SW
  // existiert. Ohne Timeout hängt der Toggle unbegrenzt im Ladezustand.
  test("gibt bei Zeitüberschreitung null statt zu hängen", async () => {
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: { ready: new Promise(() => {}) },
      configurable: true,
    });
    await expect(waitForServiceWorkerReady(20)).resolves.toBeNull();
  });
});

describe("getCurrentPushToken", () => {
  test("liefert den Token ohne Permission-Prompt", async () => {
    await expect(getCurrentPushToken()).resolves.toBe("fresh-token");
    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  test("ohne erteilte Berechtigung null, ohne getToken-Aufruf", async () => {
    Object.defineProperty(globalThis, "Notification", {
      value: { permission: "default" },
      configurable: true,
      writable: true,
    });
    await expect(getCurrentPushToken()).resolves.toBeNull();
    expect(mockGetToken).toHaveBeenCalledTimes(0);
  });

  // Safari kann die Subscription still entziehen; getToken wirft dann.
  test("schluckt Fehler und liefert null", async () => {
    mockGetToken.mockImplementation(() => Promise.reject(new Error("revoked")));
    await expect(getCurrentPushToken()).resolves.toBeNull();
  });

  // Läuft absichtlich in den vollen 5-Sekunden-Timeout von
  // waitForServiceWorkerReady, deshalb ein Budget über Buns Standard von 5000ms.
  test("ohne Service Worker null", async () => {
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: { ready: new Promise(() => {}) },
      configurable: true,
    });
    await expect(getCurrentPushToken()).resolves.toBeNull();
  }, 8000);
});
