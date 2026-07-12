import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

if (typeof localStorage.getItem !== "function") {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      }
    }
  });
}

// vite.config.ts sets test.globals=false (explicit imports, no injected test globals),
// so @testing-library/react's automatic per-test cleanup (which normally hooks into a
// detected global test framework) never registers itself — without this, every test
// leaks its rendered DOM into the next one.
afterEach(() => {
  cleanup();
});
