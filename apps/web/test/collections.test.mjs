import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, copyFile, symlink, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {createCollectionRegistry, collectionMarkerStyle} from '../src/collections.js';

const entry = {id:'reference', label:'参考', description:'随查资料', icon:'M2 2h20v20H2Z', color:'#123abc'};
test('目录配置支持自定义项、禁用、样式默认值，并拒绝越界路径及无效渲染值', () => {
 const registry=createCollectionRegistry([entry,{...entry,id:'hidden',enabled:false}]);
 assert.deepEqual(registry.directories,['reference']);
 assert.equal(registry.label('reference'),'参考');
 assert.equal(registry.style('reference').node.size,1);
 assert.deepEqual(registry.style('reference').link,{color:'#bec7d2',opacity:0.12});
 assert.deepEqual(createCollectionRegistry([{...entry,link:{color:'#abcdef',opacity:0.3}}]).style('reference').link,{color:'#abcdef',opacity:0.3});
 assert.equal(registry.icons.reference.label,'参考 · 随查资料');
 assert.equal(collectionMarkerStyle('glossary')['--collection-fill'],'transparent');
 for(const patch of [{id:'../outside'},{id:'nested/path'},{enabled:'false'},{color:'red'},{icon:'" onload="x'},{node:{size:-1}},{node:{rayAngle:Infinity}},{marker:{shape:'triangle'}},{link:null},{link:{color:'red'}},{link:{color:'#fff;bad'}},{link:{opacity:1.1}},{link:{opacity:-1}},{link:{opacity:'0.2'}}]) {
  assert.throws(()=>createCollectionRegistry([{...entry,...patch}]),/目录配置/);
 }
 assert.throws(()=>createCollectionRegistry([entry,entry]),/重复/);
 assert.deepEqual(createCollectionRegistry([]).directories,[]);
});

test('只改配置即可收录第五目录、渲染图标、搜索及静态导出；禁用后保留文件',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-config-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 // Run the unchanged modules against an isolated configuration, not the user's vault.
 await mkdir(path.join(root,'src/neural'),{recursive:true});
 await mkdir(path.join(root,'scripts'));
 await writeFile(path.join(root,'package.json'),'{"type":"module"}');
 await symlink(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
 for(const file of ['collections.js','library.mjs','document-dates.js','neural/search.js']) await copyFile(path.resolve('src',file),path.join(root,'src',file));
 await copyFile(path.resolve('scripts/build-pages.mjs'),path.join(root,'scripts/build-pages.mjs'));
 const config=JSON.parse(await readFile('collections.config.json','utf8'));
 config.push({...entry,link:{color:'#abcdef',opacity:0.3}});
 await writeFile(path.join(root,'collections.config.json'),JSON.stringify(config));
 for(const dir of ['inbox','glossary','reference','unconfigured']) await mkdir(path.join(root,'content',dir),{recursive:true});
 await writeFile(path.join(root,'content/inbox/topic.md'),'---\ntitle: 主题\n---\n[[term]] [[custom]]');
 await writeFile(path.join(root,'content/glossary/term.md'),'---\ntitle: 术语\n---\n[[topic]]');
 await writeFile(path.join(root,'content/reference/custom.md'),'---\ntitle: 自定义查阅\n---\n配置驱动检索');
 await writeFile(path.join(root,'content/unconfigured/hidden.md'),'不应收录');
 const script=`import assert from 'node:assert/strict';
 import {loadLibrary} from './src/library.mjs';
 import {pagesLibrary} from './scripts/build-pages.mjs';
 import {createSearchIndex,searchDocuments} from './src/neural/search.js';
 const library=await loadLibrary('./content');
 const enabled=process.argv[1]==='enabled';
 assert.equal(library.documents.length,enabled?3:2);
 assert.equal(library.documents.some(d=>d.id==='hidden'),false);
 const topic=library.documents.find(d=>d.id==='topic');
 assert.match(topic.html,/data-collection="glossary"/);
 assert.deepEqual(library.documents.find(d=>d.id==='term').backlinks,['topic']);
 if(enabled){
  assert.match(topic.html,/data-collection="reference"/);
  assert.match(topic.html,/参考 · 随查资料/);
  assert.ok(topic.html.includes('--link-color:#abcdef;--link-opacity:0.3'));
  assert.ok(topic.html.includes('--link-color:#bec7d2;--link-opacity:0.12'));
  assert.ok(library.documents.find(d=>d.id==='term').html.includes('--link-color:#acd2fa;--link-opacity:0.26'));
  assert.deepEqual(searchDocuments(createSearchIndex(library.documents),'配置驱动检索').map(d=>d.id),['custom']);
 }else{assert.ok(topic.issues.some(issue=>issue.target==='custom'));}
 assert.deepEqual((await pagesLibrary('./content')).library,library);`;
 const run=state=>execFileSync(process.execPath,['--input-type=module','-e',script,state],{cwd:root,encoding:'utf8'});
 run('enabled');
 config.at(-1).enabled=false;
 await writeFile(path.join(root,'collections.config.json'),JSON.stringify(config));
 run('disabled');
 assert.match(await readFile(path.join(root,'content/reference/custom.md'),'utf8'),/配置驱动检索/);
});
