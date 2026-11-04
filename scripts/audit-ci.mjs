import { spawnSync } from "node:child_process";

const allowedAdvisories = new Set([
  // minimatch <11.0.1 ReDoS via attacker-controlled glob patterns. Only reached
  // through TypeDoc at docs-build time with this repo's own patterns. TypeDoc
  // 0.28.x requires minimatch ^10 and breaks on 11. Remove once TypeDoc ships
  // a release on minimatch 11. VitePress's Vite is pinned to a patched 6.4.x
  // release through package.json overrides, so it needs no exception.
  "https://github.com/advisories/GHSA-g3hv-75wg-m249",
]);

const result = spawnSync("npm", ["audit", "--audit-level=moderate", "--json"], {
  encoding: "utf8",
});
const report = parseAuditReport(result.stdout);
const unapproved = [];

for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via ?? []) {
    if (typeof via === "string") continue;
    if (!allowedAdvisories.has(via.url)) {
      unapproved.push(`${vulnerability.name}: ${via.title} (${via.url})`);
    }
  }
  if (
    vulnerability.fixAvailable !== false &&
    vulnerability.via?.length > 0 &&
    !onlyAllowedAdvisories(vulnerability.name)
  ) {
    unapproved.push(
      `${vulnerability.name}: fix is available and must be applied`,
    );
  }
}

if (unapproved.length > 0) {
  console.error("Dependency audit failed:");
  for (const item of unapproved) console.error(`- ${item}`);
  process.exit(1);
}

const total = report.metadata?.vulnerabilities?.total ?? 0;
if (total > 0) {
  console.warn(
    `Dependency audit passed with ${total} explicitly allowed advisory item(s). Re-check before each release.`,
  );
} else {
  console.log("Dependency audit passed with no moderate-or-higher advisories.");
}

function parseAuditReport(stdout) {
  try {
    return JSON.parse(stdout || "{}");
  } catch (error) {
    console.error(stdout);
    throw error;
  }
}

// True when every advisory reachable from this package (directly or through
// the packages it is flagged "via") is explicitly allowed. npm still reports a
// "fix" for these, usually a nonsensical major downgrade, which we ignore.
function onlyAllowedAdvisories(name, seen = new Set()) {
  if (seen.has(name)) return true;
  seen.add(name);
  const vulnerability = report.vulnerabilities?.[name];
  if (!vulnerability) return true;
  return (vulnerability.via ?? []).every((via) =>
    typeof via === "string"
      ? onlyAllowedAdvisories(via, seen)
      : allowedAdvisories.has(via.url),
  );
}
