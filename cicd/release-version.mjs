#!/usr/bin/env node
/**
 * Resolves the next release version from existing git tags.
 *
 * Usage:
 *   node scripts/release-version.mjs <rc|stable> [explicit-semver]
 *
 * - `stable`: next patch version after the latest stable tag (v1.2.3 -> v1.2.4).
 * - `rc`: next pre-release for the current base:
 *     - continues the rc cycle when the base has no stable release yet
 *       (v1.2.0-rc.1 -> v1.2.0-rc.2);
 *     - otherwise starts a fresh rc for the next patch (v1.2.0-rc.3 + v1.2.0
 *       released -> v1.2.1-rc.1).
 * - explicit-semver: validates and prints it verbatim.
 */
import { execSync } from "node:child_process";

const type = process.argv[2];
const explicit = (process.argv[3] || "").trim();

if (type !== "rc" && type !== "stable") {
  console.error("Usage: node scripts/release-version.mjs <rc|stable> [version]");
  process.exit(1);
}

if (explicit) {
  if (!/^\d+\.\d+\.\d+(-rc\.\d+)?$/.test(explicit)) {
    console.error(`Invalid semver: ${explicit}`);
    process.exit(1);
  }
  console.log(explicit);
  process.exit(0);
}

const tags = execSync("git tag --sort=-v:refname", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const parse = (tag) => {
  const m = tag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/);
  return m
    ? { major: +m[1], minor: +m[2], patch: +m[3], rc: m[4] ? +m[4] : null }
    : null;
};

const cmp = (a, b) =>
  a.major - b.major ||
  a.minor - b.minor ||
  a.patch - b.patch ||
  (a.rc ?? 0) - (b.rc ?? 0);

const parsed = tags.map(parse).filter(Boolean);
const stables = parsed.filter((v) => v.rc === null).sort(cmp);
const rcs = parsed.filter((v) => v.rc !== null).sort(cmp);
const lastStable = stables.at(-1);

let version;
if (type === "stable") {
  version = lastStable
    ? `${lastStable.major}.${lastStable.minor}.${lastStable.patch + 1}`
    : "0.1.0";
} else {
  const lastRc = rcs.at(-1);
  if (lastRc) {
    const stableForBase = stables.find(
      (s) =>
        s.major === lastRc.major &&
        s.minor === lastRc.minor &&
        s.patch === lastRc.patch
    );
    if (!stableForBase) {
      version = `${lastRc.major}.${lastRc.minor}.${lastRc.patch}-rc.${lastRc.rc + 1}`;
    } else {
      const base = lastStable || { major: 0, minor: 0, patch: 0 };
      version = `${base.major}.${base.minor}.${base.patch + 1}-rc.1`;
    }
  } else {
    version = lastStable
      ? `${lastStable.major}.${lastStable.minor}.${lastStable.patch + 1}-rc.1`
      : "0.1.0-rc.1";
  }
}

console.log(version);
