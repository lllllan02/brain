import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp, mkdir, writeFile, readFile, rename, rm, symlink} from 'node:fs/promises';
import {loadLibrary} from '../src/library.ts';
import {activityForLibrary, metadataEvents} from '../src/activity.ts';
import {activityDay, filterActivity, dailyItems, dayDetails, periodStart, yearCells, summaryCounts} from '../src/neural/activity-model.ts';
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'horizon-activity-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for (const dir of ['readings','notes','assets']) await mkdir(path.join(root,dir));
  return root;
}
const now = '2026-10-12T10:00:00+08:00';
const raw = '---\ntitle: A\ncreated_at: 2026-10-01\nupdated_at: 2026-10-05\n---\n内容 ![](assets/figure.png)';
const observe = async root => activityForLibrary(root, await loadLibrary(root), {observe:true,now});

test('首次启动只回填明确日期，已有图片仅建基线；重复读取不增加记录',async t=>{
  const root=await fixture(t);
  await writeFile(path.join(root,'readings/a.md'),raw);
  await writeFile(path.join(root,'assets/figure.png'),'image bytes');
  const a=await observe(root);
  assert.deepEqual(a.events.map(e=>e.kind),['created','updated']);
  assert.equal(a.startedAt,now);
  const before=await readFile(path.join(root,'.activity.json'),'utf8');
  assert.deepEqual(await observe(root),a);
  assert.equal(await readFile(path.join(root,'.activity.json'),'utf8'),before);
  assert.equal(metadataEvents([{id:'b',title:'B',collection:'readings',updated:'2026-10-02'}]).length,1);
});

test('记录跨目录迁移、正文变更及新配图和格式，目录筛选不重复计数',async t=>{
  const root=await fixture(t);
  await writeFile(path.join(root,'readings/a.md'),raw);
  await writeFile(path.join(root,'assets/figure.png'),'image bytes');
  await observe(root);
  await rename(path.join(root,'readings/a.md'),path.join(root,'notes/a.md'));
  await writeFile(path.join(root,'notes/a.md'),raw+'\n补充正文');
  await writeFile(path.join(root,'assets/figure.svg'),'<svg/>');
  await writeFile(path.join(root,'assets/new.png'),'new image');
  await writeFile(path.join(root,'assets/new.svg'),'<svg/>');
  const activity=await observe(root), events=activity.events.filter(e=>e.source==='observed');
  assert.deepEqual(events.map(e=>e.kind).sort(),['image-created','image-format','moved','updated']);
  const move=events.find(e=>e.kind==='moved');
  assert.deepEqual(move.collections,['readings','notes']);
  assert.equal(filterActivity(events,'notes','moved').length,1);
  assert.equal(filterActivity(events,'readings','moved').length,1);
  assert.equal(dailyItems(filterActivity(events,'notes')).get('2026-10-12'),2);
  assert.equal(events.find(e=>e.kind==='image-created').files.length,2);
  const snapshot=await activityForLibrary(root,await loadLibrary(root),{publicExport:true});
  assert.ok(!snapshot.events.some(e=>e.entity==='image:assets/new'));
  assert.ok(snapshot.events.every(e=>!e.files));
});

test('导出不创建记录文件；损坏记录及符号链接不会被覆盖',async t=>{
  const root=await fixture(t);
  await writeFile(path.join(root,'readings/a.md'),raw);
  await activityForLibrary(root,await loadLibrary(root));
  await assert.rejects(readFile(path.join(root,'.activity.json')),{code:'ENOENT'});
  await writeFile(path.join(root,'.activity.json'),'{bad');
  assert.ok((await observe(root)).error);
  assert.equal(await readFile(path.join(root,'.activity.json'),'utf8'),'{bad');
  await rm(path.join(root,'.activity.json'));
  await writeFile(path.join(root,'target.json'),'{}');
  await symlink(path.join(root,'target.json'),path.join(root,'.activity.json'));
  assert.ok((await observe(root)).error);
  assert.equal(await readFile(path.join(root,'target.json'),'utf8'),'{}');
});

test('北京时间跨日、周一边界、闰年和重复活动口径',()=>{
  assert.equal(activityDay('2026-10-11T17:00:00Z'),'2026-10-12');
  assert.equal(activityDay('2026-02-30'),null);
  assert.equal(periodStart('2026-10-12','week'),'2026-10-12');
  assert.equal(periodStart('2026-10-18','week'),'2026-10-12');
  const cells=yearCells('2024');
  assert.ok(cells.includes('2024-02-29'));
  assert.equal(cells.length%7,0);
  const base={entity:'doc:a',time:now,collections:['readings','notes'],source:'observed',title:'A'};
  const events=[{...base,id:'1',kind:'updated'},{...base,id:'2',kind:'updated'},{...base,id:'3',kind:'state-changed',from:'pending',to:'understood'}];
  assert.equal(dailyItems(events).get('2026-10-12'),1);
  assert.equal(dayDetails(events,'2026-10-12').length,2);
  assert.equal(summaryCounts(events,'2026-10-01','2026-10-12').learned,1);
  assert.equal(summaryCounts(events,'2026-10-01','2026-10-12').updated,1);
});

test('活动记录深层字段损坏时报告错误并保留原文件', async t => {
  const root=await fixture(t);
  await writeFile(path.join(root,'readings/a.md'),raw);
  await observe(root);
  const file=path.join(root,'.activity.json');
  const original=JSON.parse(await readFile(file,'utf8'));
  for(const mutate of [
    s=>s.documents.a=null,
    s=>s.images.test={title:'x',files:[],collections:['notes']},
    s=>s.events[0].collections=[1],
    s=>s.events[0].kind='unknown',
    s=>s.events[0]=null,
  ]) {
    const value=structuredClone(original);mutate(value);const broken=JSON.stringify(value);
    await writeFile(file,broken);assert.ok((await observe(root)).error);
    assert.equal(await readFile(file,'utf8'),broken);
  }
});
