import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// vite.config.ts sets test.globals=false (explicit imports, no injected test globals),
// so @testing-library/react's automatic per-test cleanup (which normally hooks into a
// detected global test framework) never registers itself — without this, every test
// leaks its rendered DOM into the next one.
afterEach(() => {
  cleanup();
});
