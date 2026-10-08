import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {build} from 'vite';
import {loadLibrary,safeAsset} from '../src/library.mjs';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export async function pagesLibrary(root){
 const library=await loadLibrary(root),assets=new Map();
 for(const doc of library.documents){
  const urls=[...doc.html.matchAll(/(?:src|href)="(\/api\/asset\?[^" ]+)"/g)];
  for(const [,url]of urls){
   const parsed=new URL(url.replaceAll('&amp;','&'),'http://local');
   const asset=await safeAsset(root,parsed.searchParams.get('path')||'',doc.path);
   if(asset&&/\.(png|jpe?g|gif|webp|pdf|mp3|mp4)$/i.test(asset.path)){
    assets.set(asset.path,asset.file);
    const href='./documents/'+asset.path.split('/').map(encodeURIComponent).join('/');
    doc.html=doc.html.replaceAll(url,href);
   }else{doc.html=doc.html.replaceAll(url,'#');}
  }
 }
 return {library,assets};
}

export async function buildPages(){
 const {library,assets}=await pagesLibrary(path.resolve(app,'../../content'));
 await build({root:app,mode:'pages'});
 const out=path.join(app,'dist-pages');
 await writeFile(path.join(out,'library.json'),JSON.stringify(library));
 await writeFile(path.join(out,'.nojekyll'),'');
 await copyFile(path.join(app,'LICENSE'),path.join(out,'LICENSE'));
 await copyFile(path.join(app,'NOTICE.md'),path.join(out,'NOTICE.md'));
 await mkdir(path.join(out,'licenses'),{recursive:true});
 await copyFile(path.join(app,'licenses/MIT-legacy.txt'),path.join(out,'licenses/MIT-legacy.txt'));
 for(const [relative,file]of assets){
  const destination=path.join(out,'documents',relative);
  await mkdir(path.dirname(destination),{recursive:true});
  await copyFile(file,destination);
 }
 console.log(`Pages 构建完成：${library.documents.length} 篇文档，${assets.size} 个引用附件。`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPages();
