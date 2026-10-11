import path from 'node:path';
import {readFile, writeFile, rename, unlink, readdir, lstat, realpath, mkdir, rmdir} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import {documentTime} from './document-dates.js';
import {safeAsset} from './library.mjs';
import {CONTENT_COLLECTIONS} from './collections.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const imageExt = /\.(png|jpe?g|webp|gif|svg|excalidraw)$/i;
const groupId = file => file.replace(imageExt, '');
const cache = new Map();
export function metadataEvents(documents) {
  return documents.flatMap(doc => {
    const events = [];
    for (const [kind, time] of [['created', doc.created], ['updated', doc.updated]]) {
      if (!Number.isFinite(documentTime(time)) || (kind === 'updated' && (Number.isFinite(documentTime(doc.created)) && documentTime(time) <= documentTime(doc.created)))) continue;
      events.push({id:`metadata:${doc.id}:${kind}:${time}`, kind, time, entity:`doc:${doc.id}`, docId:doc.id, title:doc.title, collections:[doc.collection], source:'metadata'});
    }
    return events;
  });
}
async function imageSnapshot(root, documents) {
  const images = {};
  async function walk(dir) {
    let entries;
    try { if (!(await lstat(path.join(root, dir))).isDirectory()) return; entries = await readdir(path.join(root, dir), {withFileTypes:true}); }
    catch (e) { if (e.code === 'ENOENT') return; throw e; }
    for (const entry of entries) {
      const file = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && imageExt.test(file)) {
        const absolute = path.join(root, file), info = await lstat(absolute);
        const cached = cache.get(absolute);
        const signature = `${info.mtimeMs}:${info.size}`;
        const digest = cached?.signature === signature ? cached.digest : hash(await readFile(absolute));
        cache.set(absolute, {signature, digest});
        const id = groupId(file);
        images[id] ||= {title:path.posix.basename(id), files:{}, collections:[]};
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
      if (image && !image.collections.includes(doc.collection)) image.collections.push(doc.collection);
    }
  }
  for (const image of Object.values(images)) image.collections.sort();
  return images;
}
function publicActivity(state, documents) {
  const ids = new Set(documents.map(d => d.id));
  // Only current, exported documents and enabled collection scopes reach the UI.
  const events = state.events.filter(e => (!e.docId || ids.has(e.docId)) && (!e.collections.length || e.collections.some(c => CONTENT_COLLECTIONS.includes(c))));
  return {startedAt:state.startedAt, events, version:hash(JSON.stringify(events))};
}
async function readState(file) {
  try {
    if (!(await lstat(file)).isFile()) throw Error('活动记录不是普通文件');
    const state = JSON.parse(await readFile(file, 'utf8'));
    if (state.schema !== 1 || !state.documents || !state.images || !Array.isArray(state.events) || !state.events.every(e => typeof e.id === 'string' && typeof e.entity === 'string' && typeof e.title === 'string' && Array.isArray(e.collections) && Number.isFinite(documentTime(e.time)))) throw Error('活动记录格式无效');
    return state;
  } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
export async function activityForLibrary(root, library, {observe = false, publicExport = false, now = new Date().toISOString()} = {}) {
  root = await realpath(root);
  const file = path.join(root, '.activity.json');
  let locked = false;
  try {
    if (observe) { await mkdir(`${file}.lock`); locked = true; }
    const previous = await readState(file);
    if (!observe) {
      const result = publicActivity(previous || {events:metadataEvents(library.documents), startedAt:null}, library.documents);
      if (publicExport) {
        const images = new Set();
        for (const doc of library.documents) for (const match of doc.html.matchAll(/\/api\/asset\?[^"\s<>]+/g)) {
          const url = new URL(match[0].replaceAll('&amp;', '&'), 'http://local');
          const asset = await safeAsset(root, url.searchParams.get('path') || '', doc.path);
          if (asset) images.add(`image:${groupId(asset.path)}`);
        }
        result.events = result.events.filter(e => e.docId || images.has(e.entity));
        // Static exports expose counts and referenced identities, not unreferenced source filenames.
        result.events = result.events.map(({files, ...event}) => event);
        result.version = hash(JSON.stringify(result.events));
      }
      return result;
    }
    const documents = Object.fromEntries(library.documents.map(doc => [doc.id, {title:doc.title, collection:doc.collection, digest:hash(doc.title + '\n' + doc.body)}]));
    const images = await imageSnapshot(root, library.documents);
    const state = {schema:1, startedAt:previous?.startedAt || now, documents, images, events:previous?.events || metadataEvents(library.documents)};
    const emit = (kind, entity, item, extra = {}) => state.events.push({id:randomUUID(), kind, entity, title:item.title, time:now, collections:item.collections || [item.collection], source:'observed', ...extra});
    if (previous) {
      for (const [id, doc] of Object.entries(documents)) {
        const old = Object.hasOwn(previous.documents, id) ? previous.documents[id] : null;
        if (!old) emit('created', `doc:${id}`, doc, {docId:id});
        else {
          if (old.collection !== doc.collection) emit('moved', `doc:${id}`, doc, {docId:id, from:old.collection, to:doc.collection, collections:[...new Set([old.collection, doc.collection])]});
          if (old.digest !== doc.digest) emit('updated', `doc:${id}`, doc, {docId:id});
        }
      }
      for (const [id, image] of Object.entries(images)) {
        const old = Object.hasOwn(previous.images, id) ? previous.images[id] : null;
        if (!old) emit('image-created', `image:${id}`, image, {files:Object.keys(image.files)});
        else {
          const added = Object.keys(image.files).filter(file => !Object.hasOwn(old.files, file));
          const changed = Object.keys(image.files).filter(file => Object.hasOwn(old.files, file) && old.files[file] !== image.files[file]);
          if (added.length) emit('image-format', `image:${id}`, image, {files:added});
          if (changed.length) emit('image-updated', `image:${id}`, image, {files:changed});
        }
      }
    }
    if (JSON.stringify(state) !== JSON.stringify(previous)) {
      const temp = `${file}.${randomUUID()}.tmp`;
      try { await writeFile(temp, JSON.stringify(state, null, 2) + '\n', {flag:'wx', mode:0o600}); await rename(temp, file); }
      finally { await unlink(temp).catch(e => {if(e.code !== 'ENOENT') throw e;}); }
    }
    return publicActivity(state, library.documents);
  } catch (error) {
    return {...publicActivity({events:metadataEvents(library.documents), startedAt:null}, library.documents), error:error.code === 'EEXIST' ? '活动记录正被其他服务使用，稍后自动重试。' : '活动记录暂不可用，当前仅展示文档日期；原记录已保留。'};
  } finally { if (locked) await rmdir(`${file}.lock`); }
}
