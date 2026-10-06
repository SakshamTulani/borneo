import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SKIP = new Set(['node_modules', '.git', '.output', 'dist', 'coverage', '.tanstack']);

/** Repo-relative POSIX paths of all files under `dir`. */
export function listFiles(root: string, dir = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const full = join(dir, entry.name);
    return entry.isDirectory()
      ? listFiles(root, full)
      : [relative(root, full).split(sep).join('/')];
  });
}

export function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8');
}
