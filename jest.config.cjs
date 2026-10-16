/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
        diagnostics: { warnOnly: false },
      },
    ],
    // `jose` v6 ships ESM only. Transpile it to CJS for Jest, which runs on
    // CommonJS. Without this, importing it throws
    // "Cannot use import statement outside a module".
    "^.+\\.js$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
        diagnostics: false,
      },
    ],
  },
  // By default node_modules is not transformed; jose is the exception.
  transformIgnorePatterns: ["node_modules/(?!jose)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // App-router code imports `cache` from react, which plain React 18.3 does
    // not export in CJS. Next.js ships (and runs) its own compiled React that
    // does, so mirror that here for Jest.
    "^react$": "next/dist/compiled/react",
  },
  clearMocks: true,
  collectCoverageFrom: ["src/lib/**/*.ts", "src/server/**/*.ts"],
};
