import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,realpath,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'vite';
import {parseDocument,renderDocument,resolveDocument,safeAsset} from '../src/library.mjs';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function publicLibrary(root,manifest){
 if(!Array.isArray(manifest.documents)||!Array.isArray(manifest.assets))throw Error('公开清单必须包含 documents 与 assets 数组');
 const rootReal=await realpath(root),approved=new Set(manifest.assets),raw=[];
 for(const file of manifest.documents){if(typeof file!=='string'||! /^notes\/.+\.md$/.test(file)||file.split('/').includes('..'))throw Error('无效公开文档路径');const full=await realpath(path.join(root,file));if(!full.startsWith(rootReal+path.sep))throw Error('公开文档路径越界');raw.push(parseDocument(await readFile(full,'utf8'),file));}
 if(new Set(raw.map(d=>d.id)).size!==raw.length)throw Error('公开文档文件名重复');
 // Filter before rendering: a private target never enters the index, search or relationships.
 const filtered=raw.map(doc=>({...doc,body:doc.body.replace(/!?\[\[([^\]\n]+)\]\]/g,(text,value)=>{const target=value.replaceAll('\\|','|').split('|')[0];if(/\.(png|jpe?g|gif|webp|svg|pdf|mp3|mp4)$/i.test(target))return approved.has(target)?text:'未公开附件';return resolveDocument(target,raw,doc).doc?text:'未公开文档';})}));
 const documents=filtered.map(doc=>renderDocument(doc,filtered));const assets=new Map();
 for(const doc of documents){
  const urls=[...doc.html.matchAll(/(?:src|href)="(\/api\/asset\?[^" ]+)"/g)];
  for(const [,url]of urls){const parsed=new URL(url,'http://local');const asset=await safeAsset(root,parsed.searchParams.get('path')||'',doc.path);if(asset&&approved.has(asset.path)&&/\.(png|jpe?g|gif|webp|pdf|mp3|mp4)$/i.test(asset.path)){assets.set(asset.path,asset.file);const href='./documents/'+asset.path.split('/').map(encodeURIComponent).join('/');doc.html=doc.html.replaceAll(url,href);}else{doc.html=doc.html.replaceAll(url,'#');}}
  doc.backlinks=documents.filter(other=>other.id!==doc.id&&other.references.some(r=>r.id===doc.id)).map(d=>d.id);
  // Recompute summaries from redacted content, without retaining private target names.
  const clean=parseDocument(doc.body,doc.path);doc.summary=clean.summary;
 }
 return {library:{version:createHash('sha256').update(JSON.stringify(documents)).digest('hex').slice(0,16),documents,public:true},assets};
}
export async function buildPages(){const manifest=JSON.parse(await readFile(path.join(app,'pages-public.json'),'utf8'));const {library,assets}=await publicLibrary(path.resolve(app,'../../content'),manifest);await build({root:app,mode:'pages'});const out=path.join(app,'dist-pages');await writeFile(path.join(out,'library.json'),JSON.stringify(library));await writeFile(path.join(out,'.nojekyll'),'');await copyFile(path.join(app,'LICENSE'),path.join(out,'LICENSE'));await copyFile(path.join(app,'NOTICE.md'),path.join(out,'NOTICE.md'));await mkdir(path.join(out,'licenses'),{recursive:true});await copyFile(path.join(app,'licenses/MIT-legacy.txt'),path.join(out,'licenses/MIT-legacy.txt'));for(const [relative,file]of assets){const destination=path.join(out,'documents',relative);await mkdir(path.dirname(destination),{recursive:true});await copyFile(file,destination);}console.log(`Pages 构建完成：${library.documents.length} 篇获准文档，${assets.size} 个获准附件。`);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPages();
