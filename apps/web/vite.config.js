import {defineConfig} from 'vite';
export default defineConfig(({mode})=>({
 base: mode==='pages'?'./':'/',
 define:{__STATIC_PAGES__:JSON.stringify(mode==='pages')},
 build:{outDir:mode==='pages'?'dist-pages':'dist'}
}));
