import type { Plugin, Rollup } from 'vite';

// Upstream prebundled engines cannot be split at module boundaries. They stay lazy.
const vendorBudgets: Record<string, number> = {
  'mermaid-parser': 700_000,
  'mermaid-elk': 1_500_000,
};
export interface BundleEntry {
  file: string;
  name: string;
  bytes: number;
  entry: boolean;
  imports: string[];
}
export function checkBundle(entries: BundleEntry[]) {
  const byFile = new Map(entries.map((entry) => [entry.file, entry]));
  const eager = new Set<string>();
  const visit = (file: string) => {
    if (eager.has(file)) return;
    eager.add(file);
    byFile.get(file)?.imports.forEach(visit);
  };
  entries.filter((entry) => entry.entry).forEach((entry) => visit(entry.file));
  const violations: string[] = [];
  const chunks = entries.map((entry) => {
    const limit = vendorBudgets[entry.name] ?? 500_000;
    if (entry.bytes > limit)
      violations.push(`${entry.file}: ${entry.bytes} bytes exceeds ${limit}`);
    if (eager.has(entry.file) && /^(?:mermaid-|three-)/.test(entry.name))
      violations.push(`${entry.file}: optional engine entered the initial import graph`);
    return { ...entry, limit, initial: eager.has(entry.file) };
  });
  return { chunks, violations };
}
export function bundleBudget(): Plugin {
  return {
    name: 'bundle-budget',
    enforce: 'post',
    generateBundle(_, bundle) {
      const entries = Object.values(bundle)
        .filter((entry): entry is Rollup.OutputChunk => entry.type === 'chunk')
        .map((entry) => ({
          file: entry.fileName,
          name: entry.name,
          bytes: Buffer.byteLength(entry.code),
          entry: entry.isEntry,
          imports: entry.imports,
        }));
      const report = checkBundle(entries);
      if (report.violations.length) this.error(report.violations.join('\n'));
      this.emitFile({
        type: 'asset',
        fileName: 'bundle-report.json',
        source: JSON.stringify(report, null, 2) + '\n',
      });
    },
  };
}
