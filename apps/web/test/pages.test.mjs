import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {publicLibrary} from '../scripts/build-pages.mjs';
test('Pages 先按公开清单过滤，再生成正文、摘要、搜索与关系',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'brain-public-'));
 try{await mkdir(path.join(root,'notes/202610'),{recursive:true});await writeFile(path.join(root,'notes/202610/allowed.md'),'---\ntitle: 公开文章\n---\n开头 [[secret|隐藏标题]]\n\n[[other|下一篇]]');await writeFile(path.join(root,'notes/202610/secret.md'),'---\ntitle: 隐藏标题\naliases: [私人别名]\n---\n绝密正文');await writeFile(path.join(root,'notes/202610/other.md'),'---\ntitle: 公开文章二\n---\n[[allowed]]');
 const {library}=await publicLibrary(root,{documents:['notes/202610/allowed.md','notes/202610/other.md'],assets:[]});const text=JSON.stringify(library);assert.equal(library.documents.length,2);assert.doesNotMatch(text,/secret|隐藏标题|私人别名|绝密正文/);assert.ok(library.documents.find(d=>d.id==='allowed').backlinks.includes('other'));assert.ok(library.documents.find(d=>d.id==='allowed').references.some(r=>r.id==='other'));
 const empty=await publicLibrary(root,{documents:[],assets:[]});assert.equal(empty.library.documents.length,0);await assert.rejects(publicLibrary(root,{documents:['../secret.md'],assets:[]}));
 }finally{await rm(root,{recursive:true,force:true});}
});
