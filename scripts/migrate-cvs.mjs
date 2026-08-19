#!/usr/bin/env node
/**
 * Move the recovered WordPress CVs into Supabase Storage and repoint
 * applications.cv_url at them.
 *
 *   node scripts/migrate-cvs.mjs --dry-run     inspect, upload nothing
 *   node scripts/migrate-cvs.mjs --limit=25    try a small real batch first
 *   node scripts/migrate-cvs.mjs               the whole archive
 *
 * WHY THIS EXISTS
 * The 4,775 `_attachment` references in the old database point at
 * https://jobs.pac.africa/wp-content/uploads/jobmonster/... on a host that was
 * compromised and wiped in August 2026. The files survived and still resolve
 * today, but leaving a decade of applicant history dependent on that server is
 * exactly the risk this rebuild exists to remove.
 *
 * SAFE TO RE-RUN. It only selects rows whose cv_url still starts with http, so
 * anything already migrated is skipped. Uploads are keyed by content hash, so a
 * partial or interrupted run resumes instead of duplicating.
 *
 * WHY CONTENT HASH RATHER THAN A RANDOM PREFIX
 * 322 basenames repeat across the archive, so a filename cannot identify a file.
 * Hashing also yields one object per distinct CV even when the same person
 * applied to several roles — and because the storage policies match on
 * `applications.cv_url = storage.objects.name`, several applications can safely
 * point at one object.
 *
 * REQUIRES SUPABASE_SERVICE_ROLE_KEY: there is no user session to act as, and
 * historical rows have applicant_id NULL so RLS would hide them.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ARCHIVE_DIR = path.resolve("old-cvs");
const BUCKET = "cvs";
const CONCURRENCY = 6;
const PAGE = 500;

/** The archive root corresponds to this path on the old host. */
const URL_MARKER = "/uploads/jobmonster/";

const MIME = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const LIMIT = Number(argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);

// ── env ────────────────────────────────────────────────────────────────────
function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add the service role key to .env.local (never prefixed NEXT_PUBLIC_):\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=...\n" +
      "From the Supabase dashboard: Settings > API > service_role."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── index the archive ──────────────────────────────────────────────────────
/**
 * Two lookups: exact relative path (authoritative) and basename (fallback, used
 * only when unambiguous). Guessing among 322 repeated basenames would attach
 * the wrong CV to the wrong person, which is worse than leaving it unmigrated.
 */
async function indexArchive(dir) {
  const byRelPath = new Map();
  const byBasename = new Map();
  let ignored = 0;

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!MIME[ext]) {
        ignored++;
        continue;
      }
      const rel = path.relative(dir, full).split(path.sep).join("/");
      byRelPath.set(rel.toLowerCase(), full);
      const key = entry.name.toLowerCase();
      if (!byBasename.has(key)) byBasename.set(key, []);
      byBasename.get(key).push(full);
    }
  }

  await walk(dir);
  return { byRelPath, byBasename, ignored };
}

/** Turns a dead WordPress URL into the archive-relative path it implies. */
function relPathFromUrl(cvUrl) {
  let pathname;
  try {
    pathname = new URL(cvUrl).pathname;
  } catch {
    return null;
  }
  const idx = pathname.toLowerCase().indexOf(URL_MARKER);
  const tail = idx === -1 ? pathname : pathname.slice(idx + URL_MARKER.length);
  try {
    return decodeURIComponent(tail).replace(/^\/+/, "");
  } catch {
    return tail.replace(/^\/+/, "");
  }
}

function safeName(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-90) || "cv"
  );
}

