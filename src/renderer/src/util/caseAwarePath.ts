import * as path from "path";

import * as fs from "./fs";

/**
 * Resolve a relative path under rootDir using the on-disk directory entry casing.
 * Returns undefined when a path component is missing.
 */
export async function resolveCaseAwarePath(
  rootDir: string,
  relativePath: string,
): Promise<string | undefined> {
  const parts = relativePath.split(/[/\\]/).filter((part) => part.length > 0);
  let current = rootDir;

  for (const part of parts) {
    let entries: string[];
    try {
      entries = await fs.readdirAsync(current);
    } catch {
      return undefined;
    }

    const exact = entries.find((entry) => entry === part);
    if (exact !== undefined) {
      current = path.join(current, exact);
      continue;
    }

    const caseInsensitive = entries.find((entry) => entry.toLowerCase() === part.toLowerCase());
    if (caseInsensitive !== undefined) {
      current = path.join(current, caseInsensitive);
      continue;
    }

    current = path.join(current, part);
  }

  return current;
}

/**
 * Verify that each required file exists under gamePath, tolerating case differences
 * on case-sensitive filesystems.
 */
export async function verifyRequiredFiles(
  gamePath: string,
  requiredFiles: string[],
): Promise<void> {
  for (const file of requiredFiles) {
    const resolved = await resolveCaseAwarePath(gamePath, file);
    if (resolved === undefined) {
      throw Object.assign(new Error(`ENOENT: required file missing: ${file}`), { code: "ENOENT" });
    }

    try {
      await fs.statAsync(resolved);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw Object.assign(new Error(`ENOENT: required file missing: ${file}`), {
          code: "ENOENT",
        });
      }
      throw err;
    }
  }
}

/**
 * Detect whether a relative deploy path disagrees with existing on-disk directory casing.
 */
export async function findCaseMismatchOnDisk(
  rootDir: string,
  relativePath: string,
): Promise<string | undefined> {
  const parts = relativePath.split(/[/\\]/).filter((part) => part.length > 0);
  let current = rootDir;

  for (const part of parts) {
    let entries: string[];
    try {
      entries = await fs.readdirAsync(current);
    } catch {
      return undefined;
    }

    const exact = entries.find((entry) => entry === part);
    if (exact !== undefined) {
      current = path.join(current, exact);
      continue;
    }

    const caseInsensitive = entries.find((entry) => entry.toLowerCase() === part.toLowerCase());
    if (caseInsensitive !== undefined && caseInsensitive !== part) {
      return `${relativePath}: expected "${caseInsensitive}" but mod uses "${part}"`;
    }

    return undefined;
  }

  return undefined;
}

export async function collectCaseMismatchWarnings(
  destinationPath: string,
  relativePaths: string[],
): Promise<string[]> {
  if (process.platform === "win32") {
    return [];
  }

  const warnings = new Set<string>();
  for (const relPath of relativePaths) {
    const mismatch = await findCaseMismatchOnDisk(destinationPath, relPath);
    if (mismatch !== undefined) {
      warnings.add(mismatch);
    }
  }
  return Array.from(warnings);
}
