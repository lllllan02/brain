import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const abandonedEmptyLockAge = 60_000;
const busy = () => Object.assign(new Error('活动记录正被其他服务使用'), { code: 'EEXIST' });
const code = (error: unknown) => (error as NodeJS.ErrnoException).code;

/** Keep live owners, recover crashed writers and empty locks left by older services. */
export async function acquireActivityLock(file: string): Promise<() => Promise<void>> {
  const dir = `${file}.lock`;
  const ownerFile = path.join(dir, 'owner.json');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await mkdir(dir);
    } catch (error) {
      if (code(error) !== 'EEXIST') throw error;
      const info = await lstat(dir).catch((error) => {
        if (code(error) !== 'ENOENT') throw error;
        return null;
      });
      if (!info) continue;
      if (!info.isDirectory()) throw busy();
      let owner: string;
      try {
        owner = await readFile(ownerFile, 'utf8');
      } catch (error) {
        if (code(error) !== 'ENOENT') throw error;
        // A newly created directory may still be waiting for its owner file.
        if (Date.now() - info.mtimeMs < abandonedEmptyLockAge) throw busy();
        await rmdir(dir).catch((error) => {
          if (code(error) !== 'ENOENT') throw error;
        });
        continue;
      }
      const parsed: unknown = JSON.parse(owner);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('pid' in parsed) ||
        typeof parsed.pid !== 'number' ||
        !Number.isSafeInteger(parsed.pid) ||
        parsed.pid <= 0
      )
        throw busy();
      try {
        process.kill(parsed.pid, 0);
        throw busy();
      } catch (error) {
        // EPERM also means the owner still exists.
        if (code(error) !== 'ESRCH') throw error;
      }
      if ((await readFile(ownerFile, 'utf8')) !== owner) throw busy();
      await unlink(ownerFile);
      await rmdir(dir);
      continue;
    }
    const owner = JSON.stringify({ pid: process.pid, token: randomUUID() });
    try {
      await writeFile(ownerFile, owner, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      await rmdir(dir).catch(() => {});
      throw error;
    }
    return async () => {
      if ((await readFile(ownerFile, 'utf8')) !== owner) throw busy();
      await unlink(ownerFile);
      await rmdir(dir);
    };
  }
  throw busy();
}