async function mapLimit(items, limit, worker) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        await worker(items[i]);
      }
    })
  );
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(ARCHIVE_DIR)) {
    console.error(`Archive not found: ${ARCHIVE_DIR}`);
    process.exit(1);
  }

  console.log(`${DRY_RUN ? "DRY RUN — " : ""}indexing ${ARCHIVE_DIR} …`);
  const { byRelPath, byBasename, ignored } = await indexArchive(ARCHIVE_DIR);
  console.log(
    `  ${byRelPath.size} candidate files indexed` +
      (ignored ? `, ${ignored} non-CV files ignored` : "")
  );

  // Every row still pointing at the old host.
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("applications")
      .select("id, cv_url")
      .like("cv_url", "http%")
      .order("id")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`Fetching applications: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  const targets = LIMIT > 0 ? rows.slice(0, LIMIT) : rows;
  console.log(
    `  ${rows.length} applications still reference the old host` +
      (LIMIT > 0 ? ` (processing ${targets.length})` : "")
  );

  const stats = {
    uploaded: 0,
    reused: 0,
    rewritten: 0,
    unmatched: 0,
    ambiguous: 0,
    failed: 0,
  };
  const problems = [];
  const matchedFiles = new Set();
  const hashToPath = new Map();
  let done = 0;

  await mapLimit(targets, CONCURRENCY, async (row) => {
    if (++done % 250 === 0) console.log(`  … ${done}/${targets.length}`);

    const rel = relPathFromUrl(row.cv_url);
    if (!rel) {
      stats.unmatched++;
      problems.push(`${row.id}  unparseable url  ${row.cv_url}`);
      return;
    }

    let file = byRelPath.get(rel.toLowerCase());
    if (!file) {
      const candidates = byBasename.get(path.basename(rel).toLowerCase()) ?? [];
      if (candidates.length === 1) {
        file = candidates[0];
      } else if (candidates.length > 1) {
        stats.ambiguous++;
        problems.push(`${row.id}  ambiguous basename x${candidates.length}  ${rel}`);
        return;
      }
    }
    if (!file) {
      stats.unmatched++;
      problems.push(`${row.id}  no file on disk  ${rel}`);
      return;
    }

    matchedFiles.add(file);

    const buffer = await readFile(file);
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const objectPath = `${hash}/${safeName(path.basename(file))}`;
    const contentType = MIME[path.extname(file).toLowerCase()];

    if (DRY_RUN) {
      stats.rewritten++;
      return;
    }

    // One upload per distinct file, even across applications that share it.
    if (hashToPath.has(hash)) {
      stats.reused++;
    } else {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, buffer, { contentType, upsert: true });

      if (uploadError) {
        stats.failed++;
        problems.push(`${row.id}  UPLOAD FAILED  ${uploadError.message}  ${objectPath}`);
        return;
      }
      hashToPath.set(hash, objectPath);
      stats.uploaded++;
    }

    const { error: updateError } = await supabase
      .from("applications")
      .update({ cv_url: objectPath })
      .eq("id", row.id);

    if (updateError) {
      stats.failed++;
      problems.push(`${row.id}  DB UPDATE FAILED  ${updateError.message}`);
      return;
    }
    stats.rewritten++;
  });

  // Files nobody points at — expected, since the archive holds more files than
  // the dump had references.
  const orphans = [...byRelPath.values()].filter((f) => !matchedFiles.has(f));

  console.log("\n── result ─────────────────────────────");
  console.log(`  objects uploaded      ${stats.uploaded}`);
  console.log(`  shared existing       ${stats.reused}`);
  console.log(`  cv_url rewritten      ${stats.rewritten}`);
  console.log(`  no matching file      ${stats.unmatched}`);
  console.log(`  ambiguous basename    ${stats.ambiguous}`);
  console.log(`  failed                ${stats.failed}`);
  console.log(`  archive files unused  ${orphans.length}`);

  if (problems.length) {
    console.log("\n── needs a look (first 40) ────────────");
    for (const line of problems.slice(0, 40)) console.log(`  ${line}`);
    if (problems.length > 40) console.log(`  … ${problems.length - 40} more`);
  }

  if (DRY_RUN) {
    console.log("\nDry run — nothing uploaded, no rows changed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
