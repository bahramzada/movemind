import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "server/agent.ts",
        "server/games/registry.ts",
        "server/games/tic-tac-toe/rules.ts",
        "server/games/tic-tac-toe/evaluator.ts",
        "server/schemas.ts",
      ],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
    },
  },
});
