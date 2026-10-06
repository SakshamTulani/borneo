const RULE_FILE = /^packages\/shared\/src\/rules\/([^/]+)\.ts$/;
const ID = /\bD-(\d+)(?:\s*[–-]\s*(?:D-)?(\d+))?\b/g;

/** "D-30–33" cites D-30, D-31, D-32 and D-33. */
function citedIds(content: string): string[] {
  const ids = [...content.matchAll(ID)].flatMap((m) => {
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    return Array.from({ length: Math.max(1, to - from + 1) }, (_, i) => `D-${from + i}`);
  });
  return [...new Set(ids)];
}

/**
 * Every D-xx a rule file cites must exist in DECISIONS.md and be the prefix of a test name
 * ("D-35: …") in that file's own test file. Keeps rules, tests and decisions in step.
 */
export function checkRuleIds(files: Map<string, string>, decisions: string): string[] {
  const known = new Set(
    decisions.match(/^\|\s*(D-\d+)\s*\|/gm)?.map((row) => row.match(/D-\d+/)![0]),
  );
  const errors: string[] = [];
  for (const [path, content] of files) {
    const match = RULE_FILE.exec(path);
    if (!match || path.endsWith('.test.ts')) continue;
    const testPath = path.replace(/\.ts$/, '.test.ts');
    const tests = files.get(testPath);
    const cited = citedIds(content);
    if (cited.length === 0) errors.push(`${path}: cites no D-xx rule`);
    if (tests === undefined) {
      errors.push(`${path}: missing ${testPath}`);
      continue;
    }
    const tested = new Set(
      [...tests.matchAll(/\bit(?:\.each\([^)]*\))?\(\s*['"`](D-\d+):/g)].map((m) => m[1]),
    );
    for (const id of cited) {
      if (!known.has(id)) errors.push(`${path}: ${id} is not in docs/DECISIONS.md`);
      if (!tested.has(id)) errors.push(`${path}: no test named "${id}: …" in ${testPath}`);
    }
  }
  return errors;
}
