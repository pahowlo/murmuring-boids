#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import process from "node:process"

// biome-ignore lint/style/noNonNullAssertion: always defined
const ROOT_DIR = resolve(import.meta.dirname!, "..")
console.log(`ROOT_DIR    = ${ROOT_DIR}\n`)

/** Run a node_modules/.bin command; throws on non-zero exit. */
async function run(cmd: string, ...args: string[]): Promise<void> {
  const { code } = await new Deno.Command(join(ROOT_DIR, "node_modules", ".bin", cmd), { args }).spawn().status
  if (code !== 0) throw new Error(`${cmd} exited with code ${code}`)
}

async function build() {
  const targetDir = join(ROOT_DIR, "target")

  // Remove target directory (if it exists) for a clean build
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true })
  }

  // Transpile TS into JS with type annotations
  await buildTargetDist(targetDir)

  // Truncate package.json to keep only relevant fields
  buildTargetPackageJson(targetDir)

  console.log("Build completed successfully.")
}

async function buildTargetDist(targetDir: string): Promise<void> {
  const distDir = join(targetDir, "dist")
  try {
    await run("tsc", "--outDir", distDir)
  } catch (err) {
    console.error(`ERROR: Failed to transpile TS to JS+D.TS: ${err}`)
    process.exit(1)
  }
}

function buildTargetPackageJson(targetDir: string): void {
  const packagePath = join(ROOT_DIR, "package.json")
  const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"))
  // Defensive assert to verify package.json doesn't contain random stuff
  const isMap = (o: object) => typeof o === "object" && o !== null && !Array.isArray(o)
  if (!isMap(packageJson)) {
    console.error(`ERROR: package.json is not a JSON configuration: ${packagePath}`)
    process.exit(1)
  }

  const requiredKeys = ["name", "version", "description", "author", "main", "exports", "dependencies"]
  const optionalKeys = ["license", "types", "packageManager", "repository", "publishConfig", "keywords"]

  // Build the new object using a simple reduce
  var targetPackageJson: Record<string, object> = {}
  var missingKeys: Array<string> = []
  // Add required keys
  requiredKeys.forEach((k) => {
    if (k in packageJson) {
      targetPackageJson[k] = packageJson[k]
    } else {
      missingKeys.push(`"${k}"`)
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
    JSON.stringify(targetPackageJson, null, 2).replaceAll("/src/", "/dist/").replaceAll('"src/', '"dist/'),
  )
}

build()
