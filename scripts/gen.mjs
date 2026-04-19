#!/usr/bin/env node
/**
 * Fetch the latest App Store Connect OpenAPI specification from Apple and
 * regenerate `src/generated/openapi.d.ts`.
 *
 * Apple publishes the spec as a `.zip` archive containing a single JSON file.
 * This script:
 *   1. Downloads the archive to memory via `fetch`.
 *   2. Extracts the JSON spec to a temp directory.
 *   3. Runs `openapi-typescript` against the JSON to emit TypeScript types.
 *   4. Cleans up the temp directory.
 *
 * Run with `pnpm gen`. The generated file is committed so that consumers of
 * this library do not need to re-run codegen during install.
 *
 * When Apple bumps the spec version, re-run this script and commit the diff.
 */

import { execFile as execFileCb } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import AdmZip from 'adm-zip';

const execFile = promisify(execFileCb);

/**
 * URL of Apple's App Store Connect OpenAPI specification archive.
 *
 * Updated manually when Apple publishes a new major version. As of this
 * writing, the archive contains spec version 4.3.
 */
const SPEC_URL =
  'https://developer.apple.com/sample-code/app-store-connect/app-store-connect-openapi-specification.zip';

/** Directory (relative to the repo root) where generated TS files live. */
const OUT_DIR = 'src/generated';

/** Path of the emitted TypeScript declaration file. */
const OUT_FILE = join(OUT_DIR, 'openapi.d.ts');

async function main() {
  console.log(`→ Fetching ${SPEC_URL}`);
  const response = await fetch(SPEC_URL);
  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`,
    );
  }
  const zipBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`→ Downloaded ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  const zip = new AdmZip(zipBuffer);
  const jsonEntries = zip.getEntries().filter((entry) => {
    // Drop macOS resource-fork entries (`__MACOSX/._*`) and `.DS_Store`.
    const name = entry.entryName;
    if (entry.isDirectory) return false;
    if (name.startsWith('__MACOSX/') || name.split('/').pop()?.startsWith('._'))
      return false;
    return name.endsWith('.json');
  });

  if (jsonEntries.length === 0) {
    throw new Error('No JSON file found in archive');
  }
  if (jsonEntries.length > 1) {
    const names = jsonEntries.map((e) => e.entryName).join(', ');
    throw new Error(`Expected exactly one JSON file in archive, found: ${names}`);
  }

  const specEntry = jsonEntries[0];
  console.log(`→ Extracted ${specEntry.entryName}`);

  // Peek at the spec's version to surface it in the log.
  const specJson = JSON.parse(specEntry.getData().toString('utf8'));
  const specVersion = specJson?.info?.version ?? 'unknown';
  console.log(`→ Spec version: ${specVersion}`);

  const tempDir = await mkdtemp(join(tmpdir(), 'asc-openapi-'));
  const jsonPath = join(tempDir, 'openapi.json');
  await writeFile(jsonPath, specEntry.getData());

  try {
    await mkdir(OUT_DIR, { recursive: true });
    console.log(`→ Generating ${OUT_FILE}`);
    const { stdout, stderr } = await execFile('npx', [
      '--no-install',
      'openapi-typescript',
      jsonPath,
      '-o',
      OUT_FILE,
    ]);
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    console.log(`✓ Generated ${OUT_FILE} (spec v${specVersion})`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

await main();
