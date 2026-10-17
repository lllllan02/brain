import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseDocument, renderDocument, attachBacklinks } from '../apps/web/src/library.ts';
import { documentTime } from '../apps/web/src/document-dates.ts';
import { CONTENT_COLLECTIONS, collectionRegistry } from '../apps/web/src/collections.ts';
import type { LibraryDocument, ParsedDocument } from '../apps/web/src/types/library.ts';
import { record } from '../apps/web/src/data/validation.ts';
import { unescapedTableLinks } from '../apps/web/src/markdown-table-links.ts';

interface Options {
  dirs: string[];
  limit: number;
  json: boolean;
  terms: string[];
}
type Document = LibraryDocument & { backlinks: string[] };
interface Library {
  files: string[];
  documents: Document[];
  rawByPath: Map<string, string>;
  duplicates: string[];
  parseErrors: { file: string; reason: string }[];
}
export interface Output {
  write(text: string): void;
  log(text: string): void;
  error(text: string): void;
}
const output: Output = {
  write: (text) => {
    process.stdout.write(text);
  },
  log: (text) => console.log(text),
  error: (text) => console.error(text),
};
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const DEFAULT_DIRS = CONTENT_COLLECTIONS.map((dir) => `content/${dir}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function walk(root: string, dir: string): Promise<string[]> {
  const out: string[] = [];
  const abs = path.join(root, dir);
  let entries;
  try {
    entries = await readdir(abs, { withFileTypes: true });
  } catch (error) {
    if (record(error) && error.code === 'ENOENT') return out;
    throw error;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(root, rel)));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

// 解析全部候选文档；parseDocument 失败的内容记录为错误，不中断其余文档。
export async function buildLibrary(
  root: string,
  dirs: string[],
  relations = true,
): Promise<Library> {
  const files = [...new Set((await Promise.all(dirs.map((dir) => walk(root, dir)))).flat())].sort();

  const parsed: ParsedDocument[] = [];
  const rawByPath = new Map<string, string>();
  const parseErrors = [];
  const duplicates = [];
  const seen = new Set();

  for (const file of files) {
    const raw = await readFile(path.join(root, file), 'utf8');
    let doc;
    try {
      doc = parseDocument(raw, file);
    } catch (error) {
      parseErrors.push({
        file: file.replaceAll(path.sep, '/'),
        reason: message(error),
      });
      continue;
    }
    if (seen.has(doc.id)) duplicates.push(doc.id);
    seen.add(doc.id);
    rawByPath.set(doc.path, raw);
    parsed.push(doc);
  }

  const rendered = parsed.map((doc) => renderDocument(doc, parsed, { highlightCode: false }));
  const documents = relations
    ? attachBacklinks(rendered)
    : rendered.map((doc) => ({ ...doc, backlinks: [] }));
  return { files, documents, rawByPath, duplicates, parseErrors };
}

function indexRecord(doc: Document) {
  return {
    path: doc.path,
    id: doc.id,
    title: doc.title,
    parent: doc.parent,
    parentTarget: doc.parentTarget,
    aliases: doc.aliases,
    category: doc.category,
    tags: doc.tags,
    type: doc.type,
    created: doc.created,
    updated: doc.updated,
    summary: doc.summary,
    headings: doc.toc.filter((t) => t.level > 1).map((t) => t.title),
    links: [...new Set(doc.references.map((r) => r.id))],
    broken: doc.issues.map((i) => ({ target: i.target, reason: i.reason })),
    backlinks: doc.backlinks,
  };
}

function matchLines(body: string, terms: string[], max = Infinity) {
  const needles = terms.map((t) => t.toLowerCase());
  const out: { line: number; text: string }[] = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const low = lines[i].toLowerCase();
    if (needles.some((needle) => low.includes(needle))) {
      out.push({ line: i + 1, text: lines[i].trim().slice(0, 160) });
      if (out.length >= max) break;
    }
  }
  return out;
}

function scoreDoc(doc: Document, terms: string[]) {
  const fields = new Set();
  let score = 0;
  for (const term of terms) {
    const t = term.toLowerCase();
    if (doc.id.toLowerCase().includes(t)) {
      score += 10;
      fields.add('文件名');
    }
    if (doc.title.toLowerCase().includes(t)) {
      score += 8;
      fields.add('标题');
    }
    if (doc.aliases.some((a) => a.toLowerCase().includes(t))) {
      score += 6;
      fields.add('别名');
    }
    if (doc.tags.some((x) => x.toLowerCase().includes(t))) {
      score += 4;
      fields.add('标签');
    }
    if (doc.category.toLowerCase().includes(t)) {
      score += 3;
      fields.add('分类');
    }
    if (doc.toc.some((h) => h.title.toLowerCase().includes(t))) {
      score += 3;
      fields.add('小节');
    }
    if (doc.summary.toLowerCase().includes(t)) {
      score += 2;
      fields.add('摘要');
    }
  }
  const bodyHits = matchLines(doc.body, terms).length;
  if (bodyHits) {
    score += bodyHits;
    fields.add(`正文×${bodyHits}`);
  }
  return { score, fields: [...fields] };
}

export function parseOptions(args: string[]): Options {
  const options: Options = {
    dirs: [...DEFAULT_DIRS],
    limit: 20,
    json: false,
    terms: [],
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      options.terms.push(...args.slice(i + 1));
      break;
    }
    if (arg === '--json') options.json = true;
    else if (arg === '--dirs' || arg === '--limit') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw Error(`${arg} 缺少参数值。`);
      if (arg === '--dirs') {
        options.dirs = [
          ...new Set(
            value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ];
        if (!options.dirs.length) throw Error('--dirs 至少需要一个目录。');
      } else {
        if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
          throw Error('--limit 必须是正整数。');
        options.limit = Number(value);
      }
    } else if (arg.startsWith('--')) throw Error(`未知选项：${arg}`);
    else options.terms.push(arg);
  }
  return options;
}

const USAGE = `用法：
  npm --silent --prefix apps/web run retrieve -- index
  npm --silent --prefix apps/web run retrieve -- query <词...> [--limit 20] [--dirs ${DEFAULT_DIRS.join(',')}] [--json]
  npm --silent --prefix apps/web run retrieve -- links <文件名|路径>
  npm --silent --prefix apps/web run retrieve -- lint [--json]`;

function doIndex(lib: Library, io: Output) {
  for (const doc of lib.documents) io.write(JSON.stringify(indexRecord(doc)) + '\n');
}

function doQuery(lib: Library, options: Options, io: Output) {
  const ranked = lib.documents
    .map((doc) => ({ doc, ...scoreDoc(doc, options.terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.doc.path < b.doc.path ? -1 : 1))
    .slice(0, options.limit);

  if (options.json) {
    io.write(
      JSON.stringify(
        {
          query: options.terms,
          dirs: options.dirs,
          total: lib.documents.length,
          results: ranked.map((r) => ({
            path: r.doc.path,
            id: r.doc.id,
            title: r.doc.title,
            category: r.doc.category,
            tags: r.doc.tags,
            score: r.score,
            fields: r.fields,
            snippets: matchLines(r.doc.body, options.terms, 4),
          })),
        },
        null,
        2,
      ) + '\n',
    );
    return;
  }

  io.log(
    `检索「${options.terms.join(' ')}」  目录 ${options.dirs.join(',')}  命中 ${ranked.length} / ${lib.documents.length}`,
  );
  ranked.forEach((r, i) => {
    const meta = [r.doc.category || '未分类', ...r.doc.tags].join(' · ');
    io.log(`\n${i + 1}) ${r.doc.id}  [${meta}]`);
    io.log(`   ${r.doc.path}`);
    io.log(`   标题: ${r.doc.title}`);
    io.log(`   命中: ${r.fields.join(', ')}`);
    for (const s of matchLines(r.doc.body, options.terms, 4)) io.log(`   L${s.line}  ${s.text}`);
  });
}

function findDoc(lib: Library, key: string) {
  const wanted = key.replace(/^content\//, '').replace(/\.md$/, '');
  return lib.documents.find(
    (doc) =>
      doc.id === wanted ||
      doc.path.replace(/\.md$/, '') === wanted ||
      doc.path.endsWith('/' + wanted + '.md'),
  );
}

function doLinks(lib: Library, key: string, io: Output) {
  const doc = findDoc(lib, key);
  if (!doc) {
    io.error(`未找到：${key}`);
    return 1;
  }
  const meta = [doc.category || '未分类', ...doc.tags].join(' · ');
  io.log(`${doc.id} — ${doc.title}  [${meta}]`);
  io.log(`路径: ${doc.path}`);
  if (doc.parent)
    io.log(`上级: ${doc.parent.id}${doc.parent.anchor ? '#' + doc.parent.anchor : ''}`);
  io.log(`出链 ${doc.references.length + doc.issues.length}:`);
  for (const ref of doc.references) io.log(`  → ${ref.id}${ref.anchor ? '#' + ref.anchor : ''}`);
  for (const issue of doc.issues) io.log(`  ↯ ${issue.target}  [${issue.reason}]`);
  io.log(`入链 ${doc.backlinks.length}:`);
  for (const id of doc.backlinks) io.log(`  ← ${id}`);
}

function doLint(lib: Library, options: Options, io: Output) {
  const findings: Record<
    | 'duplicate'
    | 'broken'
    | 'parse'
    | 'frontmatter'
    | 'title'
    | 'date'
    | 'name'
    | 'format'
    | 'table'
    | 'orphan',
    string[]
  > = {
    duplicate: [],
    broken: [],
    parse: [],
    frontmatter: [],
    title: [],
    date: [],
    name: [],
    format: [],
    table: [],
    orphan: [],
  };

  for (const id of lib.duplicates) findings.duplicate.push(id);
  for (const error of lib.parseErrors) findings.parse.push(`${error.file}: ${error.reason}`);

  for (const doc of lib.documents) {
    for (const issue of doc.issues)
      findings.broken.push(`${doc.id}: [[${issue.target}]] ${issue.reason}`);
    const raw = lib.rawByPath.get(doc.path) || '';
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) findings.frontmatter.push(`${doc.path} 缺少 frontmatter`);
    else if (!/^title\s*:/m.test(fm[1])) findings.title.push(`${doc.path} 缺少 title`);
    for (const [field, value] of [
      ['created_at', doc.created],
      ['updated_at', doc.updated],
    ]) {
      if (value != null && !Number.isFinite(documentTime(value)))
        findings.date.push(`${doc.id} ${field}=${value} 不是有效日期或带时区、精确到秒的时间`);
    }
    if (documentTime(doc.updated) < documentTime(doc.created)) {
      findings.date.push(`${doc.id} updated_at 早于 created_at`);
    }
    if (!NAME_RE.test(doc.id)) findings.name.push(`${doc.id}.md 不符合小写英文短横线命名`);
    if (doc.backlinks.length === 0) findings.orphan.push(doc.id);
    for (const link of unescapedTableLinks(doc.body))
      findings.table.push(`${doc.id}: 表格内 ${link} 的 | 须转义为 \\|，否则会拆成新列`);
    for (const match of raw.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
      const target = match[1].replaceAll('\\|', '|').split('|')[0].split('#')[0];
      if (/\.md$/i.test(target)) findings.format.push(`${doc.id}: [[${target}]] 不应带 .md`);
      else if (
        [...collectionRegistry.collections.map((entry) => entry.id), 'archive', 'sources'].some(
          (dir) => target.startsWith(dir + '/'),
        ) ||
        target.startsWith('/Users/')
      )
        findings.format.push(`${doc.id}: [[${target}]] 不应写目录或绝对路径`);
    }
  }

  const errors =
    findings.duplicate.length +
    findings.broken.length +
    findings.parse.length +
    findings.frontmatter.length +
    findings.date.length +
    findings.table.length;
  const warnings =
    findings.title.length + findings.name.length + findings.format.length + findings.orphan.length;

  if (options.json) {
    io.write(
      JSON.stringify({ scan: lib.documents.length, errors, warnings, findings }, null, 2) + '\n',
    );
  } else {
    const section = (label: string, list: string[]) => {
      io.log(`\n${label} (${list.length})`);
      for (const item of list) io.log(`  - ${item}`);
    };
    io.log(`巡检 ${lib.documents.length} 篇：${errors} 个错误，${warnings} 个警告`);
    section('重复文件名', findings.duplicate);
    section('断链与歧义', findings.broken);
    section('解析失败', findings.parse);
    section('缺少 frontmatter', findings.frontmatter);
    section('日期', findings.date);
    section('缺少 title', findings.title);
    section('命名', findings.name);
    section('链接写法', findings.format);
    section('表格双链', findings.table);
    section('孤立（无入站双链）', findings.orphan);
  }
  return errors ? 1 : 0;
}

/** Returns the process exit code; injectable root/output keep tests isolated from private notes. */
export async function runCLI(
  args = process.argv.slice(2),
  root = ROOT,
  io = output,
): Promise<number> {
  const [command, ...rest] = args;
  if (!command || command === '-h' || command === '--help') {
    io.log(USAGE);
    return command ? 0 : 2;
  }
  if (!['index', 'query', 'links', 'lint'].includes(command)) {
    io.error(`未知命令：${command}\n${USAGE}`);
    return 2;
  }
  let options: Options;
  try {
    options = parseOptions(rest);
  } catch (error) {
    io.error(message(error) + '\n' + USAGE);
    return 2;
  }
  if ((command === 'query' || command === 'links') && !options.terms.length) {
    io.error((command === 'query' ? '缺少检索词。\n' : '缺少目标。\n') + USAGE);
    return 2;
  }
  const lib = await buildLibrary(root, options.dirs, command !== 'query');
  if (command === 'index') doIndex(lib, io);
  else if (command === 'query') doQuery(lib, options, io);
  else if (command === 'links') return doLinks(lib, options.terms[0], io) ?? 0;
  else return doLint(lib, options, io);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.on('error', (error) => {
    if ('code' in error && error.code === 'EPIPE') process.exit(0);
    throw error;
  });
  try {
    process.exitCode = await runCLI();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
