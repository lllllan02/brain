import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createServer as createViteServer} from 'vite';
import {loadLibrary,safeAsset} from './src/library.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../content');
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.pdf':'application/pdf','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/library'){if(req.method!=='GET'){res.writeHead(405);return res.end();}res.writeHead(200,{...headers,'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify(await loadLibrary(root)));}
 if(url.pathname==='/api/asset'){const asset=await safeAsset(root,url.searchParams.get('path')||'',url.searchParams.get('from')||'');const type=asset&&mime[path.extname(asset.file).toLowerCase()];if(!type){res.writeHead(404,headers);return res.end('未找到');}res.writeHead(200,{...headers,'Content-Type':type,'Content-Security-Policy':"default-src 'none'; sandbox"});return res.end(await readFile(asset.file));}
 vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});
 }catch(e){console.error(e);res.writeHead(500,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({error:'文档加载失败，请检查本地终端。'}));}
});
const vite=await createViteServer({root:dir,configFile:false,server:{middlewareMode:true,hmr:{server},fs:{allow:[dir]}},appType:'spa'});
const port=Number(process.env.PORT||4173);server.listen(port,'127.0.0.1',()=>console.log(`brain · http://127.0.0.1:${port}`));
