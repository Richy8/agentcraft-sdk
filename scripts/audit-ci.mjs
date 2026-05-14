import { spawnSync } from "node:child_process";

const allowedAdvisories = new Set([
  // VitePress 1.6.4 currently depends on Vite <=6.4.1 and has no upstream fix.
  // This is scoped to local docs/dev-server exposure; CI still fails on any other
  // moderate/high/critical advisory.
  "https://github.com/advisories/GHSA-4w7w-66w2-5vf9",
  "https://github.com/advisories/GHSA-67mh-4wv8-2f99",
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
  if (vulnerability.fixAvailable !== false && vulnerability.via?.length > 0) {
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
