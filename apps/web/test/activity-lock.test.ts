import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { acquireActivityLock } from '../src/activity-lock.ts';

test('活动锁恢复旧空目录与已退出进程，保留新锁和仍存活的持有者', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'horizon-lock-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, '.activity.json');
  const dir = `${file}.lock`;
  const owner = path.join(dir, 'owner.json');
  await mkdir(dir);
  await assert.rejects(acquireActivityLock(file), { code: 'EEXIST' });
  const past = new Date(Date.now() - 120_000);
  await utimes(dir, past, past);
  let release = await acquireActivityLock(file);
  const original = await readFile(owner, 'utf8');
  // Live processes must retain the lock even when the directory is old.
  await utimes(dir, past, past);
  await assert.rejects(acquireActivityLock(file), { code: 'EEXIST' });
  assert.equal(await readFile(owner, 'utf8'), original);
  await release();
  await assert.rejects(stat(dir), { code: 'ENOENT' });

  const child = spawn(process.execPath, ['-e', ''], { stdio: 'ignore' });
  await once(child, 'exit');
  await mkdir(dir);
  await writeFile(owner, JSON.stringify({ pid: child.pid, token: 'abandoned' }));
  release = await acquireActivityLock(file);
  assert.equal(JSON.parse(await readFile(owner, 'utf8')).pid, process.pid);
  await release();
});
