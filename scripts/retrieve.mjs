#!/usr/bin/env node
// 只读的 Agent 检索层：复用 apps/web 的解析逻辑（frontmatter、双链、锚点、反链），
// 默认覆盖 collections.config.json 中启用的内容目录。每次按当前源文件实时生成，不落地缓存，避免索引漂移。
//
// 用法（在项目根目录执行；需先 make install 安装 apps/web 依赖）：
//   node scripts/retrieve.mjs index                      # 每篇一行 JSON，不含正文
//   node scripts/retrieve.mjs query 覆盖索引 回表        # 紧凑候选，含命中字段与片段
//   node scripts/retrieve.mjs links mysql-explain        # 出链、入链与断链
//   node scripts/retrieve.mjs lint                       # 断链、重复、孤立、元数据、日期、格式
// 选项：--dirs content/notes,content/inbox,content/readings,content/glossary   --limit 20   --json（query/lint）

import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseDocument, renderDocument } from '../apps/web/src/library.mjs';
import { documentTime } from '../apps/web/src/document-dates.js';

import { CONTENT_COLLECTIONS, collectionRegistry } from '../apps/web/src/collections.js';
const DEFAULT_DIRS = CONTENT_COLLECTIONS.map(dir => `content/${dir}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function walk(dir) {
  const out = [];
  const abs = path.join(ROOT, dir);
  let entries;
  try {
    entries = await readdir(abs, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return out;
    throw error;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(rel));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

// 解析全部候选文档；parseDocument 失败的内容记录为错误，不中断其余文档。
async function buildLibrary(dirs) {
  const files = [];
  for (const dir of dirs) files.push(...await walk(dir));
  files.sort();

  const parsed = [];
  const rawById = new Map();
  const parseErrors = [];
  const duplicates = [];
  const seen = new Set();

  for (const file of files) {
    const raw = await readFile(path.join(ROOT, file), 'utf8');
    let doc;
    try {
      doc = parseDocument(raw, file);
    } catch (error) {
      parseErrors.push({ file: file.replaceAll(path.sep, '/'), reason: error.message });
      continue;
    }
    if (seen.has(doc.id)) duplicates.push(doc.id);
    seen.add(doc.id);
    rawById.set(doc.id, raw);
    parsed.push(doc);
  }

  const documents = parsed.map(doc => renderDocument(doc, parsed));
  for (const doc of documents) {
    doc.backlinks = documents
      .filter(other => other.id !== doc.id && other.references.some(r => r.id === doc.id))
      .map(other => other.id);
  }
  return { files, documents, rawById, duplicates, parseErrors };
}

function indexRecord(doc) {
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
    headings: doc.toc.filter(t => t.level > 1).map(t => t.title),
    links: [...new Set(doc.references.map(r => r.id))],
    broken: doc.issues.map(i => ({ target: i.target, reason: i.reason })),
    backlinks: doc.backlinks,
  };
}

function matchLines(body, terms, max = Infinity) {
  const needles = terms.map(t => t.toLowerCase());
  const out = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const low = lines[i].toLowerCase();
    if (needles.some(needle => low.includes(needle))) {
      out.push({ line: i + 1, text: lines[i].trim().slice(0, 160) });
      if (out.length >= max) break;
    }
  }
  return out;
}

function scoreDoc(doc, terms) {
  const fields = new Set();
  let score = 0;
  for (const term of terms) {
    const t = term.toLowerCase();
    if (doc.id.toLowerCase().includes(t)) { score += 10; fields.add('文件名'); }
    if (doc.title.toLowerCase().includes(t)) { score += 8; fields.add('标题'); }
    if (doc.aliases.some(a => a.toLowerCase().includes(t))) { score += 6; fields.add('别名'); }
    if (doc.tags.some(x => x.toLowerCase().includes(t))) { score += 4; fields.add('标签'); }
    if (doc.category.toLowerCase().includes(t)) { score += 3; fields.add('分类'); }
    if (doc.toc.some(h => h.title.toLowerCase().includes(t))) { score += 3; fields.add('小节'); }
    if (doc.summary.toLowerCase().includes(t)) { score += 2; fields.add('摘要'); }
  }
  const bodyHits = matchLines(doc.body, terms).length;
  if (bodyHits) {
    score += bodyHits;
    fields.add(`正文×${bodyHits}`);
  }
  return { score, fields: [...fields] };
}

function parseOptions(args) {
  const options = { dirs: [...DEFAULT_DIRS], limit: 20, json: false, terms: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--dirs') options.dirs = String(args[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (arg === '--limit') options.limit = Number(args[++i]) || 20;
    else options.terms.push(arg);
  }
  if (!options.dirs.length) options.dirs = [...DEFAULT_DIRS];
  return options;
}

const USAGE = `用法：
  node scripts/retrieve.mjs index
  node scripts/retrieve.mjs query <词...> [--limit 20] [--dirs ${DEFAULT_DIRS.join(',')}] [--json]
  node scripts/retrieve.mjs links <文件名|路径>
  node scripts/retrieve.mjs lint [--json]`;

function doIndex(lib) {
  for (const doc of lib.documents) process.stdout.write(JSON.stringify(indexRecord(doc)) + '\n');
}

function doQuery(lib, options) {
  if (!options.terms.length) {
    console.error('缺少检索词。\n' + USAGE);
    process.exit(2);
  }
  const ranked = lib.documents
    .map(doc => ({ doc, ...scoreDoc(doc, options.terms) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.doc.path < b.doc.path ? -1 : 1))
    .slice(0, options.limit);

  if (options.json) {
    process.stdout.write(JSON.stringify({
      query: options.terms,
      dirs: options.dirs,
      total: lib.documents.length,
      results: ranked.map(r => ({ path: r.doc.path, id: r.doc.id, title: r.doc.title, category: r.doc.category, tags: r.doc.tags, score: r.score, fields: r.fields, snippets: matchLines(r.doc.body, options.terms, 4) })),
    }, null, 2) + '\n');
    return;
  }

  console.log(`检索「${options.terms.join(' ')}」  目录 ${options.dirs.join(',')}  命中 ${ranked.length} / ${lib.documents.length}`);
  ranked.forEach((r, i) => {
    const meta = [r.doc.category || '未分类', ...r.doc.tags].join(' · ');
    console.log(`\n${i + 1}) ${r.doc.id}  [${meta}]`);
    console.log(`   ${r.doc.path}`);
    console.log(`   标题: ${r.doc.title}`);
    console.log(`   命中: ${r.fields.join(', ')}`);
    for (const s of matchLines(r.doc.body, options.terms, 4)) console.log(`   L${s.line}  ${s.text}`);
  });
}

function findDoc(lib, key) {
  const wanted = key.replace(/^content\//, '').replace(/\.md$/, '');
  return lib.documents.find(doc => doc.id === wanted || doc.path.replace(/\.md$/, '') === wanted || doc.path.endsWith('/' + wanted + '.md'));
}

function doLinks(lib, key) {
  const doc = findDoc(lib, key);
  if (!doc) {
    console.error(`未找到：${key}`);
    process.exit(1);
  }
  const meta = [doc.category || '未分类', ...doc.tags].join(' · ');
  console.log(`${doc.id} — ${doc.title}  [${meta}]`);
  console.log(`路径: ${doc.path}`);
  if (doc.parent) console.log(`上级: ${doc.parent.id}${doc.parent.anchor ? "#" + doc.parent.anchor : ""}`);
  console.log(`出链 ${doc.references.length + doc.issues.length}:`);
  for (const ref of doc.references) console.log(`  → ${ref.id}${ref.anchor ? '#' + ref.anchor : ''}`);
  for (const issue of doc.issues) console.log(`  ↯ ${issue.target}  [${issue.reason}]`);
  console.log(`入链 ${doc.backlinks.length}:`);
  for (const id of doc.backlinks) console.log(`  ← ${id}`);
}

function doLint(lib, options) {
  const findings = { duplicate: [], broken: [], parse: [], frontmatter: [], title: [], date: [], name: [], format: [], orphan: [] };

  for (const id of lib.duplicates) findings.duplicate.push(id);
  for (const error of lib.parseErrors) findings.parse.push(`${error.file}: ${error.reason}`);

  for (const doc of lib.documents) {
    for (const issue of doc.issues) findings.broken.push(`${doc.id}: [[${issue.target}]] ${issue.reason}`);
    const raw = lib.rawById.get(doc.id) || '';
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) findings.frontmatter.push(`${doc.path} 缺少 frontmatter`);
    else if (!/^title\s*:/m.test(fm[1])) findings.title.push(`${doc.path} 缺少 title`);
    for (const [field, value] of [['created_at', doc.created], ['updated_at', doc.updated]]) {
      if (value != null && !Number.isFinite(documentTime(value))) findings.date.push(`${doc.id} ${field}=${value} 不是有效日期或带时区、精确到秒的时间`);
    }
    if (documentTime(doc.updated) < documentTime(doc.created)) {
      findings.date.push(`${doc.id} updated_at 早于 created_at`);
    }
    if (!NAME_RE.test(doc.id)) findings.name.push(`${doc.id}.md 不符合小写英文短横线命名`);
    if (doc.backlinks.length === 0) findings.orphan.push(doc.id);
    for (const match of raw.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
      const target = match[1].replaceAll('\\|', '|').split('|')[0].split('#')[0];
      if (/\.md$/i.test(target)) findings.format.push(`${doc.id}: [[${target}]] 不应带 .md`);
      else if ([...collectionRegistry.collections.map(entry => entry.id), 'archive', 'sources'].some(dir => target.startsWith(dir + '/')) || target.startsWith('/Users/')) findings.format.push(`${doc.id}: [[${target}]] 不应写目录或绝对路径`);
    }
  }

  const errors = findings.duplicate.length + findings.broken.length + findings.parse.length + findings.frontmatter.length + findings.date.length;
  const warnings = findings.title.length + findings.name.length + findings.format.length + findings.orphan.length;

  if (options.json) {
    process.stdout.write(JSON.stringify({ scan: lib.documents.length, errors, warnings, findings }, null, 2) + '\n');
  } else {
    const section = (label, list) => {
      console.log(`\n${label} (${list.length})`);
      for (const item of list) console.log(`  - ${item}`);
    };
    console.log(`巡检 ${lib.documents.length} 篇：${errors} 个错误，${warnings} 个警告`);
    section('重复文件名', findings.duplicate);
    section('断链与歧义', findings.broken);
    section('解析失败', findings.parse);
    section('缺少 frontmatter', findings.frontmatter);
    section('日期', findings.date);
    section('缺少 title', findings.title);
    section('命名', findings.name);
    section('链接写法', findings.format);
    section('孤立（无入站双链）', findings.orphan);
  }
  process.exit(errors ? 1 : 0);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === '-h' || command === '--help') {
    console.log(USAGE);
    process.exit(command ? 0 : 2);
  }
  const options = parseOptions(rest);
  if (command === 'query' && !options.terms.length) {
    console.error('缺少检索词。\n' + USAGE);
    process.exit(2);
  }
  if (command === 'links' && !options.terms.length) {
    console.error('缺少目标。\n' + USAGE);
    process.exit(2);
  }

  const lib = await buildLibrary(options.dirs);

  if (command === 'index') doIndex(lib);
  else if (command === 'query') doQuery(lib, options);
  else if (command === 'links') doLinks(lib, options.terms[0]);
  else if (command === 'lint') doLint(lib, options);
  else {
    console.error(`未知命令：${command}\n` + USAGE);
    process.exit(2);
  }
}

// 管道下游（如 head）提前关闭时安静退出，不打印堆栈。
process.stdout.on('error', error => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

main().catch(error => {
  console.error(error);
  process.exit(1);
});
