import {
  array,
  dictionary,
  object,
  number,
  nullable,
  optional,
  string,
  literal,
} from './data/validation.ts';
import { isActivityEvent } from './data/library-schema.ts';
import type {
  Library,
  LibraryDocument,
  LibraryActivity,
  ActivityEvent,
  ActivityKind,
} from './types/library.ts';
interface ImageSnapshot {
  title: string;
  files: Record<string, string>;
  collections: string[];
}
interface ActivityState {
  schema: number;
  startedAt: string | null;
  documents: Record<
    string,
    { title: string; collection: string; state: string | null; digest: string; bodyDigest?: string }
  >;
  images: Record<string, ImageSnapshot>;
  events: ActivityEvent[];
}
import path from 'node:path';
import { readFile, writeFile, rename, unlink, readdir, lstat, realpath } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { documentTime } from './document-dates.ts';
import { safeAsset } from './library.ts';
import { CONTENT_COLLECTIONS } from './collections.ts';
import { updateDocumentState } from './update-document-state.ts';
import { acquireActivityLock } from './activity-lock.ts';

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const imageExt = /\.(png|jpe?g|webp|gif|svg|excalidraw)$/i;
const groupId = (file: string) => file.replace(imageExt, '');
const cache = new Map<string, { signature: string; digest: string }>();
export function metadataEvents(documents: LibraryDocument[]): ActivityEvent[] {
  return documents.flatMap((doc) => {
    const events: ActivityEvent[] = [];
    for (const [kind, time] of [
      ['created', doc.created],
      ['updated', doc.updated],
    ] as const) {
      if (
        !Number.isFinite(documentTime(time)) ||
        (kind === 'updated' &&
          Number.isFinite(documentTime(doc.created)) &&
          documentTime(time) <= documentTime(doc.created))
      )
        continue;
      events.push({
        id: `metadata:${doc.id}:${kind}:${time}`,
        kind,
        time: time!,
        entity: `doc:${doc.id}`,
        docId: doc.id,
        title: doc.title,
        collections: [doc.collection],
        source: 'metadata',
      });
    }
    return events;
  });
}
async function imageSnapshot(root: string, documents: LibraryDocument[]) {
  const images: Record<string, ImageSnapshot> = {};
  async function walk(dir: string) {
    let entries;
    try {
      if (!(await lstat(path.join(root, dir))).isDirectory()) return;
      entries = await readdir(path.join(root, dir), { withFileTypes: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw e;
    }
    for (const entry of entries) {
      const file = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && imageExt.test(file)) {
        const absolute = path.join(root, file),
          info = await lstat(absolute);
        const cached = cache.get(absolute);
        const signature = `${info.mtimeMs}:${info.size}`;
        const digest =
          cached?.signature === signature ? cached.digest : hash(await readFile(absolute));
        cache.set(absolute, { signature, digest });
        const id = groupId(file);
        images[id] ||= { title: path.posix.basename(id), files: {}, collections: [] };
        images[id].files[file] = digest;
      }
    }
  }
  await walk('assets');
  for (const doc of documents) {
    for (const match of doc.html.matchAll(/\/api\/asset\?[^"\s<>]+/g)) {
      const url = new URL(match[0].replaceAll('&amp;', '&'), 'http://local');
      const asset = await safeAsset(root, url.searchParams.get('path') || '', doc.path);
      const image = asset && images[groupId(asset.path)];
      if (image && !image.collections.includes(doc.collection))
        image.collections.push(doc.collection);
    }
  }
  for (const image of Object.values(images)) image.collections.sort();
  return images;
}
function publicActivity(
  state: Pick<ActivityState, 'events' | 'startedAt'>,
  documents: LibraryDocument[],
): LibraryActivity {
  const ids = new Set(documents.map((d) => d.id));
  // Only current, exported documents and enabled collection scopes reach the UI.
  const events = state.events.filter(
    (e) =>
      (!e.docId || ids.has(e.docId)) &&
      (!e.collections.length || e.collections.some((c) => CONTENT_COLLECTIONS.includes(c))),
  );
  return { startedAt: state.startedAt, events, version: hash(JSON.stringify(events)) };
}
const validState = object<ActivityState>({
  schema: number,
  startedAt: nullable(string),
  documents: dictionary(
    object({
      title: string,
      collection: string,
      state: nullable(literal('pending', 'reading', 'organized', 'understood', 'unread', 'read')),
      digest: string,
      bodyDigest: optional(string),
    }),
  ),
  images: dictionary(
    object<ImageSnapshot>({ title: string, files: dictionary(string), collections: array(string) }),
  ),
  events: array(isActivityEvent),
});
async function readState(file: string): Promise<ActivityState | null> {
  try {
    if (!(await lstat(file)).isFile()) throw Error('活动记录不是普通文件');
    const state: unknown = JSON.parse(await readFile(file, 'utf8'));
    if (
      !validState(state) ||
      state.schema !== 1 ||
      (state.startedAt !== null && !Number.isFinite(documentTime(state.startedAt))) ||
      !state.events.every((event) => Number.isFinite(documentTime(event.time)))
    )
      throw Error('活动记录格式无效');
    return state;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}
const normalizeState = (state: string) =>
  state === 'understood' || state === 'read' ? 'organized' : state === 'unread' ? 'pending' : state;

/** Only the local service writes progress back; exporters and retrieval remain read-only. */
export async function reconcileDocumentStates(
  root: string,
  library: Library,
  readLibrary?: () => Promise<Library>,
): Promise<Library> {
  const previous = await readState(path.join(root, '.activity.json'));
  if (!previous) return library;
  let current = library;
  for (const doc of library.documents) {
    const old = Object.hasOwn(previous.documents, doc.id) ? previous.documents[doc.id] : null;
    if (!old || normalizeState(old.state ?? '') !== 'organized' || doc.state !== 'organized')
      continue;
    // Older activity snapshots include the title in their digest. Compare only when its title
    // is unchanged; new snapshots always distinguish body changes from metadata edits.
    const changed = old.bodyDigest
      ? old.bodyDigest !== hash(doc.body)
      : old.title === doc.title && old.digest !== hash(doc.title + '\n' + doc.body);
    if (changed)
      current = await updateDocumentState(
        root,
        {
          id: doc.id,
          state: 'reading',
          version: current.version,
        },
        readLibrary,
      );
  }
  return current;
}

export async function activityForLibrary(
  root: string,
  library: Library,
  { observe = false, publicExport = false, now = new Date().toISOString() } = {},
) {
  root = await realpath(root);
  const file = path.join(root, '.activity.json');
  let release: (() => Promise<void>) | undefined;
  try {
    if (observe) {
      release = await acquireActivityLock(file);
    }
    const previous = await readState(file);
    if (!observe) {
      const result = publicActivity(
        previous || { events: metadataEvents(library.documents), startedAt: null },
        library.documents,
      );
      if (publicExport) {
        const images = new Set<string>();
        for (const doc of library.documents)
          for (const match of doc.html.matchAll(/\/api\/asset\?[^"\s<>]+/g)) {
            const url = new URL(match[0].replaceAll('&amp;', '&'), 'http://local');
            const asset = await safeAsset(root, url.searchParams.get('path') || '', doc.path);
            if (asset) images.add(`image:${groupId(asset.path)}`);
          }
        result.events = result.events.filter((e) => e.docId || images.has(e.entity));
        // Static exports expose counts and referenced identities, not unreferenced source filenames.
        result.events = result.events.map(({ files, ...event }) => event);
        result.version = hash(JSON.stringify(result.events));
      }
      return result;
    }
    const documents = Object.fromEntries(
      library.documents.map((doc) => [
        doc.id,
        {
          title: doc.title,
          collection: doc.collection,
          state: doc.state,
          digest: hash(doc.title + '\n' + doc.body),
          bodyDigest: hash(doc.body),
        },
      ]),
    );
    const images = await imageSnapshot(root, library.documents);
    const state = {
      schema: 1,
      startedAt: previous?.startedAt || now,
      documents,
      images,
      events: previous?.events || metadataEvents(library.documents),
    };
    const emit = (
      kind: ActivityKind,
      entity: string,
      item: { title: string; collections?: string[]; collection?: string },
      extra: Partial<ActivityEvent> = {},
    ) =>
      state.events.push({
        id: randomUUID(),
        kind,
        entity,
        title: item.title,
        time: now,
        collections: item.collections || [item.collection!],
        source: 'observed',
        ...extra,
      });
    if (previous) {
      for (const [id, doc] of Object.entries(documents)) {
        const old = Object.hasOwn(previous.documents, id) ? previous.documents[id] : null;
        if (!old) emit('created', `doc:${id}`, doc, { docId: id });
        else {
          if (old.collection !== doc.collection)
            emit('moved', `doc:${id}`, doc, {
              docId: id,
              from: old.collection,
              to: doc.collection,
              collections: [...new Set([old.collection, doc.collection])],
            });
          if (
            old.collection === doc.collection &&
            old.state != null &&
            doc.state != null &&
            normalizeState(old.state) !== doc.state
          )
            emit('state-changed', `doc:${id}`, doc, {
              docId: id,
              from: normalizeState(old.state),
              to: doc.state,
            });
          if (old.digest !== doc.digest) emit('updated', `doc:${id}`, doc, { docId: id });
        }
      }
      for (const [id, image] of Object.entries(images)) {
        const old = Object.hasOwn(previous.images, id) ? previous.images[id] : null;
        if (!old) emit('image-created', `image:${id}`, image, { files: Object.keys(image.files) });
        else {
          const added = Object.keys(image.files).filter((file) => !Object.hasOwn(old.files, file));
          const changed = Object.keys(image.files).filter(
            (file) => Object.hasOwn(old.files, file) && old.files[file] !== image.files[file],
          );
          if (added.length) emit('image-format', `image:${id}`, image, { files: added });
          if (changed.length) emit('image-updated', `image:${id}`, image, { files: changed });
        }
      }
    }
    if (JSON.stringify(state) !== JSON.stringify(previous)) {
      const temp = `${file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temp, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await rename(temp, file);
      } finally {
        await unlink(temp).catch((e) => {
          if (e.code !== 'ENOENT') throw e;
        });
      }
    }
    return publicActivity(state, library.documents);
  } catch (error) {
    return {
      ...publicActivity(
        { events: metadataEvents(library.documents), startedAt: null },
        library.documents,
      ),
      error:
        (error as NodeJS.ErrnoException).code === 'EEXIST'
          ? '活动记录正被其他服务使用，稍后自动重试。'
          : '活动记录暂不可用，当前仅展示文档日期；原记录已保留。',
    };
  } finally {
    await release?.();
  }
}
