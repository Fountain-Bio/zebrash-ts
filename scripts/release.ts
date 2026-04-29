#!/usr/bin/env bun
/**
 * Bump all @zebrash/* packages to a new version (lockstep), commit, and tag.
 *
 * Usage:
 *   bun run release 0.2.0
 *
 * This does NOT push. Push manually after reviewing the commit:
 *   git push origin main && git push origin v0.2.0
 *
 * The tag push triggers `.github/workflows/release-publish.yml`, which
 * builds, runs the full test suite, and publishes all three packages to
 * npm in dependency order.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const PACKAGES = ["core", "node", "browser"] as const;
type Package = (typeof PACKAGES)[number];

function runQuiet(cmd: string): void {
  execSync(cmd, { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
}

function capture(cmd: string): string {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
}

function tagExists(tag: string): boolean {
  try {
    execSync(`git rev-parse ${tag}`, { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function fail(msg: string): never {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

function bumpPackage(pkg: Package, version: string): string {
  const path = resolve(ROOT, "packages", pkg, "package.json");
  const json = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const prev = String(json.version ?? "?");
  json.version = version;
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  return prev;
}

function main(): void {
  const version = process.argv[2];
  if (version === undefined || version === "") {
    fail("usage: bun run release <version>  (example: bun run release 0.2.0)");
  }

  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
    fail(`'${version}' is not valid semver`);
  }

  const branch = capture("git rev-parse --abbrev-ref HEAD");
  if (branch !== "main") {
    fail(`must be on main (currently on '${branch}'); switch with \`git switch main\``);
  }

  if (capture("git status --porcelain") !== "") {
    fail("working tree is dirty — commit or stash first");
  }

  const tag = `v${version}`;
  if (tagExists(tag)) {
    fail(`tag ${tag} already exists`);
  }

  process.stdout.write(`bumping all packages to ${version}:\n`);
  for (const pkg of PACKAGES) {
    const prev = bumpPackage(pkg, version);
    process.stdout.write(`  @zebrash/${pkg}: ${prev} → ${version}\n`);
  }

  // Normalize formatting so the diff is just the version bumps.
  runQuiet("bun run format");

  for (const pkg of PACKAGES) {
    runQuiet(`git add packages/${pkg}/package.json`);
  }
  // `[skip ci]` keeps the version-bump commit from re-triggering CI on
  // main — release-publish.yml runs on the tag and is the only check
  // that matters for this commit. CI already ran on the parent SHA.
  runQuiet(`git commit -m "chore: release ${tag} [skip ci]"`);
  runQuiet(`git tag ${tag}`);

  process.stdout.write(`\n✓ committed and tagged ${tag}\n`);
  process.stdout.write(`\nnext: git push origin main && git push origin ${tag}\n`);
  process.stdout.write("      (the tag push triggers .github/workflows/release-publish.yml)\n");
}

main();
