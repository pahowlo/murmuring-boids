#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT_DIR = resolve(import.meta.dir, "..");
console.log(`ROOT_DIR    = ${ROOT_DIR}\n`);

async function bundle() {
  const targetDir = join(ROOT_DIR, "target");

  // Remove target directory (if it exists) for a clean build
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }

  // Transpile TS into JS with type annotations
  await buildTargetDist(targetDir)

  // Truncate package.json to keep only relevant fields
  buildTargetPackageJson(targetDir)

  console.log("Build completed successfully.");
}

async function buildTargetDist(targetDir: string): Promise<void> {
  const distDir = join(targetDir, "dist");
  try {
    await $`bun tsc --outDir ${distDir}`;
  } catch (err) {
    console.error(`ERROR: Failed to transpile TS to JS+D.TS: ${err}`);
    process.exit(1);
  }
}

function buildTargetPackageJson(targetDir: string): void {
  const packagePath = join(ROOT_DIR, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
  // Defensive assert to verify package.json doesn't contain random stuff
  const isMap = (o: any) => typeof o === 'object' && o !== null && !Array.isArray(o);
  if (!isMap(packageJson)) {
    console.error(`ERROR: package.json is not a JSON configuration: ${packagePath}`);
    process.exit(1);
  }

  const requiredKeys = [
    "name",
    "version",
    "description",
    "author",
    "main",
    "exports",
    "dependencies",
  ];
  const optionalKeys = [
    "license",
    "types",
    "packageManager",
    "repository",
    "publishConfig",
    "keywords",
  ];

  // Build the new object using a simple reduce
  var targetPackageJson: Record<string, any> = {};
  var missingKeys: Array<string> = []
  // Add required keys
  requiredKeys.forEach((k) => {
    if (k in packageJson) {
      targetPackageJson[k] = packageJson[k]
    } else {
      missingKeys.push(`"${k}"`);
    }
  })
  if (missingKeys.length > 0) {
    console.error(`ERROR: Missing expected fields from package.json: ${missingKeys.join(", ")}`)
  }
  // Add optional keys
  optionalKeys.forEach((k) => {
    if (k in packageJson) {
      targetPackageJson[k] = packageJson[k]
    }
  })

  writeFileSync(
    join(targetDir, "package.json"),
    // Dirty replace to update configuration paths
    JSON.stringify(targetPackageJson, null, 2)
      .replaceAll("/src/", "/dist/")
      .replaceAll("\"src/", "\"dist/")
  );
}


bundle();
