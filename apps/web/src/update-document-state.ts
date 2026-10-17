import path from 'node:path';
import { readFile, writeFile, rename, unlink, realpath, lstat, utimes } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import yaml from 'js-yaml';
import { record } from './data/validation.ts';
import { stateChangeTimestamp } from './document-dates.ts';
import { loadLibrary } from './library.ts';

export class StateError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}

/** Replace only the state property; never reserialize unrelated metadata or Markdown. */
export function patchDocumentState(
  raw: string,
  key: 'learning_status' | 'learning_status_changed_at' | 'read',
  value: string | boolean,
) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const line = `${key}: ${key === 'learning_status_changed_at' ? JSON.stringify(value) : value}`;
  if (!front) return `---${eol}${line}${eol}---${eol}${raw}`;
  const meta = yaml.load(front[1], { schema: yaml.JSON_SCHEMA });
  if (!record(meta)) throw new StateError('文档属性必须是 YAML 对象。', 400);
  const property = new RegExp(`^${key}:[^\\r\\n]*$`, 'm');
  let next: string;
  if (Object.hasOwn(meta, key)) {
    const match = property.exec(front[1]);
    if (!match || /:\s*[>|&*!{[]/.test(match[0]))
      throw new StateError('状态属性请使用单行普通写法后重试。', 400);
    const comment = /\s+#.*$/.exec(match[0])?.[0] || '';
    next = front[1].replace(property, line + comment);
  } else next = front[1] + eol + line;
  const parsed = yaml.load(next, { schema: yaml.JSON_SCHEMA });
  if (!record(parsed) || parsed[key] !== value) throw new StateError('无法安全更新状态属性。', 400);
  return `---${eol}${next}${eol}---${front[0].endsWith('\n') ? eol : ''}${raw.slice(front[0].length)}`;
}

export async function updateDocumentState(
  root: string,
  input: unknown,
  readLibrary = () => loadLibrary(root),
) {
  if (!record(input) || typeof input.id !== 'string' || typeof input.version !== 'string')
    throw new StateError('状态参数无效。', 400);
  root = await realpath(root);
  const library = await readLibrary();
  if (library.version !== input.version) throw new StateError('文档库已更新，请同步后重试。');
  const doc = library.documents.find((doc) => doc.id === input.id);
  const states = ['pending', 'reading', 'organized'];
  if (!doc || typeof input.state !== 'string' || !states.includes(input.state))
    throw new StateError('此文档不支持该状态。', 400);
  const file = path.resolve(root, doc.path);
  if (
    !file.startsWith(root + path.sep) ||
    (await realpath(file)) !== file ||
    !(await lstat(file)).isFile()
  )
    throw new StateError('只能更新知识库内的普通文档。', 400);
  const raw = await readFile(file, 'utf8');
  let next = patchDocumentState(raw, 'learning_status', input.state);
  if (doc.state !== input.state)
    next = patchDocumentState(next, 'learning_status_changed_at', stateChangeTimestamp());
  if (raw === next) return library;
  const info = await lstat(file);
  const temp = file + '.state-' + randomUUID();
  try {
    await writeFile(temp, next, { flag: 'wx', mode: info.mode });
    // Marking progress is not a content update and must not reorder undated notes.
    await utimes(temp, info.atime, info.mtime);
    if ((await readLibrary()).version !== input.version || (await readFile(file, 'utf8')) !== raw)
      throw new StateError('文件已被其他编辑修改，请同步后重试。');
    await rename(temp, file);
  } finally {
    await unlink(temp).catch(() => {});
  }
  return readLibrary();
}

export function isLocalWriteRequest(req: Pick<IncomingMessage, 'headers'>) {
  const host = req.headers.host || '';
  return (
    /^(?:127\.0\.0\.1|localhost):\d+$/.test(host) &&
    req.headers.origin === `http://${host}` &&
    req.headers['content-type']?.split(';')[0].trim() === 'application/json' &&
    (!req.headers['sec-fetch-site'] || req.headers['sec-fetch-site'] === 'same-origin')
  );
}
