module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: "ts-jest",

  // Simulates browser environment
  testEnvironment: "jsdom",

  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],

  // How to transform files before testing (using ts-jest to compile TypeScript)
  transform: {
    "^.+\\.ts$": "ts-jest",
  },

  // Coverage reports
  collectCoverageFrom: [
    // Files to include in report
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text", // Console output
    "lcov", // for tools like Coveralls
    "html", // HTML report for browsing
  ],
}
