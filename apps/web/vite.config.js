import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
const galaxyLicense=readFileSync(new URL('./licenses/galaxy-view-MIT.txt',import.meta.url),'utf8');
export default defineConfig(({mode})=>({
 base: mode==='pages'?'./':'/',
 plugins:[{name:'galaxy-license',generateBundle(){this.emitFile({type:'asset',fileName:'licenses/galaxy-view-MIT.txt',source:galaxyLicense});}}],
 define:{__STATIC_PAGES__:JSON.stringify(mode==='pages')},
 build:{outDir:mode==='pages'?'dist-pages':'dist'}
}));
