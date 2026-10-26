import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {bundledFontLicenses} from './shared/vite-plugins.js';
export default defineConfig(({mode})=>{
  const playtest=mode==='playtest';
  return {base:'./',cacheDir:`node_modules/.vite-${playtest?'playtest':'game'}`,define:{__PLAYTEST_BUILD__:JSON.stringify(playtest)},
    resolve:{alias:{'#level-catalog':fileURLToPath(new URL(playtest?'./src/playtest-catalog.js':'./src/game-catalog.js',import.meta.url))}},
    server:{fs:{allow:['.']}},build:{outDir:playtest?'dist-playtest':'dist'},
    plugins:[bundledFontLicenses(),{name:'playtest-entry',transformIndexHtml:{order:'pre',handler(html){return playtest?html.replace('./src/game-entry.js','./src/playtest-entry.js').replace('<title>Little Ledges</title>','<title>Puzzle Playtest · Little Ledges</title>'):html}}}]};
});
